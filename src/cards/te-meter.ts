import { css, html, svg, type PropertyValues } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { TeBaseCard, type BaseConfig } from "../core/base-card";
import { pickEntity } from "../core/entity";
import { F } from "../core/form";
import { formatValue, fracOf, resolveValue, type ValueConfig } from "../core/value";
import { MODELS, registerCard } from "../registry";
import { screenName, screenTheme } from "../screen/themes";
import { sharedStyles } from "../theme/shared";
import type { HomeAssistant } from "../types";

const STYLES = ["bar", "needle"] as const;

interface MeterConfig extends BaseConfig, Omit<ValueConfig, "set_action"> {
  entity: string;
  style: (typeof STYLES)[number];
  orientation: "horizontal" | "vertical";
  segments: number;
  /** Values at or above this light in accent (bar) / get an accent arc (needle). */
  warn?: number;
  /** Hold the highest recent segment for a moment, like a VU peak LED. */
  peak: boolean;
  show_value: boolean;
  screen: string;
}

const PEAK_HOLD_MS = 2500;
/** Needle sweep: ±50° from vertical. */
const SWEEP = 50;

/** VU-10 — level meter: segmented LED bar in a screen window, or an analog needle. Read-only. */
export class TeMeter extends TeBaseCard<MeterConfig> {
  private peakFrac = 0;
  private peakAt = 0;
  private peakTimer?: ReturnType<typeof setTimeout>;

  static styles = [
    sharedStyles,
    css`
      .window {
        display: flex;
        gap: 3px;
        padding: 7px;
        border-radius: 6px;
        background: var(--bg);
        box-shadow: var(--te-sunk-2);
        width: 100%;
        box-sizing: border-box;
      }
      .vertical .window {
        flex-direction: column-reverse;
        width: 34px;
        height: var(--len);
      }
      .horizontal .window {
        height: 26px;
      }
      .seg {
        flex: 1;
        border-radius: 1.5px;
        background: var(--ghost);
        transition: background 0.2s ease-out, box-shadow 0.2s ease-out;
      }
      .seg.lit {
        background: var(--fg);
        box-shadow: 0 0 6px var(--glow);
        transition: none;
      }
      .seg.warn.lit {
        background: var(--warn);
        box-shadow: 0 0 6px var(--warn);
      }
      .seg.peak {
        background: var(--fg);
        transition: none;
      }
      .seg.warn.peak {
        background: var(--warn);
      }
      .meter {
        display: flex;
        justify-content: center;
        width: 100%;
      }

      /* needle */
      .dial {
        width: 100%;
        max-width: 180px;
        border-radius: 8px;
        box-shadow: var(--te-sunk-2);
        background: var(--te-plate);
        display: block;
      }
      .needle {
        transform-origin: 70px 76px;
        transform: rotate(var(--rot));
        transition: transform 0.45s ease-out;
      }
      .scale {
        stroke: var(--te-ink);
        stroke-linecap: round;
      }
      .warn-arc {
        stroke: var(--te-accent);
      }
      .face-text {
        fill: var(--te-ink-dim);
        font-size: 7px;
        font-weight: 600;
        letter-spacing: 0.06em;
      }
    `,
  ];

  static getStubConfig(hass?: HomeAssistant) {
    return { entity: pickEntity(hass, ["sensor"]), label: "LEVEL", max: 100 };
  }

  static getConfigForm() {
    return {
      schema: [
        F.entity(),
        F.labels(),
        F.grid(F.select("style", STYLES), F.select("orientation", ["horizontal", "vertical"]), F.screen()),
        F.grid(F.num("min"), F.num("max"), F.num("warn")),
        F.grid(F.num("segments", 1), F.bool("peak"), F.bool("show_value")),
        F.grid(F.text("unit"), F.num("decimals", 1)),
        F.look(),
      ],
    };
  }

  protected normalizeConfig(c: Record<string, any>): MeterConfig {
    if (!c.entity) throw new Error("entity is required");
    return {
      ...c,
      type: c.type,
      entity: c.entity,
      style: STYLES.includes(c.style) ? c.style : "bar",
      orientation: c.orientation === "vertical" ? "vertical" : "horizontal",
      segments: Math.max(3, Math.min(32, c.segments ?? 12)),
      peak: c.peak !== false,
      show_value: c.show_value !== false,
      screen: screenName(c.screen),
      tile: c.tile === true,
    };
  }

