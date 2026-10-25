import type { HassEntity, HomeAssistant } from "../types";
import { clamp, clamp01, decimalsOf, domainOf, toNumber } from "../utils/math";
import { runAction, type ActionConfig } from "./actions";

/** Config shared by every control that reads and writes one number (knob, fader, dial). */
export interface ValueConfig {
  entity: string;
  attribute?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  decimals?: number;
  percent?: boolean;
  /** Override how the value is written. Use `"{{ value }}"` in `data` for the new value. */
  set_action?: ActionConfig;
}

interface DomainSpec {
  attribute?: string;
  min: number;
  max: number;
  step: number;
  minAttr?: string;
  maxAttr?: string;
  stepAttr?: string;
  action: string;
  key: string;
  percent?: boolean;
  unit?: string;
}

const NUMBER_SPEC = { min: 0, max: 100, step: 1, minAttr: "min", maxAttr: "max", stepAttr: "step", key: "value" };
const TEMP_SPEC = { attribute: "temperature", minAttr: "min_temp", maxAttr: "max_temp", key: "temperature", unit: "°" };

/** Sensible read/write defaults per domain so most configs only need `entity`. */
export const DOMAIN_SPECS: Record<string, DomainSpec> = {
  light: { attribute: "brightness", min: 0, max: 255, step: 1, action: "light.turn_on", key: "brightness", percent: true },
  media_player: { attribute: "volume_level", min: 0, max: 1, step: 0.01, action: "media_player.volume_set", key: "volume_level", percent: true },
  climate: { ...TEMP_SPEC, min: 7, max: 35, step: 0.5, stepAttr: "target_temp_step", action: "climate.set_temperature" },
  water_heater: { ...TEMP_SPEC, min: 30, max: 70, step: 1, action: "water_heater.set_temperature" },
  number: { ...NUMBER_SPEC, action: "number.set_value" },
  input_number: { ...NUMBER_SPEC, action: "input_number.set_value" },
  fan: { attribute: "percentage", min: 0, max: 100, step: 1, stepAttr: "percentage_step", action: "fan.set_percentage", key: "percentage", percent: true },
  cover: { attribute: "current_position", min: 0, max: 100, step: 1, action: "cover.set_cover_position", key: "position", percent: true },
  valve: { attribute: "current_position", min: 0, max: 100, step: 1, action: "valve.set_valve_position", key: "position", percent: true },
};

/** Specs for non-default attributes, keyed `domain.attribute` (e.g. a knob on a light's color temperature). */
export const ATTRIBUTE_SPECS: Record<string, DomainSpec> = {
  "light.color_temp_kelvin": {
    attribute: "color_temp_kelvin",
    min: 2000,
    max: 6500,
    step: 50,
    minAttr: "min_color_temp_kelvin",
    maxAttr: "max_color_temp_kelvin",
    action: "light.turn_on",
    key: "color_temp_kelvin",
    unit: "K",
  },
};

export const VALUE_DOMAINS = Object.keys(DOMAIN_SPECS);

/** HVAC actions that mean the device is working right now (lit in the accent color). */
const RUNNING = new Set(["heating", "cooling", "drying", "fan", "preheating", "defrosting"]);

/**
 * What a thermostat is doing, for the line under a dial or knob: HEATING / COOLING while it runs, else ON / OFF.
 * Undefined for entities that aren't climate or water_heater.
 */
export function hvacStatus(st: HassEntity | undefined): { text: string; running: boolean } | undefined {
  if (!st || !["climate", "water_heater"].includes(domainOf(st.entity_id))) return undefined;
  if (st.state === "unavailable" || st.state === "unknown") return { text: "--", running: false };
  const action = String(st.attributes.hvac_action ?? "");
  if (RUNNING.has(action)) return { text: action === "fan" ? "FAN" : action.toUpperCase(), running: true };
  return { text: st.state === "off" || action === "off" ? "OFF" : "ON", running: false };
}

