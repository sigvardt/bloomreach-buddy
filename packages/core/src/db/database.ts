import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export interface InsertPreparedActionInput {
  id: string;
  actionType: string;
  targetJson: string;
  payloadJson: string;
  previewJson: string;
  payloadHash: string;
  previewHash: string;
  status: string;
  confirmTokenHash: string;
  expiresAtMs: number;
  createdAtMs: number;
  operatorNote: string | null;
}

export interface PreparedActionRow {
  id: string;
  action_type: string;
  target_json: string;
  payload_json: string;
  preview_json: string;
  payload_hash: string;
  preview_hash: string;
  status: string;
  confirm_token_hash: string;
  expires_at: number;
  created_at: number;
  confirmed_at: number | null;
  operator_note: string | null;
  executed_at: number | null;
  execution_result_json: string | null;
  error_code: string | null;
  error_message: string | null;
}

export interface MarkExecutedInput {
  id: string;
  confirmedAtMs: number;
  executedAtMs: number;
  executionResultJson: string;
}

export interface MarkFailedInput {
  id: string;
  confirmedAtMs: number;
  executedAtMs: number;
  errorCode: string;
  errorMessage: string;
}

export interface ListPreparedActionsOptions {
  status?: string;
  limit?: number;
}

export class BloomreachDatabase {
  private readonly db: Database.Database;

  constructor(dbPath: string) {
    if (dbPath !== ':memory:') {
      const directoryPath = dirname(dbPath);
      if (!existsSync(directoryPath)) {
        mkdirSync(directoryPath, { recursive: true });
      }
    }

    this.db = new Database(dbPath);
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL');
    this.createSchema();
  }

  private createSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS prepared_action (
        id                     TEXT PRIMARY KEY,
        action_type            TEXT NOT NULL,
        target_json            TEXT NOT NULL,
        payload_json           TEXT NOT NULL,
        preview_json           TEXT NOT NULL,
        payload_hash           TEXT NOT NULL,
        preview_hash           TEXT NOT NULL,
        status                 TEXT NOT NULL DEFAULT 'prepared',
        confirm_token_hash     TEXT NOT NULL,
        expires_at             INTEGER NOT NULL,
        created_at             INTEGER NOT NULL,
        confirmed_at           INTEGER,
        operator_note          TEXT,
        executed_at            INTEGER,
        execution_result_json  TEXT,
        error_code             TEXT,
        error_message          TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_pa_status ON prepared_action(status, expires_at);
      CREATE INDEX IF NOT EXISTS idx_pa_token_hash ON prepared_action(confirm_token_hash);
    `);
  }

  close(): void {
    this.db.close();
  }

  insertPreparedAction(input: InsertPreparedActionInput): void {
    this.db
      .prepare(
        `
          INSERT INTO prepared_action (
            id,
            action_type,
            target_json,
            payload_json,
            preview_json,
            payload_hash,
            preview_hash,
            status,
            confirm_token_hash,
            expires_at,
            created_at,
            operator_note
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        input.id,
        input.actionType,
        input.targetJson,
        input.payloadJson,
        input.previewJson,
        input.payloadHash,
        input.previewHash,
        input.status,
        input.confirmTokenHash,
        input.expiresAtMs,
        input.createdAtMs,
        input.operatorNote,
      );
  }

  getPreparedActionById(id: string): PreparedActionRow | null {
    const row = this.db
      .prepare('SELECT * FROM prepared_action WHERE id = ?')
      .get(id) as PreparedActionRow | undefined;
    return row ?? null;
  }

  getPreparedActionByConfirmTokenHash(hash: string): PreparedActionRow | null {
    const row = this.db
      .prepare(
        'SELECT * FROM prepared_action WHERE confirm_token_hash = ? ORDER BY created_at DESC LIMIT 1',
      )
      .get(hash) as PreparedActionRow | undefined;
    return row ?? null;
  }

  markPreparedActionExecuted(input: MarkExecutedInput): boolean {
    const result = this.db
      .prepare(
        `
          UPDATE prepared_action
          SET
            status = 'executed',
            confirmed_at = ?,
            executed_at = ?,
            execution_result_json = ?
          WHERE id = ? AND status = 'prepared'
        `,
      )
      .run(input.confirmedAtMs, input.executedAtMs, input.executionResultJson, input.id);
    return result.changes === 1;
  }

  markPreparedActionFailed(input: MarkFailedInput): boolean {
    const result = this.db
      .prepare(
        `
          UPDATE prepared_action
          SET
            status = 'failed',
            confirmed_at = ?,
            executed_at = ?,
            error_code = ?,
            error_message = ?
          WHERE id = ? AND status = 'prepared'
        `,
      )
      .run(
        input.confirmedAtMs,
        input.executedAtMs,
        input.errorCode,
        input.errorMessage,
        input.id,
      );
    return result.changes === 1;
  }

  listPreparedActions(options?: ListPreparedActionsOptions): PreparedActionRow[] {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (options?.status !== undefined) {
      conditions.push('status = ?');
      params.push(options.status);
    }

    let sql = 'SELECT * FROM prepared_action';
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    sql += ' ORDER BY created_at DESC';

    if (options?.limit !== undefined) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    return this.db.prepare(sql).all(...params) as PreparedActionRow[];
  }
}
