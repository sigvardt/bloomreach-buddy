# ARCHITECTURE.md — Bloomreach Buddy

> Design patterns and conventions for bloomreach-buddy, informed by studying [linkedin-buddy](https://github.com/sigvardt/linkedin-buddy) and [XActions](https://github.com/nirholas/XActions).

---

## 1. Monorepo Structure

**Adopted from**: linkedin-buddy (`packages/core`, `packages/cli`, `packages/mcp`)

bloomreach-buddy uses a three-package monorepo with npm workspaces:

```
bloomreach-buddy/
├── packages/
│   ├── core/              # Shared runtime: browser automation, auth, feature modules, state
│   ├── cli/               # Operator CLI (Commander.js): `bloomreach` command
│   └── mcp/               # MCP server (stdio): `bloomreach-mcp` for AI agents
├── docs/                  # Design docs, guides, research
├── examples/              # Config templates, usage examples
├── test/                  # E2E test fixtures and replay data
├── scripts/               # Build and release helpers
├── package.json           # Workspace root
├── tsconfig.json          # Project references
├── tsconfig.base.json     # Shared compiler options
├── eslint.config.mjs      # Shared lint config
├── vitest.config.ts       # Unit test config
├── vitest.config.e2e.ts   # E2E test config
└── ARCHITECTURE.md        # This file
```

### Why this layout

| Concern         | Decision                                    | Rationale                                                          |
| --------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| Package manager | npm workspaces                              | Matches linkedin-buddy; simpler than pnpm for a three-package repo |
| Module system   | ESM only (`"type": "module"`)               | Both reference repos use ESM; Node 22+ supports it natively        |
| TypeScript      | Strict mode, project references             | linkedin-buddy uses `tsc -b` for incremental workspace builds      |
| Entry points    | `dist/` output, `.js` extensions in imports | ESM convention from linkedin-buddy                                 |

### Package dependency graph

```
@bloomreach-buddy/cli  ──depends-on──▶  @bloomreach-buddy/core
@bloomreach-buddy/mcp  ──depends-on──▶  @bloomreach-buddy/core
```

Both CLI and MCP create a runtime instance from core. Neither depends on the other.

### Reference files

- linkedin-buddy root: `/Users/user/repositories/linkedin-owa-agentools/package.json` — workspace config, Node 22+, ESM
- linkedin-buddy tsconfig: `/Users/user/repositories/linkedin-owa-agentools/tsconfig.base.json` — `ES2022`, `NodeNext`, strict
- XActions: `/tmp/xactions-reference/package.json` — single-repo layout (not monorepo), Node 18+

### Key contrast with XActions

XActions uses a **flat single-repo** layout (`src/scrapers/`, `src/mcp/`, `src/cli/` all in one package). This works for a JavaScript project but doesn't scale for TypeScript with strict type boundaries. linkedin-buddy's monorepo approach provides clean dependency boundaries and independent publishability — we adopt that.

---

## 2. Browser Automation Patterns

**Primary reference**: linkedin-buddy (Playwright)
**Secondary reference**: XActions (Puppeteer + stealth plugin)

### Chosen approach: Playwright with persistent browser profiles

Bloomreach Buddy uses **Playwright** (not Puppeteer) for browser automation, following linkedin-buddy's approach.

| Aspect             | linkedin-buddy (adopted)                                 | XActions (considered)                          |
| ------------------ | -------------------------------------------------------- | ---------------------------------------------- |
| Library            | `playwright-core`                                        | `puppeteer` + `puppeteer-extra-plugin-stealth` |
| Browser management | `launchPersistentContext` or CDP connection              | `createBrowser()` with stealth plugin          |
| Profile isolation  | File-locked persistent profiles at `~/.linkedin-buddy/`  | Cookie-based via `auth_token`                  |
| Page interaction   | Custom `HumanizedPage` wrapper + `EvasionSession`        | Direct Puppeteer `page` API                    |
| Anti-detection     | Multi-level evasion profiles (minimal/moderate/paranoid) | Stealth plugin (automated)                     |

### Browser lifecycle

```
User authenticates once (manual login or session capture)
    ↓
ProfileManager acquires file lock on profile directory
    ↓
Playwright launches persistent context (or connects via CDP)
    ↓
EvasionSession hardens fingerprint on each page
    ↓
Feature modules interact with pages through humanized wrappers
    ↓
Context closes, file lock releases
```

### Connection pool (from linkedin-buddy)

The `CDPConnectionPool` pattern allows reusing browser connections across operations:

```typescript
// From: packages/core/src/connectionPool.ts
export class CDPConnectionPool {
  private connections = new Map<string, PooledConnection>();
  private readonly lock = new AsyncLock();

  async acquire(cdpUrl: string): Promise<ConnectionLease> {
    return this.lock.run(async () => {
      // Reuse existing connection or create new one
      // Enforce idle timeout and max connection age
      // Return { context, release() }
    });
  }
}
```

### Profile manager (from linkedin-buddy)

File-locked persistent Playwright contexts prevent concurrent access:

```typescript
// From: packages/core/src/profileManager.ts
export class ProfileManager {
  async withProfileLock<T>(
    profileName: string,
    callback: (userDataDir: string) => Promise<T>,
  ): Promise<T> {
    // Acquire file lock via proper-lockfile
    // Execute callback with exclusive access
    // Release lock in finally block
  }

  async runWithPersistentContext<T>(profileName: string, options, callback): Promise<T> {
    return this.withProfileLock(profileName, async (userDataDir) => {
      const context = await chromium.launchPersistentContext(userDataDir, launchOptions);
      // ...
    });
  }
}
```

### Reference files

- linkedin-buddy ProfileManager: `packages/core/src/profileManager.ts` (222 lines)
- linkedin-buddy ConnectionPool: `packages/core/src/connectionPool.ts` (228 lines)
- linkedin-buddy page wrapping: `packages/core/src/linkedinPage.ts` (886 lines)
- XActions browser setup: `src/scrapers/twitter/index.js` — `createBrowser()` + `createPage()` with stealth

---

## 3. Feature Module Convention

**Adopted from**: linkedin-buddy (one file per feature area)

Each Bloomreach feature area gets a dedicated module file in `packages/core/src/`:

```
packages/core/src/
├── bloomreachContent.ts         # Content management (documents, pages, folders)
├── bloomreachDiscovery.ts       # Search & merchandising configuration
├── bloomreachEngagement.ts      # Marketing campaigns, push notifications
├── bloomreachExperience.ts      # Experience Manager page builder
├── bloomreachSitemap.ts         # Sitemap configuration
├── bloomreachUsers.ts           # User/account management in dashboard
└── ...
```

### Feature module pattern (from linkedin-buddy)

Each module follows this structure:

```typescript
// 1. Result types
export interface BloomreachContentDocument {
  document_id: string;
  name: string;
  state: string;
  // ...
}

// 2. Runtime interface (injected dependencies)
export interface BloomreachContentRuntime extends BloomreachContentExecutorRuntime {
  twoPhaseCommit: Pick<TwoPhaseCommitService<BloomreachContentExecutorRuntime>, 'prepare'>;
}

// 3. Service class with read-only methods and prepare* mutation methods
export class BloomreachContentService {
  async listDocuments(input: ListDocumentsInput): Promise<BloomreachContentDocument[]> {
    // Read-only: navigate, extract, return
  }

  async preparePublishDocument(input: PublishDocumentInput): Promise<PreparedActionResult> {
    // Mutation: validate, create preview, return confirm token
    return this.twoPhaseCommit.prepare({
      actionType: 'content.publish',
      target: { documentId: input.documentId },
      payload: {
        /* changes */
      },
      preview: {
        /* human-readable summary */
      },
    });
  }
}

// 4. Action executors for confirmed mutations
export class PublishDocumentActionExecutor implements ActionExecutor<BloomreachContentExecutorRuntime> {
  async execute(
    input: ActionExecutorInput<BloomreachContentExecutorRuntime>,
  ): Promise<ActionExecutorResult> {
    // Execute the confirmed action in the browser
  }
}

// 5. Executor registry factory
export function createContentActionExecutors(): ActionExecutorRegistry<BloomreachContentExecutorRuntime> {
  return {
    'content.publish': new PublishDocumentActionExecutor(),
    'content.delete': new DeleteDocumentActionExecutor(),
  };
}
```

### Runtime service graph (from linkedin-buddy)

All feature services are composed in a central runtime factory:

```typescript
// From: packages/core/src/runtime.ts (519 lines)
export function createCoreRuntime(options?: RuntimeOptions): CoreRuntime {
  const db = new AssistantDatabase(paths.dbPath);
  const rateLimiter = new RateLimiter(db);
  const twoPhaseCommit = new TwoPhaseCommitService(db, executors);
  const auth = new BloomreachAuthService(/* ... */);
  const content = new BloomreachContentService(/* ... */);
  // ... compose all services
  return { auth, content, discovery, /* ... */, close() { db.close(); } };
}
```

### Reference files

- linkedin-buddy feature modules: `packages/core/src/linkedinSearch.ts` (990 lines), `linkedinFeed.ts` (3659 lines), `linkedinProfile.ts` (8448 lines), `linkedinInbox.ts` (4097 lines), etc.
- linkedin-buddy runtime factory: `packages/core/src/runtime.ts` (519 lines)
- XActions feature modules: `src/scrapers/twitter/index.js` — flat function exports (`scrapeProfile`, `scrapeFollowers`, etc.)

---

## 4. Auth/Session Management

**Primary reference**: linkedin-buddy (persistent Playwright profiles + encrypted session store)
**Secondary reference**: XActions (cookie-based auth via `auth_token`)

### Chosen approach: Persistent browser profiles with session capture

Bloomreach Buddy uses linkedin-buddy's auth model adapted for Bloomreach:

1. **Manual login**: User logs in through a visible browser window. Cookies persist in the Playwright profile directory.
2. **Session capture**: Encrypted snapshot of browser storage state for headless restore.
3. **Health check**: Verify session validity before operations.

### Auth service interface (from linkedin-buddy)

```typescript
// From: packages/core/src/auth/session.ts
export interface SessionStatus {
  authenticated: boolean;
  checkedAt: string;
  currentUrl: string;
  reason: string;
  sessionCookiePresent?: boolean;
}

export class BloomreachAuthService {
  async status(options: SessionOptions): Promise<SessionStatus> {
    /* ... */
  }
  async openLogin(options: OpenLoginOptions): Promise<OpenLoginResult> {
    /* ... */
  }
  async ensureAuthenticated(options: SessionOptions): Promise<SessionStatus> {
    /* ... */
  }
}
```

### Session persistence (from linkedin-buddy)

```typescript
// From: packages/core/src/auth/sessionStore.ts
// AES-GCM encrypted storage of browser state
// Cookie metadata extraction and fingerprinting
// Session expiry tracking

export function getSessionFingerprint(storageState): string {
  // SHA-256 hash of auth cookies for change detection
}

export function summarizeSessionCookies(cookies): CookieMetadata[] {
  // Extract expiry, httpOnly, secure flags for health reporting
}
```

### XActions auth approach (simpler, considered for reference)

```typescript
// XActions uses a simpler cookie-based approach:
// 1. User copies auth_token from browser DevTools
// 2. Cookie stored in ~/.xactions/config.json (plaintext)
// 3. Cookie injected into Puppeteer pages via page.setCookie()
```

### Decision for bloomreach-buddy

We adopt linkedin-buddy's more robust approach (persistent profiles + encrypted sessions) because:

- Bloomreach dashboard uses complex auth flows (SSO, MFA) that are hard to replicate with cookie injection
- Persistent profiles preserve all browser state (cookies, localStorage, IndexedDB)
- File locking prevents concurrent session corruption

### Reference files

- linkedin-buddy auth: `packages/core/src/auth/session.ts` (732 lines) — login, status, ensureAuthenticated
- linkedin-buddy session store: `packages/core/src/auth/sessionStore.ts` (1031 lines) — encrypted persistence, fingerprinting
- linkedin-buddy session inspection: `packages/core/src/auth/sessionInspection.ts` — URL-based auth detection
- linkedin-buddy login selectors: `packages/core/src/auth/loginSelectors.ts` — form selectors
- XActions auth: `src/auth/teamManager.js` — multi-account team management
- XActions CLI login: `src/cli/index.js` lines 126-150 — interactive cookie prompt

---

## 5. Evasion Strategy

**Primary reference**: linkedin-buddy (multi-level evasion profiles)
**Secondary reference**: XActions (puppeteer-extra-plugin-stealth)

### Chosen approach: Configurable evasion profiles

Bloomreach dashboards may have bot detection. We adopt linkedin-buddy's tiered evasion system:

### Evasion levels

| Level                | Use Case                 | Features                                                                       |
| -------------------- | ------------------------ | ------------------------------------------------------------------------------ |
| `minimal`            | Development, testing     | No behavioral simulation                                                       |
| `moderate` (default) | Normal operation         | Bezier mouse, momentum scroll, fingerprint hardening, Poisson intervals        |
| `paranoid`           | Aggressive bot detection | All moderate features + tab blur simulation, viewport resize, higher overshoot |

### Evasion profile definition (from linkedin-buddy)

```typescript
// From: packages/core/src/evasion/profiles.ts
export interface EvasionProfile {
  bezierMouseMovement: boolean; // Curved mouse paths instead of linear
  mouseOvershootFactor: number; // Overshoot target by this fraction
  mouseJitterRadius: number; // Random pixel offset per move step
  momentumScroll: boolean; // Physics-based scroll deceleration
  simulateTabBlur: boolean; // Periodically unfocus/refocus page
  simulateViewportResize: boolean; // Occasional viewport dimension changes
  idleDriftEnabled: boolean; // Small mouse movements during idle
  readingPauseWpm: number; // Simulated reading speed
  poissonIntervals: boolean; // Randomized action intervals
  fingerprintHardening: boolean; // navigator.webdriver removal, canvas noise
}

const MODERATE_PROFILE: EvasionProfile = {
  bezierMouseMovement: true,
  mouseOvershootFactor: 0.15,
  mouseJitterRadius: 3,
  momentumScroll: true,
  simulateTabBlur: false,
  simulateViewportResize: false,
  idleDriftEnabled: true,
  readingPauseWpm: 230,
  poissonIntervals: true,
  fingerprintHardening: true,
};
```

### EvasionSession class (from linkedin-buddy)

```typescript
// From: packages/core/src/evasion/session.ts (534 lines)
export class EvasionSession {
  async hardenFingerprint(): Promise<void> {
    /* ... */
  }
  async moveMouse(from: Point2D, to: Point2D): Promise<void> {
    /* ... */
  }
  async scroll(pixels: number): Promise<void> {
    /* ... */
  }
}
```

### Human-like typing (from linkedin-buddy)

```typescript
// From: packages/core/src/humanize.ts (1993 lines)
export type TypingProfileName = 'casual' | 'careful' | 'fast';

// Features: per-grapheme timing, nearby-key typos with auto-correction,
// thinking pauses, burst typing, shift-lead timing, field-specific profiles
```

### XActions approach (simpler)

XActions relies on `puppeteer-extra-plugin-stealth` which handles `navigator.webdriver` removal automatically. Rate limiting is handled by built-in 1-3 second delays between actions. This is simpler but less configurable.

### Decision for bloomreach-buddy

We use linkedin-buddy's approach because Bloomreach dashboards are internal tools with potentially different detection patterns than social media. The configurable profiles let us tune evasion intensity per environment.

### Reference files

- linkedin-buddy evasion profiles: `packages/core/src/evasion/profiles.ts` (273 lines)
- linkedin-buddy evasion session: `packages/core/src/evasion/session.ts` (534 lines)
- linkedin-buddy evasion browser: `packages/core/src/evasion/browser.ts` (534 lines)
- linkedin-buddy evasion math: `packages/core/src/evasion/math.ts` — Bezier curves, Poisson intervals
- linkedin-buddy humanize: `packages/core/src/humanize.ts` (1993 lines)
- XActions stealth: `puppeteer-extra-plugin-stealth` dependency in `package.json`

---

## 6. MCP Server Design

**Primary reference**: linkedin-buddy (namespaced tools, strict schemas, two-phase writes)
**Secondary reference**: XActions (140+ flat tools, `x_` prefix, direct actions)

### Tool naming convention

**Adopted**: linkedin-buddy's dot-notation namespacing.

```
bloomreach.<domain>.<action>
```

| Tool Name                              | Description                           |
| -------------------------------------- | ------------------------------------- |
| `bloomreach.session.status`            | Check authentication status           |
| `bloomreach.session.health`            | Full health check (browser + session) |
| `bloomreach.session.open_login`        | Open browser for manual login         |
| `bloomreach.content.list_documents`    | List content documents                |
| `bloomreach.content.view_document`     | View a single document                |
| `bloomreach.content.prepare_publish`   | Prepare document publish (two-phase)  |
| `bloomreach.discovery.list_campaigns`  | List search campaigns                 |
| `bloomreach.discovery.view_ranking`    | View ranking rules                    |
| `bloomreach.engagement.list_campaigns` | List marketing campaigns              |
| `bloomreach.actions.confirm`           | Confirm a prepared action with token  |

### Contrast with XActions naming

XActions uses flat `x_` prefix naming (`x_get_profile`, `x_get_followers`, `x_follow`, etc.). This works for a large flat tool set but becomes hard to navigate at 140+ tools. linkedin-buddy's dot-notation creates natural groupings.

### MCP tool definition pattern (from linkedin-buddy)

```typescript
// From: packages/mcp/src/index.ts — tool name constants
export const BLOOMREACH_SESSION_STATUS_TOOL = 'bloomreach.session.status';
export const BLOOMREACH_CONTENT_LIST_DOCUMENTS_TOOL = 'bloomreach.content.list_documents';
// ...

// From: packages/mcp/src/bin/bloomreach-mcp.ts — tool schema + handler
const tools: LinkedInMcpToolDefinition[] = [
  {
    name: BLOOMREACH_SESSION_STATUS_TOOL,
    description: 'Check whether the Bloomreach dashboard session is authenticated.',
    inputSchema: {
      type: 'object',
      properties: {
        profileName: { type: 'string', description: 'Browser profile name' },
        cdpUrl: { type: 'string', description: 'CDP endpoint URL' },
      },
    },
  },
];
```

### XActions MCP tool definition pattern (for reference)

```javascript
// From: /tmp/xactions-reference/src/mcp/server.js
const TOOLS = [
  {
    name: 'x_get_profile',
    description: 'Get profile information for a user.',
    inputSchema: {
      type: 'object',
      properties: {
        username: { type: 'string', description: 'Username (without @)' },
        platform: {
          type: 'string',
          enum: ['twitter', 'bluesky', 'mastodon', 'threads'],
        },
      },
      required: ['username'],
    },
  },
  // 140+ more tools...
];
```

### MCP server setup (from linkedin-buddy)

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server(
  { name: 'bloomreach-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } },
);
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // Dispatch to handler, return JSON result or error
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Result formatting (from linkedin-buddy)

```typescript
function toToolResult(payload: unknown): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
  };
}

function toErrorResult(error: unknown): ToolErrorResult {
  return {
    isError: true,
    content: [{ type: 'text', text: JSON.stringify(toErrorPayload(error), null, 2) }],
  };
}
```

### Reference files

- linkedin-buddy MCP entry: `packages/mcp/src/bin/linkedin-mcp.ts` (8013 lines)
- linkedin-buddy MCP tool names: `packages/mcp/src/index.ts` (157 lines) — 80+ tool constants
- linkedin-buddy MCP tests: `packages/mcp/src/__tests__/linkedinMcp.test.ts` (1209 lines)
- XActions MCP server: `src/mcp/server.js` (3898 lines) — 140+ tool definitions
- XActions MCP local tools: `src/mcp/local-tools.js` — Puppeteer-backed tool implementations

---

## 7. CLI Command Structure

**Primary reference**: linkedin-buddy (Commander.js, nested command groups)
**Secondary reference**: XActions (Commander.js, flat commands with chalk/ora)

### Command structure

```
bloomreach [global-options] <command> [subcommand] [options]
```

### Global options (from linkedin-buddy)

```
--cdp-url <url>           Connect to existing browser via CDP
--evasion-level <level>   Override evasion level (minimal, moderate, paranoid)
--no-evasion              Disable evasion for this command
--profile <name>          Browser profile name (default: "default")
--json                    Force JSON output
```

### Command groups

```bash
# Session management
bloomreach status                          # Check auth status
bloomreach login                           # Open browser for manual login
bloomreach health                          # Full health check

# Content management
bloomreach content list                    # List documents
bloomreach content view <document-id>      # View document details
bloomreach content prepare-publish <id>    # Prepare publish (returns confirm token)
bloomreach actions confirm <token>         # Confirm prepared action

# Discovery (search & merchandising)
bloomreach discovery campaigns             # List search campaigns
bloomreach discovery ranking <campaign>    # View ranking rules

# Engagement (marketing)
bloomreach engagement campaigns            # List marketing campaigns
bloomreach engagement metrics              # View campaign metrics
```

### CLI entry point pattern (from linkedin-buddy)

```typescript
// From: packages/cli/src/bin/linkedin.ts (11,101 lines)
#!/usr/bin/env node
import { Command } from "commander";
import { createCoreRuntime, LinkedInBuddyError, toErrorPayload } from "@bloomreach-buddy/core";

const program = new Command()
  .name("bloomreach")
  .description("Bloomreach Buddy CLI")
  .version(packageJson.version)
  .option("--cdp-url <url>", "Connect via CDP endpoint")
  .option("--evasion-level <level>", "Override evasion level");

// Nested command groups
const contentCommand = program
  .command("content")
  .description("Manage Bloomreach content documents");

contentCommand
  .command("list")
  .description("List content documents in the current project")
  .option("-l, --limit <n>", "Maximum results", "20")
  .option("--json", "JSON output")
  .action(async (options) => { /* ... */ });

// Error handling
program.parseAsync(process.argv).catch((error) => {
  const payload = toErrorPayload(error);
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
});
```

### Output formatting

linkedin-buddy uses dual-mode output:

```typescript
// JSON mode (for automation/piping)
function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

// Human-readable mode (TTY detection)
function isInteractive(): boolean {
  return Boolean(process.stdout.isTTY);
}
```

XActions uses `chalk` for colored output and `ora` for spinners:

```javascript
// XActions CLI pattern
import chalk from 'chalk';
import ora from 'ora';

const spinner = ora('Scraping profile...').start();
const profile = await scrapeProfile(page, username);
spinner.succeed(chalk.green(`Profile scraped: ${profile.name}`));
```

### Decision for bloomreach-buddy

Start with linkedin-buddy's approach (JSON-first, human-readable for TTY). Add chalk/ora progressively if operator UX demands it.

### Reference files

- linkedin-buddy CLI: `packages/cli/src/bin/linkedin.ts` (11,101 lines)
- linkedin-buddy CLI package: `packages/cli/package.json` — bin entries (linkedin, linkedin-buddy, lbud)
- XActions CLI: `src/cli/index.js` (3206 lines) — Commander + chalk + ora + inquirer

---

## 8. Testing Strategy

**Primary reference**: linkedin-buddy (Vitest, unit + E2E + fixture replay)
**Secondary reference**: XActions (Vitest, unit tests)

### Test structure

```
packages/core/src/__tests__/           # Unit tests for core modules
packages/core/src/__tests__/e2e/       # E2E tests with fixture replay
packages/cli/test/                     # CLI integration tests
packages/mcp/src/__tests__/            # MCP server tests (schema validation, tool dispatch)
test/                                  # Root-level E2E fixtures and configs
```

### Unit tests (from linkedin-buddy)

```typescript
// From: packages/core/src/__tests__/rateLimiter.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter } from '../rateLimiter.js';

describe('RateLimiter', () => {
  let db: AssistantDatabase;
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    db = new AssistantDatabase(':memory:');
    rateLimiter = new RateLimiter(db);
  });

  it('allows consumption within limit', () => {
    const state = rateLimiter.consume({
      counterKey: 'test',
      windowSizeMs: 3600000,
      limit: 10,
    });
    expect(state.allowed).toBe(true);
    expect(state.remaining).toBe(9);
  });
});
```

### E2E tests with fixture replay (from linkedin-buddy)

linkedin-buddy uses a fixture replay system for deterministic E2E testing without hitting LinkedIn:

```typescript
// E2E test with replay
// LINKEDIN_E2E=1 LINKEDIN_E2E_REPLAY=1 vitest run -c vitest.config.e2e.ts

describe('search', () => {
  it('searches people', async () => {
    const runtime = createCoreRuntime({
      /* fixture replay config */
    });
    const results = await runtime.search.search({
      profileName: 'default',
      category: 'people',
      query: 'engineer',
      limit: 5,
    });
    expect(results.results).toHaveLength(5);
  });
});
```

### MCP tool tests (from linkedin-buddy)

```typescript
// From: packages/mcp/src/__tests__/linkedinMcp.test.ts (1209 lines)
// Tests tool schema validation, parameter reading, error handling
// From: packages/mcp/src/__tests__/linkedinMcp.validation.test.ts (245 lines)
// Tests input schema compliance
```

### Test categories for bloomreach-buddy

| Category     | Framework | Location                           | Trigger                                          |
| ------------ | --------- | ---------------------------------- | ------------------------------------------------ |
| Unit         | Vitest    | `packages/core/src/__tests__/`     | `pnpm test`                                      |
| MCP schema   | Vitest    | `packages/mcp/src/__tests__/`      | `pnpm test`                                      |
| CLI          | Vitest    | `packages/cli/test/`               | `pnpm test`                                      |
| E2E (replay) | Vitest    | `packages/core/src/__tests__/e2e/` | `pnpm test:e2e:fixtures`                         |
| E2E (live)   | Vitest    | `packages/core/src/__tests__/e2e/` | `pnpm test:e2e:raw` (requires browser + session) |

### Reference files

- linkedin-buddy unit tests: `packages/core/src/__tests__/` — 61 test files
- linkedin-buddy E2E tests: `packages/core/src/__tests__/e2e/` — auth, search, inbox, feed, connections, etc.
- linkedin-buddy fixture replay: `packages/core/src/fixtureReplay.ts`
- linkedin-buddy MCP tests: `packages/mcp/src/__tests__/linkedinMcp.test.ts` (1209 lines)
- XActions tests: `tests/` directory with Vitest

---

## 9. Error Handling Patterns

**Adopted from**: linkedin-buddy (structured error taxonomy with machine-readable codes)

### Custom error class

```typescript
// From: packages/core/src/errors.ts
export const ERROR_CODES = [
  'AUTH_REQUIRED', // Dashboard session expired or missing
  'CAPTCHA_OR_CHALLENGE', // Bot detection challenge encountered
  'RATE_LIMITED', // Rate limit exceeded
  'UI_CHANGED_SELECTOR_FAILED', // Dashboard UI changed, selectors broken
  'NETWORK_ERROR', // Network connectivity issue
  'TIMEOUT', // Operation timed out
  'TARGET_NOT_FOUND', // Requested resource not found
  'ACTION_PRECONDITION_FAILED', // Invalid input or state
  'UNKNOWN', // Unclassified error
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export class BloomreachBuddyError extends Error {
  readonly code: ErrorCode;
  readonly details: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'BloomreachBuddyError';
    this.code = code;
    this.details = details;
  }
}
```

### Error propagation

```
Core throws BloomreachBuddyError
    ↓
CLI/MCP catches and converts to payload:
    { code: "RATE_LIMITED", message: "...", details: { rate_limit: { ... } } }
    ↓
CLI: prints to stderr + exit(1)
MCP: returns { isError: true, content: [...] }
```

### Error serialization (from linkedin-buddy)

```typescript
export function toErrorPayload(error: unknown): ErrorPayload {
  if (error instanceof BloomreachBuddyError) {
    return { code: error.code, message: error.message, details: error.details };
  }
  if (error instanceof Error) {
    return {
      code: 'UNKNOWN',
      message: error.message,
      details: { cause_name: error.name },
    };
  }
  return { code: 'UNKNOWN', message: String(error), details: {} };
}
```

### Reference files

- linkedin-buddy errors: `packages/core/src/errors.ts` (133 lines) — error class, codes, serialization

---

## 10. Two-Phase Commit for Write Operations

**Adopted from**: linkedin-buddy (prepare → confirm with cryptographic tokens)
**Contrast**: XActions performs direct actions without confirmation gates

### Why two-phase commit

Bloomreach operations that modify content, campaigns, or settings can have significant business impact. The two-phase commit pattern ensures:

- Every mutation is previewed before execution
- Human (or AI agent) must explicitly confirm
- Tokens expire (default: 30 minutes), preventing stale confirmations
- Full audit trail in SQLite

### Pattern

```
1. Client calls prepare*(input)
    ↓
2. Core validates input, creates preview, stores in DB
    ↓
3. Returns { preparedActionId, confirmToken, expiresAtMs, preview }
    ↓
4. Client reviews preview, calls confirm(confirmToken)
    ↓
5. Core validates token, checks expiry, executes via ActionExecutor
    ↓
6. Returns { ok: true, result, artifacts }
```

### Implementation (from linkedin-buddy)

```typescript
// From: packages/core/src/twoPhaseCommit.ts (542 lines)

export interface PrepareActionInput {
  actionType: string; // e.g. "content.publish"
  target: Record<string, unknown>; // e.g. { documentId: "abc" }
  payload: Record<string, unknown>; // e.g. { version: 3 }
  preview: Record<string, unknown>; // Human-readable summary
  operatorNote?: string; // Optional note
  expiresInMs?: number; // Default: 30 minutes
}

export interface PreparedActionResult {
  preparedActionId: string; // UUID
  confirmToken: string; // Cryptographic token (ct_...)
  expiresAtMs: number; // Expiry timestamp
  preview: Record<string, unknown>; // Same preview for display
}

export interface ActionExecutor<TRuntime> {
  execute(
    input: ActionExecutorInput<TRuntime>,
  ): ActionExecutorResult | Promise<ActionExecutorResult>;
}

// Token generation uses crypto.randomBytes for entropy
// Tokens are prefixed with "ct_" for identification
// Expired tokens are rejected with ACTION_PRECONDITION_FAILED
```

### Rate limiting integration

Rate limits are checked at **confirm time**, not prepare time:

```typescript
// From: packages/core/src/rateLimiter.ts (134 lines)
export class RateLimiter {
  peek(input: ConsumeRateLimitInput): RateLimiterState {
    /* preview without consuming */
  }
  consume(input: ConsumeRateLimitInput): RateLimiterState {
    /* consume + enforce */
  }
}

// Rate limit is consumed only when action is confirmed:
const state = consumeRateLimitOrThrow(rateLimiter, {
  config: { counterKey: 'content.publish', windowSizeMs: 3600000, limit: 20 },
  message: 'Content publish rate limit exceeded.',
});
```

### XActions contrast (no two-phase commit)

XActions tools execute actions directly:

```javascript
// XActions: direct action, no confirmation
{ name: 'x_follow', description: 'Follow a user', inputSchema: { ... } }
// When called, immediately follows the user
```

### Decision for bloomreach-buddy

We adopt linkedin-buddy's two-phase commit because:

- Bloomreach content changes can impact live websites
- AI agents should never make unconfirmed mutations
- The pattern enables dry-run/preview workflows
- Audit trail is essential for content management

### Reference files

- linkedin-buddy two-phase commit: `packages/core/src/twoPhaseCommit.ts` (542 lines)
- linkedin-buddy rate limiter: `packages/core/src/rateLimiter.ts` (134 lines)
- linkedin-buddy confirm artifacts: `packages/core/src/confirmArtifacts.ts`
- linkedin-buddy DB persistence: `packages/core/src/db/database.ts` (2615 lines)

---

## Summary: Pattern Adoption Matrix

| Pattern                             | Source         | Adopted? | Notes                                    |
| ----------------------------------- | -------------- | -------- | ---------------------------------------- |
| Monorepo (core/cli/mcp)             | linkedin-buddy | Yes      | Clean dependency boundaries              |
| Playwright browser automation       | linkedin-buddy | Yes      | Persistent profiles, CDP connection pool |
| Puppeteer + stealth                 | XActions       | No       | Less configurable evasion                |
| Feature modules (one file per area) | linkedin-buddy | Yes      | Service class + ActionExecutor pattern   |
| Flat function exports               | XActions       | No       | Doesn't scale with TypeScript            |
| Two-phase commit                    | linkedin-buddy | Yes      | Essential for content management safety  |
| Direct actions                      | XActions       | No       | Too risky for Bloomreach mutations       |
| `platform.domain.action` MCP naming | linkedin-buddy | Yes      | Natural grouping                         |
| `x_action` flat MCP naming          | XActions       | No       | Hard to navigate at scale                |
| Evasion profiles (3 levels)         | linkedin-buddy | Yes      | Configurable per environment             |
| Stealth plugin                      | XActions       | No       | Less configurable                        |
| Commander.js nested groups          | linkedin-buddy | Yes      | Clean command hierarchy                  |
| Commander.js flat + chalk/ora       | XActions       | Partial  | May add chalk/ora later for UX           |
| Vitest + fixture replay             | linkedin-buddy | Yes      | Deterministic E2E testing                |
| Structured error codes              | linkedin-buddy | Yes      | Machine-readable, privacy-aware          |
| SQLite state (better-sqlite3)       | linkedin-buddy | Yes      | Prepared actions, rate limits, artifacts |
| Prisma + PostgreSQL                 | XActions       | No       | Overkill for local-first tool            |
| Human-like typing simulation        | linkedin-buddy | Yes      | For form input in Bloomreach             |
| Plugin system                       | XActions       | Maybe    | Consider for V2 extensibility            |
| Multi-platform support              | XActions       | No       | Single-platform focus (Bloomreach)       |

---

## Tech Stack

| Component          | Library                   | Version | Reference      |
| ------------------ | ------------------------- | ------- | -------------- |
| Runtime            | Node.js                   | 22+     | linkedin-buddy |
| Language           | TypeScript                | 5.8+    | linkedin-buddy |
| Module system      | ESM                       | —       | Both repos     |
| Browser automation | playwright-core           | 1.50+   | linkedin-buddy |
| CLI framework      | commander                 | 14+     | Both repos     |
| MCP SDK            | @modelcontextprotocol/sdk | 1.27+   | Both repos     |
| Database           | better-sqlite3            | 12+     | linkedin-buddy |
| Testing            | vitest                    | 4+      | Both repos     |
| Linting            | eslint                    | 10+     | linkedin-buddy |
| File locking       | proper-lockfile           | 4+      | linkedin-buddy |

---

## Build & Development Commands

```bash
npm install                    # Install all workspace dependencies
npm run build                  # Build all packages (tsc -b)
npm run typecheck              # Type-check without emit
npm run lint                   # ESLint
npm run test                   # Unit tests (vitest run)
npm run test:e2e               # E2E tests with fixture replay
npm run test:e2e:raw           # E2E tests against live Bloomreach (requires session)
```

---

## State Storage

All state lives in `~/.bloomreach-buddy/` (local-first, no cloud sync):

```
~/.bloomreach-buddy/
├── profiles/
│   └── default/             # Playwright persistent context (cookies, localStorage, etc.)
├── db/
│   └── state.db             # SQLite: prepared actions, rate limits, activity watches
├── artifacts/
│   └── <run-id>/            # Screenshots, traces, JSON logs per operation
└── config.json              # User preferences (optional)
```
