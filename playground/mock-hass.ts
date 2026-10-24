import type { HassEntity, HomeAssistant } from "../src/types";

export type ServiceLog = (entry: { domain: string; service: string; data: Record<string, unknown> }) => void;

const now = () => new Date().toISOString();
const ent = (entity_id: string, state: string, attributes: Record<string, any> = {}): HassEntity => ({
  entity_id,
  state,
  attributes,
  last_changed: now(),
  last_updated: now(),
});

/** Episodes the mock TV steps through on next/previous. */
const EPISODES = [
  { media_title: "Severance S2E4 - Woe's Hollow", media_duration: 2940 },
  { media_title: "Severance S2E5 - Trojan's Horse", media_duration: 3060 },
  { media_title: "Severance S2E6 - Attila", media_duration: 2880 },
];

/** Light levels (0..255, 0 = off) each mock scene applies. */
const SCENES: Record<string, Record<string, number>> = {
  "scene.movie": { "light.ceiling": 0, "light.sofa_lamp": 60, "light.kitchen": 0, "light.hallway": 20 },
  "scene.dinner": { "light.ceiling": 150, "light.sofa_lamp": 120, "light.kitchen": 255, "light.hallway": 80 },
  "scene.night": { "light.ceiling": 0, "light.sofa_lamp": 0, "light.kitchen": 0, "light.hallway": 15 },
  "scene.away": { "light.ceiling": 0, "light.sofa_lamp": 0, "light.kitchen": 0, "light.hallway": 0 },
};

function initialStates(): Record<string, HassEntity> {
  const list = [
    ent("media_player.living_room_tv", "playing", {
      friendly_name: "Living Room TV",
      volume_level: 0.3,
      is_volume_muted: false,
      app_name: "Netflix",
      source: "Netflix",
      source_list: ["Netflix", "YouTube", "Plex", "HDMI 1"],
      ...EPISODES[0],
      episode: 0,
      media_position: 1210,
      media_position_updated_at: now(),
    }),
    ent("remote.living_room_tv", "on", { friendly_name: "Living Room TV" }),
    ent("light.ceiling", "on", { friendly_name: "Ceiling", brightness: 200 }),
    ent("light.sofa_lamp", "on", { friendly_name: "Sofa Lamp", brightness: 120, hs_color: [30, 75] }),
    ent("light.hallway", "off", { friendly_name: "Hallway" }),
    ent("sensor.outdoor_temperature", "14.2", { friendly_name: "Outdoor", unit_of_measurement: "°C" }),
    ent("switch.coffee_machine", "off", { friendly_name: "Coffee Machine" }),
    ...Object.keys(SCENES).map((id) => ent(id, "2026-10-24T18:00:00", { friendly_name: id.split(".")[1] })),
    ent("light.kitchen", "on", { friendly_name: "Kitchen", brightness: 180, hs_color: [28, 70], supported_color_modes: ["hs"] }),
    ent("light.desk_lamp", "off", { friendly_name: "Desk Lamp" }),
    ent("light.living_room", "on", { friendly_name: "Living Room", brightness: 90, hs_color: [210, 55] }),
    ent("switch.fx_1", "off", { friendly_name: "FX I" }),
    ent("switch.fx_2", "on", { friendly_name: "FX II" }),
    ent("fan.bedroom", "on", { friendly_name: "Bedroom Fan", percentage: 40, percentage_step: 10 }),
    ent("cover.blinds", "open", { friendly_name: "Blinds", current_position: 70 }),
    ent("climate.living_room", "heat", { friendly_name: "Living Room", temperature: 21.5, current_temperature: 20.8, min_temp: 15, max_temp: 28, target_temp_step: 0.5 }),
    ent("input_number.bpm", "120", { friendly_name: "BPM", min: 60, max: 180, step: 1 }),
    ent("sensor.temperature", "21.4", { friendly_name: "Temperature", unit_of_measurement: "°C" }),
    ent("sensor.humidity", "48", { friendly_name: "Humidity", unit_of_measurement: "%" }),
    ent("sensor.co2", "612", { friendly_name: "CO2", unit_of_measurement: "ppm" }),
    ent("sensor.track_number", "track 04", { friendly_name: "Track" }),
    ent("remote.tv", "on", { friendly_name: "TV" }),
    ent("input_text.color_slot_1", "#e8551d"),
    ent("input_text.color_slot_2", "#2c80e0"),
    ent("input_text.color_slot_3", ""),
    ent("media_player.living_room", "playing", {
      friendly_name: "Living Room Speaker",
      volume_level: 0.42,
      is_volume_muted: false,
      media_artist: "Boards of Canada",
      media_title: "Roygbiv",
      app_name: "Jellyfin",
      media_duration: 151,
      media_position: 12,
      media_position_updated_at: now(),
      source: "Jellyfin",
      source_list: ["Jellyfin", "Spotify", "TV", "AUX"],
    }),
  ];
  return Object.fromEntries(list.map((e) => [e.entity_id, e]));
}

