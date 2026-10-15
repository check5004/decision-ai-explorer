import test from 'node:test';
import assert from 'node:assert/strict';
import { connect } from 'node:net';
import { once } from 'node:events';
import { server } from '../server.mjs';

test('static server serves only allowlisted public assets with safe headers and no secret API', async () => {
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const home = await fetch(base); assert.equal(home.status, 200); assert.match(await home.text(), /Decision Atelier/); assert.match(home.headers.get('content-security-policy'), /frame-ancestors 'none'/); assert.equal(home.headers.get('x-content-type-options'), 'nosniff');
    assert.equal((await fetch(`${base}/healthz`)).status, 200);
    const malformed = await new Promise((resolve, reject) => {
      const socket = connect(server.address().port, '127.0.0.1', () => socket.write('GET // HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n'));
      let received = ''; socket.on('data', chunk => received += chunk); socket.on('end', () => resolve(received)); socket.on('error', reject);
    });
    assert.match(malformed, /400 Bad Request/);
    assert.equal((await fetch(`${base}/healthz`)).status, 200);
    for (const path of ['/server.mjs', '/package.json', '/.env', '/api/decisions', '/%2e%2e/.env']) assert.equal((await fetch(`${base}${path}`)).status, 404);
    assert.equal((await fetch(base, { method: 'POST' })).status, 405);
    const head = await fetch(`${base}/app.js`, { method: 'HEAD' }); assert.equal(head.status, 200); assert.equal(await head.text(), '');
  } finally { await new Promise(resolve => server.close(resolve)); }
});
