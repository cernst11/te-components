import { css, html, svg } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { TeBaseCard, type BaseConfig } from "../core/base-card";
import { F } from "../core/form";
import { MODELS, registerCard } from "../registry";
import { sharedStyles } from "../theme/shared";

const PATTERNS = ["grid", "round"] as const;

interface GrilleConfig extends BaseConfig {
  /** `grid`: MIC FX dot field across the card · `round`: K.O. II speaker, concentric rings. */
  pattern: (typeof PATTERNS)[number];
  height: number;
  /** Hole spacing, px. */
  pitch: number;
}

/** States that mean "making sound" for the optional LED. */
const ACTIVE = new Set(["on", "playing", "open"]);

/** Path of many circles in one `d` (two arcs each); one element per layer keeps a big grille cheap. */
const holesPath = (pts: [number, number][], r: number, dy = 0) =>
  pts.map(([x, y]) => `M${(x - r).toFixed(2)} ${(y + dy).toFixed(2)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`).join("");

/** SP-1 — speaker grille: a decorative dot-hole module, optionally with an LED for a speaker entity. */
export class TeGrille extends TeBaseCard<GrilleConfig> {
  static properties = {
    _w: { state: true },
  };

  declare _w: number;
  private ro?: ResizeObserver;

  constructor() {
    super();
    this._w = 0;
  }

  static styles = [
    sharedStyles,
    css`
      .card {
        align-items: stretch;
      }
      .head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 14px;
      }
      .head .led {
        margin: 0 2px;
      }
      .field {
        position: relative;
        width: 100%;
      }
      .field.clickable {
        cursor: pointer;
      }
      svg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        overflow: visible;
      }
      /* each hole: a dark bore with the lip catching light below it (studio light from above) */
      .lip {
        fill: var(--te-hi);
      }
      .bore {
        fill: rgba(0, 0, 0, 0.5);
      }
      /* on black the bore can't get darker than the body, so the lip carries the hole */
      :host([data-body="black"]) .bore {
        fill: rgba(0, 0, 0, 0.9);
      }
      :host([data-body="black"]) .lip {
        fill: rgba(255, 255, 255, 0.2);
      }
      .sublabel:empty {
        display: none;
      }
    `,
  ];

  static getStubConfig() {
    return { pattern: "grid", height: 72 };
  }

  static getConfigForm() {
    return {
      schema: [
        { ...F.entity(["media_player", "switch", "binary_sensor"]), required: false },
        F.labels(),
        F.grid(F.select("pattern", PATTERNS), F.num("height", 1), F.num("pitch", 1)),
        F.look(),
      ],
    };
  }

  protected normalizeConfig(c: Record<string, any>): GrilleConfig {
    return {
      ...c,
      type: c.type,
      pattern: PATTERNS.includes(c.pattern) ? c.pattern : "grid",
      height: Math.max(16, c.height ?? 72),
      pitch: Math.max(4, c.pitch ?? 7),
      tile: c.tile === true,
    };
  }

  getGridOptions() {
    return { columns: 6, rows: 2, min_columns: 2 };
  }

  connectedCallback() {
    super.connectedCallback();
    this.ro = new ResizeObserver(([e]) => {
      const w = Math.round(e.contentRect.width);
      if (w !== this._w) this._w = w;
    });
    this.updateComplete.then(() => {
      const field = this.renderRoot.querySelector(".field");
      if (field && this.ro) this.ro.observe(field);
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.ro?.disconnect();
    this.ro = undefined;
  }

  /** Hole centres for the current size; only whole holes, never clipped at the edge. */
  private holes(w: number, h: number): { pts: [number, number][]; r: number } {
    const p = this._config!.pitch;
    const r = p * 0.26;
    const pts: [number, number][] = [];
    if (this._config!.pattern === "round") {
      // concentric rings, holes spaced ~one pitch along each ring
      const R = Math.min(w, h) / 2 - r - 1;
      const cx = w / 2;
      const cy = h / 2;
      pts.push([cx, cy]);
      for (let ring = 1; ring * p <= R; ring++) {
        const rad = ring * p;
        const n = Math.round((2 * Math.PI * rad) / p);
        const phase = ring % 2 ? 0 : Math.PI / n;
        for (let i = 0; i < n; i++) pts.push([cx + Math.cos(phase + (i * 2 * Math.PI) / n) * rad, cy + Math.sin(phase + (i * 2 * Math.PI) / n) * rad]);
      }
      return { pts, r };
    }
    const cols = Math.floor((w - 2 * r) / p) + 1;
    const rows = Math.floor((h - 2 * r) / p) + 1;
    const x0 = (w - (cols - 1) * p) / 2;
    const y0 = (h - (rows - 1) * p) / 2;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) pts.push([x0 + i * p, y0 + j * p]);
    return { pts, r };
  }

  render() {
    const c = this._config!;
    const st = this.stateObj();
    const on = !!st && ACTIVE.has(st.state);
    const h = c.height;
    const { pts, r } = this._w ? this.holes(this._w, h) : { pts: [], r: 0 };
    const clickable = !!c.entity;
    const name = c.label || st?.attributes.friendly_name || (c.entity ? c.entity.split(".")[1] : "speaker grille");
    return html`
      <div class="card ${classMap({ tile: !!c.tile })}">
        ${c.label || c.entity
          ? html`<div class="head">
              <span class="label">${c.label ?? ""}</span>
              ${c.entity ? html`<span class="led ${classMap({ on })}" title=${st?.state ?? ""}></span>` : ""}
            </div>`
          : ""}
        <div
          class="field ${classMap({ clickable })}"
          style=${styleMap({ height: `${h}px` })}
          role=${clickable ? "button" : "img"}
          tabindex=${clickable ? "0" : "-1"}
          aria-label=${clickable ? `${name}: ${st?.state ?? "unavailable"}` : name}
          @click=${() => clickable && this.run({ action: "more-info" })}
          @keydown=${(e: KeyboardEvent) => clickable && (e.key === "Enter" || e.key === " ") && (e.preventDefault(), this.run({ action: "more-info" }))}
        >
          <svg viewBox=${`0 0 ${this._w || 1} ${h}`} aria-hidden="true">
            ${svg`<path class="lip" d=${holesPath(pts, r, 0.7)} /><path class="bore" d=${holesPath(pts, r)} />`}
          </svg>
        </div>
        <div class="sublabel">${c.sublabel ?? ""}</div>
      </div>
    `;
  }
}

registerCard({ ...MODELS.grille, description: "Decorative speaker grille (dot field or round speaker), with an optional LED for a speaker." }, TeGrille);
