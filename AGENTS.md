# AGENTS.md — te-components

Working notes for AI agents (and humans) on this repo. Keep this file current as decisions are made.

## What this is

Custom Lovelace cards for **Home Assistant**, styled after **Teenage Engineering** hardware
(K.O. II / EP-133, TX-6, TP-7, OP-1 field, MIC FX; also Panic Playdate as a secondary reference).
Cards are vanilla Web Components (`HTMLElement` + shadow DOM) loaded by HA as a dashboard resource and
used as `type: custom:te-*`.

## Goals (from the owner)

1. Organize/refactor the codebase so it's easy to use, extend and build on.
2. A local **playground** to view and interact with components without a real HA instance.
3. **Publish** as an installable package for HA users.
4. Design guidelines come **before** refactoring and must be agreed with the owner → see `DESIGN.md`.

## Architecture (Lit 3 + TypeScript + Vite)

```
src/
  index.ts              registers every card (bundle entry)
  registry.ts           MODELS table (TE model names) + registerCard → window.customCards
  types.ts              minimal HomeAssistant / HassEntity types
  core/
    base-card.ts        TeBaseCard: setConfig→normalizeConfig, body theme, hass diffing (watchedEntities), run(action)
    value-card.ts       TeValueCard: drag (dragFrac), keyboard, wheel, throttled writes, local value hold
    value.ts            domain defaults (DOMAIN_SPECS), resolveValue / valueAt / formatValue / writeValue
    actions.ts          HA-standard action runner (+ cycle-source, mute, "{{ value }}" substitution)
    hold.ts             HoldGesture (hold-to-fire / hold-to-confirm)
    feedback.ts         opt-in haptics (HA `haptic` event / vibrate) + WebAudio clicks; detentOf(); base `feedback(kind)`
    options.ts          option sources per domain (OPTION_SPECS) + select service, for SW-5
    history.ts          recorder history via hass.callWS (history/history_during_period) + time bucketing
    modal.ts            TeModal: base for dialogs (backdrop, Escape closes topmost only, header, faders via trackDrag)
                        (the light dialog itself is cards/te-light-dialog.ts; open it with run({action: "light-dialog"})
                        or openLightDialog() from any TeBaseCard, which owns it and keeps its hass current)
    throttle.ts         trailing-edge throttle
    child-cards.ts      hui-card children + shared row layout (buildRows/renderRows/rowStyles, `{ bracket, cards }` bracket rows) for panel/popup
    form.ts             getConfigForm() schema helpers (HA visual editor)
    rows-edit.ts        container rows as an editable list (toEditRows/fromEditRows, move/add/remove)
    entity.ts           pickEntity (stub configs), isToggleable
  editor/te-container-editor.ts   getConfigElement() for CH-1/PP-3/GR-2: settings ha-form + rows of chips; the
                        selected card uses HA's hui-card-element-editor, new cards hui-card-picker
  theme/tokens.ts       ALL design tokens incl. lighting/elevation; black body via :host([data-body=black])
  theme/shared.ts       base styles (.card, .label, .led, .screw, .socket, focus ring)
  screen/               canvas screen engine: 5x7 font, themes (vfd-amber/vfd-blue/oled/lcd),
                        cached text strips + stepped marquee, ScreenController (30fps, pauses off-screen),
                        mini icons, te-pixel-text (static pixel text),
                        matrix.ts (DotBuffer + MatrixPainter for DS-64), segments.ts (seven-segment cells for SG-7), animations.ts (washer/dryer/dishwasher/fan)
  cards/te-*.ts         one file per card
playground/             Vite dev root: mock hass (mock-hass.ts), ha-icon/hui-card shims, stories.ts,
                        dashboard.ts (example home at #dashboard; plain data, no imports),
                        check.html/check.ts (card-picker contract check: stub → setConfig → preview, form schema)
scripts/export-dashboard.ts   dashboard.ts → examples/dashboard.yaml (`npm run export:dashboard`)
```

### Adding a component

1. Pick a model code + katakana subtitle, add to `MODELS` in `src/registry.ts` and DESIGN.md §6a.
2. `src/cards/te-<name>.ts`: extend `TeBaseCard` (or `TeValueCard` for numeric controls), implement
   `normalizeConfig`, `render`, `static getStubConfig(hass)`, `static getConfigForm()`, `getGridOptions()`.
   Use tokens only; reuse `sharedStyles`, `HoldGesture`, `ScreenController`.
3. Import it in `src/index.ts`, add a story in `playground/stories.ts`, document it in README.md.

### Gotchas

