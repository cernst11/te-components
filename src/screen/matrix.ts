import { glyph } from "./font";
import type { ScreenTheme } from "./themes";

/** Dot levels: off, dim (structure, fills), lit (main), accent (theme fg2). */
export const OFF = 0;
export const DIM = 1;
export const LIT = 2;
export const ACCENT = 3;
export type Level = 0 | 1 | 2 | 3;

/** Tiny 3×5 font for secondary figures (axis ranges, durations). Columns, bit 0 = top row. */
const TINY: Record<string, number[]> = {
  "0": [0x1f, 0x11, 0x1f],
  "1": [0x12, 0x1f, 0x10],
  "2": [0x1d, 0x15, 0x17],
  "3": [0x15, 0x15, 0x1f],
  "4": [0x07, 0x04, 0x1f],
  "5": [0x17, 0x15, 0x1d],
  "6": [0x1f, 0x15, 0x1d],
  "7": [0x01, 0x01, 0x1f],
  "8": [0x1f, 0x15, 0x1f],
  "9": [0x17, 0x15, 0x1f],
  D: [0x1f, 0x11, 0x0e],
  H: [0x1f, 0x04, 0x1f],
  K: [0x1f, 0x04, 0x1b],
  M: [0x1f, 0x02, 0x1f],
  W: [0x1f, 0x08, 0x1f],
  "%": [0x19, 0x04, 0x13],
  "/": [0x18, 0x04, 0x03],
  "-": [0x04, 0x04, 0x04],
  ".": [0x10],
  ":": [0x0a],
  "°": [0x03, 0x03],
  " ": [0x00, 0x00],
};

/** Columns a glyph actually uses, so matrix text is proportional ("1" and "." are narrow). */
function glyphSpan(ch: string): [number, number] {
  if (ch === " ") return [0, 1];
  const cols = glyph(ch);
  let first = 0;
  let last = 4;
  while (first < 4 && !cols[first]) first++;
  while (last > first && !cols[last]) last--;
  return [first, last];
}

/** A low-res frame buffer of dots. Everything on a DS-64 screen is drawn into one of these. */
export class DotBuffer {
  readonly data: Uint8Array;

  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.data = new Uint8Array(w * h);
  }

  clear() {
    this.data.fill(0);
  }

  get(x: number, y: number): Level {
    x = Math.round(x);
    y = Math.round(y);
    return x < 0 || y < 0 || x >= this.w || y >= this.h ? OFF : (this.data[y * this.w + x] as Level);
  }

  set(x: number, y: number, v: Level) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.data[y * this.w + x] = v;
  }

  /** Like set, but never dims an already brighter dot. */
  add(x: number, y: number, v: Level) {
    if (this.get(x, y) < v) this.set(x, y, v);
  }

  hline(x0: number, x1: number, y: number, v: Level, every = 1) {
    for (let x = Math.round(x0); x <= Math.round(x1); x++) if ((x - Math.round(x0)) % every === 0) this.set(x, y, v);
  }

  vline(x: number, y0: number, y1: number, v: Level, every = 1) {
    const [a, b] = y0 <= y1 ? [y0, y1] : [y1, y0];
    for (let y = Math.round(a); y <= Math.round(b); y++) if ((y - Math.round(a)) % every === 0) this.set(x, y, v);
  }

  line(x0: number, y0: number, x1: number, y1: number, v: Level) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, v);
  }

  rect(x0: number, y0: number, x1: number, y1: number, v: Level) {
    this.hline(x0, x1, y0, v);
    this.hline(x0, x1, y1, v);
    this.vline(x0, y0, y1, v);
    this.vline(x1, y0, y1, v);
  }

  fillRect(x0: number, y0: number, x1: number, y1: number, v: Level) {
    for (let y = Math.round(y0); y <= Math.round(y1); y++) this.hline(x0, x1, y, v);
  }

  /** Ring of radius r (dot-center distance), `thick` dots wide. */
  circle(cx: number, cy: number, r: number, v: Level, thick = 1) {
    this.disc(cx, cy, r + thick / 2, v, r - thick / 2);
  }

  /** Filled disc; with `inner`, an annulus. */
  disc(cx: number, cy: number, r: number, v: Level, inner = -1) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d <= r && d > inner) this.set(x, y, v);
      }
    }
  }

  /** Width in dots of `text` at `scale`. */
  static textWidth(text: string, scale = 1) {
    let w = 0;
    for (const ch of text) {
      const [a, b] = glyphSpan(ch);
      w += (b - a + 2) * scale;
    }
    return Math.max(0, w - scale);
  }

  /** Proportional 5×7 text; returns the x after the last glyph. */
  text(text: string, x: number, y: number, v: Level, scale = 1): number {
    x = Math.round(x);
    y = Math.round(y);
    for (const ch of text) {
      const cols = glyph(ch);
      const [a, b] = glyphSpan(ch);
      for (let c = a; c <= b; c++) {
        for (let r = 0; r < 7; r++) {
          if (!(cols[c] & (1 << r))) continue;
          for (let sx = 0; sx < scale; sx++) for (let sy = 0; sy < scale; sy++) this.set(x + (c - a) * scale + sx, y + r * scale + sy, v);
        }
      }
      x += (b - a + 2) * scale;
    }
    return x;
  }

  static tinyWidth(text: string) {
    let w = 0;
    for (const ch of text.toUpperCase()) w += (TINY[ch] ?? TINY[" "]).length + 1;
    return Math.max(0, w - 1);
  }

  /** 3×5 text for secondary figures; unknown characters render as spaces. */
  tiny(text: string, x: number, y: number, v: Level): number {
    x = Math.round(x);
    y = Math.round(y);
    for (const ch of text.toUpperCase()) {
      const cols = TINY[ch] ?? TINY[" "];
      cols.forEach((bits, c) => {
        for (let r = 0; r < 5; r++) if (bits & (1 << r)) this.set(x + c, y + r, v);
      });
      x += cols.length + 1;
    }
    return x;
  }

  /** Text clipped to `maxW` dots (drops trailing characters). */
  fitText(text: string, maxW: number): string {
    let t = text;
    while (t && DotBuffer.textWidth(t) > maxW) t = t.slice(0, -1);
    return t;
  }
}

