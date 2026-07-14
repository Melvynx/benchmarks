import { SiteConfig } from "@/site-config";

export type ToolPageConfig = {
  slug: string;
  keyword: string;
  title: string;
  description: string;
  h1: string;
  h1Highlight: string;
  subtitle: string;
  faq: { question: string; answer: string }[];
};

const baseFaq = [
  {
    question: `What is ${SiteConfig.title}?`,
    answer: `${SiteConfig.title} is an AI-powered YouTube thumbnail generator built specifically for content creators. Describe your thumbnail, select your saved face and style references, and generate professional thumbnails in seconds - no design skills required.`,
  },
  {
    question: "How does the AI generation work?",
    answer:
      "Our AI uses advanced image generation models to create thumbnails based on your text description. When you add a Person profile (your face photos) and an Inspiration (style reference), the AI incorporates these to ensure consistency and style matching across all your thumbnails.",
  },
  {
    question: "Can I try it for free?",
    answer:
      "Yes! Sign up for free and get 5 thumbnails to test the full platform. No credit card required. Generate up to 5 professional thumbnails at no cost.",
  },
  {
    question: "What image format do thumbnails come in?",
    answer:
      "All thumbnails are generated at YouTube's exact 1280x720 resolution and delivered as high-quality PNG files. Upload directly to YouTube Studio with zero adjustments needed.",
  },
  {
    question: "How many thumbnails can I generate at once?",
    answer:
      "You can generate 1-4 thumbnail variations per request. Each generated image counts toward your plan based on the selected model. We recommend generating 4 to have options for A/B testing your click-through rate.",
  },
  {
    question: "What's included in the subscription?",
    answer:
      "The Pro plan at $19/month includes 150 thumbnails. The Ultra plan at $49/month includes 500 thumbnails. Need more? You can buy additional thumbnail packs.",
  },
];

