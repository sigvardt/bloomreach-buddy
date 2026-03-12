# BLOOMREACH BUDDY — PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-12 | **Commit:** 197329a | **Branch:** main

## OVERVIEW

AI-powered Bloomreach integration toolkit. CLI and programmatic API for managing Bloomreach Content, Discovery, and Engagement via browser automation. npm workspaces monorepo, TypeScript strict, ESM only, Node 20+.

**Stage:** Early development — scaffold in place, core architecture designed (see `ARCHITECTURE.md`), features being built by autonomous AI agents.

## STRUCTURE

```
bloomreach-buddy/
├── packages/
│   ├── core/              # Shared runtime: client, browser automation, auth, feature modules
│   │   ├── src/
│   │   │   ├── index.ts           # BloomreachClient class + config interface (entry point)
│   │   │   └── __tests__/
│   │   │       └── client.test.ts # Unit tests for BloomreachClient
│   │   ├── tsconfig.json          # Extends root, outDir: dist, rootDir: src
│   │   ├── tsup.config.ts         # ESM build, dts, sourcemaps
│   │   ├── vitest.config.ts       # V8 coverage, globals: true
│   │   └── package.json           # @bloomreach-buddy/core
│   ├── cli/               # Operator CLI: `bloomreach` command (Commander.js)
│   │   ├── src/
│   │   │   └── bin/
│   │   │       └── bloomreach.ts  # CLI entry point, `status` command
│   │   ├── tsconfig.json          # Extends root, references core
│   │   ├── tsup.config.ts         # ESM build, dts, sourcemaps
│   │   └── package.json           # @bloomreach-buddy/cli, depends on core
│   └── mcp/               # MCP server (PLANNED — not yet created)
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                 # Lint + typecheck + test on push/PR to main
│   │   ├── ai-auto-rebase.yml    # Auto-rebase conflicting ai/* PRs every 15min
│   │   ├── ai-ci-recovery.yml    # Relabel issues on CI failure for AI retry
│   │   └── ai-task-auto-label.yml # Auto-add ai-task label to new issues
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml
│   │   └── feature_request.yml
│   └── PULL_REQUEST_TEMPLATE.md
├── ARCHITECTURE.md        # Design patterns adopted from linkedin-buddy + XActions
├── CONTRIBUTING.md        # Contribution guide (signed commits, squash merge)
├── CODE_OF_CONDUCT.md     # Contributor Covenant v2.1
├── SECURITY.md            # Security policy (email: joakim@sigvardt.eu)
├── package.json           # Workspace root (npm workspaces)
├── tsconfig.json          # Project references (core, cli), ES2022, Node16, strict
├── eslint.config.js       # Flat config: strict + consistent-type-imports
└── .prettierrc            # Single quotes, trailing commas, 100 width, semicolons
```

## WHERE TO LOOK

| Task                       | Location                             | Notes                                                                 |
| -------------------------- | ------------------------------------ | --------------------------------------------------------------------- |
| Add core feature module    | `packages/core/src/`                 | Follow pattern in ARCHITECTURE.md §3 (service class + ActionExecutor) |
| Add CLI command            | `packages/cli/src/bin/bloomreach.ts` | Commander.js nested command groups                                    |
| Add MCP server             | `packages/mcp/` (create)             | Follow ARCHITECTURE.md §6 (dot-notation tools, two-phase commit)      |
| Add unit tests             | `packages/core/src/__tests__/`       | Vitest, `*.test.ts` suffix, import from `../index.js`                 |
| Change build config        | `packages/*/tsup.config.ts`          | ESM only, dts enabled                                                 |
| Change lint rules          | `eslint.config.js`                   | Flat config, typescript-eslint strict                                 |
| Change formatting          | `.prettierrc`                        | Applied project-wide                                                  |
| CI configuration           | `.github/workflows/ci.yml`           | Lint → typecheck → test                                               |
| AI orchestration workflows | `.github/workflows/ai-*.yml`         | Auto-rebase, CI recovery, auto-labeling                               |
| Architecture decisions     | `ARCHITECTURE.md`                    | Patterns from linkedin-buddy (primary) and XActions (secondary)       |

## PACKAGE DEPENDENCY GRAPH

```
@bloomreach-buddy/cli  ──depends-on──▶  @bloomreach-buddy/core
@bloomreach-buddy/mcp  ──depends-on──▶  @bloomreach-buddy/core  (planned)
```

Both CLI and MCP consume core. Neither depends on the other.

## CONVENTIONS

### Module System

- **ESM only** (`"type": "module"` in all package.json files)
- Use `.js` extensions in relative imports (e.g., `import { X } from '../index.js'`)
- Target: ES2022, module resolution: Node16

### TypeScript

- **Strict mode** enabled globally
- Project references for incremental builds (`tsc --build`)
- `import type { X }` enforced by ESLint rule `consistent-type-imports`
- No `any` — `@typescript-eslint/no-explicit-any` is error (strict config)
- Unused vars must be prefixed with `_` (e.g., `_unused`)

### Formatting (Prettier)

- Single quotes
- Trailing commas (all)
- Semicolons
- 100-char print width
- 2-space tabs

### Build

- **tsup** for all packages — ESM output, declaration files, sourcemaps, clean output
- Output to `dist/` directory
- Entry points: `src/index.ts` (core), `src/bin/bloomreach.ts` (cli)

### Testing

- **Vitest** for all tests
- Unit tests in `packages/core/src/__tests__/`
- Globals enabled (`describe`, `it`, `expect` without imports — though current tests import explicitly)
- V8 coverage provider with text + lcov reporters
- Test files: `*.test.ts` suffix

