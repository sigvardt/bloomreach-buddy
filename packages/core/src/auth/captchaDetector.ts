import type { Page } from 'playwright-core';

export interface CaptchaDetectionResult {
  detected: boolean;
  type: 'recaptcha-v2-invisible' | null;
  iframeSelector: string | null;
}

export interface CaptchaWaitOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
  onDetected?: () => void;
}

/** Minimum dimensions (px) that indicate the reCAPTCHA challenge bframe is actively showing an image grid. */
export const CAPTCHA_VISIBLE_THRESHOLD = { width: 280, height: 280 };

/** Default timeout (ms) for waiting for user to solve CAPTCHA. */
export const DEFAULT_CAPTCHA_TIMEOUT_MS = 120_000;

/** Default poll interval (ms) for checking CAPTCHA resolution. */
export const DEFAULT_CAPTCHA_POLL_INTERVAL_MS = 2_000;

const CAPTCHA_IFRAME_SELECTORS = [
  'iframe[title="recaptcha challenge expires in two minutes"]',
  'iframe[src*="google.com/recaptcha"][src*="bframe"]',
] as const;

interface EvaluateArgs {
  selectors: readonly string[];
  threshold: { width: number; height: number };
}

interface BrowserRect {
  width: number;
  height: number;
}

interface BrowserStyle {
  display: string;
  visibility: string;
  opacity: string;
}

interface BrowserIframeElement {
  getBoundingClientRect: () => BrowserRect;
}

interface BrowserDocument {
  querySelector: (selector: string) => BrowserIframeElement | null;
}

interface BrowserWindow {
  getComputedStyle: (element: BrowserIframeElement) => BrowserStyle;
}

const NO_CAPTCHA_RESULT: CaptchaDetectionResult = {
  detected: false,
  type: null,
  iframeSelector: null,
};

export async function detectCaptcha(page: Page): Promise<CaptchaDetectionResult> {
  try {
    const evaluation = await page.evaluate(
      ({ selectors, threshold }: EvaluateArgs) => {
        const browserDocument = (globalThis as { document?: BrowserDocument }).document;
        const browserWindow = (globalThis as { window?: BrowserWindow }).window;

        if (!browserDocument || !browserWindow) {
          return {
            detected: false,
            type: null,
            iframeSelector: null,
          };
        }

        for (const selector of selectors) {
          const iframe = browserDocument.querySelector(selector);
          if (!iframe) {
            continue;
          }

          const rect = iframe.getBoundingClientRect();
          const style = browserWindow.getComputedStyle(iframe);
          const isVisible =
            rect.width > threshold.width &&
            rect.height > threshold.height &&
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0';

          if (isVisible) {
            return {
              detected: true,
              type: 'recaptcha-v2-invisible',
              iframeSelector: selector,
            };
          }
        }

        return {
          detected: false,
          type: null,
          iframeSelector: null,
        };
      },
      {
        selectors: CAPTCHA_IFRAME_SELECTORS,
        threshold: CAPTCHA_VISIBLE_THRESHOLD,
      },
    );

    if (
      typeof evaluation === 'object' &&
      evaluation !== null &&
      'detected' in evaluation &&
      evaluation.detected === true &&
      'type' in evaluation &&
      evaluation.type === 'recaptcha-v2-invisible' &&
      'iframeSelector' in evaluation &&
      typeof evaluation.iframeSelector === 'string'
    ) {
      return {
        detected: true,
        type: 'recaptcha-v2-invisible',
        iframeSelector: evaluation.iframeSelector,
      };
    }

    return NO_CAPTCHA_RESULT;
  } catch {
    return NO_CAPTCHA_RESULT;
  }
}

export async function isCaptchaVisible(page: Page): Promise<boolean> {
  const result = await detectCaptcha(page);
  return result.detected;
}

export async function waitForCaptchaResolution(
  page: Page,
  isResolved: (url: string) => boolean,
  options: CaptchaWaitOptions = {},
): Promise<{ resolved: boolean; timedOut: boolean }> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_CAPTCHA_TIMEOUT_MS;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_CAPTCHA_POLL_INTERVAL_MS;
  const deadline = Date.now() + timeoutMs;
  let hasTriggeredDetectedCallback = false;

  while (Date.now() <= deadline) {
    const currentUrl = page.url();
    if (isResolved(currentUrl)) {
      return { resolved: true, timedOut: false };
    }

    const captchaVisible = await isCaptchaVisible(page);
    if (captchaVisible) {
      if (!hasTriggeredDetectedCallback) {
        options.onDetected?.();
        hasTriggeredDetectedCallback = true;
      }
    } else {
      return { resolved: true, timedOut: false };
    }

    if (Date.now() > deadline) {
      break;
    }

    await new Promise<void>((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return { resolved: false, timedOut: true };
}
