// Publishes due posts from queue/ to Instagram using the Instagram API with Instagram Login.
// Usage: node scripts/publish.mjs            -> publish every post whose publish_at has passed
//        node scripts/publish.mjs --check    -> verify the token and show the account, publish nothing
// Env:   IG_ACCESS_TOKEN (secret), MEDIA_BASE_URL (public base URL serving this repo, e.g. GitHub Pages)

import fs from 'node:fs/promises';
import path from 'node:path';

const VERSION = process.env.IG_API_VERSION || 'v22.0';
// Instagram-login tokens use graph.instagram.com; business (system-user) tokens use graph.facebook.com.
let API = `https://graph.instagram.com/${VERSION}`;
const TOKEN = process.env.IG_ACCESS_TOKEN;
const BASE = (process.env.MEDIA_BASE_URL || '').replace(/\/$/, '');
const ROOT = process.cwd();
const QUEUE = path.join(ROOT, 'queue');
const POSTED = path.join(ROOT, 'posted');
const FAILED = path.join(ROOT, 'failed');
const MAX_PER_RUN = 2;
const MAX_ATTEMPTS = 3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ig(method, endpoint, params = {}) {
  const url = new URL(API + endpoint);
  const all = { ...params, access_token: TOKEN };
  let res;
  if (method === 'GET') {
    for (const [k, v] of Object.entries(all)) url.searchParams.set(k, String(v));
    res = await fetch(url);
  } else {
    res = await fetch(url, { method, body: new URLSearchParams(all) });
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    const e = json.error || {};
    throw new Error(`${method} ${endpoint}: ${e.message || res.status} (code ${e.code ?? '?'}, subcode ${e.error_subcode ?? '?'})`);
  }
  return json;
}

async function waitReady(containerId) {
  for (let i = 0; i < 60; i++) {
    const s = await ig('GET', `/${containerId}`, { fields: 'status_code,status' });
    if (s.status_code === 'FINISHED') return;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') {
      throw new Error(`Media container ${containerId} ${s.status_code}: ${s.status || ''}`);
    }
    await sleep(10000);
  }
  throw new Error(`Media container ${containerId} not ready after 10 minutes`);
}

async function assertReachable(url) {
  const res = await fetch(url, { method: 'HEAD' });
  if (!res.ok) throw new Error(`Media not reachable yet (${res.status}): ${url}`);
}

function mediaUrl(post, file) {
  return `${BASE}/queue/${encodeURIComponent(post.id)}/${encodeURIComponent(file)}`;
}

async function publishPost(igId, post) {
  const urls = post.media.map((f) => mediaUrl(post, f));
  for (const u of urls) await assertReachable(u);

  let creationId;
  if (post.type === 'reel') {
    const params = { media_type: 'REELS', video_url: urls[0], caption: post.caption || '', share_to_feed: 'true' };
    if (post.cover) params.cover_url = mediaUrl(post, post.cover);
    creationId = (await ig('POST', `/${igId}/media`, params)).id;
  } else if (post.type === 'carousel') {
    if (urls.length < 2 || urls.length > 10) throw new Error('A carousel needs 2 to 10 images');
    const children = [];
    for (const u of urls) {
      const child = await ig('POST', `/${igId}/media`, { image_url: u, is_carousel_item: 'true' });
      await waitReady(child.id);
      children.push(child.id);
    }
    creationId = (await ig('POST', `/${igId}/media`, {
      media_type: 'CAROUSEL', children: children.join(','), caption: post.caption || '',
    })).id;
  } else if (post.type === 'image') {
    creationId = (await ig('POST', `/${igId}/media`, { image_url: urls[0], caption: post.caption || '' })).id;
  } else {
    throw new Error(`Unknown post type: ${post.type}`);
  }

  await waitReady(creationId);
  const published = await ig('POST', `/${igId}/media_publish`, { creation_id: creationId });
  return published.id;
}

async function readQueue() {
  let dirs = [];
  try { dirs = await fs.readdir(QUEUE, { withFileTypes: true }); } catch { return []; }
  const posts = [];
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const file = path.join(QUEUE, d.name, 'post.json');
    try {
      const post = JSON.parse(await fs.readFile(file, 'utf8'));
      post.id = d.name;
      posts.push(post);
    } catch (e) {
      console.warn(`Skipping ${d.name}: ${e.message}`);
    }
  }
  return posts.sort((a, b) => new Date(a.publish_at) - new Date(b.publish_at));
}

