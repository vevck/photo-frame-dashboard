// Live weather from Open-Meteo (no API key). Replaces DATA.weather with a timeline of real hours:
//   { hi, lo, sunrise: ms, sunset: ms, hours: [{ at: ms, t: °C, c: icon, k: label key, p: rain % }], updated: ms|null, live: bool }
// Settings and label text live in weather-config.js; hours store a label key, not text, so a renamed or
// translated label also applies to a forecast already cached on the device.
// The last good forecast is kept in memory and localStorage, so a failed fetch (or a reboot while
// Wi-Fi is down) keeps showing it. Until any forecast has loaded, the demo table stands in.
// The place can be changed from HomeDash Controls (App.searchPlaces / App.setWeatherPlace); the choice is
// saved on the device and only takes effect once a forecast for the new place has loaded.
(function () {
  'use strict';
  var D = window.DATA;

  var S = window.WEATHER_CONFIG.settings, DEFAULT_PLACE = S.place;
  var REFRESH_MS = S.refreshMinutes * 60000;
  var RETRY_MS = S.retryMinutes * 60000;
  var TIMEOUT_MS = S.timeoutSeconds * 1000;
  var CACHE_KEY = 'homehq.weather', PLACE_KEY = 'homehq.weatherPlace';

  function samePlace(a, b) { return !!a && !!b && Math.abs(a.lat - b.lat) < 1e-4 && Math.abs(a.lon - b.lon) < 1e-4; }
  function readPlace() {
    try { var p = JSON.parse(localStorage.getItem(PLACE_KEY) || 'null'); if (p && isFinite(p.lat) && isFinite(p.lon) && p.name) return p; } catch (e) {}
    return DEFAULT_PLACE;
  }
  var PLACE = readPlace();

  function forecastURL(p) {
    return 'https://api.open-meteo.com/v1/forecast?latitude=' + p.lat + '&longitude=' + p.lon +
      '&hourly=temperature_2m,weather_code,precipitation_probability,is_day' +
      '&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto&timeformat=unixtime&forecast_days=3';
  }
  // fetch() with a timeout; resolves to parsed JSON or rejects.
  function getJSON(url) {
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT_MS);
    return fetch(url, ctrl ? { signal: ctrl.signal, cache: 'no-store' } : { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) { clearTimeout(timer); return j; }, function (e) { clearTimeout(timer); throw e; });
  }

  // WMO weather code → one of the dashboard's five icons, and a label key (text in weather-config.js).
  function describe(code, day) {
    if (code === 0) return { c: day ? 'sun' : 'moon', k: day ? 'sunny' : 'clear' };
    if (code === 1) return { c: day ? 'sun' : 'moon', k: 'mainlyClear' };
    if (code === 2) return { c: day ? 'partly' : 'moon', k: 'partlyCloudy' };
    if (code === 3) return { c: 'cloud', k: 'overcast' };
    if (code === 45 || code === 48) return { c: 'cloud', k: 'fog' };
    if (code >= 51 && code <= 57) return { c: 'rain', k: 'drizzle' };
    if (code >= 61 && code <= 67) return { c: 'rain', k: 'rain' };
    if (code >= 80 && code <= 82) return { c: 'rain', k: 'showers' };
    if (code >= 95) return { c: 'rain', k: 'thunderstorm' };
    if (code >= 71 && code <= 86) return { c: 'cloud', k: 'snow' };
    return { c: 'cloud', k: 'cloudy' };
  }

  // Demo fallback: the old 24-entry table laid over today and tomorrow, so it has the same shape.
  function demo(table) {
    var keys = { sun: 'sunny', moon: 'clear', partly: 'partlyCloudy', cloud: 'overcast', rain: 'rain' };
    var start = App.dayStart(App.now()).getTime(), hours = [];
    for (var i = 0; i < 48; i++) {
      var h = i % 24;
      hours.push({ at: start + i * 3600000, t: table.t[h], c: table.c[h], k: keys[table.c[h]], p: table.p[h] });
    }
    return { hi: table.hi, lo: table.lo, sunrise: null, sunset: null, hours: hours, updated: null, live: false };
  }

  function parse(json) {
    var H = json.hourly, Dy = json.daily, hours = [];
    for (var i = 0; i < H.time.length; i++) {
      if (H.temperature_2m[i] == null) continue;
      var d = describe(H.weather_code[i], H.is_day[i] === 1);
      hours.push({ at: H.time[i] * 1000, t: Math.round(H.temperature_2m[i]), c: d.c, k: d.k, p: H.precipitation_probability[i] || 0 });
    }
    var days = Dy.time.map(function (t, i) { return { at: t * 1000, hi: Math.round(Dy.temperature_2m_max[i]), lo: Math.round(Dy.temperature_2m_min[i]),
      sunrise: Dy.sunrise ? Dy.sunrise[i] * 1000 : null, sunset: Dy.sunset ? Dy.sunset[i] * 1000 : null }; });
    if (!hours.length || !days.length) throw new Error('empty forecast');
    return { days: days, hours: hours, updated: Date.now(), live: true };
  }

  // Today's high/low and sunrise/sunset come from whichever forecast day contains "now".
  function withToday(w) {
    var today = App.dayStart(App.now()).getTime(), day = null;
    for (var i = 0; i < w.days.length; i++) if (App.dayStart(new Date(w.days[i].at)).getTime() === today) day = w.days[i];
    day = day || w.days[0];
    w.hi = day.hi; w.lo = day.lo; w.sunrise = day.sunrise || null; w.sunset = day.sunset || null;
    return w;
  }

  // A forecast is usable while it still has an hour covering now.
  function covers(w) {
    var now = App.now().getTime(), last = w.hours[w.hours.length - 1];
    return w.hours[0].at <= now && now < last.at + 3600000;
  }

  function use(w) { D.weather = withToday(w); App.emit('data'); }
  function save(w) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(w)); } catch (e) {} }

  function fetchForecast(place) {
    return getJSON(forecastURL(place)).then(function (json) {
      var w = parse(json);
      w.place = { name: place.name, region: place.region || '', country: place.country || '', lat: place.lat, lon: place.lon };
      return w;
    });
  }

  function load() {
    var place = PLACE;
    fetchForecast(place)
      .then(function (w) {
        if (!samePlace(place, PLACE)) return; // the place changed while this was in flight
        save(w); use(w); schedule(REFRESH_MS);
      })
      .catch(function (err) {
        // Keep whatever is showing (last good forecast or demo) and try again soon.
        console.warn('[weather] fetch failed, keeping last good data:', err && err.message);
        schedule(RETRY_MS);
      });
  }
  var next = null;
  function schedule(ms) { clearTimeout(next); next = setTimeout(load, ms); }

  // City search (Open-Meteo geocoding). Resolves to up to 5 places: { name, region, country, lat, lon }.
  App.searchPlaces = function (query) {
    var q = String(query || '').trim();
    if (!q) return Promise.resolve([]);
    return getJSON('https://geocoding-api.open-meteo.com/v1/search?count=5&format=json&language=' +
        encodeURIComponent(S.searchLanguage || 'en') + '&name=' + encodeURIComponent(q))
      .then(function (j) {
        return (j.results || []).map(function (r) {
          return { name: r.name, region: r.admin1 || '', country: r.country || '', lat: r.latitude, lon: r.longitude };
        });
      });
  };
  // Switch to a place. Resolves once its forecast has loaded and is showing; rejects (leaving the current
  // place and forecast untouched) if the forecast can't be fetched.
  // The service sometimes answers 503 "overloaded", so a switch tries a few times before giving up.
  function fetchWithRetry(place, tries) {
    return fetchForecast(place).catch(function (err) {
      if (tries <= 1) throw err;
      return new Promise(function (r) { setTimeout(r, S.switchRetrySeconds * 1000); }).then(function () { return fetchWithRetry(place, tries - 1); });
    });
  }
  App.setWeatherPlace = function (place) {
    return fetchWithRetry(place, S.switchAttempts).then(function (w) {
      PLACE = w.place;
      try {
        if (samePlace(PLACE, DEFAULT_PLACE)) localStorage.removeItem(PLACE_KEY);
        else localStorage.setItem(PLACE_KEY, JSON.stringify(PLACE));
      } catch (e) {}
      save(w); use(w); schedule(REFRESH_MS);
      return PLACE;
    });
  };
  App.resetWeatherPlace = function () { return App.setWeatherPlace(DEFAULT_PLACE); };
  App.weatherPlace = function () { return PLACE; };
  App.weatherDefaultPlace = function () { return DEFAULT_PLACE; };
  // "Koramangala, Karnataka, India" (region and country left out when empty or repeated)
  App.placeLabel = function (p) {
    var parts = [p.name];
    if (p.region && p.region !== p.name) parts.push(p.region);
    if (p.country) parts.push(p.country);
    return parts.join(', ');
  };

  // Start from the cached forecast if it is for the current place and still covers now, else the demo
  // table. Forecasts cached before places were saved have no place: they were for the default.
  var cached = null;
  try { cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (e) {}
  var cachedOk = cached && cached.hours && cached.hours.length && covers(cached) && samePlace(cached.place || DEFAULT_PLACE, PLACE);
  if (cachedOk && !cached.place) cached.place = DEFAULT_PLACE;
  D.weather = cachedOk ? withToday(cached) : demo(D.weather);

  // Midnight: re-pick today's high/low from the forecast already loaded.
  App.on('minute', function (n) { if (n.getHours() === 0 && n.getMinutes() === 0 && D.weather.days) use(D.weather); });

  App.refreshWeather = load;
  App.on('ready', load);
})();
