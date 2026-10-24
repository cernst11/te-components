/**
 * Example Home Assistant dashboard (sections view) built from TE cards.
 * Rendered by the playground at #dashboard and exported to examples/dashboard.yaml
 * (`npm run export:dashboard`). Plain data only — no imports — so Node can load it directly.
 */

const tv = "media_player.living_room_tv";
const remote = "remote.living_room_tv";

const send = (command: string) => ({
  action: "perform-action",
  perform_action: "remote.send_command",
  target: { entity_id: remote },
  data: { command },
});

const media = (service: string) => ({ action: "perform-action", perform_action: `media_player.${service}`, target: { entity_id: tv } });

/** DS-2 screen over a horizontal fader, sharing one tile. */
const lightTile = (entity: string, icon: string, label: string) => ({
  type: "custom:te-group",
  direction: "column",
  gap: 2,
  cards: [
    { type: "custom:te-mini-display", entity, icon, label, compact: true },
    { type: "custom:te-fader", entity, orientation: "horizontal", dots: 0, cap: "round", length: 100, show_value: false },
  ],
});

const livingRoom = {
  type: "custom:te-panel",
  title: "LIVING",
  caption: "TV",
  subtitle: "リビング",
  body: "black",
  cards: [
    { type: "custom:te-segment", clock: true, height: 64 },
    {
      type: "custom:te-display",
      entity: tv,
      progress: true,
      height: 84,
      chips: [
        { entity: tv, attribute: "source", value: "Netflix", label: "NFLX" },
        { entity: tv, attribute: "source", value: "YouTube", label: "YT" },
        { entity: tv, attribute: "source", value: "Plex", label: "PLEX" },
      ],
    },
    {
      bracket: [{ label: "TRANSPORT", span: 3 }, { label: "OUT" }],
      cards: [
        { type: "custom:te-button", glyph: "prev", label: "PREV", tap_action: media("media_previous_track") },
        { type: "custom:te-button", glyph: "play", label: "PLAY", entity: tv, active_state: "playing", tap_action: media("media_play_pause") },
        { type: "custom:te-button", glyph: "next", label: "NEXT", tap_action: media("media_next_track") },
        { type: "custom:te-knob", entity: tv, cap: "orange", size: "m", label: "VOL" },
      ],
    },
    { type: "custom:te-dpad", entity: remote },
    {
      bracket: [{ label: "POWER" }, { label: "INPUT — MENU", span: 3 }],
      cards: [
        { type: "custom:te-toggle", entity: tv, label: "POWER", on_state: "playing" },
        { type: "custom:te-button", shape: "key", color: "grey", label: "Source", entity: tv, tap_action: { action: "cycle-source" } },
        { type: "custom:te-button", shape: "key", color: "dark", label: "Home", icon: "mdi:home-outline", tap_action: send("HOME") },
        { type: "custom:te-button", shape: "key", color: "dark", label: "Back", icon: "mdi:arrow-left", tap_action: send("BACK") },
      ],
    },
    { type: "custom:te-grille", entity: tv, height: 34, pitch: 6 },
  ],
};

const lights = {
  type: "custom:te-panel",
  title: "LIGHTS",
  caption: "4 ZONES",
  subtitle: "ライト",
  faceplate: true,
  cards: [
    [lightTile("light.ceiling", "downlight", "Ceiling"), lightTile("light.sofa_lamp", "lamp", "Sofa")],
    [lightTile("light.kitchen", "bulb", "Kitchen"), lightTile("light.hallway", "downlight", "Hall")],
    [
      {
        type: "custom:te-color-picker",
        entity: "light.sofa_lamp",
        label: "SOFA",
        sublabel: "COLOR",
        slots: ["input_text.color_slot_1", "input_text.color_slot_2", "input_text.color_slot_3"],
      },
      { type: "custom:te-color-temp", entity: "light.ceiling", label: "CEILING" },
      { type: "custom:te-toggle", entity: "light.hallway", label: "HALL", glyph: "I" },
      {
        type: "custom:te-button",
        shape: "key",
        color: "accent",
        label: "All off",
        sublabel: "HOLD",
        hold_to_confirm: true,
        hold_time: 700,
        tap_action: {
          action: "perform-action",
          perform_action: "light.turn_off",
          target: { entity_id: ["light.ceiling", "light.sofa_lamp", "light.kitchen", "light.hallway"] },
        },
      },
    ],
  ],
};

