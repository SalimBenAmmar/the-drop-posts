// Extracts simplified land outlines around the British Isles from world-atlas into geo.json.
import fs from 'node:fs';
import { feature } from 'topojson-client';

const topo = JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-50m.json', 'utf8'));
const all = feature(topo, topo.objects.countries).features;
const keep = { '826': 'uk', '372': 'ie', '250': 'fr', '056': 'be', '528': 'nl', '276': 'de', '208': 'dk', '578': 'no', '442': 'lu' };
const out = {};
for (const f of all) {
  const key = keep[f.id];
  if (!key) continue;
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const rings = [];
  for (const poly of polys) {
    const ring = poly[0];
    if (!ring.some(([x, y]) => x > -14 && x < 14 && y > 46 && y < 63)) continue;
    rings.push(ring.map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]));
  }
  out[key] = rings;
}
fs.writeFileSync('geo.json', JSON.stringify(out));
console.log(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length])));
