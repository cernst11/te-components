import { css, html } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import type { ActionConfig } from "../core/actions";
import { pickEntity } from "../core/entity";
import { F } from "../core/form";
import { assertValueConfig, VALUE_DOMAINS } from "../core/value";
import { TeValueCard, type DragStart, type ValueCardConfig } from "../core/value-card";
import { MODELS, registerCard } from "../registry";
import { sharedStyles } from "../theme/shared";
import type { HomeAssistant } from "../types";
import { clamp01, domainOf } from "../utils/math";

interface FaderConfig extends ValueCardConfig {
  orientation: "vertical" | "horizontal";
  dots: number;
  /** `flat` K.O. style cap with a line, or `round` TX-6 style ball cap. */
  cap: "flat" | "round";
  length: number;
  gradient?: string;
  /** Tapping the sublabel; defaults to mute for media players, toggle otherwise. */
  label_tap_action: ActionConfig;
}

const CAP_LONG = 30;
const CAP_SHORT = 22;

function defaultLabelTap(entity: string): ActionConfig {
  const d = domainOf(entity);
  if (d === "media_player") return { action: "mute" };
  if (["light", "fan", "cover", "valve"].includes(d)) return { action: "toggle" };
  return { action: "none" };
}

/** FD-6 — fader with LED dot ladder (TX-6). */
export class TeFader extends TeValueCard<FaderConfig> {
  protected absoluteDrag = true;

  static styles = [
    sharedStyles,
    css`
      .dots {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .horizontal .dots {
        flex-direction: row;
      }
      .track {
        position: relative;
        width: 34px;
        height: var(--len);
        touch-action: none;
        cursor: ns-resize;
      }
      .horizontal .track {
        width: 100%;
        min-width: var(--len);
        height: 34px;
        cursor: ew-resize;
      }
      .groove {
        position: absolute;
        left: 50%;
        top: 0;
        bottom: 0;
        width: 8px;
        margin-left: -4px;
        border-radius: 4px;
        background: var(--groove, var(--te-groove));
        box-shadow: var(--te-sunk-2);
      }
      .horizontal .groove {
        left: 0;
        right: 0;
        top: 50%;
        bottom: auto;
        width: auto;
        height: 8px;
        margin: -4px 0 0;
      }
      .cap {
        position: absolute;
        left: 50%;
        width: ${CAP_LONG}px;
        height: ${CAP_SHORT}px;
        margin-left: ${-CAP_LONG / 2}px;
        top: calc((1 - var(--f)) * (100% - ${CAP_SHORT}px));
        border-radius: 6px;
        background: var(--te-grain), var(--te-face), var(--te-key-light);
        background-blend-mode: overlay, normal, normal;
        box-shadow: var(--te-elev-2);
        transition: top 0.12s ease-out, left 0.12s ease-out;
      }
      .horizontal .cap {
        top: 50%;
        width: ${CAP_SHORT}px;
        height: ${CAP_LONG}px;
        margin: ${-CAP_LONG / 2}px 0 0;
        left: calc(var(--f) * (100% - ${CAP_SHORT}px));
      }
      .dragging .cap {
        transition: none;
      }
      .cap::after {
        content: "";
        position: absolute;
        left: 4px;
        right: 4px;
        top: 50%;
        height: 2px;
        margin-top: -1px;
        border-radius: 1px;
        background: var(--te-ink);
        opacity: 0.55;
      }
      .horizontal .cap::after {
        left: 50%;
        right: auto;
        top: 4px;
        bottom: 4px;
        width: 2px;
        height: auto;
        margin: 0 0 0 -1px;
      }
      .cap.round {
        width: ${CAP_SHORT}px;
        height: ${CAP_SHORT}px;
        margin-left: ${-CAP_SHORT / 2}px;
        border-radius: 50%;
        background:
          var(--te-grain),
          radial-gradient(circle at 34% 28%, #fff 0%, var(--te-cap-white) 50%, color-mix(in srgb, var(--te-cap-white) 80%, black) 100%);
        background-blend-mode: overlay, normal;
        box-shadow: var(--te-elev-3);
      }
      .horizontal .cap.round {
        width: ${CAP_SHORT}px;
        height: ${CAP_SHORT}px;
        margin: ${-CAP_SHORT / 2}px 0 0;
      }
      .cap.round::after {
        display: none;
      }
      .round-groove .groove {
        width: 6px;
        margin-left: -3px;
      }
      .horizontal.round-groove .groove {
        width: auto;
        height: 6px;
        margin: -3px 0 0;
      }
      .sublabel.tappable {
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 4px;
      }
      .sublabel.tappable:active {
        background: var(--te-led-off);
      }
    `,
  ];

