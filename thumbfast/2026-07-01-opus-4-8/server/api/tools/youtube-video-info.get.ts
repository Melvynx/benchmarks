import { z } from "zod";

const QuerySchema = z.object({
  url: z
    .string()
    .url()
    .refine((value) => {
      try {
        const hostname = new URL(value).hostname.toLowerCase();
        return [
          "youtube.com",
          "www.youtube.com",
          "m.youtube.com",
          "youtu.be",
        ].includes(hostname);
      } catch {
        return false;
      }
    }, "Only YouTube URLs are allowed"),
});

function getChannelAvatarUrl(html: string) {
  const match =
    html.match(
      /"avatar":\{"thumbnails":\[.*?\{"url":"(https:\/\/yt3\.ggpht\.com\/[^"]+)"/,
    ) ??
    html.match(
      /"channelThumbnail":\{"thumbnails":\[\{"url":"(https:\/\/yt3\.ggpht\.com\/[^"]+)"/,
    );

  return match?.[1]?.replaceAll("\\u0026", "&") ?? "";
}

export default async function youtubeVideoInfo(event: { req: Request }) {
  const params = Object.fromEntries(new URL(event.req.url).searchParams);
  const parsed = QuerySchema.safeParse(params);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid YouTube URL" },
      { status: 400 },
    );
  }

  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    parsed.data.url,
  )}&format=json`;

  const response = await fetch(oembedUrl, {
    headers: { "User-Agent": "Thumbfast/1.0 (+https://thumbfa.st)" },
  });

  if (!response.ok) {
    return Response.json(
      { error: "Could not fetch video information" },
      { status: 400 },
    );
  }

  const data = (await response.json()) as {
    title?: string;
    author_name?: string;
    thumbnail_url?: string;
  };

  let channelAvatarUrl = "";
  try {
    const pageResponse = await fetch(parsed.data.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Thumbfast/1.0; +https://thumbfa.st)",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (pageResponse.ok) {
      channelAvatarUrl = getChannelAvatarUrl(await pageResponse.text());
    }
  } catch {
    channelAvatarUrl = "";
  }

  return Response.json({
    title: data.title ?? "",
    channelTitle: data.author_name ?? "",
    thumbnailUrl: data.thumbnail_url ?? "",
    channelAvatarUrl,
  });
}
