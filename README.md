# IssueHub Frontend

Next.js frontend for the IssueHub API.

## Team

- Pol Giralt
- Pol Montanera
- Noel Freire
- Sergi Galán
- Fernando Joel Alcívar

## Taiga Board

https://tree.taiga.io/project/polmontanera-asw/timeline

## Local Setup

Install dependencies and start the development server:

```bash
pnpm install
pnpm dev
```

Create `.env.local` if the API is not running at the default URL:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

Sign in by selecting a profile at `/login`. The frontend stores the API key
in `localStorage` and sends it as `X-API-Key` on every protected API request.

## Package Manager

This project uses **pnpm 11** instead of npm.

### Why pnpm?

pnpm uses a strict dependency isolation model that prevents _phantom
dependencies_ (accessing packages that are not declared in your own
`package.json`). This reduces the risk of supply-chain attacks where a
transitive dependency behaves differently than expected.

### Installing pnpm

Do **not** use `npm install -g pnpm`. Install pnpm directly from the
official installer to avoid going through npm:

**macOS**
```bash
brew install pnpm
```

**Windows**
```powershell
winget install pnpm
```

**Linux**
```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

For other platforms see [pnpm.io/installation](https://pnpm.io/installation).

### Migrating from npm

If you have a `package-lock.json` locally, remove it before installing:

```bash
rm package-lock.json
rm -rf node_modules
pnpm install
```

## Deployment

Heroku deployment is planned for a later story and is not configured yet.
See [`docs/deployment-heroku.md`](docs/deployment-heroku.md) for placeholder
notes.