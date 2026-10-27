import { css, html, type PropertyValues } from "lit";
import { TeBaseCard, type BaseConfig } from "../core/base-card";
import { buildRows, createChildCard, forwardHass, renderRows, rowCards, rowStyles, type Rows } from "../core/child-cards";
import { configForm, F } from "../core/form";
import { containerEditor } from "../editor/te-container-editor";
import { TeModal } from "../core/modal";
import { MODELS, registerCard } from "../registry";
import { sharedStyles } from "../theme/shared";
import type { BodyTheme } from "../types";

interface PopupConfig extends BaseConfig {
  /** Dialog heading; defaults to `label`. */
  title?: string;
  icon?: string;
  glyph?: string;
  /** Card shown on the dashboard; tapping it opens the popup. Defaults to a K.O. key. */
  trigger: Record<string, unknown>;
  /** Popup contents, in rows like CH-1. */
  cards: unknown[];
  /** Dialog width in px. */
  width: number;
  gap: number;
}

const DEFAULTS = { label: "More", width: 420, gap: 8 } satisfies Partial<PopupConfig>;

/** The dialog PP-3 opens: any cards, laid out in rows. */
export class TePopupDialog extends TeModal {
  static properties = {
    rows: { attribute: false },
  };

  declare rows: Rows;

  constructor() {
    super();
    this.rows = [];
  }

  static styles = [TeModal.styles, rowStyles];

  render() {
    return this.shell(renderRows(this.rows));
  }
}

if (!customElements.get("te-popup-dialog")) customElements.define("te-popup-dialog", TePopupDialog);

/** PP-3 — a trigger card that opens a dialog holding other cards (more controls without more dashboard). */
export class TePopup extends TeBaseCard<PopupConfig> {
  private trigger?: HTMLElement;
  private dialog?: TePopupDialog;
  private rows: Rows = [];

  static styles = [
    sharedStyles,
    css`
      .trigger {
        height: 100%;
      }
    `,
  ];

  static getStubConfig() {
    return { label: "More", icon: "mdi:dots-horizontal", cards: [] };
  }

  /** Settings plus the rows of cards in the dialog, edited with HA's own card editor and picker. */
  static getConfigElement() {
    return containerEditor("popup", TePopup.getConfigForm());
  }

  static getConfigForm() {
    return configForm([F.grid(F.text("label"), F.text("title")), F.grid(F.icon(), F.text("glyph")), F.grid(F.num("width", 10), F.num("gap", 1)), F.look()], DEFAULTS);
  }

  protected normalizeConfig(c: Record<string, any>): PopupConfig {
    if (!Array.isArray(c.cards)) throw new Error("cards is required (a list of rows, like te-panel)");
    // label/icon/glyph style the default K.O. key; a custom trigger card brings its own
    const label = c.label ?? DEFAULTS.label;
    const base = c.trigger ?? { type: "custom:te-button", shape: "key", color: "grey", label, icon: c.icon, glyph: c.glyph, entity: c.entity };
    const trigger = {
      ...base,
      // the popup owns the tap; the trigger card must not also toggle something
      tap_action: { action: "none" },
      hold_action: { action: "none" },
    };
    const cfg: PopupConfig = { ...c, type: c.type, label, trigger, cards: c.cards, width: c.width ?? DEFAULTS.width, gap: c.gap ?? DEFAULTS.gap };
    this.trigger = createChildCard(trigger, this.hass);
    this.closeDialog();
    return cfg;
  }

  protected shouldUpdate(changed: PropertyValues) {
    if (changed.has("hass") && this.hass) {
      if (this.trigger) forwardHass([this.trigger], this.hass);
      forwardHass(rowCards(this.rows), this.hass);
    }
    // the trigger and popup contents re-render themselves; only re-render here for config changes
    return !!this._config && (changed.size > 1 || !changed.has("hass"));
  }

  getGridOptions() {
    return { columns: 3, rows: 2, min_rows: 1 };
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.closeDialog();
  }

  private closeDialog() {
    this.dialog?.close();
  }

  private open() {
    if (this.dialog || !this._config) return;
    const c = this._config;
    const body = (this.dataset.body as BodyTheme) ?? "silver";
    this.rows = buildRows(c.cards, this.hass);
    const dlg = document.createElement("te-popup-dialog") as TePopupDialog;
    Object.assign(dlg, { hass: this.hass, heading: (c.title ?? c.label ?? "").toUpperCase(), rows: this.rows });
    dlg.dataset.body = body;
    // children pick their body theme from --te-theme, like inside a CH-1 panel
    dlg.style.setProperty("--te-theme", body);
    dlg.style.setProperty("--dialog-w", `${c.width}px`);
    dlg.style.setProperty("--gap", `${c.gap}px`);
    dlg.addEventListener(
      "closed",
      () => {
        this.dialog = undefined;
        this.rows = [];
      },
      { once: true },
    );
    document.body.appendChild(dlg);
    this.dialog = dlg;
  }

  render() {
    return html`<div class="trigger" aria-haspopup="dialog" @click=${() => this.open()}>${this.trigger}</div>`;
  }
}

registerCard({ ...MODELS.popup, description: "Trigger key that opens a dialog holding any other cards." }, TePopup);
