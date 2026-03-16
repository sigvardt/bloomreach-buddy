# bloomreach-buddy

AI-powered Bloomreach integration toolkit. CLI and programmatic API for managing Bloomreach Content, Discovery, and Engagement.

> **Early development** — the project scaffold is in place, features are being built by autonomous AI agents via the [OpenCode Orchestrator](https://github.com/BuffMcBigHuge/opencode-orchestrator).

## Features

_Coming soon._

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20 or later
- A Bloomreach Engagement account with API access

### Installation

```bash
git clone https://github.com/sigvardt/bloomreach-buddy.git
cd bloomreach-buddy
npm install
npm run build
```

### Interactive Setup (Recommended)

Run the setup wizard to configure your API credentials:

```bash
npx bloomreach setup
```

The wizard will guide you through each step:

1. **Project Token** — enter your project token
2. **API Key ID** — enter the key ID from your private API key
3. **API Secret** — enter the secret (masked input)
4. **Base URL** — accept the default (`https://api.exponea.com`) or enter a custom URL
5. **Validation** — the wizard verifies your credentials with a test API call
6. **Save** — credentials are written to a `.env` file

### Where to Find Your Credentials

All three values are in the Bloomreach Engagement dashboard:

| Credential | Location |
|---|---|
| **Project Token** | Project Settings → Access Management → API → Project Token |
| **API Key ID** | Project Settings → Access Management → API → Private API keys |
| **API Secret** | Shown once when you create a new private API key |

To create a new API key:

1. Log into [Bloomreach Engagement](https://app.exponea.com/)
2. Navigate to **Project Settings → Access Management → API**
3. Under **Private API keys**, click **+ Add new API key**
4. Give it a name (e.g. "bloomreach-buddy")
5. Select the required permissions (see below)
6. Copy the **API Key ID** and **API Secret** immediately — the secret is only shown once

### Minimum API Permissions

Your API key needs these permissions at minimum:

- **Customer data** — read access (required for credential validation)
- **Tracking** — read access (used by the setup wizard)

Grant additional permissions based on which features you plan to use (campaigns, segmentations, scenarios, etc.).

### Manual Setup

If you prefer manual configuration, copy the example file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
BLOOMREACH_PROJECT_TOKEN=your-project-token
BLOOMREACH_API_KEY_ID=your-api-key-id
BLOOMREACH_API_SECRET=your-api-secret
# Optional: override the default API base URL
# BLOOMREACH_API_BASE_URL=https://api.exponea.com
```

### Verify Your Setup

```bash
npx bloomreach status
```

## Development

```bash
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm test           # Vitest
npm run build      # Build all packages
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

See [SECURITY.md](SECURITY.md) for our security policy.

## License

[MIT](LICENSE)
