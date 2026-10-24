// Quotes: today's quote large, category chips, then the quotes in that category. Tap one to feature it.
// Quotes come from Quotify's Google Sheet via quotes-data.js (offline: last good copy, else built-ins).
// Shown in the Glass look (shared background + top bar with "Quotes" selected) from either layout:
// the Glass top bar and the Classic sidebar both link here. Text lives in GLASS_CONFIG.text.quotesPage.
(function () {
  'use strict';
  var V = { el: null, body: null, pick: null, cat: 'all' };  // pick = featured quote's text (survives reloads)
  var esc = App.esc;
  function t(key, vals) { return App.glassText('quotesPage.' + key, vals); }

  function render() {
    var qs = App.quoteList();
    if (!qs.length) { V.body.innerHTML = '<header class="qt-head"><h1>' + esc(t('title')) + '</h1></header>'; return; }
    var today = App.quoteOfDay(), cur = today;
    if (V.pick != null) for (var i = 0; i < qs.length; i++) if (qs[i].text === V.pick) { cur = i; break; }
    var q = qs[cur], cats = App.quoteCategories();
    if (V.cat !== 'all' && !cats.some(function (c) { return c.key === V.cat; })) V.cat = 'all';
    var shown = [];
    qs.forEach(function (x, i) { if (V.cat === 'all' || x.cat === V.cat) shown.push(i); });
    // Background refreshes (weather hourly, the sheet every few hours) redraw this screen: keep the list
    // and chip strip where the viewer left them.
    var oldGrid = V.body.querySelector('.qt-grid'), oldChips = V.body.querySelector('.qt-chips');
    var keep = { grid: oldGrid ? oldGrid.scrollTop : 0, chips: oldChips ? oldChips.scrollLeft : 0 };

    V.body.innerHTML =
      '<header class="qt-head"><h1>' + esc(t('title')) + '</h1>' +
      '<span class="qt-sub">' + esc(cur === today ? t('today') : t('nth', { n: cur + 1, total: qs.length })) + '</span>' +
      (cur === today ? '' : '<button class="qt-back" data-today>' + esc(t('back')) + '</button>') + '</header>' +
      '<figure class="gl-card qt-feature q-' + App.quoteSize(q.text) + '"><span class="qt-mark">“</span>' +
      '<div><blockquote>' + esc(q.text) + '</blockquote><figcaption>— ' + esc(q.by) +
      (q.catLabel ? '<span class="qt-cat">' + esc(q.catLabel) + '</span>' : '') + '</figcaption></div></figure>' +
      (cats.length ? '<div class="qt-chips">' +
        '<button data-cat="all" class="' + (V.cat === 'all' ? 'is-on' : '') + '">' + esc(t('all')) + '<i>' + qs.length + '</i></button>' +
        cats.map(function (c) {
          return '<button data-cat="' + esc(c.key) + '" class="' + (V.cat === c.key ? 'is-on' : '') + '">' + esc(c.label) + '<i>' + c.count + '</i></button>';
        }).join('') + '</div>' : '') +
      (shown.length ? '<ul class="qt-grid">' + shown.map(function (i) {
        var x = qs[i];
        return '<li><button data-q="' + i + '" class="gl-card q-' + App.quoteSize(x.text) + (i === cur ? ' is-on' : '') + (i === today ? ' is-today' : '') + '">' +
          '<span>' + esc(x.text) + '</span><small>' + esc(x.by) + (i === today ? ' · ' + esc(t('todayTag')) : '') + '</small></button></li>';
      }).join('') + '</ul>' : '<p class="qt-empty">' + esc(t('empty')) + '</p>');
    var g = V.body.querySelector('.qt-grid'), ch = V.body.querySelector('.qt-chips');
    if (g) g.scrollTop = keep.grid;
    if (ch) ch.scrollLeft = keep.chips;
  }

  // Opening the screen: today's quote, all categories, list and chips scrolled to the start.
  function fresh() {
    V.pick = null; V.cat = 'all';
    var g = V.body.querySelector('.qt-grid'), ch = V.body.querySelector('.qt-chips');
    if (g) g.scrollTop = 0;
    if (ch) ch.scrollLeft = 0;
    render();
  }

  App.register('quotes', {
    fullbleed: function () { return true; },   // Glass top bar instead of the sidebar
    show: function (el) {
      if (!V.el) {
        V.el = el;
        el.innerHTML = '<div class="gl gl--page">' + App.glassChrome.html('quotes') + '<main class="qt"></main></div>';
        V.body = el.querySelector('.qt');
        App.glassChrome.wire(el);
        V.body.addEventListener('click', function (e) {
          var b = e.target.closest('[data-q]'), c = e.target.closest('[data-cat]');
          if (e.target.closest('[data-today]')) { V.pick = null; render(); return; }
          if (b) { V.pick = App.quoteList()[+b.dataset.q].text; render(); return; }
          if (c) {
            V.cat = c.dataset.cat; render();
            var grid = V.body.querySelector('.qt-grid'); if (grid) grid.scrollTop = 0;   // new category: top of list
          }
        });
      }
      fresh();
    },
    // Coming back to an already-built screen calls resume, not show: start on today's quote again.
    resume: function () { fresh(); }
  });
  // New quotes from the sheet, or a new day: redraw if the screen is showing (keeps the chosen quote/category).
  App.on('data', function () { if (V.el && App.current === 'quotes') render(); });
  App.on('minute', function (n) { if (V.el && App.current === 'quotes' && n.getHours() === 0 && n.getMinutes() === 0) render(); });
})();
