import type { HomeAssistant } from "../types";

/** Child card host; `hui-card` is HA's own wrapper (handles visibility, errors, editing). */
export function createChildCard(config: Record<string, unknown>, hass?: HomeAssistant): HTMLElement {
  const el = document.createElement("hui-card") as HTMLElement & { config: unknown; hass?: HomeAssistant };
  el.config = config;
  if (hass) el.hass = hass;
  return el;
}

export function forwardHass(els: HTMLElement[], hass: HomeAssistant | undefined) {
  if (!hass) return;
  for (const el of els) (el as HTMLElement & { hass?: HomeAssistant }).hass = hass;
}
