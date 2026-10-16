import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), 'public');
const files = new Map([['/', ['index.html', 'text/html; charset=utf-8']], ['/index.html', ['index.html', 'text/html; charset=utf-8']], ['/styles.css', ['styles.css', 'text/css; charset=utf-8']], ['/app.js', ['app.js', 'text/javascript; charset=utf-8']], ['/core.js', ['core.js', 'text/javascript; charset=utf-8']], ['/credentials.js', ['credentials.js', 'text/javascript; charset=utf-8']], ['/presentation.js', ['presentation.js', 'text/javascript; charset=utf-8']], ['/examples.js', ['examples.js', 'text/javascript; charset=utf-8']], ['/model.js', ['model.js', 'text/javascript; charset=utf-8']], ['/favicon.svg', ['favicon.svg', 'image/svg+xml']]]);
const policy = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src https://openrouter.ai; font-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'; frame-ancestors 'none'";
export const server = createServer(async (req, res) => {
  res.setHeader('Content-Security-Policy', policy); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('X-Frame-Options', 'DENY'); res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()'); res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end('Method not allowed'); return; }
  let path;
  try { path = new URL(req.url, 'http://localhost').pathname; } catch { res.writeHead(400, { 'Content-Type': 'text/plain' }); res.end('Bad request'); return; }
  if (path === '/healthz') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end(req.method === 'HEAD' ? undefined : 'ok'); return; }
  const target = files.get(path);
  if (!target) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); return; }
  try { const content = await readFile(join(root, target[0])); res.writeHead(200, { 'Content-Type': target[1], 'Content-Length': content.length }); res.end(req.method === 'HEAD' ? undefined : content); }
  catch { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('Unable to serve static file'); }
});
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8080);
  server.listen(port, '0.0.0.0', () => console.log(`Decision Atelier static server listening on port ${port}. No API keys are read by this server.`));
}
