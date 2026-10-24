// Vite plugin: Google Photos shared albums for the Photos view, listed in photo-config.json:
//   { "albums": [{ "name": "Family", "url": "https://photos.app.goo.gl/…" }] }
// GET /api/photo-albums                 → { albums: [{ name }] }   (links stay on the server)
// GET /api/google-photos?album=<name>   → { title, photos: [{ url, w, h, taken }] }
// Google Photos share pages send no CORS headers, so the page can't read them itself. The dev server
// and `vite preview` (what the frame loads) read the album here instead. The image URLs it returns
// (lh3.googleusercontent.com) load in <img> as long as no Referer is sent.
// photo-config.json is read on every request, so edits apply without a restart. It is git-ignored
// (album links let anyone see the album); photo-config.example.json shows the format.
// Only public "shared by link" albums work, and only the first page of photos (about 300) is read.
import fs from 'node:fs';
import path from 'node:path';

const CONFIG = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'photo-config.json');
const CACHE_MS = 10 * 60000;
const TIMEOUT_MS = 15000;
const cache = new Map();   // album link → { at, body }

function fail(status, message, extra) { return Object.assign(new Error(message), { status }, extra); }

function readConfig() {
  let raw;
  try { raw = fs.readFileSync(CONFIG, 'utf8'); } catch (e) { return []; }   // no file: no albums
  let cfg;
  try { cfg = JSON.parse(raw); } catch (e) { throw fail(500, 'photo-config.json is not valid JSON: ' + e.message); }
  const list = Array.isArray(cfg && cfg.albums) ? cfg.albums : [];
  return list.filter((a) => a && typeof a.name === 'string' && a.name.trim() && typeof a.url === 'string')
    .map((a) => ({ name: a.name.trim(), url: a.url.trim() }));
}

// Only follow links to Google Photos, so a bad config entry can't make this fetch arbitrary pages.
function allowed(u) {
  if (u.protocol !== 'https:') return false;
  if (u.hostname === 'photos.app.goo.gl' || u.hostname === 'goo.gl') return true;
  return u.hostname === 'photos.google.com' && /^\/(u\/\d+\/)?share\//.test(u.pathname);
}

async function fetchAlbumHTML(link) {
  let url = new URL(link);
  for (let hop = 0; hop < 5; hop++) {
    if (!allowed(url)) throw fail(400, 'Not a Google Photos shared album link');
    const r = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': 'Mozilla/5.0 (HomeHQ photo frame)', 'accept-language': 'en' }
    });
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { url = new URL(r.headers.get('location'), url); continue; }
    if (r.status === 404) throw fail(404, 'Album not found. Is it still shared by link?');
    if (!r.ok) throw fail(502, 'Google Photos answered HTTP ' + r.status);
    return r.text();
  }
  throw fail(502, 'Too many redirects');
}

// The page embeds its data as AF_initDataCallback({key: 'ds:1', ..., data:[...], sideChannel: {}}).
// In the album block, data[1] is the photo list: [id, [url, width, height, ...], takenMs, ?, tzOffsetMs, ...]
// and data[3][1] is the album title.
function parseAlbum(html) {
  const re = /AF_initDataCallback\(\{key: 'ds:\d+'[\s\S]*?data:([\s\S]*?), sideChannel: \{\}\}\);<\/script>/g;
  for (const m of html.matchAll(re)) {
    let d;
    try { d = JSON.parse(m[1]); } catch (e) { continue; }
    if (!Array.isArray(d) || !Array.isArray(d[1]) || !d[1].length) continue;
    const photos = d[1].map((e) => {
      const img = Array.isArray(e) && e[1];
      if (!Array.isArray(img) || typeof img[0] !== 'string' || !/^https:\/\/lh\d\.googleusercontent\.com\//.test(img[0])) return null;
      const taken = typeof e[2] === 'number' ? e[2] + (typeof e[4] === 'number' ? e[4] : 0) : null;
      return { url: img[0], w: img[1] || 0, h: img[2] || 0, taken };
    }).filter(Boolean);
    if (!photos.length) continue;
    const title = Array.isArray(d[3]) && typeof d[3][1] === 'string' ? d[3][1].trim() : '';
    return { title, photos };
  }
  return null;
}

async function album(name) {
  const entry = readConfig().filter((a) => a.name === name)[0];
  // gone: the device's saved choice is no longer in the config, so it should drop it.
  if (!entry) throw fail(404, 'No album called “' + name + '” in photo-config.json', { gone: true });
  let link;
  try { link = new URL(entry.url); } catch (e) { throw fail(400, 'The link for “' + name + '” in photo-config.json is not a URL'); }
  if (!allowed(link)) throw fail(400, 'The link for “' + name + '” is not a Google Photos shared album link');
  const hit = cache.get(link.href);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.body;
  const body = parseAlbum(await fetchAlbumHTML(link));
  if (!body) throw fail(422, 'No photos found. Check the album is shared by link and has photos.');
  cache.set(link.href, { at: Date.now(), body });
  return body;
}

function middleware(req, res, next) {
  const u = new URL(req.url, 'http://x');
  if (u.pathname !== '/api/photo-albums' && u.pathname !== '/api/google-photos') return next();
  const send = (status, obj) => {
    res.statusCode = status;
    res.setHeader('content-type', 'application/json');
    res.setHeader('cache-control', 'no-store');
    res.end(JSON.stringify(obj));
  };
  const sendError = (err) => {
    const timeout = err && (err.name === 'TimeoutError' || err.name === 'AbortError');
    send(err.status || 502, { error: timeout ? 'Google Photos took too long to answer' : (err.message || 'Could not read the album'), gone: !!err.gone });
  };
  if (u.pathname === '/api/photo-albums') {
    try { return send(200, { albums: readConfig().map((a) => ({ name: a.name })) }); } catch (err) { return sendError(err); }
  }
  album(u.searchParams.get('album') || '').then((body) => send(200, body), sendError);
}

export default function googlePhotos() {
  return {
    name: 'home-hq-google-photos',
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); }
  };
}
