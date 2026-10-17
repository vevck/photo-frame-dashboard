// Today screen layouts. "classic" is the original screen in views/home.js; other layouts register here
// and get the #view-home element to build into. The active one comes from ?layout=<name> (a preview that
// isn't saved), else the device's saved choice, else classic.
//   App.registerHomeLayout(name, { fullbleed: bool, show(el), resume(), hide(), minute(now), data() })
(function () {
  'use strict';
  var KEY = 'homehq.homeLayout';
  App.homeLayouts = {};
  App.registerHomeLayout = function (name, layout) { App.homeLayouts[name] = layout; };
  // Picker entries in HomeDash Controls: [{ name, label }], classic first.
  App.homeLayoutList = function () {
    return [{ name: 'classic', label: 'Classic' }].concat(Object.keys(App.homeLayouts).map(function (k) {
      return { name: k, label: App.homeLayouts[k].label || k };
    }));
  };

  var preview = (location.search.match(/[?&]layout=([\w-]+)/) || [])[1] || null;
  App.homeLayout = function () {
    var name = preview;
    if (!name) { try { name = localStorage.getItem(KEY); } catch (e) {} }
    return name && (name === 'classic' || App.homeLayouts[name]) ? name : 'classic';
  };
  // Used by the Layout section in HomeDash Controls: saves the choice and rebuilds the Today screen.
  App.setHomeLayout = function (name) {
    preview = null;
    try { if (name === 'classic') localStorage.removeItem(KEY); else localStorage.setItem(KEY, name); } catch (e) {}
    // Rebuild Today now if it's showing, otherwise the next time it's opened (not a plain resume).
    if (App.views.home) App.views.home._dirty = true;
    if (App.current === 'home') App.go('home', { rerender: true });
  };
  App.activeHomeLayout = function () { var n = App.homeLayout(); return n === 'classic' ? null : App.homeLayouts[n]; };
})();
