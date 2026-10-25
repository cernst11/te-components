import type { HomeAssistant } from "../types";

/**
 * HA-standard action objects (same shape as tap_action/hold_action in core cards),
 * plus TE extras: `cycle-source` and `mute` for media players, `light-dialog` for the color/white dialog.
 */
export type ActionConfig =
  | { action: "none" }
  | { action: "toggle" }
  | { action: "more-info"; entity?: string }
  | { action: "navigate"; navigation_path: string }
  | { action: "url"; url_path: string }
  | {
      action: "perform-action" | "call-service";
      perform_action?: string;
      service?: string;
      data?: Record<string, unknown>;
      service_data?: Record<string, unknown>;
      target?: Record<string, unknown>;
    }
  | { action: "cycle-source" }
  | { action: "mute" }
  | { action: "light-dialog"; entity?: string; mode?: "color" | "white" };

export function fireEvent(node: EventTarget, type: string, detail?: unknown) {
  node.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
}

const TEMPLATE = /^\{\{\s*(\w+)\s*\}\}$/;

/** Replaces `"{{ value }}"`-style placeholders in action data with runtime values. */
export function substitute(input: unknown, vars: Record<string, unknown>): unknown {
  if (typeof input === "string") {
    const exact = TEMPLATE.exec(input);
    if (exact) return exact[1] in vars ? vars[exact[1]] : input;
    return input.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  }
  if (Array.isArray(input)) return input.map((v) => substitute(v, vars));
  if (input && typeof input === "object") {
    return Object.fromEntries(Object.entries(input).map(([k, v]) => [k, substitute(v, vars)]));
  }
  return input;
}

export function runAction(
  host: HTMLElement,
  hass: HomeAssistant | undefined,
  action: ActionConfig | undefined,
  entityId?: string | null,
  vars: Record<string, unknown> = {},
): void {
  if (!hass || !action) return;
  switch (action.action) {
    case "none":
      return;
    case "toggle":
      if (entityId) hass.callService("homeassistant", "toggle", { entity_id: entityId });
      return;
    case "more-info":
      fireEvent(host, "hass-more-info", { entityId: action.entity ?? entityId });
      return;
    case "navigate":
      history.pushState(null, "", action.navigation_path);
      fireEvent(window, "location-changed", { replace: false });
      return;
    case "light-dialog":
      // opened by TeBaseCard.run(), which owns the dialog; anywhere else, fall back to HA's dialog
      fireEvent(host, "hass-more-info", { entityId: action.entity ?? entityId });
      return;
    case "url":
      window.open(action.url_path, "_blank", "noopener");
      return;
    case "cycle-source": {
      const st = entityId ? hass.states[entityId] : undefined;
      const list: string[] = st?.attributes.source_list ?? [];
      if (!st || list.length === 0) return;
      const next = list[(list.indexOf(st.attributes.source) + 1) % list.length];
      hass.callService("media_player", "select_source", { entity_id: entityId, source: next });
      return;
    }
    case "mute": {
      const st = entityId ? hass.states[entityId] : undefined;
      if (!st) return;
      hass.callService("media_player", "volume_mute", {
        entity_id: entityId,
        is_volume_muted: !st.attributes.is_volume_muted,
      });
      return;
    }
    case "perform-action":
    case "call-service": {
      const name = action.perform_action ?? action.service;
      if (!name || !name.includes(".")) return;
      const [domain, service] = name.split(".", 2);
      const data = substitute(action.data ?? action.service_data ?? {}, vars) as Record<string, unknown>;
      let target = action.target ? (substitute(action.target, vars) as Record<string, unknown>) : undefined;
      // Convenience: target the card's entity when the action names no target of its own.
      if (!target && !("entity_id" in data) && entityId) target = { entity_id: entityId };
      hass.callService(domain, service, data, target);
      return;
    }
  }
}
