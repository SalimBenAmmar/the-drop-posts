// Renders a carousel JSON to 1080x1350 JPEGs. usage: node carousel.mjs carousel.json outdir
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const out = process.argv[3]; fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1350 });
await page.goto('file://' + path.resolve(new URL('./carousel.html', import.meta.url).pathname));
await page.evaluate((d) => window.setData(d), data);
for (let i = 0; i < data.slides.length; i++) {
  await page.evaluate((i) => window.show(i), i);
  await page.evaluate(() => document.fonts.ready);
  const el = await page.$('.s');
  await el.screenshot({ path: path.join(out, `slide_${i + 1}.jpg`), type: 'jpeg', quality: 92 });
  const h = await page.evaluate(() => document.querySelector('.s').scrollHeight);
  if (h > 1350) console.log(`WARNING slide ${i + 1} overflows (${h}px)`);
}
await browser.close();
console.log(`${data.slides.length} slides done`);
