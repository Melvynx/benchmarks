// Relative import on purpose: convex/inspirationActions.ts compiles this file
// under convex/tsconfig.json, which cannot resolve the "@/" alias.
import { upfetch } from "../../lib/up-fetch";

const YOUTUBE_REGEX =
  /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;

export function extractVideoId(url: string): string | null {
  const match = url.match(YOUTUBE_REGEX);
  const videoId = match?.[1];

  if (!videoId || videoId.length !== 11) {
    return null;
  }

  return videoId;
}

export function getThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
}

export function getFallbackThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export type YoutubeVideoInfo = {
  title: string;
  author: string;
  thumbnailUrl: string;
};

export async function getYoutubeVideoInfo(
  youtubeUrl: string,
): Promise<YoutubeVideoInfo | null> {
  const response = await fetch(
    `https://noembed.com/embed?url=${encodeURIComponent(youtubeUrl)}`,
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    title?: string;
    author_name?: string;
    thumbnail_url?: string;
  };

  if (!data.title) {
    return null;
  }

  return {
    title: data.title,
    author: data.author_name ?? "",
    thumbnailUrl: data.thumbnail_url ?? "",
  };
}

export function isValidYoutubeUrl(url: string): boolean {
  return extractVideoId(url) !== null;
}

export type YoutubeOembedInfo = {
  title: string | null;
  author: string | null;
};

export async function fetchYoutubeOembed(
  youtubeUrl: string,
): Promise<YoutubeOembedInfo> {
  try {
    const data = (await upfetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        youtubeUrl,
      )}&format=json`,
      { signal: AbortSignal.timeout(10_000) },
    )) as { title?: string; author_name?: string };

    return {
      title: data.title ?? null,
      author: data.author_name ?? null,
    };
  } catch {
    return { title: null, author: null };
  }
}
