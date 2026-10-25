import { css, html } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { TeBaseCard, type BaseConfig } from "../core/base-card";
import { pickEntity } from "../core/entity";
import { F } from "../core/form";
import { resolveValue } from "../core/value";
import { MODELS, registerCard } from "../registry";
import { sharedStyles } from "../theme/shared";
import type { HomeAssistant } from "../types";
import { kelvinCss } from "../utils/color";
import { toNumber } from "../utils/math";
import { DEFAULT_PRESETS, type KelvinPreset } from "./te-light-dialog";

interface ColorTempConfig extends BaseConfig {
  entity: string;
  presets: KelvinPreset[];
  min?: number;
  max?: number;
}

const toPreset = (p: unknown): KelvinPreset | undefined => {
  if (typeof p === "number") return { label: `${p}K`, kelvin: p };
  if (p && typeof p === "object") {
    const kelvin = toNumber((p as Record<string, unknown>).kelvin);
    if (kelvin) return { label: String((p as Record<string, unknown>).label ?? `${kelvin}K`), kelvin };
  }
  return undefined;
};

/** CT-27 — color temperature swatch for tunable-white lights; opens the warm→cool dialog. */
export class TeColorTemp extends TeBaseCard<ColorTempConfig> {

  static styles = [
    sharedStyles,
    css`
      .swatch {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: var(--te-grain), radial-gradient(circle at 34% 28%, rgba(255, 255, 255, 0.35), transparent 60%), var(--swatch, var(--te-key-light));
        background-blend-mode: overlay, normal, normal;
        box-shadow: var(--te-elev-2);
        transition: box-shadow 0.08s ease-out, transform 0.08s ease-out;
      }
      .swatch:active {
        box-shadow: var(--te-pressed);
        transform: translateY(1px);
      }
    `,
  ];

  static getStubConfig(hass?: HomeAssistant) {
    return { entity: pickEntity(hass, ["light"]), label: "WHITE" };
  }

  static getConfigForm() {
    return {
      schema: [F.entity(["light"]), F.labels(), F.grid(F.num("min", 50), F.num("max", 50)), F.look(F.feedback())],
    };
  }

  protected normalizeConfig(c: Record<string, any>): ColorTempConfig {
    if (!c.entity) throw new Error("entity is required");
    const presets = Array.isArray(c.presets) ? c.presets.map(toPreset).filter((p): p is KelvinPreset => !!p) : DEFAULT_PRESETS;
    return { ...c, type: c.type, entity: c.entity, presets, tile: c.tile === true };
  }

  getGridOptions() {
    return { columns: 3, rows: 2, min_rows: 2 };
  }

  /** Entity range (or config override) and the current white, if the light is on in color-temp mode. */
  private reading() {
    const c = this._config!;
    const r = resolveValue(this.hass, { entity: c.entity, attribute: "color_temp_kelvin", min: c.min, max: c.max });
    const st = r.stateObj;
    let kelvin: number | undefined;
    if (st?.state === "on") {
      kelvin = toNumber(st.attributes.color_temp_kelvin);
      const mireds = toNumber(st.attributes.color_temp);
      if (kelvin === undefined && mireds) kelvin = Math.round(1e6 / mireds);
    }
    return { min: r.min, max: r.max, step: r.step, kelvin, on: st?.state === "on" };
  }

  private open() {
    const c = this._config!;
    this.openLightDialog({ entity: c.entity, mode: "white", presets: c.presets, min: c.min, max: c.max });
  }

  render() {
    const c = this._config!;
    const { kelvin, on } = this.reading();
    const readout = c.sublabel ?? (kelvin ? `${kelvin}K` : on ? "ON" : "OFF");
    return html`
      <div class="card control ${classMap({ tile: !!c.tile })}">
        <div class="label">${c.label ?? ""}</div>
        <button
          class="swatch"
          aria-haspopup="dialog"
          aria-label=${`${c.label || "white"} ${readout}`}
          style=${styleMap({ "--swatch": kelvin ? kelvinCss(kelvin) : undefined })}
          @click=${() => this.open()}
        ></button>
        <div class="sublabel readout">${readout}</div>
      </div>
    `;
  }
}

registerCard({ ...MODELS.colorTemp, description: "Color temperature for tunable-white lights: warm→cool fader, brightness and preset whites." }, TeColorTemp);