/**
 * Paints a DotBuffer onto a canvas in a screen theme: unlit ghost dots, lit dots by level, and a
 * cheap bloom for VFD glow (downscale + upscale, which works everywhere, unlike ctx.filter).
 */
export class MatrixPainter {
  private layer = document.createElement("canvas");
  private bloom = document.createElement("canvas");

  paint(ctx: CanvasRenderingContext2D, buf: DotBuffer, theme: ScreenTheme, pad: number) {
    const { width: W, height: H } = ctx.canvas;
    const cell = Math.min((W - pad * 2) / buf.w, (H - pad * 2) / buf.h);
    const ox = (W - cell * buf.w) / 2;
    const oy = (H - cell * buf.h) / 2;
    // VFD dots are separated; OLED/LCD pixels almost touch.
    const dot = Math.max(1, cell * (theme.pixel ? 0.86 : 0.72));
    const inset = (cell - dot) / 2;
    const round = !theme.pixel && dot >= 3;

    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, W, H);

    const paths: Path2D[] = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    for (let y = 0; y < buf.h; y++) {
      for (let x = 0; x < buf.w; x++) {
        const v = buf.data[y * buf.w + x];
        const px = ox + x * cell + inset;
        const py = oy + y * cell + inset;
        if (round) paths[v].roundRect(px, py, dot, dot, dot * 0.35);
        else paths[v].rect(px, py, dot, dot);
      }
    }

    if (theme.ghost > 0) {
      ctx.fillStyle = `rgba(255,255,255,${theme.ghost})`;
      ctx.fill(paths[OFF]);
    }

    const layer = this.layer;
    if (layer.width !== W || layer.height !== H) {
      layer.width = W;
      layer.height = H;
    }
    const lc = layer.getContext("2d")!;
    lc.clearRect(0, 0, W, H);
    lc.globalAlpha = 0.32;
    lc.fillStyle = theme.fg;
    lc.fill(paths[DIM]);
    lc.globalAlpha = 1;
    lc.fill(paths[LIT]);
    lc.fillStyle = theme.fg2;
    lc.fill(paths[ACCENT]);

    if (theme.glowBlur > 0) {
      const scale = 0.18;
      const bw = Math.max(1, Math.round(W * scale));
      const bh = Math.max(1, Math.round(H * scale));
      if (this.bloom.width !== bw || this.bloom.height !== bh) {
        this.bloom.width = bw;
        this.bloom.height = bh;
      }
      const bc = this.bloom.getContext("2d")!;
      bc.clearRect(0, 0, bw, bh);
      bc.imageSmoothingEnabled = true;
      bc.drawImage(layer, 0, 0, bw, bh);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = Math.min(0.9, theme.glowBlur / 5);
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(this.bloom, 0, 0, W, H);
      ctx.restore();
    }
    ctx.drawImage(layer, 0, 0);
  }
}
