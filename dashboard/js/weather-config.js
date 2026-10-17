// Weather settings and every piece of weather text, in one place. Edit here to rename, translate or
// retune the widget; weather.js, app.js and the views read from this object.
// Text may contain {placeholders}, filled in by App.wxText(key, values).
window.WEATHER_CONFIG = {
  // ---------------------------------------------------------------- settings
  settings: {
    // Default place. A city chosen in HomeDash Controls overrides it on that device ("Reset" returns here).
    place: { name: 'Bengaluru', region: 'Karnataka', country: 'India', lat: 12.97194, lon: 77.59369 },
    searchLanguage: 'en',      // language of city search results
    refreshMinutes: 60,        // normal refresh
    retryMinutes: 2,           // after a failed fetch
    timeoutSeconds: 15,        // give up on a request after this long
    switchAttempts: 3,         // tries when switching city (the service is sometimes briefly overloaded)
    switchRetrySeconds: 2,     // wait between those tries
    rainChancePct: 50,         // an hour counts as rainy at or above this chance of rain
    rainLookaheadHours: 12,    // how far ahead "Rain from …" looks
    coolBelowC: 12,            // below this, "Clear and cool" / "Jacket weather"
    staleAfterMinutes: 120,    // show "· n h old" once the last good forecast is older than this
    hourlyCurvePx: 0,          // raise warmer hours' icons by up to this many px (0 = all icons aligned)
    // Night when sunrise/sunset are unknown (demo data only): from this hour until the next one.
    fallbackNight: { from: 18, to: 6 }
  },

  // ---------------------------------------------------------------- condition labels
  // Keys are set by weather.js from the WMO weather code (see codes below).
  conditions: {
    sunny: 'Sunny',            // code 0, daytime
    clear: 'Clear',            // code 0, night
    mainlyClear: 'Mainly clear',
    partlyCloudy: 'Partly cloudy',
    overcast: 'Overcast',
    fog: 'Fog',
    drizzle: 'Drizzle',
    rain: 'Rain',
    showers: 'Showers',
    thunderstorm: 'Thunderstorm',
    snow: 'Snow',
    cloudy: 'Cloudy'           // any other code
  },

  // ---------------------------------------------------------------- summary and advice
  summary: {
    rainUntil: 'Rain until {time}',
    rainForAWhile: 'Rain for a while',
    rainFrom: 'Rain from {time}',
    clearAndCool: 'Clear and cool',
    dryTonight: 'Dry tonight',
    dryAllDay: 'Dry all day'
  },
  advice: {
    umbrella: 'Umbrella weather',    // raining now
    rainJacket: 'Grab a rain jacket',// rain coming
    jacket: 'Jacket weather',        // dry and cool
    lightLayers: 'Light layers'      // dry and mild
  },
  // How a time on another day is described inside a summary.
  when: {
    tomorrow: '{time} tomorrow',
    otherDay: '{day} {time}'
  },

  // ---------------------------------------------------------------- Today screen text
  display: {
    now: 'Now',                      // first slot of the hourly strip
    highLow: 'H {hi}°  L {lo}°',
    hoursOld: '  · {n} h old',
    sunriseSunset: 'Sunrise {sunrise} · Sunset {sunset}',
    place: '· {place}',              // after the condition label, e.g. "Drizzle · Bengaluru"
    ambientPlace: '{place}'          // Ambient mode, above the temperature
  },

  // ---------------------------------------------------------------- HomeDash Controls: weather location
  location: {
    title: 'Weather location',
    showing: 'Showing {place}',
    placeholder: 'City name',
    search: 'Search',
    searching: 'Searching…',
    pickOne: 'Tap a place to use it',
    noResults: 'No places found for “{query}”. Check the spelling.',
    searchFailed: 'Couldn’t search right now. Check the connection and try again.',
    loading: 'Loading weather for {place}…',
    switched: 'Weather now for {place}',
    switchFailed: 'Couldn’t load weather for {place}. Still showing {current}.',
    reset: 'Reset to {place}'
  }
};
