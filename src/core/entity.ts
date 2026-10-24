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

const TOGGLEABLE = new Set(["light", "switch", "fan", "input_boolean", "media_player", "cover", "automation", "siren", "humidifier"]);
export const isToggleable = (entityId?: string) => !!entityId && TOGGLEABLE.has(entityId.split(".")[0]);
