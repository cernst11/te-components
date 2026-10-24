# TE Components — Design Guidelines (v0.2)

Status: **agreed direction (2026-10-24)**, not yet implemented. See "Decisions" at the bottom.

References (in `insporation/`): K.O. II (EP-133), K.O. Sidekick mixer, TX-6 (silver + black),
TP-7 (silver + black), OP-1 field, MIC FX, Panic Playdate.

---

## 1. Principles

1. **It's an object, not a webpage.** Every card should read as a piece of hardware: a body, controls
   mounted on it, labels printed on it, a screen set into it. If a control has no plausible physical
   counterpart, rethink it.
2. **Quiet body, loud details.** The surface is neutral and calm; color and light are reserved for
   meaning (state, primary action, the one thing you should touch).
3. **Functional honesty.** Labels say exactly what a control does, in as few characters as possible
   (`GAIN`, `CUE`, `FX`, `SHIFT`). No decoration that pretends to be information.
4. **Playful, not cute.** Humor lives in small moments — a Japanese subtitle, a pixel icon, a hold-to-fill
   animation — never in rounded bubbly shapes or gradients-for-their-own-sake.
5. **Grid discipline.** Controls sit on a strict grid and align across cards. Irregularity is intentional
   or it's a bug.

## 2. Materials & Surfaces

| Surface | Reference | Notes |
|---|---|---|
| **Body – silver** (default) | TX-6 / TP-7 silver, K.O. | Matte anodized aluminium, very light grain, near-flat. |
| **Body – black** (theme) | TX-6 / TP-7 black | Delivered as a theme (token set), not per-component code. Same geometry, inverted values; orange stays orange. |
| **Faceplate** | K.O. top label plate, MIC FX | Slightly lighter inset panel with 4 corner screws; holds model name. |
| **Cap plastic** | K.O. knobs, OP-1 knobs | Matte, solid color, soft single drop shadow. Colors: orange, white, grey, black, navy, tan. |
| **Screen window** | TX-6 OLED, TP-7, K.O. LCD | Black glass, sunk flush into body, subtle diagonal glass sheen. |
| **Grille** | K.O. II speaker, MIC FX | Dot-hole grid — usable as a decorative module. |

### Depth: "studio render", not neumorphism

Goal: flatter than the current soft-UI look, but *more* tactile and real. Neumorphism fakes depth by
extruding the body color with a white + dark shadow pair; real objects are lit differently. We model a
**single key light from the top-left** plus ambient light, the way TE's product renders are lit:

| Layer | What it simulates | Raised (caps, keys) | Sunk (sockets, grooves, screens) |
|---|---|---|---|
| **Contact shadow** | Ambient occlusion where object meets body | tight, dark, 0–2px offset, 1–3px blur | — |
| **Cast shadow** | Key light shadow | soft, low opacity, offset down-right, blur ≈ 2× height | — |
| **Edge bevel** | Light catching a machined/molded edge | 1px top/left highlight, 1px bottom/right shade (inset) | inverted: lip highlight on *bottom* edge |
| **Surface falloff** | Light falling across a face | very subtle linear gradient (≤4% luminance) | darker at top (shadowed by the rim) |
| **Specular** | Gloss/sheen | matte caps: faint radial highlight top-left; screens: diagonal glass sheen | — |
| **Material grain** | Anodizing / plastic texture | body + caps | none on screens |

Rules:
- **No white outer shadows.** Highlights only ever live *on* the object (inset/bevel), never cast onto the body.
  The one exception is a crisp 1px chamfer line on the rim of a cutout (screens, grooves), since that is an edge.
- Shadow length scales with physical height: LED/print = 0, key = low, knob cap = high.
- Pressed = cast shadow collapses to contact shadow only + face darkens ~3%; key travels 1px down.
- All of this lives in **elevation tokens** (`--te-elev-0..3`, `--te-sunk-1..2`) so themes (black body)
  re-tune lighting in one place — on black, highlights get stronger and shadows weaker.

**Grain:** keep, but subtle (current fractal noise at overlay is about right on body; drop it on screens).

## 3. Color

Neutral-first. Accent is a scarce resource.

