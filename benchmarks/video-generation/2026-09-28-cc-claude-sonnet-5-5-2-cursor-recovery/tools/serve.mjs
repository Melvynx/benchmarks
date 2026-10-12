import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const port = Number(process.env.PORT || 4877);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".json": "application/json",
  ".mp4": "video/mp4",
};
const hidden = ["node_modules", "research", "tools", "build"];

createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  let rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  if (rel.endsWith(sep) || rel === "/") rel = join(rel, "index.html");
  const file = join(root, rel);
  const top = rel.split(/[/\\]/).filter(Boolean)[0];
  try {
    if (hidden.includes(top) || !file.startsWith(root)) throw new Error("hidden");
    const info = await stat(file);
    if (!info.isFile()) throw new Error("not a file");
    const headers = {
      "content-type": types[extname(file)] || "application/octet-stream",
      "cache-control": "no-store",
      "accept-ranges": "bytes",
    };
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
    if (range) {
      const start = range[1] === "" ? Math.max(0, info.size - Number(range[2])) : Number(range[1]);
      const end = range[1] !== "" && range[2] !== "" ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
      if (start > end || start >= info.size) {
        res.writeHead(416, { "content-range": `bytes */${info.size}` });
        res.end();
        return;
      }
      res.writeHead(206, { ...headers, "content-range": `bytes ${start}-${end}/${info.size}`, "content-length": end - start + 1 });
      createReadStream(file, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { ...headers, "content-length": info.size });
      createReadStream(file).pipe(res);
    }
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
}).listen(port, "127.0.0.1", () => console.log(`serving ${root} on ${port}`));
