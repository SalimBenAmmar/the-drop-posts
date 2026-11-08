// Renders carousel.html slides to 1080x1350 JPEGs. usage: node carousel.mjs outdir
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1350 });
await page.goto('file://' + path.resolve('carousel.html'));
for (let i = 0; i < 7; i++) {
  await page.evaluate((i) => window.show(i), i);
  await page.evaluate(() => document.fonts.ready);
  const el = await page.$('.s');
  await el.screenshot({ path: path.join(out, `slide_${i + 1}.jpg`), type: 'jpeg', quality: 92 });
}
await browser.close();
console.log('slides done');
