import { DEFAULT_SCREEN, SCREEN_NAMES } from "../screen/themes";
import { FEEDBACK_MODES } from "./feedback";

/** Building blocks for `getConfigForm()` (HA's built-in ha-form visual editor). */
const select = (name: string, options: readonly string[]) => ({
  name,
  selector: { select: { mode: "dropdown", options: options.map((o) => ({ value: o, label: o })) } },
});

export const F = {
  entity: (domains?: string[]) => ({ name: "entity", required: true, selector: { entity: domains ? { domain: domains } : {} } }),
  text: (name: string) => ({ name, selector: { text: {} } }),
  bool: (name: string) => ({ name, selector: { boolean: {} } }),
  num: (name: string, step: number | "any" = "any") => ({ name, selector: { number: { mode: "box", step } } }),
  icon: (name = "icon") => ({ name, selector: { icon: {} } }),
  action: (name: string) => ({ name, selector: { ui_action: {} } }),
  attribute: () => ({ name: "attribute", selector: { attribute: {} }, context: { filter_entity: "entity" } }),
  select,
  grid: (...schema: object[]) => ({ type: "grid", name: "", schema }),
  body: () => select("body", ["silver", "black"]),
  screen: () => ({ ...select("screen", SCREEN_NAMES), default: DEFAULT_SCREEN }),
  labels: () => ({ type: "grid", name: "", schema: [{ name: "label", selector: { text: {} } }, { name: "sublabel", selector: { text: {} } }] }),
  range: () => ({
    type: "expandable",
    name: "",
    title: "Range & format",
    schema: [
      { name: "attribute", selector: { attribute: {} }, context: { filter_entity: "entity" } },
      { type: "grid", name: "", schema: ["min", "max", "step"].map((n) => ({ name: n, selector: { number: { mode: "box", step: "any" } } })) },
      { type: "grid", name: "", schema: [{ name: "unit", selector: { text: {} } }, { name: "decimals", selector: { number: { mode: "box", min: 0, max: 4 } } }, { name: "percent", selector: { boolean: {} } }] },
    ],
  }),
  look: (...extra: object[]) => ({ type: "grid", name: "", schema: [...extra, { name: "tile", selector: { boolean: {} } }, select("body", ["silver", "black"])] }),
  /** Haptics / click sounds, for interactive cards: `F.look(F.feedback())`. */
  feedback: () => select("feedback", FEEDBACK_MODES),
};

type FormItem = { name?: string; default?: unknown; selector?: Record<string, unknown>; schema?: FormItem[] };

/**
 * A getConfigForm() result whose fields show the card's defaults (the `DEFAULTS` its normalizeConfig uses): HA
 * shows a field's `default` greyed in number and text fields and as the state of a switch; dropdowns can't show
 * one, so they get "Default: x" as helper text.
 */
export function configForm(schema: object[], defaults: object = {}) {
  const d = defaults as Record<string, unknown>;
  const walk = (items: FormItem[]): FormItem[] =>
    items.map((it) => (it.schema ? { ...it, schema: walk(it.schema) } : it.name && it.name in d && it.default === undefined ? { ...it, default: d[it.name] } : it));
  return {
    schema: walk(schema as FormItem[]),
    computeHelper: (item: FormItem) => (item.selector?.select && item.default !== undefined ? `Default: ${item.default}` : undefined),
  };
}
