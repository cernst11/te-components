import { css, html } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { pickEntity } from "../core/entity";
import { F } from "../core/form";
import { assertValueConfig, VALUE_DOMAINS } from "../core/value";
import { TeValueCard, type DragStart, type ValueCardConfig } from "../core/value-card";
import { MODELS, registerCard } from "../registry";
import { sharedStyles } from "../theme/shared";
import type { HomeAssistant } from "../types";
import { clamp01 } from "../utils/math";

const CAPS = ["orange", "white", "grey", "black", "navy", "tan"] as const;
type Cap = (typeof CAPS)[number];
const DARK_CAPS = new Set<Cap>(["black", "navy"]);
const SIZES = { s: 36, m: 52, l: 64 } as const;

interface KnobConfig extends ValueCardConfig {
  cap: Cap;
  size: keyof typeof SIZES;
  socket: boolean;
}

/** Pixels of pointer travel for a full sweep. */
const DRAG_RANGE = 160;

/** KN-3 — rotary knob. Drag up/right to increase; arrows, PgUp/PgDn, wheel when focused. */
export class TeKnob extends TeValueCard<KnobConfig> {
  static styles = [
    sharedStyles,
    css`
      .cap {
        --size: 64px;
        position: relative;
        width: var(--size);
        height: var(--size);
        border-radius: 50%;
        /* specular stays fixed (light doesn't rotate with the knob) */
        background:
          var(--te-grain),
          radial-gradient(circle at 34% 28%, color-mix(in srgb, var(--cap) 65%, white) 0%, var(--cap) 52%, color-mix(in srgb, var(--cap) 82%, black) 100%);
        background-blend-mode: overlay, normal;
        box-shadow: var(--te-elev-3);
        cursor: ns-resize;
        touch-action: none;
      }
      .rotor {
        position: absolute;
        inset: 0;
        transform: rotate(var(--rot));
        transition: transform 0.12s ease-out;
      }
      .dragging .rotor {
        transition: none;
      }
      .notch {
        position: absolute;
        top: 9%;
        left: 50%;
        width: max(3px, calc(var(--size) * 0.05));
        height: 26%;
        transform: translateX(-50%);
        border-radius: 2px;
        background: var(--notch);
        box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.35);
      }
    `,
  ];

  static getStubConfig(hass?: HomeAssistant) {
    return { entity: pickEntity(hass, ["media_player", "light", "input_number"]), cap: "orange", label: "GAIN" };
  }

  static getConfigForm() {
    return {
      schema: [F.entity(VALUE_DOMAINS), F.labels(), F.grid(F.select("cap", CAPS), F.select("size", Object.keys(SIZES)), F.bool("socket")), F.range(), F.look()],
    };
  }

  protected normalizeConfig(c: Record<string, any>): KnobConfig {
    assertValueConfig(c);
    return {
      ...c,
      type: c.type,
      entity: c.entity,
      cap: CAPS.includes(c.cap) ? c.cap : "grey",
      size: c.size in SIZES ? c.size : "l",
      socket: c.socket === true,
      tile: c.tile === true,
    };
  }

  getCardSize() {
    return 3;
  }

  getGridOptions() {
    return { columns: 3, rows: 2, min_columns: 2, min_rows: 2 };
  }

  protected dragFrac(ev: PointerEvent, s: DragStart) {
    return clamp01(s.frac + (s.y - ev.clientY + (ev.clientX - s.x)) / DRAG_RANGE);
  }

  render() {
    const c = this._config!;
    const r = this.resolved;
    const frac = this.currentFrac(r);
    const showValue = this.dragging || this._local !== null;
    return html`
      <div class="card ${classMap({ tile: !!c.tile, dragging: this.dragging })}">
        <div class="label">${c.label ?? ""}</div>
        <div class="socket ${classMap({ on: c.socket })}">
          <div
            class="cap"
            role="slider"
            tabindex="0"
            aria-label=${c.label || r.stateObj?.attributes.friendly_name || c.entity}
            aria-valuemin=${r.min}
            aria-valuemax=${r.max}
            aria-valuenow=${r.value ?? r.min}
            aria-valuetext=${this.displayValue(r)}
            style=${styleMap({
              "--size": `${SIZES[c.size]}px`,
              "--cap": `var(--te-cap-${c.cap})`,
              "--notch": DARK_CAPS.has(c.cap) ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.55)",
              "--rot": `${-135 + frac * 270}deg`,
            })}
            @pointerdown=${this.onPointerDown}
            @pointermove=${this.onPointerMove}
            @pointerup=${this.onPointerUp}
            @pointercancel=${this.onPointerUp}
            @keydown=${this.onKeyDown}
            @wheel=${this.onWheel}
          >
            <div class="rotor"><div class="notch"></div></div>
          </div>
        </div>
        <div class="sublabel">${showValue ? this.displayValue(r) : (c.sublabel ?? "")}</div>
      </div>
    `;
  }
}

registerCard({ ...MODELS.knob, description: "Rotary knob. Drag vertically to set a value." }, TeKnob);
