import { glyph } from "./font";
import type { ScreenTheme } from "./themes";

/** Dot geometry in device pixels. */
export interface DotMetrics {
  dw: number;
  dh: number;
  gap: number;
  charGap: number;
  dpr: number;
}

/** Metrics for the main text style of a theme. `size` is the dot width in CSS px. */
export function dotMetrics(size: number, dpr: number, theme: ScreenTheme): DotMetrics {
  const dw = Math.max(1, Math.round(size * dpr));
  if (theme.pixel) {
    const gap = theme.ghost > 0 ? Math.max(1, Math.round(dw * 0.2)) : 0;
    return { dw, dh: dw, gap, charGap: dw, dpr };
  }
  return { dw, dh: Math.round(dw * 1.5), gap: Math.max(1, Math.round(dw * 0.5)), charGap: Math.round(dw * 2.5), dpr };
}

/** Small solid pixel font (chips, compact labels). */
export function pixelMetrics(size: number, dpr: number): DotMetrics {
  const dw = Math.max(1, Math.round(size * dpr));
  return { dw, dh: dw, gap: 0, charGap: dw, dpr };
}

export const glyphHeight = (m: DotMetrics) => 7 * m.dh + 6 * m.gap;
const charWidth = (m: DotMetrics) => 5 * m.dw + 4 * m.gap;
export const textWidth = (text: string, m: DotMetrics) =>
  text.length === 0 ? 0 : text.length * (charWidth(m) + m.charGap) - m.charGap;

export interface TextStrip {
  canvas: HTMLCanvasElement;
  /** Padding around the text for glow, in device px. */
  pad: number;
  width: number;
  height: number;
}

/** Pre-renders a line of text (ghost dots + lit dots + glow) so frames only blit it. */
export function renderStrip(text: string, m: DotMetrics, color: string, theme: ScreenTheme): TextStrip {
  const pad = Math.ceil(theme.glowBlur * m.dpr * 2);
  const width = textWidth(text, m);
  const height = glyphHeight(m);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width + pad * 2);
  canvas.height = height + pad * 2;
  const ctx = canvas.getContext("2d")!;
  const slot = charWidth(m) + m.charGap;

  const each = (fn: (x: number, y: number, lit: boolean) => void) => {
    [...text].forEach((ch, i) => {
      const cols = glyph(ch);
      for (let c = 0; c < 5; c++) {
        for (let r = 0; r < 7; r++) {
          fn(pad + i * slot + c * (m.dw + m.gap), pad + r * (m.dh + m.gap), !!(cols[c] & (1 << r)));
        }
      }
    });
  };

  if (theme.ghost > 0) {
    ctx.fillStyle = `rgba(255,255,255,${theme.ghost})`;
    each((x, y, lit) => !lit && ctx.fillRect(x, y, m.dw, m.dh));
  }
  ctx.fillStyle = color;
  if (theme.glowBlur > 0) {
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = theme.glowBlur * 2 * m.dpr;
  }
  each((x, y, lit) => lit && ctx.fillRect(x, y, m.dw, m.dh));
  return { canvas, pad, width, height };
}

/** Small per-instance LRU of rendered strips. */
export class StripCache {
  private map = new Map<string, TextStrip>();
  get(text: string, m: DotMetrics, color: string, theme: ScreenTheme): TextStrip {
    const key = `${text}|${m.dw}|${m.dh}|${m.gap}|${color}|${theme.glowBlur}|${theme.ghost}`;
    let strip = this.map.get(key);
    if (!strip) {
      strip = renderStrip(text, m, color, theme);
      if (this.map.size > 12) this.map.delete(this.map.keys().next().value!);
    } else {
      this.map.delete(key);
    }
    this.map.set(key, strip);
    return strip;
  }
}

export interface Marquee {
  text: string;
  offset: number;
  pause: number;
  acc: number;
}

export const newMarquee = (text = ""): Marquee => ({ text, offset: 0, pause: 1.4, acc: 0 });

export interface LineOptions {
  x0: number;
  y: number;
  availW: number;
  align: "left" | "center";
  scroll: boolean;
  marquee: Marquee;
  dt: number;
  m: DotMetrics;
}

/** Draws a strip, stepping it one dot column at a time when it overflows (VFD-style marquee). */
export function drawLine(ctx: CanvasRenderingContext2D, strip: TextStrip, o: LineOptions) {
  const blit = (x: number) => ctx.drawImage(strip.canvas, Math.round(x) - strip.pad, Math.round(o.y) - strip.pad);
  ctx.save();
  ctx.beginPath();
  ctx.rect(o.x0, 0, o.availW, ctx.canvas.height);
  ctx.clip();
  if (!o.scroll || strip.width <= o.availW) {
    blit(o.align === "center" ? o.x0 + Math.max(0, (o.availW - strip.width) / 2) : o.x0);
  } else {
    const mq = o.marquee;
    const spacer = o.m.charGap * 6;
    const loop = strip.width + spacer;
    if (mq.pause > 0) {
      mq.pause -= o.dt;
    } else {
      mq.acc += o.dt;
      while (mq.acc >= 0.08) {
        mq.acc -= 0.08;
        mq.offset -= o.m.dw + o.m.gap;
        if (mq.offset <= -loop) {
          mq.offset += loop;
          mq.pause = 1.4;
          mq.acc = 0;
          break;
        }
      }
    }
    blit(o.x0 + mq.offset);
    blit(o.x0 + mq.offset + loop);
  }
  ctx.restore();
}

const meshes = new WeakMap<CanvasRenderingContext2D, CanvasPattern>();

/** VFD mesh grid, painted only over lit pixels. */
export function applyMesh(ctx: CanvasRenderingContext2D) {
  let pattern = meshes.get(ctx);
  if (!pattern) {
    const c = document.createElement("canvas");
    c.width = c.height = 3;
    const p = c.getContext("2d")!;
    p.fillStyle = "rgba(0,0,0,0.55)";
    p.fillRect(0, 2, 3, 1);
    p.fillRect(2, 0, 1, 3);
    pattern = ctx.createPattern(c, "repeat")!;
    meshes.set(ctx, pattern);
  }
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

export function clear(ctx: CanvasRenderingContext2D, theme: ScreenTheme) {
  ctx.save();
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}
