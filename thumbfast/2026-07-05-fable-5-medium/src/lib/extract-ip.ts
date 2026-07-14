const IP_HEADER_PRIORITY = [
  "cf-connecting-ip",
  "x-real-ip",
  "x-forwarded-for",
  "x-vercel-forwarded-for",
  "fastly-client-ip",
  "true-client-ip",
];

function getHeader(source: unknown, name: string): string | null {
  if (!source) return null;

  if (source instanceof Headers) {
    return source.get(name);
  }

  if (typeof source === "object" && "get" in source) {
    const get = (source as { get?: unknown }).get;
    if (typeof get === "function") {
      const value = get.call(source, name);
      return typeof value === "string" ? value : null;
    }
  }

  if (typeof source === "object") {
    const record = source as Record<string, unknown>;
    const value = record[name] ?? record[name.toLowerCase()];
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }

  return null;
}

function resolveHeaders(input: unknown): unknown {
  if (!input || typeof input !== "object") return null;

  if (input instanceof Request) {
    return input.headers;
  }

  const candidate = input as { headers?: unknown; request?: unknown };
  if (candidate.headers) {
    return candidate.headers;
  }

  if (candidate.request) {
    return resolveHeaders(candidate.request);
  }

  return null;
}

export function extractIpFromRequest(input: unknown): string | null {
  const headers = resolveHeaders(input);
  if (!headers) return null;

  for (const headerName of IP_HEADER_PRIORITY) {
    const raw = getHeader(headers, headerName);
    if (!raw) continue;

    const first = raw.split(",")[0]?.trim();
    if (first) return first;
  }

  return null;
}
