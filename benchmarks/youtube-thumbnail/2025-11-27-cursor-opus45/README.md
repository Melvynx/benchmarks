# ThumbForge AI - YouTube Thumbnail Generator

Generate stunning YouTube thumbnails using AI. Upload your face, add inspiration from your favorite creators, and let Google's Gemini create scroll-stopping thumbnails.

## Features

- **Face Upload**: Upload multiple photos of yourself for the thumbnail
- **Inspiration Upload**: Use another thumbnail as style reference
- **Extra Images**: Add additional reference images or elements
- **Prompt Input**: Describe your ideal thumbnail in detail
- **AI Generation**: Powered by Google Gemini 2.5 Flash
- **Light/Dark Mode**: Beautiful UI in both themes
- **Download**: Save your generated thumbnails instantly

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **UI**: Shadcn/UI + TailwindCSS v4
- **AI**: Vercel AI SDK with Google Gemini
- **Styling**: Custom theme with modern AI aesthetic

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up your API key

Create a `.env.local` file (or edit the existing one):

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
```

Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey).

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Upload Your Face** - Add one or more photos of yourself
2. **Add Inspiration** - Upload a thumbnail style you want to match
3. **Extra Images** (optional) - Add any additional reference images
4. **Write a Prompt** - Describe what you want:
   - Colors and mood
   - Text to include
   - Composition ideas
   - Specific elements
5. **Generate** - Click the button and wait for AI magic!
6. **Download** - Save your thumbnail when ready

## Pro Tips

- Use clear, well-lit face photos for best results
- Reference popular thumbnails from your niche
- Be specific about colors, emotions, and text
- Include action words and emotional expressions
- Generate multiple versions and pick the best one

## Project Structure

```
src/
├── app/
│   ├── actions.ts       # Server action for AI generation
│   ├── globals.css      # Custom theme and styles
│   ├── layout.tsx       # Root layout with theme provider
│   └── page.tsx         # Main page component
├── components/
│   ├── ui/              # Shadcn components
│   ├── image-upload.tsx # Drag & drop image upload
│   ├── theme-provider.tsx
│   ├── theme-toggle.tsx
│   └── thumbnail-generator.tsx
└── lib/
    └── utils.ts         # Utility functions
```

## License

MIT
