import { css, html } from "lit";
import type { HomeAssistant } from "../types";

/** Child card host; `hui-card` is HA's own wrapper (handles visibility, errors, editing). */
export function createChildCard(config: Record<string, unknown>, hass?: HomeAssistant): HTMLElement {
  const el = document.createElement("hui-card") as HTMLElement & { config: unknown; hass?: HomeAssistant };
  el.config = config;
  if (hass) el.hass = hass;
  return el;
}

export function forwardHass(els: HTMLElement[], hass: HomeAssistant | undefined) {
  if (!hass) return;
  for (const el of els) (el as HTMLElement & { hass?: HomeAssistant }).hass = hass;
}

/** K.O. II bracket label over a row: a hairline that ends in ticks, spanning `span` cards. */
export interface Bracket {
  label: string;
  span: number;
}

/**
 * Card rows as used by CH-1 and PP-3: each entry is a card, a list of cards side by side, or
 * `{ bracket, cards }` to put bracket labels over the row (`bracket: "BPM — METRONOME"` spans all of it;
 * a list like `[{ label: GAIN, span: 2 }, SWING]` splits it).
 */
export type Rows = { cards: HTMLElement[]; brackets?: Bracket[] }[];

function parseBrackets(b: unknown, count: number): Bracket[] | undefined {
  if (!b) return undefined;
  if (!Array.isArray(b)) return [{ label: String(b), span: count }];
  return b.map((x) => (typeof x === "object" && x ? { label: String(x.label ?? ""), span: Math.max(1, Number(x.span) || 1) } : { label: String(x), span: 1 }));
}

export const buildRows = (cards: unknown[], hass?: HomeAssistant): Rows =>
  cards.map((entry) => {
    const e = entry as Record<string, unknown>;
    const isRow = !Array.isArray(entry) && e && typeof e === "object" && !("type" in e) && Array.isArray(e.cards);
    const list = (isRow ? (e.cards as unknown[]) : Array.isArray(entry) ? entry : [entry]) as Record<string, unknown>[];
    return { cards: list.map((child) => createChildCard(child, hass)), brackets: isRow ? parseBrackets(e.bracket, list.length) : undefined };
  });

export const rowCards = (rows: Rows) => rows.flatMap((r) => r.cards);

const renderBrackets = (brackets: Bracket[], count: number) => html`
  <div class="brackets" style=${`--cols:${count}`}>
    ${brackets.map((b) =>
      // an empty label leaves its cards without a bracket
      b.label
        ? html`<div class="bracket" style=${`grid-column:span ${Math.min(b.span, count)}`}><span>${b.label}</span></div>`
        : html`<div style=${`grid-column:span ${Math.min(b.span, count)}`}></div>`,
    )}
  </div>
`;

export const renderRows = (rows: Rows) => html`
  <div class="body">
    ${rows.map(({ cards, brackets }) => {
      const row = cards.length === 1 ? html`<div class="item">${cards[0]}</div>` : html`<div class="row">${cards.map((el) => html`<div class="item">${el}</div>`)}</div>`;
      return brackets?.length ? html`<div class="bracketed">${renderBrackets(brackets, cards.length)}${row}</div>` : row;
    })}
  </div>
`;

/** Layout for `renderRows`; spacing comes from `--gap`. */
export const rowStyles = css`
  .body {
    display: grid;
    gap: var(--gap, 8px);
  }
  .row {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    gap: var(--gap, 8px);
  }
  .item {
    min-width: 0;
  }
  .bracketed {
    display: grid;
    gap: 2px;
  }
  .brackets {
    display: grid;
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    gap: var(--gap, 8px);
  }
  /* label centred on a hairline whose ends drop into short ticks: ┌── BPM — METRONOME ──┐ */
  .bracket {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    padding: 0 14%;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--te-ink-dim);
  }
  .bracket span {
    flex: none;
    max-width: 70%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .bracket::before,
  .bracket::after {
    content: "";
    flex: 1;
    min-width: 6px;
    height: 5px;
    margin-top: 5px;
    border-top: 1px solid currentColor;
    opacity: 0.7;
  }
  .bracket::before {
    border-left: 1px solid currentColor;
  }
  .bracket::after {
    border-right: 1px solid currentColor;
  }
  .bracket:has(span:empty) {
    visibility: hidden;
  }
`;
