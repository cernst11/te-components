import { css, html } from "lit";
import { styleMap } from "lit/directives/style-map.js";
import { TeBaseCard, type BaseConfig } from "../core/base-card";
import { F } from "../core/form";
import { MODELS, registerCard } from "../registry";
import { sharedStyles } from "../theme/shared";

interface SpacerConfig extends BaseConfig {
  /** Minimum height in px; by default it takes whatever its row gives it. */
  height?: number;
}

/** BL-0 — empty cell: keeps a CH-1/GR-2 row lined up with the rows around it. */
export class TeSpacer extends TeBaseCard<SpacerConfig> {
  static styles = [
    sharedStyles,
    css`
      .card {
        padding: 0;
      }
    `,
  ];

  static getStubConfig() {
    return {};
  }

  static getConfigForm() {
    return { schema: [F.grid(F.num("height", 1))] };
  }

  protected normalizeConfig(c: Record<string, any>): SpacerConfig {
    return { ...c, type: c.type, tile: false };
  }

  getGridOptions() {
    return { columns: 3, rows: 1, min_columns: 1, min_rows: 1 };
  }

  render() {
    const h = this._config!.height;
    return html`<div class="card" aria-hidden="true" style=${styleMap({ minHeight: h ? `${h}px` : undefined })}></div>`;
  }
}

registerCard({ ...MODELS.spacer, description: "Empty cell that keeps rows lined up inside a panel or group.", preview: false }, TeSpacer);
