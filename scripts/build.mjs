import { cp, mkdir } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.js', 'core.js', 'presentation.js', 'examples.js', 'model.js', 'favicon.svg']) await cp(`public/${file}`, `dist/${file}`);
console.log('Static public assets copied to dist. No environment variables or secrets are embedded.');