const climate = {
  type: "custom:te-panel",
  title: "CLIMATE",
  subtitle: "クライメート",
  cards: [
    { type: "custom:te-matrix", entity: "sensor.outdoor_temperature", label: "OUTSIDE", decimals: 1, unit: "°", hours: 24 },
    { type: "custom:te-dial", entity: "climate.living_room", label: "HEAT", sublabel: "TARGET", size: 170 },
    { type: "custom:te-selector", entity: "climate.living_room", label: "MODE" },
    [
      { type: "custom:te-mini-display", entity: "sensor.humidity", icon: "droplet", label: "Humidity", compact: true, screen: "oled" },
    ],
    { type: "custom:te-meter", entity: "sensor.co2", label: "CO2", style: "needle", min: 400, max: 1600, warn: 1000, unit: "ppm" },
    [
      { type: "custom:te-knob", entity: "fan.bedroom", cap: "black", label: "FAN", socket: true },
      { type: "custom:te-fader", entity: "cover.blinds", label: "BLINDS", cap: "round", length: 110, dots: 5 },
    ],
  ],
};

const utility = {
  type: "custom:te-panel",
  title: "UTILITY",
  subtitle: "ユーティリティ",
  body: "black",
  cards: [
    [
      {
        type: "custom:te-matrix",
        mode: "appliance",
        animation: "washer",
        entity: "sensor.washer_status",
        label: "WASHER",
        remaining_entity: "sensor.washer_remaining",
        progress_entity: "sensor.washer_progress",
      },
      {
        type: "custom:te-matrix",
        mode: "appliance",
        animation: "dishwasher",
        entity: "sensor.dishwasher_status",
        label: "DISHES",
        remaining_entity: "sensor.dishwasher_end_time",
        screen: "vfd-blue",
      },
    ],
    { type: "custom:te-matrix", entity: "sensor.power", label: "POWER", style: "bars", screen: "lcd", hours: 12, aspect: 0.6, dots: 72 },
    [
      {
        type: "custom:te-popup",
        label: "Car",
        icon: "mdi:car-electric",
        title: "Model 3",
        width: 380,
        cards: [
          {
            type: "custom:te-matrix",
            mode: "appliance",
            animation: "car",
            entity: "sensor.model_3_charging",
            label: "MODEL 3",
            remaining_entity: "sensor.model_3_time_to_full",
            progress_entity: "sensor.model_3_battery",
          },
          [
            { type: "custom:te-mini-display", entity: "sensor.model_3_battery", icon: "battery", label: "Battery", compact: true, screen: "oled" },
            { type: "custom:te-mini-display", entity: "sensor.model_3_time_to_full", icon: "plug", label: "To full", compact: true, screen: "oled" },
          ],
        ],
      },
    ],
    { type: "custom:te-segment", entity: "timer.pasta", label: "PASTA", screen: "lcd", height: 72 },
  ],
};

const entry = {
  type: "custom:te-panel",
  title: "ENTRY",
  subtitle: "エントランス",
  faceplate: true,
  cards: [
    {
      type: "custom:te-leds",
      summary: "OPEN",
      entities: [
        "binary_sensor.front_door",
        "binary_sensor.back_door",
        "binary_sensor.kitchen_window",
        { entity: "binary_sensor.hall_motion", label: "Motion" },
        { entity: "binary_sensor.washer_leak", label: "Leak" },
      ],
    },
    [
      { type: "custom:te-slide", entity: "lock.front_door", label: "FRONT DOOR" },
      { type: "custom:te-slide", entity: "cover.garage_door", label: "GARAGE" },
    ],
    [
      {
        type: "custom:te-leds",
        label: "HOME",
        entities: [
          { entity: "person.alex", color: "neutral" },
          { entity: "person.sam", color: "neutral" },
        ],
      },
      {
        type: "custom:te-popup",
        label: "Alarm",
        icon: "mdi:shield-home-outline",
        title: "Alarm",
        width: 320,
        cards: [{ type: "custom:te-keypad", entity: "alarm_control_panel.house" }],
      },
    ],
  ],
};

const scenes = {
  type: "custom:te-panel",
  title: "SCENES",
  subtitle: "シーン",
  tabs: ["Scene", { label: "Live", color: "accent" }, { label: "Auto", color: "grey" }],
  cards: [
    {
      type: "custom:te-pads",
      pads: [
        { entity: "scene.movie", label: "Movie", glyph: "play" },
        { entity: "scene.dinner", label: "Dinner" },
        { entity: "scene.night", label: "Night", color: "dark" },
        { entity: "scene.away", label: "Away", color: "grey" },
        { entity: "script.goodnight", label: "Goodnight", icon: "mdi:weather-night" },
        { entity: "switch.coffee_machine", label: "Coffee", icon: "mdi:coffee" },
        { entity: "switch.fx_1", label: "Porch", icon: "mdi:outdoor-lamp" },
        { entity: "fan.bedroom", label: "Fan", icon: "mdi:fan" },
      ],
    },
    { type: "custom:te-selector", entity: "input_select.house_mode", label: "HOUSE", style: "keys" },
  ],
};

export const DASHBOARD = {
  title: "Home",
  views: [
    {
      title: "Home",
      path: "home",
      type: "sections",
      max_columns: 4,
      sections: [livingRoom, lights, climate, entry, utility, scenes].map((panel) => ({ type: "grid", cards: [panel] })),
    },
  ],
};
