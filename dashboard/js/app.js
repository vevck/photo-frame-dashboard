// Core shell: router, demo clock, idle/ambient, toasts, sheets, helpers.
(function () {
  'use strict';
  var D = window.DATA;
  var App = window.App = { state: D, views: {}, current: null, mode: 'day', calMode: 'normal' };
  var $ = App.$ = function (s, r) { return (r || document).querySelector(s); };
  App.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ------------------------------------------------------------ events
  var handlers = {};
  App.on = function (e, fn) { (handlers[e] = handlers[e] || []).push(fn); };
  App.emit = function (e, a) { (handlers[e] || []).forEach(function (fn) { fn(a); }); };

  // ------------------------------------------------------------ time (demo clock)
  var offset = 0;
  App.now = function () { return new Date(Date.now() + offset); };
  App.setTime = function (h, m) {
    if (h == null) offset = 0;
    else { var d = new Date(); d.setHours(h, m, 0, 0); offset = d - Date.now(); }
    lastMin = -1;
    App.emit('time');
    App.rerender();
  };

  // ------------------------------------------------------------ clock format (12/24-hour)
  // Saved per device in localStorage, so the frame keeps its choice across reloads and reboots.
  var CLOCK_KEY = 'homehq.clock24';
  App.clock24 = false;
  try { App.clock24 = localStorage.getItem(CLOCK_KEY) === '1'; } catch (e) {}
  App.setClock24 = function (on) {
    App.clock24 = !!on;
    try { localStorage.setItem(CLOCK_KEY, App.clock24 ? '1' : '0'); } catch (e) {}
    lastMin = -1;
    App.emit('time');
    App.rerender();
    tick(); // redraw the sidebar clock now rather than on the next second
  };
  App.dayStart = function (d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  App.addDays = function (d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; };
  App.sameDay = function (a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); };
  App.isNight = function () { var h = App.now().getHours(); return h >= 22 || h < 6; };

  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  App.fmt = {
    // "3:45 PM" / "3:45" (ampm false); 24-hour: "15:45" either way
    time: function (d, ampm) {
      var h = d.getHours(), m = d.getMinutes(), mm = (m < 10 ? '0' : '') + m;
      if (App.clock24) return (h < 10 ? '0' : '') + h + ':' + mm;
      var s = (h % 12 || 12) + ':' + mm;
      return ampm === false ? s : s + ' ' + (h >= 12 ? 'PM' : 'AM');
    },
    // "4 PM", "3:45 PM"; 24-hour: "16:00", "15:45"
    hour: function (d) {
      var h = d.getHours(), m = d.getMinutes();
      if (App.clock24) return App.fmt.time(d);
      return (h % 12 || 12) + (m ? ':' + (m < 10 ? '0' : '') + m : '') + ' ' + (h >= 12 ? 'PM' : 'AM');
    },
    // Compact hour label for axes and hourly strips: "4p" / "4 PM"; 24-hour: "16"
    hourLabel: function (h, long) {
      if (App.clock24) return (h < 10 ? '0' : '') + h + (long ? ':00' : '');
      return (h % 12 || 12) + (long ? (h < 12 ? ' AM' : ' PM') : (h >= 12 ? 'p' : 'a'));
    },
    // "" in 24-hour mode, so callers that print it separately show nothing
    ampm: function (d) { return App.clock24 ? '' : d.getHours() >= 12 ? 'PM' : 'AM'; },
    range: function (a, b) {
      if (App.clock24) return App.fmt.time(a) + ' – ' + App.fmt.time(b);
      var same = App.fmt.ampm(a) === App.fmt.ampm(b);
      return (same ? App.fmt.time(a, false) : App.fmt.time(a)) + ' – ' + App.fmt.time(b);
    },
    day: function (d) { return DAYS[d.getDay()]; },
    dayShort: function (d) { return DAYS[d.getDay()].slice(0, 3); },
    month: function (d) { return MONTHS[d.getMonth()]; },
    monthShort: function (d) { return MON_SHORT[d.getMonth()]; },
    mins: function (m) {
      m = Math.max(0, Math.round(m));
      if (m < 60) return m + ' min';
      var h = Math.floor(m / 60), r = m % 60;
      return h + ' hr' + (r ? ' ' + r + ' min' : '');
    },
    rel: function (d) {
      var t = App.dayStart(App.now()), x = App.dayStart(d), diff = Math.round((x - t) / 864e5);
      if (diff === 0) return 'Today';
      if (diff === 1) return 'Tomorrow';
      if (diff === -1) return 'Yesterday';
      return DAYS[d.getDay()];
    }
  };
  App.esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // ------------------------------------------------------------ icons + people
  App.icon = function (name, size, cls) {
    size = size || 24;
    return '<svg class="i ' + (cls || '') + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (window.ICONS[name] || '') + '</svg>';
  };
  App.person = function (id) {
    if (id === 'family' || id === 'any') return D.family;
    for (var i = 0; i < D.people.length; i++) if (D.people[i].id === id) return D.people[i];
    return D.family;
  };
  App.pstyle = function (p) {
    if (typeof p === 'string') p = App.person(p);
    return '--c:' + p.color + ';--c-rgb:' + p.rgb + ';--c-ink:' + p.ink;
  };
  App.avatar = function (p, size, cls) {
    if (typeof p === 'string') p = App.person(p);
    size = size || 48;
    return '<span class="avatar ' + (cls || '') + '" style="' + App.pstyle(p) + ';width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * 0.46) + 'px">' + (p.id === 'family' ? '★' : p.name[0]) + '</span>';
  };
  App.dots = function (ids, size) {
    return '<span class="dots">' + ids.map(function (id) { return '<i style="' + App.pstyle(id) + (size ? ';width:' + size + 'px;height:' + size + 'px' : '') + '"></i>'; }).join('') + '</span>';
  };

  // ------------------------------------------------------------ calendar helpers
  App.events = function () {
    var list = D.events.slice();
    var today = App.dayStart(App.now());
    if (App.calMode === 'busy') list = list.concat(D.busyExtras);
    if (App.calMode === 'empty') list = list.filter(function (e) { return e.allDay || !App.sameDay(e.start, today); });
    return list;
  };
  App.isFamily = function (e) { return e.people.length >= D.people.length; };
  App.evColor = function (e) { return App.isFamily(e) ? D.family : App.person(e.people[0]); };
  App.timedOn = function (day, pid) {
    var s = App.dayStart(day), e = App.addDays(s, 1);
    return App.events().filter(function (ev) {
      return !ev.allDay && ev.start < e && ev.end > s && (!pid || ev.people.indexOf(pid) > -1);
    }).sort(function (a, b) { return a.start - b.start || b.end - a.end; });
  };
  App.allDayOn = function (day, pid) {
    var s = App.dayStart(day), e = App.addDays(s, 1);
    return App.events().filter(function (ev) {
      return ev.allDay && ev.start < e && ev.end > s && (!pid || ev.people.indexOf(pid) > -1);
    });
  };
  App.leaveBy = function (e) { return e.travel ? new Date(+e.start - e.travel * 60000) : e.start; };
  // The next thing someone needs to act on: earliest upcoming "leave by" today.
  App.nextEvent = function () {
    var now = App.now();
    var list = App.timedOn(now).filter(function (e) { return e.start > now; });
    list.sort(function (a, b) { return App.leaveBy(a) - App.leaveBy(b); });
    return list[0] || null;
  };
  App.findEvent = function (id) {
    return App.events().filter(function (e) { return e.id === id; })[0];
  };

  // ------------------------------------------------------------ chores + weather helpers
  App.currentRoutine = function () {
    var h = App.now().getHours();
    for (var i = 0; i < D.routines.length; i++) if (h >= D.routines[i].from && h < D.routines[i].to) return D.routines[i];
    return D.routines[2];
  };
  // Weather is a timeline of real hours (see weather.js), so lookups go by timestamp, not hour of day:
  // the hourly strip runs on into tomorrow after midnight and the rain check looks past 11 PM.
  // All weather text and thresholds come from weather-config.js.
  var WXC = window.WEATHER_CONFIG;
  // Weather text by "section.key", with {placeholders} filled from vals: App.wxText('summary.rainFrom', { time: '4 PM' })
  App.wxText = function (path, vals) {
    var p = path.split('.'), s = WXC[p[0]] && WXC[p[0]][p[1]];
    if (s == null) return path;
    return String(s).replace(/\{(\w+)\}/g, function (m, k) { return vals && vals[k] != null ? vals[k] : m; });
  };
  // Label for an hour: by key, falling back to text stored by older cached forecasts.
  function wxLabel(h) { return (h.k && WXC.conditions[h.k]) || h.l || ''; }
  function wxIndex() {
    var hrs = D.weather.hours, now = App.now().getTime();
    for (var i = hrs.length - 1; i >= 0; i--) if (hrs[i].at <= now) return i;
    return 0;
  }
  function atHour(h) {
    var d = new Date(h.at), today = App.dayStart(App.now());
    var s = App.fmt.hour(d);
    if (App.sameDay(d, today)) return s;
    return App.sameDay(d, App.addDays(today, 1)) ? App.wxText('when.tomorrow', { time: s }) : App.wxText('when.otherDay', { day: App.fmt.dayShort(d), time: s });
  }
  // Night is between today's sunset and sunrise. Demo data has no sun times, so it falls back to fixed hours.
  function isNight(W) {
    var now = App.now(), t = now.getTime();
    if (W.sunrise && W.sunset) return t < W.sunrise || t >= W.sunset;
    var N = WXC.settings.fallbackNight, h = now.getHours();
    return h >= N.from || h < N.to;
  }
  App.weatherNow = function () {
    var W = D.weather, S = WXC.settings, hrs = W.hours, i0 = wxIndex(), cur = hrs[i0];
    var end = Math.min(hrs.length, i0 + S.rainLookaheadHours + 1), rainAt = -1;
    for (var i = i0; i < end; i++) if (hrs[i].p >= S.rainChancePct) { rainAt = i; break; }
    var summary, advice, cool = cur.t < S.coolBelowC;
    if (rainAt === i0) {
      var stop = i0; while (stop < hrs.length && hrs[stop].p >= S.rainChancePct) stop++;
      summary = stop < hrs.length ? App.wxText('summary.rainUntil', { time: atHour(hrs[stop]) }) : App.wxText('summary.rainForAWhile');
      advice = App.wxText('advice.umbrella');
    } else if (rainAt > -1) {
      summary = App.wxText('summary.rainFrom', { time: atHour(hrs[rainAt]) });
      advice = App.wxText('advice.rainJacket');
    } else {
      summary = App.wxText(cool ? 'summary.clearAndCool' : isNight(W) ? 'summary.dryTonight' : 'summary.dryAllDay');
      advice = App.wxText(cool ? 'advice.jacket' : 'advice.lightLayers');
    }
    var ageMin = W.updated ? Math.round((Date.now() - W.updated) / 60000) : null;
    return { temp: cur.t, cond: cur.c, label: wxLabel(cur), hi: W.hi, lo: W.lo, summary: summary, advice: advice, hour: new Date(cur.at).getHours(),
      place: W.place ? W.place.name : '', live: W.live, ageMin: ageMin, stale: ageMin != null && ageMin > S.staleAfterMinutes, night: isNight(W),
      sunrise: W.sunrise ? new Date(W.sunrise) : null, sunset: W.sunset ? new Date(W.sunset) : null };
  };
  App.hourly = function (count) {
    var hrs = D.weather.hours, i0 = wxIndex(), out = [];
    for (var i = i0; i < hrs.length && out.length < count; i++) {
      var x = new Date(hrs[i].at).getHours();
      out.push({ h: x, t: hrs[i].t, c: hrs[i].c, p: hrs[i].p, label: i === i0 ? App.wxText('display.now') : App.fmt.hourLabel(x) });
    }
    return out;
  };

  // ------------------------------------------------------------ router
  App.register = function (name, view) { App.views[name] = view; };
  // Views are built once and kept laid out (hidden with content-visibility), so switching tabs
  // only has to paint. A view is rebuilt when its data changed ('data'/'time' events) or, for
  // time-sensitive views (minutely: true), when the minute has rolled over since it was built.
  function minuteKey() { return Math.floor(App.now().getTime() / 60000); }
  function build(name, opts) {
    var view = App.views[name];
    view.show($('#view-' + name), opts || {});
    view._built = true; view._dirty = false; view._min = minuteKey();
  }
  App.go = function (name, opts) {
    opts = opts || {};
    if (!App.views[name]) name = 'home';
    if (App.current && App.current !== name && App.views[App.current].hide) App.views[App.current].hide();
    App.$$('.view').forEach(function (v) { v.classList.toggle('is-active', v.dataset.view === name); });
    App.$$('.rail-item').forEach(function (b) { b.classList.toggle('is-active', b.dataset.go === name); });
    App.current = name;
    var view = App.views[name];
    // A view may take the whole stage (no rail), e.g. a full-bleed Today layout.
    $('#stage').classList.toggle('is-fullbleed', !!(view.fullbleed && view.fullbleed()));
    if (!view._built || view._dirty || opts.rerender || (view.minutely && view._min !== minuteKey())) build(name, opts);
    else if (view.resume) view.resume($('#view-' + name));
    if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
  };
  // Build a hidden view and lay it out now (cached by content-visibility; no paint happens).
  function prebuild(name) {
    var el = $('#view-' + name), view = App.views[name];
    build(name);
    if (view.hide) view.hide();
    el.classList.add('is-warming');
    el.offsetHeight;
    el.classList.remove('is-warming');
  }
  // Pre-build (startup) and re-build (after data changes) hidden views in the background, one per
  // slot, so navigating to them never pays the rebuild cost.
  var refreshTimer = null;
  function refreshStale(delay) {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function next() {
      var name = Object.keys(App.views).filter(function (k) {
        var v = App.views[k];
        return k !== App.current && (!v._built || v._dirty);
      })[0];
      if (!name) return;
      prebuild(name);
      refreshTimer = setTimeout(next, 400);
    }, delay);
  }
  function markStale() {
    Object.keys(App.views).forEach(function (k) { if (k !== App.current) App.views[k]._dirty = true; });
    refreshStale(1500);
  }
  App.on('data', markStale);
  App.on('time', markStale);
  App.rerender = function () {
    if (App.current) App.views[App.current].show($('#view-' + App.current), { rerender: true });
  };

  // ------------------------------------------------------------ toasts (single, with undo)
  var toastTimer;
  App.toast = function (html, opts) {
    opts = opts || {};
    var box = $('#toasts');
    box.innerHTML = '';
    clearTimeout(toastTimer);
    var ms = opts.ms || 5000;
    var t = document.createElement('div');
    t.className = 'toast' + (opts.tone ? ' toast--' + opts.tone : '');
    t.style.setProperty('--ms', ms + 'ms');
    t.innerHTML = (opts.icon ? App.icon(opts.icon, 26) : '') + '<span class="toast-msg">' + html + '</span>' +
      (opts.undo ? '<button class="toast-undo">' + App.icon('undo', 22) + 'Undo</button>' : '');
    box.appendChild(t);
    t.classList.add('is-in');
    function kill() { t.remove(); }
    toastTimer = setTimeout(kill, ms);
    if (opts.undo) t.querySelector('.toast-undo').addEventListener('click', function () { clearTimeout(toastTimer); opts.undo(); kill(); });
  };

  // ------------------------------------------------------------ sheets (modal cards)
  App.sheet = function (html, opts) {
    opts = opts || {};
    var layer = $('#sheetLayer');
    layer.innerHTML = '<div class="sheet-scrim"></div><div class="sheet ' + (opts.cls || '') + '">' +
      '<button class="sheet-x" data-close aria-label="Close">' + App.icon('x', 28) + '</button>' + html + '</div>';
    layer.classList.add('is-open');
    function close() {
      if (!layer.classList.contains('is-open')) return;
      layer.classList.remove('is-open');
      if (opts.onClose) opts.onClose();
      layer.innerHTML = '';
    }
    App.closeSheet = close;
    layer.querySelector('.sheet-scrim').addEventListener('click', close);
    App.$$('[data-close]', layer).forEach(function (b) { b.addEventListener('click', close); });
    if (opts.onMount) opts.onMount(layer.querySelector('.sheet'), close);
    return close;
  };
  App.closeSheet = function () {};

  // Stage-local coordinates for an element's center (stage may be scaled on desktop)
  App.centerOf = function (el) {
    var stage = $('#stage').getBoundingClientRect(), r = el.getBoundingClientRect(), k = stage.width / 1280;
    return { x: (r.left + r.width / 2 - stage.left) / k, y: (r.top + r.height / 2 - stage.top) / k };
  };

  // ------------------------------------------------------------ press-and-hold
  App.hold = function (el, ms, cb) {
    var t = null;
    el.style.setProperty('--hold', ms + 'ms');
    el.addEventListener('pointerdown', function () {
      if (cb.enabled && !cb.enabled()) return;
      el.classList.add('is-holding');
      t = setTimeout(function () { t = null; el.classList.remove('is-holding'); cb.done(); }, ms);
    });
    function cancel(e) {
      if (!t) return;
      clearTimeout(t); t = null;
      el.classList.remove('is-holding');
      if (cb.cancel && e.type === 'pointerup') cb.cancel();
    }
    el.addEventListener('pointerup', cancel);
    el.addEventListener('pointerleave', cancel);
    el.addEventListener('pointercancel', cancel);
  };

  // ------------------------------------------------------------ modes: day / ambient / night
  App.setMode = function (m) {
    var stage = $('#stage');
    App.mode = m;
    stage.dataset.mode = m;
    App.emit('mode', m);
  };

  // ------------------------------------------------------------ idle
  App.idle = { home: 60, ambient: 120 };
  var idleSec = 0;
  function onIdleTick() {
    idleSec++;
    var blocked = $('#takeover').classList.contains('is-open');
    if (App.mode === 'nightdash' && idleSec >= 20) { App.setMode('night'); return; }
    if (App.mode !== 'day' || blocked) return;
    if (idleSec === App.idle.home && App.current !== 'home') { App.closeSheet(); App.go('home'); }
    if (idleSec >= App.idle.ambient) {
      App.closeSheet();
      App.go('home');
      App.setMode(App.isNight() ? 'night' : 'ambient');
    }
  }
  App.resetIdle = function () { idleSec = 0; };

  // ------------------------------------------------------------ stage scaling (desktop preview only)
  function fit() {
    var s = Math.min(window.innerWidth / 1280, window.innerHeight / 800);
    $('#stage').style.transform = Math.abs(s - 1) < 0.01 ? '' : 'scale(' + s + ')';
  }

  // ------------------------------------------------------------ clock tick
  var lastMin = -1;
  function tick() {
    var n = App.now();
    App.emit('second', n);
    if (n.getMinutes() !== lastMin) {
      lastMin = n.getMinutes();
      $('#railClock').innerHTML = '<b>' + App.fmt.time(n, false) + '</b><span>' + App.fmt.ampm(n) + '</span>';
      App.emit('minute', n);
    }
    onIdleTick();
  }

  // ------------------------------------------------------------ boot
  App.start = function () {
    App.setTime(null); // real time from the device clock (demo times stay in the clock's hold menu)
    fit();
    window.addEventListener('resize', fit);
    // Switch tabs the instant a finger lands (pointerdown), not on release. Keyboard "clicks"
    // (detail === 0) still work.
    $('#rail').addEventListener('pointerdown', function (e) {
      var b = e.target.closest('[data-go]');
      if (b && e.button === 0) App.go(b.dataset.go);
    });
    $('#rail').addEventListener('click', function (e) {
      var b = e.target.closest('[data-go]');
      if (b && e.detail === 0) App.go(b.dataset.go);
    });
    document.addEventListener('pointerdown', App.resetIdle, true);
    window.addEventListener('hashchange', function () { App.go(location.hash.slice(1)); });
    App.go(location.hash.slice(1) || 'home');
    tick();
    setInterval(tick, 1000);
    App.emit('ready');
    refreshStale(1500);
    setTimeout(function () { var L = App.activeHomeLayout && App.activeHomeLayout(); App.toast((L && L.controlsTip) || 'Tip: press and hold the <b>clock</b> for HomeDash controls', { ms: 6000, icon: 'bolt' }); }, 1200);
  };
  document.addEventListener('DOMContentLoaded', function () { App.start(); });
})();
