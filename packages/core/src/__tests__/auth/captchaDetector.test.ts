import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Page } from 'playwright-core';
import {
  detectCaptcha,
  isCaptchaVisible,
  waitForCaptchaResolution,
  CAPTCHA_VISIBLE_THRESHOLD,
  DEFAULT_CAPTCHA_TIMEOUT_MS,
  DEFAULT_CAPTCHA_POLL_INTERVAL_MS,
} from '../../auth/captchaDetector.js';

function createMockPage(evaluateResult: unknown = null): Page {
  const urlFn = vi.fn().mockReturnValue('https://eu.login.bloomreach.com/login');
  return {
    evaluate: vi.fn().mockResolvedValue(evaluateResult),
    url: urlFn,
  } as unknown as Page;
}

describe('captchaDetector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('detectCaptcha returns detected: false when page.evaluate finds no CAPTCHA iframes', async () => {
    const page = createMockPage({ detected: false, type: null, iframeSelector: null });

    const result = await detectCaptcha(page);

    expect(result).toEqual({ detected: false, type: null, iframeSelector: null });
  });

  it('detectCaptcha returns detected: false when bframe iframe is below visibility threshold', async () => {
    const page = createMockPage({
      detected: false,
      type: null,
      iframeSelector: 'iframe[src*="google.com/recaptcha"][src*="bframe"]',
      measured: {
        width: CAPTCHA_VISIBLE_THRESHOLD.width,
        height: CAPTCHA_VISIBLE_THRESHOLD.height,
      },
    });

    const result = await detectCaptcha(page);

    expect(result.detected).toBe(false);
  });

  it('detectCaptcha returns detected: true when bframe iframe exceeds threshold', async () => {
    const page = createMockPage({
      detected: true,
      type: 'recaptcha-v2-invisible',
      iframeSelector: 'iframe[src*="google.com/recaptcha"][src*="bframe"]',
    });

    const result = await detectCaptcha(page);

    expect(result.detected).toBe(true);
  });

  it('detectCaptcha returns type recaptcha-v2-invisible when detected', async () => {
    const page = createMockPage({
      detected: true,
      type: 'recaptcha-v2-invisible',
      iframeSelector: 'iframe[src*="google.com/recaptcha"][src*="bframe"]',
    });

    const result = await detectCaptcha(page);

    expect(result.type).toBe('recaptcha-v2-invisible');
  });

  it('detectCaptcha returns iframeSelector with matched selector string', async () => {
    const matchedSelector = 'iframe[title="recaptcha challenge expires in two minutes"]';
    const page = createMockPage({
      detected: true,
      type: 'recaptcha-v2-invisible',
      iframeSelector: matchedSelector,
    });

    const result = await detectCaptcha(page);

    expect(result.iframeSelector).toBe(matchedSelector);
  });

  it('detectCaptcha handles page.evaluate throwing gracefully (returns detected: false)', async () => {
    const page = createMockPage();
    vi.mocked(page.evaluate).mockRejectedValueOnce(new Error('evaluate failed'));

    const result = await detectCaptcha(page);

    expect(result).toEqual({ detected: false, type: null, iframeSelector: null });
  });

  it('isCaptchaVisible returns false for no CAPTCHA', async () => {
    const page = createMockPage({ detected: false, type: null, iframeSelector: null });

    const visible = await isCaptchaVisible(page);

    expect(visible).toBe(false);
  });

  it('isCaptchaVisible returns true for visible CAPTCHA', async () => {
    const page = createMockPage({
      detected: true,
      type: 'recaptcha-v2-invisible',
      iframeSelector: 'iframe[src*="google.com/recaptcha"][src*="bframe"]',
    });

    const visible = await isCaptchaVisible(page);

    expect(visible).toBe(true);
  });

  it('waitForCaptchaResolution resolves immediately when isResolved returns true', async () => {
    const page = createMockPage({
      detected: true,
      type: 'recaptcha-v2-invisible',
      iframeSelector: 'iframe[src*="google.com/recaptcha"][src*="bframe"]',
    });
    const isResolved = vi.fn().mockReturnValue(true);

    const result = await waitForCaptchaResolution(page, isResolved);

    expect(result).toEqual({ resolved: true, timedOut: false });
    expect(page.evaluate).not.toHaveBeenCalled();
  });

  it('waitForCaptchaResolution resolves when CAPTCHA disappears after being detected', async () => {
    vi.useFakeTimers();
    const page = createMockPage();
    vi.mocked(page.evaluate)
      .mockResolvedValueOnce({
        detected: true,
        type: 'recaptcha-v2-invisible',
        iframeSelector: 'iframe[src*="google.com/recaptcha"][src*="bframe"]',
      })
      .mockResolvedValueOnce({ detected: false, type: null, iframeSelector: null });
    const isResolved = vi.fn().mockReturnValue(false);

    const promise = waitForCaptchaResolution(page, isResolved, {
      timeoutMs: 20_000,
      pollIntervalMs: 1_000,
    });

    await vi.advanceTimersByTimeAsync(1_000);
    const result = await promise;

    expect(result).toEqual({ resolved: true, timedOut: false });
    expect(page.evaluate).toHaveBeenCalledTimes(2);
  });

  it('waitForCaptchaResolution returns timedOut true when timeout exceeded', async () => {
    vi.useFakeTimers();
    const page = createMockPage({
      detected: true,
      type: 'recaptcha-v2-invisible',
      iframeSelector: 'iframe[src*="google.com/recaptcha"][src*="bframe"]',
    });
    const isResolved = vi.fn().mockReturnValue(false);

    const promise = waitForCaptchaResolution(page, isResolved, {
      timeoutMs: 5_000,
      pollIntervalMs: 1_000,
    });

    await vi.advanceTimersByTimeAsync(6_000);
    const result = await promise;

    expect(result).toEqual({ resolved: false, timedOut: true });
  });

  it('waitForCaptchaResolution calls onDetected callback exactly once', async () => {
    vi.useFakeTimers();
    const page = createMockPage({
      detected: true,
      type: 'recaptcha-v2-invisible',
      iframeSelector: 'iframe[src*="google.com/recaptcha"][src*="bframe"]',
    });
    const isResolved = vi.fn().mockReturnValue(false);
    const onDetected = vi.fn();

    const promise = waitForCaptchaResolution(page, isResolved, {
      timeoutMs: 4_000,
      pollIntervalMs: 1_000,
      onDetected,
    });

    await vi.advanceTimersByTimeAsync(5_000);
    const result = await promise;

    expect(result).toEqual({ resolved: false, timedOut: true });
    expect(onDetected).toHaveBeenCalledTimes(1);
  });

  it('waitForCaptchaResolution uses default timeout and poll interval', async () => {
    vi.useFakeTimers();
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const page = createMockPage({
      detected: true,
      type: 'recaptcha-v2-invisible',
      iframeSelector: 'iframe[src*="google.com/recaptcha"][src*="bframe"]',
    });
    const isResolved = vi.fn().mockReturnValue(false);

    const promise = waitForCaptchaResolution(page, isResolved);

    await vi.advanceTimersByTimeAsync(
      DEFAULT_CAPTCHA_TIMEOUT_MS + DEFAULT_CAPTCHA_POLL_INTERVAL_MS,
    );
    const result = await promise;

    expect(result).toEqual({ resolved: false, timedOut: true });
    expect(
      setTimeoutSpy.mock.calls.some((call) => call[1] === DEFAULT_CAPTCHA_POLL_INTERVAL_MS),
    ).toBe(true);

    setTimeoutSpy.mockRestore();
  });
});
