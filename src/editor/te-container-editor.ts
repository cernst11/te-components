import { mdiArrowDown, mdiArrowUp, mdiChevronDown, mdiChevronLeft, mdiChevronRight, mdiChevronUp, mdiClose, mdiCodeBraces, mdiContentCopy, mdiDelete, mdiLabelOutline, mdiListBoxOutline, mdiPlus } from "@mdi/js";
import { css, html, LitElement, nothing, svg } from "lit";
import { keyed } from "lit/directives/keyed.js";
import { addCard, fromEditRows, moveCard, moveCardToRow, moveRow, removeCard, removeRow, setBracket, setCard, toEditRows, type CardConfig, type EditRow } from "../core/rows-edit";
import type { HomeAssistant } from "../types";

/**
 * Visual editor for the container cards (CH-1 panel, PP-3 popup, GR-2 group): the card's own settings form,
 * then its child cards as rows of chips. The selected card is edited with HA's `hui-card-element-editor`
 * (visual or code), new cards come from HA's `hui-card-picker`, like HA's own stack cards.
 */

export type ContainerKind = "panel" | "popup" | "group";

type Config = Record<string, any>;
type Selection = { row: number; card: number } | { row: number; add: true };
type ChildEditor = HTMLElement & { toggleMode?: () => void };
type ConfigForm = { schema: unknown[]; computeHelper?: (item: any) => string | undefined };

const TAB_COLORS = ["light", "grey", "dark", "accent"];
const TAB_SCHEMA = [
  {
    type: "grid",
    name: "",
    schema: [
      { name: "label", selector: { text: {} } },
      { name: "color", selector: { select: { mode: "dropdown", options: TAB_COLORS.map((c) => ({ value: c, label: c })) } } },
    ],
  },
  // set it to make the tab a link (e.g. to another view) instead of a page
  { name: "tap_action", selector: { ui_action: {} } },
];
const BRACKET_SCHEMA = [{ name: "bracket", selector: { text: {} } }];
const bracketHelp = () => "Printed over this row's cards, like BPM — METRONOME on the K.O. II. Leave empty for none.";

/** HA loads its card editor and picker lazily, with the stack card editor; load them the same way. */
let haEditors: Promise<boolean> | undefined;
export function loadHaCardEditors(): Promise<boolean> {
  const ready = () => !!customElements.get("hui-card-element-editor") && !!customElements.get("hui-card-picker");
  if (ready()) return Promise.resolve(true);
  const load = async () => {
    const helpers = await (window as any).loadCardHelpers?.();
    if (!helpers) return;
    helpers.createCardElement({ type: "vertical-stack", cards: [] });
    await customElements.whenDefined("hui-vertical-stack-card");
    await (customElements.get("hui-vertical-stack-card") as any)?.getConfigElement?.();
    await Promise.all(["hui-card-element-editor", "hui-card-picker"].map((t) => customElements.whenDefined(t)));
  };
  // outside HA (or if HA changes how it loads these) give up after a few seconds; the editor says so
  haEditors ??= Promise.race([load().catch(() => {}), new Promise((r) => setTimeout(r, 5000))]).then(ready);
  return haEditors;
}

/** "KN-3 · kitchen": model name from the card picker list, plus whatever names the card (label, entity, glyph…). */
export function chipLabel(card: CardConfig): string {
  const type = String(card.type ?? "?");
  const meta = (window.customCards ?? []).find((c) => `custom:${c.type}` === type);
  const model = meta ? String(meta.name).split(" ")[0] : type.replace(/^custom:/, "");
  const entity = typeof card.entity === "string" ? card.entity.split(".")[1] : undefined;
  const icon = typeof card.icon === "string" ? card.icon.replace(/^mdi:/, "") : undefined;
  const what = card.label ?? card.title ?? card.name ?? entity ?? card.glyph ?? icon ?? (card.clock ? "clock" : "");
  return what ? `${model} · ${what}` : model;
}

const icon = (path: string) => html`<svg viewBox="0 0 24 24" aria-hidden="true">${svg`<path d=${path} />`}</svg>`;

export class TeContainerEditor extends LitElement {
  static properties = {
    hass: { attribute: false },
    lovelace: { attribute: false },
    _config: { state: true },
    _page: { state: true },
    _sel: { state: true },
    _gui: { state: true },
    _guiAvailable: { state: true },
    _haReady: { state: true },
    _bracketRow: { state: true },
  };

