// Google Photos albums for the Photos view. The albums (name + link) are listed in photo-config.json
// on the server; the gear on the Photos screen picks one, and the choice is saved on this device.
// Albums are read through /api/photo-albums and /api/google-photos (server/google-photos.js, served by
// `vite dev` and `vite preview`) and mapped to the DATA.photos shape the slideshow uses:
//   { src, o: 'l'|'p', date: 'YYYY-MM-DD'|null, place, tag }
// The last good copy of the chosen album is kept in memory and localStorage, so a failed refresh (or a
// reboot while Wi-Fi is down) keeps showing it. With no album chosen, the Photos view shows the demo photos.
(function () {
  'use strict';
  var NAME_KEY = 'homehq.photoAlbumName', CACHE_KEY = 'homehq.photoAlbumCache';
  var REFRESH_MS = 30 * 60000, RETRY_MS = 2 * 60000, TIMEOUT_MS = 25000;
  var A = { name: '', title: '', photos: null, at: 0, timer: null, seq: 0 };

  function ymd(ms) {
    var d = new Date(ms);   // taken time already includes the photo's own UTC offset
    return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2);
  }
  function toPhotos(name, body) {
    return body.photos.map(function (p) {
      return { src: p.url, o: p.h > p.w ? 'p' : 'l', date: p.taken ? ymd(p.taken) : null, place: name, tag: 'album' };
    });
  }

  // fetch() JSON with a timeout; rejects with a readable message (err.gone: album left the config).
  function getJSON(path) {
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT_MS);
    var opts = ctrl ? { signal: ctrl.signal, cache: 'no-store' } : { cache: 'no-store' };
    return fetch(path, opts)
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (body) {
          if (!r.ok) {
            var msg = body.error || (r.status === 404 ? 'This dashboard server can’t read albums' : 'HTTP ' + r.status);
            throw Object.assign(new Error(msg), { gone: !!body.gone });
          }
          return body;
        });
      }, function (err) {
        throw new Error(err && err.name === 'AbortError' ? 'Google Photos took too long to answer' : 'Couldn’t reach the dashboard server');
      })
      .then(function (body) { clearTimeout(t); return body; }, function (err) { clearTimeout(t); throw err; });
  }
  function fetchAlbum(name) {
    return getJSON('/api/google-photos?album=' + encodeURIComponent(name)).then(function (body) {
      if (!body.photos || !body.photos.length) throw new Error('That album has no photos');
      return body;
    });
  }

  function keep(name, body) {
    A.name = name; A.title = body.title || ''; A.photos = toPhotos(name, body); A.at = Date.now();
    try {
      localStorage.setItem(NAME_KEY, name);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ name: name, at: A.at, body: body }));
    } catch (e) {}
    App.emit('photoAlbum');
  }

  function refresh() {
    clearTimeout(A.timer);
    if (!A.name) return;
    var my = ++A.seq, name = A.name;
    fetchAlbum(name).then(function (body) {
      if (my !== A.seq) return;
      keep(name, body);
      A.timer = setTimeout(refresh, REFRESH_MS);
    }, function (err) {
      if (my !== A.seq) return;
      if (err.gone) { console.warn('[photos] album "' + name + '" is no longer in photo-config.json'); return App.clearPhotoAlbum(); }
      console.warn('[photos] album read failed, keeping last good copy:', err && err.message);
      A.timer = setTimeout(refresh, RETRY_MS);
    });
  }

  // Resolves to [{ name }] from photo-config.json.
  App.photoAlbumList = function () {
    return getJSON('/api/photo-albums').then(function (body) { return body.albums || []; });
  };

  // { name, title, photos: [...] | null, at }. photos is null until the album has loaded once.
  App.photoAlbum = function () { return { name: A.name, title: A.title, photos: A.photos, at: A.at }; };

  // Loads the album first and only switches to it once it loads; rejects with a readable message.
  App.setPhotoAlbum = function (name) {
    var my = ++A.seq;
    clearTimeout(A.timer);
    return fetchAlbum(name).then(function (body) {
      if (my === A.seq) { keep(name, body); A.timer = setTimeout(refresh, REFRESH_MS); }
      return App.photoAlbum();
    }, function (err) {
      if (my === A.seq && A.name) A.timer = setTimeout(refresh, RETRY_MS);
      throw err;
    });
  };

  App.clearPhotoAlbum = function () {
    ++A.seq; clearTimeout(A.timer);
    A.name = ''; A.title = ''; A.photos = null; A.at = 0;
    try { localStorage.removeItem(NAME_KEY); localStorage.removeItem(CACHE_KEY); } catch (e) {}
    App.emit('photoAlbum');
  };

  try {
    // Keys from the first version, which stored a pasted link.
    localStorage.removeItem('homehq.photoAlbum'); localStorage.removeItem('homehq.photoAlbum.cache');
    A.name = localStorage.getItem(NAME_KEY) || '';
    var c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (A.name && c && c.name === A.name && c.body && c.body.photos && c.body.photos.length) {
      A.title = c.body.title || ''; A.photos = toPhotos(A.name, c.body); A.at = c.at || 0;
    }
  } catch (e) {}
  if (A.name) refresh();
})();