const ON_OFF: Record<string, [string, string]> = { cover: ["open", "closed"] };

/** In-memory HA: services mutate states and publish a fresh `hass` object (like the real frontend). */
export class MockHass {
  states = initialStates();
  private subs = new Set<(h: HomeAssistant) => void>();

  constructor(private log: ServiceLog) {}

  subscribe(fn: (h: HomeAssistant) => void) {
    this.subs.add(fn);
    fn(this.snapshot());
    return () => this.subs.delete(fn);
  }

  reset() {
    this.states = initialStates();
    this.publish();
  }

  snapshot(): HomeAssistant {
    return { states: this.states, callService: (d, s, data, target) => this.call(d, s, data, target) };
  }

  private publish() {
    const h = this.snapshot();
    this.subs.forEach((fn) => fn(h));
  }

  private patch(id: string, state?: string, attrs: Record<string, unknown> = {}) {
    const cur = this.states[id];
    if (!cur) return;
    this.states[id] = { ...cur, state: state ?? cur.state, attributes: { ...cur.attributes, ...attrs }, last_updated: now() };
  }

  private async call(domain: string, service: string, data: Record<string, any> = {}, target?: Record<string, any>) {
    const payload = { ...data, ...(target ?? {}) };
    this.log({ domain, service, data: payload });
    const ids: string[] = [payload.entity_id].flat().filter(Boolean);
    // copy-on-write: cards diff old vs new `hass.states`, so never mutate a published object
    this.states = { ...this.states };
    for (const id of ids) this.apply(id, domain, service, payload);
    // simulate HA round-trip latency
    await new Promise((r) => setTimeout(r, 60));
    this.publish();
  }

  private apply(id: string, domain: string, service: string, d: Record<string, any>) {
    const st = this.states[id];
    if (!st) return;
    const [on, off] = ON_OFF[id.split(".")[0]] ?? ["on", "off"];
    switch (`${domain}.${service}`) {
      case "homeassistant.toggle":
      case `${id.split(".")[0]}.toggle`:
        if (id.startsWith("media_player.")) this.patch(id, st.state === "off" ? "playing" : "off");
        else if (id.startsWith("light.") && st.state === "off") this.patch(id, "on", { brightness: st.attributes.brightness ?? 255 });
        else this.patch(id, st.state === on ? off : on);
        return;
      case "light.turn_on": {
        const attrs: Record<string, unknown> = {};
        if (d.brightness !== undefined) attrs.brightness = d.brightness;
        if (d.brightness_pct !== undefined) attrs.brightness = Math.round((d.brightness_pct / 100) * 255);
        if (d.hs_color) attrs.hs_color = d.hs_color;
        if (st.state === "off" && attrs.brightness === undefined) attrs.brightness = 255;
        if (attrs.brightness === 0) return this.patch(id, "off", { brightness: undefined });
        return this.patch(id, "on", attrs);
      }
      case "light.turn_off":
        return this.patch(id, "off", { brightness: undefined });
      case "media_player.volume_set":
        return this.patch(id, undefined, { volume_level: d.volume_level });
      case "media_player.volume_mute":
        return this.patch(id, undefined, { is_volume_muted: d.is_volume_muted });
      case "media_player.media_play_pause": {
        const a = st.attributes;
        const pos = st.state === "playing" ? a.media_position + (Date.now() - Date.parse(a.media_position_updated_at)) / 1000 : a.media_position;
        return this.patch(id, st.state === "playing" ? "paused" : "playing", { media_position: pos, media_position_updated_at: now() });
      }
      case "media_player.media_next_track":
      case "media_player.media_previous_track": {
        if (st.attributes.episode === undefined) return;
        const step = service === "media_next_track" ? 1 : EPISODES.length - 1;
        const episode = (st.attributes.episode + step) % EPISODES.length;
        return this.patch(id, "playing", { ...EPISODES[episode], episode, media_position: 0, media_position_updated_at: now() });
      }
      case "scene.turn_on":
        for (const [light, level] of Object.entries(SCENES[id] ?? {})) {
          if (level === 0) this.patch(light, "off", { brightness: undefined });
          else this.patch(light, "on", { brightness: level });
        }
        return this.patch(id, now());
      case "media_player.select_source":
        return this.patch(id, undefined, { source: d.source, app_name: d.source });
      case "climate.set_temperature":
        return this.patch(id, undefined, { temperature: d.temperature });
      case "fan.set_percentage":
        return this.patch(id, d.percentage > 0 ? "on" : "off", { percentage: d.percentage });
      case "cover.set_cover_position":
        return this.patch(id, d.position > 0 ? "open" : "closed", { current_position: d.position });
      case "input_number.set_value":
      case "number.set_value":
      case "input_text.set_value":
        return this.patch(id, String(d.value));
    }
  }
}
