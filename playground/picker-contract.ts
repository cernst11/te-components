/**
 * Card-picker contract check. Replays what Home Assistant does with a custom card:
 *   picker:  getStubConfig(hass, entities, entitiesFallback) → { type, ...stub } → setConfig → live preview
 *   editor:  getConfigForm().schema → ha-form (labels fall back to the capitalised key name)
 * against the mock HA and an empty one (a fresh install with none of the card's domains).
 * Used by playground/check.html and by the browser test (test/browser/picker.test.ts).
 */
import { MockHass } from "./mock-hass";
import type { HomeAssistant } from "../src/types";

type Ctor = CustomElementConstructor & {
  getStubConfig?: (hass: HomeAssistant, entities: string[], fallback: string[]) => unknown;
  getConfigForm?: () => { schema: unknown[] };
};
type CardEl = HTMLElement & {
  setConfig(c: unknown): void;
  hass?: HomeAssistant;
  updateComplete?: Promise<unknown>;
  getCardSize?: () => number | Promise<number>;
  getGridOptions?: () => Record<string, unknown>;
};

/** Selector keys HA's ha-selector understands (src/data/selector.ts). */
const SELECTORS = new Set(
  "action addon app area areas_display attribute assist_pipeline backup_location boolean button_toggle choose color_rgb color_temp condition config_entry constant conversation_agent country date datetime device device_class duration entity entity_name file floor icon label language location media navigation number numeric_threshold object period qr_code select selector serial_port state state_class statistic stt target template text theme time timezone trigger tts tts_voice ui_action ui_clock_date_format ui_color ui_state_content ui_time_format unit_of_measurement".split(" "),
);
const LAYOUTS = new Set(["grid", "expandable", "constant", "divider", "optional_actions"]);

export interface Result {
  type: string;
  name: string;
  preview: boolean;
  errors: string[];
  warnings: string[];
  stub?: unknown;
  emptyStub?: unknown;
  fields: string[];
}

/** Walk an ha-form schema; returns the field names it edits. */
function walkSchema(schema: unknown[], errors: string[], path = "schema"): string[] {
  const names: string[] = [];
  schema.forEach((item: any, i) => {
    const at = `${path}[${i}]`;
    if (!item || typeof item !== "object") return errors.push(`${at}: not an object`);
    if (typeof item.name !== "string") errors.push(`${at}: missing name (use "" for layout)`);
    if (item.type) {
      if (!LAYOUTS.has(item.type)) errors.push(`${at}: unknown layout type "${item.type}"`);
      if ((item.type === "grid" || item.type === "expandable") && !Array.isArray(item.schema)) errors.push(`${at}: ${item.type} needs schema[]`);
      if (item.type === "expandable" && !item.title && !item.name) errors.push(`${at}: expandable without title`);
      if (Array.isArray(item.schema)) names.push(...walkSchema(item.schema, errors, `${at}.schema`));
      return;
    }
    if (!item.selector || typeof item.selector !== "object") return errors.push(`${at} (${item.name}): no selector`);
    const keys = Object.keys(item.selector);
    if (keys.length !== 1 || !SELECTORS.has(keys[0])) errors.push(`${at} (${item.name}): unknown selector ${keys.join(",")}`);
    if (keys[0] === "select") {
      const opts = item.selector.select.options;
      if (!Array.isArray(opts) || !opts.length) errors.push(`${at} (${item.name}): select without options`);
    }
    if (item.context?.filter_entity && !names.includes(item.context.filter_entity) && item.context.filter_entity !== "entity") {
      errors.push(`${at} (${item.name}): context.filter_entity points at "${item.context.filter_entity}"`);
    }
    names.push(item.name);
  });
  return names;
}