- Don't name methods `normalize` (collides with `Node.normalize`).
- Static `properties` on subclasses only list new props; Lit merges the base ones.
- `useDefineForClassFields: false` — reactive props are `declare`d and initialized in the constructor.
- Vite 8 needs `rolldownOptions.output.minify` to minify ES lib builds.
- The container editor uses HA internals (`hui-card-element-editor`, `hui-card-picker`), loaded the way HA's stack
  card does (`loadHaCardEditors`); if they never appear it says to use YAML. Tests use `playground/editor-shims.ts`.
- MockHass must copy-on-write `states`: cards skip re-render when `old.states[id] === new.states[id]`.
- Feedback is resolved per card: `feedback:` config, else `--te-feedback` read in `connectedCallback` (HA theme,
  or CH-1/GR-2 set it for children). `run()` already gives a press cue; value cards tick per detent.
- Dialogs (TeModal) make the rest of `document.body` inert and lock page scroll while open; mount them on body.
- After editing `playground/dashboard.ts`, run `npm run export:dashboard` so the YAML example stays in sync.
- `insporation/` is gitignored (third-party product photos); `.avif`/`.webp` need `sips -s format png` to view.

## Card picker / visual editor

HA's picker calls `getStubConfig(hass, entities, entitiesFallback)`, merges it into `{ type }` and calls
`setConfig` on a live preview (a throw = error card). The editor builds `ha-form` from `getConfigForm().schema`;
unlabelled fields show the capitalised key name. Run `/check.html` on the dev server after touching any stub or
form; it must report no errors. Stubs must produce a config the card accepts whenever matching entities exist.
The check itself lives in `playground/picker-contract.ts`; `npm test` runs it for every card in headless Chromium
(`test/browser/picker.test.ts`), fails on errors and prints warnings. It also fails if a model in `MODELS` isn't
registered (forgot the import in `src/index.ts`).

## Tests

`npm test` (Vitest, `vitest.config.ts`; CI runs it before the build) runs two projects: `unit` (Node) and
`browser` (headless Chromium via Playwright, `test/browser/`; first time locally: `npx playwright install chromium`).
`npx vitest run --project unit` skips the browser. Unit tests live in `test/` and
cover the pure logic: `core/value`, `actions`, `options`, `history`, `throttle`, `hold`, utils, and the screen code.
`test/helpers.ts` has `fakeHass()` (records `callService` calls) and `fakeHost()` (records `hass-more-info`).
Dot-matrix drawing (DotBuffer, fonts, DS-64 animations) is snapshotted as ASCII; after an intentional art change,
check the diff and run `npx vitest run -u`. When you add a domain to `DOMAIN_SPECS`/`OPTION_SPECS`, add its row
to the table tests.

## Testing without the Chrome extension

Headless Chrome can be driven over the DevTools protocol with Node's built-in `WebSocket`
(`--headless=new --remote-debugging-port`, then `Runtime.evaluate` + `Page.captureScreenshot`). Pure drawing
code (DotBuffer, animations) can be rendered to ASCII with `node --experimental-transform-types` plus a resolve
hook that appends `.ts` to relative imports.

## Publishing

HACS plugin: `hacs.json` → `te-components.js`. Publishing a GitHub release runs
`.github/workflows/release.yml`, which builds the bundle and attaches it to the release. `validate.yml`
runs the tests, the build and the HACS validation on every push. To release: `npm version X.Y.Z --no-git-tag-version`,
commit, merge to master, then publish a GitHub release tagged `vX.Y.Z` (the release job fails if tag and package.json differ).

## License

GPL-3.0-or-later (owner's choice 2026-10-24: open source, keeps the option of commercial dual licensing).
Outside contributions need a CLA (CONTRIBUTING.md). The build prepends a license banner to the bundle.
Don't use Teenage Engineering names/branding as product branding ("inspired by" in docs only).

## Conventions

- `DESIGN.md` is the source of truth for visuals; follow it, and update it when the owner changes direction.
- Element names: `te-<component>`; card type `custom:te-<component>`. Each component also has a TE-style
  model name (e.g. KN-3) — table in `DESIGN.md` §6a.
- Labels are UPPERCASE, small, tracked; accent orange `#e8551d`; tokens only, no raw hex in components.
- Breaking YAML changes are allowed (owner approved); prefer HA-standard action objects.

## Decisions log

- 2026-10-24 — Design direction agreed (DESIGN.md v0.2): studio-render depth (no neumorphism), black body
  as theme, model names per component, screens = vfd-amber/vfd-blue/oled/lcd, accent budget, breaking config OK.
- 2026-10-25 — CH-1 tabs became pages (tabs with `cards`); SW-5 `list:` picks another choice list
  (thermostat presets, fan modes, sound modes); BL-0 spacer; locks toggle with hold-to-unlock on TG-1.
- 2026-10-24 — Lit + TypeScript + Vite; HACS distribution; original `te-compoents.js` removed (kept in the
  baseline commit). Font: system stack with `te-font-family` override (no bundled font).
