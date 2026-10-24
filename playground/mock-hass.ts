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

function initialStates(): Record<string, HassEntity> {
  const list = [
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
    this.states = { ...this.states };
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
