import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as loginSelectorsModule from '../../auth/loginSelectors.js';
import type { ElementHandle, Page } from 'playwright-core';

vi.mock('../../errors.js', async () => {
  const actual = await vi.importActual<typeof import('../../errors.js')>('../../errors.js');  // eslint-disable-line @typescript-eslint/consistent-type-imports
  return actual;
});

type MockPage = Pick<Page, '$' | 'fill' | 'click' | 'type'>;

function createMockPage(): MockPage {
  return {
    $: vi.fn(),
    fill: vi.fn(),
    click: vi.fn(),
    type: vi.fn(),
  } as unknown as MockPage;
}

describe('loginSelectors', () => {
  const originalEmail = process.env.BLOOMREACH_EMAIL;
  const originalPassword = process.env.BLOOMREACH_PASSWORD;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.BLOOMREACH_EMAIL;
    delete process.env.BLOOMREACH_PASSWORD;
  });

  it('getLoginSelectors returns expected selector structure and order', () => {
    const selectors = loginSelectorsModule.getLoginSelectors();

    expect(selectors.emailInput.map((candidate) => candidate.selector)).toEqual([
      '[data-e2e-id="loginForm"] input[name="username"]',
      'input[name="username"]',
      'input[type="email"]',
      'input[name="email"], input[id="email"]',
    ]);

    expect(selectors.passwordInput.map((candidate) => candidate.selector)).toEqual([
      '[data-e2e-id="loginForm"] input[name="password"]',
      'input[type="password"]',
      'input[name="password"], input[id="password"]',
    ]);

    expect(selectors.submitButton.map((candidate) => candidate.selector)).toEqual([
      '[data-e2e-id="loginScreenLoginButton"]',
      'button[type="submit"]',
      'button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Continue")',
    ]);
  });

  it('resolveAutoFillConfig reads configured env vars', () => {
    process.env.BLOOMREACH_EMAIL = 'test@example.com';
    process.env.BLOOMREACH_PASSWORD = 'topsecret';

    expect(loginSelectorsModule.resolveAutoFillConfig()).toEqual({
      email: 'test@example.com',
      password: 'topsecret',
    });
  });

  it('resolveAutoFillConfig returns undefined values when env vars are absent', () => {
    expect(loginSelectorsModule.resolveAutoFillConfig()).toEqual({
      email: undefined,
      password: undefined,
    });
  });

  it('findElement falls back to later selectors when earlier selectors miss', async () => {
    const page = createMockPage();
    const handle = { description: 'email input handle' } as unknown as ElementHandle;
    vi.mocked(page.$)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(handle);

    const selectors = loginSelectorsModule.getLoginSelectors();
    const found = await loginSelectorsModule.findElement(page as Page, selectors.emailInput, 20);

    expect(found).toBe(handle);
    expect(page.$).toHaveBeenNthCalledWith(1, '[data-e2e-id="loginForm"] input[name="username"]');
    expect(page.$).toHaveBeenNthCalledWith(2, 'input[name="username"]');
  });

  it('findElement continues after selector errors and returns null when all fail', async () => {
    const page = createMockPage();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(page.$)
      .mockRejectedValueOnce(new Error('bad selector'))
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const selectors = loginSelectorsModule.getLoginSelectors();
    const found = await loginSelectorsModule.findElement(page as Page, selectors.emailInput, 20);

    expect(found).toBeNull();
    expect(console.warn).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('tryAutoFill returns false when credentials are not provided', async () => {
    const page = createMockPage();

    const result = await loginSelectorsModule.tryAutoFill(page as Page, {});

    expect(result).toBe(false);
    expect(page.fill).not.toHaveBeenCalled();
    expect(page.click).not.toHaveBeenCalled();
  });

  it('tryAutoFill fills both fields and clicks submit when both credentials are present', async () => {
    const page = createMockPage();
    const handle = { description: 'element handle' } as unknown as ElementHandle;
    vi.mocked(page.$).mockResolvedValue(handle);
    vi.mocked(page.fill).mockResolvedValue(undefined);
    vi.mocked(page.click).mockResolvedValue(undefined);
    vi.mocked(page.type).mockResolvedValue(undefined);

    const result = await loginSelectorsModule.tryAutoFill(page as Page, {
      email: 'test@example.com',
      password: 'secret',
    });

    expect(result).toBe(true);
    // Each field: click(selector) + fill(selector, '') + type(selector, value)
    expect(page.click).toHaveBeenCalledWith('[data-e2e-id="loginForm"] input[name="username"]');
    expect(page.type).toHaveBeenCalledWith('[data-e2e-id="loginForm"] input[name="username"]', 'test@example.com', { delay: 20 });
    expect(page.click).toHaveBeenCalledWith('[data-e2e-id="loginForm"] input[name="password"]');
    expect(page.type).toHaveBeenCalledWith('[data-e2e-id="loginForm"] input[name="password"]', 'secret', { delay: 20 });
    // Submit button click
    expect(page.click).toHaveBeenCalledWith('[data-e2e-id="loginScreenLoginButton"]');
  });

  it('tryAutoFill handles fill errors gracefully and returns false when nothing is filled', async () => {
    const page = createMockPage();
    const handle = { description: 'element handle' } as unknown as ElementHandle;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(page.$).mockResolvedValue(handle);
    vi.mocked(page.click).mockRejectedValue(new Error('click failed'));

    const result = await loginSelectorsModule.tryAutoFill(page as Page, {
      email: 'test@example.com',
    });

    expect(result).toBe(false);
    expect(page.click).toHaveBeenCalledTimes(4);
    expect(console.warn).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('restores env vars for test isolation', () => {
    if (originalEmail === undefined) {
      delete process.env.BLOOMREACH_EMAIL;
    } else {
      process.env.BLOOMREACH_EMAIL = originalEmail;
    }

    if (originalPassword === undefined) {
      delete process.env.BLOOMREACH_PASSWORD;
    } else {
      process.env.BLOOMREACH_PASSWORD = originalPassword;
    }

    expect(process.env.BLOOMREACH_EMAIL).toBe(originalEmail);
    expect(process.env.BLOOMREACH_PASSWORD).toBe(originalPassword);
  });
});
