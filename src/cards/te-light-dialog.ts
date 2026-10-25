import { css, html, type PropertyValues } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { HoldGesture } from "../core/hold";
import { TeModal } from "../core/modal";
import { Throttle } from "../core/throttle";
import { resolveValue } from "../core/value";
import type { BodyTheme, HassEntity, HomeAssistant } from "../types";
import { hexToRgb, hsvToRgb, kelvinCss, kelvinGradient, rgbToHex, rgbToHsv } from "../utils/color";
import { clamp, toNumber } from "../utils/math";

export type LightMode = "color" | "white";

export interface KelvinPreset {
  label: string;
  kelvin: number;
}

export const DEFAULT_PRESETS: KelvinPreset[] = [
  { label: "WARM", kelvin: 2700 },
  { label: "NEUTRAL", kelvin: 4000 },
  { label: "DAY", kelvin: 6500 },
];

/** Color temperatures within this distance count as "the same" preset. */
const MATCH_K = 60;
const COLOR_MODES = ["hs", "xy", "rgb", "rgbw", "rgbww"];

/** What a light can do, from `supported_color_modes` (older integrations: whichever attributes it reports). */
export function lightModes(st: HassEntity | undefined): LightMode[] {
  const supported: string[] = st?.attributes.supported_color_modes ?? [];
  const modes: LightMode[] = [];
  if (supported.some((m) => COLOR_MODES.includes(m)) || (!supported.length && st?.attributes.hs_color)) modes.push("color");
  if (supported.includes("color_temp") || (!supported.length && st?.attributes.color_temp_kelvin)) modes.push("white");
  return modes;
}

export interface LightDialogOptions {
  hass: HomeAssistant;
  entity: string;
  heading: string;
  body: BodyTheme;
  /** Which page to show first; defaults to the light's current color mode. */
  mode?: LightMode;
  /** input_text entities for saved colors (CL-16 `slots`). */
  slots?: string[];
  presets?: KelvinPreset[];
  /** Kelvin range overrides (CT-27 `min`/`max`). */
  min?: number;
  max?: number;
}

/**
 * The light dialog behind CL-16, CT-27 and a long-press on a light: brightness, plus a COLOR page (HS wheel,
 * hold-to-save slots) and/or a WHITE page (warm→cool fader, presets). Lights that do both get a switch.
 */
export class TeLightDialog extends TeModal {
  static properties = {
    modes: { attribute: false },
    slots: { attribute: false },
    presets: { attribute: false },
    min: { type: Number },
    max: { type: Number },
    step: { type: Number },
    _mode: { state: true },
    _hs: { state: true },
    _k: { state: true },
    _bright: { state: true },
  };

  declare modes: LightMode[];
  declare slots: string[];
  declare presets: KelvinPreset[];
  declare min: number;
  declare max: number;
  declare step: number;
  declare _mode?: LightMode;
  declare _hs: [number, number];
  declare _k: number;
  declare _bright: number;

  private holds = new Map<string, HoldGesture>();
  private sendHs = new Throttle<[number, number]>(120, (hs) => this.turnOn({ hs_color: hs }));
  private sendK = new Throttle<number>(120, (k) => this.turnOn({ color_temp_kelvin: k }));
  private sendBright = new Throttle<number>(120, (b) => this.turnOn({ brightness_pct: Math.round(b * 100) }));
  private brightDrag = this.trackDrag((f, final) => {
    this._bright = f;
    final ? this.sendBright.flush(f) : this.sendBright.push(f);
  });
  private kDrag = this.trackDrag((f, final) => {
    this._k = this.kAt(f);
    final ? this.sendK.flush(this._k) : this.sendK.push(this._k);
  });
  private wheelActive = false;

  constructor() {
    super();
    this.modes = [];
    this.slots = [];
    this.presets = [];
    this.min = 2000;
    this.max = 6500;
    this.step = 50;
    this._hs = [30, 60];
    this._k = 4000;
    this._bright = 1;
  }

  static open(opts: LightDialogOptions) {
    const { hass, entity, body, mode, presets, min, max, slots, heading } = opts;
    const dlg = document.createElement("te-light-dialog") as TeLightDialog;
    const st = hass.states[entity];
    const range = resolveValue(hass, { entity, attribute: "color_temp_kelvin", min, max });
    Object.assign(dlg, { hass, entity, heading, slots: slots ?? [], modes: lightModes(st), min: range.min, max: range.max, step: range.step });
    dlg.presets = (presets ?? DEFAULT_PRESETS).map((p) => ({ ...p, kelvin: clamp(p.kelvin, range.min, range.max) }));
    dlg.dataset.body = body;

    let hs = st?.attributes.hs_color as [number, number] | undefined;
    if (!hs && st?.attributes.rgb_color) hs = rgbToHsv(...(st.attributes.rgb_color as [number, number, number])).slice(0, 2) as [number, number];
    if (hs) dlg._hs = [hs[0], hs[1]];
    const kelvin = toNumber(st?.attributes.color_temp_kelvin);
    if (kelvin) dlg._k = kelvin;
    if (typeof st?.attributes.brightness === "number") dlg._bright = st.attributes.brightness / 255;

    const current: LightMode = st?.attributes.color_mode === "color_temp" ? "white" : "color";
    const wanted = mode ?? current;
    dlg._mode = dlg.modes.includes(wanted) ? wanted : dlg.modes[0];
    document.body.appendChild(dlg);
    return dlg;
  }

