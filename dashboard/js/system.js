// Alerts (takeovers, banners, notices) + the hidden demo drawer.
(function () {
  'use strict';
  var D = window.DATA, $ = App.$;

  function img(seed, w, h) { return 'https://picsum.photos/seed/' + seed + '/' + w + '/' + h; }
  App.img = img;

  // ------------------------------------------------------------ full-screen takeovers
  function takeover(html, cls) {
    var el = $('#takeover');
    el.className = 'takeover ' + (cls || '');
    el.innerHTML = html;
    el.classList.add('is-open');
    App.closeSheet();
    if (App.mode !== 'day') App.setMode('day');
    return el;
  }
  function closeTakeover() {
    var el = $('#takeover');
    el.classList.remove('is-open');
    el.innerHTML = '';
  }
  App.closeTakeover = closeTakeover;

  var doorbellTimer;
  App.doorbell = function () {
    var now = App.now();
    var el = takeover(
      '<div class="tk-cam"><img src="' + img('visitor-porch', 1280, 800) + '" alt=""><span class="tk-live"><i></i>LIVE · Front Porch</span></div>' +
      '<div class="tk-door">' +
      '  <div class="label label--light">' + App.icon('bell', 20) + ' Doorbell · ' + App.fmt.time(now) + '</div>' +
      '  <h1 class="serif tk-title">Someone’s at<br>the front door</h1>' +
      '  <div class="tk-actions">' +
      '    <button class="tk-btn" data-talk>' + App.icon('mic', 30) + '<span>Talk</span></button>' +
      '    <button class="tk-btn tk-btn--hold" data-unlock>' + App.icon('unlock', 30) + '<span>Hold to unlock</span></button>' +
      '    <button class="tk-btn tk-btn--solid" data-dismiss>' + App.icon('x', 30) + '<span>Dismiss</span></button>' +
      '  </div>' +
      '</div>', 'takeover--door');
    el.querySelector('[data-dismiss]').onclick = function () { clearTimeout(doorbellTimer); closeTakeover(); };
    el.querySelector('[data-talk]').onclick = function () {
      this.classList.toggle('is-on');
      this.querySelector('span').textContent = this.classList.contains('is-on') ? 'Talking…' : 'Talk';
    };
    var u = el.querySelector('[data-unlock]');
    App.hold(u, 1000, {
      done: function () {
        App.setDevice('e-door', { locked: false });
        u.classList.add('is-on');
        u.querySelector('span').textContent = 'Unlocked';
        App.toast('Front door unlocked · relocks in 2 min', { icon: 'unlock' });
      },
      cancel: function () { App.toast('Keep holding to unlock', { ms: 2000, icon: 'lock' }); }
    });
    clearTimeout(doorbellTimer);
    doorbellTimer = setTimeout(closeTakeover, 45000);
  };

  App.leak = function () {
    var now = App.now();
    var el = takeover(
      '<div class="tk-alarm">' +
      '  <div class="tk-alarm-icon">' + App.icon('drop', 88) + '</div>' +
      '  <div class="label label--light">Critical alert · ' + App.fmt.time(now) + '</div>' +
      '  <h1 class="tk-huge">Water leak</h1>' +
      '  <p class="tk-sub">Laundry room sensor detected water on the floor.</p>' +
      '  <div class="tk-actions">' +
      '    <button class="tk-btn tk-btn--hold tk-btn--light" data-valve>' + App.icon('drop', 30) + '<span>Hold to shut off water</span></button>' +
      '    <button class="tk-btn tk-btn--solid tk-btn--light" data-ack>' + App.icon('check', 30) + '<span>Acknowledge</span></button>' +
      '  </div>' +
      '</div>', 'takeover--alarm');
    var v = el.querySelector('[data-valve]');
    App.hold(v, 1200, {
      done: function () { v.classList.add('is-on'); v.querySelector('span').textContent = 'Water main closed'; },
      cancel: function () { App.toast('Keep holding to shut off the water main', { ms: 2000, icon: 'drop' }); }
    });
    el.querySelector('[data-ack]').onclick = function () {
      closeTakeover();
      App.toast('Leak acknowledged by the kitchen display', { icon: 'check' });
    };
  };

  // ------------------------------------------------------------ banners (amber, actionable)
  App.banner = function (opts) {
    var box = $('#banners');
    var b = document.createElement('div');
    b.className = 'banner banner--' + (opts.tone || 'amber');
    b.innerHTML = App.icon(opts.icon || 'bell', 30) + '<div class="banner-text"><b>' + opts.title + '</b><span>' + (opts.sub || '') + '</span></div>' +
      (opts.action ? '<button class="banner-btn banner-btn--solid" data-act>' + opts.action + '</button>' : '') +
      '<button class="banner-btn" data-x>' + (opts.dismiss || 'Dismiss') + '</button>';
    box.appendChild(b);
    b.classList.add('is-in');
    function kill() { b.remove(); }
    b.querySelector('[data-x]').onclick = kill;
    if (opts.action) b.querySelector('[data-act]').onclick = function () { kill(); opts.onAction(); };
    if (opts.ms) setTimeout(kill, opts.ms);
    return kill;
  };

  App.garageOpenAlert = function () {
    App.setDevice('g-door', { state: 'open' });
    App.banner({
      icon: 'garage', title: 'Garage open for 15 min', sub: 'No one is in the garage · Wes is 12 min away',
      action: 'Close garage', dismiss: 'Leave open',
      onAction: function () { App.openGarageSheet(); }
    });
  };

  App.packageNotice = function () {
    App.banner({
      tone: 'ink', icon: 'box', title: 'Package delivered', sub: 'Front porch · ' + App.fmt.time(App.now()),
      action: 'View camera', dismiss: 'OK', ms: 9000,
      onAction: function () { App.cameraSheet(D.cameras[0]); }
    });
  };

  // ------------------------------------------------------------ HomeDash controls (press and hold the clock)
  // The Alerts and Calendar data sections are kept for testing but hidden; set this to true to show them.
  var SHOW_TEST_SECTIONS = false;
  function demoHTML() {
    var t = App.now();
    return '<div class="demo-panel">' +
      '<div class="demo-head"><h2 class="serif">HomeDash Controls</h2><button class="demo-x" data-demo-close>' + App.icon('x', 28) + '</button></div>' +
      '<div class="demo-sec"><div class="label label--light">Clock format</div><div class="demo-grid">' +
      '<button data-clock="12" class="' + (App.clock24 ? '' : 'is-on') + '">12-hour · ' + (t.getHours() % 12 || 12) + ':' + (t.getMinutes() < 10 ? '0' : '') + t.getMinutes() + (t.getHours() >= 12 ? ' PM' : ' AM') + '</button>' +
      '<button data-clock="24" class="' + (App.clock24 ? 'is-on' : '') + '">24-hour · ' + (t.getHours() < 10 ? '0' : '') + t.getHours() + ':' + (t.getMinutes() < 10 ? '0' : '') + t.getMinutes() + '</button></div></div>' +
      '<div class="demo-sec"><div class="label label--light">Layout</div><div class="demo-grid">' +
      App.homeLayoutList().map(function (l) {
        return '<button data-layout="' + l.name + '" class="' + (App.homeLayout() === l.name ? 'is-on' : '') + '">' + App.esc(l.label) + '</button>';
      }).join('') + '</div></div>' +
      locationHTML() +
      '<div class="demo-sec"><div class="label label--light">Modes</div><div class="demo-grid">' +
      '<button data-mode="ambient">Ambient</button><button data-mode="night">Night</button></div></div>' +
      (SHOW_TEST_SECTIONS ? testSectionsHTML() : '') +
      '<p class="demo-note">Keyboard: <b>D</b> controls · <b>A</b> ambient · <b>N</b> night · <b>1–7</b> views</p>' +
      '</div>';
  }
  // ------------------------------------------------------------ weather location (city search)
  // State survives the panel being re-rendered. Text comes from WEATHER_CONFIG.location.
  var LOC = { query: '', results: null, status: '', error: false, busy: false, seq: 0 };
  function lt(key, vals) { return App.wxText('location.' + key, vals); }
  function locationHTML() {
    var cur = App.weatherPlace(), def = App.weatherDefaultPlace();
    var isDefault = Math.abs(cur.lat - def.lat) < 1e-4 && Math.abs(cur.lon - def.lon) < 1e-4;
    return '<div class="demo-sec loc"><div class="label label--light">' + App.esc(lt('title')) + '</div>' +
      '<div class="loc-now">' + App.esc(lt('showing', { place: App.placeLabel(cur) })) + '</div>' +
      '<form class="loc-form" data-loc-form>' +
      '<input class="loc-input" type="text" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="search" data-loc-input' +
      ' placeholder="' + App.esc(lt('placeholder')) + '" value="' + App.esc(LOC.query) + '"' + (LOC.busy ? ' disabled' : '') + '>' +
      '<button type="submit" class="loc-go"' + (LOC.busy ? ' disabled' : '') + '>' + App.esc(lt('search')) + '</button></form>' +
      (LOC.status ? '<p class="loc-status' + (LOC.error ? ' is-error' : '') + '">' + App.esc(LOC.status) + '</p>' : '') +
      (LOC.results && LOC.results.length ? '<div class="loc-results">' + LOC.results.map(function (r, i) {
        return '<button data-loc-pick="' + i + '"' + (LOC.busy ? ' disabled' : '') + '><b>' + App.esc(r.name) + '</b><span>' +
          App.esc([r.region, r.country].filter(Boolean).join(', ')) + '</span></button>';
      }).join('') + '</div>' : '') +
      (isDefault ? '' : '<button class="loc-reset" data-loc-reset' + (LOC.busy ? ' disabled' : '') + '>' + App.esc(lt('reset', { place: def.name })) + '</button>') +
      '</div>';
  }
  function locRefresh() { if ($('#demo').classList.contains('is-open')) App.openDemo(); }
  function locSearch() {
    var q = LOC.query.trim();
    if (!q || LOC.busy) return;
    var my = ++LOC.seq;
    LOC.busy = true; LOC.results = null; LOC.status = lt('searching'); LOC.error = false; locRefresh();
    App.searchPlaces(q).then(function (list) {
      if (my !== LOC.seq) return;
      LOC.results = list;
      LOC.status = list.length ? lt('pickOne') : lt('noResults', { query: q });
      LOC.error = !list.length;
    }, function () {
      if (my !== LOC.seq) return;
      LOC.status = lt('searchFailed'); LOC.error = true;
    }).then(function () { if (my === LOC.seq) { LOC.busy = false; locRefresh(); } });
  }
  function locUse(place) {
    var my = ++LOC.seq, current = App.placeLabel(App.weatherPlace()), label = App.placeLabel(place);
    LOC.busy = true; LOC.status = lt('loading', { place: label }); LOC.error = false; locRefresh();
    App.setWeatherPlace(place).then(function () {
      if (my !== LOC.seq) return;
      LOC.results = null; LOC.query = ''; LOC.status = lt('switched', { place: label }); LOC.error = false;
      App.toast(App.esc(lt('switched', { place: place.name })), { ms: 3000 });
    }, function () {
      if (my !== LOC.seq) return;
      LOC.status = lt('switchFailed', { place: label, current: current }); LOC.error = true;
    }).then(function () { if (my === LOC.seq) { LOC.busy = false; locRefresh(); } });
  }

  function testSectionsHTML() {
    return '<div class="demo-sec"><div class="label label--light">Alerts</div><div class="demo-grid">' +
      '<button data-alert="doorbell">Doorbell</button><button data-alert="leak">Water leak</button><button data-alert="garage">Garage open</button><button data-alert="package">Package</button></div></div>' +
      '<div class="demo-sec"><div class="label label--light">Calendar data</div><div class="demo-grid">' +
      ['normal', 'empty', 'busy'].map(function (m) {
        return '<button data-cal="' + m + '" class="' + (App.calMode === m ? 'is-on' : '') + '">' + { normal: 'Normal day', empty: 'Empty day', busy: 'Overloaded' }[m] + '</button>';
      }).join('') + '</div></div>';
  }
  App.openDemo = function () {
    var el = $('#demo');
    el.innerHTML = demoHTML();
    el.classList.add('is-open');
  };
  function closeDemo() { $('#demo').classList.remove('is-open'); }

  function demoClick(e) {
    var b = e.target.closest('button');
    if (!b) { if (e.target === $('#demo')) closeDemo(); return; }
    if (b.hasAttribute('data-demo-close')) return closeDemo();
    if (b.dataset.clock) {
      App.setClock24(b.dataset.clock === '24');
      App.openDemo();
      App.toast('Clock set to <b>' + b.dataset.clock + '-hour</b>', { ms: 2500 });
      return;
    }
    if (b.dataset.layout) {
      var lay = App.homeLayoutList().filter(function (l) { return l.name === b.dataset.layout; })[0];
      App.setHomeLayout(b.dataset.layout);   // saved on this device; rebuilds Today if it's showing
      App.openDemo();
      if (lay) App.toast('Layout set to <b>' + App.esc(lay.label) + '</b>', { ms: 2500 });
      return;
    }
    if (b.dataset.locPick != null) { if (LOC.results && LOC.results[+b.dataset.locPick]) locUse(LOC.results[+b.dataset.locPick]); return; }
    if (b.hasAttribute('data-loc-reset')) { LOC.results = null; locUse(App.weatherDefaultPlace()); return; }
    if (b.dataset.mode) { closeDemo(); App.setMode(b.dataset.mode); return; }
    if (b.dataset.alert) {
      closeDemo();
      ({ doorbell: App.doorbell, leak: App.leak, garage: App.garageOpenAlert, package: App.packageNotice })[b.dataset.alert]();
      return;
    }
    if (b.dataset.cal) { App.calMode = b.dataset.cal; App.rerender(); App.openDemo(); }
  }

  App.on('ready', function () {
    $('#demo').addEventListener('click', demoClick);
    $('#demo').addEventListener('submit', function (e) {
      if (!e.target.hasAttribute('data-loc-form')) return;
      e.preventDefault();
      var input = e.target.querySelector('[data-loc-input]');
      if (input) { LOC.query = input.value; input.blur(); }
      locSearch();
    });
    $('#demo').addEventListener('input', function (e) { if (e.target.hasAttribute('data-loc-input')) LOC.query = e.target.value; });
    App.hold($('#railClock'), 700, { done: App.openDemo });
    document.addEventListener('keydown', function (e) {
      // Never treat typing as shortcuts: skip form fields, and while HomeDash Controls is open (it has the
      // city box) allow only Escape. On the frame, typing "Chennai" otherwise switched to Ambient mode.
      if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
      var k = (e.key || '').toLowerCase();
      if ($('#demo').classList.contains('is-open') && k !== 'escape') return;
      if (k === 'd') { $('#demo').classList.contains('is-open') ? closeDemo() : App.openDemo(); }
      if (k === 'a') App.setMode('ambient');
      if (k === 'n') App.setMode('night');
      if (k === 'escape') { closeDemo(); App.closeSheet(); }
      var views = ['home', 'calendar', 'tasks', 'shopping', 'photos', 'control', 'agents'];
      if (k >= '1' && k <= '7') App.go(views[+k - 1]);
    });
  });
})();
