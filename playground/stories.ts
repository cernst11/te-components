import { MODELS } from "../src/registry";

export interface Variant {
  name: string;
  config: Record<string, unknown>;
  /** Stage width in px (cards are fluid; this mimics a dashboard column). */
  width?: number;
}

export interface Story {
  model: (typeof MODELS)[keyof typeof MODELS];
  blurb: string;
  variants: Variant[];
}

const t = (type: string) => `custom:${type}`;

export const STORIES: Story[] = [
  {
    model: MODELS.knob,
    blurb: "Drag up/right to increase. Focus + arrows, PgUp/PgDn, Home/End or mouse wheel. Domain defaults mean `entity` is usually enough.",
    variants: [
      { name: "Volume (orange cap)", config: { type: t("te-knob"), entity: "media_player.living_room", cap: "orange", label: "GAIN" } },
      { name: "Brightness in socket", config: { type: t("te-knob"), entity: "light.kitchen", cap: "white", label: "HIGH", socket: true } },
      { name: "Fan, medium black", config: { type: t("te-knob"), entity: "fan.bedroom", cap: "black", size: "m", label: "LOW", sublabel: "FAN" } },
      { name: "Small grey tile", config: { type: t("te-knob"), entity: "input_number.bpm", cap: "grey", size: "s", label: "BPM", tile: true } },
    ],
  },
  {
    model: MODELS.fader,
    blurb: "Absolute drag; LED ladder tracks the value. Tapping the sublabel mutes media players / toggles lights.",
    variants: [
      { name: "Light", config: { type: t("te-fader"), entity: "light.kitchen", sublabel: "KITCHEN" } },
      { name: "Volume, 10 dots", config: { type: t("te-fader"), entity: "media_player.living_room", sublabel: "VOL", dots: 10 } },
      { name: "No dots", config: { type: t("te-fader"), entity: "light.living_room", sublabel: "LIVING", dots: 0 } },
      { name: "TX-6 round cap", config: { type: t("te-fader"), entity: "fan.bedroom", sublabel: "FAN", cap: "round" } },
      { name: "TX-6 round, no dots", config: { type: t("te-fader"), entity: "light.kitchen", cap: "round", dots: 0 } },
      { name: "Horizontal cover", config: { type: t("te-fader"), entity: "cover.blinds", orientation: "horizontal", label: "BLINDS", tile: true }, width: 260 },
      { name: "Horizontal, no dots", config: { type: t("te-fader"), entity: "media_player.living_room", orientation: "horizontal", label: "VOL", dots: 0, tile: true }, width: 260 },
      { name: "Horizontal round", config: { type: t("te-fader"), entity: "light.living_room", orientation: "horizontal", cap: "round", label: "LIVING", tile: true }, width: 260 },
    ],
  },
  {
    model: MODELS.dial,
    blurb: "Turn it like a platter: rotation is relative to where you grab, so the value never jumps to your finger. The hub is a pixel screen.",
    variants: [
      { name: "Thermostat (VFD amber)", config: { type: t("te-dial"), entity: "climate.living_room", label: "TP-7", sublabel: "LIVING" } },
      { name: "BPM (OLED)", config: { type: t("te-dial"), entity: "input_number.bpm", label: "TEMPO", screen: "oled", size: 150 } },
    ],
  },
  {
    model: MODELS.toggle,
    blurb: "TX-6 FX button. The pill LED lights orange when on.",
    variants: [
      { name: "FX I", config: { type: t("te-toggle"), entity: "switch.fx_1", label: "FX", glyph: "I" } },
      { name: "FX II", config: { type: t("te-toggle"), entity: "switch.fx_2", label: "FX", glyph: "II" } },
      { name: "Light", config: { type: t("te-toggle"), entity: "light.desk_lamp", label: "DESK", tile: true } },
    ],
  },
  {
    model: MODELS.button,
    blurb: "Round, square, or K.O.-style keys. LED shows active state; hold_action / hold_to_confirm fill in orange.",
    variants: [
      { name: "Transport", config: { type: t("te-button"), glyph: "play", label: "PLAY", entity: "media_player.living_room", tap_action: { action: "perform-action", perform_action: "media_player.media_play_pause" }, active_state: "playing" } },
      { name: "Record (dark)", config: { type: t("te-button"), glyph: "record", color: "dark", shape: "square", label: "REC" } },
      { name: "K.O. key", config: { type: t("te-button"), shape: "key", color: "grey", label: "Sample", glyph: "dot" } },
      { name: "Accent key", config: { type: t("te-button"), shape: "key", color: "accent", label: "Record", glyph: "record" } },
      { name: "Source cycle", config: { type: t("te-button"), icon: "mdi:swap-horizontal", label: "SRC", entity: "media_player.living_room", tap_action: { action: "cycle-source" } } },
      { name: "Hold to confirm", config: { type: t("te-button"), icon: "mdi:power", color: "accent", label: "OFF", hold_to_confirm: true, hold_time: 900, entity: "light.kitchen", tap_action: { action: "perform-action", perform_action: "light.turn_off" } } },
    ],
  },
  {
    model: MODELS.selector,
    blurb: "Pick one of several modes. Rotary: drag (one click per detent), tap to step, or tap a label. Keys: latching mode keys with LEDs. Reads options from the entity (input_select, select, HVAC modes, fan presets, media sources, light effects).",
    variants: [
      { name: "HVAC mode, rotary", config: { type: t("te-selector"), entity: "climate.living_room", label: "MODE" } },
      { name: "Fan preset, orange cap", config: { type: t("te-selector"), entity: "fan.bedroom", label: "PRESET", cap: "orange" } },
      { name: "House mode, keys", width: 300, config: { type: t("te-selector"), entity: "input_select.house_mode", label: "HOUSE", style: "keys" } },
      { name: "Source, keys (relabelled)", width: 300, config: { type: t("te-selector"), entity: "media_player.living_room", style: "keys", options: [{ value: "Jellyfin", label: "JF" }, { value: "Spotify", label: "SPOT" }, { value: "Radio", label: "FM" }], label: "SOURCE" } },
    ],
  },
  {
    model: MODELS.pads,
    blurb: "K.O. II pads for scenes, scripts and switches. Scenes run scene.turn_on and the last one activated stays lit; switches toggle and light while on.",
    variants: [
      {
        name: "Scenes + scripts",
        width: 320,
        config: {
          type: t("te-pads"),
          label: "SCENES",
          pads: [
            { entity: "scene.movie", label: "Movie", glyph: "play" },
            { entity: "scene.dinner", label: "Dinner" },
            { entity: "scene.night", label: "Night", color: "dark" },
            { entity: "scene.away", label: "Away", color: "grey" },
            { entity: "script.goodnight", label: "Goodnight", icon: "mdi:weather-night" },
            { entity: "script.leave_home", label: "Leave", icon: "mdi:exit-run" },
            { entity: "switch.fx_1", label: "Porch" },
            { entity: "switch.coffee_machine", label: "Coffee", color: "accent" },
          ],
        },
      },
    ],
  },
  {
    model: MODELS.dpad,
    blurb: "One molded cross that tilts toward the pressed direction. Sends remote.send_command DPAD_* by default.",
    variants: [{ name: "Remote", config: { type: t("te-dpad"), entity: "remote.tv", label: "NAV" } }],
  },
  {
    model: MODELS.display,
    blurb: "Pixel screen with stepped marquee, status chips and segmented progress. Screens: vfd-amber, vfd-blue, oled, lcd.",
    variants: [
      {
        name: "Now playing (VFD amber)",
        width: 380,
        config: {
          type: t("te-display"),
          entity: "media_player.living_room",
          label: "NOW PLAYING",
          progress: true,
          chips: [
            { entity: "media_player.living_room", attribute: "source", value: "Jellyfin", label: "JF" },
            { entity: "media_player.living_room", attribute: "source", value: "Spotify", label: "SP" },
            { entity: "sensor.track_number", number: true },
          ],
        },
      },
      { name: "Sensor (OLED)", width: 300, config: { type: t("te-display"), entity: "sensor.temperature", label: "TEMP", unit: "°", decimals: 1, screen: "oled", text_size: 3 } },
      { name: "Demo (LCD)", width: 380, config: { type: t("te-display"), demo: true, label: "DEMO", progress: true, screen: "lcd", chips: [{ entity: "x", label: "FX" }, { entity: "x", label: "LOOP" }] } },
      { name: "Demo (VFD blue)", width: 380, config: { type: t("te-display"), demo: true, progress: true, screen: "vfd-blue" } },
    ],
  },
  {
    model: MODELS.segment,
    blurb: "Seven-segment numerals with ghost segments and glow. An entity value, a clock (blinking colon), or an HA timer counting down. `digits` pads with unlit 8s.",
    variants: [
      { name: "Clock (VFD)", width: 320, config: { type: t("te-segment"), clock: true, label: "TIME" } },
      { name: "Timer (LCD)", width: 320, config: { type: t("te-segment"), entity: "timer.pasta", label: "PASTA", screen: "lcd" } },
      { name: "Value, 4 digits (VFD blue)", width: 320, config: { type: t("te-segment"), entity: "sensor.co2", label: "CO2", digits: 4, screen: "vfd-blue" } },
      { name: "Temperature (OLED)", width: 320, config: { type: t("te-segment"), entity: "sensor.temperature", label: "INSIDE", decimals: 1, screen: "oled", height: 80 } },
    ],
  },
  {
    model: MODELS.miniDisplay,
    blurb: "Small screen row. Tap toggles (or opens more-info for sensors).",
    variants: [
      { name: "Light, compact", width: 260, config: { type: t("te-mini-display"), entity: "light.kitchen", icon: "bulb", compact: true } },
      { name: "Humidity (OLED)", width: 260, config: { type: t("te-mini-display"), entity: "sensor.humidity", icon: "droplet", compact: true, screen: "oled" } },
      { name: "Scrolling line", width: 260, config: { type: t("te-mini-display"), entity: "light.living_room", icon: "lamp", scroll: true } },
    ],
  },
  {
    model: MODELS.matrix,
    blurb: "64×64 dot matrix. Graph mode pulls history from HA; appliance mode animates while the device runs, with status, time left and progress.",
    variants: [
      { name: "Graph, area (VFD)", width: 300, config: { type: t("te-matrix"), entity: "sensor.outdoor_temperature", label: "OUTSIDE", decimals: 1, unit: "°" } },
      { name: "Graph, bars (LCD)", width: 300, config: { type: t("te-matrix"), entity: "sensor.power", label: "POWER", style: "bars", screen: "lcd", hours: 12 } },
      { name: "Graph, line (OLED)", width: 300, config: { type: t("te-matrix"), entity: "sensor.humidity", label: "HUMIDITY", style: "line", screen: "oled" } },
      {
        name: "Washer",
        width: 300,
        config: { type: t("te-matrix"), mode: "appliance", animation: "washer", entity: "sensor.washer_status", label: "WASHER", remaining_entity: "sensor.washer_remaining", progress_entity: "sensor.washer_progress" },
      },
      { name: "Dishwasher (VFD blue)", width: 300, config: { type: t("te-matrix"), mode: "appliance", animation: "dishwasher", entity: "sensor.dishwasher_status", label: "DISHES", remaining_entity: "sensor.dishwasher_end_time", screen: "vfd-blue" } },
      { name: "Fan (speed from %)", width: 300, config: { type: t("te-matrix"), mode: "appliance", animation: "fan", entity: "fan.bedroom", label: "BEDROOM", screen: "oled" } },
      {
        name: "EV charging",
        width: 300,
        config: { type: "custom:te-matrix", mode: "appliance", animation: "car", entity: "sensor.model_3_charging", label: "MODEL 3", remaining_entity: "sensor.model_3_time_to_full", progress_entity: "sensor.model_3_battery" },
      },
      {
        name: "EV driving (OLED)",
        width: 300,
        config: { type: "custom:te-matrix", mode: "appliance", animation: "car", entity: "sensor.model_3_shift_state", label: "MODEL 3", progress_entity: "sensor.model_3_battery", screen: "oled" },
      },
      { name: "Dryer, idle", width: 300, config: { type: t("te-matrix"), mode: "appliance", animation: "dryer", entity: "sensor.dryer_status", label: "DRYER" } },
    ],
  },
  {
    model: MODELS.colorPicker,
    blurb: "Opens an HS wheel + brightness dialog. Hold a slot to save the current color, tap to recall.",
    variants: [
      { name: "Kitchen", config: { type: t("te-color-picker"), entity: "light.kitchen", label: "COLOR", slots: ["input_text.color_slot_1", "input_text.color_slot_2", "input_text.color_slot_3"] } },
    ],
  },
  {
    model: MODELS.colorTemp,
    blurb: "For tunable-white lights. Opens a warm→cool fader (range from the light), brightness and preset whites. The swatch shows the current white.",
    variants: [
      { name: "Ceiling (2200–6500K)", config: { type: t("te-color-temp"), entity: "light.ceiling", label: "WHITE" } },
      {
        name: "Custom presets",
        config: { type: t("te-color-temp"), entity: "light.ceiling", label: "CEILING", presets: [{ label: "CANDLE", kelvin: 2200 }, { label: "READ", kelvin: 4500 }, 6500] },
      },
    ],
  },
  {
    model: MODELS.group,
    blurb: "Shares one tile across modules — typically DS-2 on top of a fader or knob.",
    variants: [
      {
        name: "Mini display + fader",
        width: 200,
        config: {
          type: t("te-group"),
          direction: "column",
          gap: 4,
          cards: [
            { type: t("te-mini-display"), entity: "light.kitchen", icon: "bulb", compact: true },
            { type: t("te-fader"), entity: "light.kitchen", orientation: "horizontal", dots: 0 },
          ],
        },
      },
      {
        name: "Row of knobs",
        width: 320,
        config: {
          type: t("te-group"),
          cards: [
            { type: t("te-knob"), entity: "media_player.living_room", cap: "orange", size: "m", label: "VOL" },
            { type: t("te-knob"), entity: "light.kitchen", cap: "white", size: "m", label: "LIGHT" },
            { type: t("te-knob"), entity: "fan.bedroom", cap: "black", size: "m", label: "FAN" },
          ],
        },
      },
    ],
  },
  {
    model: MODELS.popup,
    blurb: "A key on the dashboard that opens a dialog of any cards, in rows like CH-1. Escape, the × or the backdrop close it.",
    variants: [
      {
        name: "Remote in a popup",
        config: {
          type: t("te-popup"),
          label: "Remote",
          icon: "mdi:remote-tv",
          title: "TV remote",
          body: "black",
          width: 360,
          cards: [
            { type: t("te-dpad"), entity: "remote.tv" },
            [
              { type: t("te-button"), glyph: "play", label: "PLAY", entity: "media_player.living_room", tap_action: { action: "perform-action", perform_action: "media_player.media_play_pause" }, active_state: "playing" },
              { type: t("te-knob"), entity: "media_player.living_room", cap: "orange", size: "m", label: "VOL" },
            ],
          ],
        },
      },
      {
        name: "Lights, custom trigger",
        width: 220,
        config: {
          type: t("te-popup"),
          title: "Living lights",
          trigger: { type: t("te-mini-display"), entity: "light.living_room", icon: "lamp", compact: true },
          cards: [
            [
              { type: t("te-fader"), entity: "light.living_room", sublabel: "LIVING" },
              { type: t("te-fader"), entity: "light.kitchen", sublabel: "KITCHEN" },
            ],
            [
              { type: t("te-color-picker"), entity: "light.living_room", label: "COLOR" },
              { type: t("te-color-temp"), entity: "light.ceiling", label: "WHITE" },
            ],
          ],
        },
      },
    ],
  },
  {
    model: MODELS.panel,
    blurb: "Device chassis. Rows of child cards; an array entry becomes a row.",
    variants: [
      {
        name: "K.O. style mixer",
        width: 420,
        config: {
          type: t("te-panel"),
          title: "K.O.",
          caption: "Sidekick",
          subtitle: "ミキサー",
          faceplate: true,
          tabs: ["Output", { label: "Aux", color: "accent" }, { label: "Input", color: "accent" }, { label: "USB", color: "grey" }],
          cards: [
            { type: t("te-display"), entity: "media_player.living_room", progress: true, height: 70 },
            [
              { type: t("te-knob"), entity: "media_player.living_room", cap: "orange", label: "GAIN" },
              { type: t("te-knob"), entity: "light.kitchen", cap: "white", label: "HIGH" },
              { type: t("te-knob"), entity: "fan.bedroom", cap: "black", label: "LOW" },
            ],
            [
              { type: t("te-fader"), entity: "media_player.living_room", sublabel: "1" },
              { type: t("te-fader"), entity: "light.living_room", sublabel: "2" },
              { type: t("te-toggle"), entity: "switch.fx_1", label: "FX", glyph: "I" },
            ],
          ],
        },
      },
      {
        name: "TX-6 black",
        width: 420,
        config: {
          type: t("te-panel"),
          title: "TX-6",
          body: "black",
          cards: [
            [
              { type: t("te-knob"), entity: "light.kitchen", cap: "white", size: "s" },
              { type: t("te-knob"), entity: "light.living_room", cap: "white", size: "s" },
              { type: t("te-knob"), entity: "fan.bedroom", cap: "white", size: "s" },
              { type: t("te-knob"), entity: "media_player.living_room", cap: "orange", size: "s" },
            ],
            [
              { type: t("te-fader"), entity: "light.kitchen", length: 110 },
              { type: t("te-fader"), entity: "light.living_room", length: 110 },
              { type: t("te-fader"), entity: "fan.bedroom", length: 110 },
              { type: t("te-fader"), entity: "media_player.living_room", length: 110 },
            ],
            [
              { type: t("te-toggle"), entity: "switch.fx_1", label: "FX", glyph: "I" },
              { type: t("te-toggle"), entity: "switch.fx_2", label: "FX", glyph: "II" },
              { type: t("te-button"), shape: "square", color: "dark", glyph: "dot", label: "shift" },
            ],
          ],
        },
      },
    ],
  },
];
