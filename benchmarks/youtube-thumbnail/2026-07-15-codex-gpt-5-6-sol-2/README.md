# gpt-5.6-sol

A Next.js App Router interface for generating 16:9 YouTube thumbnails with `gemini-3-pro-image-preview`.

## Run locally

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env.local` and set `GOOGLE_GENERATIVE_AI_API_KEY`.
3. Run `pnpm dev`.
4. Open `http://127.0.0.1:9151`.

## Checks

- `pnpm typecheck`
- `pnpm build`
- `pnpm verify:api` (builds, then checks API boundaries)
- `pnpm start`

The generation endpoint is `POST /api/generate`. Reference uploads accept JPEG, PNG, and WebP images up to 4 MB each and 7 MB combined.
