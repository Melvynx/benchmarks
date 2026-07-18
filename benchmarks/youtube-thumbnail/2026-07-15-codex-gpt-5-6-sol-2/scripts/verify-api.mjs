import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const builtRoute = require("../.next/server/app/api/generate/route.js");
const { POST } = builtRoute.routeModule.userland;
const validOnePixelPng =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;

async function post(body, headers = {}) {
  return POST(new Request("http://127.0.0.1:9151/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  }));
}

async function expectStatus(name, responsePromise, expectedStatus) {
  const response = await responsePromise;
  const payload = await response.json();
  assert.equal(response.status, expectedStatus, `${name}: ${JSON.stringify(payload)}`);
  assert.equal(typeof payload.error, "string", `${name}: missing safe error message`);
}

await expectStatus("malformed JSON", post("{"), 400);
await expectStatus("non-object body", post("null"), 400);
await expectStatus(
  "missing prompt",
  post(JSON.stringify({ prompt: "", images: [], count: 1 })),
  400,
);
await expectStatus(
  "invalid count",
  post(JSON.stringify({ prompt: "hello", images: [], count: 5 })),
  400,
);
await expectStatus(
  "spoofed image bytes",
  post(JSON.stringify({
    prompt: "hello",
    images: ["data:image/png;base64,aGVsbG8="],
    count: 1,
  })),
  400,
);
await expectStatus(
  "truncated matching image signature",
  post(JSON.stringify({
    prompt: "hello",
    images: ["data:image/png;base64,iVBORw0KGgo="],
    count: 1,
  })),
  400,
);
await expectStatus(
  "header-only WebP",
  post(JSON.stringify({
    prompt: "hello",
    images: ["data:image/webp;base64,UklGRhIAAABXRUJQVlA4TAUAAAAvAAAAAAA="],
    count: 1,
  })),
  400,
);
await expectStatus(
  "missing API key",
  post(JSON.stringify({ prompt: "hello", images: [validOnePixelPng], count: 1 })),
  500,
);
await expectStatus(
  "declared oversized body",
  post("{}", { "content-length": String(10 * 1024 * 1024 + 1) }),
  413,
);

const oversizedBody = "x".repeat(10 * 1024 * 1024 + 1);
const headerlessOversizedRequest = new Request("http://127.0.0.1:9151/api/generate", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: oversizedBody,
});
assert.equal(headerlessOversizedRequest.headers.get("content-length"), null);
await expectStatus("actual oversized body", POST(headerlessOversizedRequest), 413);

console.log("API boundary verification passed (10 cases).");
