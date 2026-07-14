# YouTube Thumbnail Generator

Next.js 16 app for generating YouTube thumbnails with Gemini image generation via the AI SDK.

## Stack

- Next.js App Router
- Tailwind CSS + shadcn/ui primitives
- AI SDK + `@ai-sdk/google`
- `gemini-3-pro-image-preview`
- `react-dropzone`
- `next-themes`
- `sonner`

## Setup

Create a local env file:

```bash
cp .env.example .env.local
```

Set:

```bash
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
```

Install and run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Features

- Drag and drop uploads for:
  - extra reference images
  - one inspiration image
  - multiple person references
- Prompt augmentation with the required YouTube-thumbnail suffix
- Generate 1 to 4 thumbnails per request cycle
- Loading skeletons, error toasts, and download actions
- Dark theme by default with light mode support

## Validation

```bash
npm run lint
npm run build
```

## Notes

- The API route is at `src/app/api/generate/route.ts`.
- The app only uses `gemini-3-pro-image-preview`.
- The client estimates request size before submission because base64 image uploads expand significantly.
