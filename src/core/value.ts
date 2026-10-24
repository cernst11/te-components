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

export const VALUE_DOMAINS = Object.keys(DOMAIN_SPECS);

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
  const spec = DOMAIN_SPECS[domainOf(cfg.entity)];
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
  const spec = DOMAIN_SPECS[domainOf(cfg.entity)];
  if (!spec) return;
  const [domain, service] = spec.action.split(".");
  hass.callService(domain, service, { entity_id: cfg.entity, [spec.key]: value });
}
