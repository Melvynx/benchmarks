import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const mime = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml" };

createServer((req, res) => {
  const path = normalize(join(root, req.url === "/" ? "index.html" : req.url.split("?")[0]));
  if (!path.startsWith(root) || !existsSync(path)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  res.setHeader("Content-Type", mime[extname(path)] || "application/octet-stream");
  createReadStream(path).pipe(res);
}).listen(4173, () => console.log("Elysian is open at http://localhost:4173"));
