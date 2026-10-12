// Usage: node scripts/stills.mjs <sec> [sec...]  → stills/s<sec>.png + stills/sheet.png
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const secs = process.argv.slice(2).map(Number);
const root = path.resolve(import.meta.dirname, '..');
fs.mkdirSync(path.join(root, 'stills'), {recursive: true});

const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts')});
const composition = await selectComposition({serveUrl, id: 'LumailLaunch'});

const outs = [];
for (const s of secs) {
	const frame = Math.min(composition.durationInFrames - 1, Math.round(s * composition.fps));
	const output = path.join(root, 'stills', `s${s.toFixed(2)}.png`);
	await renderStill({composition, serveUrl, output, frame, scale: 0.5});
	outs.push(output);
	console.log('rendered', s, frame);
}

if (outs.length > 1) {
	const cols = 2;
	const inputs = outs.flatMap((o) => ['-i', o]);
	const layout = outs
		.map((_, i) => `${(i % cols) * 964}_${Math.floor(i / cols) * 544}`)
		.join('|');
	const stack = outs.map((_, i) => `[${i}:v]`).join('');
	execFileSync('ffmpeg', [
		'-loglevel', 'error', '-y', ...inputs,
		'-filter_complex', `${stack}xstack=inputs=${outs.length}:layout=${layout}:fill=black`,
		path.join(root, 'stills', 'sheet.png'),
	]);
	console.log('sheet written');
}
