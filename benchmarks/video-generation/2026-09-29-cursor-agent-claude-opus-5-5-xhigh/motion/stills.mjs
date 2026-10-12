import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';

// usage: node stills.mjs 1.2 3.5 ...  (seconds)
const secs = process.argv.slice(2).map(Number);
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const composition = await selectComposition({serveUrl, id: 'LumailLaunch'});
for (const s of secs) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(s * composition.fps));
  const scale = Number(process.env.SCALE ?? 0.5);
  const output = path.resolve(`out/stills/t${s.toFixed(2)}${scale === 1 ? '-full' : ''}.png`);
  await renderStill({serveUrl, composition, frame, output, scale});
  console.log(output);
}
