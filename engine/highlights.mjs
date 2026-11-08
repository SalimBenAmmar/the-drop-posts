// Renders highlight covers and their stories. usage: node highlights.mjs outdir
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1920 });
await page.goto('file://' + path.resolve('highlights.html'));
const keys = await page.evaluate(() => window.keys);
for (let i = 0; i < keys.length; i++) {
  for (const kind of ['cover', 'story']) {
    await page.evaluate((k, i) => window[k](i), kind, i);
    await page.evaluate(() => document.fonts.ready);
    const el = await page.$('.f');
    await el.screenshot({ path: path.join(out, `${i + 1}-${keys[i]}-${kind}.jpg`), type: 'jpeg', quality: 92 });
  }
}
await browser.close();
console.log(keys.join(', '));
