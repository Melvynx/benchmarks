// Serves the workspace root in-process, drives index.html in Chrome, asserts layout + playback.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(import.meta.dirname, '../..');
const TYPES = {'.html': 'text/html', '.mp4': 'video/mp4'};

const server = http.createServer((req, res) => {
	const file = path.join(ROOT, decodeURIComponent(req.url === '/' ? '/index.html' : req.url.split('?')[0]));
	if (!file.startsWith(ROOT) || !fs.existsSync(file)) {
		res.writeHead(404).end();
		return;
	}
	const size = fs.statSync(file).size;
	const type = TYPES[path.extname(file)] ?? 'application/octet-stream';
	const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
	if (range) {
		const start = range[1] ? Number(range[1]) : 0;
		const end = range[2] ? Number(range[2]) : size - 1;
		res.writeHead(206, {
			'Content-Type': type,
			'Content-Range': `bytes ${start}-${end}/${size}`,
			'Accept-Ranges': 'bytes',
			'Content-Length': end - start + 1,
		});
		fs.createReadStream(file, {start, end}).pipe(res);
		return;
	}
	res.writeHead(200, {'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes'});
	fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;

const browser = await puppeteer.launch({
	executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
	headless: true,
	args: ['--autoplay-policy=no-user-gesture-required'],
});

const viewports = [
	[1920, 1080],
	[1280, 1000],
	[1700, 600],
	[390, 844],
];
let ok = true;
const outDir = path.resolve(import.meta.dirname, '../stills');

for (const [w, h] of viewports) {
	const page = await browser.newPage();
	await page.setViewport({width: w, height: h});
	await page.goto(url, {waitUntil: 'load'});
	await page.waitForFunction(() => document.querySelector('video').readyState >= 1, {timeout: 15000});
	const info = await page.evaluate(() => {
		const v = document.querySelector('video');
		const r = v.getBoundingClientRect();
		return {
			title: document.title,
			controls: v.controls,
			vw: v.videoWidth,
			vh: v.videoHeight,
			duration: v.duration,
			rect: {x: r.x, y: r.y, w: r.width, h: r.height},
			headings: document.querySelectorAll('h1,h2,h3,h4,h5,h6').length,
			visibleText: document.body.innerText.trim(),
		};
	});
	const {rect} = info;
	const aspect = rect.w / rect.h;
	const fits = rect.x >= -0.5 && rect.y >= -0.5 && rect.x + rect.w <= w + 0.5 && rect.y + rect.h <= h + 0.5;
	const fills = Math.abs(rect.w - w) < 1 || Math.abs(rect.h - h) < 1;
	const ratioOk = Math.abs(aspect - 16 / 9) < 0.01;

	await page.evaluate(() => {
		const v = document.querySelector('video');
		v.muted = true;
		return v.play();
	});
	await new Promise((r) => setTimeout(r, 2500));
	const play = await page.evaluate(() => {
		const v = document.querySelector('video');
		return {t: v.currentTime, paused: v.paused, error: v.error?.code ?? null};
	});
	await page.evaluate(() => {
		const v = document.querySelector('video');
		v.pause();
		v.currentTime = 42.5;
	});
	await page.waitForFunction(() => !document.querySelector('video').seeking, {timeout: 15000});
	await new Promise((r) => setTimeout(r, 400));
	await page.screenshot({path: path.join(outDir, `player-${w}x${h}.png`)});

	const pass = fits && fills && ratioOk && play.t > 1.5 && !play.paused && play.error === null;
	ok &&= pass;
	console.log(
		`${pass ? 'PASS' : 'FAIL'} ${w}x${h} title="${info.title}" controls=${info.controls} src=${info.vw}x${info.vh} dur=${info.duration.toFixed(3)}s ` +
			`rect=${rect.w.toFixed(1)}x${rect.h.toFixed(1)}@(${rect.x.toFixed(1)},${rect.y.toFixed(1)}) aspect=${aspect.toFixed(4)} fits=${fits} fills=${fills} ` +
			`played=${play.t.toFixed(2)}s paused=${play.paused} err=${play.error} headings=${info.headings} text="${info.visibleText}"`,
	);
	await page.close();
}

await browser.close();
server.close();
process.exit(ok ? 0 : 1);
