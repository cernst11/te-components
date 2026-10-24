import { css, html } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { TeModal } from "../core/modal";
import { Throttle } from "../core/throttle";
import type { BodyTheme, HomeAssistant } from "../types";
import { kelvinCss, kelvinGradient } from "../utils/color";

export interface KelvinPreset {
  label: string;
  kelvin: number;
}

/** Color temperatures within this distance count as "the same" preset. */
const MATCH_K = 60;

/** Modal for CT-27: warm→cool fader, brightness fader, preset whites. */
export class TeColorTempDialog extends TeModal {
  static properties = {
    min: { type: Number },
    max: { type: Number },
    step: { type: Number },
    presets: { attribute: false },
    _k: { state: true },
    _bright: { state: true },
  };

  declare min: number;
  declare max: number;
  declare step: number;
  declare presets: KelvinPreset[];
  declare _k: number;
  declare _bright: number;

  private sendK = new Throttle<number>(120, (k) => this.turnOn({ color_temp_kelvin: k }));
  private sendBright = new Throttle<number>(120, (b) => this.turnOn({ brightness_pct: Math.round(b * 100) }));
  private kDrag = this.trackDrag((f, final) => {
    this._k = this.kAt(f);
    final ? this.sendK.flush(this._k) : this.sendK.push(this._k);
  });
  private brightDrag = this.trackDrag((f, final) => {
    this._bright = f;
    final ? this.sendBright.flush(f) : this.sendBright.push(f);
  });

  constructor() {
    super();
    this.heading = "WHITE";
    this.min = 2000;
    this.max = 6500;
    this.step = 50;
    this.presets = [];
    this._k = 4000;
    this._bright = 1;
  }

  static open(opts: { hass: HomeAssistant; entity: string; heading: string; body: BodyTheme; min: number; max: number; kelvin?: number; presets: KelvinPreset[] }) {
    const { kelvin, body, ...props } = opts;
    const dlg = document.createElement("te-color-temp-dialog") as TeColorTempDialog;
    Object.assign(dlg, props);
    dlg.dataset.body = body;
    if (kelvin) dlg._k = kelvin;
    const st = opts.hass.states[opts.entity];
    if (typeof st?.attributes.brightness === "number") dlg._bright = st.attributes.brightness / 255;
    document.body.appendChild(dlg);
    return dlg;
  }

  private kAt(frac: number) {
    const raw = this.min + frac * (this.max - this.min);
    return Math.round(raw / this.step) * this.step;
  }

  private pick(k: number) {
    this._k = k;
    this.sendK.flush(k);
  }

  static styles = [
    TeModal.styles,
    css`
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

  render() {
    const range = this.max - this.min || 1;
    const white = kelvinCss(this._k);
    return this.shell(html`
      ${this.fader("TEMPERATURE", (this._k - this.min) / range, kelvinGradient(this.min, this.max), this.kDrag, `${this._k}K`)}
      ${this.fader("BRIGHTNESS", this._bright, `linear-gradient(90deg, #0e0e0e, ${white})`, this.brightDrag)}
      ${this.presets.length
        ? html`<div class="presets">
            ${this.presets.map(
              (p) => html`<button class="preset" aria-label=${`${p.label} ${p.kelvin}K`} @click=${() => this.pick(p.kelvin)}>
                <span class="chip" style=${styleMap({ "--white": kelvinCss(p.kelvin) })}></span>
                <span class="sublabel"><span class="led ${classMap({ on: Math.abs(p.kelvin - this._k) <= MATCH_K })}"></span>${p.label}</span>
              </button>`,
            )}
          </div>`
        : ""}
    `);
  }
}

if (!customElements.get("te-color-temp-dialog")) customElements.define("te-color-temp-dialog", TeColorTempDialog);
