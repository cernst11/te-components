/**
 * Performance budgets on the example dashboard, as counts rather than timings so they're stable on CI:
 * how many animation loops run while it sits idle, that nothing re-renders then, and which cards
 * re-render when one entity changes.
 */
import { LitElement } from "lit";
import { afterAll, beforeAll, expect, it } from "vitest";
import { page } from "vitest/browser";
import "../../playground/shims";
import "../../src/index";
import { DASHBOARD } from "../../playground/dashboard";
import { mockHass } from "../../playground/picker-contract";
import { createChildCard } from "../../src/core/child-cards";
import type { HomeAssistant } from "../../src/types";

const { full } = mockHass();
let hosts: (HTMLElement & { hass?: HomeAssistant })[] = [];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const frame = () => new Promise((r) => requestAnimationFrame(r));

/** Config without actions: a card that only targets an entity in a tap action needn't re-render with it. */
const shown = (config: Record<string, unknown>) => JSON.stringify(config, (k, v) => (k.endsWith("_action") ? undefined : v));

/** Every TE card in the page, through shadow roots and hui-card wrappers. */
function teCards(root: ParentNode = document.body): (HTMLElement & { _config?: Record<string, unknown> })[] {
  const out: HTMLElement[] = [];
  for (const el of root.querySelectorAll<HTMLElement>("*")) {
    if (el.tagName.startsWith("TE-")) out.push(el);
    if (el.shadowRoot) out.push(...teCards(el.shadowRoot));
  }
  return out;
}

beforeAll(async () => {
  // tall enough that every card is on screen (screens pause off-screen, which would hide their loops)
  await page.viewport(1400, 3000);
  document.body.style.cssText = "margin:0;display:grid;grid-template-columns:repeat(3,420px);gap:12px;align-items:start";
  hosts = DASHBOARD.views[0].sections.flatMap((s) => s.cards).map((c) => createChildCard(c, full));
  document.body.append(...hosts);
  await wait(1500); // first draws, history loads, marquee pauses
});

afterAll(() => document.body.replaceChildren());

/** Records the Lit elements that update while `fn` runs. */
async function updatesDuring(fn: () => Promise<unknown>) {
  const update = LitElement.prototype["update"];
  const updated = new Set<HTMLElement>();
  LitElement.prototype["update"] = function (this: HTMLElement, ...args: unknown[]) {
    updated.add(this);
    return update.apply(this, args as never);
  };
  try {
    await fn();
  } finally {
    LitElement.prototype["update"] = update;
  }
  return updated;
}

it("an idle dashboard runs only the loops that animate something", async () => {
  // animation loops = requestAnimationFrame calls per frame, averaged over 1 s
  const raf = window.requestAnimationFrame;
  let calls = 0;
  window.requestAnimationFrame = (cb) => (calls++, raf.call(window, cb));
  let frames = 0;
  const end = performance.now() + 1000;
  while (performance.now() < end) {
    await frame();
    frames++;
  }
  window.requestAnimationFrame = raf;
  const loops = Math.round((calls - frames) / frames); // minus our own counting loop

  // what moves in the mock home: SG-7 clock, SG-7 pasta timer (running), DS-1 TV progress (playing),
  // DS-64 washer and dishwasher (running). Everything else should be idle.
  expect(loops).toBeLessThanOrEqual(5);
});

it("an idle dashboard doesn't re-render (no self-rearming timers)", async () => {
  // longer than any hold/reset timer a card uses (meter peak hold: 2.5 s)
  const updated = await updatesDuring(() => wait(3000));
  expect([...updated].map((el) => el.tagName.toLowerCase())).toEqual([]);
});

it("a state change re-renders only the cards that show that entity", async () => {
  for (const id of ["sensor.outdoor_temperature", "light.kitchen", "media_player.living_room_tv"]) {
    expect(full.states[id], `${id} in the mock`).toBeDefined();
    const st = full.states[id];
    const next = { ...full, states: { ...full.states, [id]: { ...st, last_updated: new Date().toISOString(), attributes: { ...st.attributes, test: Math.random() } } } };
    const updated = await updatesDuring(async () => {
      for (const h of hosts) h.hass = next;
      await frame();
      await frame();
    });

    // leaf cards (containers only pass hass along) whose config names the entity
    const leaves = teCards().filter((el) => el._config && !("cards" in el._config) && !("tabs" in el._config));
    const shows = leaves.filter((el) => shown(el._config!).includes(`"${id}"`));
    const extra = [...updated].filter((el) => !shows.includes(el as never)).map((el) => el.tagName.toLowerCase());
    expect(shows.length, `some card shows ${id}`).toBeGreaterThan(0);
    expect(extra, `re-rendered without showing ${id}`).toEqual([]);
    expect(shows.filter((el) => !updated.has(el)).map((el) => el.tagName.toLowerCase()), `missed ${id}`).toEqual([]);
    for (const h of hosts) h.hass = full;
    await frame();
  }
});
