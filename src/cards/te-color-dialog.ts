import { css, html, LitElement } from "lit";
import { styleMap } from "lit/directives/style-map.js";
import { HoldGesture } from "../core/hold";
import { Throttle } from "../core/throttle";
import { sharedStyles } from "../theme/shared";
import type { BodyTheme, HomeAssistant } from "../types";
import { hexToRgb, hsvToRgb, rgbToHex, rgbToHsv } from "../utils/color";
import { clamp01 } from "../utils/math";

/** Modal for CL-16: HS wheel, brightness fader, hold-to-save color slots (input_text). */
export class TeColorDialog extends LitElement {
  static properties = {
    hass: { attribute: false },
    entity: {},
    slots: { attribute: false },
    heading: {},
    _hs: { state: true },
    _bright: { state: true },
  };

  declare hass?: HomeAssistant;
  declare entity: string;
  declare slots: string[];
  declare heading: string;
  declare _hs: [number, number];
  declare _bright: number;

  private holds = new Map<string, HoldGesture>();
  private sendHs = new Throttle<[number, number]>(120, (hs) => this.call({ hs_color: hs }));
  private sendBright = new Throttle<number>(120, (b) => this.call({ brightness_pct: Math.round(b * 100) }));
  private dragging?: "wheel" | "bright";

  constructor() {
    super();
    this.entity = "";
    this.slots = [];
    this.heading = "COLOR";
    this._hs = [30, 60];
    this._bright = 1;
  }

  static open(opts: { hass: HomeAssistant; entity: string; slots: string[]; heading: string; body: BodyTheme }) {
    const dlg = document.createElement("te-color-dialog") as TeColorDialog;
    Object.assign(dlg, opts);
    dlg.dataset.body = opts.body;
    const st = opts.hass.states[opts.entity];
    let hs = st?.attributes.hs_color as [number, number] | undefined;
    if (!hs && st?.attributes.rgb_color) hs = rgbToHsv(...(st.attributes.rgb_color as [number, number, number])).slice(0, 2) as [number, number];
    if (hs) dlg._hs = [hs[0], hs[1]];
    if (typeof st?.attributes.brightness === "number") dlg._bright = st.attributes.brightness / 255;
    document.body.appendChild(dlg);
    return dlg;
  }

  close() {
    this.remove();
    this.dispatchEvent(new Event("closed"));
  }

