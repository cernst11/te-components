# TE Components

Teenage Engineering-inspired custom cards for Home Assistant: knobs, faders, a TP-7 style dial,
TX-6 toggles, K.O.-style keys, a D-pad, and VFD / OLED / LCD pixel screens, plus a chassis card to mount
them in.

| Model | Card | What it is |
|---|---|---|
| **CH-1** シャーシ | `custom:te-panel` | Device chassis: screws, model name, katakana subtitle, rows of cards |
| **GR-2** グループ | `custom:te-group` | Several modules on one shared tile |
| **PP-3** ポップアップ | `custom:te-popup` | A key that opens a dialog holding any cards |
| **KN-3** ノブ | `custom:te-knob` | Rotary knob |
| **FD-6** フェーダー | `custom:te-fader` | Fader with LED ladder |
| **DL-7** ダイヤル | `custom:te-dial` | Platter dial with hub screen |
| **TG-1** トグル | `custom:te-toggle` | Round button with pill LED |
| **BT-4** ボタン | `custom:te-button` | Round / square / K.O. key button |
| **SW-5** セレクター | `custom:te-selector` | Mode selector: rotary switch or latching mode keys |
| **PD-16** パッド | `custom:te-pads` | K.O. II pad grid for scenes, scripts, switches |
| **DP-5** 十字キー | `custom:te-dpad` | Directional pad |
| **DS-8** ディスプレイ | `custom:te-display` | Main pixel screen: marquee, chips, progress |
| **DS-2** ミニ | `custom:te-mini-display` | Small screen row: icon + name/state |
| **SG-7** セグメント | `custom:te-segment` | Seven-segment numerals: value, clock, timer |
| **DS-64** マトリクス | `custom:te-matrix` | Large square dot-matrix: history graphs, appliance animations |
| **CL-16** カラー | `custom:te-color-picker` | Light color wheel with saved slots |
| **CT-27** 色温度 | `custom:te-color-temp` | Warm→cool white for tunable-white lights, with presets |

## Install

### HACS (recommended)

1. HACS → ⋮ → **Custom repositories** → add this repo's URL, category **Dashboard**.
2. Install **TE Components**, then reload the browser.

### Manual

Download `te-components.js` from the latest release into `config/www/`, then add a dashboard resource:

```yaml
url: /local/te-components.js
type: module
```

## Quick start

```yaml
type: custom:te-panel
title: K.O.
caption: Sidekick
subtitle: ミキサー
faceplate: true
cards:
  - type: custom:te-display
    entity: media_player.living_room
    progress: true
  - - type: custom:te-knob
      entity: media_player.living_room
      cap: orange
      label: GAIN
    - type: custom:te-knob
      entity: light.kitchen
      cap: white
      label: HIGH
  - - type: custom:te-fader
      entity: light.kitchen
      sublabel: "1"
    - type: custom:te-toggle
      entity: switch.fx
      label: FX
      glyph: I
```

Each `cards` entry is a row. A list inside it puts cards side by side.

A complete example dashboard (TV remote, lights, climate, scenes) is in
[`examples/dashboard.yaml`](examples/dashboard.yaml). Paste it into **Edit dashboard → ⋮ → Raw configuration
editor** and swap in your own entity IDs.

## Common options

All cards accept:

| Option | Default | |
|---|---|---|
| `label` / `sublabel` | — | Printed above / below the control |
| `tile` | `false` | Draw the card on its own body tile |
| `body` | `silver` | `silver` or `black` (TX-6 / TP-7 black) |

### Value controls (knob, fader, dial)

For these domains, `entity` is all you need. The card reads and writes the right attribute:

| Domain | Reads | Writes |
|---|---|---|
| `light` | `brightness` (shown as %) | `light.turn_on` |
| `media_player` | `volume_level` (shown as %) | `media_player.volume_set` |
| `climate` / `water_heater` | `temperature` (min/max/step from the entity) | `*.set_temperature` |
| `number` / `input_number` | state (min/max/step from the entity) | `*.set_value` |
| `fan` | `percentage` | `fan.set_percentage` |
| `cover` / `valve` | `current_position` | `*.set_*_position` |

Override with `attribute`, `min`, `max`, `step`, `unit`, `decimals`, `percent`. Knobs and faders show the
live value in the sublabel line while you adjust them; that line is always reserved so nothing shifts.
Set `show_value: false` to turn it off. For any other entity, provide
`set_action` and put `"{{ value }}"` where the new value goes:

```yaml
type: custom:te-knob
entity: sensor.anything
min: 0
max: 10
set_action:
  action: perform-action
  perform_action: script.set_level
  data:
    level: "{{ value }}"
```

Keyboard: arrow keys step, PgUp/PgDn jump 10%, Home/End go to min/max. The mouse wheel works while the
control is focused.

### Actions

Buttons, toggles and screens use Home Assistant's standard action objects (`tap_action`, `hold_action`):
`toggle`, `more-info`, `navigate`, `url`, `perform-action`, `none`. Two extras for media players:
`cycle-source` and `mute`. A `perform-action` with no `target` is sent to the card's `entity`.

## Cards

<details><summary><b>KN-3 knob</b> — <code>custom:te-knob</code></summary>

| Option | Default | |
|---|---|---|
| `cap` | `grey` | `orange`, `white`, `grey`, `black`, `navy`, `tan` |
| `size` | `l` | `s` (36px), `m` (52px), `l` (64px) |
| `socket` | `false` | Sit the knob in a sunk ring |

</details>

<details><summary><b>FD-6 fader</b> — <code>custom:te-fader</code></summary>

| Option | Default | |
|---|---|---|
| `orientation` | `vertical` | or `horizontal` |
| `cap` | `flat` | `flat` (K.O. cap with line) or `round` (TX-6 ball cap) |
| `dots` | `6` | LED ladder length; `0` removes it |
| `length` | `150` | Track length in px |
| `gradient` | — | CSS background for the groove |
| `label_tap_action` | mute / toggle | What tapping the sublabel does |

</details>

<details><summary><b>DL-7 dial</b> — <code>custom:te-dial</code></summary>

| Option | Default | |
|---|---|---|
| `size` | `180` | Diameter in px |
| `screen` | `vfd-amber` | Hub screen style |

</details>

<details><summary><b>TG-1 toggle</b> — <code>custom:te-toggle</code></summary>

| Option | Default | |
|---|---|---|
| `glyph` | — | Text in the LED window (`I`, `II`) |
| `on_state` | `on` | State that lights the LED |
| `tap_action` | `toggle` | |

</details>

<details><summary><b>BT-4 button</b> — <code>custom:te-button</code></summary>

| Option | Default | |
|---|---|---|
| `shape` | `round` | `round`, `square`, `key` (K.O. key, label printed on top) |
| `color` | `light` | `light`, `dark`, `grey`, `accent` |
| `icon` / `glyph` | — | MDI icon, or glyph: `record`, `play`, `stop`, `pause`, `plus`, `minus`, `dot`, or any text |
| `tap_action` / `hold_action` | `toggle` if entity | |
| `hold_time` | `600` | ms |
| `hold_to_confirm` | `false` | Tap does nothing; hold runs `tap_action` |
| `active_entity`, `active_attribute`, `active_state` | — | Lights the LED when matched |

</details>

<details><summary><b>SW-5 selector</b> — <code>custom:te-selector</code></summary>

Pick one of several options. `entity` is usually enough; the options and service come from the domain:

| Domain | Options | Writes |
|---|---|---|
| `input_select` / `select` | `options` | `*.select_option` |
| `climate` | `hvac_modes` | `climate.set_hvac_mode` |
| `fan` | `preset_modes` | `fan.set_preset_mode` |
| `media_player` | `source_list` | `media_player.select_source` |
| `light` | `effect_list` | `light.turn_on` (`effect`) |
| `water_heater` | `operation_list` | `water_heater.set_operation_mode` |

| Option | Default | |
|---|---|---|
| `style` | `rotary` | `rotary` (detented switch: turn it around its center, one click per detent; tap to step, tap a label) or `keys` (latching keys with LEDs) |
| `cap` | `grey` | Rotary knob cap color |
| `columns` | up to 4 | Keys per row |
| `options` | from the entity | Relabel or limit: `[{value: Spotify, label: SPOT}, …]` |
| `set_action` | — | For other entities; `"{{ value }}"` is the chosen option |

</details>

<details><summary><b>PD-16 pads</b> — <code>custom:te-pads</code></summary>

```yaml
type: custom:te-pads
columns: 4
pads:
  - entity: scene.movie
    label: Movie
    glyph: play
  - entity: script.goodnight
    icon: mdi:weather-night
  - entity: switch.coffee_machine
    color: accent
```

