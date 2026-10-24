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

const scene = (id: string) => ({ action: "perform-action", perform_action: "scene.turn_on", target: { entity_id: id } });

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
    [
      { type: "custom:te-button", glyph: "prev", label: "PREV", tap_action: media("media_previous_track") },
      { type: "custom:te-button", glyph: "play", label: "PLAY", entity: tv, active_state: "playing", tap_action: media("media_play_pause") },
      { type: "custom:te-button", glyph: "next", label: "NEXT", tap_action: media("media_next_track") },
      { type: "custom:te-knob", entity: tv, cap: "orange", size: "m", label: "VOL" },
    ],
    { type: "custom:te-dpad", entity: remote },
    [
      { type: "custom:te-toggle", entity: tv, label: "POWER", on_state: "playing" },
      { type: "custom:te-button", shape: "key", color: "grey", label: "Source", entity: tv, tap_action: { action: "cycle-source" } },
      { type: "custom:te-button", shape: "key", color: "dark", label: "Home", icon: "mdi:home-outline", tap_action: send("HOME") },
      { type: "custom:te-button", shape: "key", color: "dark", label: "Back", icon: "mdi:arrow-left", tap_action: send("BACK") },
    ],
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
    { type: "custom:te-display", entity: "sensor.outdoor_temperature", label: "OUTSIDE", screen: "oled", decimals: 1, unit: "°", text_size: 3, height: 64 },
    { type: "custom:te-dial", entity: "climate.living_room", label: "HEAT", sublabel: "TARGET", size: 170 },
    { type: "custom:te-mini-display", entity: "sensor.temperature", icon: "thermometer", label: "Inside", compact: true, screen: "oled" },
    { type: "custom:te-mini-display", entity: "sensor.humidity", icon: "droplet", label: "Humidity", compact: true, screen: "oled" },
    { type: "custom:te-mini-display", entity: "sensor.co2", icon: "molecule", label: "CO2", compact: true, screen: "oled" },
    [
      { type: "custom:te-knob", entity: "fan.bedroom", cap: "black", label: "FAN", socket: true },
      { type: "custom:te-fader", entity: "cover.blinds", label: "BLINDS", cap: "round", length: 110, dots: 5 },
    ],
  ],
};

const scenes = {
  type: "custom:te-panel",
  title: "SCENES",
  subtitle: "シーン",
  tabs: ["Scene", { label: "Live", color: "accent" }, { label: "Auto", color: "grey" }],
  cards: [
    [
      { type: "custom:te-button", shape: "key", color: "grey", label: "Movie", glyph: "play", tap_action: scene("scene.movie") },
      { type: "custom:te-button", shape: "key", color: "light", label: "Dinner", glyph: "dot", tap_action: scene("scene.dinner") },
      { type: "custom:te-button", shape: "key", color: "dark", label: "Night", glyph: "minus", tap_action: scene("scene.night") },
      { type: "custom:te-button", shape: "key", color: "light", label: "Away", glyph: "stop", tap_action: scene("scene.away") },
    ],
    [
      { type: "custom:te-toggle", entity: "switch.coffee_machine", label: "COFFEE", glyph: "I" },
      { type: "custom:te-toggle", entity: "switch.fx_1", label: "PORCH", glyph: "I" },
      { type: "custom:te-toggle", entity: "fan.bedroom", label: "FAN", glyph: "II" },
    ],
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
      sections: [livingRoom, lights, climate, scenes].map((panel) => ({ type: "grid", cards: [panel] })),
    },
  ],
};
