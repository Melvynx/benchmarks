import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Elysian experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Elysian — A garden beyond the visible<\/title>/i);
  assert.match(html, /A garden/);
  assert.match(html, /beyond/);
  assert.match(html, /Scent is a/);
  assert.match(html, /The Elysian ritual/);
  assert.match(html, /2026-07-12-colorful-botanical-dark-blue\.png/);
  assert.doesNotMatch(
    html,
    /codex-preview|Your site is taking shape|react-loading-skeleton/i,
  );
});

test("does not ship the temporary starter preview", async () => {
  await assert.rejects(
    access(new URL("app/_sites-preview/SkeletonPreview.tsx", templateRoot)),
  );
});