  protected updated(changed: PropertyValues) {
    super.updated(changed);
    // the wheel's canvas is created whenever the COLOR page is shown
    if (changed.has("_mode") && this._mode === "color") this.paintWheel();
  }

  private paintWheel() {
    const canvas = this.renderRoot.querySelector("canvas");
    if (!canvas) return;
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
        if (dist > r) continue;
        const [cr, cg, cb] = hsvToRgb(((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360, (dist / r) * 100, 100);
        img.data.set([cr, cg, cb, 255], (y * size + x) * 4);
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

  private kAt(frac: number) {
    const raw = this.min + frac * (this.max - this.min);
    return Math.round(raw / this.step) * this.step;
  }

  private pickK(k: number) {
    this._k = k;
    this.sendK.flush(k);
  }

  static styles = [
    TeModal.styles,
    css`
      /* COLOR | WHITE: latching keys with LEDs, like SW-5 keys */
      .modes {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .mode {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        height: 34px;
        border-radius: var(--te-r-key);
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.08em;
        color: var(--te-ink);
        background: var(--te-grain), var(--te-face), var(--te-key-light);
        background-blend-mode: overlay, normal, normal;
        box-shadow: var(--te-elev-1);
      }
      .mode.on {
        box-shadow: var(--te-pressed);
        transform: translateY(1px);
      }
      .mode .led {
        margin: 0;
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
      .presets {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: 1fr;
        gap: 12px;
      }
      .preset {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
      }
      .preset .chip {
        position: relative;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: var(--te-grain), radial-gradient(circle at 34% 28%, rgba(255, 255, 255, 0.35), transparent 60%), var(--white);
        background-blend-mode: overlay, normal, normal;
        box-shadow: var(--te-elev-2);
        transition: box-shadow 0.08s ease-out, transform 0.08s ease-out;
      }
      .preset:active .chip {
        box-shadow: var(--te-pressed);
        transform: translateY(1px);
      }
      .preset .led {
        margin: 0;
      }
    `,
  ];

  private renderModes() {
    if (this.modes.length < 2) return "";
    const label: Record<LightMode, string> = { color: "COLOR", white: "WHITE" };
    return html`<div class="modes" role="tablist">
      ${this.modes.map(
        (m) => html`<button class="mode ${classMap({ on: m === this._mode })}" role="tab" aria-selected=${m === this._mode ? "true" : "false"} @click=${() => (this._mode = m)}>
          <span class="led ${classMap({ on: m === this._mode })}"></span>${label[m]}
        </button>`,
      )}
    </div>`;
  }

  private renderColor() {
    const [h, s] = this._hs;
    const rad = (h * Math.PI) / 180;
    const color = `rgb(${hsvToRgb(h, s, 100).join(",")})`;
    return html`
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
    `;
  }

  private renderWhite() {
    const range = this.max - this.min || 1;
    const white = kelvinCss(this._k);
    return html`
      ${this.fader("TEMPERATURE", (this._k - this.min) / range, kelvinGradient(this.min, this.max), this.kDrag, `${this._k}K`)}
      ${this.fader("BRIGHTNESS", this._bright, `linear-gradient(90deg, #0e0e0e, ${white})`, this.brightDrag)}
      ${this.presets.length
        ? html`<div class="presets">
            ${this.presets.map(
              (p) => html`<button class="preset" aria-label=${`${p.label} ${p.kelvin}K`} @click=${() => this.pickK(p.kelvin)}>
                <span class="chip" style=${styleMap({ "--white": kelvinCss(p.kelvin) })}></span>
                <span class="sublabel"><span class="led ${classMap({ on: Math.abs(p.kelvin - this._k) <= MATCH_K })}"></span>${p.label}</span>
              </button>`,
            )}
          </div>`
        : ""}
    `;
  }

  render() {
    const page =
      this._mode === "color"
        ? this.renderColor()
        : this._mode === "white"
          ? this.renderWhite()
          : this.fader("BRIGHTNESS", this._bright, "linear-gradient(90deg, #0e0e0e, #f4f3ef)", this.brightDrag);
    return this.shell(html`${this.renderModes()}${page}`);
  }
}

if (!customElements.get("te-light-dialog")) customElements.define("te-light-dialog", TeLightDialog);
