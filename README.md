# TE Components

Custom Lovelace cards for Home Assistant, inspired by Teenage Engineering hardware: knobs, faders, a TP-7 style
dial, TX-6 toggles, K.O. II keys and pads, alarm keypads, LED strips, meters, and VFD / OLED / LCD pixel
screens, plus a chassis card to mount them in.

![Example dashboard: a black CH-1 TV remote and a LIGHTS panel with mini displays, faders and keys](https://raw.githubusercontent.com/cernst11/te-components/master/docs/images/dashboard.png)

- **24 cards, one file.** Everything ships in a single `te-components.js` with no external requests.
- **Point it at an entity.** Lights, media players, thermostats, fans, covers, locks, alarms and more work
  without any service configuration.
- **Visual editor.** Every card shows up in the card picker with a live preview and a form editor.
- **Silver or black body**, four screen styles, optional haptics and click sounds, full keyboard support.

## Contents

- [Install](#install)
- [Quick start](#quick-start)
- [Components](#components)
- [Shared options](#shared-options)
- [Containers](#containers): CH-1 · GR-2 · PP-3
- [Controls](#controls): KN-3 · FD-6 · DL-7 · TG-1 · BT-4 · SW-5 · SL-2 · KP-12 · PD-16 · DP-5 · CL-16 · CT-27
- [Screens and indicators](#screens-and-indicators): DS-8 · DS-2 · SG-7 · DS-64 · VU-10 · LD-8
- [Layout and decoration](#layout-and-decoration): SP-1 · BL-0
- [Theming](#theming)
- [Development](#development)
- [License](#license)

## Install

Requires Home Assistant 2024.8 or newer.

### HACS (recommended)

1. HACS → ⋮ → **Custom repositories** → add `https://github.com/cernst11/te-components`, category **Dashboard**.
2. Install **TE Components**, then reload the browser.

### Manual

Download `te-components.js` from the [latest release](https://github.com/cernst11/te-components/releases/latest)
into `config/www/`, then add a dashboard resource (**Settings → Dashboards → ⋮ → Resources**):

```yaml
url: /local/te-components.js
type: module
```

## Quick start

Add any card from the card picker (search for "TE" or a model name like "KN-3"), or paste YAML:

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

## Components

| Model | Card | What it is |
|---|---|---|
| **Containers** | | |
| [**CH-1** シャーシ](#ch-1-panel) | `custom:te-panel` | Device chassis: screws, model name, katakana subtitle, rows of cards, tab pages |
| [**GR-2** グループ](#gr-2-group) | `custom:te-group` | Several modules on one shared tile |
| [**PP-3** ポップアップ](#pp-3-popup) | `custom:te-popup` | A key that opens a dialog holding any cards |
| **Controls** | | |
| [**KN-3** ノブ](#kn-3-knob) | `custom:te-knob` | Rotary knob |
| [**FD-6** フェーダー](#fd-6-fader) | `custom:te-fader` | Fader with LED ladder |
| [**DL-7** ダイヤル](#dl-7-dial) | `custom:te-dial` | TP-7 platter dial with hub screen |
| [**TG-1** トグル](#tg-1-toggle) | `custom:te-toggle` | TX-6 round toggle with pill LED |
| [**BT-4** ボタン](#bt-4-button) | `custom:te-button` | Round / square / K.O. key button |
| [**SW-5** セレクター](#sw-5-selector) | `custom:te-selector` | Mode selector: rotary switch or latching mode keys |
| [**SL-2** スライド](#sl-2-slide-switch) | `custom:te-slide` | Slide-to-confirm switch for locks, garage doors, valves |
| [**KP-12** テンキー](#kp-12-alarm-keypad) | `custom:te-keypad` | Alarm keypad: PIN, arm modes, hold to disarm |
| [**PD-16** パッド](#pd-16-pads) | `custom:te-pads` | K.O. II pad grid for scenes, scripts, switches |
| [**DP-5** 十字キー](#dp-5-d-pad) | `custom:te-dpad` | Directional pad for remotes |
| [**CL-16** カラー](#cl-16-color-picker) | `custom:te-color-picker` | Light color wheel with saved slots |
| [**CT-27** 色温度](#ct-27-color-temp) | `custom:te-color-temp` | Warm→cool white for tunable-white lights, with presets |
| **Screens and indicators** | | |
| [**DS-8** ディスプレイ](#ds-8-display) | `custom:te-display` | Main pixel screen: marquee, chips, progress |
| [**DS-2** ミニ](#ds-2-mini-display) | `custom:te-mini-display` | Small screen row: icon + name/state |
| [**SG-7** セグメント](#sg-7-segment) | `custom:te-segment` | Seven-segment numerals: value, clock, timer |
| [**DS-64** マトリクス](#ds-64-matrix) | `custom:te-matrix` | Large dot-matrix: history graphs, appliance animations |
| [**VU-10** メーター](#vu-10-meter) | `custom:te-meter` | Level meter: LED bar or analog needle |
| [**LD-8** インジケーター](#ld-8-led-strip) | `custom:te-leds` | Row of labelled status LEDs |
| **Layout and decoration** | | |
| [**SP-1** スピーカー](#sp-1-grille) | `custom:te-grille` | Decorative speaker grille, optional LED |
| [**BL-0** ブランク](#bl-0-spacer) | `custom:te-spacer` | Empty cell to keep rows lined up |

## Shared options

All cards accept:

| Option | Default | |
|---|---|---|
| `label` / `sublabel` | — | Printed above / below the control |
| `tile` | `false` | Draw the card on its own body tile |
| `body` | `silver` | `silver` or `black` (TX-6 / TP-7 black) |
| `feedback` | `off` | Interactive cards: `haptic`, `sound` or `both` — a tick per knob/selector detent, a click per key press. Set `te-feedback` in your HA theme to turn it on everywhere |

Cards with a screen take `screen`: `vfd-amber` (default), `vfd-blue`, `oled` or `lcd`.

### Value controls

KN-3, FD-6 and DL-7 need only an `entity` for these domains. The card reads and writes the right attribute:

| Domain | Reads | Writes |
|---|---|---|
| `light` | `brightness` (shown as %) | `light.turn_on` |
| `media_player` | `volume_level` (shown as %) | `media_player.volume_set` |
| `climate` / `water_heater` | `temperature` (min/max/step from the entity) | `*.set_temperature` |
| `number` / `input_number` | state (min/max/step from the entity) | `*.set_value` |
| `fan` | `percentage` | `fan.set_percentage` |
| `cover` / `valve` | `current_position` | `*.set_*_position` |

Override with `attribute`, `min`, `max`, `step`, `unit`, `decimals`, `percent`. `attribute: color_temp_kelvin`
on a light drives its white temperature. Knobs and faders show the live value in the sublabel line while you
adjust them; that line is always reserved so nothing shifts. Set `show_value: false` to turn it off.

On a thermostat (`climate`, `water_heater`) the line under the control shows what it is doing: `HEATING` /
`COOLING` in orange while it runs, otherwise `ON` or `OFF`. A `sublabel` replaces it.

For any other entity, provide `set_action` and put `"{{ value }}"` where the new value goes:

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

Buttons, toggles, pads and screens use Home Assistant's standard action objects (`tap_action`, `hold_action`):
`toggle`, `more-info`, `navigate`, `url`, `perform-action`, `none`. A `perform-action` with no `target` is sent
to the card's `entity`. Extras:

| Action | |
|---|---|
| `cycle-source` | Media player: step to the next source |
| `mute` | Media player: toggle mute |
| `light-dialog` | Open the light dialog for the card's light (or `entity:`): brightness plus a COLOR and/or WHITE page, depending on what the light supports. `mode: color` / `mode: white` picks the first page |

## Containers

All three have a visual editor for their child cards: each row shows its cards as chips. Pick a chip to edit that
card with Home Assistant's own card editor (visual or code), move it left, right or to another row, duplicate or
delete it. **+ Card** adds a card to a row from the card picker, **+ Row** starts a new row, and selecting a row
lets you set its bracket label. On CH-1, the page bar switches between the cards that are always shown and each
tab's page, and adds, renames or removes tabs.

### CH-1 Panel

`custom:te-panel` — the device chassis: screws, a model name, a katakana subtitle, and rows of any cards
(TE cards or HA's own).

```yaml
type: custom:te-panel
title: TE—HOME
caption: Living room
subtitle: リビング
reset_after: 120
cards:
  - { type: custom:te-segment, clock: true }      # always shown
tabs:
  - label: Lights
    cards:
      - [ { type: custom:te-fader, entity: light.kitchen }, { type: custom:te-fader, entity: light.hallway } ]
  - label: Climate
    color: grey
    cards:
      - [ { type: custom:te-selector, entity: climate.living_room }, { type: custom:te-selector, entity: climate.living_room, list: preset_modes, style: keys } ]
```

| Option | Default | |
|---|---|---|
| `title` / `caption` / `subtitle` | — | Model name, caption and katakana line on the faceplate |
| `faceplate` | `false` | Put the title on a lighter screwed-on faceplate (K.O. / MIC FX) |
| `cards` | — | Rows; a list inside a row puts cards side by side |
| `tabs` | — | Strings, or `{label, color, cards, tap_action}` |
| `default_tab` | `0` | Tab selected on load; `-1` starts with no page open |
| `reset_after` | — | Seconds without a touch before going back to `default_tab` (wall displays) |
| `gap` | `8` | Card spacing in px |
| `body` | `silver` | Inherited by the cards inside |

**Pages:** give a tab its own `cards` and the strip switches pages — the selected tab sits pressed in with its
LED lit (arrow keys move between tabs); tap the lit tab again to close its page. The panel's own `cards` stay on
screen above every page, and tabs without `cards` are decoration.

**Links:** a tab with a `tap_action` runs it instead of opening a page. Give each room its own view with the
same tab strip: on each view, the room's own tab holds its `cards` (set `default_tab` to it so it's lit) and
the other tabs navigate to their views. Each phone page then only loads one room.

```yaml
# view /dashboard-te/m-bedroom
type: custom:te-panel
title: BEDROOM
default_tab: 1
tabs:
  - { label: Home, tap_action: { action: navigate, navigation_path: /dashboard-te/m-home } }
  - label: Bedroom
    cards:
      - [ { type: custom:te-fader, entity: light.bedroom }, { type: custom:te-knob, entity: fan.bedroom } ]
  - { label: Office, tap_action: { action: navigate, navigation_path: /dashboard-te/m-office } }
```

**Bracket labels** (K.O. II `BPM — METRONOME`): write a row as `{ bracket, cards }`. A string spans the
whole row; a list splits it, each item spanning `span` cards (default 1); an empty label leaves those cards
without a bracket. Works in PP-3 popups too.

```yaml
cards:
  - bracket: [{ label: TRANSPORT, span: 3 }, OUT]
    cards:
      - { type: custom:te-button, glyph: prev }
      - { type: custom:te-button, glyph: play }
      - { type: custom:te-button, glyph: next }
      - { type: custom:te-knob, entity: media_player.tv, label: VOL }
```

### GR-2 Group

`custom:te-group` — several modules on one shared tile, e.g. a mini display above a fader.

```yaml
type: custom:te-group
direction: column
cards:
  - { type: custom:te-mini-display, entity: light.kitchen, show_name: false }
  - { type: custom:te-fader, entity: light.kitchen, label: KITCHEN }
```

| Option | Default | |
|---|---|---|
| `cards` | — | Cards to group |
| `direction` | `row` | `row` or `column` |
| `gap` | `12` | px |
| `tile` | `true` | Draw the shared tile |
| `body` | `silver` | Inherited by the cards inside |

### PP-3 Popup

`custom:te-popup` — a key on the dashboard; tapping it opens a dialog with any cards inside, laid out in rows
like CH-1. Close with the ×, Escape or the backdrop. Dialogs opened from inside it (like CL-16) stack on top.

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

## Controls

### KN-3 Knob

`custom:te-knob` — rotary knob. Drag vertically to set a value. See [Value controls](#value-controls) for
supported domains.

```yaml
type: custom:te-knob
entity: media_player.living_room
cap: orange
label: VOL
```

| Option | Default | |
|---|---|---|
| `cap` | `grey` | `orange`, `white`, `grey`, `black`, `navy`, `tan` |
| `size` | `l` | `s` (36px), `m` (52px), `l` (64px) |
| `socket` | `false` | Sit the knob in a sunk ring |

### FD-6 Fader

`custom:te-fader` — fader with an LED dot ladder, vertical or horizontal. See [Value controls](#value-controls).

```yaml
type: custom:te-fader
entity: light.kitchen
label: KITCHEN
cap: round
```

| Option | Default | |
|---|---|---|
| `orientation` | `vertical` | or `horizontal` |
| `cap` | `flat` | `flat` (K.O. cap with line) or `round` (TX-6 ball cap) |
| `dots` | `6` | LED ladder length; `0` removes it |
| `length` | `150` | Track length in px |
| `gradient` | — | CSS background for the groove |
| `label_tap_action` | mute / toggle | What tapping the sublabel does |

### DL-7 Dial

`custom:te-dial` — TP-7 style platter dial with a value screen in the hub. Spin it to set a value; see
[Value controls](#value-controls).

```yaml
type: custom:te-dial
entity: climate.living_room
size: 200
```

| Option | Default | |
|---|---|---|
| `size` | `180` | Diameter in px |
| `screen` | `vfd-amber` | Hub screen style |

### TG-1 Toggle

`custom:te-toggle` — TX-6 FX style round toggle with a pill LED. Works with locks too: lit while locked, a tap
locks, and unlocking takes a hold (the sublabel reads HOLD).

```yaml
type: custom:te-toggle
entity: lock.front_door
label: DOOR
```

| Option | Default | |
|---|---|---|
| `glyph` | — | Text in the LED window (`I`, `II`) |
| `on_state` | `on` (`locked` for locks) | State that lights the LED |
| `tap_action` | `toggle` | Locks lock/unlock |
| `confirm_unlock` | `true` | Locks only: unlocking needs a press-and-hold, locking is a tap |
| `hold_time` | `700` | ms, for `confirm_unlock` |

### BT-4 Button

`custom:te-button` — momentary button: round, square or K.O. key, with an optional hold action.

```yaml
type: custom:te-button
shape: key
color: accent
glyph: play
tap_action:
  action: perform-action
  perform_action: media_player.media_play_pause
  target: { entity_id: media_player.living_room }
```

| Option | Default | |
|---|---|---|
| `shape` | `round` | `round`, `square`, `key` (K.O. key, label printed on top) |
| `color` | `light` | `light`, `dark`, `grey`, `accent` |
| `icon` / `glyph` | — | MDI icon, or glyph: `record`, `play`, `stop`, `pause`, `prev`, `next`, `plus`, `minus`, `dot`, or any text |
| `tap_action` / `hold_action` | `toggle` if entity | |
| `hold_time` | `600` | ms |
| `hold_to_confirm` | `false` | Tap does nothing; hold runs `tap_action` |
| `active_entity`, `active_attribute`, `active_state` | — | Lights the LED when matched |

### SW-5 Selector

`custom:te-selector` — pick one of several options with a detented rotary switch or a row of latching keys.
`entity` is usually enough; the options and service come from the domain:

| Domain | Options | Writes |
|---|---|---|
| `input_select` / `select` | `options` | `*.select_option` |
| `climate` | `hvac_modes` | `climate.set_hvac_mode` |
| `fan` | `preset_modes` | `fan.set_preset_mode` |
| `media_player` | `source_list` | `media_player.select_source` |
| `light` | `effect_list` | `light.turn_on` (`effect`) |
| `water_heater` | `operation_list` | `water_heater.set_operation_mode` |
| `humidifier` | `available_modes` | `humidifier.set_mode` |

Set `list` to use another of the entity's lists — a thermostat's presets next to its HVAC mode:

| Domain | `list` |
|---|---|
| `climate` | `hvac_modes` (default), `preset_modes`, `fan_modes`, `swing_modes` |
| `fan` | `preset_modes` (default), `direction` |
| `media_player` | `source_list` (default), `sound_mode_list` |

```yaml
- { type: custom:te-selector, entity: climate.living_room, label: MODE }
- { type: custom:te-selector, entity: climate.living_room, list: preset_modes, label: PRESET, style: keys }
```

| Option | Default | |
|---|---|---|
| `style` | `rotary` | `rotary` (detented switch: turn it around its center, one click per detent; tap to step, tap a label; laid out 200px wide and scaled down in narrower cells, so give it half a panel or more) or `keys` (latching keys with LEDs) |
| `cap` | `grey` | Rotary knob cap color |
| `columns` | up to 4 | Keys per row |
| `list` | domain default | Which of the entity's lists to use (table above) |
| `options` | from the entity | Relabel or limit: `[{value: Spotify, label: SPOT}, …]` |
| `set_action` | — | For other entities; `"{{ value }}"` is the chosen option |

### SL-2 Slide switch

`custom:te-slide` — TP-7 style side switch. Slide the thumb all the way across to commit; let go early and it
springs back, so a stray tap can't open the garage. Arrow keys work too.

```yaml
type: custom:te-slide
entity: cover.garage_door
label: GARAGE
```

| Domain | Left | Right |
|---|---|---|
| `lock` | locked (`lock.lock`) | unlocked (`lock.unlock`) |
| `cover` | closed (`cover.close_cover`) | open (`cover.open_cover`) |
| `valve` | closed | open |
| anything else | off (`*.turn_off`) | on (`*.turn_on`) |

While the entity is `locking`/`opening`/… the thumb waits at the target and its LED blinks. The safe end lights
neutral, the open end orange.

| Option | Default | |
|---|---|---|
| `left_label` / `right_label` | from the domain | Relabel the ends |

### KP-12 Alarm keypad

`custom:te-keypad` — for `alarm_control_panel`. Type the code, then press an arm key; hold the disarm key to
disarm. The arm keys follow the panel's `supported_features`, their LEDs show the armed mode and blink while
arming. A wrong code (HA rejects the service call) flashes `WRONG CODE` on the screen. Panels without a
`code_format` hide the number pad. A focused screen also takes digits, Backspace, Escape (clear) and Enter
(disarm).

```yaml
type: custom:te-keypad
entity: alarm_control_panel.house
modes: [home, away]     # optional; default = what the panel supports
```

| Option | Default | |
|---|---|---|
| `modes` | supported ones | Any of `home`, `away`, `night`, `vacation`, `custom_bypass` |
| `hold_time` | `800` | ms to hold the disarm key |
| `screen` | `vfd-amber` | Screen style |
| `sublabel` | `Hold to disarm` | Text on the disarm key |

### PD-16 Pads

`custom:te-pads` — K.O. II pad grid for scenes, scripts and switches.

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

| Option | Default | |
|---|---|---|
| `pads` | — | Each pad: `entity`, `label`, `icon`/`glyph`, `color` (`light`, `grey`, `dark`, `accent`), `tap_action`, `hold_action` |
| `columns` | up to 4 | Pads per row |
| `hold_time` | `600` | ms |

### DP-5 D-pad

`custom:te-dpad` — directional pad that sends `remote.send_command` to `entity`.

```yaml
type: custom:te-dpad
entity: remote.living_room_tv
commands:
  ok: DPAD_CENTER
```

| Option | Default | |
|---|---|---|
| `commands` | `DPAD_UP`, `DPAD_DOWN`, `DPAD_LEFT`, `DPAD_RIGHT`, … | `{up, down, left, right, ok}` command names |
| `actions` | — | Full action per direction: `{up: <action>, …}`; replaces the command |

### CL-16 Color picker

`custom:te-color-picker` — a color swatch for a light. Tap it for the light dialog: HS wheel and brightness, plus
a COLOR | WHITE switch if the light also does tunable white.

```yaml
type: custom:te-color-picker
entity: light.desk_strip
slots: [input_text.color_1, input_text.color_2, input_text.color_3]
```

| Option | Default | |
|---|---|---|
| `slots` | — | Up to 3 `input_text` entities: hold a slot to save the current color, tap it to recall |

### CT-27 Color temp

`custom:te-color-temp` — for lights that support `color_temp`. Tap the swatch for a warm→cool fader (sends
`color_temp_kelvin`; range from the light's `min_color_temp_kelvin`/`max_color_temp_kelvin`), brightness, and
presets. The value line shows the current white, e.g. `2700K`.

```yaml
type: custom:te-color-temp
entity: light.bedroom
presets: [{ label: Candle, kelvin: 2200 }, 4000, 6500]
```

| Option | Default | |
|---|---|---|
| `presets` | Warm 2700 / Neutral 4000 / Day 6500 | List of `{label, kelvin}` or plain numbers |
| `min` / `max` | from the light | Override the kelvin range |

## Screens and indicators

### DS-8 Display

`custom:te-display` — the main pixel screen, with marquee text, status chips and a progress bar. Media players
show artist – title automatically.

```yaml
type: custom:te-display
entity: media_player.living_room
progress: true
chips:
  - { entity: media_player.living_room, attribute: shuffle, value: true, label: SHUF }
```

| Option | Default | |
|---|---|---|
| `screen` | `vfd-amber` | `vfd-amber`, `vfd-blue`, `oled`, `lcd` |
| `attribute`, `unit`, `decimals` | — | What to show for non-media entities |
| `progress` | `false` | Segmented media progress bar |
| `chips` | `[]` | Status chips: `{entity, attribute?, value, label}` or `{entity, number: true}` |
| `height` | `92` | px |
| `text_size` | `2` | Dot size in px |
| `demo` | `false` | Cycle fake tracks (no entity needed) |

### DS-2 Mini display

`custom:te-mini-display` — a compact screen row: pixel icon plus name and state. Pair it with a fader or knob in
a GR-2 group.

```yaml
type: custom:te-mini-display
entity: sensor.living_room_temperature
icon: thermometer
```

| Option | Default | |
|---|---|---|
| `icon` | `bulb` | `bulb`, `lamp`, `downlight`, `thermometer`, `droplet`, `molecule`, `plug`, `battery`, `blinds`, or `none` (text uses the whole screen) |
| `compact` | `false` | Two lines: name above, value below |
| `show_name` | `true` | `false` shows the value only (e.g. above a fader that carries the name) |
| `attribute`, `unit`, `decimals` | from the entity | |
| `scroll` | `false` | Marquee long text |
| `screen` | `vfd-amber` | |
| `tap_action` | toggle / more-info | |
| `hold_action` | `light-dialog` for lights, else more-info | Long-press (500ms) |

### SG-7 Segment

`custom:te-segment` — big seven-segment numerals with unlit ghost segments and glow, for a value, a clock, or an
HA timer counting down.

```yaml
type: custom:te-segment
entity: timer.pasta      # counts down while active; colon blinks
screen: lcd
```

| Option | Default | |
|---|---|---|
| `clock` | `false` | Show the time instead of an entity (`seconds`, `hour12`) |
| `blink` | `true` | Blink the colon (clock, running timer); `false` keeps it lit |
| `digits` | content length | Fixed cell count; unused cells show unlit 8s |
| `attribute`, `unit`, `decimals` | from the entity | |
| `screen` | `vfd-amber` | `vfd-amber`, `vfd-blue`, `oled`, `lcd` |
| `height` | `96` | px |
| `tap_action` | `more-info` | |

### DS-64 Matrix

`custom:te-matrix` — a 64×64 dot-matrix screen. Everything is drawn in dots, so it looks like the hardware.

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

`fan` spins at the fan's `percentage`; the washer spins fast when the status contains `spin`.

`car` is an EV side profile. While charging (any active state), the wall charger appears and a cable runs
from it to the charge port with pulses flowing in; if the status contains `driving`, the wheels turn and the road
scrolls. `progress_entity` (battery %) drives the bar and the % readout.

| Option | Default | |
|---|---|---|
| `mode` | `graph` (`appliance` if `animation` is set) | |
| `screen` | `vfd-amber` | `vfd-amber`, `vfd-blue`, `oled`, `lcd` |
| `dots` / `aspect` | `64` / `1` | Dots across; height ÷ width (`0.6` makes a wide graph) |
| `hours`, `style`, `min`, `max` | `24`, `area`, auto | Graph window, style and y range |
| `unit`, `decimals` | from the entity | Value formatting |
| `animation` | — | `washer`, `dryer`, `dishwasher`, `fan`, `car` |
| `active_state` | any state except off/idle/standby/done/… | State(s) that count as running |
| `status_entity` | `entity` | Shown in the footer (e.g. `RINSE`); while it reads `none`/`unknown`, the footer shows `entity` |
| `remaining_entity` / `progress_entity` | — | Time left and percent done |
| `tap_action` | `more-info` | |

### VU-10 Meter

`custom:te-meter` — level meter for power, battery, CO₂ or volume: a segmented LED bar or an analog needle,
with a warn threshold and peak hold.

```yaml
type: custom:te-meter
entity: sensor.power
max: 2000
warn: 1200          # segments above light orange
segments: 16
```

| Option | Default | |
|---|---|---|
| `style` | `bar` | `bar` (LED segments in a screen window) or `needle` (analog VU, accent arc above `warn`) |
| `orientation` | `horizontal` | Bar only |
| `segments` | `12` | Bar segment count (3–32) |
| `min` / `max` | 0 / 100, or from the domain | Sensors usually need `max` |
| `warn` | — | Threshold in the entity's units |
| `peak` | `true` | Hold the highest recent segment for 2.5s |
| `screen` | `vfd-amber` | Bar window style |
| `show_value` | `true` | Value under the meter |

### LD-8 LED strip

`custom:te-leds` — a row of labelled status LEDs for doors, windows, motion and presence.

```yaml
type: custom:te-leds
summary: OPEN            # prints "2 OPEN" under the strip
entities:
  - binary_sensor.front_door
  - entity: binary_sensor.hall_motion
    label: Motion
  - entity: person.alex
    color: neutral        # ink instead of orange, for plain status
```

Lit means `on`/`open` for sensors and switches, `home` for people, not `locked` for locks, not `closed` for
covers, not `disarmed` for alarms. Leaks, smoke, `triggered` and `jammed` blink. Tap an LED for more-info.

| Option | Default | |
|---|---|---|
| `entities` | — | Entity IDs, or `{entity, label, color, on_state, blink}` |
| `summary` | — | Word printed after the count of lit LEDs |
| `columns` | one row | Wrap after this many LEDs |

## Layout and decoration

### SP-1 Grille

`custom:te-grille` — a decorative speaker grille: the MIC FX dot field or a round K.O. II speaker. Give it an
`entity` (a speaker) and it gets an LED that lights while playing, and opens more-info on tap.

```yaml
type: custom:te-grille
pattern: round        # or grid
height: 120
entity: media_player.kitchen
```

| Option | Default | |
|---|---|---|
| `pattern` | `grid` | `grid` (dot field across the card) or `round` (concentric rings) |
| `height` | `72` | px |
| `pitch` | `7` | Hole spacing in px |
| `entity` | — | Optional; lights the LED while on/playing |

### BL-0 Spacer

`custom:te-spacer` — an empty cell. Rows in CH-1/PP-3 split their width evenly, so a spacer holds a column open —
e.g. to push ON/OFF keys under the last faders of a room.

```yaml
- [ { type: custom:te-spacer }, { type: custom:te-button, label: "On" }, { type: custom:te-button, label: "Off" } ]
```

| Option | Default | |
|---|---|---|
| `height` | — | Minimum height in px; otherwise it takes its row's height |

## Theming

Set these in your [HA theme](https://www.home-assistant.io/integrations/frontend/#defining-themes) to apply them
to every card:

| Theme variable | |
|---|---|
| `te-theme: black` | Black body everywhere (or `body: black` per card or panel) |
| `te-theme-accent: "#e8551d"` | Accent color |
| `te-font-family: "Inter"` | Font (it must be loaded by your theme) |
| `te-feedback: haptic` | Or `sound`, `both`. Haptics work in the HA companion apps (and Android browsers); sounds need a first tap on the page before browsers allow audio |

## Development

```sh
npm install
npm run dev        # playground at http://localhost:5173 with a mock Home Assistant
                   # (#dashboard shows a full example home: TV, lights, climate, scenes)
npm run export:dashboard   # regenerate examples/dashboard.yaml from playground/dashboard.ts
npm run build      # dist/te-components.js
npm run typecheck
npm test           # unit tests + card-picker check in headless Chromium
                   # (first time: npx playwright install chromium)
```

See [`DESIGN.md`](DESIGN.md) for the design guidelines, [`AGENTS.md`](AGENTS.md) for architecture notes and
how to add a component, and [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a pull request.

## License

Copyright © 2026 cernst11. Licensed under the [GNU General Public License v3.0 or later](LICENSE).

You may use, study, change and share this code. If you distribute a modified version, it must stay under the
GPL with its source available. For use under other terms (e.g. in a closed-source product), contact the author
about a commercial license.

Visually inspired by Teenage Engineering hardware. Not affiliated with or endorsed by Teenage Engineering;
product names mentioned are their trademarks.
