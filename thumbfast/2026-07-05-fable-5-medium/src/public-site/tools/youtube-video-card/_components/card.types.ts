import { z } from "zod";

export const CardThemeSchema = z.object({
  card: z.object({
    fontSize: z.number().min(0).max(2).default(1),
    foreground: z.string().default("#0f0f0f"),
    background: z.string().default("#ffffff"),
    spacing: z.number().min(0).max(2).default(1),
    borderRadius: z.number().min(0).max(2).default(1),
  }),
  duration: z.object({
    foreground: z.string().default("#ffffff"),
    background: z.string().default("rgba(0,0,0,0.8)"),
  }),
  progressBar: z.object({
    foreground: z.string().default("#ff0000"),
    background: z.string().default("rgba(200,200,200,0.6)"),
  }),
  options: z.object({
    showDuration: z.boolean().default(true),
    showViews: z.boolean().default(true),
    showPublishedAt: z.boolean().default(true),
    showChannelThumbnail: z.boolean().default(true),
    showChannelTitle: z.boolean().default(true),
    progressBar: z.number().min(0).max(100).nullable().default(null),
  }),
});

export type CardTheme = z.infer<typeof CardThemeSchema>;

export const VideoDataSchema = z.object({
  title: z.string(),
  channelTitle: z.string(),
  channelAvatarUrl: z.string().default(""),
  thumbnailUrl: z.string(),
  views: z.string(),
  duration: z.string(),
  publishedAt: z.string(),
});

export type VideoData = z.infer<typeof VideoDataSchema>;

export type HistoryEntry = {
  id: string;
  videoData: VideoData;
  theme: CardTheme;
  timestamp: number;
  previewDataUrl?: string;
};

export const DEFAULT_VIDEO_DATA: VideoData = {
  title: "How to Create Amazing YouTube Thumbnails",
  channelTitle: "Creator Studio",
  channelAvatarUrl: "",
  thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  views: "1.2M views",
  duration: "12:34",
  publishedAt: "2 days ago",
};

export const LIGHT_THEME: CardTheme = {
  card: {
    fontSize: 1,
    foreground: "#0f0f0f",
    background: "#ffffff",
    spacing: 1,
    borderRadius: 1,
  },
  duration: {
    foreground: "#ffffff",
    background: "rgba(0,0,0,0.8)",
  },
  progressBar: {
    foreground: "#ff0000",
    background: "rgba(200,200,200,0.6)",
  },
  options: {
    showDuration: true,
    showViews: true,
    showPublishedAt: true,
    showChannelThumbnail: true,
    showChannelTitle: true,
    progressBar: null,
  },
};

export const DARK_THEME: CardTheme = {
  card: {
    fontSize: 1,
    foreground: "#f1f1f1",
    background: "#0f0f0f",
    spacing: 1,
    borderRadius: 1,
  },
  duration: {
    foreground: "#ffffff",
    background: "rgba(0,0,0,0.8)",
  },
  progressBar: {
    foreground: "#ff0000",
    background: "rgba(100,100,100,0.6)",
  },
  options: {
    showDuration: true,
    showViews: true,
    showPublishedAt: true,
    showChannelThumbnail: true,
    showChannelTitle: true,
    progressBar: null,
  },
};

export const THEME_PRESETS = [
  { label: "Light", value: "light", theme: LIGHT_THEME },
  { label: "Dark", value: "dark", theme: DARK_THEME },
  { label: "Custom", value: "custom", theme: null },
] as const;

export const HISTORY_KEY = "yt-video-card-history";
export const HISTORY_MAX_ITEMS = 10;

export const STORAGE_KEY_VIDEO_DATA = "yt-video-card-videoData";
export const STORAGE_KEY_THEME = "yt-video-card-theme";
