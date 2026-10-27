import { describe, expect, it } from "vitest";
import { ANIMATION_NAMES, ANIMATIONS, type AnimState } from "../src/screen/animations";
import { glyph } from "../src/screen/font";
import { DIM, DotBuffer, LIT, OFF } from "../src/screen/matrix";
import { cellsWidth, segMetrics, toCells } from "../src/screen/segments";

/** Renders a buffer as text: ` ` off, `.` dim, `#` lit, `@` accent. */
const ascii = (buf: DotBuffer) => {
  const rows: string[] = [];
  for (let y = 0; y < buf.h; y++) {
    let row = "";
    for (let x = 0; x < buf.w; x++) row += " .#@"[buf.get(x, y)];
    rows.push(row.trimEnd());
  }
  return "\n" + rows.join("\n") + "\n";
};

describe("toCells", () => {
  it("folds a decimal point into the previous digit", () => {
    const cells = toCells("12.5");
    expect(cells.map((c) => c.dp)).toEqual([false, true, false]);
    expect(cells.map((c) => c.mask)).toEqual([0x06, 0x5b, 0x6d]);
  });

  it("makes colons their own narrow cell, lit or not", () => {
    expect(toCells("1:05").map((c) => c.kind)).toEqual(["digit", "colon", "digit", "digit"]);
    expect(toCells("1:05", undefined, false)[1].lit).toBe(false);
  });

  it("pads on the left to a fixed digit count, not counting colons", () => {
    const cells = toCells("9:30", 4);
    expect(cells.length).toBe(5);
    expect(cells[0]).toEqual({ kind: "digit", mask: 0, dp: false });
  });

  it("gives a leading point its own blank cell", () => {
    expect(toCells(".5")).toEqual([
      { kind: "digit", mask: 0, dp: true },
      { kind: "digit", mask: 0x6d, dp: false },
    ]);
  });

  it("matches letters in either case and blanks unknown characters", () => {
    expect(toCells("e")[0].mask).toBe(toCells("E")[0].mask);
    expect(toCells("x")[0].mask).toBe(0);
  });

  it("measures colons narrower than digits", () => {
    const m = segMetrics(100);
    expect(cellsWidth(toCells("88"), 100)).toBeCloseTo(m.w * 2 + m.gap);
    expect(cellsWidth(toCells("8:8"), 100)).toBeCloseTo(m.w * 2 + m.colonW + m.gap * 2);
    expect(cellsWidth([], 100)).toBe(0);
  });
});

describe("font", () => {
  it("is case-insensitive and falls back to a space", () => {
    expect(glyph("a")).toEqual(glyph("A"));
    expect(glyph("~")).toEqual(glyph(" "));
  });
});

describe("DotBuffer", () => {
  it("ignores out-of-range dots and rounds coordinates", () => {
    const b = new DotBuffer(4, 4);
    b.set(-1, 0, LIT);
    b.set(4, 4, LIT);
    b.set(1.4, 1.6, LIT);
    expect(b.get(-1, 0)).toBe(OFF);
    expect(b.get(1, 2)).toBe(LIT);
    expect([...b.data].filter(Boolean).length).toBe(1);
  });

  it("add never dims a brighter dot", () => {
    const b = new DotBuffer(2, 1);
    b.set(0, 0, LIT);
    b.add(0, 0, DIM);
    b.add(1, 0, DIM);
    expect(b.get(0, 0)).toBe(LIT);
    expect(b.get(1, 0)).toBe(DIM);
  });

  it("draws shapes", () => {
    const b = new DotBuffer(12, 9);
    b.rect(0, 0, 11, 8, DIM);
    b.line(2, 2, 9, 6, LIT);
    b.disc(8, 3, 1.5, LIT);
    expect(ascii(b)).toMatchInlineSnapshot(`
      "
      ............
      .          .
      . #    ### .
      .  ##  ### .
      .    ##### .
      .      ##  .
      .        # .
      .          .
      ............
      "
    `);
  });

  it("draws proportional 5×7 text and measures it", () => {
    const b = new DotBuffer(DotBuffer.textWidth("1.5"), 7);
    const end = b.text("1.5", 0, 0, LIT);
    expect(end).toBe(b.w + 1);
    expect(ascii(b)).toMatchInlineSnapshot(`
      "
       #     #####
      ##     #
       #     ####
       #         #
       #         #
       #  ## #   #
      ### ##  ###
      "
    `);
  });

  it("fitText drops trailing characters to fit", () => {
    const b = new DotBuffer(1, 1);
    expect(b.fitText("HELLO", DotBuffer.textWidth("HEL"))).toBe("HEL");
    expect(b.fitText("HELLO", 0)).toBe("");
  });

  it("draws 3×5 tiny text", () => {
    const b = new DotBuffer(DotBuffer.tinyWidth("24H"), 5);
    b.tiny("24h", 0, 0, LIT);
    expect(ascii(b)).toMatchInlineSnapshot(`
      "
      ### # # # #
        # # # # #
      ### ### ###
      #     # # #
      ###   # # #
      "
    `);
  });
});

describe("animations", () => {
  const frame = (name: string, s: Partial<AnimState>) => {
    const b = new DotBuffer(48, 32);
    ANIMATIONS[name](b, { x0: 0, y0: 0, x1: 47, y1: 31 }, { t: 1.3, active: true, intensity: 0.6, status: "", level: 0.5, ...s });
    return ascii(b);
  };

  it.each(ANIMATION_NAMES)("%s draws the same frame for the same state", (name) => {
    expect(frame(name, {})).toBe(frame(name, {}));
    expect(frame(name, {})).toMatchSnapshot();
  });

  it.each(ANIMATION_NAMES)("%s idle frame", (name) => {
    expect(frame(name, { active: false, t: 0 })).toMatchSnapshot();
  });

  it("car moves while driving", () => {
    expect(frame("car", { status: "DRIVING", t: 0.2 })).not.toBe(frame("car", { status: "DRIVING", t: 0.7 }));
  });
});
