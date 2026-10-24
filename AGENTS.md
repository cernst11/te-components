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
    throttle.ts         trailing-edge throttle
    child-cards.ts      hui-card children for panel/group
    form.ts             getConfigForm() schema helpers (HA visual editor)
    entity.ts           pickEntity (stub configs), isToggleable
  theme/tokens.ts       ALL design tokens incl. lighting/elevation; black body via :host([data-body=black])
  theme/shared.ts       base styles (.card, .label, .led, .screw, .socket, focus ring)
  screen/               canvas screen engine: 5x7 font, themes (vfd-amber/vfd-blue/oled/lcd),
                        cached text strips + stepped marquee, ScreenController (30fps, pauses off-screen),
                        mini icons, te-pixel-text (static pixel text)
  cards/te-*.ts         one file per card
playground/             Vite dev root: mock hass (mock-hass.ts), ha-icon/hui-card shims, stories.ts,
                        dashboard.ts (example home at #dashboard; plain data, no imports)
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
- MockHass must copy-on-write `states`: cards skip re-render when `old.states[id] === new.states[id]`.
- After editing `playground/dashboard.ts`, run `npm run export:dashboard` so the YAML example stays in sync.
- `insporation/` is gitignored (third-party product photos); `.avif`/`.webp` need `sips -s format png` to view.

## Publishing

HACS plugin: `hacs.json` → `te-components.js`. Publishing a GitHub release runs
`.github/workflows/release.yml`, which builds the bundle and attaches it to the release. `validate.yml`
runs the build and the HACS validation on every push.

## Conventions

- `DESIGN.md` is the source of truth for visuals; follow it, and update it when the owner changes direction.
- Element names: `te-<component>`; card type `custom:te-<component>`. Each component also has a TE-style
  model name (e.g. KN-3) — table in `DESIGN.md` §6a.
- Labels are UPPERCASE, small, tracked; accent orange `#e8551d`; tokens only, no raw hex in components.
- Breaking YAML changes are allowed (owner approved); prefer HA-standard action objects.

## Decisions log

- 2026-10-24 — Design direction agreed (DESIGN.md v0.2): studio-render depth (no neumorphism), black body
  as theme, model names per component, screens = vfd-amber/vfd-blue/oled/lcd, accent budget, breaking config OK.
- 2026-10-24 — Lit + TypeScript + Vite; HACS distribution; original `te-compoents.js` removed (kept in the
  baseline commit). Font: system stack with `te-font-family` override (no bundled font).