  private onKey = (e: KeyboardEvent) => e.key === "Escape" && this.close();

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("keydown", this.onKey);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this.onKey);
  }

  private call(data: Record<string, unknown>) {
    this.hass?.callService("light", "turn_on", { entity_id: this.entity, ...data });
  }

  protected firstUpdated() {
    this.paintWheel();
    (this.renderRoot.querySelector(".close") as HTMLElement)?.focus();
  }

  private paintWheel() {
    const canvas = this.renderRoot.querySelector("canvas")!;
    const size = Math.round(canvas.clientWidth * (window.devicePixelRatio || 1)) || 400;
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const img = ctx.createImageData(size, size);
    const r = size / 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - r + 0.5;
        const dy = y - r + 0.5;
        const dist = Math.hypot(dx, dy);
        const i = (y * size + x) * 4;
        if (dist > r) continue;
        const [cr, cg, cb] = hsvToRgb(((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360, (dist / r) * 100, 100);
        img.data.set([cr, cg, cb, 255], i);
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  private wheelAt(ev: PointerEvent, final: boolean) {
    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const dx = ev.clientX - rect.left - rect.width / 2;
    const dy = ev.clientY - rect.top - rect.height / 2;
    const sat = Math.min(1, Math.hypot(dx, dy) / (rect.width / 2)) * 100;
    this._hs = [((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360, sat];
    final ? this.sendHs.flush(this._hs) : this.sendHs.push(this._hs);
  }

  private brightAt(ev: PointerEvent, final: boolean) {
    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    this._bright = clamp01((ev.clientX - rect.left - 11) / (rect.width - 22));
    final ? this.sendBright.flush(this._bright) : this.sendBright.push(this._bright);
  }

  private drag(kind: "wheel" | "bright") {
    const apply = (ev: PointerEvent, final: boolean) => (kind === "wheel" ? this.wheelAt(ev, final) : this.brightAt(ev, final));
    return {
      down: (ev: PointerEvent) => {
        (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
        this.dragging = kind;
        apply(ev, false);
      },
      move: (ev: PointerEvent) => this.dragging === kind && apply(ev, false),
      up: (ev: PointerEvent) => {
        if (this.dragging !== kind) return;
        this.dragging = undefined;
        apply(ev, true);
      },
    };
  }

  private slotHold(id: string) {
    let g = this.holds.get(id);
    if (!g) {
      g = new HoldGesture(this, {
        time: () => 650,
        enabled: () => true,
        onHold: () => this.hass?.callService("input_text", "set_value", { entity_id: id, value: rgbToHex(hsvToRgb(this._hs[0], this._hs[1], 100)) }),
      });
      this.holds.set(id, g);
    }
    return g;
  }

  private recall(id: string) {
    if (this.slotHold(id).consumeClick()) return;
    const rgb = hexToRgb(this.hass?.states[id]?.state);
    if (!rgb) return;
    const [h, s] = rgbToHsv(...rgb);
    this._hs = [h, s];
    this.sendHs.flush(this._hs);
  }

  static styles = [
    sharedStyles,
    css`
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: rgba(0, 0, 0, 0.55);
        animation: fade 0.15s ease-out;
      }
      @keyframes fade {
        from {
          opacity: 0;
        }
      }
      .dialog {
        width: min(94vw, 420px);
        max-height: 92vh;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 18px;
        padding: 20px;
        border-radius: var(--te-r-panel);
        background: var(--te-grain), var(--te-face), var(--te-body);
        background-blend-mode: overlay, normal, normal;
        box-shadow: var(--te-panel-shadow), 0 30px 60px rgba(0, 0, 0, 0.45);
      }
      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .close {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        font-size: 16px;
        line-height: 1;
        background: var(--te-grain), var(--te-face), var(--te-key-light);
        background-blend-mode: overlay, normal, normal;
        box-shadow: var(--te-elev-1);
      }
      .close:active {
        box-shadow: var(--te-pressed);
      }
      .wheel {
        position: relative;
        width: min(70vw, 260px);
        aspect-ratio: 1;
        margin: 0 auto;
        border-radius: 50%;
        box-shadow: 0 0 0 6px var(--te-body-shade), 0 0 0 7px var(--te-lo), var(--te-elev-2);
        touch-action: none;
        cursor: crosshair;
      }
      .wheel canvas {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        display: block;
      }
      .puck {
        position: absolute;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 2px solid #fff;
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.45);
        transform: translate(-50%, -50%);
        pointer-events: none;
      }
      .track {
        position: relative;
        height: 34px;
        touch-action: none;
        cursor: ew-resize;
      }
      .groove {
        position: absolute;
        left: 0;
        right: 0;
        top: 50%;
        height: 8px;
        margin-top: -4px;
        border-radius: 4px;
        background: linear-gradient(90deg, #0e0e0e, var(--color));
        box-shadow: var(--te-sunk-2);
      }
      .cap {
        position: absolute;
        top: 50%;
        width: 22px;
        height: 30px;
        margin-top: -15px;
        border-radius: 6px;
        left: calc(var(--b) * (100% - 22px));
        background: var(--te-grain), var(--te-face), var(--te-key-light);
        background-blend-mode: overlay, normal, normal;
        box-shadow: var(--te-elev-2);
      }
      .slots {
        display: flex;
        justify-content: center;
        gap: 16px;
      }
      .slot {
        position: relative;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        overflow: hidden;
        background: var(--te-grain), var(--slot, var(--te-body-shade));
        background-blend-mode: overlay, normal;
        box-shadow: var(--te-elev-2);
      }
      .slot:active {
        box-shadow: var(--te-pressed);
      }
      .slot .fill {
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: rgba(255, 255, 255, 0.55);
        transform: scale(0);
      }
      .slot.holding .fill {
        transform: scale(1);
        transition: transform 650ms linear;
      }
      .center {
        justify-content: center;
        margin-bottom: 8px;
      }
    `,
  ];

  render() {
    const [h, s] = this._hs;
    const rad = (h * Math.PI) / 180;
    const [r, g, b] = hsvToRgb(h, s, 100);
    const color = `rgb(${r},${g},${b})`;
    const wheel = this.drag("wheel");
    const bright = this.drag("bright");
    return html`
      <div class="backdrop" @click=${(e: Event) => e.target === e.currentTarget && this.close()}>
        <div class="dialog" role="dialog" aria-modal="true" aria-label=${this.heading}>
          <header>
            <div class="label">${this.heading}</div>
            <button class="close" aria-label="close" @click=${() => this.close()}>&times;</button>
          </header>
          <div class="wheel" @pointerdown=${wheel.down} @pointermove=${wheel.move} @pointerup=${wheel.up} @pointercancel=${wheel.up}>
            <canvas></canvas>
            <div class="puck" style=${styleMap({ left: `${50 + Math.sin(rad) * (s / 2)}%`, top: `${50 - Math.cos(rad) * (s / 2)}%`, background: color })}></div>
          </div>
          <div>
            <div class="sublabel">BRIGHTNESS</div>
            <div
              class="track"
              style=${styleMap({ "--b": String(this._bright), "--color": color })}
              @pointerdown=${bright.down}
              @pointermove=${bright.move}
              @pointerup=${bright.up}
              @pointercancel=${bright.up}
            >
              <div class="groove"></div>
              <div class="cap"></div>
            </div>
          </div>
          ${this.slots.length
            ? html`<div>
                <div class="sublabel center">HOLD TO SAVE</div>
                <div class="slots">
                  ${this.slots.map((id) => {
                    const hold = this.slotHold(id);
                    const rgb = hexToRgb(this.hass?.states[id]?.state);
                    return html`<button
                      class="slot ${hold.holding ? "holding" : ""}"
                      aria-label=${`color slot ${id}`}
                      style=${styleMap({ "--slot": rgb ? `rgb(${rgb.join(",")})` : undefined })}
                      @pointerdown=${hold.down}
                      @pointerup=${hold.cancel}
                      @pointerleave=${hold.cancel}
                      @pointercancel=${hold.cancel}
                      @click=${() => this.recall(id)}
                    >
                      <span class="fill"></span>
                    </button>`;
                  })}
                </div>
              </div>`
            : ""}
        </div>
      </div>
    `;
  }
}

if (!customElements.get("te-color-dialog")) customElements.define("te-color-dialog", TeColorDialog);
