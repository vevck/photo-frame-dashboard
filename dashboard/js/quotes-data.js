// Quotes from Quotify's published Google Sheet (GLASS_CONFIG.quotesSource), shared by the Glass
// "Quote of the day" card and the Quotes screen.
//   App.quoteList()      -> [{ text, by, cat, catLabel }]   (sheet, else last good copy, else built-ins)
//   App.quoteCategories() -> [{ key, label, count }]          (most quotes first)
//   App.quoteOfDay()     -> index into quoteList() for today; pinned per day so sheet edits don't swap it
// A failed read keeps whatever is showing and retries; App.emit('data') repaints after a successful one.
(function () {
  'use strict';
  var C = window.GLASS_CONFIG, SRC = C.quotesSource;
  var CACHE_KEY = 'homehq.quotes', PIN_KEY = 'homehq.quoteOfDay';
  var Q = { list: null, at: null, timer: null };

  // RFC 4180 CSV: quoted fields may contain commas, doubled quotes ("") and line breaks.
  function parseCSV(text) {
    var rows = [], row = [], field = '', i = 0, inQ = false, c;
    text = text.replace(/^﻿/, '');
    while (i < text.length) {
      c = text[i];
      if (inQ) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
        else field += c;
      } else if (c === '"') inQ = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); rows.push(row); row = []; field = '';
      } else field += c;
      i++;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function catLabel(key) {
    var k = String(key || '').trim().toLowerCase();
    if (!k) return '';
    if (C.categoryLabels[k]) return C.categoryLabels[k];
    var s = k.replace(/[-_]+/g, ' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  // Header row decides the columns (Category, Quote, Author), so reordering them in the sheet is fine.
  function fromCSV(text) {
    var rows = parseCSV(text);
    if (rows.length < 2) throw new Error('empty sheet');
    var head = rows[0].map(function (h) { return clean(h).toLowerCase(); });
    var iq = head.indexOf('quote'), ia = head.indexOf('author'), ic = head.indexOf('category');
    if (iq < 0) throw new Error('no Quote column');
    var out = [];
    rows.slice(1).forEach(function (r) {
      var text = clean(r[iq]);
      if (!text) return;                                   // skip blank rows
      var cat = ic < 0 ? '' : clean(r[ic]).toLowerCase();
      out.push({ text: text, by: ia < 0 ? '' : clean(r[ia]), cat: cat });
    });
    if (!out.length) throw new Error('no quotes');
    return out;
  }
  function withLabels(list) {
    return list.map(function (q) { return { text: q.text, by: q.by, cat: q.cat || '', catLabel: catLabel(q.cat) }; });
  }

  App.quoteList = function () { return Q.list || withLabels(C.quotes); };
  App.quotesUpdated = function () { return Q.at; };
  App.quoteCategories = function () {
    var counts = {};
    App.quoteList().forEach(function (q) { if (q.cat) counts[q.cat] = (counts[q.cat] || 0) + 1; });
    return Object.keys(counts).map(function (k) { return { key: k, label: catLabel(k), count: counts[k] }; })
      .sort(function (a, b) { return b.count - a.count || (a.label < b.label ? -1 : 1); });
  };

  // Quote of the day: chosen once per day (by day number), then remembered by its text.
  function dayKey(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  App.quoteOfDay = function () {
    var list = App.quoteList(), now = App.now(), key = dayKey(now), pin = null;
    try { pin = JSON.parse(localStorage.getItem(PIN_KEY) || 'null'); } catch (e) {}
    if (Q.list && pin && pin.day === key) {
      for (var i = 0; i < list.length; i++) if (list[i].text === pin.text) return i;
    }
    var day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 864e5);
    var idx = list.length ? day % list.length : 0;
    // Pin only real sheet data (fresh or the saved copy). Pinning a built-in fallback quote on a first
    // offline start would keep it all day and make this device disagree with the others.
    if (Q.list) { try { if (list[idx]) localStorage.setItem(PIN_KEY, JSON.stringify({ day: key, text: list[idx].text })); } catch (e) {} }
    return idx;
  };
  // Kept for callers written before the pin existed.
  App.quoteIndex = function () { return App.quoteOfDay(); };

  function load() {
    clearTimeout(Q.timer);
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, SRC.timeoutSeconds * 1000);
    fetch(SRC.csvUrl, ctrl ? { signal: ctrl.signal, cache: 'no-store' } : { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (text) {
        var list = fromCSV(text);
        Q.list = withLabels(list); Q.at = Date.now();
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Q.at, quotes: list })); } catch (e) {}
        Q.timer = setTimeout(load, SRC.refreshHours * 3600000);
        App.emit('data');
      })
      .catch(function (err) {
        console.warn('[quotes] sheet read failed, keeping last good copy:', err && err.message);
        Q.timer = setTimeout(load, SRC.retryMinutes * 60000);
      })
      .then(function () { clearTimeout(t); });
  }

  // Start from the last good copy, if any, so the first paint already shows the sheet's quotes.
  try {
    var cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (cached && cached.quotes && cached.quotes.length) { Q.list = withLabels(cached.quotes); Q.at = cached.at; }
  } catch (e) {}

  App.reloadQuotes = load;
  App.on('ready', load);
})();
