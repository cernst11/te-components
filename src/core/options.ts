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
  water_heater: {
    options: (st) => st.attributes.operation_list,
    current: (st) => st.attributes.operation_mode ?? st.state,
    service: "water_heater.set_operation_mode",
    key: "operation_mode",
  },
};

export const OPTION_DOMAINS = Object.keys(OPTION_SPECS);

export interface OptionItem {
  value: string;
  label: string;
}

export interface OptionsConfig {
  entity: string;
  /** Read the current choice from this attribute instead of the domain default. */
  attribute?: string;
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
  if (!OPTION_SPECS[domain] && !(c.options && c.set_action)) throw new Error(`options and set_action are required for ${domain} entities`);
}

export function resolveOptions(hass: HomeAssistant | undefined, c: OptionsConfig): { items: OptionItem[]; current?: string } {
  const st = hass?.states[c.entity];
  const spec = OPTION_SPECS[domainOf(c.entity)];
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
  const spec = OPTION_SPECS[domainOf(c.entity)];
  if (!spec) return;
  const [domain, service] = spec.service.split(".");
  hass.callService(domain, service, { entity_id: c.entity, [spec.key]: value });
}
