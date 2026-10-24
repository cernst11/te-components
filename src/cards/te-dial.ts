import { css, html } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { pickEntity } from "../core/entity";
import { F } from "../core/form";
import { assertValueConfig, VALUE_DOMAINS } from "../core/value";
import { TeValueCard, type DragStart, type ValueCardConfig } from "../core/value-card";
import { MODELS, registerCard } from "../registry";
import { screenName } from "../screen/themes";
import { sharedStyles } from "../theme/shared";
import type { HomeAssistant } from "../types";
import { clamp01 } from "../utils/math";
import "../screen/te-pixel-text";

interface DialConfig extends ValueCardConfig {
  screen: string;
  size: number;
}

/** DL-7 — TP-7 style platter. Drag around the hub to set a value. */
export class TeDial extends TeValueCard<DialConfig> {
  protected absoluteDrag = true;

  static styles = [
    sharedStyles,
    css`
      .wheel {
        position: relative;
        width: var(--size);
        height: var(--size);
        border-radius: 50%;
        background:
          var(--te-grain),
          radial-gradient(circle at 32% 26%, rgba(255, 255, 255, 0.16), transparent 60%),
          var(--te-body);
        background-blend-mode: overlay, normal, normal;
        box-shadow: var(--te-elev-2), inset 0 0 0 1px var(--te-lo);
        cursor: grab;
        touch-action: none;
      }
      .dragging .wheel {
        cursor: grabbing;
      }
      .rotor {
        position: absolute;
        inset: 6%;
        transform: rotate(var(--rot));
        transition: transform 0.12s ease-out;
      }
      .dragging .rotor {
        transition: none;
      }
      /* TP-7 diagonal hairline, with a dot marking the value end */
      .hairline {
        position: absolute;
        left: 50%;
        top: 0;
        bottom: 0;
        width: 1px;
        margin-left: -0.5px;
        background: linear-gradient(var(--te-ink-dim) 0 33%, transparent 33% 67%, var(--te-ink-dim) 67%);
        opacity: 0.7;
      }
      .marker {
        position: absolute;
        top: 4%;
        left: 50%;
        width: 6px;
        height: 6px;
        margin-left: -3px;
        border-radius: 50%;
        background: var(--te-accent);
      }
      .hub {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 42%;
        height: 42%;
        transform: translate(-50%, -50%);
        border-radius: 50%;
        background: var(--te-screen-bg);
        box-shadow: var(--te-sunk-2);
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      }
    `,
  ];

  static getStubConfig(hass?: HomeAssistant) {
    return { entity: pickEntity(hass, ["climate", "media_player", "light"]), label: "TEMP" };
  }

  static getConfigForm() {
    return { schema: [F.entity(VALUE_DOMAINS), F.labels(), F.grid(F.screen(), F.num("size", 1)), F.range(), F.look()] };
  }

  protected normalizeConfig(c: Record<string, any>): DialConfig {
    assertValueConfig(c);
    return { ...c, type: c.type, entity: c.entity, screen: screenName(c.screen ?? c.theme), size: c.size ?? 180, tile: c.tile === true };
  }

  getCardSize() {
    return 5;
  }

  getGridOptions() {
    return { columns: 6, rows: 4, min_rows: 3 };
  }

  protected dragFrac(ev: PointerEvent, s: DragStart) {
    const cx = s.rect.left + s.rect.width / 2;
    const cy = s.rect.top + s.rect.height / 2;
    let deg = (Math.atan2(ev.clientX - cx, -(ev.clientY - cy)) * 180) / Math.PI;
    // dead zone at the bottom snaps to the nearer end
    if (deg > 135) deg = 135;
    if (deg < -135) deg = -135;
    return clamp01((deg + 135) / 270);
  }

  render() {
    const c = this._config!;
    const r = this.resolved;
    const frac = this.currentFrac(r);
    const text = this.displayValue(r);

    return html`
      <div class="card ${classMap({ tile: !!c.tile, dragging: this.dragging })}">
        <div class="label">${c.label ?? ""}</div>
        <div
          class="wheel"
          role="slider"
          tabindex="0"
          aria-label=${c.label || r.stateObj?.attributes.friendly_name || c.entity}
          aria-valuemin=${r.min}
          aria-valuemax=${r.max}
          aria-valuenow=${r.value ?? r.min}
          aria-valuetext=${this.displayValue(r)}
          style=${styleMap({ "--size": `${c.size}px`, "--rot": `${-135 + frac * 270}deg` })}
          @pointerdown=${this.onPointerDown}
          @pointermove=${this.onPointerMove}
          @pointerup=${this.onPointerUp}
          @pointercancel=${this.onPointerUp}
          @keydown=${this.onKeyDown}
          @wheel=${this.onWheel}
        >
          <div class="rotor"><div class="hairline"></div><div class="marker"></div></div>
          <div class="hub">
            <te-pixel-text .text=${text} .screen=${c.screen} .size=${2} .fit=${c.size * 0.42 * 0.78}></te-pixel-text>
          </div>
        </div>
        <div class="sublabel">${c.sublabel ?? ""}</div>
      </div>
    `;
  }
}

registerCard({ ...MODELS.dial, description: "TP-7 style platter dial with a value screen in the hub." }, TeDial);
