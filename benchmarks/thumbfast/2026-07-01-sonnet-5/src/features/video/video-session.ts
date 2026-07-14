const getLastSavedVideoKey = (orgSlug: string) => `lastSavedVideoId:${orgSlug}`;

export type LastSavedVideo = {
  videoId: string;
  videoTitle: string;
};

export function getLastSavedVideo(orgSlug: string): LastSavedVideo | null {
  if (typeof window === "undefined") return null;

  const stored = sessionStorage.getItem(getLastSavedVideoKey(orgSlug));
  if (!stored) return null;

  try {
    return JSON.parse(stored) as LastSavedVideo;
  } catch {
    return null;
  }
}

export function setLastSavedVideo(
  orgSlug: string,
  video: LastSavedVideo,
): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(getLastSavedVideoKey(orgSlug), JSON.stringify(video));
}

export function clearLastSavedVideo(orgSlug: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(getLastSavedVideoKey(orgSlug));
}
