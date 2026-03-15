import { describe, expect, it } from 'vitest';
import { BloomreachBuddyError } from '../bloomreachApiClient.js';
import { BloomreachDatabase } from '../db/database.js';
import {
  DEFAULT_TOKEN_TTL_MS,
  type ActionExecutor,
  generateConfirmToken,
  generatePreparedActionId,
  hashConfirmToken,
  TwoPhaseCommitService,
} from '../twoPhaseCommit.js';

class TestEchoExecutor implements ActionExecutor {
  readonly actionType = 'test.echo';

  async execute(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    return { echo: payload.text ?? 'default' };
  }
}

class TestFailExecutor implements ActionExecutor {
  readonly actionType = 'test.fail';

  async execute(): Promise<Record<string, unknown>> {
    throw new BloomreachBuddyError('TARGET_NOT_FOUND', 'simulated failure');
  }
}

describe('two-phase commit token utilities', () => {
  it("generateConfirmToken starts with 'ct_' and length > 20", () => {
    const token = generateConfirmToken();
    expect(token.startsWith('ct_')).toBe(true);
    expect(token.length).toBeGreaterThan(20);
  });

  it('two calls produce different tokens', () => {
    expect(generateConfirmToken()).not.toBe(generateConfirmToken());
  });

  it('hashConfirmToken is deterministic', () => {
    const token = 'ct_test_token';
    expect(hashConfirmToken(token)).toBe(hashConfirmToken(token));
  });

  it('hashConfirmToken produces different hashes for different inputs', () => {
    expect(hashConfirmToken('ct_a')).not.toBe(hashConfirmToken('ct_b'));
  });

  it("generatePreparedActionId starts with 'pa_'", () => {
    expect(generatePreparedActionId().startsWith('pa_')).toBe(true);
  });
});

describe('TwoPhaseCommitService.prepare', () => {
  it('returns a valid PrepareResult and persists hashed token', () => {
    const db = new BloomreachDatabase(':memory:');
    const service = new TwoPhaseCommitService(db, {
      'test.echo': new TestEchoExecutor(),
    });

    const before = Date.now();
    const result = service.prepare({
      actionType: 'test.echo',
      target: { id: 't-1' },
      payload: { text: 'hello' },
      preview: { action: 'echo' },
      operatorNote: 'note',
    });
    const after = Date.now();

    expect(result.preparedActionId.startsWith('pa_')).toBe(true);
    expect(result.confirmToken.startsWith('ct_')).toBe(true);
    expect(result.confirmToken.startsWith('ct_stub_')).toBe(false);
    expect(result.expiresAtMs).toBeGreaterThanOrEqual(before + DEFAULT_TOKEN_TTL_MS);
    expect(result.expiresAtMs).toBeLessThanOrEqual(after + DEFAULT_TOKEN_TTL_MS);

    const row = db.getPreparedActionById(result.preparedActionId);
    expect(row).not.toBeNull();
    expect(row?.confirm_token_hash).toBe(hashConfirmToken(result.confirmToken));
    expect(row?.confirm_token_hash).not.toContain(result.confirmToken);

    db.close();
  });
});

