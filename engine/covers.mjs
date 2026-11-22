// Renders harmonised reel covers (1080x1920 JPEG). Everything important sits in the centre
// 1080x1440 band (y 240-1680), which is what the Instagram profile grid shows (3:4).
// usage: node covers.mjs covers.json outdir [slug ...]
// covers.json: [{ "slug", "n", "tag", "title": ["LINE", "*KEY* LINE"], "pins": [["LABEL", lon, lat]] | "icon": "drop|kettle|flask|tap" }]
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const here = path.dirname(new URL(import.meta.url).pathname);
const list = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const out = process.argv[3]; fs.mkdirSync(out, { recursive: true });
const only = process.argv.slice(4);
const geo = JSON.parse(fs.readFileSync(path.join(here, 'geo.json'), 'utf8'));
const iconsSrc = fs.readFileSync(path.join(here, 'carousel.html'), 'utf8').match(/const ICONS = \{([\s\S]*?)\n\};/)[1];
const ICONS = Function(`return {${iconsSrc}}`)();

// Map: equirectangular with cos(lat) correction, UK fitted into a fixed box so the map is
// identical on every cover and only the pins move.
const LON0 = -3.2, LAT0 = 54.6, K = Math.cos(LAT0 * Math.PI / 180), S = 64;
const BOX = { cx: 540, cy: 1262 };
const proj = ([lon, lat]) => [BOX.cx + (lon - LON0) * K * S, BOX.cy - (lat - LAT0) * S];
const pathOf = (polys) => polys.map((ring) => 'M' + ring.map((p) => proj(p).map((v) => v.toFixed(1)).join(',')).join('L') + 'Z').join('');
const UK = pathOf(geo.uk), IE = pathOf(geo.ie), FR = pathOf(geo.fr);

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const line = (l) => esc(l).replace(/\*(.+?)\*/g, '<em>$1</em>');

function visual(c) {
  if (c.pins) {
    const pins = c.pins.map(([label, lon, lat, side], i) => {
      const [x, y] = proj([lon, lat]);
      side = side || (x > 640 ? 'l' : 'r');
      const left = side.includes('l');
      const dy = side.startsWith('b') ? 90 : 0;
      return `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})"><circle r="34" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="3"/><circle r="15" fill="#fff"/><circle r="6" fill="#012169"/>
        <g transform="translate(${left ? -26 : 26},${-30 + dy})"><rect x="${left ? -(label.length * 18.5 + 40) : 0}" y="-30" width="${label.length * 18.5 + 40}" height="48" rx="8" fill="#fff"/>
        <text x="${left ? -(label.length * 18.5 + 40) / 2 : (label.length * 18.5 + 40) / 2}" y="3" text-anchor="middle" font-family="Inter" font-weight="700" font-size="26" letter-spacing="2" fill="#012169">${esc(label)}</text></g></g>`;
    }).join('');
    return `<svg class="map" width="1080" height="1920" viewBox="0 0 1080 1920"><path d="${FR}" fill="#fff" fill-opacity=".05"/><path d="${IE}" fill="#fff" fill-opacity=".08"/><path d="${UK}" fill="#C8102E" stroke="#8f0a20" stroke-width="2"/>${pins}</svg>`;
  }
  const svg = (ICONS[c.icon] || ICONS.drop).replaceAll('#012169', '#FFFFFF');
  return `<div class="icon"><div class="disc">${svg}</div></div>`;
}

const html = (c) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Oswald;font-weight:700;src:url("file://${here}/node_modules/@fontsource/oswald/files/oswald-latin-700-normal.woff2")}
@font-face{font-family:Inter;font-weight:700;src:url("file://${here}/node_modules/@fontsource/inter/files/inter-latin-700-normal.woff2")}
html,body{margin:0}
.c{width:1080px;height:1920px;position:relative;overflow:hidden;color:#fff;font-family:Inter;
  background:radial-gradient(900px 900px at 50% 1250px,#0b3290 0%,#012169 55%,#00133f 100%)}
.map{position:absolute;inset:0}
.top{position:absolute;left:90px;right:90px;top:300px}
.tag{display:flex;align-items:center;gap:18px;font-weight:700;font-size:30px;letter-spacing:6px}
.tag b{background:#C8102E;padding:10px 16px;letter-spacing:4px}
.tag span{opacity:.85}
h1{font-family:Oswald;font-weight:700;text-transform:uppercase;font-size:var(--fs,124px);line-height:1.16;margin:34px 0 0;letter-spacing:-.5px;text-shadow:0 6px 30px rgba(0,0,0,.25)}
h1 div{white-space:nowrap}
h1 em{font-style:normal;background:#C8102E;padding:0 14px;margin:0 -4px;display:inline-block;line-height:1.08}
.icon{position:absolute;left:0;right:0;top:990px;display:flex;justify-content:center}
.disc{width:560px;height:560px;border-radius:50%;background:#C8102E;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 26px rgba(255,255,255,.06),0 0 0 54px rgba(255,255,255,.03)}
.disc svg{transform:scale(.95)}
.brand{position:absolute;left:90px;right:90px;top:1578px;display:flex;align-items:baseline;justify-content:space-between;border-top:2px solid rgba(255,255,255,.25);padding-top:22px}
.brand b{font-family:Oswald;font-size:40px;letter-spacing:1px}
.brand span{font-weight:700;font-size:22px;letter-spacing:6px;opacity:.75}
</style></head><body><div class="c">${visual(c)}
<div class="top"><div class="tag"><b>№ ${String(c.n).padStart(2, '0')}</b><span>${esc(c.tag)}</span></div><h1>${c.title.map((l) => `<div>${line(l)}</div>`).join('')}</h1></div>
<div class="brand"><b>THE DROP</b><span>UK WATER SCIENCE</span></div></div></body></html>`;

const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1920 });
for (const c of list) {
  if (only.length && !only.includes(c.slug)) continue;
  const f = path.join(out, `.tmp.html`);
  fs.writeFileSync(f, html(c));
  await page.goto('file://' + path.resolve(f));
  await page.evaluate(() => document.fonts.ready);
  // Shrink the title until every line fits the width and the block stays above the visual.
  const fs_ = await page.evaluate(() => {
    const h = document.querySelector('h1');
    let s = 124;
    const fits = () => [...h.children].every((d) => d.scrollWidth <= 900) && h.getBoundingClientRect().bottom <= 960;
    while (!fits() && s > 70) { s -= 4; h.style.setProperty('--fs', s + 'px'); }
    return s;
  });
  await page.screenshot({ path: path.join(out, `${c.slug}.jpg`), type: 'jpeg', quality: 92 });
  console.log(`${c.slug} (${fs_}px)`);
}
fs.rmSync(path.join(out, '.tmp.html'), { force: true });
await browser.close();
