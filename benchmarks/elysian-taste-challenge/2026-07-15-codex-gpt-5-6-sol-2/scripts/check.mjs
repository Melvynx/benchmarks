import { access, readFile } from 'node:fs/promises';

const requiredFiles = ['index.html', 'styles.css', 'script.js', 'server.mjs', 'favicon.svg'];
await Promise.all(requiredFiles.map((file) => access(file)));

const [html, css, server] = await Promise.all([
  readFile('index.html', 'utf8'),
  readFile('styles.css', 'utf8'),
  readFile('server.mjs', 'utf8'),
]);

const expectedArt = [
  'https://code.melvynx.dev/elysian-classical-surreal-still-life.png',
  'https://codelynx.mlvcdn.com/uploads/2026-07-13/2026-07-13-greco-roman-scholarly-landscape.png',
  'https://codelynx.mlvcdn.com/uploads/2026-07-13/2026-07-13-vibrant-mountain-river-valley.png',
  'https://codelynx.mlvcdn.com/uploads/2026-07-13/2026-07-13-golden-temple-starry-night.png',
];

const checks = [
  [/<title>gpt-5\.6-sol<\/title>/.test(html), 'The browser title must be exactly gpt-5.6-sol'],
  [/<h1[^>]*>gpt-5\.6-sol<\/h1>/.test(html), 'The primary visible title must be exactly gpt-5.6-sol'],
  [expectedArt.every((url) => html.includes(url)), 'All four supplied artworks must be present'],
  [html.includes('aria-live="polite"'), 'The realm navigation needs an announcement region'],
  [html.includes('<dialog'), 'The fifth realm must use a native dialog'],
  [css.includes('@media (prefers-reduced-motion: reduce)'), 'Reduced-motion styles are required'],
  [css.includes('@media (max-width: 25rem)'), 'Small-screen styles are required'],
  [css.includes(':focus-visible'), 'Visible keyboard focus styles are required'],
  [css.includes('overflow-y: auto'), 'The full-screen dialog must remain scrollable'],
  [(html.match(/loading="lazy"/g) ?? []).length >= 7, 'Below-fold and dialog artwork must remain lazy'],
  [!(/calc\([^\n;]*\*/.test(css)), 'CSS calc expressions must avoid typed multiplication'],
  [server.includes("response.end('Bad request')"), 'Malformed server URLs must return a 400 response'],
];

const failures = checks.filter(([passed]) => !passed).map(([, message]) => message);
if (failures.length) {
  throw new Error(`Elysian checks failed:\n- ${failures.join('\n- ')}`);
}

console.log(`Elysian checks passed (${checks.length} assertions).`);
