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
    ent("light.ceiling", "on", {
      friendly_name: "Ceiling",
      brightness: 200,
      supported_color_modes: ["color_temp"],
      color_mode: "color_temp",
      color_temp_kelvin: 3000,
      min_color_temp_kelvin: 2200,
      max_color_temp_kelvin: 6500,
    }),
    ent("light.sofa_lamp", "on", { friendly_name: "Sofa Lamp", brightness: 120, hs_color: [30, 75] }),
    ent("light.hallway", "off", { friendly_name: "Hallway" }),
    ent("sensor.outdoor_temperature", "14.2", { friendly_name: "Outdoor", unit_of_measurement: "°C" }),
    ent("sensor.washer_status", "wash", { friendly_name: "Washer" }),
    ent("sensor.washer_remaining", "38", { friendly_name: "Washer Remaining", unit_of_measurement: "min" }),
    ent("sensor.washer_progress", "21", { friendly_name: "Washer Progress", unit_of_measurement: "%" }),
    ent("sensor.dryer_status", "off", { friendly_name: "Dryer" }),
    ent("sensor.dishwasher_status", "main_wash", { friendly_name: "Dishwasher" }),
    ent("sensor.dishwasher_end_time", new Date(Date.now() + 74 * 60_000).toISOString(), { friendly_name: "Dishwasher End", device_class: "timestamp" }),
    ent("sensor.model_3_charging", "charging", { friendly_name: "Model 3 Charging" }),
    ent("sensor.model_3_battery", "64", { friendly_name: "Model 3 Battery", unit_of_measurement: "%", device_class: "battery" }),
    ent("sensor.model_3_time_to_full", "1.6", { friendly_name: "Model 3 Time to Full", unit_of_measurement: "h" }),
    ent("sensor.model_3_shift_state", "driving", { friendly_name: "Model 3 Shift State" }),
    ent("sensor.power", "412", { friendly_name: "Power", unit_of_measurement: "W" }),
    ent("switch.coffee_machine", "off", { friendly_name: "Coffee Machine" }),
    ...Object.keys(SCENES).map((id) => ent(id, "2026-10-24T18:00:00", { friendly_name: id.split(".")[1] })),
    ent("light.kitchen", "on", { friendly_name: "Kitchen", brightness: 180, hs_color: [28, 70], supported_color_modes: ["hs"] }),
    ent("light.desk_lamp", "off", { friendly_name: "Desk Lamp" }),
    ent("light.living_room", "on", { friendly_name: "Living Room", brightness: 90, hs_color: [210, 55] }),
    ent("switch.fx_1", "off", { friendly_name: "FX I" }),
    ent("switch.fx_2", "on", { friendly_name: "FX II" }),
    ent("fan.bedroom", "on", { friendly_name: "Bedroom Fan", percentage: 40, percentage_step: 10, preset_modes: ["eco", "breeze", "sleep", "turbo"], preset_mode: "breeze" }),
    ent("cover.blinds", "open", { friendly_name: "Blinds", current_position: 70 }),
    ent("climate.living_room", "heat", {
      friendly_name: "Living Room",
      temperature: 21.5,
      current_temperature: 20.8,
      min_temp: 15,
      max_temp: 28,
      target_temp_step: 0.5,
      hvac_modes: ["off", "heat", "cool", "heat_cool", "auto", "dry"],
    }),
    ent("input_select.house_mode", "home", { friendly_name: "House Mode", options: ["home", "away", "night", "vacation"] }),
    ent("timer.pasta", "active", {
      friendly_name: "Pasta",
      duration: "0:10:00",
      finishes_at: new Date(Date.now() + 7 * 60_000 + 42_000).toISOString(),
      remaining: "0:07:42",
    }),
    ent("script.goodnight", "off", { friendly_name: "Goodnight" }),
    ent("lock.front_door", "locked", { friendly_name: "Front Door" }),
    ent("cover.garage_door", "closed", { friendly_name: "Garage", device_class: "garage" }),
    ent("binary_sensor.front_door", "off", { friendly_name: "Front", device_class: "door" }),
    ent("binary_sensor.back_door", "on", { friendly_name: "Back", device_class: "door" }),
    ent("binary_sensor.kitchen_window", "off", { friendly_name: "Kitchen", device_class: "window" }),
    ent("binary_sensor.hall_motion", "on", { friendly_name: "Hall", device_class: "motion" }),
    ent("binary_sensor.washer_leak", "off", { friendly_name: "Leak", device_class: "moisture" }),
    ent("person.alex", "home", { friendly_name: "Alex" }),
    ent("person.sam", "not_home", { friendly_name: "Sam" }),
    ent("sensor.phone_battery", "76", { friendly_name: "Phone", unit_of_measurement: "%", device_class: "battery" }),
    ent("script.leave_home", "off", { friendly_name: "Leave Home" }),
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

  constructor(private log: ServiceLog) {
    // a slow "world clock": the washer runs its cycle, sensors drift, so live screens have something to show
    setInterval(() => this.tick(), 3000);
  }

  private tick() {
    this.states = { ...this.states };
    const num = (id: string) => Number(this.states[id]?.state ?? 0);
    const washer = this.states["sensor.washer_status"];
    if (washer) {
      if (washer.state === "off") {
        if (Math.random() < 0.15) {
          this.patch("sensor.washer_status", "wash");
          this.patch("sensor.washer_remaining", "48");
          this.patch("sensor.washer_progress", "0");
        }
      } else {
        const rem = Math.max(0, num("sensor.washer_remaining") - 1);
        const progress = Math.round(((48 - rem) / 48) * 100);
        this.patch("sensor.washer_remaining", String(rem));
        this.patch("sensor.washer_progress", String(progress));
        this.patch("sensor.washer_status", rem === 0 ? "off" : progress < 55 ? "wash" : progress < 82 ? "rinse" : "spin");
      }
    }
    if (this.states["sensor.model_3_charging"]?.state === "charging") {
      const level = Math.min(100, num("sensor.model_3_battery") + 1);
      this.patch("sensor.model_3_battery", String(level));
      this.patch("sensor.model_3_time_to_full", ((100 - level) * 0.045).toFixed(2));
      if (level >= 100) this.patch("sensor.model_3_charging", "complete");
    }
    const drift = (id: string, step: number, decimals: number) => {
      if (this.states[id]) this.patch(id, (num(id) + (Math.random() - 0.5) * step).toFixed(decimals));
    };
    drift("sensor.outdoor_temperature", 0.2, 1);
    drift("sensor.power", 260, 0);
    this.publish();
  }

  /** Synthetic `history/history_during_period`: a daily curve around the current value, every 10 min. */
  private async ws(msg: Record<string, any>): Promise<any> {
    if (msg.type !== "history/history_during_period") throw new Error(`mock: unsupported ws ${msg.type}`);
    const start = Date.parse(msg.start_time);
    const end = Date.parse(msg.end_time);
    const out: Record<string, { s: string; lu: number }[]> = {};
    for (const id of msg.entity_ids as string[]) {
      const cur = Number(this.states[id]?.state);
      if (Number.isNaN(cur)) continue;
      const unit = this.states[id]?.attributes.unit_of_measurement;
      const amp = unit === "°C" ? 3.5 : unit === "%" ? 9 : unit === "W" ? cur * 0.8 : Math.max(1, Math.abs(cur) * 0.2);
      const rows: { s: string; lu: number }[] = [];
      for (let t = start; t < end; t += 10 * 60_000) {
        const hour = new Date(t).getHours() + new Date(t).getMinutes() / 60;
        const daily = Math.sin(((hour - 9) / 24) * Math.PI * 2);
        const noise = Math.sin(t / 1.7e6) * 0.15 + Math.sin(t / 4.1e5) * 0.08;
        const spike = unit === "W" && Math.sin(t / 2.3e6) > 0.93 ? 2.5 : 0;
        const nowHour = new Date(end).getHours() + new Date(end).getMinutes() / 60;
        const base = cur - amp * Math.sin(((nowHour - 9) / 24) * Math.PI * 2);
        rows.push({ s: (base + amp * (daily + noise + spike)).toFixed(2), lu: t / 1000 });
      }
      out[id] = rows;
    }
    await new Promise((r) => setTimeout(r, 120));
    return out;
  }

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
    return {
      states: this.states,
      callService: (d, s, data, target) => this.call(d, s, data, target),
      callWS: <T>(msg: Record<string, unknown>) => this.ws(msg) as Promise<T>,
    };
  }

  private publish() {
    const h = this.snapshot();
    this.subs.forEach((fn) => fn(h));
  }

  /** A state change that lands later (locks and garage doors take a moment). */
  private later(fn: () => void, ms: number) {
    setTimeout(() => {
      this.states = { ...this.states };
      fn();
      this.publish();
    }, ms);
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
        if (d.hs_color) Object.assign(attrs, { hs_color: d.hs_color, color_temp_kelvin: undefined, color_mode: "hs" });
        if (d.color_temp_kelvin) Object.assign(attrs, { color_temp_kelvin: d.color_temp_kelvin, hs_color: undefined, color_mode: "color_temp" });
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
      case "lock.lock":
      case "lock.unlock": {
        const lock = service === "lock";
        this.later(() => this.patch(id, lock ? "locked" : "unlocked"), 1200);
        return this.patch(id, lock ? "locking" : "unlocking");
      }
      case "cover.open_cover":
      case "cover.close_cover": {
        const open = service === "open_cover";
        this.later(() => this.patch(id, open ? "open" : "closed", { current_position: open ? 100 : 0 }), 2500);
        return this.patch(id, open ? "opening" : "closing");
      }
      case "climate.set_hvac_mode":
        return this.patch(id, d.hvac_mode);
      case "input_select.select_option":
        return this.patch(id, d.option);
      case "fan.set_preset_mode":
        return this.patch(id, undefined, { preset_mode: d.preset_mode });
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
