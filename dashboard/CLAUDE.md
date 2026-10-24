# Dashboard (Home HQ)

Vite app, plain JS and CSS, no framework. It runs in Android System WebView 106 inside the kiosk
app, at 1280×800, devicePixelRatio 1. Full constraints: `../docs/building-for-the-frame.md`.

## Structure

- `index.html`: the rail (tab buttons, `data-go="<view>"`) and one `<section id="view-<view>">` per view.
- `js/main.js`: imports every module. Order matters; views come after `app.js`.
- `js/app.js`: shared `window.App` (router, formatting, calendar and weather helpers).
- `js/data.js`: `window.DATA`, mock data relative to today. Keep these shapes when wiring real data.
- `js/views/<view>.js` + `css/views/<view>.css`: one pair per screen, registered with
  `App.register('<view>', { show(el, opts) { ... } })`.
- `css/tokens.css`: colours, fonts, spacing. Change the theme here first.

Adding a view: create the JS and CSS pair, import the JS in `main.js`, link the CSS and add the
`<section>` and rail button in `index.html`.

## WebView 106 rules

- Keep `build.target: 'chrome106'` and `cssTarget: 'chrome61'` in `vite.config.js`.
- No `oklch()`, `oklab()`, `color-mix()`, Tailwind v4, native CSS nesting, `:has()`,
  4/8-digit hex colours (use `rgba()`), `dvh`/`svh`/`lvh`, `@starting-style`, View Transitions,
  Popover API, subgrid, `text-wrap: balance`.
- No `toSorted`/`toReversed`/`with`, `Object.groupBy`, `Promise.withResolvers`, new `Set`
  methods, `Array.fromAsync`. The bundler does not polyfill these.
- `alert()`, `confirm()`, `prompt()` do nothing in the kiosk. Build in-page dialogs.
- Don't use a two-finger still hold: the kiosk uses it for its menu.
- The kiosk retries the page load but not `fetch()`, images or scripts. Retry them in the page
  and keep the last good data on screen.

## Checking a change

`npm run dev` and look at it at exactly 1280×800. Then `npm run build` and confirm `dist/`
builds without warnings before it goes to the frame. Something that works in desktop Chrome can
still break on the frame; check it there before calling it done.