describe('TwoPhaseCommitService.confirmByToken', () => {
  it('happy path: prepare then confirm succeeds', async () => {
    const db = new BloomreachDatabase(':memory:');
    const service = new TwoPhaseCommitService(db, {
      'test.echo': new TestEchoExecutor(),
    });
    const prepared = service.prepare({
      actionType: 'test.echo',
      target: { id: '1' },
      payload: { text: 'hello' },
      preview: { action: 'echo' },
    });

    const result = await service.confirmByToken({ confirmToken: prepared.confirmToken });

    expect(result).toEqual({
      preparedActionId: prepared.preparedActionId,
      status: 'executed',
      actionType: 'test.echo',
      result: { echo: 'hello' },
    });

    const row = db.getPreparedActionById(prepared.preparedActionId);
    expect(row?.status).toBe('executed');
    db.close();
  });

  it('rejects unknown token with TARGET_NOT_FOUND', async () => {
    const db = new BloomreachDatabase(':memory:');
    const service = new TwoPhaseCommitService(db, {
      'test.echo': new TestEchoExecutor(),
    });

    await expect(service.confirmByToken({ confirmToken: 'ct_unknown' })).rejects.toMatchObject({
      code: 'TARGET_NOT_FOUND',
    });
    db.close();
  });

  it('rejects expired token with ACTION_PRECONDITION_FAILED', async () => {
    const db = new BloomreachDatabase(':memory:');
    const service = new TwoPhaseCommitService(db, {
      'test.echo': new TestEchoExecutor(),
    });
    const prepared = service.prepare({
      actionType: 'test.echo',
      target: { id: '1' },
      payload: { text: 'hello' },
      preview: { action: 'echo' },
      nowMs: 1_000,
      expiresInMs: 10,
    });

    await expect(
      service.confirmByToken({
        confirmToken: prepared.confirmToken,
        nowMs: 1_011,
      }),
    ).rejects.toMatchObject({ code: 'ACTION_PRECONDITION_FAILED' });
    db.close();
  });

  it('rejects already-executed token with ACTION_PRECONDITION_FAILED', async () => {
    const db = new BloomreachDatabase(':memory:');
    const service = new TwoPhaseCommitService(db, {
      'test.echo': new TestEchoExecutor(),
    });
    const prepared = service.prepare({
      actionType: 'test.echo',
      target: { id: '1' },
      payload: { text: 'hello' },
      preview: { action: 'echo' },
    });

    await service.confirmByToken({ confirmToken: prepared.confirmToken });
    await expect(service.confirmByToken({ confirmToken: prepared.confirmToken })).rejects.toMatchObject({
      code: 'ACTION_PRECONDITION_FAILED',
    });
    db.close();
  });

  it('rejects unknown action type with ACTION_PRECONDITION_FAILED', async () => {
    const db = new BloomreachDatabase(':memory:');
    const service = new TwoPhaseCommitService(db, {});
    const prepared = service.prepare({
      actionType: 'test.unknown',
      target: { id: '1' },
      payload: { text: 'hello' },
      preview: { action: 'unknown' },
    });

    await expect(service.confirmByToken({ confirmToken: prepared.confirmToken })).rejects.toMatchObject({
      code: 'ACTION_PRECONDITION_FAILED',
    });
    db.close();
  });

  it('records executor failure and re-throws error', async () => {
    const db = new BloomreachDatabase(':memory:');
    const service = new TwoPhaseCommitService(db, {
      'test.fail': new TestFailExecutor(),
    });
    const prepared = service.prepare({
      actionType: 'test.fail',
      target: { id: '1' },
      payload: { text: 'hello' },
      preview: { action: 'fail' },
    });

    await expect(service.confirmByToken({ confirmToken: prepared.confirmToken })).rejects.toThrow(
      'simulated failure',
    );

    const row = db.getPreparedActionById(prepared.preparedActionId);
    expect(row?.status).toBe('failed');
    expect(row?.error_code).toBe('TARGET_NOT_FOUND');
    expect(row?.error_message).toBe('simulated failure');
    db.close();
  });
});

describe('TwoPhaseCommitService.registerExecutors', () => {
  it('dynamically adds executors', async () => {
    const db = new BloomreachDatabase(':memory:');
    const service = new TwoPhaseCommitService(db, {});
    service.registerExecutors({ 'test.echo': new TestEchoExecutor() });

    const prepared = service.prepare({
      actionType: 'test.echo',
      target: { id: '1' },
      payload: { text: 'dynamic' },
      preview: { action: 'echo' },
    });

    const result = await service.confirmByToken({ confirmToken: prepared.confirmToken });
    expect(result.result).toEqual({ echo: 'dynamic' });
    db.close();
  });
});

describe('TwoPhaseCommitService.listPreparedActions', () => {
  it('returns prepared actions', () => {
    const db = new BloomreachDatabase(':memory:');
    const service = new TwoPhaseCommitService(db, {
      'test.echo': new TestEchoExecutor(),
    });

    service.prepare({
      actionType: 'test.echo',
      target: { id: '1' },
      payload: { text: 'one' },
      preview: { label: 'one' },
      nowMs: 1_000,
    });
    service.prepare({
      actionType: 'test.echo',
      target: { id: '2' },
      payload: { text: 'two' },
      preview: { label: 'two' },
      nowMs: 2_000,
    });

    const actions = service.listPreparedActions();
    expect(actions).toHaveLength(2);
    expect(actions[0].preview).toEqual({ label: 'two' });
    expect(actions[1].preview).toEqual({ label: 'one' });
    db.close();
  });

  it('filters by status', async () => {
    const db = new BloomreachDatabase(':memory:');
    const service = new TwoPhaseCommitService(db, {
      'test.echo': new TestEchoExecutor(),
    });

    const prepared = service.prepare({
      actionType: 'test.echo',
      target: { id: '1' },
      payload: { text: 'hello' },
      preview: { label: 'prepared' },
    });
    await service.confirmByToken({ confirmToken: prepared.confirmToken });

    service.prepare({
      actionType: 'test.echo',
      target: { id: '2' },
      payload: { text: 'still prepared' },
      preview: { label: 'pending' },
    });

    const preparedRows = service.listPreparedActions({ status: 'prepared' });
    expect(preparedRows).toHaveLength(1);
    expect(preparedRows[0].status).toBe('prepared');
    db.close();
  });
});
