import type { HomeAssistant } from "../types";

/** First entity in `hass` matching one of `domains` — used for card-picker stub configs. */
export function pickEntity(hass: HomeAssistant | undefined, domains: string[]): string {
  if (!hass) return "";
  const ids = Object.keys(hass.states);
  for (const d of domains) {
    const hit = ids.find((id) => id.startsWith(`${d}.`));
    if (hit) return hit;
  }
  return "";
}

/** Up to `n` entities matching `domains` (in domain order), optionally only some device classes first. */
export function pickEntities(hass: HomeAssistant | undefined, domains: string[], n: number, prefer?: (id: string) => boolean): string[] {
  if (!hass) return [];
  const ids = Object.keys(hass.states).filter((id) => domains.includes(id.split(".")[0]));
  ids.sort((a, b) => domains.indexOf(a.split(".")[0]) - domains.indexOf(b.split(".")[0]) || Number(prefer?.(b) ?? 0) - Number(prefer?.(a) ?? 0));
  return ids.slice(0, n);
}

const TOGGLEABLE = new Set(["light", "switch", "fan", "input_boolean", "media_player", "cover", "automation", "siren", "humidifier"]);
export const isToggleable = (entityId?: string) => !!entityId && TOGGLEABLE.has(entityId.split(".")[0]);