Scenes run `scene.turn_on`, scripts `script.turn_on`, automations `automation.trigger`, buttons `press`;
anything else toggles. The most recently activated scene stays lit; other entities light while `on`.
Each pad takes `label`, `icon`/`glyph`, `color` (`light`, `grey`, `dark`, `accent`), `tap_action`, `hold_action`.

</details>

<details><summary><b>DP-5 d-pad</b> — <code>custom:te-dpad</code></summary>

Sends `remote.send_command` to `entity`. Override `commands: {up, down, left, right, ok}` or give full
`actions: {up: <action>, ...}`.

</details>

<details><summary><b>DS-8 display</b> — <code>custom:te-display</code></summary>

| Option | Default | |
|---|---|---|
| `screen` | `vfd-amber` | `vfd-amber`, `vfd-blue`, `oled`, `lcd` |
| `attribute`, `unit`, `decimals` | — | Media players show artist – title automatically |
| `progress` | `false` | Segmented media progress bar |
| `chips` | `[]` | Status chips: `{entity, attribute?, value, label}` or `{entity, number: true}` |
| `height` | `92` | px |
| `text_size` | `2` | Dot size in px |
| `demo` | `false` | Cycle fake tracks (no entity needed) |

</details>

<details><summary><b>SG-7 segment</b> — <code>custom:te-segment</code></summary>

Big seven-segment numerals with unlit ghost segments and glow.

```yaml
type: custom:te-segment
entity: timer.pasta      # counts down while active; colon blinks
screen: lcd
```

| Option | Default | |
|---|---|---|
| `clock` | `false` | Show the time instead of an entity (`seconds`, `hour12`) |
| `digits` | content length | Fixed cell count; unused cells show unlit 8s |
| `attribute`, `unit`, `decimals` | from the entity | |
| `screen` | `vfd-amber` | `vfd-amber`, `vfd-blue`, `oled`, `lcd` |
| `height` | `96` | px |
| `tap_action` | `more-info` | |

</details>

<details><summary><b>DS-2 mini display</b> — <code>custom:te-mini-display</code></summary>

| Option | Default | |
|---|---|---|
| `icon` | `bulb` | `bulb`, `lamp`, `downlight`, `thermometer`, `droplet`, `molecule`, `plug`, `battery`, `blinds` |
| `compact` | `false` | Two lines: name above, value below |
| `scroll` | `false` | Marquee long text |
| `screen` | `vfd-amber` | |
| `tap_action` | toggle / more-info | |

</details>

<details><summary><b>DS-64 matrix</b> — <code>custom:te-matrix</code></summary>

A 64×64 dot-matrix screen. Everything is drawn in dots, so it looks like the hardware.

**Graph** (default): a big value plus the entity's history, loaded from HA's recorder and updated live.

```yaml
type: custom:te-matrix
entity: sensor.outdoor_temperature
label: OUTSIDE
hours: 24
style: area        # area | line | bars
decimals: 1
unit: "°"
```

**Appliance**: an animation runs while the appliance is active, with status, time left and progress.

```yaml
type: custom:te-matrix
mode: appliance
animation: washer  # washer | dryer | dishwasher | fan | car
entity: sensor.washer_status
label: WASHER
remaining_entity: sensor.washer_remaining   # minutes, "h:mm:ss", or a finish timestamp
progress_entity: sensor.washer_progress     # percent
```

| Option | Default | |
|---|---|---|
| `mode` | `graph` (`appliance` if `animation` is set) | |
| `screen` | `vfd-amber` | `vfd-amber`, `vfd-blue`, `oled`, `lcd` |
| `dots` / `aspect` | `64` / `1` | Dots across; height ÷ width (`0.6` makes a wide graph) |
| `hours`, `style`, `min`, `max` | `24`, `area`, auto | Graph window, style and y range |
| `unit`, `decimals` | from the entity | Value formatting |
| `active_state` | any state except off/idle/standby/done/… | State(s) that count as running |
| `status_entity` | `entity` | Shown in the footer (e.g. `RINSE`) |
| `tap_action` | `more-info` | |

`fan` spins at the fan's `percentage`; the washer spins fast when the status contains `spin`.

`car` is an EV side profile. While charging (any active state), a cable runs from the wall charger to the
charge port with pulses flowing in; if the status contains `driving`, the wheels turn and the road scrolls.
`progress_entity` (battery %) fills the battery pack along the floor.

