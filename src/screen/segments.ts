import type { ScreenTheme } from "./themes";

/** Seven-segment bit masks: a=top, b=top-right, c=bottom-right, d=bottom, e=bottom-left, f=top-left, g=middle. */
const SEG: Record<string, number> = {
  "0": 0x3f, "1": 0x06, "2": 0x5b, "3": 0x4f, "4": 0x66, "5": 0x6d, "6": 0x7d, "7": 0x07, "8": 0x7f, "9": 0x6f,
  "-": 0x40, "_": 0x08, " ": 0x00, "°": 0x63,
  A: 0x77, b: 0x7c, C: 0x39, c: 0x58, d: 0x5e, E: 0x79, F: 0x71, G: 0x3d, H: 0x76, h: 0x74, I: 0x30, J: 0x1e,
  L: 0x38, n: 0x54, o: 0x5c, O: 0x3f, P: 0x73, r: 0x50, S: 0x6d, t: 0x78, U: 0x3e, u: 0x1c, y: 0x6e,
};

const maskOf = (ch: string) => SEG[ch] ?? SEG[ch.toUpperCase()] ?? SEG[ch.toLowerCase()] ?? 0;

/** One display cell: a digit (with optional decimal point) or a colon. */
export interface Cell {
  kind: "digit" | "colon";
  mask: number;
  dp: boolean;
  /** Colon dots lit (lets the clock blink). */
  lit?: boolean;
}

/** "12.5" → cells 1, 2(dp), 5; ":" becomes a narrow colon cell. Pads on the left to `digits` with blank cells. */
export function toCells(text: string, digits?: number, colonLit = true): Cell[] {
  const cells: Cell[] = [];
  for (const ch of text) {
    if (ch === "." || ch === ",") {
      const last = cells[cells.length - 1];
      if (last && last.kind === "digit" && !last.dp) last.dp = true;
      else cells.push({ kind: "digit", mask: 0, dp: true });
    } else if (ch === ":") cells.push({ kind: "colon", mask: 0, dp: false, lit: colonLit });
    else cells.push({ kind: "digit", mask: maskOf(ch), dp: false });
  }
  const count = cells.filter((c) => c.kind === "digit").length;
  for (let i = count; i < (digits ?? 0); i++) cells.unshift({ kind: "digit", mask: 0, dp: false });
  return cells;
}

/** Geometry for a digit `h` px tall. */
export const segMetrics = (h: number) => {
  const w = h * 0.52;
  return { h, w, t: w * 0.2, gap: w * 0.3, colonW: w * 0.36 };
};

export function cellsWidth(cells: Cell[], h: number) {
  const m = segMetrics(h);
  return cells.reduce((s, c) => s + (c.kind === "colon" ? m.colonW : m.w), 0) + m.gap * Math.max(0, cells.length - 1);
}

/** Hexagonal segment between two points along one axis. */
function segPath(p: Path2D, x0: number, y0: number, x1: number, y1: number, t: number) {
  const h = t / 2;
  if (y0 === y1) {
    p.moveTo(x0, y0);
    p.lineTo(x0 + h, y0 - h);
    p.lineTo(x1 - h, y0 - h);
    p.lineTo(x1, y0);
    p.lineTo(x1 - h, y0 + h);
    p.lineTo(x0 + h, y0 + h);
  } else {
    p.moveTo(x0, y0);
    p.lineTo(x0 + h, y0 + h);
    p.lineTo(x0 + h, y1 - h);
    p.lineTo(x0, y1);
    p.lineTo(x0 - h, y1 - h);
    p.lineTo(x0 - h, y0 + h);
  }
  p.closePath();
}

/**
 * Draws seven-segment cells starting at (x, y) with a slight italic slant: unlit segments as ghosts
 * (VFD/LCD), lit ones in the theme color with glow.
 */
export function drawCells(ctx: CanvasRenderingContext2D, cells: Cell[], x: number, y: number, h: number, theme: ScreenTheme, color = theme.fg) {
  const { w, t, gap, colonW } = segMetrics(h);
  const g = t * 0.14; // hairline between neighbouring segments
  const lit = new Path2D();
  const ghost = new Path2D();
  let cx = x;
  for (const cell of cells) {
    if (cell.kind === "colon") {
      const r = t * 0.42;
      const target = cell.lit ? lit : ghost;
      for (const fy of [0.32, 0.7]) {
        target.moveTo(cx + colonW / 2 + r, y + h * fy);
        target.arc(cx + colonW / 2, y + h * fy, r, 0, Math.PI * 2);
      }
      cx += colonW + gap;
      continue;
    }
    const l = cx + t / 2;
    const r = cx + w - t / 2;
    const top = y + t / 2;
    const mid = y + h / 2;
    const bot = y + h - t / 2;
    const segs: [number, number, number, number][] = [
      [l + g, top, r - g, top], // a
      [r, top + g, r, mid - g], // b
      [r, mid + g, r, bot - g], // c
      [l + g, bot, r - g, bot], // d
      [l, mid + g, l, bot - g], // e
      [l, top + g, l, mid - g], // f
      [l + g, mid, r - g, mid], // g
    ];
    segs.forEach((s, i) => segPath(cell.mask & (1 << i) ? lit : ghost, ...s, t));
    const dpTarget = cell.dp ? lit : ghost;
    dpTarget.moveTo(cx + w + gap * 0.5 + t * 0.42, bot);
    dpTarget.arc(cx + w + gap * 0.5, bot, t * 0.42, 0, Math.PI * 2);
    cx += w + gap;
  }

  ctx.save();
  // italic slant around the baseline, like real LED/VFD numerals
  ctx.transform(1, 0, -0.09, 1, (y + h) * 0.09, 0);
  if (theme.ghost > 0) {
    ctx.fillStyle = `rgba(255,255,255,${theme.ghost * 1.3})`;
    ctx.fill(ghost);
  }
  ctx.fillStyle = color;
  if (theme.glowBlur > 0) {
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = theme.glowBlur * 2.5 * (window.devicePixelRatio || 1);
  }
  ctx.fill(lit);
  ctx.restore();
}
