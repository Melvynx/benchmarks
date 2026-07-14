# YouTube Thumbnail Generator

A Midjourney-style web application for generating high-quality, photorealistic YouTube thumbnails using Google's Gemini 3 Pro image generation model (`gemini-3-pro-image-preview`).

## Tech Stack
- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS + Shadcn UI
- **AI Models:** `@ai-sdk/google` (`gemini-3-pro-image-preview`)

## Setup Instructions

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file from the sample:
   ```bash
   cp .env.example .env
   ```
   Add your Google Gemini API key:
   ```
   GOOGLE_GENERATIVE_AI_API_KEY="your_api_key_here"
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```
   The application will be running at [http://localhost:3000](http://localhost:3000)
