# Thumbfast Watermark Worker

This Worker creates the free-plan watermarked derivative outside Convex.

It uses the Cloudflare Images binding `draw` API with the exact Figma PNG at
`cloudflare/assets/watermark-pageeeeee.png`, then writes the transformed result
to R2 through the `THUMBFAST_R2` binding.

Required app env vars:

- `CLOUDFLARE_WATERMARK_WORKER_URL`: deployed Worker endpoint.
- `CLOUDFLARE_WATERMARK_SECRET`: optional bearer secret matching the Worker secret.

Required Worker config:

- `wrangler.watermark.toml` is configured for the `thumbnail-ia` R2 bucket.
- Set the secret with `wrangler secret put WATERMARK_WORKER_SECRET --config wrangler.watermark.toml` if auth is enabled in the app env.
- Ensure Cloudflare Image Transformations are enabled for the zone serving the Worker.
