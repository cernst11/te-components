import { css, html, type PropertyValues } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { TeBaseCard, type BaseConfig } from "../core/base-card";
import { createChildCard, forwardHass } from "../core/child-cards";
import { configForm, F } from "../core/form";
import { containerEditor } from "../editor/te-container-editor";
import { MODELS, registerCard } from "../registry";
import { sharedStyles } from "../theme/shared";

interface GroupConfig extends BaseConfig {
  cards: Record<string, unknown>[];
  direction: "row" | "column";
  gap: number;
}

const DEFAULTS = { direction: "row", gap: 12, tile: true } satisfies Partial<GroupConfig>;

/** GR-2 — lays out several modules on one shared tile. */
export class TeGroup extends TeBaseCard<GroupConfig> {
  private children_: HTMLElement[] = [];

  static styles = [
    sharedStyles,
    css`
      .group {
        display: flex;
        align-items: stretch;
        justify-content: center;
        padding: 8px;
        border-radius: var(--te-r-tile);
      }
      .group.tile {
        background: var(--te-grain), var(--te-face), var(--te-body);
        background-blend-mode: overlay, normal, normal;
        box-shadow: var(--te-tile-edge);
      }
      .group > * {
        flex: 1;
        min-width: 0;
      }
    `,
  ];

  static getStubConfig() {
    return { direction: "row", cards: [] };
  }

  protected normalizeConfig(c: Record<string, any>): GroupConfig {
    const cfg: GroupConfig = { ...c, type: c.type, cards: c.cards ?? [], direction: c.direction === "column" ? "column" : DEFAULTS.direction, gap: c.gap ?? DEFAULTS.gap, tile: c.tile ?? DEFAULTS.tile };
    this.children_ = cfg.cards.map((child) => createChildCard(child, this.hass));
    return cfg;
  }

  protected shouldUpdate(changed: PropertyValues) {
    if (changed.has("hass")) forwardHass(this.children_, this.hass);
    return !!this._config && (changed.size > 1 || !changed.has("hass"));
  }

  getCardSize() {
    return 2 + this.children_.length * 2;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 3 };
  }

  /** Settings plus the child cards, edited with HA's own card editor and picker. */
  static getConfigElement() {
    return containerEditor("group", TeGroup.getConfigForm());
  }

  static getConfigForm() {
    return configForm([F.grid(F.select("direction", ["row", "column"]), F.num("gap", 1)), F.look()], DEFAULTS);
  }

  render() {
    const c = this._config!;
    return html`<div
      class="group ${classMap({ tile: !!c.tile })}"
      style=${styleMap({ flexDirection: c.direction, gap: `${c.gap}px`, "--te-theme": c.body, "--te-feedback": c.feedback })}
    >
      ${this.children_}
    </div>`;
  }
}

registerCard({ ...MODELS.group, description: "Groups several TE modules on one shared tile.", preview: false }, TeGroup);
