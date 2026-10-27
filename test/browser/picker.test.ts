/**
 * HA's card picker and visual editor contract for every card, in a real browser: getStubConfig → setConfig →
 * preview, against the mock HA and an empty install, plus the getConfigForm schema. Same check as /check.html.
 */
import { expect, it } from "vitest";
import "../../playground/shims";
import "../../src/index";
import { checkCards, mockHass } from "../../playground/picker-contract";
import { MODELS } from "../../src/registry";

const { full, empty } = mockHass();
const results = await checkCards(full, empty);

it("registers every model in the card picker", () => {
  expect(results.map((r) => r.type).sort()).toEqual(Object.values(MODELS).map((m) => m.type).sort());
});

it.each(results.map((r) => [r.name, r] as const))("%s", (_, r) => {
  if (r.warnings.length) console.warn(`${r.name}:\n  ${r.warnings.join("\n  ")}`);
  expect(r.errors).toEqual([]);
});

/** Every form field's `default` must be what the card really uses when the field is left out. */
const defaults = (schema: any[]): [string, unknown][] => schema.flatMap((s) => (Array.isArray(s.schema) ? defaults(s.schema) : s.default !== undefined ? [[s.name, s.default]] : []));

it.each(results.map((r) => [r.name, r.type] as const))("%s form defaults match the card", async (_, type) => {
  const ctor = customElements.get(type) as any;
  const stub = (await ctor.getStubConfig?.(full, Object.keys(full.states), [])) ?? {};
  for (const [name, value] of defaults(ctor.getConfigForm().schema)) {
    const config = { type: `custom:${type}`, ...stub };
    delete config[name];
    const el = document.createElement(type) as any;
    el.setConfig(config);
    expect(el._config[name], name).toEqual(value);
  }
});
