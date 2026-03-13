import { describe, it, expect } from 'vitest';
import {
  validateToolArgValueAgainstSchema,
  isPlainObject,
  describeToolArgValue,
  appendToolSchemaPath,
  formatToolSchemaPath,
  describeToolSchemaTypes,
} from '../toolSchema.js';
import type { BloomreachMcpInputSchema } from '../toolSchema.js';

describe('isPlainObject', () => {
  it('returns true for plain objects', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ key: 'value' })).toBe(true);
  });

  it('returns false for arrays', () => {
    expect(isPlainObject([])).toBe(false);
  });

  it('returns false for null', () => {
    expect(isPlainObject(null)).toBe(false);
  });

  it('returns false for primitives', () => {
    expect(isPlainObject('string')).toBe(false);
    expect(isPlainObject(42)).toBe(false);
    expect(isPlainObject(true)).toBe(false);
    expect(isPlainObject(undefined)).toBe(false);
  });
});

describe('describeToolArgValue', () => {
  it('returns "array" for arrays', () => {
    expect(describeToolArgValue([])).toBe('array');
  });

  it('returns "null" for null', () => {
    expect(describeToolArgValue(null)).toBe('null');
  });

  it('returns "non-finite number" for Infinity', () => {
    expect(describeToolArgValue(Infinity)).toBe('non-finite number');
    expect(describeToolArgValue(NaN)).toBe('non-finite number');
  });

  it('returns typeof for regular values', () => {
    expect(describeToolArgValue('hello')).toBe('string');
    expect(describeToolArgValue(42)).toBe('number');
    expect(describeToolArgValue(true)).toBe('boolean');
  });
});

describe('appendToolSchemaPath', () => {
  it('returns segment for empty path', () => {
    expect(appendToolSchemaPath('', 'project')).toBe('project');
  });

  it('appends with dot separator', () => {
    expect(appendToolSchemaPath('root', 'child')).toBe('root.child');
  });

  it('appends array index without dot', () => {
    expect(appendToolSchemaPath('items', '[0]')).toBe('items[0]');
  });
});

describe('formatToolSchemaPath', () => {
  it('returns "arguments" for empty path', () => {
    expect(formatToolSchemaPath('')).toBe('arguments');
  });

  it('returns the path itself when non-empty', () => {
    expect(formatToolSchemaPath('project')).toBe('project');
  });
});

describe('describeToolSchemaTypes', () => {
  it('returns the type for simple schemas', () => {
    expect(describeToolSchemaTypes({ type: 'string' })).toBe('string');
  });

  it('returns enum values for enum schemas', () => {
    expect(describeToolSchemaTypes({ enum: ['a', 'b'] })).toBe('"a", "b"');
  });

  it('returns joined types for anyOf schemas', () => {
    expect(describeToolSchemaTypes({ anyOf: [{ type: 'string' }, { type: 'number' }] })).toBe(
      'string, number',
    );
  });

  it('returns "supported value" for empty schema', () => {
    expect(describeToolSchemaTypes({})).toBe('supported value');
  });
});

describe('validateToolArgValueAgainstSchema', () => {
  it('accepts valid string values', () => {
    const schema: BloomreachMcpInputSchema = { type: 'string' };
    expect(() => validateToolArgValueAgainstSchema(schema, 'hello', '')).not.toThrow();
  });

  it('rejects non-string when string expected', () => {
    const schema: BloomreachMcpInputSchema = { type: 'string' };
    expect(() => validateToolArgValueAgainstSchema(schema, 123, '')).toThrow('must be a string');
  });

  it('accepts valid number values', () => {
    const schema: BloomreachMcpInputSchema = { type: 'number' };
    expect(() => validateToolArgValueAgainstSchema(schema, 42.5, '')).not.toThrow();
  });

  it('rejects non-finite numbers', () => {
    const schema: BloomreachMcpInputSchema = { type: 'number' };
    expect(() => validateToolArgValueAgainstSchema(schema, Infinity, '')).toThrow(
      'must be a finite number',
    );
  });

  it('accepts valid integer values', () => {
    const schema: BloomreachMcpInputSchema = { type: 'integer' };
    expect(() => validateToolArgValueAgainstSchema(schema, 42, '')).not.toThrow();
  });

  it('rejects non-integer when integer expected', () => {
    const schema: BloomreachMcpInputSchema = { type: 'integer' };
    expect(() => validateToolArgValueAgainstSchema(schema, 42.5, '')).toThrow(
      'must be an integer',
    );
  });

  it('accepts valid boolean values', () => {
    const schema: BloomreachMcpInputSchema = { type: 'boolean' };
    expect(() => validateToolArgValueAgainstSchema(schema, true, '')).not.toThrow();
  });

  it('rejects non-boolean when boolean expected', () => {
    const schema: BloomreachMcpInputSchema = { type: 'boolean' };
    expect(() => validateToolArgValueAgainstSchema(schema, 'true', '')).toThrow(
      'must be a boolean',
    );
  });

  it('accepts valid array values', () => {
    const schema: BloomreachMcpInputSchema = { type: 'array' };
    expect(() => validateToolArgValueAgainstSchema(schema, [1, 2, 3], '')).not.toThrow();
  });

  it('rejects non-array when array expected', () => {
    const schema: BloomreachMcpInputSchema = { type: 'array' };
    expect(() => validateToolArgValueAgainstSchema(schema, 'not-array', '')).toThrow(
      'must be an array',
    );
  });

  it('validates array items against item schema', () => {
    const schema: BloomreachMcpInputSchema = {
      type: 'array',
      items: { type: 'string' },
    };
    expect(() => validateToolArgValueAgainstSchema(schema, ['a', 'b'], '')).not.toThrow();
    expect(() => validateToolArgValueAgainstSchema(schema, ['a', 42], '')).toThrow(
      '[1] must be a string',
    );
  });

  it('validates object with required fields', () => {
    const schema: BloomreachMcpInputSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
    };

    expect(() => validateToolArgValueAgainstSchema(schema, { name: 'test' }, '')).not.toThrow();
    expect(() => validateToolArgValueAgainstSchema(schema, {}, '')).toThrow('name is required');
  });

  it('rejects additional properties when additionalProperties is false', () => {
    const schema: BloomreachMcpInputSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      additionalProperties: false,
    };

    expect(() => validateToolArgValueAgainstSchema(schema, { name: 'ok', extra: 1 }, '')).toThrow(
      'extra is not allowed',
    );
  });

  it('validates enum values', () => {
    const schema: BloomreachMcpInputSchema = {
      type: 'string',
      enum: ['active', 'paused', 'archived'],
    };

    expect(() => validateToolArgValueAgainstSchema(schema, 'active', '')).not.toThrow();
    expect(() => validateToolArgValueAgainstSchema(schema, 'deleted', '')).toThrow('must be one of');
  });

  it('validates anyOf schemas', () => {
    const schema: BloomreachMcpInputSchema = {
      anyOf: [{ type: 'string' }, { type: 'number' }],
    };

    expect(() => validateToolArgValueAgainstSchema(schema, 'text', '')).not.toThrow();
    expect(() => validateToolArgValueAgainstSchema(schema, 42, '')).not.toThrow();
    expect(() => validateToolArgValueAgainstSchema(schema, true, '')).toThrow('must match one of');
  });
});
