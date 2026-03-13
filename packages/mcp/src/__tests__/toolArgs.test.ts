import { describe, it, expect } from 'vitest';
import {
  readString,
  readRequiredString,
  readBoundedString,
  readValidatedUrl,
  readPositiveNumber,
  readNonNegativeNumber,
  readBoolean,
  readRequiredBoolean,
  readOptionalPositiveNumber,
  readOptionalNonNegativeNumber,
  readStringArray,
  readRequiredStringArray,
  readObject,
  trimOrUndefined,
} from '../toolArgs.js';

describe('readString', () => {
  it('returns the value when string is present', () => {
    expect(readString({ name: 'test' }, 'name', 'default')).toBe('test');
  });

  it('returns fallback when key is missing', () => {
    expect(readString({}, 'name', 'default')).toBe('default');
  });

  it('returns fallback for empty string', () => {
    expect(readString({ name: '  ' }, 'name', 'default')).toBe('default');
  });

  it('trims whitespace', () => {
    expect(readString({ name: '  hello  ' }, 'name', '')).toBe('hello');
  });
});

describe('trimOrUndefined', () => {
  it('returns trimmed string for non-empty values', () => {
    expect(trimOrUndefined('  hello  ')).toBe('hello');
  });

  it('returns undefined for empty string', () => {
    expect(trimOrUndefined('  ')).toBeUndefined();
  });

  it('returns undefined for non-string', () => {
    expect(trimOrUndefined(undefined)).toBeUndefined();
  });
});

describe('readRequiredString', () => {
  it('returns the value when present', () => {
    expect(readRequiredString({ name: 'test' }, 'name')).toBe('test');
  });

  it('throws when key is missing', () => {
    expect(() => readRequiredString({}, 'name')).toThrow('name is required');
  });

  it('throws for empty string', () => {
    expect(() => readRequiredString({ name: '' }, 'name')).toThrow('name is required');
  });
});

describe('readBoundedString', () => {
  it('returns the value within bounds', () => {
    expect(readBoundedString({ name: 'test' }, 'name', 100)).toBe('test');
  });

  it('throws when value exceeds maxLength', () => {
    expect(() => readBoundedString({ name: 'long text' }, 'name', 3)).toThrow(
      'must be 3 characters or fewer',
    );
  });

  it('uses fallback when provided and key is missing', () => {
    expect(readBoundedString({}, 'name', 100, 'fallback')).toBe('fallback');
  });
});

describe('readValidatedUrl', () => {
  it('returns normalized URL for valid input', () => {
    expect(readValidatedUrl({ url: 'https://example.com' }, 'url')).toBe('https://example.com/');
  });

  it('throws for invalid URL', () => {
    expect(() => readValidatedUrl({ url: 'not-a-url' }, 'url')).toThrow('must be a valid URL');
  });
});

describe('readPositiveNumber', () => {
  it('returns the value when positive', () => {
    expect(readPositiveNumber({ count: 5 }, 'count', 1)).toBe(5);
  });

  it('returns fallback for non-number', () => {
    expect(readPositiveNumber({ count: 'nope' }, 'count', 10)).toBe(10);
  });

  it('throws for zero', () => {
    expect(() => readPositiveNumber({ count: 0 }, 'count', 1)).toThrow(
      'must be a positive number',
    );
  });

  it('throws for negative', () => {
    expect(() => readPositiveNumber({ count: -1 }, 'count', 1)).toThrow(
      'must be a positive number',
    );
  });
});

describe('readNonNegativeNumber', () => {
  it('returns zero', () => {
    expect(readNonNegativeNumber({ offset: 0 }, 'offset', 1)).toBe(0);
  });

  it('throws for negative', () => {
    expect(() => readNonNegativeNumber({ offset: -1 }, 'offset', 0)).toThrow(
      'must be zero or a positive number',
    );
  });
});

describe('readBoolean', () => {
  it('returns the boolean value', () => {
    expect(readBoolean({ active: true }, 'active', false)).toBe(true);
  });

  it('returns fallback for non-boolean', () => {
    expect(readBoolean({ active: 'yes' }, 'active', false)).toBe(false);
  });
});

describe('readRequiredBoolean', () => {
  it('returns the boolean value', () => {
    expect(readRequiredBoolean({ active: false }, 'active')).toBe(false);
  });

  it('throws for non-boolean', () => {
    expect(() => readRequiredBoolean({ active: 'yes' }, 'active')).toThrow('active is required');
  });
});

describe('readOptionalPositiveNumber', () => {
  it('returns undefined when key is absent', () => {
    expect(readOptionalPositiveNumber({}, 'limit')).toBeUndefined();
  });

  it('returns the value when present and positive', () => {
    expect(readOptionalPositiveNumber({ limit: 5 }, 'limit')).toBe(5);
  });
});

describe('readOptionalNonNegativeNumber', () => {
  it('returns undefined when key is absent', () => {
    expect(readOptionalNonNegativeNumber({}, 'offset')).toBeUndefined();
  });

  it('returns the value when present and non-negative', () => {
    expect(readOptionalNonNegativeNumber({ offset: 0 }, 'offset')).toBe(0);
  });

  it('throws for negative values', () => {
    expect(() => readOptionalNonNegativeNumber({ offset: -1 }, 'offset')).toThrow(
      'must be a non-negative integer',
    );
  });
});

describe('readStringArray', () => {
  it('returns array of strings', () => {
    expect(readStringArray({ tags: ['a', 'b'] }, 'tags')).toEqual(['a', 'b']);
  });

  it('wraps single string in array', () => {
    expect(readStringArray({ tags: 'single' }, 'tags')).toEqual(['single']);
  });

  it('returns undefined when key is absent', () => {
    expect(readStringArray({}, 'tags')).toBeUndefined();
  });

  it('filters empty strings from arrays', () => {
    expect(readStringArray({ tags: ['a', '', '  ', 'b'] }, 'tags')).toEqual(['a', 'b']);
  });

  it('throws for non-string non-array values', () => {
    expect(() => readStringArray({ tags: 42 }, 'tags')).toThrow(
      'must be a string or array of strings',
    );
  });
});

describe('readRequiredStringArray', () => {
  it('returns the array when present', () => {
    expect(readRequiredStringArray({ ids: ['a'] }, 'ids')).toEqual(['a']);
  });

  it('throws when empty', () => {
    expect(() => readRequiredStringArray({}, 'ids')).toThrow('ids is required');
  });
});

describe('readObject', () => {
  it('returns the object when present', () => {
    expect(readObject({ data: { key: 'val' } }, 'data')).toEqual({ key: 'val' });
  });

  it('returns undefined when absent', () => {
    expect(readObject({}, 'data')).toBeUndefined();
  });

  it('throws for non-object values', () => {
    expect(() => readObject({ data: 'string' }, 'data')).toThrow('must be an object');
  });

  it('throws for arrays', () => {
    expect(() => readObject({ data: [1, 2] }, 'data')).toThrow('must be an object');
  });
});
