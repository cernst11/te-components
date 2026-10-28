/** Screens draw once and go idle unless something on them moves (marquee, clock). */
import { afterEach, expect, it, vi } from "vitest";
import "../../playground/shims";
import "../../src/index";
import { mockHass } from "../../playground/picker-contract";
import type { HomeAssistant } from "../../src/types";

const { full } = mockHass();
const ENTITY = "sensor.outdoor_temperature";

type Card = HTMLElement & { setConfig(c: unknown): void; hass: HomeAssistant; updateComplete: Promise<unknown> };

async function mount(tag: string, config: Record<string, unknown>, width = 300) {
  const el = document.createElement(tag) as Card;
  el.setConfig({ type: `custom:${tag}`, ...config });
  el.hass = full;
  el.style.cssText = `display:block;width:${width}px`;
  document.body.append(el);
  await el.updateComplete;
  return el;
}

/** Counts calls to the card's draw over `ms`. */
async function drawsDuring(el: Card, ms: number) {
  const spy = vi.spyOn(el as unknown as { draw(f: unknown): boolean }, "draw");
  await new Promise((r) => setTimeout(r, ms));
  const n = spy.mock.calls.length;
  spy.mockRestore();
  return n;
}

const settle = () => new Promise((r) => setTimeout(r, 300));

afterEach(() => document.body.replaceChildren());

it("a static DS-2 stops drawing, and draws again when its entity changes", async () => {
  const el = await mount("te-mini-display", { entity: ENTITY });
  await settle();
  expect(await drawsDuring(el, 400)).toBe(0);

  const st = full.states[ENTITY];
  const next = { ...full, states: { ...full.states, [ENTITY]: { ...st, state: String(Number(st.state) + 1) } } };
  const spy = vi.spyOn(el as unknown as { draw(f: unknown): boolean }, "draw");
  el.hass = next;
  await el.updateComplete;
  await settle();
  expect(spy).toHaveBeenCalledTimes(1);
});

it("an unrelated entity changing doesn't redraw", async () => {
  const el = await mount("te-mini-display", { entity: ENTITY });
  await settle();
  const spy = vi.spyOn(el as unknown as { draw(f: unknown): boolean }, "draw");
  el.hass = { ...full, states: { ...full.states, "sensor.unrelated": { ...full.states[ENTITY], entity_id: "sensor.unrelated" } } };
  await settle();
  expect(spy).not.toHaveBeenCalled();
});

it("a scrolling DS-2 keeps animating", async () => {
  const el = await mount("te-mini-display", { entity: ENTITY, label: "A VERY LONG NAME THAT CANNOT FIT", scroll: true, compact: false }, 160);
  await settle();
  expect(await drawsDuring(el, 400)).toBeGreaterThan(3);
});

it("an SG-7 clock keeps ticking; an SG-7 sensor doesn't", async () => {
  const clock = await mount("te-segment", { clock: true });
  const sensor = await mount("te-segment", { entity: ENTITY });
  await settle();
  const [c, s] = await Promise.all([drawsDuring(clock, 800), drawsDuring(sensor, 800)]);
  expect(c).toBeGreaterThanOrEqual(2);
  expect(s).toBe(0);
});

it("a DS-64 graph is static", async () => {
  const el = await mount("te-matrix", { entity: ENTITY });
  await settle();
  expect(await drawsDuring(el, 400)).toBe(0);
});
