import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { BloomreachDatabase, PreparedActionRow } from './db/database.js';
import { BloomreachBuddyError } from './errors.js';

export const DEFAULT_TOKEN_TTL_MS = 30 * 60 * 1000;

export function generateConfirmToken(entropyBytes: number = 24): string {
  return `ct_${randomBytes(entropyBytes).toString('base64url')}`;
}

export function hashConfirmToken(token: string): string {
  return createHash('sha256').update(token).digest('base64url');
}

export function hashJsonPayload(json: string): string {
  return createHash('sha256').update(json).digest('base64url');
}

export function generatePreparedActionId(): string {
  return `pa_${randomUUID().replaceAll('-', '')}`;
}

export function isTokenExpired(expiresAtMs: number, nowMs: number = Date.now()): boolean {
  return nowMs > expiresAtMs;
}

export interface ActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

export interface PrepareInput {
  actionType: string;
  target: Record<string, unknown>;
  payload: Record<string, unknown>;
  preview: Record<string, unknown>;
  operatorNote?: string;
  expiresInMs?: number;
  nowMs?: number;
}

export interface PrepareResult {
  preparedActionId: string;
  confirmToken: string;
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

export interface ConfirmByTokenInput {
  confirmToken: string;
  nowMs?: number;
}

export interface ConfirmResult {
  preparedActionId: string;
  status: 'executed';
  actionType: string;
  result: Record<string, unknown>;
}

export interface PreparedActionSummary {
  preparedActionId: string;
  actionType: string;
  status: string;
  expiresAtMs: number;
  preview: Record<string, unknown>;
  operatorNote: string | null;
  createdAtMs: number;
}

export class TwoPhaseCommitService {
  private executors: Record<string, ActionExecutor>;

  constructor(
    private readonly db: BloomreachDatabase,
    executors: Record<string, ActionExecutor> = {},
  ) {
    this.executors = { ...executors };
  }

  registerExecutors(newExecutors: Record<string, ActionExecutor>): void {
    Object.assign(this.executors, newExecutors);
  }

  prepare(input: PrepareInput): PrepareResult {
    const nowMs = input.nowMs ?? Date.now();
    const expiresInMs = input.expiresInMs ?? DEFAULT_TOKEN_TTL_MS;
    const preparedActionId = generatePreparedActionId();
    const confirmToken = generateConfirmToken();
    const confirmTokenHash = hashConfirmToken(confirmToken);
    const expiresAtMs = nowMs + expiresInMs;

    const targetJson = JSON.stringify(input.target);
    const payloadJson = JSON.stringify(input.payload);
    const previewJson = JSON.stringify(input.preview);

    this.db.insertPreparedAction({
      id: preparedActionId,
      actionType: input.actionType,
      targetJson,
      payloadJson,
      previewJson,
      payloadHash: hashJsonPayload(payloadJson),
      previewHash: hashJsonPayload(previewJson),
      status: 'prepared',
      confirmTokenHash,
      expiresAtMs,
      createdAtMs: nowMs,
      operatorNote: input.operatorNote ?? null,
    });

    return {
      preparedActionId,
      confirmToken,
      expiresAtMs,
      preview: input.preview,
    };
  }

  async confirmByToken(input: ConfirmByTokenInput): Promise<ConfirmResult> {
    const nowMs = input.nowMs ?? Date.now();
    const confirmTokenHash = hashConfirmToken(input.confirmToken);
    const row = this.db.getPreparedActionByConfirmTokenHash(confirmTokenHash);

    if (!row) {
      throw new BloomreachBuddyError(
        'TARGET_NOT_FOUND',
        'Prepared action not found for the provided confirmation token.',
      );
    }

    if (row.status !== 'prepared') {
      throw new BloomreachBuddyError(
        'ACTION_PRECONDITION_FAILED',
        `Prepared action ${row.id} is not pending confirmation (status: ${row.status}).`,
      );
    }

    if (isTokenExpired(row.expires_at, nowMs)) {
      throw new BloomreachBuddyError(
        'ACTION_PRECONDITION_FAILED',
        `Confirmation token expired for action ${row.id}.`,
      );
    }

    const executor = this.executors[row.action_type];
    if (!executor) {
      throw new BloomreachBuddyError(
        'ACTION_PRECONDITION_FAILED',
        `No executor registered for action type "${row.action_type}".`,
      );
    }

    const payload = JSON.parse(row.payload_json) as Record<string, unknown>;

    let executionResult: Record<string, unknown>;
    try {
      executionResult = await executor.execute(payload);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = error instanceof BloomreachBuddyError ? error.code : 'UNKNOWN';
      this.db.markPreparedActionFailed({
        id: row.id,
        confirmedAtMs: nowMs,
        executedAtMs: nowMs,
        errorCode,
        errorMessage,
      });
      throw error;
    }

    this.db.markPreparedActionExecuted({
      id: row.id,
      confirmedAtMs: nowMs,
      executedAtMs: nowMs,
      executionResultJson: JSON.stringify(executionResult),
    });

    return {
      preparedActionId: row.id,
      status: 'executed',
      actionType: row.action_type,
      result: executionResult,
    };
  }

  getPreparedActionByToken(confirmToken: string): PreparedActionRow | null {
    const hash = hashConfirmToken(confirmToken);
    return this.db.getPreparedActionByConfirmTokenHash(hash);
  }

  listPreparedActions(options?: { status?: string; limit?: number }): PreparedActionSummary[] {
    const rows = this.db.listPreparedActions(options);
    return rows.map((row) => ({
      preparedActionId: row.id,
      actionType: row.action_type,
      status: row.status,
      expiresAtMs: row.expires_at,
      preview: JSON.parse(row.preview_json) as Record<string, unknown>,
      operatorNote: row.operator_note,
      createdAtMs: row.created_at,
    }));
  }
}
