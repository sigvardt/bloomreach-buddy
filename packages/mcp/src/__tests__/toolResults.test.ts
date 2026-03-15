import { describe, it, expect } from 'vitest';
import { BloomreachBuddyError } from '@bloomreach-buddy/core';
import { toToolResult, toErrorResult, buildRecoveryHint } from '../toolResults.js';

describe('toToolResult', () => {
  it('wraps payload in MCP text content', () => {
    const result = toToolResult({ items: [1, 2] });
    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify({ items: [1, 2] }, null, 2) }],
    });
  });

  it('handles null payload', () => {
    const result = toToolResult(null);
    expect(result.content[0]?.text).toBe('null');
  });

  it('handles string payload', () => {
    const result = toToolResult('ok');
    expect(result.content[0]?.text).toBe('"ok"');
  });
});

describe('toErrorResult', () => {
  it('wraps generic Error with UNKNOWN code and recovery hint', () => {
    const result = toErrorResult(new Error('something broke'));
    expect(result.isError).toBe(true);

    const payload = JSON.parse(result.content[0]?.text ?? '{}') as Record<string, unknown>;
    expect(payload.code).toBe('UNKNOWN');
    expect(payload.message).toBe('something broke');
    expect(payload.recovery_hint).toBeTruthy();
  });

  it('wraps BloomreachBuddyError with its error code', () => {
    const error = new BloomreachBuddyError('API_ERROR', 'Bad request');
    const result = toErrorResult(error);

    const payload = JSON.parse(result.content[0]?.text ?? '{}') as Record<string, unknown>;
    expect(payload.code).toBe('API_ERROR');
    expect(payload.message).toBe('Bad request');
  });

  it('handles non-Error values', () => {
    const result = toErrorResult('string error');
    const payload = JSON.parse(result.content[0]?.text ?? '{}') as Record<string, unknown>;
    expect(payload.code).toBe('UNKNOWN');
    expect(payload.message).toBe('string error');
  });
});

describe('buildRecoveryHint', () => {
  it('returns CONFIG_MISSING hint for config errors', () => {
    const error = new BloomreachBuddyError('CONFIG_MISSING', 'no config');
    expect(buildRecoveryHint(error)).toContain('BLOOMREACH_PROJECT_TOKEN');
  });

  it('returns TIMEOUT hint for timeout errors', () => {
    const error = new BloomreachBuddyError('TIMEOUT', 'timed out');
    expect(buildRecoveryHint(error)).toContain('timed out');
  });

  it('returns RATE_LIMITED hint for rate limit errors', () => {
    const error = new BloomreachBuddyError('RATE_LIMITED', 'too fast');
    expect(buildRecoveryHint(error)).toContain('rate limit');
  });

  it('returns API_ERROR hint for API errors', () => {
    const error = new BloomreachBuddyError('API_ERROR', 'bad request');
    expect(buildRecoveryHint(error)).toContain('API');
  });

  it('returns NETWORK_ERROR hint for network errors', () => {
    const error = new BloomreachBuddyError('NETWORK_ERROR', 'disconnected');
    expect(buildRecoveryHint(error)).toContain('network');
  });

  it('returns generic hint for non-Bloomreach errors', () => {
    const hint = buildRecoveryHint(new Error('generic'));
    expect(hint).toContain('unexpected error');
  });
});
