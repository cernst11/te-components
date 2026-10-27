import type { HassEntity, HomeAssistant } from "../src/types";

export interface Call {
  domain: string;
  service: string;
  data?: Record<string, unknown>;
  target?: Record<string, unknown>;
}

/** A minimal hass that records every callService. */
export function fakeHass(entities: HassEntity[] = []): HomeAssistant & { calls: Call[] } {
  const calls: Call[] = [];
  return {
    states: Object.fromEntries(entities.map((e) => [e.entity_id, e])),
    calls,
    callService: async (domain, service, data, target) => {
      calls.push(target ? { domain, service, data, target } : { domain, service, data });
    },
  };
}

export const entity = (entity_id: string, state: string, attributes: Record<string, unknown> = {}): HassEntity => ({ entity_id, state, attributes });

/** Stand-in for a card element: runAction only dispatches events on it. */
export function fakeHost() {
  const events: { type: string; detail: unknown }[] = [];
  const host = new EventTarget();
  for (const type of ["hass-more-info"]) host.addEventListener(type, (e) => events.push({ type, detail: (e as CustomEvent).detail }));
  return { host: host as unknown as HTMLElement, events };
}
