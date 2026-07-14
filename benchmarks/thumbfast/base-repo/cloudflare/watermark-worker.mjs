const WATERMARK_ASSET_PATH = "/watermark-pageeeeee.png";

function json(payload, init = {}) {
  return Response.json(payload, {
    ...init,
    headers: {
      "cache-control": "no-store",
      ...init.headers,
    },
  });
}

function unauthorized() {
  return json({ error: "Unauthorized" }, { status: 401 });
}

function getBearerToken(request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length);
}

function normalizePublicUrl(url) {
  return url.replace(/\/+$/, "");
}

function isSafeOutputKey(key) {
  return (
    typeof key === "string" &&
    key.length > 0 &&
    key.length < 1024 &&
    !key.startsWith("/") &&
    !key.includes("..")
  );
}

function normalizeFormat(format) {
  if (format === "jpg") return "jpeg";
  if (["jpeg", "png", "webp", "avif"].includes(format)) return format;
  return "jpeg";
}

function toOutputFormat(format) {
  return format === "jpeg" ? "image/jpeg" : `image/${format}`;
}

function normalizeLayout(layout) {
  if (!layout || typeof layout !== "object") {
    return {
      left: 24,
      bottom: 24,
      width: 920,
      height: 150,
    };
  }

  return {
    left: Math.max(0, Math.round(Number(layout.left) || 0)),
    bottom: Math.max(0, Math.round(Number(layout.bottom) || 0)),
    width: Math.max(1, Math.round(Number(layout.width) || 920)),
    height: Math.max(1, Math.round(Number(layout.height) || 150)),
  };
}

async function serveWatermarkAsset(request, env) {
  const assetUrl = new URL(WATERMARK_ASSET_PATH, request.url);
  const response = await env.ASSETS.fetch(assetUrl);

  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}

async function createWatermark(request, env) {
  if (
    env.WATERMARK_WORKER_SECRET &&
    getBearerToken(request) !== env.WATERMARK_WORKER_SECRET
  ) {
    return unauthorized();
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.sourceUrl !== "string") {
    return json({ error: "sourceUrl is required" }, { status: 400 });
  }

  if (!isSafeOutputKey(body.outputKey)) {
    return json({ error: "outputKey is invalid" }, { status: 400 });
  }

  const sourceResponse = await fetch(new URL(body.sourceUrl));
  if (!sourceResponse.ok || !sourceResponse.body) {
    return json(
      { error: "Failed to fetch source image", status: sourceResponse.status },
      { status: 502 },
    );
  }

  const watermarkResponse = await env.ASSETS.fetch(
    new URL(WATERMARK_ASSET_PATH, request.url),
  );
  if (!watermarkResponse.ok || !watermarkResponse.body) {
    return json(
      {
        error: "Failed to fetch watermark asset",
        status: watermarkResponse.status,
      },
      { status: 500 },
    );
  }

  const layout = normalizeLayout(body.layout);
  const format = normalizeFormat(body.format);

  const transformed = (
    await env.IMAGES.input(sourceResponse.body)
      .draw(
        env.IMAGES.input(watermarkResponse.body).transform({
          fit: "contain",
          width: layout.width,
          height: layout.height,
        }),
        {
          left: layout.left,
          bottom: layout.bottom,
          opacity: 1,
        },
      )
      .output({ format: toOutputFormat(format), quality: 95 })
  ).response();

  if (!transformed.ok || !transformed.body) {
    return json(
      {
        error: "Cloudflare image transform failed",
        status: transformed.status,
        details: await transformed.text().catch(() => ""),
      },
      { status: 502 },
    );
  }

  await env.THUMBFAST_R2.put(body.outputKey, transformed.body, {
    httpMetadata: {
      contentType: transformed.headers.get("content-type") ?? `image/${format}`,
      cacheControl: "public, max-age=31536000, immutable",
    },
  });

  return json({
    url: `${normalizePublicUrl(env.R2_PUBLIC_URL)}/${body.outputKey}`,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === WATERMARK_ASSET_PATH) {
      return serveWatermarkAsset(request, env);
    }

    if (request.method === "POST") {
      return createWatermark(request, env);
    }

    return json({ error: "Not found" }, { status: 404 });
  },
};
