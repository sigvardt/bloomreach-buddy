import type Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import {
  BloomreachDatabase,
  type InsertPreparedActionInput,
} from '../db/database.js';

function createPreparedActionInput(
  overrides: Partial<InsertPreparedActionInput> = {},
): InsertPreparedActionInput {
  const id = overrides.id ?? `pa_${Math.random().toString(36).slice(2)}`;
  const suffix = id.slice(-6);
  return {
    id,
    actionType: overrides.actionType ?? 'test.echo',
    targetJson: overrides.targetJson ?? JSON.stringify({ id: suffix }),
    payloadJson: overrides.payloadJson ?? JSON.stringify({ text: `payload-${suffix}` }),
    previewJson: overrides.previewJson ?? JSON.stringify({ text: `preview-${suffix}` }),
    payloadHash: overrides.payloadHash ?? `payload-hash-${suffix}`,
    previewHash: overrides.previewHash ?? `preview-hash-${suffix}`,
    status: overrides.status ?? 'prepared',
    confirmTokenHash: overrides.confirmTokenHash ?? `token-hash-${suffix}`,
    expiresAtMs: overrides.expiresAtMs ?? 1_800_000_000_000,
    createdAtMs: overrides.createdAtMs ?? 1_700_000_000_000,
    operatorNote: overrides.operatorNote ?? null,
  };
}

function getRawDb(db: BloomreachDatabase): Database.Database {
  return Reflect.get(db, 'db') as Database.Database;
}

describe('BloomreachDatabase', () => {
  let database: BloomreachDatabase | null = null;

  afterEach(() => {
    database?.close();
    database = null;
  });

  it('constructor creates schema', () => {
    database = new BloomreachDatabase(':memory:');
    const row = getRawDb(database)
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'prepared_action'")
      .get() as { name: string } | undefined;

    expect(row).toEqual({ name: 'prepared_action' });
  });

  it('insertPreparedAction and getPreparedActionById round-trip', () => {
    database = new BloomreachDatabase(':memory:');
    const input = createPreparedActionInput();

    database.insertPreparedAction(input);
    const row = database.getPreparedActionById(input.id);

    expect(row).not.toBeNull();
    expect(row?.id).toBe(input.id);
    expect(row?.action_type).toBe(input.actionType);
    expect(row?.status).toBe('prepared');
    expect(row?.operator_note).toBeNull();
  });

  it('getPreparedActionById returns null for unknown ID', () => {
    database = new BloomreachDatabase(':memory:');
    expect(database.getPreparedActionById('pa_missing')).toBeNull();
  });

  it('getPreparedActionByConfirmTokenHash finds correct row', () => {
    database = new BloomreachDatabase(':memory:');
    const first = createPreparedActionInput({ confirmTokenHash: 'same-hash', createdAtMs: 10 });
    const second = createPreparedActionInput({ confirmTokenHash: 'same-hash', createdAtMs: 20 });

    database.insertPreparedAction(first);
    database.insertPreparedAction(second);

    const row = database.getPreparedActionByConfirmTokenHash('same-hash');
    expect(row?.id).toBe(second.id);
  });

  it('getPreparedActionByConfirmTokenHash returns null for unknown hash', () => {
    database = new BloomreachDatabase(':memory:');
    expect(database.getPreparedActionByConfirmTokenHash('missing-hash')).toBeNull();
  });

  it('markPreparedActionExecuted transitions prepared to executed', () => {
    database = new BloomreachDatabase(':memory:');
    const input = createPreparedActionInput();
    database.insertPreparedAction(input);

    const changed = database.markPreparedActionExecuted({
      id: input.id,
      confirmedAtMs: 100,
      executedAtMs: 200,
      executionResultJson: JSON.stringify({ ok: true }),
    });

    const row = database.getPreparedActionById(input.id);
    expect(changed).toBe(true);
    expect(row?.status).toBe('executed');
    expect(row?.confirmed_at).toBe(100);
    expect(row?.executed_at).toBe(200);
    expect(row?.execution_result_json).toBe(JSON.stringify({ ok: true }));
  });

  it('markPreparedActionExecuted returns false for non-prepared status', () => {
    database = new BloomreachDatabase(':memory:');
    const input = createPreparedActionInput({ status: 'executed' });
    database.insertPreparedAction(input);

    const changed = database.markPreparedActionExecuted({
      id: input.id,
      confirmedAtMs: 100,
      executedAtMs: 200,
      executionResultJson: JSON.stringify({ ok: true }),
    });

    expect(changed).toBe(false);
  });

  it('markPreparedActionFailed transitions prepared to failed', () => {
    database = new BloomreachDatabase(':memory:');
    const input = createPreparedActionInput();
    database.insertPreparedAction(input);

    const changed = database.markPreparedActionFailed({
      id: input.id,
      confirmedAtMs: 150,
      executedAtMs: 250,
      errorCode: 'UNKNOWN',
      errorMessage: 'boom',
    });

    const row = database.getPreparedActionById(input.id);
    expect(changed).toBe(true);
    expect(row?.status).toBe('failed');
    expect(row?.confirmed_at).toBe(150);
    expect(row?.executed_at).toBe(250);
    expect(row?.error_code).toBe('UNKNOWN');
    expect(row?.error_message).toBe('boom');
  });

  it('markPreparedActionFailed returns false for non-prepared status', () => {
    database = new BloomreachDatabase(':memory:');
    const input = createPreparedActionInput({ status: 'failed' });
    database.insertPreparedAction(input);

    const changed = database.markPreparedActionFailed({
      id: input.id,
      confirmedAtMs: 150,
      executedAtMs: 250,
      errorCode: 'UNKNOWN',
      errorMessage: 'boom',
    });

    expect(changed).toBe(false);
  });

  it('listPreparedActions returns all actions', () => {
    database = new BloomreachDatabase(':memory:');
    const first = createPreparedActionInput({ id: 'pa_a', createdAtMs: 10 });
    const second = createPreparedActionInput({ id: 'pa_b', createdAtMs: 20 });

    database.insertPreparedAction(first);
    database.insertPreparedAction(second);

    const rows = database.listPreparedActions();
    expect(rows.map((row) => row.id)).toEqual(['pa_b', 'pa_a']);
  });

  it('listPreparedActions filters by status', () => {
    database = new BloomreachDatabase(':memory:');
    database.insertPreparedAction(createPreparedActionInput({ id: 'pa_prepared', status: 'prepared' }));
    database.insertPreparedAction(createPreparedActionInput({ id: 'pa_failed', status: 'failed' }));

    const rows = database.listPreparedActions({ status: 'failed' });
    expect(rows.map((row) => row.id)).toEqual(['pa_failed']);
  });

  it('listPreparedActions respects limit', () => {
    database = new BloomreachDatabase(':memory:');
    database.insertPreparedAction(createPreparedActionInput({ id: 'pa_1', createdAtMs: 1 }));
    database.insertPreparedAction(createPreparedActionInput({ id: 'pa_2', createdAtMs: 2 }));
    database.insertPreparedAction(createPreparedActionInput({ id: 'pa_3', createdAtMs: 3 }));

    const rows = database.listPreparedActions({ limit: 2 });
    expect(rows.map((row) => row.id)).toEqual(['pa_3', 'pa_2']);
  });

  it('close works cleanly', () => {
    database = new BloomreachDatabase(':memory:');
    const rawDb = getRawDb(database);

    expect(() => database?.close()).not.toThrow();
    database = null;
    expect(() => rawDb.prepare('SELECT 1').get()).toThrow();
  });
});
