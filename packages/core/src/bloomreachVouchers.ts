import { validateProject } from './bloomreachDashboards.js';
import { BloomreachBuddyError } from './errors.js';
import type { BloomreachApiConfig } from './bloomreachApiClient.js';
import {
  validateListLimit as validateVoucherListLimit,
  validateListOffset as validateVoucherListOffset,
} from './bloomreachCustomers.js';

export const CREATE_VOUCHER_POOL_ACTION_TYPE = 'vouchers.create_pool';
export const ADD_VOUCHERS_ACTION_TYPE = 'vouchers.add_vouchers';
export const DELETE_VOUCHER_POOL_ACTION_TYPE = 'vouchers.delete_pool';

/** Rate limit window for voucher operations (1 hour in ms). */
export const VOUCHER_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const VOUCHER_POOL_CREATE_RATE_LIMIT = 10;
export const VOUCHER_ADD_RATE_LIMIT = 50;
export const VOUCHER_POOL_DELETE_RATE_LIMIT = 10;

export interface BloomreachVoucherPool {
  id: string;
  name: string;
  description?: string;
  voucherCount: number;
  redeemedCount: number;
  status: string;
  /** ISO-8601 creation timestamp (if available). */
  createdAt?: string;
  /** Full URL path to the voucher pool. */
  url: string;
}

export interface VoucherCode {
  code: string;
  poolId: string;
  status: string;
  redeemedAt?: string;
  redeemedBy?: string;
  expiresAt?: string;
}

export interface VoucherPoolDetail extends BloomreachVoucherPool {
  vouchers: VoucherCode[];
  redemptionRules?: RedemptionRules;
}

export interface RedemptionRules {
  /** Maximum number of times each voucher can be redeemed. */
  maxRedemptions?: number;
  /** ISO-8601 expiration date for all vouchers in the pool. */
  expiresAt?: string;
  /** Whether vouchers are single-use (redeemed once then invalidated). */
  singleUse?: boolean;
}

export interface ListVoucherPoolsInput {
  project: string;
  limit?: number;
  offset?: number;
}

export interface CreateVoucherPoolInput {
  project: string;
  name: string;
  description?: string;
  voucherCodes?: string[];
  autoGenerateCount?: number;
  redemptionRules?: RedemptionRules;
  operatorNote?: string;
}

export interface AddVouchersInput {
  project: string;
  poolId: string;
  voucherCodes?: string[];
  autoGenerateCount?: number;
  operatorNote?: string;
}

export interface ViewVoucherStatusInput {
  project: string;
  poolId: string;
  voucherCode?: string;
}

export interface DeleteVoucherPoolInput {
  project: string;
  poolId: string;
  operatorNote?: string;
}