  declare hass?: HomeAssistant;
  declare lovelace?: unknown;
  declare _config?: Config;
  /** -1: the panel's own cards (always shown); otherwise a tab's page. */
  declare _page: number;
  /** The open card editor or picker; none means everything is collapsed. */
  declare _sel?: Selection;
  /** Row whose bracket field is open. */
  declare _bracketRow?: number;
  declare _gui: boolean;
  declare _guiAvailable: boolean;
  declare _haReady: boolean;

  kind: ContainerKind = "panel";
  /** The card's own settings: its getConfigForm(). */
  form: ConfigForm = { schema: [] };
  /** Bumped on every structural change so the child editor is rebuilt for the card now selected. */
  private gen = 0;

  constructor() {
    super();
    this._page = -1;
    this._gui = true;
    this._guiAvailable = true;
    this._haReady = !!customElements.get("hui-card-element-editor");
  }

  connectedCallback() {
    super.connectedCallback();
    if (!this._haReady) loadHaCardEditors().then((ok) => (this._haReady = ok));
  }

  setConfig(config: Config) {
    this._config = config;
    const tabs = this.tabs();
    if (this._page >= tabs.length) this._page = -1;
    const rows = this.rows();
    const sel = this._sel;
    if (sel ? sel.row > rows.length || ("card" in sel && !rows[sel.row]?.cards[sel.card]) : !rows.length) {
      this._sel = this.initialSel(rows);
      this.gen++;
    }
  }

  /** Collapsed, except an empty container opens the picker. */
  private initialSel(rows: EditRow[]): Selection | undefined {
    return rows.length ? undefined : { row: 0, add: true };
  }

  // --- config access ---

  private tabs(): Config[] {
    if (this.kind !== "panel") return [];
    return (Array.isArray(this._config?.tabs) ? this._config!.tabs : []).map((t: unknown) => (typeof t === "string" ? { label: t } : { ...(t as Config) }));
  }

  private rows(): EditRow[] {
    const c = this._config ?? {};
    if (this.kind === "group") return Array.isArray(c.cards) && c.cards.length ? [{ cards: [...c.cards] }] : [];
    if (this._page >= 0) return toEditRows(this.tabs()[this._page]?.cards);
    return toEditRows(c.cards);
  }

  private commitRows(rows: EditRow[], sel?: Selection, structural = true) {
    const c = { ...this._config! };
    if (this.kind === "group") c.cards = rows.flatMap((r) => r.cards);
    else if (this._page >= 0) {
      const tabs = this.tabs();
      const { cards: _old, ...tab } = tabs[this._page];
      const cards = fromEditRows(rows);
      tabs[this._page] = cards.length ? { ...tab, cards } : tab;
      c.tabs = tabs;
    } else c.cards = fromEditRows(rows);
    if (sel) this._sel = sel;
    if (structural) this.gen++;
    this.fire(c);
  }

  private fire(config: Config) {
    this._config = config;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }

  // --- events ---

  private onSettings(ev: CustomEvent) {
    ev.stopPropagation();
    this.fire({ ...this._config, ...ev.detail.value });
  }

  private selectPage(page: number) {
    this._page = page;
    this._sel = this.initialSel(this.rows());
    this._bracketRow = undefined;
    this.gen++;
  }

  private addTab() {
    const tabs = [...this.tabs(), { label: `Tab ${this.tabs().length + 1}` }];
    this.fire({ ...this._config, tabs });
    this.selectPage(tabs.length - 1);
  }

  private onTab(ev: CustomEvent) {
    ev.stopPropagation();
    const tabs = this.tabs();
    tabs[this._page] = { ...tabs[this._page], ...ev.detail.value };
    this.fire({ ...this._config, tabs });
  }

  private removeTab() {
    const tabs = this.tabs().filter((_, i) => i !== this._page);
    const c: Config = { ...this._config, tabs };
    if (!tabs.length) delete c.tabs;
    this.fire(c);
    this.selectPage(-1);
  }

  private onBracket(row: number, ev: CustomEvent) {
    ev.stopPropagation();
    this.commitRows(setBracket(this.rows(), row, String(ev.detail.value.bracket ?? "")), undefined, false);
  }

