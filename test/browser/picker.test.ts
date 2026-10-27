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