/** Staged action awaiting confirmation via two-phase commit. */
export interface PreparedVoucherAction {
  preparedActionId: string;
  /** Cryptographic token required to confirm the action. */
  confirmToken: string;
  /** Timestamp (ms since epoch) when the token expires. */
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

const MAX_POOL_NAME_LENGTH = 200;
const MIN_POOL_NAME_LENGTH = 1;
const MAX_POOL_ID_LENGTH = 500;
const MAX_VOUCHER_CODE_LENGTH = 200;
const MAX_VOUCHER_CODES_PER_BATCH = 10_000;
const MAX_AUTO_GENERATE_COUNT = 100_000;
const MAX_REDEMPTIONS_LIMIT = 1_000_000;

/** @throws {Error} If name is empty or exceeds 200 characters. */
export function validatePoolName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < MIN_POOL_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Pool name must not be empty.');
  }
  if (trimmed.length > MAX_POOL_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Pool name must not exceed ${MAX_POOL_NAME_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

/** @throws {Error} If pool ID is empty or exceeds 500 characters. */
export function validatePoolId(poolId: string): string {
  const trimmed = poolId.trim();
  if (trimmed.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Pool ID must not be empty.');
  }
  if (trimmed.length > MAX_POOL_ID_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Pool ID must not exceed ${MAX_POOL_ID_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

/** @throws {Error} If any voucher code is empty, exceeds 200 chars, or batch exceeds 10,000. */
export function validateVoucherCodes(codes: string[]): string[] {
  if (codes.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'At least one voucher code must be provided.');
  }
  if (codes.length > MAX_VOUCHER_CODES_PER_BATCH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Voucher code batch must not exceed ${MAX_VOUCHER_CODES_PER_BATCH} codes (got ${codes.length}).`);
  }
  const validated: string[] = [];
  for (const code of codes) {
    const trimmed = code.trim();
    if (trimmed.length === 0) {
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Voucher code must not be empty.');
    }
    if (trimmed.length > MAX_VOUCHER_CODE_LENGTH) {
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Voucher code must not exceed ${MAX_VOUCHER_CODE_LENGTH} characters (got ${trimmed.length}).`);
    }
    validated.push(trimmed);
  }
  const unique = new Set(validated);
  if (unique.size !== validated.length) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Voucher codes must be unique within a batch.');
  }
  return validated;
}

/** @throws {Error} If count is not a positive integer or exceeds 100,000. */
export function validateAutoGenerateCount(count: number): number {
  if (!Number.isInteger(count) || count < 1) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Auto-generate count must be a positive integer.');
  }
  if (count > MAX_AUTO_GENERATE_COUNT) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Auto-generate count must not exceed ${MAX_AUTO_GENERATE_COUNT} (got ${count}).`);
  }
  return count;
}

/** @throws {Error} If redemption rules are invalid. */
export function validateRedemptionRules(rules: RedemptionRules): RedemptionRules {
  if (rules.maxRedemptions !== undefined) {
    if (!Number.isInteger(rules.maxRedemptions) || rules.maxRedemptions < 1) {
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Max redemptions must be a positive integer.');
    }
    if (rules.maxRedemptions > MAX_REDEMPTIONS_LIMIT) {
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Max redemptions must not exceed ${MAX_REDEMPTIONS_LIMIT} (got ${rules.maxRedemptions}).`);
    }
  }
  if (rules.expiresAt !== undefined) {
    const trimmed = rules.expiresAt.trim();
    if (trimmed.length === 0) {
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Expiration date must not be empty.');
    }
    const parsed = Date.parse(trimmed);
    if (isNaN(parsed)) {
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Expiration date must be a valid ISO-8601 date string.');
    }
  }
  return rules;
}

/** @throws {Error} If neither voucher codes nor auto-generate count is provided. */
export function validateVoucherSource(
  voucherCodes?: string[],
  autoGenerateCount?: number,
): void {
  if (
    (voucherCodes === undefined || voucherCodes.length === 0) &&
    autoGenerateCount === undefined
  ) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Either voucher codes or auto-generate count must be provided.');
  }
  if (
    voucherCodes !== undefined &&
    voucherCodes.length > 0 &&
    autoGenerateCount !== undefined
  ) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Provide either voucher codes or auto-generate count, not both.');
  }
}

