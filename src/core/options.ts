import type { HassEntity, HomeAssistant } from "../types";
import { domainOf } from "../utils/math";
import { runAction, type ActionConfig } from "./actions";

/** Where an entity keeps its list of choices, which one is current, and how to pick one. */
interface OptionSpec {
  options: (st: HassEntity) => unknown;
  current: (st: HassEntity) => unknown;
  service: string;
  key: string;
}

const SELECT_SPEC = (domain: string): OptionSpec => ({
  options: (st) => st.attributes.options,
  current: (st) => st.state,
  service: `${domain}.select_option`,
  key: "option",
});

/** Sensible defaults per domain so `entity` is usually all a selector needs. */
export const OPTION_SPECS: Record<string, OptionSpec> = {
  input_select: SELECT_SPEC("input_select"),
  select: SELECT_SPEC("select"),
  climate: { options: (st) => st.attributes.hvac_modes, current: (st) => st.state, service: "climate.set_hvac_mode", key: "hvac_mode" },
  fan: { options: (st) => st.attributes.preset_modes, current: (st) => st.attributes.preset_mode, service: "fan.set_preset_mode", key: "preset_mode" },
  media_player: { options: (st) => st.attributes.source_list, current: (st) => st.attributes.source, service: "media_player.select_source", key: "source" },
  light: { options: (st) => st.attributes.effect_list, current: (st) => st.attributes.effect, service: "light.turn_on", key: "effect" },
  humidifier: { options: (st) => st.attributes.available_modes, current: (st) => st.attributes.mode, service: "humidifier.set_mode", key: "mode" },
  water_heater: {
    options: (st) => st.attributes.operation_list,
    current: (st) => st.attributes.operation_mode ?? st.state,
    service: "water_heater.set_operation_mode",
    key: "operation_mode",
  },
};

export const OPTION_DOMAINS = Object.keys(OPTION_SPECS);

const attrSpec = (list: string, current: string, service: string, key = current): OptionSpec => ({
  options: (st) => st.attributes[list],
  current: (st) => st.attributes[current],
  service,
  key,
});

/** The other choice lists an entity can have besides its domain default, by attribute name (`list: preset_modes`). */
export const LIST_SPECS: Record<string, Record<string, OptionSpec>> = {
  climate: {
    hvac_modes: OPTION_SPECS.climate,
    preset_modes: attrSpec("preset_modes", "preset_mode", "climate.set_preset_mode"),
    fan_modes: attrSpec("fan_modes", "fan_mode", "climate.set_fan_mode"),
    swing_modes: attrSpec("swing_modes", "swing_mode", "climate.set_swing_mode"),
  },
  fan: {
    preset_modes: OPTION_SPECS.fan,
    direction: { options: () => ["forward", "reverse"], current: (st) => st.attributes.direction, service: "fan.set_direction", key: "direction" },
  },
  media_player: {
    source_list: OPTION_SPECS.media_player,
    sound_mode_list: attrSpec("sound_mode_list", "sound_mode", "media_player.select_sound_mode"),
  },
  humidifier: {
    available_modes: OPTION_SPECS.humidifier,
  },
};

export const LISTS = [...new Set(Object.values(LIST_SPECS).flatMap((l) => Object.keys(l)))];

/** The spec for this config: its `list` if set, else the domain default. */
function specOf(c: Pick<OptionsConfig, "entity" | "list">): OptionSpec | undefined {
  const domain = domainOf(c.entity);
  return c.list ? LIST_SPECS[domain]?.[c.list] : OPTION_SPECS[domain];
}

export interface OptionItem {
  value: string;
  label: string;
}

export interface OptionsConfig {
  entity: string;
  /** Read the current choice from this attribute instead of the domain default. */
  attribute?: string;
  /** Pick another of the entity's choice lists by attribute name, e.g. `preset_modes` or `fan_modes` on a thermostat. */
  list?: string;
  /** Override or relabel the choices: strings, or `{value, label}`. */
  options?: (string | { value: string; label?: string })[];
  /** Write with this action; `"{{ value }}"` is replaced by the chosen option. */
  set_action?: ActionConfig;
}

/** "heat_cool" → "HEAT COOL"; long names keep their first word so they fit on a key. */
export const shortLabel = (v: string) => v.replace(/_/g, " ").toUpperCase();

export function assertOptionsConfig(c: Partial<OptionsConfig>) {
  if (!c.entity) throw new Error("entity is required");
  const domain = domainOf(c.entity);
  if (c.list && !LIST_SPECS[domain]?.[c.list]) {
    const known = Object.keys(LIST_SPECS[domain] ?? {});
    throw new Error(known.length ? `list must be one of ${known.join(", ")} for ${domain}` : `${domain} entities have no lists; use options and set_action`);
  }
  if (!specOf(c as OptionsConfig) && !(c.options && c.set_action)) throw new Error(`options and set_action are required for ${domain} entities`);
}

export function resolveOptions(hass: HomeAssistant | undefined, c: OptionsConfig): { items: OptionItem[]; current?: string } {
  const st = hass?.states[c.entity];
  const spec = specOf(c);
  const raw = c.options ?? (st && spec ? spec.options(st) : undefined);
  const items: OptionItem[] = (Array.isArray(raw) ? raw : []).map((o) =>
    typeof o === "object" && o ? { value: String(o.value), label: o.label ?? shortLabel(String(o.value)) } : { value: String(o), label: shortLabel(String(o)) },
  );
  const cur = st ? (c.attribute ? st.attributes[c.attribute] : spec ? spec.current(st) : st.state) : undefined;
  return { items, current: cur === undefined || cur === null ? undefined : String(cur) };
}

export function selectOption(host: HTMLElement, hass: HomeAssistant, c: OptionsConfig, value: string) {
  if (c.set_action) {
    runAction(host, hass, c.set_action, c.entity, { value });
    return;
  }
  const spec = specOf(c);
  if (!spec) return;
  const [domain, service] = spec.service.split(".");
  hass.callService(domain, service, { entity_id: c.entity, [spec.key]: value });
}
