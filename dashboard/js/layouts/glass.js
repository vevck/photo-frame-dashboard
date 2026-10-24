// "Glass" Today layout: a dark, full-bleed screen with glass cards. Preview with ?layout=glass.
// Live: date, clock, greeting, weather (weather.js), air quality (Open-Meteo), chores (DATA.chores);
// the quote rotates daily from GLASS_CONFIG.quotes.
// Demo: news, music and football come from GLASS_CONFIG.demo. Settings and text: glass-config.js.
(function () {
  'use strict';
  var D = window.DATA, C = window.GLASS_CONFIG, S = C.settings;
  var G = { el: null, aqi: null, aqiPlace: null, aqiTimer: null, aqiBusy: false };

  App.glassText = function (path, vals) {
    var s = path.split('.').reduce(function (o, k) { return o && o[k]; }, C.text);
    if (s == null) return path;
    return String(s).replace(/\{(\w+)\}/g, function (m, k) { return vals && vals[k] != null ? vals[k] : m; });
  };
  var t = App.glassText, esc = App.esc;

  // Line icons not in icons.js (24×24, stroke).
  var PATHS = {
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r=".8"/><circle cx="4.5" cy="12" r=".8"/><circle cx="4.5" cy="18" r=".8"/>',
    chevron: '<path d="M9 5l7 7-7 7"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    shuffle: '<path d="M3 7h3.5c2 0 3.2 1 4.5 3l2 4c1.3 2 2.5 3 4.5 3H21M3 17h3.5c1.6 0 2.7-.6 3.7-1.8M14 8.8c1-1.2 2-1.8 3.5-1.8H21"/><path d="M18 4l3 3-3 3M18 14l3 3-3 3"/>',
    prev: '<path d="M18 5v14l-10-7z" fill="currentColor"/><path d="M6 5v14"/>',
    next: '<path d="M6 5v14l10-7z" fill="currentColor"/><path d="M18 5v14"/>',
    leaf: '<path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15"/><path d="M5 19l7-7"/>',
    checklist: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M7.5 9l2 2 3.5-3.5M7.5 15.5h9"/>',
    ball: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5l3.4 2.5-1.3 4h-4.2l-1.3-4zM12 3.5v4M15.4 10l4.3-1.4M14.1 14l2.6 3.6M9.9 14l-2.6 3.6M8.6 10L4.3 8.6"/>'
  };
  function ic(name, size) {
    if (!PATHS[name]) return App.icon(name, size);
    return '<svg class="i" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + PATHS[name] + '</svg>';
  }

  function period(d) {
    var h = d.getHours();
    return h < 5 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 22 ? 'evening' : 'night';
  }

  // ---------------------------------------------------------------- header
  function header() {
    var nav = C.text.nav;
    return '<header class="gl-head">' +
      '<div class="gl-brand" role="button" aria-label="' + esc(t('brand')) + ' — press and hold for HomeDash controls">' + ic('home', 30) + '<b>' + esc(t('brand')) + '</b></div>' +
      '<nav class="gl-nav">' + Object.keys(nav).map(function (k) {
        var icon = { home: 'home', calendar: 'calendar', tasks: 'users', shopping: 'list', photos: 'photo' }[k];
        return '<button data-go="' + k + '" class="' + (k === 'home' ? 'is-on' : '') + '">' + ic(icon, 20) + '<span>' + esc(nav[k]) + '</span></button>';
      }).join('') + '</nav></header>';
  }

  // ---------------------------------------------------------------- hero: date, clock, greeting
  function hero() {
    var n = App.now(), p = period(n), w = App.weatherNow();
    var left = App.timedOn(n).filter(function (e) { return e.start > n; }).length;
    var mood = left >= S.busyEventCount ? 'busy' : left ? 'calm' : 'free';
    var ampm = App.fmt.ampm(n);
    return {
      date: esc(App.fmt.day(n) + ', ' + n.getDate() + ' ' + App.fmt.month(n)),
      clock: '<span class="gl-time">' + App.fmt.time(n, false) + '</span>' + (ampm ? '<sup>' + ampm + '</sup>' : ''),
      greet: esc(t('greeting.' + p)),
      sub: esc(w.summary + '. ' + t(mood, { period: t('period.' + p) }))
    };
  }

  // ---------------------------------------------------------------- weather + air quality card
  // Three parts in one row: now | next hours | air quality. Open-Meteo serves weather and air quality
  // from two services (one request can't return both), so weather.js and loadAqi() fetch separately.
  function weather() {
    var w = App.weatherNow(), place = w.place || App.weatherPlace().name;
    var hours = App.hourly(6).map(function (h, i) {
      var label = i === 0 ? App.wxText('display.now') : App.fmt.hour(new Date(2000, 0, 1, h.h));
      return '<li class="' + (h.p >= WEATHER_CONFIG.settings.rainChancePct ? 'is-wet' : '') + '"><span>' + esc(label) + '</span>' + App.icon(h.c, 26) + '<b>' + h.t + '°</b></li>';
    }).join('');
    return '<div class="gl-wx-now' + (w.cond === 'rain' ? ' is-wet' : '') + '">' +
      '<div class="gl-wx-place">' + App.icon('pin', 18) + '<span>' + esc(place) + '</span></div>' +
      '<div class="gl-wx-cur">' + App.icon(w.cond, 46) + '<span class="gl-wx-temp">' + w.temp + '°</span></div>' +
      '<div class="gl-wx-label">' + esc(w.label) + '</div>' +
      '<div class="gl-wx-hl">' + esc(App.wxText('display.highLow', { hi: w.hi, lo: w.lo })) + '</div></div>' +
      '<ul class="gl-wx-hours">' + hours + '</ul>' +
      '<div class="gl-wx-aqi">' + aqi() + '</div>';
  }

  // ---------------------------------------------------------------- Moments photo carousel
  // A fixed set (on-this-day first, then newest landscape photos) so the dots mean something.
  // Photos come from the album chosen in Photo settings, or the demo photos. An album with no landscape
  // photos uses its portrait ones (cropped to fill). Album photos without a date sort last.
  // Two stacked images cross-fade; the next one is shown only after it has loaded.
  var CAR = { list: [], i: 0, timer: null, front: 0 };
  function carouselList() {
    var all = App.photoAlbum().photos || D.photos;
    var land = all.filter(function (p) { return p.o === 'l'; });
    if (!land.length) land = all.slice();
    land.sort(function (a, b) {
      var ma = App.photoMeta(a).onThisDay ? 1 : 0, mb = App.photoMeta(b).onThisDay ? 1 : 0;
      var da = a.date || '', db = b.date || '';
      return mb - ma || (da < db ? 1 : da > db ? -1 : 0);
    });
    return land.slice(0, S.carouselPhotos);
  }
  function photoCard() {
    // no-referrer: Google Photos album images are refused when a Referer is sent.
    return '<img class="gl-ph-img is-on" alt="" referrerpolicy="no-referrer"><img class="gl-ph-img" alt="" referrerpolicy="no-referrer"><div class="gl-ph-shade"></div>' +
      '<div class="gl-ph-cap">' + ic('photo', 24) + '<div><b>' + esc(t('moments')) + '</b><span class="gl-ph-sub"></span></div></div>' +
      '<button class="gl-ph-nav gl-ph-prev" data-ph="-1" aria-label="Previous photo">' + ic('chevron', 22) + '</button>' +
      '<button class="gl-ph-nav gl-ph-next" data-ph="1" aria-label="Next photo">' + ic('chevron', 22) + '</button>' +
      '<div class="gl-ph-dots"></div>';
  }
  function showPhoto(i) {
    var card = G.el && G.el.querySelector('.gl-photo');
    if (!card || !CAR.list.length) return;
    CAR.i = (i + CAR.list.length) % CAR.list.length;
    var p = CAR.list[CAR.i], m = App.photoMeta(p);
    var imgs = card.querySelectorAll('.gl-ph-img'), back = imgs[1 - CAR.front], front = imgs[CAR.front];
    var url = App.photoSrc(p, true), done = false;
    function swap() {
      if (done) return; done = true;
      back.classList.add('is-on'); front.classList.remove('is-on'); CAR.front = 1 - CAR.front;
    }
    if (front.getAttribute('src') === url) done = true;
    else { back.onload = swap; back.onerror = swap; back.setAttribute('src', url); if (back.complete && back.naturalWidth) swap(); }
    card.querySelector('.gl-ph-sub').textContent = m.kicker ? t('momentsCaption', { place: m.place, when: m.kicker }) : m.place;
    card.querySelector('.gl-ph-dots').innerHTML = CAR.list.map(function (x, k) {
      return '<button data-ph-go="' + k + '" class="' + (k === CAR.i ? 'is-on' : '') + '" aria-label="Photo ' + (k + 1) + '"></button>';
    }).join('');
  }
  function carouselStart() {
    clearInterval(CAR.timer);
    CAR.timer = setInterval(function () { showPhoto(CAR.i + 1); }, S.carouselSeconds * 1000);
  }
  function carouselStop() { clearInterval(CAR.timer); CAR.timer = null; }
  // A different album was chosen in Photo settings: start the carousel over with its photos.
  App.on('photoAlbum', function () { if (!G.el) return; CAR.list = carouselList(); showPhoto(0); });

  // ---------------------------------------------------------------- news (demo)
  function news() {
    return '<div class="gl-card-head"><h3>' + esc(t('newsTitle', { period: t('period.' + period(App.now())) })) + '</h3>' + ic('chevron', 22) + '</div>' +
      '<ul class="gl-news">' + C.demo.news.map(function (a) {
        return '<li><img src="' + App.img(a.seed, 160, 128) + '" alt="" loading="lazy"><div><small>' + esc(a.topic) + ' · ' + esc(t('readTime', { n: a.mins })) + '</small>' +
          '<b>' + esc(a.title) + '</b></div></li>';
      }).join('') + '</ul>';
  }

  // ---------------------------------------------------------------- music (demo)
  function mmss(s) { return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }
  function music() {
    var m = C.demo.music, pct = Math.round(m.elapsed / m.length * 100);
    return '<div class="gl-card-head"><span class="gl-music-tag"><i>' + App.icon('music', 16) + '</i>' + esc(t('lastPlayed')) + '</span>' + ic('external', 20) + '</div>' +
      '<div class="gl-music">' +
      '<img src="' + App.img(m.seed, 240, 240) + '" alt="">' +
      '<div class="gl-music-meta"><b>' + esc(m.title) + '</b><span>' + esc(m.artist) + '</span>' +
      '<div class="gl-progress"><i style="width:' + pct + '%"></i></div>' +
      '<div class="gl-times"><span>' + mmss(m.elapsed) + '</span><span>' + mmss(m.length) + '</span></div>' +
      '<div class="gl-controls">' + ic('shuffle', 22) + ic('prev', 22) + '<span class="gl-play">' + App.icon('pause', 22) + '</span>' + ic('next', 22) + App.icon('heart', 22) + '</div>' +
      '</div></div>';
  }

  // ---------------------------------------------------------------- football (demo)
  function match() {
    var m = C.demo.match, hm = m.time.split(':');
    var d = App.addDays(App.dayStart(App.now()), m.inDays); d.setHours(+hm[0], +hm[1], 0, 0);
    var days = Math.round((App.dayStart(d) - App.dayStart(App.now())) / 864e5);
    var when = days === 0 ? t('today') : days === 1 ? t('tomorrow') : t('inDays', { n: days });
    function crest(name, color) { return '<span class="gl-crest" style="background:' + color + '">' + esc(name) + '</span>'; }
    return '<div class="gl-card-head"><span class="gl-match-tag">' + ic('ball', 24) + esc(m.competition) + '</span><span class="gl-pill">' + esc(when) + '</span></div>' +
      '<div class="gl-match">' + crest(m.homeShort, m.homeColor) + '<b>' + esc(m.home) + '<br>vs ' + esc(m.away) + '</b>' + crest(m.awayShort, m.awayColor) + '</div>' +
      '<div class="gl-match-when">' + esc(App.fmt.dayShort(d) + ', ' + d.getDate() + ' ' + App.fmt.monthShort(d) + ' · ' + App.fmt.time(d)) + '</div>' +
      '<div class="gl-match-venue">' + esc(m.venue) + '</div>';
  }

  // ---------------------------------------------------------------- air quality (live)
  function band(v) { for (var i = 0; i < C.aqi.length; i++) if (v <= C.aqi[i].max) return i; return C.aqi.length - 1; }
  function aqi() {
    var bar = '<div class="gl-aqi-bar">' + C.aqi.map(function (b) { return '<i style="background:' + b.color + '"></i>'; }).join('');
    if (!G.aqi) return '<div class="gl-aqi-head">' + ic('leaf', 20) + '<span class="gl-aqi-cat">' + esc(t('aqiUnavailable')) + '</span></div>' + bar + '</div>';
    var v = G.aqi.value, i = band(v), lo = i ? C.aqi[i - 1].max : 0, hi = C.aqi[i].max;
    var pos = (i + Math.min(1, Math.max(0, (v - lo) / (hi - lo)))) / C.aqi.length * 100;
    return '<div class="gl-aqi-head">' + ic('leaf', 20) + '<b class="gl-aqi-val">' + esc(t('aqiValue', { n: v })) + '</b></div>' +
      '<div class="gl-aqi-cat">' + esc(C.aqi[i].label) + '</div>' +
      bar + '<b class="gl-aqi-dot" style="left:' + pos.toFixed(1) + '%"></b></div>' +
      '<p class="gl-aqi-advice">' + esc(C.aqi[i].advice) + '</p>';
  }

  // ---------------------------------------------------------------- quote of the day
  function quote() {
    var n = App.now(), day = Math.floor(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) / 864e5);
    var q = C.quotes[day % C.quotes.length];
    return '<div class="gl-quote-head"><span class="gl-quote-mark">“</span><span>' + esc(t('quoteTitle')) + '</span></div>' +
      '<figure><blockquote>' + esc(q.text) + '</blockquote><figcaption>— ' + esc(q.by) + '</figcaption></figure>';
  }
  function loadAqi() {
    var p = App.weatherPlace(), key = p.lat + ',' + p.lon;
    if (G.aqiBusy) return;
    G.aqiBusy = true; clearTimeout(G.aqiTimer);
    fetch('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=' + p.lat + '&longitude=' + p.lon + '&current=us_aqi&timezone=auto', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) {
        var v = j.current && j.current.us_aqi;
        if (v == null) throw new Error('no us_aqi');
        G.aqi = { value: Math.round(v) }; G.aqiPlace = key;
        G.aqiTimer = setTimeout(loadAqi, S.aqiRefreshMinutes * 60000);
      })
      .catch(function (e) {
        console.warn('[glass] air quality fetch failed, keeping last value:', e && e.message);
        if (G.aqiPlace !== key) G.aqi = null;       // don't show another city's value
        G.aqiTimer = setTimeout(loadAqi, 5 * 60000);
      })
      .then(function () { G.aqiBusy = false; paintPart('.gl-wx-aqi', aqi()); });
  }

  // ---------------------------------------------------------------- chores strip
  function chores() {
    var r = App.currentRoutine();
    var left = D.chores.filter(function (c) { return !c.done; }).length;
    var chips = D.chores.filter(function (c) { return c.r === r.id; }).slice(0, S.choresShown);
    return '<div class="gl-ch-sum">' + ic('checklist', 40) + '<div><span>' + esc(t('chores')) + '</span><b>' +
      esc(left ? t('choresLeft', { n: left }) : t('choresDone')) + '</b></div></div>' +
      '<div class="gl-ch-chips">' + chips.map(function (c) {
        return '<span class="gl-chip' + (c.done ? ' is-done' : '') + '"><i>' + (c.done ? App.icon('check', 16) : '') + '</i>' + esc(c.title) + '</span>';
      }).join('') + '</div>' + ic('chevron', 22);
  }

  // ---------------------------------------------------------------- build + paint
  function paintPart(sel, html) { var n = G.el && G.el.querySelector(sel); if (n) n.innerHTML = html; }
  function paintHero() {
    var h = hero();
    paintPart('.gl-date', h.date); paintPart('.gl-clock', h.clock); paintPart('.gl-greet', h.greet); paintPart('.gl-sub', h.sub);
  }
  function paintAll() {
    paintHero();
    paintPart('.gl-wx', weather()); paintPart('.gl-news-card', news()); paintPart('.gl-music-card', music());
    paintPart('.gl-match-card', match()); paintPart('.gl-quote', quote()); paintPart('.gl-chores', chores());
  }
  // Two columns, as in the design: left = clock/greeting over news; right = photos, weather, music | football,
  // quote. They're laid out independently because the left column's boxes don't line up with the right's rows.
  function build(el) {
    el.innerHTML = '<div class="gl"><div class="gl-bg"></div>' + header() +
      '<div class="gl-left">' +
      '<section class="gl-hero"><div class="gl-date"></div><div class="gl-clock"></div>' +
      '<h1 class="gl-greet"></h1><p class="gl-sub"></p></section>' +
      '<section class="gl-card gl-news-card"></section></div>' +
      '<div class="gl-right">' +
      '<section class="gl-card gl-photo">' + photoCard() + '</section>' +
      '<section class="gl-card gl-wx"></section>' +
      '<section class="gl-card gl-music-card"></section>' +
      '<section class="gl-card gl-match-card"></section>' +
      '<section class="gl-card gl-quote"></section></div>' +
      '<button class="gl-card gl-chores" data-go="tasks"></button></div>';
    el.addEventListener('click', function (e) {
      var step = e.target.closest('[data-ph]'), dot = e.target.closest('[data-ph-go]');
      if (step) { showPhoto(CAR.i + +step.dataset.ph); carouselStart(); return; }
      if (dot) { showPhoto(+dot.dataset.phGo); carouselStart(); return; }
      var g = e.target.closest('[data-go]'); if (g) App.go(g.dataset.go);
    });
    // The rail (and its clock) is hidden here, so HomeDash Controls opens only from the HomeDash logo,
    // held for settings.logoHoldSeconds. The big clock has no action, so it can't be opened by accident.
    App.hold(el.querySelector('.gl-brand'), S.logoHoldSeconds * 1000, { done: App.openDemo });
  }

  App.registerHomeLayout('glass', {
    label: 'Glass',
    controlsTip: 'Tip: press and hold the <b>' + App.esc(C.text.brand) + '</b> logo for ' + S.logoHoldSeconds + ' seconds for HomeDash controls',
    fullbleed: true,
    show: function (el) {
      G.el = el;
      if (!el.querySelector('.gl')) build(el);
      paintAll();
      CAR.list = carouselList(); showPhoto(CAR.i); carouselStart();
      var p = App.weatherPlace();
      if (G.aqiPlace !== p.lat + ',' + p.lon) loadAqi();
    },
    minute: function (n) {
      if (!G.el) return;
      paintHero();
      if (n.getMinutes() === 0) { paintPart('.gl-wx', weather()); paintPart('.gl-chores', chores()); paintPart('.gl-match-card', match()); paintPart('.gl-quote', quote()); }
    },
    resume: function () { if (G.el) carouselStart(); },
    hide: function () { carouselStop(); },
    data: function () {
      if (!G.el) return;
      paintAll();
      var p = App.weatherPlace();
      if (G.aqiPlace !== p.lat + ',' + p.lon) loadAqi();   // the city changed
    }
  });
})();