| Token | Value (silver) | Use |
|---|---|---|
| `--te-body` | `#e3e2de` | Card/device body |
| `--te-body-shade` | `#d0cfca` | Recesses, hub, sockets |
| `--te-plate` | `#eeede9` | Faceplate |
| `--te-ink` | `#1c1c1a` | Printed labels, icons |
| `--te-ink-dim` | `rgba(28,28,26,.55)` | Secondary labels, values |
| `--te-accent` | `#e8551d` | **The** orange: active state, primary/record, LEDs |
| `--te-led-off` | `rgba(0,0,0,.18)` | Unlit LED dot |
| `--te-screen-bg` | `#0d0f0c` | Display glass |
| `--te-screen-fg` | per screen theme | Lit pixels |

Cap palette (OP-1): `orange · white · grey · black · navy · tan`.

Screen themes: `vfd-amber`, `vfd-blue` (existing, kept — VFD stays a first-class look), `oled`
(white on black, TX-6/TP-7), `lcd` (K.O. II multicolor — orange/red/blue on black).
Old values `amber`/`blue` remain accepted as aliases.

**Accent budget:** at most **one** orange *control* per group (e.g. one accent button, or one orange knob row
like the TX-6 middle row). LEDs/indicators showing "on" are exempt — that's what they're for.

## 4. Typography

- **Printed labels:** UPPERCASE, 10–12px, weight 500–600, letter-spacing `0.04em`. Lowercase allowed only
  for function words TE writes lowercase (`shift`, `field`).
- **Model names / titles:** large, *light* weight (300–400), tight tracking — `TX-6`, `K.O. II`.
  Every component has its own model name (see §6a).
- **Subtitle:** Japanese katakana in accent orange (K.O.: `サンプラー`, `ミキサー`) — keep as the signature move.
- **Screens:** pixel fonts only — the 5×7 dot-matrix (existing) and a larger 7-segment/pixel numeral style
  for big values (`50`, `18.3`). Courier New is removed; compact mode uses a small pixel font.
- **Font family** **[?]** — TE uses a proprietary face. Options: (a) system stack (current),
  (b) bundle a free geometric grotesk (e.g. *Inter*, *Space Grotesk*), (c) let the user's HA theme decide.

## 5. Layout & Spacing

- **Base unit 4px**, spacing scale `4 · 8 · 12 · 16 · 24 · 32`.
- **Control slot:** each atomic control (knob, toggle, button) occupies a fixed square slot
  (proposal: 80×96 incl. labels) so they line up in columns like the TX-6's 6×3 knob grid.
- **Label placement:** label **above** the control, value/sublabel **below** (K.O. Sidekick: `GAIN` above
  knob, `HIGH` below). Always centered on the control axis.
- **Grouping:** use hairline **bracket lines** (K.O. II `BPM — METRONOME`, `GAIN`/`SWING` brackets) and
  thin dividers instead of boxes/borders to show relationships.
- **Corner radius:** body 20px (panel) / 8px (tile); keys 6px; caps fully round.
- Must work in HA **sections view** (`getGridOptions`) and masonry; minimum width ≈ one control slot.

## 6. Components (visual rules)

| Component | Physical reference | Rules |
|---|---|---|
| Knob | K.O. / TX-6 | Solid cap + short indicator notch; 270° sweep; optional sunk socket ring. Sizes S (TX-6 32px), M (48), L (64). |
| Dial / wheel | TP-7 platter, TX-6 encoder | Big flat disc, single diagonal hairline, centered hub screen. |
| Fader | TX-6, K.O. II | Black slot groove, small round or flat cap, LED dot column beside/above. |
| Key / button | K.O. II, OP-1 | Rounded-square keys (primary shape) and round buttons; label printed *on* key top-left for K.O.-style keys, centered glyph for transport (`● ▶ ■ + −`). |
| Toggle | TX-6 FX | Round bezel with a pill-shaped LED window; orange = on. |
| Display | TX-6 / TP-7 / K.O. | Sunk black glass; pixel text; status chips as outlined boxes (`L R`, `04`). |
| Panel | K.O. II / Sidekick | Body + faceplate with screws, model name, orange JP subtitle, optional tab strip on top edge (`OUTPUT  INPUT  USB`). |

