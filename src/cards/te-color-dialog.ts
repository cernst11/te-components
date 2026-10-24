import { css, html } from "lit";
import { styleMap } from "lit/directives/style-map.js";
import { HoldGesture } from "../core/hold";
import { TeModal } from "../core/modal";
import { Throttle } from "../core/throttle";
import type { BodyTheme, HomeAssistant } from "../types";
import { hexToRgb, hsvToRgb, rgbToHex, rgbToHsv } from "../utils/color";

/** Modal for CL-16: HS wheel, brightness fader, hold-to-save color slots (input_text). */
export class TeColorDialog extends TeModal {
  static properties = {
    slots: { attribute: false },
    _hs: { state: true },
    _bright: { state: true },
  };

  declare slots: string[];
  declare _hs: [number, number];
  declare _bright: number;

  private holds = new Map<string, HoldGesture>();
  private sendHs = new Throttle<[number, number]>(120, (hs) => this.turnOn({ hs_color: hs }));
  private sendBright = new Throttle<number>(120, (b) => this.turnOn({ brightness_pct: Math.round(b * 100) }));
  private brightDrag = this.trackDrag((f, final) => {
    this._bright = f;
    final ? this.sendBright.flush(f) : this.sendBright.push(f);
  });
  private wheelActive = false;

  constructor() {
    super();
    this.heading = "COLOR";
    this.slots = [];
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

  protected firstUpdated() {
    super.firstUpdated();
    this.paintWheel();
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

  private wheelDown = (ev: PointerEvent) => {
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    this.wheelActive = true;
    this.wheelAt(ev, false);
  };
  private wheelMove = (ev: PointerEvent) => this.wheelActive && this.wheelAt(ev, false);
  private wheelUp = (ev: PointerEvent) => {
    if (!this.wheelActive) return;
    this.wheelActive = false;
    this.wheelAt(ev, true);
  };

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
    TeModal.styles,
    css`
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
    `,
  ];

  render() {
    const [h, s] = this._hs;
    const rad = (h * Math.PI) / 180;
    const [r, g, b] = hsvToRgb(h, s, 100);
    const color = `rgb(${r},${g},${b})`;
    return this.shell(html`
      <div class="wheel" @pointerdown=${this.wheelDown} @pointermove=${this.wheelMove} @pointerup=${this.wheelUp} @pointercancel=${this.wheelUp}>
        <canvas></canvas>
        <div class="puck" style=${styleMap({ left: `${50 + Math.sin(rad) * (s / 2)}%`, top: `${50 - Math.cos(rad) * (s / 2)}%`, background: color })}></div>
      </div>
      ${this.fader("BRIGHTNESS", this._bright, `linear-gradient(90deg, #0e0e0e, ${color})`, this.brightDrag)}
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
    `);
  }
}

if (!customElements.get("te-color-dialog")) customElements.define("te-color-dialog", TeColorDialog);