  getGridOptions() {
    return this._config?.orientation === "vertical" ? { columns: 2, rows: 3 } : { columns: 6, rows: 1, min_columns: 3 };
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this.peakTimer);
  }

  protected willUpdate(changed: PropertyValues) {
    super.willUpdate(changed);
    const r = resolveValue(this.hass, this._config!);
    const frac = r.value === null ? 0 : fracOf(r, r.value);
    const now = Date.now();
    if (frac >= this.peakFrac || now - this.peakAt > PEAK_HOLD_MS) {
      this.peakFrac = frac;
      this.peakAt = now;
      clearTimeout(this.peakTimer);
      // drop the peak back to the level once the hold expires
      this.peakTimer = setTimeout(() => this.requestUpdate(), PEAK_HOLD_MS + 50);
    }
  }

  private renderBar(frac: number, warnFrac: number | undefined) {
    const c = this._config!;
    const theme = screenTheme(c.screen);
    const n = c.segments;
    const lit = Math.round(frac * n);
    const peak = c.peak ? Math.max(0, Math.round(this.peakFrac * n) - 1) : -1;
    const warnColor = c.screen === "lcd" ? theme.fg2 : "var(--te-accent)";
    return html`
      <div
        class="window"
        style=${styleMap({
          "--bg": theme.bg,
          "--fg": theme.fg,
          "--glow": theme.glow,
          "--warn": warnColor,
          "--ghost": `rgba(255,255,255,${Math.max(0.07, theme.ghost * 1.6)})`,
        })}
      >
        ${Array.from({ length: n }, (_, i) => {
          const warn = warnFrac !== undefined && (i + 1) / n > warnFrac + 1e-9;
          return html`<span class="seg ${classMap({ lit: i < lit, warn, peak: i === peak && i >= lit })}"></span>`;
        })}
      </div>
    `;
  }

  private renderNeedle(frac: number, warnFrac: number | undefined, minText: string, maxText: string) {
    const c = this._config!;
    const cx = 70;
    const cy = 76;
    const pt = (f: number, r: number) => {
      const a = ((-SWEEP + f * SWEEP * 2) * Math.PI) / 180;
      return [cx + Math.sin(a) * r, cy - Math.cos(a) * r];
    };
    const ticks = Array.from({ length: c.segments + 1 }, (_, i) => {
      const f = i / c.segments;
      const major = i === 0 || i === c.segments || i === c.segments / 2;
      const [x1, y1] = pt(f, major ? 50 : 53);
      const [x2, y2] = pt(f, 58);
      return svg`<line class="scale" x1=${x1} y1=${y1} x2=${x2} y2=${y2} stroke-width=${major ? 1.4 : 0.8} />`;
    });
    let warnArc = svg``;
    if (warnFrac !== undefined && warnFrac < 1) {
      const [x1, y1] = pt(warnFrac, 61);
      const [x2, y2] = pt(1, 61);
      warnArc = svg`<path class="warn-arc" d=${`M${x1} ${y1} A61 61 0 0 1 ${x2} ${y2}`} fill="none" stroke-width="3" />`;
    }
    // end figures sit inside the scale, below the tick ends
    const [lx, ly] = pt(0, 37);
    const [rx, ry] = pt(1, 37);
    return html`
      <svg class="dial" viewBox="0 0 140 86" role="img" aria-hidden="true">
        <path class="scale" d=${`M${pt(0, 58)[0]} ${pt(0, 58)[1]} A58 58 0 0 1 ${pt(1, 58)[0]} ${pt(1, 58)[1]}`} fill="none" stroke-width="0.8" />
        ${warnArc} ${ticks}
        <text class="face-text" x=${lx} y=${ly} text-anchor="middle">${minText}</text>
        <text class="face-text" x=${rx} y=${ry} text-anchor="middle">${maxText}</text>
        <text class="face-text" x="70" y="58" text-anchor="middle">${(c.unit ?? "VU").toUpperCase()}</text>
        <g class="needle" style=${styleMap({ "--rot": `${-SWEEP + frac * SWEEP * 2}deg` })}>
          <line x1="70" y1="76" x2="70" y2="16" stroke="var(--te-accent)" stroke-width="1.4" stroke-linecap="round" />
        </g>
        <circle cx="70" cy="76" r="5" fill="var(--te-key-dark)" />
      </svg>
    `;
  }

  render() {
    const c = this._config!;
    const r = resolveValue(this.hass, c);
    const frac = r.value === null ? 0 : fracOf(r, r.value);
    const warnFrac = c.warn === undefined ? undefined : fracOf(r, c.warn);
    const fmt = (v: number) => (r.percent ? `${Math.round(fracOf(r, v) * 100)}` : String(Number(v.toFixed(r.decimals))));
    const value = formatValue(r, r.value);
    return html`
      <div class="card ${classMap({ tile: !!c.tile, [c.orientation]: true })}" style=${styleMap({ "--len": "150px" })}>
        <div class="label">${c.label ?? ""}</div>
        <div class="meter" role="meter" aria-label=${c.label || r.stateObj?.attributes.friendly_name || c.entity} aria-valuemin=${r.min} aria-valuemax=${r.max} aria-valuenow=${r.value ?? r.min} aria-valuetext=${value}>
          ${c.style === "needle" ? this.renderNeedle(frac, warnFrac, fmt(r.min), fmt(r.max)) : this.renderBar(frac, warnFrac)}
        </div>
        <div class="sublabel readout">${c.show_value ? value : (c.sublabel ?? "")}</div>
      </div>
    `;
  }
}

registerCard({ ...MODELS.meter, description: "Level meter: segmented LED bar or analog needle, with a warn threshold and peak hold." }, TeMeter);
