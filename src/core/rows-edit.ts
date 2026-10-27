/**
 * Row editing for container configs (CH-1, PP-3): the YAML shapes `buildRows` reads, as a plain list of rows the
 * visual editor can change, and back. All operations return new arrays.
 */

export type CardConfig = Record<string, unknown>;

/** One row: its cards, and the bracket exactly as written (a string, a list, or none). */
export interface EditRow {
  cards: CardConfig[];
  bracket?: unknown;
}

const isBracketRow = (e: unknown): e is { cards: unknown[]; bracket?: unknown } =>
  !!e && typeof e === "object" && !Array.isArray(e) && !("type" in e) && Array.isArray((e as { cards?: unknown }).cards);

/** YAML rows → edit rows. Same reading as `buildRows`: a card, a list of cards, or `{ bracket, cards }`. */
export function toEditRows(entries: unknown[] | undefined): EditRow[] {
  return (entries ?? []).map((e) => {
    if (isBracketRow(e)) return e.bracket === undefined || e.bracket === "" ? { cards: [...e.cards] as CardConfig[] } : { cards: [...e.cards] as CardConfig[], bracket: e.bracket };
    return { cards: (Array.isArray(e) ? [...e] : [e]) as CardConfig[] };
  });
}

/** Edit rows → the shortest YAML: a lone card, a list, or `{ bracket, cards }`. Empty rows are dropped. */
export function fromEditRows(rows: EditRow[]): unknown[] {
  return rows
    .filter((r) => r.cards.length)
    .map((r) => (r.bracket !== undefined && r.bracket !== "" ? { bracket: r.bracket, cards: r.cards } : r.cards.length === 1 ? r.cards[0] : r.cards));
}

const replaceRow = (rows: EditRow[], i: number, row: EditRow) => rows.map((r, k) => (k === i ? row : r));

/** Adds a card at the end of row `row`; `row === rows.length` starts a new row. */
export function addCard(rows: EditRow[], row: number, card: CardConfig): EditRow[] {
  if (row >= rows.length) return [...rows, { cards: [card] }];
  return replaceRow(rows, row, { ...rows[row], cards: [...rows[row].cards, card] });
}

export function setCard(rows: EditRow[], row: number, i: number, card: CardConfig): EditRow[] {
  return replaceRow(rows, row, { ...rows[row], cards: rows[row].cards.map((c, k) => (k === i ? card : c)) });
}

/** Removes a card; a row left empty goes too. */
export function removeCard(rows: EditRow[], row: number, i: number): EditRow[] {
  const cards = rows[row].cards.filter((_, k) => k !== i);
  return cards.length ? replaceRow(rows, row, { ...rows[row], cards }) : rows.filter((_, k) => k !== row);
}

/** Moves a card left/right within its row. Returns the rows and the card's new position. */
export function moveCard(rows: EditRow[], row: number, i: number, by: -1 | 1): { rows: EditRow[]; row: number; card: number } {
  const to = i + by;
  const cards = [...rows[row].cards];
  if (to < 0 || to >= cards.length) return { rows, row, card: i };
  [cards[i], cards[to]] = [cards[to], cards[i]];
  return { rows: replaceRow(rows, row, { ...rows[row], cards }), row, card: to };
}

/**
 * Moves a card to the end of the row above/below. Moving past the last row starts a new one; moving the only
 * card of the first row up does nothing. A row left empty is removed.
 */
export function moveCardToRow(rows: EditRow[], row: number, i: number, by: -1 | 1): { rows: EditRow[]; row: number; card: number } {
  const target = row + by;
  const card = rows[row].cards[i];
  if (target < 0) return { rows, row, card: i };
  if (target >= rows.length && rows[row].cards.length === 1) return { rows, row, card: i };
  let next = addCard(rows, target, card);
  const emptied = rows[row].cards.length === 1;
  next = removeCard(next, row, i);
  const landed = emptied && target > row ? target - 1 : target;
  return { rows: next, row: landed, card: next[landed].cards.length - 1 };
}

export function moveRow(rows: EditRow[], row: number, by: -1 | 1): EditRow[] {
  const to = row + by;
  if (to < 0 || to >= rows.length) return rows;
  const next = [...rows];
  [next[row], next[to]] = [next[to], next[row]];
  return next;
}

export const removeRow = (rows: EditRow[], row: number): EditRow[] => rows.filter((_, k) => k !== row);

/** Sets a row's bracket label; an empty string removes it. */
export function setBracket(rows: EditRow[], row: number, bracket: string): EditRow[] {
  const { bracket: _old, ...rest } = rows[row];
  return replaceRow(rows, row, bracket ? { ...rest, bracket } : rest);
}
