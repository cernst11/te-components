import { css, html } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { TeBaseCard, type BaseConfig } from "../core/base-card";
import { pickEntity } from "../core/entity";
import { F } from "../core/form";
import { MODELS, registerCard } from "../registry";
import { sharedStyles } from "../theme/shared";
import type { HomeAssistant } from "../types";
import { hsvToRgb, rgbToHsv } from "../utils/color";

interface ColorPickerConfig extends BaseConfig {
  entity: string;
  /** Up to 3 input_text entities that store saved colors as #rrggbb. */
  slots: string[];
}

/** CL-16 — color swatch button; opens the HS wheel dialog. */
export class TeColorPicker extends TeBaseCard<ColorPickerConfig> {

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
    return { entity: pickEntity(hass, ["light"]), label: "COLOR" };
  }

  static getConfigForm() {
    return {
      schema: [F.entity(["light"]), F.labels(), { name: "slots", selector: { entity: { domain: "input_text", multiple: true } } }, F.look(F.feedback())],
    };
  }

  protected normalizeConfig(c: Record<string, any>): ColorPickerConfig {
    if (!c.entity) throw new Error("entity is required");
    return { ...c, type: c.type, entity: c.entity, slots: (c.slots ?? []).slice(0, 3), tile: c.tile === true };
  }

  protected watchedEntities() {
    return [this._config!.entity, ...this._config!.slots];
  }

  getGridOptions() {
    return { columns: 3, rows: 2, min_rows: 2 };
  }

  private swatch(): string | undefined {
    const st = this.stateObj();
    if (!st || st.state !== "on") return undefined;
    let hs = st.attributes.hs_color as number[] | undefined;
    if (!hs && st.attributes.rgb_color) hs = rgbToHsv(...(st.attributes.rgb_color as [number, number, number]));
    if (!hs) return undefined;
    return `rgb(${hsvToRgb(hs[0], hs[1], 100).join(",")})`;
  }

  private open() {
    const c = this._config!;
    this.openLightDialog({ entity: c.entity, mode: "color", slots: c.slots });
  }

  render() {
    const c = this._config!;
    return html`
      <div class="card control ${classMap({ tile: !!c.tile })}">
        <div class="label">${c.label ?? ""}</div>
        <button class="swatch" aria-haspopup="dialog" aria-label=${c.label || "color"} style=${styleMap({ "--swatch": this.swatch() })} @click=${() => this.open()}></button>
        <div class="sublabel">${c.sublabel ?? ""}</div>
      </div>
    `;
  }
}

registerCard({ ...MODELS.colorPicker, description: "Light color picker: HS wheel + brightness with hold-to-save color slots." }, TeColorPicker);
