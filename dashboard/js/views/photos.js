// Photos: full-bleed editorial slideshow with layout modes.
// Shows the Google Photos album set from the gear (js/photo-album.js), or the demo photos when none is set.
(function () {
  'use strict';
  var V = { el: null, show: null, layout: 'auto', loud: false };
  var LAYOUTS = [['auto', 'Auto'], ['cover', 'Cover'], ['pair', 'Pair'], ['collage', 'Collage'], ['polaroid', 'Polaroid']];
  // Album panel state survives the panel being re-rendered. list: [{ name }] from photo-config.json.
  var AL = { list: null, listError: '', pending: '', status: '', error: false, seq: 0 };

  function heart() {
    var s = V.show && V.show.current, on = s && s.photos[0].fav;
    var b = V.el.querySelector('[data-fav]');
    b.classList.toggle('is-on', !!on);
    b.querySelector('span').textContent = on ? 'Favourite' : 'Favourite';
  }

  // ------------------------------------------------------------ album panel (gear, top right)
  function showing() {
    var a = App.photoAlbum();
    if (!a.name) return 'Showing the sample photos';
    if (!a.photos) return 'Loading “' + a.name + '”…';
    return 'Showing ' + a.photos.length + (a.photos.length === 1 ? ' photo' : ' photos') + ' from “' + a.name + '”';
  }
  function choice(name, label, sub) {
    var on = name === App.photoAlbum().name, busy = !!AL.pending;
    return '<button data-album-pick="' + App.esc(name) + '" class="' + (on ? 'is-on' : '') + '"' + (busy ? ' disabled' : '') + '>' +
      '<b>' + App.esc(label) + '</b><span>' + App.esc(AL.pending === name && name ? 'Loading…' : sub) + '</span></button>';
  }
  function albumHTML() {
    var a = App.photoAlbum(), list = AL.list || [];
    var cur = function (n) { return a.name === n && a.photos ? a.photos.length + (a.photos.length === 1 ? ' photo' : ' photos') : 'Google Photos album'; };
    return '<div class="demo-panel">' +
      '<div class="demo-head"><h2 class="serif">Photo settings</h2><button class="demo-x" data-album-close aria-label="Close">' + App.icon('x', 28) + '</button></div>' +
      '<div class="demo-sec"><div class="label label--light">Show photos from</div>' +
      '<div class="loc-now">' + App.esc(showing()) + '</div>' +
      '<div class="loc-results ph-albums">' +
      (AL.list ? list.map(function (al) { return choice(al.name, al.name, cur(al.name)); }).join('') : '') +
      choice('', 'Sample photos', 'Built-in demo photos') +
      '</div>' +
      (!AL.list && !AL.listError ? '<p class="loc-status">Loading albums…</p>' : '') +
      (AL.listError ? '<p class="loc-status is-error">' + App.esc(AL.listError) + '</p>' : '') +
      (AL.list && !list.length ? '<p class="loc-status">No albums yet. Add them to <b>photo-config.json</b> on the dashboard server.</p>' : '') +
      (AL.status ? '<p class="loc-status' + (AL.error ? ' is-error' : '') + '">' + App.esc(AL.status) + '</p>' : '') +
      '</div>' +
      '<div class="demo-sec"><div class="label label--light">When no one touches the screen</div><div class="demo-grid">' +
      '<button data-idle-return="1" class="' + (App.photosIdleReturn ? 'is-on' : '') + '">Return to Today</button>' +
      '<button data-idle-return="0" class="' + (App.photosIdleReturn ? '' : 'is-on') + '">Stay on Photos</button></div>' +
      '<p class="loc-status">' + (App.photosIdleReturn
        ? 'Goes back to Today after a minute, then Ambient after two.'
        : 'Photos stays up until Night mode at 10 PM.') + '</p></div>' +
      '<p class="demo-note">Albums are listed in <b>photo-config.json</b> next to the dashboard (name and shared link). ' +
      'New photos in the chosen album show up within 30 minutes.</p>' +
      '</div>';
  }
  function albumPanel() { return V.el.querySelector('[data-album]'); }
  function albumRender() { var p = albumPanel(); if (p.classList.contains('is-open')) p.innerHTML = albumHTML(); }
  function albumOpen() {
    var my = ++AL.seq;
    AL.status = ''; AL.error = false; AL.listError = '';
    var p = albumPanel();
    p.innerHTML = albumHTML();
    p.classList.add('is-open');
    // Re-read the list each time, so an edited photo-config.json shows up without a reload.
    App.photoAlbumList().then(function (list) {
      if (my === AL.seq) { AL.list = list; AL.listError = ''; }
    }, function (err) {
      if (my === AL.seq) AL.listError = 'Couldn’t load the album list. ' + (err && err.message || '');
    }).then(function () { if (my === AL.seq) albumRender(); });
  }
  function albumClose() { albumPanel().classList.remove('is-open'); }
  function albumPick(name) {
    if (AL.pending) return;
    if (name === App.photoAlbum().name && (!name || App.photoAlbum().photos)) return albumClose();
    if (!name) {
      App.clearPhotoAlbum();
      albumClose();
      App.toast('Showing the sample photos', { icon: 'photo', ms: 2500 });
      return;
    }
    AL.pending = name; AL.status = ''; AL.error = false; albumRender();
    App.setPhotoAlbum(name).then(function () {
      AL.pending = '';
      albumClose();
      App.toast(App.esc(showing()), { icon: 'photo', ms: 3000 });
    }, function (err) {
      AL.pending = '';
      AL.status = 'Couldn’t load “' + name + '”. ' + (err && err.message || 'Try again.'); AL.error = true;
      if (err && err.gone) AL.list = (AL.list || []).filter(function (al) { return al.name !== name; });
      albumRender();
    });
  }

  App.register('photos', {
    show: function (el) {
      if (!V.el) {
        V.el = el;
        el.innerHTML = '<div class="photos">' +
          '<div class="ph-stage"></div>' +
          '<button class="ph-zone ph-zone--l" data-prev aria-label="Previous"></button>' +
          '<button class="ph-zone ph-zone--c" data-loud aria-label="Show details"></button>' +
          '<button class="ph-zone ph-zone--r" data-next aria-label="Next"></button>' +
          '<div class="ph-top"><div class="seg seg--glass">' + LAYOUTS.map(function (l) {
            return '<button data-layout="' + l[0] + '" class="' + (l[0] === V.layout ? 'is-on' : '') + '">' + l[1] + '</button>';
          }).join('') + '</div>' +
          '<button class="ph-btn ph-gear" data-album-open aria-label="Photo settings">' + App.icon('gear', 28) + '</button></div>' +
          '<div class="ph-bottom">' +
          '  <button class="ph-btn" data-prev>' + App.icon('left', 30) + '</button>' +
          '  <button class="ph-btn ph-btn--fav" data-fav>' + App.icon('heart', 30) + '<span>Favourite</span></button>' +
          '  <button class="ph-btn" data-next>' + App.icon('right', 30) + '</button>' +
          '</div>' +
          '<div class="demo ph-album" data-album></div></div>';
        V.show = new App.Slideshow(el.querySelector('.ph-stage'), {
          layout: V.layout, interval: 15000, onChange: function () { setTimeout(heart); },
          source: function () { return App.photoAlbum().photos; }
        });
        App.on('photoAlbum', function () { V.show.reload(); albumRender(); });
        el.addEventListener('click', function (e) {
          var t = e.target.closest('button');
          if (!t) { if (e.target === albumPanel()) albumClose(); return; }
          if (t.hasAttribute('data-album-open')) return albumOpen();
          if (t.hasAttribute('data-album-close')) return albumClose();
          if (t.hasAttribute('data-album-pick')) return albumPick(t.getAttribute('data-album-pick'));
          if (t.dataset.idleReturn) {
            App.setPhotosIdleReturn(t.dataset.idleReturn === '1');
            albumRender();
            App.toast(App.photosIdleReturn ? 'Photos will return to <b>Today</b> when idle' : 'Photos will <b>stay up</b> until Night mode', { icon: 'photo', ms: 2500 });
            return;
          }
          if (t.hasAttribute('data-next')) V.show.next();
          if (t.hasAttribute('data-prev')) V.show.prev();
          if (t.hasAttribute('data-loud')) { V.loud = !V.loud; el.querySelector('.photos').classList.toggle('is-loud', V.loud); }
          if (t.dataset.layout) {
            V.layout = t.dataset.layout;
            App.$$('[data-layout]', el).forEach(function (b) { b.classList.toggle('is-on', b === t); });
            V.show.setLayout(V.layout);
          }
          if (t.hasAttribute('data-fav')) {
            var p = V.show.current && V.show.current.photos[0];
            if (!p) return;
            p.fav = !p.fav;
            heart();
            App.toast(p.fav ? 'Added to favourites · it’ll show up more often' : 'Removed from favourites', { icon: 'heart', ms: 2500 });
          }
        });
      }
      V.show.start();
    },
    resume: function () { V.show.start(); },
    hide: function () { if (V.show) V.show.stop(); if (V.el) albumClose(); }
  });
})();
