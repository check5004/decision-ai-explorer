import { readFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
for (const path of ['public/app.js', 'public/core.js', 'public/credentials.js', 'public/presentation.js', 'public/examples.js', 'public/model.js', 'server.mjs', 'scripts/build.mjs']) execFileSync(process.execPath, ['--check', path]);
for (const file of await readdir('public')) {
  const text = await readFile(`public/${file}`, 'utf8');
  assert(!/sk-or-v1-[a-zA-Z0-9_-]{16,}/.test(text), `Possible real credential in ${file}`);
  assert(file === 'credentials.js' || !/\blocalStorage\b/.test(text), `Browser key storage must be isolated in credentials.js: ${file}`);
  assert(!/\b(sessionStorage|indexedDB|document\.cookie|innerHTML|eval\()\b/.test(text), `Unexpected persistence or HTML execution in ${file}`);
}
const html = await readFile('public/index.html', 'utf8');
assert(html.includes('Content-Security-Policy'));
assert(!/<script[^>]+src=["']https?:/.test(html));
assert(!/<link[^>]+href=["']https?:/.test(html));
console.log('Syntax, static secret patterns, isolated credential storage, dynamic HTML and dependency checks passed.');