async function archive(post, destRoot, extra) {
  await fs.mkdir(destRoot, { recursive: true });
  const { id, ...rest } = post;
  await fs.writeFile(path.join(destRoot, `${id}.json`), JSON.stringify({ id, ...rest, ...extra }, null, 2) + '\n');
  await fs.rm(path.join(QUEUE, id), { recursive: true, force: true });
}

// Works out which API the token belongs to and which Instagram account it can publish to.
async function connect() {
  try {
    const me = await ig('GET', '/me', { fields: 'user_id,username' });
    return { igId: me.user_id || me.id, username: me.username };
  } catch {
    API = `https://graph.facebook.com/${VERSION}`;
  }
  let igId = process.env.IG_USER_ID;
  if (!igId) {
    const dbg = await ig('GET', '/debug_token', { input_token: TOKEN });
    const scopes = dbg.data?.granular_scopes || [];
    const publish = scopes.find((s) => s.scope === 'instagram_content_publish')
      || scopes.find((s) => s.scope === 'instagram_basic');
    const ids = publish?.target_ids || [];
    if (ids.length === 0) throw new Error('The token has no Instagram account attached. Regenerate it and select the account.');
    if (ids.length > 1) console.log(`Token covers several Instagram accounts (${ids.join(', ')}); using the first. Set IG_USER_ID to choose.`);
    igId = ids[0];
  }
  const acct = await ig('GET', `/${igId}`, { fields: 'username' });
  return { igId, username: acct.username };
}

async function main() {
  if (!TOKEN) {
    console.error('IG_ACCESS_TOKEN secret is missing. Add it under Settings > Secrets and variables > Actions.');
    // Scheduled runs skip quietly until setup is finished; a manual check run reports the problem.
    process.exit(process.argv.includes('--check') ? 1 : 0);
  }
  const { igId, username } = await connect();
  console.log(`Connected to Instagram @${username} (account id ${igId}) via ${new URL(API).host}`);

  if (process.argv.includes('--check')) {
    try {
      const limit = await ig('GET', `/${igId}/content_publishing_limit`, { fields: 'quota_usage,config' });
      console.log(`Publishing quota: ${JSON.stringify(limit.data?.[0] || limit)}`);
    } catch (e) {
      console.log(`Could not read publishing quota: ${e.message}`);
    }
    if (!BASE) console.log('MEDIA_BASE_URL is not set.');
    else {
      const res = await fetch(`${BASE}/README.md`, { method: 'HEAD' }).catch(() => null);
      console.log(res && res.ok ? `GitHub Pages is serving files at ${BASE}` : `GitHub Pages is NOT serving ${BASE} yet. Enable it under Settings > Pages.`);
    }
    return;
  }

  if (!BASE) throw new Error('MEDIA_BASE_URL is not set');
  const now = Date.now();
  const due = (await readQueue()).filter((p) => p.publish_at && new Date(p.publish_at).getTime() <= now);
  if (!due.length) { console.log('Nothing due.'); return; }

  for (const post of due.slice(0, MAX_PER_RUN)) {
    try {
      console.log(`Publishing ${post.id} (${post.type})...`);
      const mediaId = await publishPost(igId, post);
      await archive(post, POSTED, { ig_media_id: mediaId, published_at: new Date().toISOString() });
      console.log(`Published ${post.id} as media ${mediaId}`);
    } catch (e) {
      const attempts = (post.attempts || 0) + 1;
      console.error(`Failed ${post.id} (attempt ${attempts}): ${e.message}`);
      if (attempts >= MAX_ATTEMPTS) {
        await archive(post, FAILED, { attempts, last_error: e.message, failed_at: new Date().toISOString() });
      } else {
        const { id, ...rest } = post;
        await fs.writeFile(path.join(QUEUE, id, 'post.json'), JSON.stringify({ ...rest, attempts, last_error: e.message }, null, 2) + '\n');
      }
      process.exitCode = 1;
    }
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
