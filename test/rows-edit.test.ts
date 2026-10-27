import { describe, expect, it } from "vitest";
import { addCard, fromEditRows, moveCard, moveCardToRow, moveRow, removeCard, removeRow, setBracket, setCard, toEditRows, type EditRow } from "../src/core/rows-edit";

const a = { type: "custom:te-knob", entity: "light.a" };
const b = { type: "custom:te-fader", entity: "light.b" };
const c = { type: "custom:te-button", label: "C" };
const d = { type: "custom:te-toggle", entity: "switch.d" };
const r = (...cards: object[]): EditRow => ({ cards: cards as EditRow["cards"] });

describe("toEditRows / fromEditRows", () => {
  it("reads all three row shapes", () => {
    expect(toEditRows([a, [b, c], { bracket: "OUT", cards: [d] }])).toEqual([r(a), r(b, c), { cards: [d], bracket: "OUT" }]);
  });

  it("keeps split brackets as written", () => {
    const bracket = [{ label: "GAIN", span: 2 }, "OUT"];
    expect(toEditRows([{ bracket, cards: [a, b, c] }])[0].bracket).toBe(bracket);
  });

  it("treats an empty bracket as none", () => {
    expect(toEditRows([{ bracket: "", cards: [a] }])).toEqual([r(a)]);
  });

  it("writes the shortest shape and drops empty rows", () => {
    expect(fromEditRows([r(a), r(b, c), r(), { cards: [d], bracket: "OUT" }])).toEqual([a, [b, c], { bracket: "OUT", cards: [d] }]);
  });

  it("round-trips", () => {
    const yaml = [a, [b, c], { bracket: [{ label: "X", span: 2 }], cards: [d, a] }];
    expect(fromEditRows(toEditRows(yaml))).toEqual(yaml);
  });

  it("handles a missing list", () => {
    expect(toEditRows(undefined)).toEqual([]);
  });

  it("does not change the input", () => {
    const yaml = [[a, b]];
    const rows = toEditRows(yaml);
    addCard(rows, 0, c);
    rows[0].cards.push(d);
    expect(yaml).toEqual([[a, b]]);
  });
});

describe("card operations", () => {
  const rows = [r(a), r(b, c)];

  it("adds to a row or starts a new one", () => {
    expect(addCard(rows, 0, d)).toEqual([r(a, d), r(b, c)]);
    expect(addCard(rows, 2, d)).toEqual([r(a), r(b, c), r(d)]);
    expect(addCard([], 0, d)).toEqual([r(d)]);
  });

  it("replaces a card", () => {
    expect(setCard(rows, 1, 1, d)).toEqual([r(a), r(b, d)]);
  });

  it("removes a card, and its row when it was the last one", () => {
    expect(removeCard(rows, 1, 0)).toEqual([r(a), r(c)]);
    expect(removeCard(rows, 0, 0)).toEqual([r(b, c)]);
  });

  it("keeps the bracket when a row changes", () => {
    const br = [{ cards: [a, b], bracket: "X" }];
    expect(removeCard(br, 0, 0)).toEqual([{ cards: [b], bracket: "X" }]);
  });

  it("moves left and right within a row, stopping at the ends", () => {
    expect(moveCard(rows, 1, 0, 1)).toEqual({ rows: [r(a), r(c, b)], row: 1, card: 1 });
    expect(moveCard(rows, 1, 0, -1)).toEqual({ rows, row: 1, card: 0 });
    expect(moveCard(rows, 1, 1, 1)).toEqual({ rows, row: 1, card: 1 });
  });

  it("moves to the end of the row below, dropping the emptied row", () => {
    expect(moveCardToRow(rows, 0, 0, 1)).toEqual({ rows: [r(b, c, a)], row: 0, card: 2 });
  });

  it("moves to the end of the row above", () => {
    expect(moveCardToRow(rows, 1, 1, -1)).toEqual({ rows: [r(a, c), r(b)], row: 0, card: 1 });
    expect(moveCardToRow([r(a), r(b)], 1, 0, -1)).toEqual({ rows: [r(a, b)], row: 0, card: 1 });
  });

  it("moving down from the last row splits the card into a new row", () => {
    expect(moveCardToRow(rows, 1, 0, 1)).toEqual({ rows: [r(a), r(c), r(b)], row: 2, card: 0 });
  });

  it("does nothing past the edges", () => {
    expect(moveCardToRow(rows, 0, 0, -1)).toEqual({ rows, row: 0, card: 0 });
    expect(moveCardToRow([r(a), r(b)], 1, 0, 1)).toEqual({ rows: [r(a), r(b)], row: 1, card: 0 });
  });
});

describe("row operations", () => {
  const rows = [r(a), r(b), r(c)];

  it("moves rows, stopping at the ends", () => {
    expect(moveRow(rows, 0, 1)).toEqual([r(b), r(a), r(c)]);
    expect(moveRow(rows, 0, -1)).toBe(rows);
    expect(moveRow(rows, 2, 1)).toBe(rows);
  });

  it("removes a row", () => {
    expect(removeRow(rows, 1)).toEqual([r(a), r(c)]);
  });

  it("sets and clears a bracket", () => {
    expect(setBracket(rows, 0, "IN")[0]).toEqual({ cards: [a], bracket: "IN" });
    expect(setBracket([{ cards: [a], bracket: "IN" }], 0, "")[0]).toEqual({ cards: [a] });
  });
});
