# YouTube Thumbnail Generator

Create eye-catching YouTube thumbnails powered by Google's Gemini AI.

## Features

- **AI-Powered Generation**: Uses Google's `gemini-3-pro-image-preview` model
- **Multiple Upload Zones**:
  - Extra Images (up to 3)
  - Inspiration Image (1)
  - Persons Images (up to 3)
- **Drag & Drop**: Easy file upload with drag and drop support
- **Batch Generation**: Generate 1-4 thumbnail variations at once
- **Dark Theme**: Midjourney-inspired dark UI
- **Download**: Download generated thumbnails with a single click

## Setup

1. Get your API key from [Google AI Studio](https://ai.google.dev/)

2. Update `.env.local`:
```bash
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
```

3. Install dependencies:
```bash
npm install
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Tech Stack

- **Next.js 16** - App Router
- **React 19** - UI framework
- **Tailwind CSS v4** - Styling
- **Shadcn/UI** - Component library
- **AI SDK** - LLM integration
- **Sonner** - Toast notifications
- **Lucide React** - Icons

## Building for Production

```bash
npm run build
npm run start
```

## Project Structure

```
app/
├── api/
│   └── generate/
│       └── route.ts      # API endpoint for thumbnail generation
├── components/
│   └── ImageUploadZone.tsx  # Reusable upload component
├── page.tsx             # Main page
└── layout.tsx           # Root layout with dark theme
```

## How It Works

1. Enter a description of your desired thumbnail
2. (Optional) Upload reference images
3. Choose the number of variations (1-4)
4. Click "Generate Thumbnails"
5. Download the generated images

The app automatically appends "Create a YouTube thumbnail in 16:9 ratio, photorealistic, high quality, vibrant colors" to your prompt for optimal results.
