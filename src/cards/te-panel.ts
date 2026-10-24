import { css, html, type PropertyValues } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { TeBaseCard, type BaseConfig } from "../core/base-card";
import { createChildCard, forwardHass } from "../core/child-cards";
import { MODELS, registerCard } from "../registry";
import { sharedStyles } from "../theme/shared";

interface Tab {
  label: string;
  color: "light" | "dark" | "grey" | "accent";
}

interface PanelConfig extends BaseConfig {
  title: string;
  caption: string;
  subtitle: string;
  /** Decorative K.O.-style tab strip along the top edge. */
  tabs: Tab[];
  /** Put the title on a lighter screwed-on faceplate (K.O. / MIC FX). */
  faceplate: boolean;
  /** Space between rows and between cards in a row, px. */
  gap: number;
  cards: (Record<string, unknown> | Record<string, unknown>[])[];
}

/** CH-1 — device chassis: screws, model name, orange katakana subtitle, rows of child cards. */
export class TePanel extends TeBaseCard<PanelConfig> {
  private rows: HTMLElement[][] = [];

  static styles = [
    sharedStyles,
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
      .body {
        display: grid;
        gap: var(--gap);
      }
      .row {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: 1fr;
        gap: var(--gap);
      }
      .item {
        min-width: 0;
      }
    `,
  ];

  static getStubConfig() {
    return { title: "K.O.", subtitle: "サンプラー", cards: [] };
  }

  protected normalizeConfig(c: Record<string, any>): PanelConfig {
    const tabs: Tab[] = (c.tabs ?? []).map((t: any) => (typeof t === "string" ? { label: t, color: "light" } : { color: "light", ...t }));
    const cfg: PanelConfig = { ...c, type: c.type, title: c.title ?? "", caption: c.caption ?? "", subtitle: c.subtitle ?? "", tabs, faceplate: c.faceplate === true, gap: c.gap ?? 8, cards: c.cards ?? [] };
    this.rows = cfg.cards.map((entry) => (Array.isArray(entry) ? entry : [entry]).map((child) => createChildCard(child, this.hass)));
    return cfg;
  }

  protected shouldUpdate(changed: PropertyValues) {
    if (changed.has("hass")) forwardHass(this.rows.flat(), this.hass);
    return !!this._config && (changed.size > 1 || !changed.has("hass"));
  }

  getCardSize() {
    return 3 + this.rows.length * 3;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }

  render() {
    const c = this._config!;
    const ink = (t: Tab) => (t.color === "light" ? "var(--te-ink)" : "#f4f3ef");
    const bg = (t: Tab) => (t.color === "accent" ? "var(--te-accent)" : `var(--te-key-${t.color})`);
    // top screws drop below the tab strip when there is one
    const top = c.tabs.length ? 36 : 10;
    const screws = [`top:${top}px;left:10px`, `top:${top}px;right:10px`, "bottom:10px;left:10px", "bottom:10px;right:10px"];
    return html`
      <div class="chassis ${classMap({ faceplate: c.faceplate })}" style=${styleMap({ "--te-theme": c.body, "--gap": `${c.gap}px` })}>
        ${c.tabs.length
          ? html`<div class="tabs">${c.tabs.map((t) => html`<div class="tab" style=${styleMap({ "--bg": bg(t), "--ink": ink(t) })}>${t.label}</div>`)}</div>`
          : ""}
        ${c.faceplate ? "" : screws.map((s) => html`<div class="screw" style=${s}></div>`)}
        <header>
          ${c.faceplate ? ["top:8px;left:8px", "top:8px;right:8px", "bottom:8px;left:8px", "bottom:8px;right:8px"].map((s) => html`<div class="screw" style=${s}></div>`) : ""}
          <div class="title"><span>${c.title}</span><span class="caption">${c.caption}</span></div>
          <div class="subtitle">${c.subtitle}</div>
        </header>
        <div class="body">
          ${this.rows.map((row) =>
            row.length === 1 ? html`<div class="item">${row[0]}</div>` : html`<div class="row">${row.map((el) => html`<div class="item">${el}</div>`)}</div>`,
          )}
        </div>
      </div>
    `;
  }
}

registerCard({ ...MODELS.panel, description: "Device chassis that holds other cards in rows.", preview: false }, TePanel);
