// Renders reel.html frame by frame with headless Chrome.
// usage: node render.mjs <script.json> <outdir> [--sheet] [--frames t1,t2] [--video]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const [scriptPath, outDir, ...flags] = process.argv.slice(2);
const script = JSON.parse(fs.readFileSync(scriptPath, 'utf8'));
const timing = JSON.parse(fs.readFileSync(path.join(outDir, 'timing.json'), 'utf8'));
const geo = JSON.parse(fs.readFileSync(new URL('./geo.json', import.meta.url), 'utf8'));
const FPS = 30;

const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-gpu'] });
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1920 });
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto('file://' + path.resolve(new URL('./reel.html', import.meta.url).pathname));
const fontOk = await page.evaluate((d) => window.init(d), { geo, timing, script });
if (!fontOk) console.error('WARNING: Oswald font did not load');

async function frame(t, q = 0.9) {
  const url = await page.evaluate((t, q) => { window.renderFrame(t); return document.getElementById('c').toDataURL('image/jpeg', q); }, t, q);
  return Buffer.from(url.split(',')[1], 'base64');
}

const fi = flags.indexOf('--frames');
if (fi >= 0) {
  for (const t of flags[fi + 1].split(',').map(Number)) fs.writeFileSync(path.join(outDir, `f_${t}.jpg`), await frame(t));
}
if (flags.includes('--sheet')) {
  const dir = path.join(outDir, 'sheet'); fs.mkdirSync(dir, { recursive: true });
  let n = 0;
  for (let t = 0; t < timing.duration; t += 1) fs.writeFileSync(path.join(dir, `s_${String(n++).padStart(3, '0')}.jpg`), await frame(t, 0.7));
}
if (flags.includes('--video')) {
  const total = Math.ceil(timing.duration * FPS);
  const out = path.join(outDir, 'video_noaudio.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = 0; f < total; f++) {
    const buf = await frame(f / FPS);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 150 === 0) console.log(`frame ${f}/${total} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log('video done', out);
}
await browser.close();