```yaml
type: custom:te-matrix
mode: appliance
animation: car
entity: sensor.model_3_charging            # charging / complete / disconnected …
label: MODEL 3
progress_entity: sensor.model_3_battery
remaining_entity: sensor.model_3_time_to_full
```

</details>

<details><summary><b>CL-16 color picker</b> — <code>custom:te-color-picker</code></summary>

`entity` is a light. `slots` takes up to 3 `input_text` entities: hold a slot to save the current color,
tap it to recall the color.

</details>

<details><summary><b>CT-27 color temp</b> — <code>custom:te-color-temp</code></summary>

`entity` is a light that supports `color_temp`. Tap the swatch for a warm→cool fader (sends
`color_temp_kelvin`; range from the light's `min_color_temp_kelvin`/`max_color_temp_kelvin`), brightness, and presets.
The value line shows the current white, e.g. `2700K`.

| Option | Default | |
|---|---|---|
| `presets` | Warm 2700 / Neutral 4000 / Day 6500 | List of `{label, kelvin}` or plain numbers |
| `min` / `max` | from the light | Override the kelvin range |

Knobs and faders can also drive color temperature: `attribute: color_temp_kelvin` on a light entity.

</details>

<details><summary><b>PP-3 popup</b> — <code>custom:te-popup</code></summary>

A key on the dashboard; tapping it opens a dialog with any cards inside, laid out in rows like CH-1.
Close with the ×, Escape or the backdrop. Dialogs opened from inside it (like CL-16) stack on top.

```yaml
type: custom:te-popup
label: Car
icon: mdi:car-electric
title: Model 3
cards:
  - type: custom:te-matrix
    mode: appliance
    animation: car
    entity: sensor.model_3_charging
  - - type: custom:te-mini-display
      entity: sensor.model_3_battery
    - type: custom:te-mini-display
      entity: sensor.model_3_time_to_full
```

| Option | Default | |
|---|---|---|
| `label`, `icon`, `glyph`, `entity` | `More` | Style the default trigger (a grey K.O. key; `entity` lights its LED) |
| `trigger` | K.O. key | Any card config to use as the trigger instead; its own tap action is disabled |
| `title` | `label` | Dialog heading |
| `width` / `gap` | `420` / `8` | Dialog width and card spacing in px |
| `body` | inherited | `silver` or `black`; passed to the cards inside |

</details>

<details><summary><b>GR-2 group / CH-1 panel</b></summary>

Group: `cards`, `direction` (`row`/`column`), `gap`, `tile` (default `true`).

Panel: `title`, `caption`, `subtitle`, `faceplate`, `tabs` (strings or `{label, color}`), `gap` (default 8),
`cards` (rows).
`body` on a panel or group is inherited by its children.

</details>

## Theming

- **Black body everywhere:** add `te-theme: black` to your HA theme, or set `body: black` per card or panel.
- **Accent color:** `te-theme-accent: "#e8551d"` in your HA theme.
- **Font:** `te-font-family: "Inter"` (the font must be loaded by your theme).

## Migrating from the original single-file version

| Old | New |
|---|---|
| `domain` / `service` / `value_key` | Not needed for supported domains; otherwise `set_action` |
| `cap_color` | `cap` |
| `container: true` | `socket: true` |
| `theme: amber` / `blue` | `screen: vfd-amber` / `vfd-blue` (old values still work) |
| `icons:` on te-display | `chips:` (old key still works) |
| te-button `domain`/`service`/`data` | `tap_action: {action: perform-action, perform_action: x.y, data: …}` |
| te-button `action: cycle_source` | `tap_action: {action: cycle-source}` |
| te-button `hold_ms` | `hold_to_confirm: true` + `hold_time` |
| te-button `accent: true` | `color: accent` |
| te-button `active_value` | `active_state` (shown as an LED) |
| te-fader `toggle_action: mute` / `toggle_*` | `label_tap_action` |
| te-mini-display `readonly: true` | `tap_action: {action: none}` |
| te-mini-display `toggle_*` | `tap_action` |

## Development

```sh
npm install
npm run dev        # playground at http://localhost:5173 with a mock Home Assistant
                   # (#dashboard shows a full example home: TV, lights, climate, scenes)
npm run export:dashboard   # regenerate examples/dashboard.yaml from playground/dashboard.ts
npm run build      # dist/te-components.js
npm run typecheck
```

See `DESIGN.md` for the design guidelines and `AGENTS.md` for architecture notes.