const TOOL_PAGES: ToolPageConfig[] = [
  {
    slug: "thumbfast",
    keyword: "thumbfast",
    title: "Thumbfast - AI Thumbnail Maker | Boost Your CTR",
    description:
      "Generate scroll-stopping thumbnails in seconds with Thumbfast AI thumbnail generator. Boost your YouTube CTR by up to 27%. Try Thumbfast for free.",
    h1: "The Fastest Way to Create",
    h1Highlight: "YouTube Thumbnails",
    subtitle:
      "Thumbfast turns your ideas into click-worthy YouTube thumbnails in under 60 seconds. AI-powered, face-consistent, and designed to maximize your click-through rate.",
    faq: [
      ...baseFaq,
      {
        question: "Why is it called Thumbfast?",
        answer:
          "Thumbfast (thumbfa.st) combines 'thumbnail' and 'fast' — because we believe creating professional YouTube thumbnails should take seconds, not hours. Our AI generates publication-ready thumbnails in under 60 seconds.",
      },
      {
        question: "How is Thumbfast different from Canva or Photoshop?",
        answer:
          "Unlike generic design tools, Thumbfast is purpose-built for YouTube thumbnails. You describe what you want in plain text, the AI handles the design. Your face stays consistent across thumbnails, and you can reference successful thumbnail styles from other creators.",
      },
    ],
  },
  {
    slug: "create-thumbnail",
    keyword: "create thumbnail",
    title: "Create Thumbnail Online - AI Thumbnail Creator | Free",
    description:
      "Create thumbnails for YouTube in seconds with AI. No design skills needed. Upload your face once, describe your vision, and get professional thumbnails instantly.",
    h1: "Create Thumbnails That Get",
    h1Highlight: "More Clicks",
    subtitle:
      "Stop spending hours on thumbnail design. Describe what you want, select your face and style, and create stunning YouTube thumbnails in seconds with AI.",
    faq: [
      {
        question: "How do I create a thumbnail with AI?",
        answer:
          "Simply describe your thumbnail idea in plain text, upload your face photo once (it saves for future use), optionally pick a style reference from successful YouTube thumbnails, and hit generate. Your professional thumbnail is ready in under 60 seconds.",
      },
      {
        question: "Do I need design experience to create thumbnails?",
        answer:
          "Not at all. Thumbfa.st is built for creators, not designers. Just write what you want to see and the AI handles composition, colors, typography, and styling. If you can describe it, you can create it.",
      },
      ...baseFaq,
    ],
  },
  {
    slug: "create-thumbnail-fast",
    keyword: "create thumbnail fast",
    title: "Create Thumbnails Fast - AI Generator in Seconds",
    description:
      "Create YouTube thumbnails fast with AI. Generate professional thumbnails in under 60 seconds. No design skills required. Start free with 5 thumbnails.",
    h1: "Create Thumbnails",
    h1Highlight: "In Seconds, Not Hours",
    subtitle:
      "Why spend 30 minutes in Canva when AI can create better thumbnails in 60 seconds? Generate up to 4 variations at once with consistent face rendering.",
    faq: [
      {
        question: "How fast can I create a thumbnail?",
        answer:
          "Most thumbnails generate in under 60 seconds. Describe your idea, select your saved face profile and style reference, and click generate. The AI does the rest. You can generate 4 variations simultaneously.",
      },
      {
        question: "Is speed sacrificing quality?",
        answer:
          "No. Our AI uses the same advanced models as professional design studios. Every thumbnail is generated at YouTube's exact 1280x720 resolution as a high-quality PNG. Speed and quality are not tradeoffs here.",
      },
      ...baseFaq,
    ],
  },
  {
    slug: "generate-thumbnail",
    keyword: "generate thumbnail",
    title: "Generate Thumbnails with AI - YouTube Thumbnail Generator",
    description:
      "Generate professional YouTube thumbnails with AI. Describe your vision, select your face and style, and generate up to 4 variations instantly. Free to start.",
    h1: "Generate Thumbnails",
    h1Highlight: "With AI Precision",
    subtitle:
      "Generate professional YouTube thumbnails by simply describing what you want. Our AI handles design, composition, and keeps your face consistent across every thumbnail.",
    faq: [
      {
        question: "How do I generate a thumbnail?",
        answer:
          "Write a text description of your thumbnail, select your Person profile (face photos), choose a style Inspiration from your library, pick how many variations (1-4), and click generate. Your thumbnails are ready in seconds.",
      },
      {
        question: "Can I generate multiple thumbnails at once?",
        answer:
          "Yes! Generate 1-4 thumbnail variations per request. Each generated image counts toward your plan based on the selected model. We recommend generating 4 for A/B testing - the best thumbnail wins more clicks.",
      },
      ...baseFaq,
    ],
  },
  {
    slug: "ai-thumbnail-generator",
    keyword: "ai thumbnail generator",
    title: "AI Thumbnail Generator - Create YouTube Thumbnails | Free",
    description:
      "Best AI thumbnail generator for YouTube. Create professional thumbnails in seconds. Face-consistent, style-matching, A/B test ready. Try free with 5 thumbnails.",
    h1: "The AI Thumbnail Generator",
    h1Highlight: "Built for YouTube Creators",
    subtitle:
      "Not just another image generator. Thumbfa.st is purpose-built for YouTube thumbnails with face consistency, style references from top creators, and instant A/B test variations.",
    faq: [
      {
        question: "What makes this AI thumbnail generator different?",
        answer:
          "Unlike generic AI image generators, Thumbfa.st is built exclusively for YouTube thumbnails. Key differences: your face stays consistent across all thumbnails, you can reference successful thumbnail styles, generate 1-4 A/B test variations, and output is always YouTube's exact 1280x720 resolution.",
      },
      {
        question: "Which AI model does the thumbnail generator use?",
        answer:
          "We use Google's latest Gemini image generation models, which produce photorealistic results with excellent face consistency. The AI understands YouTube thumbnail best practices like bold text, expressive faces, and high-contrast compositions.",
      },
      ...baseFaq,
    ],
  },
  {
    slug: "ai-thumbnail-maker",
    keyword: "ai thumbnail maker",
    title: "AI Thumbnail Maker - Make YouTube Thumbnails in Seconds",
    description:
      "AI thumbnail maker that creates click-worthy YouTube thumbnails. Consistent face rendering, style references, and 4 variations per click. Start making thumbnails free.",
    h1: "Make YouTube Thumbnails",
    h1Highlight: "With AI in Seconds",
    subtitle:
      "The AI thumbnail maker that understands YouTube. Your face stays consistent, your style stays on brand, and your thumbnails get more clicks. Every time.",
    faq: [
      {
        question: "How does the AI thumbnail maker work?",
        answer:
          "Upload your face photos once to create a Person profile. Save thumbnail styles you love as Inspirations. Then describe your next thumbnail, select your profile and inspiration, and the AI makes professional thumbnails matching your brand in seconds.",
      },
      {
        question: "Can the AI make thumbnails that match my channel brand?",
        answer:
          "Yes! Save Inspiration references from your own best-performing thumbnails or from creators you admire. The AI analyzes colors, composition, and style, then applies them to your new thumbnails while keeping your face consistent.",
      },
      ...baseFaq,
    ],
  },
  {
    slug: "youtube-thumbnail-generator",
    keyword: "youtube thumbnail generator",
    title: "YouTube Thumbnail Generator - AI Powered | Thumbfa.st",
    description:
      "YouTube thumbnail generator powered by AI. Create professional, click-worthy thumbnails for your YouTube videos in seconds. Free to try, no design skills needed.",
    h1: "YouTube Thumbnail Generator",
    h1Highlight: "Powered by AI",
    subtitle:
      "Create professional YouTube thumbnails that drive clicks. AI-powered generation with face consistency, style matching from top creators, and instant A/B test variations.",
    faq: [
      {
        question: "Is this the best YouTube thumbnail generator?",
        answer:
          "Thumbfa.st is the only YouTube thumbnail generator with built-in face consistency, style references from successful creators, and multi-variation A/B testing. It's purpose-built for YouTube, not a generic image tool.",
      },
      {
        question: "Do YouTube thumbnail generators actually improve CTR?",
        answer:
          "Professional thumbnails can dramatically improve click-through rate. Our founder tested AI-generated thumbnails vs hand-made ones and saw a 51.5% CTR share vs 24.8% for the manually designed alternative. Better thumbnails = more views.",
      },
      ...baseFaq,
    ],
  },
  {
    slug: "youtube-thumbnail-maker",
    keyword: "youtube thumbnail maker",
    title: "YouTube Thumbnail Maker - Create Thumbnails Online Free",
    description:
      "Make YouTube thumbnails online with AI. Professional quality, face-consistent thumbnails in seconds. Free to start. No Photoshop or Canva skills required.",
    h1: "Make YouTube Thumbnails",
    h1Highlight: "That Actually Get Clicked",
    subtitle:
      "Your thumbnail is the difference between 100 views and 100,000 views. Make professional, click-optimized YouTube thumbnails with AI in seconds.",
    faq: [
      {
        question: "How do I make a good YouTube thumbnail?",
        answer:
          "Great YouTube thumbnails have: an expressive face, bold contrasting colors, minimal but impactful text, and a clear subject. Thumbfa.st AI handles all of these automatically when you describe your video concept.",
      },
      {
        question: "Can I make thumbnails for free?",
        answer:
          "Yes! Sign up free and get 5 thumbnails to make professional thumbnails. No credit card required.",
      },
      ...baseFaq,
    ],
  },
  {
    slug: "thumbnail-generator",
    keyword: "thumbnail generator",
    title: "Thumbnail Generator - AI Powered | Create in Seconds",
    description:
      "Thumbnail generator powered by AI. Create stunning thumbnails for YouTube in seconds. Face consistency, style matching, and A/B test variations. Try free.",
    h1: "Thumbnail Generator",
    h1Highlight: "That Creates Clicks",
    subtitle:
      "Generate professional thumbnails in seconds, not hours. AI-powered with face consistency and style references from top YouTube creators.",
    faq: [
      {
        question: "What is a thumbnail generator?",
        answer:
          "A thumbnail generator is a tool that creates preview images for videos. Thumbfa.st is an AI-powered thumbnail generator specifically designed for YouTube, producing 1280x720 thumbnails optimized for maximum click-through rate.",
      },
      {
        question:
          "Can I use this thumbnail generator for platforms other than YouTube?",
        answer:
          "While Thumbfa.st is optimized for YouTube's 1280x720 format, the generated thumbnails work great as preview images for any platform — blogs, social media, courses, or podcasts.",
      },
      ...baseFaq,
    ],
  },
  {
    slug: "free-thumbnail-maker",
    keyword: "free thumbnail maker",
    title: "Free Thumbnail Maker - Create YouTube Thumbnails Free",
    description:
      "Free thumbnail maker for YouTube. Get 5 free thumbnails to create professional AI thumbnails. No credit card and no design skills needed.",
    h1: "Free Thumbnail Maker",
    h1Highlight: "No Credit Card Required",
    subtitle:
      "Get 5 free thumbnails to create professional YouTube thumbnails with AI. Free exports include a small Thumbfa.st watermark; paid plans export clean images.",
    faq: [
      {
        question: "Is the thumbnail maker really free?",
        answer:
          "Yes! Sign up and get 5 free thumbnails immediately. No credit card required. Free exports include a small Thumbfa.st watermark, and paid plans start at $19/month for 150 thumbnails.",
      },
      {
        question: "Are free thumbnails lower quality?",
        answer:
          "No. Free thumbnails use the same generation quality as paid ones. The difference is that free exports include a small Thumbfa.st watermark, while paid plans export clean images and include more thumbnails.",
      },
      ...baseFaq,
    ],
  },
  {
    slug: "thumbnail-creator",
    keyword: "thumbnail creator",
    title: "Thumbnail Creator - AI YouTube Thumbnail Tool | Free",
    description:
      "AI thumbnail creator for YouTube videos. Create professional thumbnails with consistent face rendering and style matching. Start creating free.",
    h1: "The Thumbnail Creator",
    h1Highlight: "YouTube Creators Trust",
    subtitle:
      "Join thousands of YouTube creators using AI to create thumbnails that drive views. Consistent face rendering, style references, and instant variations.",
    faq: [
      {
        question: "What makes this thumbnail creator special?",
        answer:
          "Three things set Thumbfa.st apart: 1) Your face stays perfectly consistent across all thumbnails, 2) You can reference and replicate successful thumbnail styles, 3) Generate up to 4 A/B test variations per prompt.",
      },
      {
        question: "Who uses this thumbnail creator?",
        answer:
          "YouTube creators of all sizes — from beginners to channels with millions of subscribers. Anyone who wants professional thumbnails without spending hours in design tools.",
      },
      ...baseFaq,
    ],
  },
  {
    slug: "thumbnail-design-tool",
    keyword: "thumbnail design tool",
    title: "Thumbnail Design Tool - AI Powered for YouTube Creators",
    description:
      "AI thumbnail design tool built for YouTube. No Photoshop needed. Describe your thumbnail, AI designs it in seconds. Professional quality, consistent branding.",
    h1: "The Thumbnail Design Tool",
    h1Highlight: "That Replaces Photoshop",
    subtitle:
      "Why learn Photoshop when AI can design better thumbnails in seconds? Professional YouTube thumbnail design powered by AI, with your face and style built in.",
    faq: [
      {
        question: "Can an AI design tool replace Photoshop for thumbnails?",
        answer:
          "For YouTube thumbnails, absolutely. Thumbfa.st handles everything Photoshop does for thumbnails — composition, face placement, text, colors, styling — but in seconds instead of hours. And your face stays consistent without manual editing.",
      },
      {
        question: "Do I need any design skills?",
        answer:
          "None. If you can describe what you want in plain text, you can design professional thumbnails. The AI understands YouTube thumbnail best practices and handles all the design decisions for you.",
      },
      ...baseFaq,
    ],
  },
  {
    slug: "agents",
    keyword: "ai thumbnail agent",
    title: "AI Thumbnail Agent - Chat to Create Thumbnails | Thumbfa.st",
    description:
      "Chat with an AI agent to generate YouTube thumbnails. Paste a YouTube URL, describe your vision, and let the agent handle everything. Try free.",
    h1: "AI Thumbnail Agent",
    h1Highlight: "Chat Your Way to Better Thumbnails",
    subtitle:
      "Just chat. Paste a YouTube URL, describe your thumbnail, and our AI agent creates it for you. It browses your inspirations, picks the best style, and generates click-worthy thumbnails through conversation.",
    faq: [
      {
        question: "What is the AI Thumbnail Agent?",
        answer:
          "The AI Agent is a conversational interface for thumbnail generation. Instead of filling forms, you chat naturally — paste a YouTube URL, describe what you want, and the agent handles selecting styles, faces, and generating thumbnails for you.",
      },
      {
        question: "How is the Agent different from the standard generator?",
        answer:
          "The standard generator uses a form-based interface. The Agent uses natural conversation — you describe your video and it autonomously browses your inspiration library, selects your face profile, and generates thumbnails. It can also analyze YouTube videos by URL.",
      },
      {
        question: "Can the Agent analyze my YouTube videos?",
        answer:
          "Yes! Paste any YouTube URL and the Agent will extract the video title, existing thumbnail, and context to generate better thumbnails tailored to your content.",
      },
      ...baseFaq,
    ],
  },
  {
    slug: "anonymize",
    keyword: "anonymize thumbnail",
    title: "Anonymize Thumbnails - Remove Faces with AI | Thumbfa.st",
    description:
      "Anonymize YouTube thumbnails by replacing people with wireframe mannequins. Keep the layout, remove the faces. Perfect for style references. Try free.",
    h1: "Anonymize Thumbnails",
    h1Highlight: "Remove Faces, Keep the Style",
    subtitle:
      "Replace every person in a thumbnail with a dark grey wireframe mannequin. The background, text, colors, and composition stay untouched. Perfect for creating privacy-safe style references.",
    faq: [
      {
        question: "What does thumbnail anonymization do?",
        answer:
          "It replaces every person in your image with a dark grey 3D wireframe mannequin — same pose, same position, same size. Background, text, colors, and all other elements remain untouched.",
      },
      {
        question: "Why anonymize a thumbnail?",
        answer:
          "Anonymized thumbnails let you reuse layouts and compositions from successful YouTube thumbnails as style references without triggering AI content policy restrictions. They're also useful for privacy-friendly previews.",
      },
      {
        question: "How much does anonymization cost?",
        answer:
          "Each anonymization counts as 1 thumbnail. Free accounts start with 5 thumbnails. You can paste a YouTube URL or upload your own image (JPEG, PNG, WebP).",
      },
      ...baseFaq,
    ],
  },
  {
    slug: "face-consistency",
    keyword: "consistent face thumbnail",
    title: "Face Consistency for Thumbnails - AI Face Matching | Thumbfa.st",
    description:
      "Keep your face consistent across every YouTube thumbnail. Upload once, use forever. AI maintains your exact likeness for recognizable channel branding.",
    h1: "Your Face, Consistent",
    h1Highlight: "Across Every Thumbnail",
    subtitle:
      "Upload your face photos once to create a Person profile. Every thumbnail you generate will feature your exact likeness — building the brand recognition that drives repeat clicks.",
    faq: [
      {
        question: "How does face consistency work?",
        answer:
          "You create a Person profile by uploading a few photos of your face with a description. When generating thumbnails, you select your Person profile and the AI ensures your face appears consistently across every thumbnail.",
      },
      {
        question: "How many photos do I need to upload?",
        answer:
          "We recommend 3-5 clear photos showing different angles and expressions. The more variety you provide, the better the AI can render your face in any thumbnail context.",
      },
      {
        question: "Can I have multiple Person profiles?",
        answer:
          "Yes! Create profiles for different people — yourself, co-hosts, guests. Select whichever person you want in each thumbnail. Great for podcasts and collaboration channels.",
      },
      ...baseFaq,
    ],
  },
  {
    slug: "inspiration-library",
    keyword: "thumbnail inspiration",
    title:
      "Thumbnail Inspiration Library - Copy Top YouTube Styles | Thumbfa.st",
    description:
      "Build a library of thumbnail styles from top YouTube creators. Paste any video URL, our AI extracts the style. Use it as a reference to generate thumbnails that match.",
    h1: "Copy What Works",
    h1Highlight: "Thumbnail Inspiration Library",
    subtitle:
      "Paste any YouTube video URL and we extract the thumbnail style — colors, composition, mood, and layout. Save it to your library and reference it when generating your own thumbnails.",
    faq: [
      {
        question: "How does the Inspiration Library work?",
        answer:
          "Paste any YouTube video URL, and our AI extracts the thumbnail. It analyzes the style, colors, composition, and mood, then saves it to your personal library. When generating new thumbnails, reference any saved Inspiration to match that proven style.",
      },
      {
        question: "Can I use any YouTube thumbnail as inspiration?",
        answer:
          "Yes! Paste any YouTube video URL — the AI automatically extracts the thumbnail. For privacy, you can also anonymize inspiration thumbnails to replace faces with wireframe mannequins.",
      },
      {
        question: "Does it copy the thumbnail exactly?",
        answer:
          "No. Inspirations are style references, not copies. The AI uses the composition, color palette, and mood as guidance while generating completely original thumbnails with your face and content.",
      },
      ...baseFaq,
    ],
  },
  {
    slug: "ab-testing",
    keyword: "thumbnail ab testing",
    title: "Thumbnail A/B Testing - Generate 4 Variations | Thumbfa.st",
    description:
      "Generate up to 4 thumbnail variations per prompt for A/B testing. Data-driven creators test their options. Find the click winner before publishing.",
    h1: "A/B Test Your Thumbnails",
    h1Highlight: "Generate 4 Variations at Once",
    subtitle:
      "Stop guessing which thumbnail works best. Generate 1-4 variations with a single prompt, compare side by side, and pick the winner before publishing. Data-driven creators A/B test — now you can too.",
    faq: [
      {
        question: "How does thumbnail A/B testing work?",
        answer:
          "Select how many variations you want (1-4) when generating thumbnails. Each variation uses the same prompt, person, and inspiration but produces a unique design. Compare them side by side and pick the best performer.",
      },
      {
        question: "Does A/B testing cost extra?",
        answer:
          "Each generated image counts toward your plan based on the selected model. We recommend always generating 4 - the difference between your best and worst thumbnail can be 2-3x in click-through rate.",
      },
      {
        question: "Can I test my thumbnails on YouTube?",
        answer:
          "Yes! Download your favorite variations and use YouTube's built-in thumbnail test feature (or third-party tools) to measure which one drives the most clicks on your actual videos.",
      },
      ...baseFaq,
    ],
  },
  {
    slug: "video-management",
    keyword: "youtube video management",
    title: "Video Management for YouTubers - AI Titles | Thumbfa.st",
    description:
      "Manage your YouTube videos, generate AI-powered titles, and link thumbnails to videos. Organize your content workflow in one place.",
    h1: "Manage Your Videos",
    h1Highlight: "AI-Powered Title Generation",
    subtitle:
      "Import your YouTube videos, generate click-optimized titles with AI, and link thumbnails directly to each video. Your complete YouTube content workflow in one place.",
    faq: [
      {
        question: "What is Video Management?",
        answer:
          "Video Management lets you organize your YouTube videos inside Thumbfa.st. Import videos, generate AI-powered titles, and directly link generated thumbnails to each video for a streamlined content workflow.",
      },
      {
        question: "Can the AI generate video titles?",
        answer:
          "Yes! Our AI analyzes your video concept and generates click-optimized titles that pair well with your thumbnail. Title and thumbnail working together is the key to maximizing click-through rate.",
      },
      {
        question: "Can I link thumbnails to specific videos?",
        answer:
          "Yes. Attach any generated thumbnail to a video in your library. This helps you stay organized and track which thumbnails belong to which content.",
      },
      ...baseFaq,
    ],
  },
];

export function getToolPageConfig(slug: string): ToolPageConfig {
  const config = TOOL_PAGES.find((page) => page.slug === slug);
  if (!config) {
    throw new Error(`Tool page config not found for slug: ${slug}`);
  }
  return config;
}

export function getAllToolPageSlugs(): string[] {
  return TOOL_PAGES.map((page) => page.slug);
}

export { TOOL_PAGES };