export function buildVouchersUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/crm/vouchers`;
}

function requireApiConfig(
  config: BloomreachApiConfig | undefined,
  operation: string,
): BloomreachApiConfig {
  if (!config) {
    throw new BloomreachBuddyError('CONFIG_MISSING', `${operation} requires API credentials. ` +
      'Set BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, and BLOOMREACH_API_SECRET environment variables.',
      { missing: ['BLOOMREACH_PROJECT_TOKEN', 'BLOOMREACH_API_KEY_ID', 'BLOOMREACH_API_SECRET'] },
    );
  }
  return config;
}

void requireApiConfig;

/**
 * Executor for a confirmed voucher mutation.
 * Execute methods require browser automation infrastructure (not yet built).
 */
export interface VoucherActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class CreateVoucherPoolExecutor implements VoucherActionExecutor {
  readonly actionType = CREATE_VOUCHER_POOL_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'CreateVoucherPoolExecutor: not yet implemented. ' +
      'Voucher pool creation is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class AddVouchersExecutor implements VoucherActionExecutor {
  readonly actionType = ADD_VOUCHERS_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'AddVouchersExecutor: not yet implemented. ' +
      'Adding vouchers to a pool is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class DeleteVoucherPoolExecutor implements VoucherActionExecutor {
  readonly actionType = DELETE_VOUCHER_POOL_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'DeleteVoucherPoolExecutor: not yet implemented. ' +
      'Voucher pool deletion is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

export function createVoucherActionExecutors(
  apiConfig?: BloomreachApiConfig,
): Record<
  string,
  VoucherActionExecutor
> {
  return {
    [CREATE_VOUCHER_POOL_ACTION_TYPE]: new CreateVoucherPoolExecutor(apiConfig),
    [ADD_VOUCHERS_ACTION_TYPE]: new AddVouchersExecutor(apiConfig),
    [DELETE_VOUCHER_POOL_ACTION_TYPE]: new DeleteVoucherPoolExecutor(apiConfig),
  };
}

/**
 * Manages Bloomreach Engagement voucher pools. Read methods return data directly.
 * Mutation methods follow the two-phase commit pattern (prepare + confirm).
 * Browser-dependent methods throw until Playwright infrastructure is available.
 */
export class BloomreachVouchersService {
  private readonly baseUrl: string;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(project: string, apiConfig?: BloomreachApiConfig) {
    this.baseUrl = buildVouchersUrl(validateProject(project));
    this.apiConfig = apiConfig;
  }

  get vouchersUrl(): string {
    return this.baseUrl;
  }

  /** @throws {Error} Browser automation not yet available. */
  async listVoucherPools(input?: ListVoucherPoolsInput): Promise<BloomreachVoucherPool[]> {
    if (input !== undefined) {
      validateProject(input.project);
      validateVoucherListLimit(input.limit);
      validateVoucherListOffset(input.offset);
    }

    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'listVoucherPools: the Bloomreach API does not provide a voucher pool listing endpoint. ' +
      'Voucher pool management is only available through the Bloomreach Engagement UI.');
  }

  /** @throws {Error} Browser automation not yet available. */
  async viewVoucherStatus(input: ViewVoucherStatusInput): Promise<VoucherPoolDetail> {
    validateProject(input.project);
    validatePoolId(input.poolId);

    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'viewVoucherStatus: the Bloomreach API does not provide a voucher status endpoint. ' +
      'Voucher pool management is only available through the Bloomreach Engagement UI.');
  }

  /** @throws {Error} If input validation fails. */
  prepareCreateVoucherPool(input: CreateVoucherPoolInput): PreparedVoucherAction {
    const project = validateProject(input.project);
    const name = validatePoolName(input.name);
    validateVoucherSource(input.voucherCodes, input.autoGenerateCount);
    if (input.voucherCodes && input.voucherCodes.length > 0) {
      validateVoucherCodes(input.voucherCodes);
    }
    if (input.autoGenerateCount !== undefined) {
      validateAutoGenerateCount(input.autoGenerateCount);
    }
    if (input.redemptionRules) {
      validateRedemptionRules(input.redemptionRules);
    }

    const preview = {
      action: CREATE_VOUCHER_POOL_ACTION_TYPE,
      project,
      name,
      description: input.description,
      voucherCount: input.voucherCodes?.length ?? input.autoGenerateCount ?? 0,
      voucherSource: input.voucherCodes ? 'manual' : 'auto-generated',
      redemptionRules: input.redemptionRules,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  /** @throws {Error} If input validation fails. */
  prepareAddVouchers(input: AddVouchersInput): PreparedVoucherAction {
    const project = validateProject(input.project);
    const poolId = validatePoolId(input.poolId);
    validateVoucherSource(input.voucherCodes, input.autoGenerateCount);
    if (input.voucherCodes && input.voucherCodes.length > 0) {
      validateVoucherCodes(input.voucherCodes);
    }
    if (input.autoGenerateCount !== undefined) {
      validateAutoGenerateCount(input.autoGenerateCount);
    }

    const preview = {
      action: ADD_VOUCHERS_ACTION_TYPE,
      project,
      poolId,
      voucherCount: input.voucherCodes?.length ?? input.autoGenerateCount ?? 0,
      voucherSource: input.voucherCodes ? 'manual' : 'auto-generated',
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  /** @throws {Error} If input validation fails. */
  prepareDeleteVoucherPool(input: DeleteVoucherPoolInput): PreparedVoucherAction {
    const project = validateProject(input.project);
    const poolId = validatePoolId(input.poolId);

    const preview = {
      action: DELETE_VOUCHER_POOL_ACTION_TYPE,
      project,
      poolId,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }
}