/**
 * An attribute as display cards show it: a light's 0–255 `brightness` reads as a percentage (0 when off,
 * where HA drops the attribute). `unit` is the default unit; the card's own `unit:` still wins.
 */
export function displayAttribute(st: HassEntity, attribute: string): { raw: unknown; unit: string } {
  const raw = st.attributes[attribute];
  if (attribute === "brightness" && domainOf(st.entity_id) === "light") {
    const n = toNumber(raw);
    return { raw: n === undefined ? (st.state === "off" ? 0 : raw) : Math.round((n / 255) * 100), unit: "%" };
  }
  return { raw, unit: "" };
}

const specFor = (cfg: Pick<ValueConfig, "entity" | "attribute">) => {
  const domain = domainOf(cfg.entity);
  return ATTRIBUTE_SPECS[`${domain}.${cfg.attribute}`] ?? DOMAIN_SPECS[domain];
};

export interface ResolvedValue {
  stateObj?: HassEntity;
  min: number;
  max: number;
  step: number;
  value: number | null;
  percent: boolean;
  unit: string;
  decimals: number;
}

export function assertValueConfig(cfg: Partial<ValueConfig>) {
  if (!cfg.entity) throw new Error("entity is required");
  const domain = domainOf(cfg.entity);
  if (!DOMAIN_SPECS[domain] && !cfg.set_action) {
    throw new Error(`set_action is required for ${domain} entities`);
  }
}

export function resolveValue(hass: HomeAssistant | undefined, cfg: ValueConfig): ResolvedValue {
  const stateObj = hass?.states[cfg.entity];
  const spec = specFor(cfg);
  const attrs = stateObj?.attributes ?? {};
  const fromAttr = (name?: string) => (name ? toNumber(attrs[name]) : undefined);

  const min = cfg.min ?? fromAttr(spec?.minAttr) ?? spec?.min ?? 0;
  const max = cfg.max ?? fromAttr(spec?.maxAttr) ?? spec?.max ?? 100;
  const step = cfg.step ?? fromAttr(spec?.stepAttr) ?? spec?.step ?? (max - min) / 100;
  const attribute = cfg.attribute ?? spec?.attribute;

  let value: number | null = null;
  if (stateObj) {
    value = toNumber(attribute ? attrs[attribute] : stateObj.state) ?? null;
    // Lights/fans/covers drop their level attribute when off.
    if (value === null && attribute && spec && stateObj.state === "off") value = min;
  }

  const percent = cfg.percent ?? (cfg.attribute === undefined ? !!spec?.percent : false);
  return {
    stateObj,
    min,
    max,
    step,
    value,
    percent,
    unit: cfg.unit ?? spec?.unit ?? attrs.unit_of_measurement ?? "",
    decimals: cfg.decimals ?? decimalsOf(step),
  };
}

export const fracOf = (r: ResolvedValue, v: number) => (r.max === r.min ? 0 : clamp01((v - r.min) / (r.max - r.min)));

export function valueAt(r: ResolvedValue, frac: number): number {
  const raw = r.min + clamp01(frac) * (r.max - r.min);
  const stepped = r.step > 0 ? Math.round((raw - r.min) / r.step) * r.step + r.min : raw;
  return clamp(Number(stepped.toFixed(6)), Math.min(r.min, r.max), Math.max(r.min, r.max));
}

export function formatValue(r: ResolvedValue, v: number | null): string {
  if (v === null) return "--";
  if (r.percent) return `${Math.round(fracOf(r, v) * 100)}%`;
  return `${v.toFixed(r.decimals)}${r.unit}`;
}

export function writeValue(host: HTMLElement, hass: HomeAssistant, cfg: ValueConfig, value: number) {
  if (cfg.set_action) {
    runAction(host, hass, cfg.set_action, cfg.entity, { value });
    return;
  }
  const spec = specFor(cfg);
  if (!spec) return;
  const [domain, service] = spec.action.split(".");
  hass.callService(domain, service, { entity_id: cfg.entity, [spec.key]: value });
}