### Error Handling (designed, not yet implemented)

- Custom `BloomreachBuddyError` class with machine-readable error codes
- Error codes: `AUTH_REQUIRED`, `CAPTCHA_OR_CHALLENGE`, `RATE_LIMITED`, `UI_CHANGED_SELECTOR_FAILED`, `NETWORK_ERROR`, `TIMEOUT`, `TARGET_NOT_FOUND`, `ACTION_PRECONDITION_FAILED`, `UNKNOWN`
- See ARCHITECTURE.md §9 for full pattern

### Naming

- Package scope: `@bloomreach-buddy/` (e.g., `@bloomreach-buddy/core`)
- CLI binary: `bloomreach`
- MCP tool naming: `bloomreach.<domain>.<action>` (dot-notation)
- Feature modules: `bloomreach<Area>.ts` (e.g., `bloomreachContent.ts`)

## GIT WORKFLOW

- **NEVER** commit directly to `main`
- Feature branches: `ai/issue-<N>-<description>`, `feat/<name>`, `fix/<name>`
- All commits must be signed (SSH or GPG)
- PRs are squash-merged into main
- AI-driven development: Issues labeled `ai-task` are picked up by autonomous agents
- Conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`

### AI Label State Machine

```
ai-task → ai-in-progress → ai-review-ready
               ↓ (stuck)
           ai-blocked → (human replies) → resume
               ↓ (CI fail)
           ai-debugging → ai-task (auto-retry)
```

### CI/CD Automation

- **ci.yml**: Lint + typecheck + test on push to main and PRs
- **ai-auto-rebase.yml**: Every 15 min + on push to main, rebases conflicting `ai/*` PRs
- **ai-ci-recovery.yml**: On CI failure for `ai/*` branches, posts failure context and relabels issue for AI retry
- **ai-task-auto-label.yml**: Auto-adds `ai-task` label to new issues without exclude labels

## ANTI-PATTERNS

- **NEVER** suppress types with `as any`, `@ts-ignore`, or `@ts-expect-error`
- **NEVER** use `require()` — ESM only
- **NEVER** commit `.env` or `.env.local` files (gitignored)
- **NEVER** skip the two-phase commit pattern for write operations (see ARCHITECTURE.md §10)
- **NEVER** create a new branch/PR when fixing CI failures — fix on the existing branch
- **NEVER** push directly to `main` — always use feature branches + PRs

## COMMANDS

```bash
npm install                # Install all workspace dependencies
npm run build              # Build all packages (tsup, all workspaces)
npm run lint               # ESLint (flat config, strict)
npm run format             # Prettier (write mode)
npm run format:check       # Prettier (check mode)
npm run typecheck          # TypeScript project references check (tsc --build)
npm test                   # Run tests in all workspaces that have them
npm run test:watch         # Watch mode for tests
```

### Per-package commands

```bash
# Core package
cd packages/core
npm run build              # tsup build
npm run typecheck          # tsc --noEmit
npm test                   # vitest run
npm run test:watch         # vitest (watch)

# CLI package
cd packages/cli
npm run build              # tsup build
npm run typecheck          # tsc --noEmit
```

## ARCHITECTURE OVERVIEW

The project follows patterns adopted from [linkedin-buddy](https://github.com/sigvardt/linkedin-buddy):

### Core Patterns (from ARCHITECTURE.md)

1. **Browser Automation**: Playwright with persistent profiles, CDP connection pool, evasion profiles (minimal/moderate/paranoid)
2. **Feature Modules**: One file per Bloomreach area (Content, Discovery, Engagement, etc.) with service class + ActionExecutor pattern
3. **Auth/Session**: Persistent browser profiles with encrypted session capture and health checks
4. **Two-Phase Commit**: All write operations go through prepare → confirm with cryptographic tokens
5. **MCP Server**: Dot-notation tool naming (`bloomreach.<domain>.<action>`), JSON result formatting
6. **CLI**: Commander.js with nested command groups, dual-mode output (JSON + human-readable)
7. **Error Handling**: Structured error taxonomy with machine-readable codes
8. **Testing**: Vitest with unit + E2E + fixture replay

### Planned Tech Stack

| Component          | Library                   | Notes                             |
| ------------------ | ------------------------- | --------------------------------- |
| Runtime            | Node.js 22+               | CI uses Node 22                   |
| Browser automation | playwright-core           | Persistent profiles, CDP          |
| CLI framework      | commander                 | Already in use                    |
| MCP SDK            | @modelcontextprotocol/sdk | Planned for packages/mcp          |
| Database           | better-sqlite3            | For prepared actions, rate limits |
| Testing            | vitest                    | Already in use                    |
| Build              | tsup                      | Already in use                    |
| File locking       | proper-lockfile           | For profile isolation             |

### State Storage (planned)

```
~/.bloomreach-buddy/
├── profiles/default/      # Playwright persistent context
├── db/state.db            # SQLite: prepared actions, rate limits
├── artifacts/<run-id>/    # Screenshots, traces, JSON logs
└── config.json            # User preferences
```

## NOTES

- `ARCHITECTURE.md` is the primary design reference — read it before implementing any feature
- `packages/mcp/` does not exist yet — create it following ARCHITECTURE.md §6
- Current code is scaffold-only: `BloomreachClient` with a stub `status()` method, CLI with one `status` command
- Project is built by autonomous AI agents — issues are auto-labeled and auto-assigned
- linkedin-buddy at `/Users/user/repositories/linkedin-owa-agentools/` is the primary reference implementation
- The project uses npm (not pnpm) for workspace management
- All CI runs on `ubuntu-latest` with Node 22
