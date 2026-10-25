import { css, html, type PropertyValues } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { TeBaseCard, type BaseConfig } from "../core/base-card";
import { buildRows, forwardHass, renderRows, rowCards, rowStyles, type Rows } from "../core/child-cards";
import { F } from "../core/form";
import { MODELS, registerCard } from "../registry";
import { sharedStyles } from "../theme/shared";

interface Tab {
  label: string;
  color: "light" | "dark" | "grey" | "accent";
  /** Rows shown while this tab is selected; tabs without cards are decoration. */
  cards?: PanelConfig["cards"];
}

interface PanelConfig extends BaseConfig {
  title: string;
  caption: string;
  subtitle: string;
  /** K.O.-style tab strip along the top edge; tabs with `cards` switch pages. */
  tabs: Tab[];
  /** Tab selected on load (index). */
  default_tab: number;
  /** Go back to `default_tab` after this many seconds without a touch (wall displays); 0 = stay. */
  reset_after: number;
  /** Put the title on a lighter screwed-on faceplate (K.O. / MIC FX). */
  faceplate: boolean;
  /** Space between rows and between cards in a row, px. */
  gap: number;
  cards: (Record<string, unknown> | Record<string, unknown>[])[];
}

/** CH-1 — device chassis: screws, model name, orange katakana subtitle, rows of child cards. */
export class TePanel extends TeBaseCard<PanelConfig> {
  static properties = {
    _tab: { state: true },
  };

