import { isIP } from "node:net";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

function isBlockedHostname(hostname: string) {
  const normalized = hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(normalized)) return true;

  const ipVersion = isIP(normalized);
  if (ipVersion === 4) {
    const [first = 0, second = 0] = normalized
      .split(".")
      .map((part) => Number(part));
    return (
      first === 10 ||
      first === 127 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168)
    );
  }

  return (
    ipVersion === 6 &&
    (normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80") ||
      normalized.startsWith("::ffff:"))
  );
}

export default async function proxyImage(event: { req: Request }) {
  const url = new URL(event.req.url);
  const rawImageUrl = url.searchParams.get("url");

  if (!rawImageUrl) {
    return Response.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let imageUrl: URL;
  try {
    imageUrl = new URL(rawImageUrl);
  } catch {
    return Response.json({ error: "Invalid image URL" }, { status: 400 });
  }

  if (
    !ALLOWED_PROTOCOLS.has(imageUrl.protocol) ||
    isBlockedHostname(imageUrl.hostname)
  ) {
    return Response.json(
      { error: "Image URL is not allowed" },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Thumbfast/1.0 (+https://thumbfa.st)",
      },
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return Response.json(
        { error: "Failed to fetch image" },
        { status: response.status },
      );
    }

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return Response.json(
        { error: "URL does not point to an image" },
        { status: 400 },
      );
    }

    return new Response(await response.arrayBuffer(), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return Response.json({ error: "Failed to proxy image" }, { status: 500 });
  }
}