  private onCardChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const sel = this._sel;
    if (!sel || !("card" in sel)) return;
    if (ev.detail.guiModeAvailable !== undefined) this._guiAvailable = ev.detail.guiModeAvailable;
    // keep the child editor while typing
    this.commitRows(setCard(this.rows(), sel.row, sel.card, ev.detail.config), undefined, false);
  }

  private onGuiMode(ev: CustomEvent) {
    ev.stopPropagation();
    this._gui = ev.detail.guiMode;
    this._guiAvailable = ev.detail.guiModeAvailable;
  }

  private onPicked(ev: CustomEvent) {
    ev.stopPropagation();
    const sel = this._sel;
    if (!sel) return;
    const rows = addCard(this.rows(), sel.row, ev.detail.config);
    this.commitRows(rows, { row: sel.row, card: rows[sel.row].cards.length - 1 });
  }

  /** Opens a card editor or the picker; picking the open one again closes it. */
  private select(sel: Selection) {
    const cur = this._sel;
    const same = cur && cur.row === sel.row && ("card" in cur ? "card" in sel && cur.card === sel.card : "add" in sel);
    if (same) return this.collapse();
    this._sel = sel;
    this._gui = true;
    this._guiAvailable = true;
    this.gen++;
  }

  private collapse() {
    const rows = this.rows();
    this._sel = rows.length ? undefined : this._sel;
    this.gen++;
  }

  /** Escape closes the open editor/picker, not HA's whole dialog. */
  private onEditorKey(ev: KeyboardEvent) {
    if (ev.key !== "Escape" || !this.rows().length) return;
    ev.preventDefault();
    ev.stopPropagation();
    this.collapse();
  }

  private act(op: "left" | "right" | "up" | "down" | "copy" | "delete") {
    const sel = this._sel;
    if (!sel || !("card" in sel)) return;
    const rows = this.rows();
    if (op === "left" || op === "right") {
      const r = moveCard(rows, sel.row, sel.card, op === "left" ? -1 : 1);
      this.commitRows(r.rows, { row: r.row, card: r.card });
    } else if (op === "up" || op === "down") {
      const r = moveCardToRow(rows, sel.row, sel.card, op === "up" ? -1 : 1);
      this.commitRows(r.rows, { row: r.row, card: r.card });
    } else if (op === "copy") {
      const copy = structuredClone(rows[sel.row].cards[sel.card]);
      const next = addCard(rows, sel.row, copy);
      this.commitRows(next, { row: sel.row, card: next[sel.row].cards.length - 1 });
    } else {
      const next = removeCard(rows, sel.row, sel.card);
      this._sel = this.initialSel(next);
      this.commitRows(next);
    }
  }

  private rowAct(row: number, op: "up" | "down" | "delete") {
    const rows = this.rows();
    if (op === "delete") {
      const next = removeRow(rows, row);
      this._sel = this.initialSel(next);
      this._bracketRow = undefined;
      this.commitRows(next);
    } else {
      const by = op === "up" ? -1 : 1;
      const next = moveRow(rows, row, by);
      const sel = this._sel;
      if (this._bracketRow === row) this._bracketRow = row + by;
      this.commitRows(next, sel && sel.row === row ? { ...sel, row: row + by } : sel);
    }
  }

  // --- render ---

  private button(label: string, path: string, onClick: () => void, disabled = false, cls = "icon") {
    return html`<button class=${cls} title=${label} aria-label=${label} ?disabled=${disabled} @click=${onClick}>${icon(path)}</button>`;
  }

  private renderPages() {
    const tabs = this.tabs();
    return html`
      <div class="pages" role="tablist" aria-label="Pages">
        <button role="tab" class="page" aria-selected=${this._page === -1} @click=${() => this.selectPage(-1)}>Always shown</button>
        ${tabs.map(
          (t, i) => html`<button role="tab" class="page" aria-selected=${this._page === i} @click=${() => this.selectPage(i)}>
            ${t.label || `Tab ${i + 1}`}${t.cards ? nothing : html`<span class="muted"> (no page)</span>`}
          </button>`,
        )}
        ${this.button("Add tab", mdiPlus, () => this.addTab())}
      </div>
      ${this._page >= 0
        ? html`<div class="tab-settings">
            <ha-form .hass=${this.hass} .data=${tabs[this._page]} .schema=${TAB_SCHEMA} @value-changed=${this.onTab}></ha-form>
            ${this.button("Remove tab", mdiDelete, () => this.removeTab())}
          </div>`
        : nothing}
    `;
  }

  private renderRow(row: EditRow, r: number, count: number) {
    const sel = this._sel;
    const grouped = this.kind === "group";
    const selectedRow = sel?.row === r;
    const rows = this.rows();
    return html`
      <div class="row ${selectedRow ? "active" : ""}">
        ${grouped
          ? nothing
          : html`<div class="row-head">
              <span class="row-name">Row ${r + 1}${typeof row.bracket === "string" ? html` <span class="muted">· ${row.bracket}</span>` : nothing}</span>
              ${this.button("Bracket label", mdiLabelOutline, () => (this._bracketRow = this._bracketRow === r ? undefined : r))}
              ${this.button("Move row up", mdiArrowUp, () => this.rowAct(r, "up"), r === 0)}
              ${this.button("Move row down", mdiArrowDown, () => this.rowAct(r, "down"), r === count - 1)}
              ${this.button("Delete row", mdiDelete, () => this.rowAct(r, "delete"))}
            </div>`}
        <div class="chips">
          ${row.cards.map(
            (card, i) =>
              html`<button class="chip" aria-pressed=${!!sel && "card" in sel && sel.row === r && sel.card === i} @click=${() => this.select({ row: r, card: i })}>
                ${chipLabel(card)}
              </button>`,
          )}
          <button class="chip add" aria-pressed=${!!sel && "add" in sel && sel.row === r} @click=${() => this.select({ row: r, add: true })}>
            ${icon(mdiPlus)} Card
          </button>
        </div>
        ${this._bracketRow === r && !grouped
          ? row.bracket === undefined || typeof row.bracket === "string"
            ? html`<ha-form
                class="bracket"
                .hass=${this.hass}
                .data=${{ bracket: row.bracket ?? "" }}
                .schema=${BRACKET_SCHEMA}
                .computeHelper=${bracketHelp}
                @value-changed=${(e: CustomEvent) => this.onBracket(r, e)}
              ></ha-form>`
            : html`<div class="muted note">This row has split bracket labels; edit them in YAML.</div>`
          : nothing}
        ${selectedRow ? this.renderEditor(rows) : nothing}
      </div>
    `;
  }

  private renderEditor(rows: EditRow[]) {
    const sel = this._sel;
    if (!sel) return nothing;
    if (!this._haReady) return html`<div class="editor muted note">Home Assistant's card editor isn't available here; edit the cards in YAML.</div>`;
    if ("add" in sel) {
      return html`<div class="editor" @keydown=${this.onEditorKey}>
        <div class="toolbar">
          <span class="editor-title">${this.kind === "group" ? "Add a card" : sel.row < rows.length ? `Add a card to row ${sel.row + 1}` : "Add a card in a new row"}</span>
          <span class="spacer"></span>
          ${rows.length ? html`<button class="text" @click=${() => this.collapse()}>Cancel</button>` : nothing}
        </div>
        ${keyed(this.gen, html`<hui-card-picker .hass=${this.hass} .lovelace=${this.lovelace} @config-changed=${this.onPicked}></hui-card-picker>`)}
      </div>`;
    }
    const row = rows[sel.row];
    const card = row?.cards[sel.card];
    if (!card) return nothing;
    const multiRow = this.kind !== "group";
    return html`<div class="editor" @keydown=${this.onEditorKey}>
      <div class="toolbar">
        ${this.button(this._gui ? "Show code editor" : "Show visual editor", this._gui ? mdiCodeBraces : mdiListBoxOutline, () => this.childEditor()?.toggleMode?.(), !this._guiAvailable)}
        <span class="spacer"></span>
        ${this.button("Move left", mdiChevronLeft, () => this.act("left"), sel.card === 0)}
        ${this.button("Move right", mdiChevronRight, () => this.act("right"), sel.card === row.cards.length - 1)}
        ${multiRow ? this.button("Move to the row above", mdiChevronUp, () => this.act("up"), sel.row === 0) : nothing}
        ${multiRow ? this.button("Move to the row below", mdiChevronDown, () => this.act("down"), sel.row === rows.length - 1 && row.cards.length === 1) : nothing}
        ${this.button("Duplicate", mdiContentCopy, () => this.act("copy"))}
        ${this.button("Delete card", mdiDelete, () => this.act("delete"))}
        ${this.button("Close editor", mdiClose, () => this.collapse())}
      </div>
      ${keyed(
        `${this._page}:${this.gen}`,
        html`<hui-card-element-editor
          .hass=${this.hass}
          .lovelace=${this.lovelace}
          .value=${card}
          @config-changed=${this.onCardChanged}
          @GUImode-changed=${this.onGuiMode}
        ></hui-card-element-editor>`,
      )}
    </div>`;
  }

  private childEditor() {
    return this.renderRoot.querySelector<ChildEditor>("hui-card-element-editor");
  }

  render() {
    if (!this._config) return nothing;
    const rows = this.rows();
    const grouped = this.kind === "group";
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${this.form.schema}
        .computeHelper=${this.form.computeHelper}
        @value-changed=${this.onSettings}
      ></ha-form>
      <div class="cards">
        <div class="heading">Cards</div>
        ${this.kind === "panel" ? this.renderPages() : nothing}
        <div class="rows">
          ${rows.map((row, r) => this.renderRow(row, r, rows.length))}
          ${grouped && !rows.length ? this.renderRow({ cards: [] }, 0, 1) : nothing}
          ${grouped
            ? nothing
            : html`<button class="chip add new-row" aria-pressed=${!!this._sel && "add" in this._sel && this._sel.row === rows.length} @click=${() => this.select({ row: rows.length, add: true })}>
                ${icon(mdiPlus)} Row
              </button>`}
          ${!grouped && this._sel?.row === rows.length ? this.renderEditor(rows) : nothing}
        </div>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }
    .cards {
      margin-top: 16px;
    }
    .heading {
      font-weight: 500;
      margin-bottom: 8px;
    }
    .muted {
      color: var(--secondary-text-color);
    }
    .note {
      font-size: 13px;
      padding: 4px 0;
    }
    button {
      font: inherit;
      color: var(--primary-text-color);
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.35;
      cursor: default;
    }
    button:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 1px;
    }
    svg {
      width: 18px;
      height: 18px;
      fill: currentColor;
      flex: none;
    }
    .icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: none;
    }
    .icon:hover:not(:disabled) {
      background: var(--secondary-background-color);
    }
    .pages {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
      border-bottom: 1px solid var(--divider-color);
      margin-bottom: 8px;
    }
    .page {
      padding: 8px 12px;
      border: none;
      border-bottom: 2px solid transparent;
      background: none;
    }
    .page[aria-selected="true"] {
      border-bottom-color: var(--primary-color);
      color: var(--primary-color);
    }
    .tab-settings {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 8px;
    }
    .tab-settings ha-form {
      flex: 1;
    }
    .rows {
      display: grid;
      gap: 8px;
    }
    .row {
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 4px 8px 8px;
    }
    .row.active {
      border-color: var(--primary-color);
    }
    .row-head {
      display: flex;
      align-items: center;
    }
    .row-name {
      flex: 1;
      min-width: 0;
      font-size: 13px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding-top: 4px;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      max-width: 100%;
      padding: 6px 12px;
      border: 1px solid var(--divider-color);
      border-radius: 16px;
      background: var(--card-background-color, transparent);
      font-size: 13px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .chip[aria-pressed="true"] {
      border-color: var(--primary-color);
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
    }
    .chip.add {
      border-style: dashed;
      color: var(--secondary-text-color);
    }
    .chip.add[aria-pressed="true"] {
      color: var(--text-primary-color, #fff);
    }
    .new-row {
      justify-self: start;
    }
    .bracket {
      display: block;
      margin-top: 8px;
    }
    .editor {
      margin-top: 8px;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 8px 12px 12px;
    }
    .editor-title {
      font-weight: 500;
    }
    .text {
      padding: 6px 12px;
      border: none;
      border-radius: 16px;
      background: none;
      color: var(--primary-color);
      font-weight: 500;
    }
    .text:hover {
      background: var(--secondary-background-color);
    }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      margin-bottom: 8px;
    }
    .spacer {
      flex: 1;
    }
  `;
}

if (!customElements.get("te-container-editor")) customElements.define("te-container-editor", TeContainerEditor);

/** For a container card's `static getConfigElement()`. */
export async function containerEditor(kind: ContainerKind, form: ConfigForm): Promise<TeContainerEditor> {
  await loadHaCardEditors();
  const el = document.createElement("te-container-editor") as TeContainerEditor;
  el.kind = kind;
  el.form = form;
  return el;
}
