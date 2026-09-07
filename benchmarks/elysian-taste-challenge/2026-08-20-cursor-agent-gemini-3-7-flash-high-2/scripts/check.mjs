import { access, readFile } from 'node:fs/promises';

const requiredFiles = ['index.html', 'styles.css', 'script.js', 'favicon.svg', 'package.json'];
await Promise.all(requiredFiles.map((file) => access(file)));

const [html, css, js, pkg] = await Promise.all([
  readFile('index.html', 'utf8'),
  readFile('styles.css', 'utf8'),
  readFile('script.js', 'utf8'),
  readFile('package.json', 'utf8'),
]);

const expectedArt = [
  'https://code.melvynx.dev/elysian-classical-surreal-still-life.png',
  'https://codelynx.mlvcdn.com/uploads/2026-07-13/2026-07-13-greco-roman-scholarly-landscape.png',
  'https://codelynx.mlvcdn.com/uploads/2026-07-13/2026-07-13-vibrant-mountain-river-valley.png',
  'https://codelynx.mlvcdn.com/uploads/2026-07-13/2026-07-13-golden-temple-starry-night.png',
];

const checks = [
  [/<title>Gemini 3\.7 Flash<\/title>/.test(html), 'The browser title must be exactly Gemini 3.7 Flash'],
  [/<h1[^>]*>Gemini 3\.7 Flash<\/h1>/.test(html), 'The primary visible title must be exactly Gemini 3.7 Flash'],
  [expectedArt.every((url) => html.includes(url)), 'All four supplied artworks must be present'],
  [html.includes('aria-live="polite"'), 'The realm navigation needs an announcement region'],
  [html.includes('<dialog'), 'The dossier modal must use a native dialog'],
  [html.includes('<canvas'), 'Canvas elements must be present for celestial particles and sigil'],
  [css.includes('@media (prefers-reduced-motion: reduce)'), 'Reduced-motion styles are required'],
  [css.includes(':focus-visible'), 'Visible keyboard focus styles are required'],
  [js.includes('AudioContext') || js.includes('webkitAudioContext'), 'Generative soundscape audio engine is required'],
  [!pkg.includes('"npm"'), 'No npm dependencies or scripts'],
];

const failures = checks.filter(([passed]) => !passed).map(([, message]) => message);
if (failures.length) {
  console.error(`Elysian checks failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(`All Elysian checks passed (${checks.length} assertions verified).`);