  static getStubConfig(hass?: HomeAssistant) {
    return { entity: pickEntity(hass, ["light", "media_player", "fan"]), sublabel: "LEVEL" };
  }

  static getConfigForm() {
    return {
      schema: [
        F.entity(VALUE_DOMAINS),
        F.labels(),
        F.grid(F.select("orientation", ["vertical", "horizontal"]), F.select("cap", ["flat", "round"]), F.num("dots", 1), F.num("length", 1)),
        F.bool("show_value"),
        F.action("label_tap_action"),
        F.range(),
        F.look(),
      ],
    };
  }

  protected normalizeConfig(c: Record<string, any>): FaderConfig {
    assertValueConfig(c);
    return {
      ...c,
      type: c.type,
      entity: c.entity,
      orientation: c.orientation === "horizontal" ? "horizontal" : "vertical",
      dots: Math.max(0, Math.min(24, c.dots ?? 6)),
      cap: c.cap === "round" ? "round" : "flat",
      length: c.length ?? 150,
      tile: c.tile === true,
      label_tap_action: c.label_tap_action ?? defaultLabelTap(c.entity),
    };
  }

  getCardSize() {
    return 4;
  }

  getGridOptions() {
    return this._config?.orientation === "horizontal" ? { columns: 6, rows: 2, min_rows: 2 } : { columns: 3, rows: 4, min_rows: 3 };
  }

  protected dragFrac(ev: PointerEvent, s: DragStart) {
    const r = s.rect;
    if (this._config!.orientation === "horizontal") {
      return clamp01((ev.clientX - r.left - CAP_SHORT / 2) / (r.width - CAP_SHORT));
    }
    return clamp01(1 - (ev.clientY - r.top - CAP_SHORT / 2) / (r.height - CAP_SHORT));
  }

  render() {
    const c = this._config!;
    const r = this.resolved;
    const frac = this.currentFrac(r);
    const lit = Math.round(frac * c.dots);
    const horizontal = c.orientation === "horizontal";
    // vertical ladder lights bottom-up, horizontal left-to-right
    const dots = Array.from({ length: c.dots }, (_, i) => (horizontal ? i < lit : c.dots - i <= lit));
    const tappable = c.label_tap_action.action !== "none";
    return html`
      <div class="card ${classMap({ tile: !!c.tile, horizontal, dragging: this.dragging, "round-groove": c.cap === "round" })}">
        <div class="label">${c.label ?? ""}</div>
        ${c.dots ? html`<div class="dots">${dots.map((on) => html`<div class="led ${classMap({ on })}"></div>`)}</div>` : ""}
        <div
          class="track"
          role="slider"
          tabindex="0"
          aria-orientation=${c.orientation}
          aria-label=${c.label || c.sublabel || r.stateObj?.attributes.friendly_name || c.entity}
          aria-valuemin=${r.min}
          aria-valuemax=${r.max}
          aria-valuenow=${r.value ?? r.min}
          aria-valuetext=${this.displayValue(r)}
          style=${styleMap({ "--f": String(frac), "--len": `${c.length}px`, "--groove": c.gradient })}
          @pointerdown=${this.onPointerDown}
          @pointermove=${this.onPointerMove}
          @pointerup=${this.onPointerUp}
          @pointercancel=${this.onPointerUp}
          @keydown=${this.onKeyDown}
          @wheel=${this.onWheel}
        >
          <div class="groove"></div>
          <div class="cap ${c.cap}"></div>
        </div>
        <div class=${tappable ? `${this.readoutClass} tappable` : this.readoutClass} @click=${() => tappable && this.run(c.label_tap_action)}>${this.readoutText(r)}</div>
      </div>
    `;
  }
}

registerCard({ ...MODELS.fader, description: "Fader with LED dot ladder, vertical or horizontal." }, TeFader);
