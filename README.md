# IssueHub Frontend

Next.js frontend for the IssueHub API.

## Local setup

```bash
npm install
npm run dev
```

Create `.env.local` when the API is not running at the default URL:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

Sign in or create an account at `/login`. The frontend stores the returned API key in `localStorage` and sends it as
`X-API-Key` on protected API requests.

## Deployment

Heroku deployment is planned for a later story and is not configured yet. See
[`docs/deployment-heroku.md`](docs/deployment-heroku.md) for the placeholder notes.
