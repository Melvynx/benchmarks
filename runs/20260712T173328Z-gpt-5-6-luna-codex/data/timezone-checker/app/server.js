const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.env.PORT || 9108);
const root = __dirname;
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((request, response) => {
  const requestPath = decodeURIComponent(request.url.split('?')[0]);
  const safePath = requestPath === '/' ? '/index.html' : requestPath;
  const filePath = path.join(root, safePath);

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, file) => {
    if (error) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(file);
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Timezone planner running at http://localhost:${port}`);
});
