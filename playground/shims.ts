import * as mdi from "@mdi/js";
import type { HomeAssistant } from "../src/types";

/** Stand-ins for elements HA's frontend provides at runtime. */

const toKey = (icon: string) =>
  "mdi" +
  icon
    .replace(/^mdi:/, "")
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");

class HaIconShim extends HTMLElement {
  private _icon = "";
  set icon(v: string) {
    this._icon = v;
    this.paint();
  }
  get icon() {
    return this._icon;
  }
  connectedCallback() {
    this.paint();
  }
  private paint() {
    const path = (mdi as Record<string, string>)[toKey(this._icon || this.getAttribute("icon") || "")];
    this.style.display = "inline-flex";
    this.innerHTML = path
      ? `<svg viewBox="0 0 24 24" style="width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px)"><path fill="currentColor" d="${path}"/></svg>`
      : "";
  }
}

/** Minimal hui-card: creates `custom:te-*` children and forwards hass. */
class HuiCardShim extends HTMLElement {
  private child?: HTMLElement & { setConfig?(c: unknown): void; hass?: HomeAssistant };
  private _hass?: HomeAssistant;
  set config(cfg: Record<string, any>) {
    const tag = String(cfg.type).replace(/^custom:/, "");
    this.child = document.createElement(tag) as typeof this.child;
    try {
      this.child!.setConfig?.(cfg);
    } catch (e) {
      this.child = document.createElement("div") as any;
      this.child!.textContent = `⚠ ${(e as Error).message}`;
    }
    if (this._hass) this.child!.hass = this._hass;
    this.replaceChildren(this.child!);
  }
  set hass(h: HomeAssistant) {
    this._hass = h;
    if (this.child) this.child.hass = h;
  }
}

customElements.define("ha-icon", HaIconShim);
customElements.define("hui-card", HuiCardShim);
