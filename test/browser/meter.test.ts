/** VU-10 meter peak hold: the peak segment stays up for a moment after the level falls, then drops. */
import { afterEach, expect, it, vi } from "vitest";
import "../../playground/shims";
import "../../src/index";
import { mockHass } from "../../playground/picker-contract";
import type { HomeAssistant } from "../../src/types";

const { full } = mockHass();
const ID = "sensor.power";
const at = (v: number): HomeAssistant => ({ ...full, states: { ...full.states, [ID]: { ...full.states[ID], state: String(v) } } });

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

it("holds the peak after the level falls, then drops it", async () => {
  vi.useFakeTimers();
  const el = document.createElement("te-meter") as HTMLElement & { setConfig(c: unknown): void; hass: HomeAssistant; updateComplete: Promise<unknown> };
  el.setConfig({ type: "custom:te-meter", entity: ID, min: 0, max: 100, segments: 10 });
  el.hass = at(80);
  document.body.append(el);
  await el.updateComplete;
  const peak = () => [...el.shadowRoot!.querySelectorAll(".seg")].findIndex((s) => s.classList.contains("peak"));
  expect(peak()).toBe(-1); // the peak sits on the level, nothing above it

  el.hass = at(30);
  await el.updateComplete;
  expect(peak()).toBe(7); // held above the level

  vi.advanceTimersByTime(3000);
  await el.updateComplete;
  expect(peak()).toBe(-1); // dropped back to the level
  expect(vi.getTimerCount()).toBe(0); // and nothing re-arms
});