export async function mount(type: string, config: Record<string, unknown>, hass: HomeAssistant, host?: HTMLElement) {
  const el = document.createElement(type) as CardEl;
  el.setConfig(config); // throws → HA shows an error card in the picker
  el.hass = hass;
  const box = host ?? document.createElement("div");
  if (!host) {
    box.style.cssText = "position:absolute;left:-9999px;width:300px";
    document.body.append(box);
  }
  box.append(el);
  await el.updateComplete;
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  const rendered = (el.shadowRoot?.childElementCount ?? 0) > 0;
  const height = el.getBoundingClientRect().height;
  const size = await el.getCardSize?.();
  const grid = el.getGridOptions?.();
  if (!host) box.remove();
  return { rendered, height, size, grid };
}

async function check(entry: Record<string, any>, full: HomeAssistant, empty: HomeAssistant): Promise<Result> {
  const r: Result = { type: entry.type, name: entry.name, preview: entry.preview !== false, errors: [], warnings: [], fields: [] };
  const ctor = customElements.get(entry.type) as Ctor | undefined;
  if (!ctor) {
    r.errors.push("not defined as a custom element");
    return r;
  }
  if (!entry.name || !entry.description) r.errors.push("customCards entry needs name + description");
  const type = `custom:${entry.type}`;

  for (const [label, hass] of [["mock", full], ["empty", empty]] as const) {
    const ids = Object.keys(hass.states);
    let stub: Record<string, unknown> = {};
    try {
      stub = ((await ctor.getStubConfig?.(hass, ids, ids)) ?? {}) as Record<string, unknown>;
    } catch (e) {
      r.errors.push(`${label}: getStubConfig threw: ${(e as Error).message}`);
      continue;
    }
    if (label === "mock") r.stub = stub;
    else r.emptyStub = stub;
    const config = { type, ...stub };
    try {
      const m = await mount(entry.type, config, hass);
      if (!m.rendered) r.errors.push(`${label}: preview rendered nothing`);
      else if (m.height < 8 && r.preview) r.warnings.push(`${label}: preview is ${Math.round(m.height)}px tall`);
      if (typeof m.size !== "number" || !(m.size > 0)) r.warnings.push(`${label}: getCardSize() = ${m.size}`);
      if (label === "mock" && !m.grid) r.warnings.push("no getGridOptions() (sections view sizing)");
    } catch (e) {
      // a missing entity on an empty install is expected for entity cards, but the picker shows it as an error card
      (label === "empty" ? r.warnings : r.errors).push(`${label}: setConfig threw "${(e as Error).message}" → error card in picker`);
    }
  }

  if (!ctor.getConfigForm) {
    r.warnings.push("no getConfigForm → YAML-only editor");
  } else {
    try {
      const form = ctor.getConfigForm();
      if (!Array.isArray(form?.schema)) r.errors.push("getConfigForm().schema is not an array");
      else {
        r.fields = walkSchema(form.schema, r.errors);
        const dupes = r.fields.filter((n, i) => n && r.fields.indexOf(n) !== i);
        if (dupes.length) r.errors.push(`duplicate form fields: ${[...new Set(dupes)].join(", ")}`);
        // stub keys the form can't show: they survive in YAML but are invisible in the visual editor
        const hidden = Object.keys((r.stub ?? {}) as object).filter((k) => !r.fields.includes(k));
        if (hidden.length) r.warnings.push(`stub keys not in the form (YAML only): ${hidden.join(", ")}`);
      }
    } catch (e) {
      r.errors.push(`getConfigForm threw: ${(e as Error).message}`);
    }
  }
  return r;
}

/** Checks every registered card against a populated hass (`full`) and an empty one (a fresh install). */
export async function checkCards(full: HomeAssistant, empty: HomeAssistant): Promise<Result[]> {
  const results: Result[] = [];
  for (const e of (window.customCards ?? []) as Record<string, any>[]) results.push(await check(e, full, empty));
  return results;
}

/** The mock HA's current hass, and the same with no entities. */
export function mockHass(): { full: HomeAssistant; empty: HomeAssistant } {
  const mock = new MockHass(() => {});
  let full!: HomeAssistant;
  mock.subscribe((h) => (full = h));
  return { full, empty: { ...full, states: {} } as HomeAssistant };
}
