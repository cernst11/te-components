/** CH-1 tab pages on the dashboard. */
import { afterEach, expect, it, vi } from "vitest";
import "../../playground/shims";
import "../../src/index";
import { mockHass } from "../../playground/picker-contract";

const { full } = mockHass();
const fader = { type: "custom:te-fader", entity: "light.kitchen" };
const knob = { type: "custom:te-knob", entity: "light.kitchen" };

async function mount(config: Record<string, unknown>) {
  const el = document.createElement("te-panel") as HTMLElement & { setConfig(c: unknown): void; hass: unknown; updateComplete: Promise<unknown> };
  el.setConfig({ type: "custom:te-panel", cards: [knob], tabs: [{ label: "A", cards: [fader] }, "Deco", { label: "B", cards: [knob] }], ...config });
  el.hass = full;
  document.body.append(el);
  await el.updateComplete;
  return el;
}

const tabs = (el: HTMLElement) => [...el.shadowRoot!.querySelectorAll<HTMLElement>("button.tab")];
const page = (el: HTMLElement) => el.shadowRoot!.querySelector(".page");
const lit = (el: HTMLElement) => tabs(el).map((t) => t.getAttribute("aria-selected"));
const click = async (el: HTMLElement & { updateComplete: Promise<unknown> }, t: HTMLElement) => {
  t.click();
  await el.updateComplete;
};

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

it("opens the default tab's page; tapping the lit tab closes it, tapping again reopens", async () => {
  const el = await mount({});
  expect(lit(el)).toEqual(["true", "false"]); // the decorative tab isn't a button
  expect(page(el)).not.toBeNull();
  await click(el, tabs(el)[0]);
  expect(page(el)).toBeNull();
  expect(lit(el)).toEqual(["false", "false"]);
  expect(tabs(el)[0].tabIndex).toBe(0); // still reachable by keyboard
  await click(el, tabs(el)[0]);
  expect(page(el)).not.toBeNull();
});

it("switches pages", async () => {
  const el = await mount({});
  await click(el, tabs(el)[1]);
  expect(lit(el)).toEqual(["false", "true"]);
  expect(page(el)).not.toBeNull();
});

it("default_tab: -1 starts with no page open", async () => {
  const el = await mount({ default_tab: -1 });
  expect(page(el)).toBeNull();
  expect(lit(el)).toEqual(["false", "false"]);
});

it("arrow keys switch pages but never close one", async () => {
  const el = await mount({ default_tab: -1 });
  const key = async (k: string) => {
    tabs(el)[0].dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, composed: true }));
    await el.updateComplete;
  };
  await key("ArrowRight");
  expect(lit(el)).toEqual(["true", "false"]);
  await key("ArrowRight");
  expect(lit(el)).toEqual(["false", "true"]);
  await key("ArrowRight");
  expect(lit(el)).toEqual(["true", "false"]);
});

it("reset_after returns to no page when that's the default", async () => {
  vi.useFakeTimers();
  const el = await mount({ default_tab: -1, reset_after: 60 });
  await click(el, tabs(el)[0]);
  expect(page(el)).not.toBeNull();
  vi.advanceTimersByTime(60_000);
  await el.updateComplete;
  expect(page(el)).toBeNull();
});

it("six tabs fit a phone-width panel", async () => {
  const labels = ["Home", "Climate", "Bedroom", "Office", "Bath", "Utility"];
  const el = await mount({ tabs: labels.map((label) => ({ label, cards: [knob] })) });
  el.style.cssText = "display:block;width:374px";
  await new Promise((r) => requestAnimationFrame(r));
  const strip = el.shadowRoot!.querySelector(".tabs")!.getBoundingClientRect();
  const last = tabs(el)[5].getBoundingClientRect();
  expect(last.right).toBeLessThanOrEqual(strip.right + 0.5);
  expect(tabs(el).map((t) => t.textContent!.trim())).toEqual(labels);
});
