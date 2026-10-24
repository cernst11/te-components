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

/** Card rows as used by CH-1 and PP-3: each entry is a row; a list inside it puts cards side by side. */
export type Rows = HTMLElement[][];

export const buildRows = (cards: unknown[], hass?: HomeAssistant): Rows =>
  cards.map((entry) => (Array.isArray(entry) ? entry : [entry]).map((child) => createChildCard(child, hass)));

export const renderRows = (rows: Rows) => html`
  <div class="body">
    ${rows.map((row) =>
      row.length === 1 ? html`<div class="item">${row[0]}</div>` : html`<div class="row">${row.map((el) => html`<div class="item">${el}</div>`)}</div>`,
    )}
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
`;
