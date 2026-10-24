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
    model: MODELS.miniDisplay,
    blurb: "Small screen row. Tap toggles (or opens more-info for sensors).",
    variants: [
      { name: "Light, compact", width: 260, config: { type: t("te-mini-display"), entity: "light.kitchen", icon: "bulb", compact: true } },
      { name: "Humidity (OLED)", width: 260, config: { type: t("te-mini-display"), entity: "sensor.humidity", icon: "droplet", compact: true, screen: "oled" } },
      { name: "Scrolling line", width: 260, config: { type: t("te-mini-display"), entity: "light.living_room", icon: "lamp", scroll: true } },
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
