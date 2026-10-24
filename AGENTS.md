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

## Current state (2026-10-24)

- Everything lives in one file: `te-compoents.js` (~3100 lines, typo in name is original).
- Inspiration images: `insporation/` (typo is original). `.avif`/`.webp` need `sips -s format png` to view.
- No build, no package.json, no git repo, no tests.

### Component inventory (`te-compoents.js`)

| Element | Purpose | Key config |
|---|---|---|
| `te-panel` | Device-shell container (screws, title, orange JP subtitle) holding child cards in rows | `title, subtitle, caption, cards: [card \| [card,...]]` |
| `te-group` | Flex row/column of child cards sharing one tile | `cards, direction, tile (default true), gap` |
| `te-knob` | Rotary knob, vertical drag, -135°..135° | `entity, attribute, min, max, domain, service, value_key, cap_color, label, sublabel, container, tile` |
| `te-dial` | TP-7 style big wheel, angular drag, value in center hub screen | same value props + `theme, unit, decimals` |
| `te-fader` | Fader with LED dots, vertical/horizontal; tap sublabel toggles/mutes | value props + `dots, gradient, orientation, toggle_*` |
| `te-toggle` | Round button with pill LED (TX-6 FX) | `entity, domain, service` |
| `te-button` | Round/square momentary button, optional hold-to-confirm, `cycle_source` action | `domain, service, data, icon, glyph, accent, hold_ms, active_*` |
| `te-dpad` | D-pad sending `remote.send_command` DPAD_* | `entity` |
| `te-display` | Canvas dot-matrix VFD (5x7 font), marquee, icon strip, segmented progress, demo mode | `entity, attribute, unit, decimals, theme(amber/blue), progress, icons, demo` |
| `te-mini-display` | Small VFD row: canvas mini-icon + name/state, compact two-line mode | `entity, icon, scroll, compact, readonly, toggle_*` |
| `te-color-picker` | Swatch → modal with HS wheel, brightness fader, 3 hold-to-save slots (input_text) | `entity, slots` |

Shared pieces: `TE_CSS` tokens string, `teSetLabel`, `teScrewCorners`, `teIconMarkup` (+ brand icon paths),
`TE_KNOB_CAPS`, `TE_DISPLAY_THEMES`, `TE_VFD_FONT`, `teDrawVfdText(Compact)`, `teDrawMiniIcon`, color utils.

### Known problems found in review

- Heavy duplication: `_valueFrac` (knob/fader/dial), pointer-drag + 120 ms throttle (6×), canvas
  resize/mesh/RAF loop (display + mini-display), glass overlay CSS, hold-to-confirm (button + color slots),
  transparent `ha-card` base CSS in every card.
- Lifecycle: canvas cards cancel RAF in `disconnectedCallback` but never restart in `connectedCallback`
  → display freezes when HA re-attaches the card (edit mode, view switch). RAF also runs at 60 fps forever.
- `te-panel` / `te-group`: second `setConfig` doesn't fully rebuild (panel never re-renders title/rows).
- Drag handlers call `this._hass.callService` without a `_hass` guard.
- No keyboard/ARIA support on knob/fader/dial (no `role="slider"`, no arrow keys, no focus ring).
- `te-button` fires on `pointerup` instead of `click` → no Enter/Space activation.
- Config strings go into `innerHTML` unescaped (`glyph`, `icon`).
- Mixed class prefixes: `te-*` and leftover `mc-*` state classes.
- Light theme only; no visual editor (`getConfigElement`), `preview: false`, no `getGridOptions` for sections view.
- Many magic numbers (sizes, 120 ms throttle, 1.4 s marquee pause, `46px` hit-zone in mini-display).

## Conventions

- `DESIGN.md` is the source of truth for visuals; follow it, and update it when the owner changes direction.
- Element names: `te-<component>`; card type `custom:te-<component>`. Each component also has a TE-style
  model name (e.g. KN-3) — table in `DESIGN.md` §6a.
- Labels are UPPERCASE, small, tracked; accent orange `#e8551d`; tokens only, no raw hex in components.
- Breaking YAML changes are allowed (owner approved); prefer HA-standard action objects.

## Decisions log

- 2026-10-24 — Design direction agreed (DESIGN.md v0.2): studio-render depth (no neumorphism), black body
  as theme, model names per component, screens = vfd-amber/vfd-blue/oled/lcd, accent budget, breaking config OK.
- (pending) framework, build tool, publish target, font family.