  declare _tab: number;
  private rows: Rows = [];
  /** Rows per tab (empty for decorative tabs), built once per config so pages keep their state. */
  private tabRows: Rows[] = [];
  private resetTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    super();
    this._tab = 0;
  }

  static styles = [
    sharedStyles,
    rowStyles,
    css`
      .chassis {
        position: relative;
        overflow: hidden;
        border-radius: var(--te-r-panel);
        padding: 22px 20px 18px;
        background: var(--te-grain), var(--te-face), var(--te-body);
        background-blend-mode: overlay, normal, normal;
        box-shadow: var(--te-panel-shadow);
      }
      .tabs {
        display: flex;
        margin: -22px -20px 18px;
        height: 26px;
      }
      .tab {
        flex: 1;
        display: flex;
        align-items: center;
        padding: 0 10px;
        font-size: 10px;
        font-weight: 500;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--ink);
        background: var(--te-grain), var(--bg);
        background-blend-mode: overlay, normal;
        box-shadow: inset -1px 0 0 var(--te-lo), inset 0 -1px 0 var(--te-lo);
      }
      /* page tabs: the selected one sits pressed in, with its LED lit */
      button.tab {
        gap: 6px;
        cursor: pointer;
        font: inherit;
        font-size: 10px;
        font-weight: 500;
        transition: box-shadow 0.08s ease-out;
      }
      button.tab.on {
        box-shadow: inset -1px 0 0 var(--te-lo), inset 0 2px 4px var(--te-occl);
      }
      /* the selected page follows the always-shown rows */
      .body + .page {
        margin-top: var(--gap, 8px);
      }
      button.tab:focus-visible {
        outline-offset: -3px;
      }
      header {
        position: relative;
        margin-bottom: 14px;
      }
      .faceplate header {
        margin: 0 -8px 16px;
        padding: 18px 20px 16px;
        border-radius: 8px;
        background: var(--te-grain), var(--te-face), var(--te-plate);
        background-blend-mode: overlay, normal, normal;
        box-shadow: var(--te-elev-1);
      }
      .title {
        display: flex;
        align-items: baseline;
        gap: 8px;
        font-size: 30px;
        font-weight: 300;
        letter-spacing: -0.01em;
        line-height: 1.05;
      }
      .caption {
        font-size: 13px;
        font-weight: 400;
        letter-spacing: 0.02em;
        color: var(--te-ink-dim);
        text-transform: uppercase;
      }
      .subtitle {
        margin-top: 4px;
        font-size: 15px;
        font-weight: 500;
        letter-spacing: 0.1em;
        color: var(--te-accent);
      }
      .subtitle:empty,
      .caption:empty {
        display: none;
      }
    `,
  ];

  static getStubConfig() {
    return { title: "K.O.", subtitle: "サンプラー", cards: [] };
  }

  protected normalizeConfig(c: Record<string, any>): PanelConfig {
    const tabs: Tab[] = (c.tabs ?? []).map((t: any) => (typeof t === "string" ? { label: t, color: "light" } : { color: "light", ...t }));
    const cfg: PanelConfig = {
      ...c,
      type: c.type,
      title: c.title ?? "",
      caption: c.caption ?? "",
      subtitle: c.subtitle ?? "",
      tabs,
      default_tab: Math.min(Math.max(0, Math.floor(c.default_tab ?? 0)), Math.max(0, tabs.length - 1)),
      reset_after: Math.max(0, Number(c.reset_after) || 0),
      faceplate: c.faceplate === true,
      gap: c.gap ?? 8,
      cards: c.cards ?? [],
    };
    this.rows = buildRows(cfg.cards, this.hass);
    this.tabRows = tabs.map((t) => (Array.isArray(t.cards) ? buildRows(t.cards, this.hass) : []));
    this._tab = cfg.default_tab;
    return cfg;
  }

  /** Whether the tab strip switches pages (some tab has cards). */
  private get paged() {
    return this.tabRows.some((r) => r.length);
  }

  /** Visible cards only: hidden pages get hass when they're shown. */
  private get liveCards() {
    return [...rowCards(this.rows), ...rowCards(this.tabRows[this._tab] ?? [])];
  }

  protected shouldUpdate(changed: PropertyValues) {
    if (changed.has("hass") || changed.has("_tab")) forwardHass(this.liveCards, this.hass);
    return !!this._config && (changed.size > 1 || !changed.has("hass"));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this.resetTimer);
  }

  private select(i: number) {
    if (!this.tabRows[i]?.length) return;
    if (i !== this._tab) {
      this._tab = i;
      this.feedback("tick");
    }
    this.armReset();
  }

  /** Any touch inside the panel restarts the return-to-default countdown. */
  private armReset = () => {
    const c = this._config;
    clearTimeout(this.resetTimer);
    if (!c?.reset_after || this._tab === c.default_tab) return;
    this.resetTimer = setTimeout(() => (this._tab = c.default_tab), c.reset_after * 1000);
  };

  private onTabKey(ev: KeyboardEvent) {
    const pages = this.tabRows.map((r, i) => (r.length ? i : -1)).filter((i) => i >= 0);
    const at = pages.indexOf(this._tab);
    const next = ev.key === "ArrowRight" ? pages[(at + 1) % pages.length] : ev.key === "ArrowLeft" ? pages[(at - 1 + pages.length) % pages.length] : undefined;
    if (next === undefined) return;
    ev.preventDefault();
    this.select(next);
    (this.renderRoot.querySelectorAll<HTMLElement>("button.tab")[next] as HTMLElement | undefined)?.focus();
  }

  getCardSize() {
    return 3 + (this.rows.length + Math.max(0, ...this.tabRows.map((r) => r.length))) * 3;
  }

  /** Header and look; `tabs` and the child `cards` are edited in YAML. */
  static getConfigForm() {
    return {
      schema: [
        F.grid(F.text("title"), F.text("caption"), F.text("subtitle")),
        F.grid(F.bool("faceplate"), F.num("gap", 1), F.feedback()),
        F.grid(F.select("body", ["silver", "black"]), F.num("default_tab", 1), F.num("reset_after", 1)),
      ],
    };
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }

  render() {
    const c = this._config!;
    const ink = (t: Tab) => (t.color === "light" ? "var(--te-ink)" : "var(--te-ink-on-dark)");
    const bg = (t: Tab) => (t.color === "accent" ? "var(--te-accent)" : `var(--te-key-${t.color})`);
    // top screws drop below the tab strip when there is one
    const top = c.tabs.length ? 36 : 10;
    const screws = [`top:${top}px;left:10px`, `top:${top}px;right:10px`, "bottom:10px;left:10px", "bottom:10px;right:10px"];
    const paged = this.paged;
    const tab = (t: Tab, i: number) => {
      const style = styleMap({ "--bg": bg(t), "--ink": ink(t) });
      if (!paged || !this.tabRows[i].length) return html`<div class="tab" style=${style}>${t.label}</div>`;
      const on = i === this._tab;
      return html`<button
        class="tab ${classMap({ on })}"
        style=${style}
        role="tab"
        aria-selected=${on ? "true" : "false"}
        tabindex=${on ? "0" : "-1"}
        @click=${() => this.select(i)}
      >
        <span class="led ${classMap({ on })}"></span>${t.label}
      </button>`;
    };
    return html`
      <div
        class="chassis ${classMap({ faceplate: c.faceplate })}"
        style=${styleMap({ "--te-theme": c.body, "--te-feedback": c.feedback, "--gap": `${c.gap}px` })}
        @pointerdown=${c.reset_after ? this.armReset : undefined}
      >
        ${c.tabs.length
          ? html`<div class="tabs" role=${paged ? "tablist" : "presentation"} @keydown=${paged ? this.onTabKey : undefined}>${c.tabs.map(tab)}</div>`
          : ""}
        ${c.faceplate ? "" : screws.map((s) => html`<div class="screw" style=${s}></div>`)}
        <header>
          ${c.faceplate ? ["top:8px;left:8px", "top:8px;right:8px", "bottom:8px;left:8px", "bottom:8px;right:8px"].map((s) => html`<div class="screw" style=${s}></div>`) : ""}
          <div class="title"><span>${c.title}</span><span class="caption">${c.caption}</span></div>
          <div class="subtitle">${c.subtitle}</div>
        </header>
        ${this.rows.length ? renderRows(this.rows) : ""}
        ${paged ? html`<div class="page" role="tabpanel">${renderRows(this.tabRows[this._tab] ?? [])}</div>` : ""}
      </div>
    `;
  }
}

registerCard({ ...MODELS.panel, description: "Device chassis that holds other cards in rows.", preview: false }, TePanel);