### 6a. Model names

TE pattern: two letters + number, plus a katakana subtitle. The model name appears in the card picker,
editor header, playground and as the default panel title. Element names stay `te-*` for YAML.

| Element | Model | Subtitle | Why |
|---|---|---|---|
| `te-panel` | **CH-1** | シャーシ (chassis) | the chassis everything mounts in |
| `te-group` | **GR-2** | グループ | groups ≥2 modules |
| `te-popup` | **PP-3** | ポップアップ | pops up; 3 ways to close it |
| `te-knob` | **KN-3** | ノブ | — |
| `te-fader` | **FD-6** | フェーダー | nod to TX-6's six faders |
| `te-dial` | **DL-7** | ダイヤル | nod to TP-7's platter |
| `te-toggle` | **TG-1** | トグル | one bit: on/off |
| `te-button` | **BT-4** | ボタン | — |
| `te-dpad` | **DP-5** | 十字キー | 4 directions + OK = 5 |
| `te-display` | **DS-8** | ディスプレイ | 8-segment-ish screen |
| `te-mini-display` | **DS-2** | ミニ | small sibling of DS-8 |
| `te-matrix` | **DS-64** | マトリクス | 64×64 dots |
| `te-color-picker` | **CL-16** | カラー | 16M colors |
| `te-color-temp` | **CT-27** | 色温度 | 2700K, warm white |

New components pick the next unused code; numbers should carry a small joke or reference when possible.

## 7. Motion & Feedback

- Mechanical, not springy: `80–150ms`, `ease-out`, **no overshoot/bounce**.
- Press = shadow switches from raised to sunk instantly (≤80ms).
- LEDs snap on, fade off slightly (≤200ms).
- Hold-to-confirm: radial/linear fill in accent over `hold_ms`.
- DS-64 draws everything into a dot buffer (dim / lit / accent levels) at 15fps — graphs and appliance
  animations are pixel art, never smooth vector lines. Secondary figures use a tiny 3×5 font.
- Screens animate in *steps* (pixel-stepped marquee — already implemented), never smooth sub-pixel scrolling.
- Respect `prefers-reduced-motion` (stop marquee, no glow pulses).

## 8. Interaction & Accessibility

- Knob: vertical drag (existing) **+** scroll wheel **+** arrow keys. Dial: *relative* rotation (turn it like a platter — never jumps to the finger) + keys.
- All value controls expose `role="slider"` with `aria-valuemin/max/now/text`.
- Buttons are real `<button>`s activated by `click` (keyboard works for free).
- Focus ring: 2px accent outline offset 2px, only on `:focus-visible`.
- Touch targets ≥ 44px even if the visual is smaller (TX-6 knobs are tiny — the hit area isn't).
- Label contrast ≥ 4.5:1 on body (dim labels currently ~3.9:1 — needs a tweak).

## 9. Theming & Extensibility

- All visual values come from `--te-*` CSS custom properties; users can override per card or via HA theme.
- **Body themes** (`silver` default, `black`) are token sets, selectable globally (HA theme variable
  `te-theme`) and per card (`body:`). More themes (e.g. Playdate yellow) can be added as token sets only.
- `screen: vfd-amber | vfd-blue | oled | lcd` per card.
- New components must: use tokens only (no raw hex), reuse shared primitives (drag, hold, screen renderer),
  ship a stub config, an editor schema, and a playground story.

---

## Decisions (2026-10-24)

1. **Depth:** flatten, but keep tactility → "studio render" lighting model (§2), no neumorphic white shadows.
2. **Black body:** delivered as a theme (token set), not a per-component variant.
3. **Titles:** light-weight model names; each component gets a model name (§6a).
4. **Screens:** add `oled` and `lcd`, keep VFD amber/blue; pixel font replaces Courier New.
5. **Accent budget:** one orange control per group; lit LEDs exempt (revisit later).
6. **Config:** breaking changes allowed — move to HA-standard `tap_action` / `hold_action` and
   `action: perform-action` objects; drop ad-hoc `domain/service/value_key` where HA has a standard.

Still open: panel tab strip is decoration-only for now (could become functional tabs later).
Font: system stack by default, overridable via the `te-font-family` theme variable.
