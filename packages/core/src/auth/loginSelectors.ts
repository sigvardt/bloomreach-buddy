import type { ElementHandle, Page } from 'playwright-core';
import { BloomreachBuddyError } from '../errors.js';

/** A selector candidate with strategy metadata and plain selector text. */
export interface SelectorCandidate {
  strategy: 'role' | 'attribute' | 'text' | 'xpath';
  selector: string;
  description: string;
}

/** Multi-strategy selectors for Bloomreach login form elements. */
export interface LoginPageSelectors {
  emailInput: SelectorCandidate[];
  passwordInput: SelectorCandidate[];
  submitButton: SelectorCandidate[];
}

/** Optional credentials used for login auto-fill. */
export interface AutoFillConfig {
  email?: string;
  password?: string;
}

const DEFAULT_CANDIDATE_TIMEOUT_MS = 3_000;

/** Get multi-strategy selectors for the Bloomreach login page. */
export function getLoginSelectors(): LoginPageSelectors {
  return {
    emailInput: [
      {
        strategy: 'attribute',
        selector: '[data-e2e-id="loginForm"] input[name="username"]',
        description: 'Bloomreach login form username input (Angular e2e test ID)',
      },
      {
        strategy: 'attribute',
        selector: 'input[name="username"]',
        description: 'Username input by name attribute',
      },
      {
        strategy: 'role',
        selector: 'input[type="email"]',
        description: 'Generic email input fallback',
      },
      {
        strategy: 'attribute',
        selector: 'input[name="email"], input[id="email"]',
        description: 'Email input by alternative name/id attributes',
      },
    ],
    passwordInput: [
      {
        strategy: 'attribute',
        selector: '[data-e2e-id="loginForm"] input[name="password"]',
        description: 'Bloomreach login form password input (Angular e2e test ID)',
      },
      {
        strategy: 'role',
        selector: 'input[type="password"]',
        description: 'Password input by type attribute',
      },
      {
        strategy: 'attribute',
        selector: 'input[name="password"], input[id="password"]',
        description: 'Password input by common name/id attributes',
      },
    ],
    submitButton: [
      {
        strategy: 'attribute',
        selector: '[data-e2e-id="loginScreenLoginButton"]',
        description: 'Bloomreach login button (Angular e2e test ID)',
      },
      {
        strategy: 'role',
        selector: 'button[type="submit"]',
        description: 'Submit button by type attribute',
      },
      {
        strategy: 'text',
        selector:
          'button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Continue")',
        description: 'Submit button by visible label text',
      },
    ],
  };
}

/** Resolve auto-fill config from environment variables. */
export function resolveAutoFillConfig(): AutoFillConfig {
  return {
    email: process.env.BLOOMREACH_EMAIL,
    password: process.env.BLOOMREACH_PASSWORD,
  };
}

function normalizeError(error: unknown, context: string, selector: string): BloomreachBuddyError {
  if (error instanceof BloomreachBuddyError) {
    return error;
  }

  if (error instanceof Error) {
    return new BloomreachBuddyError('UNKNOWN', `${context}: ${error.message}`, {
      selector,
      causeName: error.name,
    });
  }

  return new BloomreachBuddyError('UNKNOWN', `${context}: ${String(error)}`, { selector });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, selector: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new BloomreachBuddyError('TIMEOUT', `Timed out after ${timeoutMs}ms while locating element.`, {
              selector,
              timeoutMs,
            }),
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

/** Try each selector candidate in order, return first match or null. */
export async function findElement(
  page: Page,
  candidates: SelectorCandidate[],
  timeoutMs = DEFAULT_CANDIDATE_TIMEOUT_MS,
): Promise<ElementHandle | null> {
  for (const candidate of candidates) {
    try {
      const match = await withTimeout(page.$(candidate.selector), timeoutMs, candidate.selector);
      if (match) {
        return match;
      }
    } catch (error) {
      const normalized = normalizeError(error, 'Selector lookup failed', candidate.selector);
      console.warn(`[loginSelectors] ${normalized.message}`);
    }
  }

  return null;
}

async function tryFillByCandidates(
  page: Page,
  candidates: SelectorCandidate[],
  value: string,
): Promise<boolean> {
  for (const candidate of candidates) {
    try {
      await page.fill(candidate.selector, value);
      return true;
    } catch (error) {
      const normalized = normalizeError(error, 'Field fill failed', candidate.selector);
      console.warn(`[loginSelectors] ${normalized.message}`);
    }
  }

  return false;
}

async function tryClickByCandidates(page: Page, candidates: SelectorCandidate[]): Promise<boolean> {
  for (const candidate of candidates) {
    try {
      await page.click(candidate.selector);
      return true;
    } catch (error) {
      const normalized = normalizeError(error, 'Submit click failed', candidate.selector);
      console.warn(`[loginSelectors] ${normalized.message}`);
    }
  }

  return false;
}

/** Attempt auto-fill of login form. Returns true if credentials were filled. */
export async function tryAutoFill(
  page: Page,
  config: AutoFillConfig,
  selectors: LoginPageSelectors = getLoginSelectors(),
): Promise<boolean> {
  if (!config.email && !config.password) {
    return false;
  }

  let emailFilled = false;
  let passwordFilled = false;

  if (config.email) {
    const emailElement = await findElement(page, selectors.emailInput);
    if (emailElement) {
      emailFilled = await tryFillByCandidates(page, selectors.emailInput, config.email);
    }
  }

  if (config.password) {
    const passwordElement = await findElement(page, selectors.passwordInput);
    if (passwordElement) {
      passwordFilled = await tryFillByCandidates(page, selectors.passwordInput, config.password);
    }
  }

  if (emailFilled && passwordFilled) {
    const submitElement = await findElement(page, selectors.submitButton);
    if (submitElement) {
      await tryClickByCandidates(page, selectors.submitButton);
    }
  }

  return emailFilled || passwordFilled;
}
