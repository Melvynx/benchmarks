# YouTube Thumbnail Generator

A Next.js application that generates professional YouTube thumbnails using Gemini's image generation API.

## Features

✅ **Multi-image Upload Interface**
- Face references (multiple images)
- Inspiration thumbnail (single image)
- Extra context images (multiple images)
- Text prompt input

✅ **AI-Powered Generation**
- Uses Google Gemini API (`gemini-3-pro-image-preview`)
- Generates 1-4 thumbnails simultaneously
- Intelligent prompt combining all inputs
- 16:9 aspect ratio enforcement

✅ **Professional UI**
- Clean, minimal design inspired by Midjourney
- Shadcn/UI components with TailwindCSS
- Light/Dark mode toggle with system preference support
- Responsive layout

✅ **User Experience**
- Real-time image previews
- Loading states and progress indicators
- Error handling with user-friendly messages
- One-click thumbnail downloads

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **UI**: Shadcn/UI + TailwindCSS
- **AI**: AI SDK with Google Gemini provider
- **State Management**: React hooks + server actions
- **Styling**: Light/Dark theme support with localStorage persistence

## Installation

```bash
npm install
npm run dev
```

## Environment Variables

Create a `.env.local` file:

```env
# Google Gemini API Key
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
```

## Usage

1. **Upload Images**:
   - Add face references for personalization
   - Upload an inspiration thumbnail for style reference
   - Add extra images for additional context

2. **Add Prompt**:
   - Describe your desired thumbnail
   - Specify any special requirements

3. **Configure Settings**:
   - Select number of thumbnails to generate (1-4)
   - Toggle dark/light mode

4. **Generate & Download**:
   - Click "Generate Thumbnails"
   - Download your favorite results

## Project Structure

```
src/
├── app/
│   ├── actions.ts          # Server actions for AI integration
│   ├── layout.tsx          # Root layout with theme provider
│   └── page.tsx            # Main application page
├── components/
│   ├── file-upload.tsx     # Custom file upload component
│   ├── theme-provider.tsx  # Theme management
│   └── ui/                # Shadcn/UI components
└── lib/
    └── utils.ts            # Utility functions
```

## AI Integration

The application uses the AI SDK with Google's Gemini model:

```typescript
import { google } from "@ai-sdk/google"
import { generateText } from "ai"

const result = await generateText({
  model: google("gemini-3-pro-image-preview"),
  prompt: generatedPrompt,
  temperature: 0.7,
})
```

## Prompt Engineering

The application automatically constructs comprehensive prompts that:

1. **Include face references** with positioning instructions
2. **Follow inspiration style** for color scheme and composition
3. **Incorporate extra images** for thematic elements
4. **Apply user instructions** with priority
5. **Enforce YouTube best practices** (16:9 ratio, high contrast, etc.)

## Deployment

```bash
npm run build
npm run start
```

## Future Enhancements

- Add preset styles and templates
- Implement image editing tools
- Add social media sharing
- Support for multiple aspect ratios
- Batch processing for multiple videos

## License

MIT License

---

Built with ❤️ using Next.js, Shadcn/UI, and Google Gemini AI