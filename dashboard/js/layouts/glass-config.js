// "Glass" Today layout: its settings, text and demo content, in one place.
// Clock, greeting, weather, air quality and chores are live; the quote rotates daily from the list below;
// news, music and football are demo content until real sources are chosen. Text may contain {placeholders} (filled by App.glassText).
window.GLASS_CONFIG = {
  settings: {
    busyEventCount: 3,             // this many events left today counts as "busy"
    aqiRefreshMinutes: 60,
    choresShown: 5,                // chips in the chores strip
    logoHoldSeconds: 3,            // press and hold the HomeDash logo this long to open HomeDash Controls
    carouselPhotos: 5,             // photos in the Moments carousel (on-this-day first, then newest)
    carouselSeconds: 12            // auto-advance; a tap on an arrow or dot restarts the timer
  },

  text: {
    brand: 'HomeDash',
    nav: { home: 'Dashboard', calendar: 'Calendar', tasks: 'Family', shopping: 'Lists', photos: 'Photos' },
    // Greeting by time of day: morning 5–12, afternoon 12–17, evening 17–22, night 22–5.
    greeting: { morning: 'Good morning.', afternoon: 'Good afternoon.', evening: 'Good evening.', night: 'Good night.' },
    period: { morning: 'morning', afternoon: 'afternoon', evening: 'evening', night: 'night' },
    busy: 'A busy {period} ahead.',
    calm: 'A calm {period} ahead.',
    free: 'Nothing else planned this {period}.',
    newsTitle: 'Top news, this {period}',
    readTime: '{n} min read',
    lastPlayed: 'Last played',
    inDays: 'In {n} days',
    tomorrow: 'Tomorrow',
    today: 'Today',
    aqiTitle: 'Air Quality',
    aqiValue: 'AQI {n}',
    aqiUnavailable: 'Air quality unavailable',
    quoteTitle: 'Quote of the day',
    moments: 'Moments',
    momentsCaption: '{place} · {when}',
    updated: { justNow: 'Updated just now', minutes: 'Updated {n} min ago', hours: 'Updated {n} h ago' },
    chores: 'Chores',
    choresLeft: '{n} left today',
    choresDone: 'All done today'
  },

  // US AQI bands: label and advice. Colours run along the bar in the same order.
  aqi: [
    { max: 50, label: 'Good', color: '#3DBE5A', advice: 'Air quality is good. A great time to be outside.' },
    { max: 100, label: 'Moderate', color: '#F2C230', advice: 'Unusually sensitive people should consider reducing prolonged outdoor activity.' },
    { max: 150, label: 'Unhealthy for sensitive groups', color: '#F59331', advice: 'Children and people with asthma should limit prolonged outdoor activity.' },
    { max: 200, label: 'Unhealthy', color: '#E8543A', advice: 'Consider reducing prolonged outdoor activity.' },
    { max: 300, label: 'Very unhealthy', color: '#B23A6E', advice: 'Avoid prolonged outdoor activity; keep windows closed.' },
    { max: 500, label: 'Hazardous', color: '#7E2340', advice: 'Stay indoors and keep activity levels low.' }
  ],

  // ---------------------------------------------------------------- quote of the day
  // One per day, in order, starting again at the end. Keep each under ~120 characters (two lines).
  quotes: [
    { text: 'We suffer more often in imagination than in reality.', by: 'Seneca' },
    { text: 'The happiness of your life depends upon the quality of your thoughts.', by: 'Marcus Aurelius' },
    { text: 'It does not matter how slowly you go as long as you do not stop.', by: 'Confucius' },
    { text: 'A journey of a thousand miles begins with a single step.', by: 'Lao Tzu' },
    { text: 'Well done is better than well said.', by: 'Benjamin Franklin' },
    { text: 'Nothing is at last sacred but the integrity of your own mind.', by: 'Ralph Waldo Emerson' },
    { text: 'Our life is frittered away by detail. Simplify, simplify.', by: 'Henry David Thoreau' },
    { text: 'No man ever steps in the same river twice.', by: 'Heraclitus' },
    { text: 'He who has a why to live can bear almost any how.', by: 'Friedrich Nietzsche' },
    { text: 'Waste no more time arguing what a good man should be. Be one.', by: 'Marcus Aurelius' },
    { text: 'The best way out is always through.', by: 'Robert Frost' },
    { text: 'Do what you can, with what you have, where you are.', by: 'Theodore Roosevelt' }
  ],

  // ---------------------------------------------------------------- demo content (not live)
  demo: {
    news: [
      { topic: 'Design', mins: 2, title: 'Why hand-drawn maps are having a moment', seed: 'gl-news-maps' },
      { topic: 'Architecture', mins: 3, title: 'A lakeside house that blends land and water', seed: 'gl-news-lake' },
      { topic: 'Tech', mins: 3, title: 'Small screens, big ideas: the return of the home dashboard', seed: 'gl-news-tech' }
    ],
    music: { title: 'Rain on the Window', artist: 'The Quiet Rooms', seed: 'gl-album', elapsed: 0, length: 258 },
    // Kickoff is "N days from today" at a fixed local time, so the demo always looks current.
    match: { competition: 'Premier League', home: 'Man United', homeShort: 'MU', homeColor: '#DA291C',
      away: 'Leeds United', awayShort: 'LU', awayColor: '#1D428A', inDays: 5, time: '18:30', venue: 'Old Trafford, Manchester' }
  }
};
