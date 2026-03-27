# Rakshak Setu App

Standalone parent-facing Rakshak Setu web app, prepared for direct GitHub-to-Vercel deployment.

## What is included

- `src/`: full app UI
- `public/`: static assets and India health-facility data
- `api/[...path].ts`: Vercel serverless API entry
- `server/mockApiHandler.ts`: JSON-backed app API used by both local dev and Vercel
- `shared/`: shared booking and middleware logic
- `data/`: bundled seed JSON database
- `lib/`: local `@workspace/api-client-react` package used by the app

## Local development

1. Install dependencies:

```bash
corepack pnpm install
```

2. Start the app:

```bash
corepack pnpm dev
```

3. Open `http://localhost:3000`

## Vercel deployment

1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. Keep the project root as the repo root.
4. Set these environment variables in Vercel if needed:

- `GEMINI_API_KEY`
- `HARDWARE_MIDDLEWARE_BASE_URL`
- `MIDDLEWARE_INTEGRATION_KEY`
- `HARDWARE_MIDDLEWARE_TIMEOUT_MS`
- `SARVAM_API_KEY` if premium TTS is required

5. Deploy.

The repo is already configured with:

- root `package.json`
- `pnpm-workspace.yaml`
- `vercel.json`
- Vite build output to `dist`
- Vercel `/api` function routing

## Data behavior on Vercel

The app seeds its JSON data from `data/` into the runtime environment automatically. This works for hosted demos and functional testing.

Important:

- local development writes into the repo-local runtime data
- Vercel serverless instances use temporary runtime storage, so data changes are not guaranteed to persist forever across cold starts or new instances

For permanent production data, replace the JSON storage layer with a real database.
