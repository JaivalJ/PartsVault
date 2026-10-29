import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/inventory.mjs', ['inventory.mjs', 'text/javascript; charset=utf-8']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']],
]);
const server = http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  const entry = files.get(new URL(req.url, 'http://localhost').pathname);
  if (!entry) { res.writeHead(404).end('Not found'); return; }
  try {
    const body = await readFile(fileURLToPath(new URL(entry[0], import.meta.url)));
    res.writeHead(200, { 'Content-Type': entry[1], 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(500).end('Could not read application file.');
  }
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? 'Port 3000 is already in use. Set PORT to use another port.' : error.message);
  process.exitCode = 1;
});
server.listen(Number(process.env.PORT) || 3000, '127.0.0.1', () => {
  console.log('PartsVault is ready at http://localhost:' + server.address().port);
});
