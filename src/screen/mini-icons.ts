import type { ScreenTheme } from "./themes";

export const MINI_ICONS = ["bulb", "lamp", "downlight", "thermometer", "droplet", "molecule", "plug", "battery", "blinds"] as const;
export type MiniIcon = (typeof MINI_ICONS)[number];

type Painter = (ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) => void;

const PAINTERS: Record<MiniIcon, Painter> = {
  bulb(ctx, cx, cy, s) {
    const r = s * 0.32;
    const gcy = cy - s * 0.08;
    ctx.beginPath();
    ctx.arc(cx, gcy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - s * 0.15, gcy + r * 0.55, s * 0.3, s * 0.2);
  },
  lamp(ctx, cx, cy, s) {
    const top = cy - s * 0.42;
    const h = s * 0.32;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.15, top);
    ctx.lineTo(cx + s * 0.15, top);
    ctx.lineTo(cx + s * 0.27, top + h);
    ctx.lineTo(cx - s * 0.27, top + h);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(cx - s * 0.035, top + h, s * 0.07, s * 0.32);
    ctx.beginPath();
    ctx.ellipse(cx, top + h + s * 0.34, s * 0.16, s * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
  },
  downlight(ctx, cx, cy, s) {
    const ring = cy - s * 0.32;
    ctx.beginPath();
    ctx.ellipse(cx, ring, s * 0.3, s * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.25, ring);
    ctx.lineTo(cx + s * 0.25, ring);
    ctx.lineTo(cx + s * 0.07, ring + s * 0.4);
    ctx.lineTo(cx - s * 0.07, ring + s * 0.4);
    ctx.closePath();
    ctx.fill();
  },
  thermometer(ctx, cx, cy, s) {
    const w = s * 0.14;
    const top = cy - s * 0.42;
    ctx.fillRect(cx - w / 2, top, w, s * 0.5);
    ctx.beginPath();
    ctx.arc(cx, top + s * 0.5 + s * 0.064, s * 0.16, 0, Math.PI * 2);
    ctx.fill();
  },
  droplet(ctx, cx, cy, s) {
    const r = s * 0.22;
    const top = cy - s * 0.4;
    const bot = cy + s * 0.12;
    ctx.beginPath();
    ctx.moveTo(cx, top);
    ctx.bezierCurveTo(cx + r * 1.4, cy - s * 0.05, cx + r, bot, cx, bot);
    ctx.bezierCurveTo(cx - r, bot, cx - r * 1.4, cy - s * 0.05, cx, top);
    ctx.closePath();
    ctx.fill();
  },
  molecule(ctx, cx, cy, s) {
    const sats: [number, number][] = [
      [cx - s * 0.24, cy - s * 0.18],
      [cx + s * 0.26, cy - s * 0.12],
      [cx + s * 0.06, cy + s * 0.24],
    ];
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = Math.max(1, s * 0.04);
    ctx.beginPath();
    sats.forEach(([x, y]) => {
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.14, 0, Math.PI * 2);
    ctx.fill();
    sats.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
    });
  },
  plug(ctx, cx, cy, s) {
    const w = s * 0.34;
    const h = s * 0.3;
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
    ctx.fillRect(cx - w * 0.22, cy - h / 2 - s * 0.16, s * 0.06, s * 0.16);
    ctx.fillRect(cx + w * 0.22 - s * 0.06, cy - h / 2 - s * 0.16, s * 0.06, s * 0.16);
  },
  battery(ctx, cx, cy, s) {
    const w = s * 0.36;
    const by = cy - s * 0.25 + s * 0.03;
    ctx.fillRect(cx - s * 0.07, by - s * 0.06, s * 0.14, s * 0.06);
    ctx.fillRect(cx - w / 2, by, w, s * 0.5);
  },
  blinds(ctx, cx, cy, s) {
    const w = s * 0.56;
    const h = s * 0.5;
    const gap = (h - s * 0.05) / 4;
    for (let i = 0; i <= 4; i++) ctx.fillRect(cx - w / 2, cy - h / 2 + i * gap, w, s * 0.05);
  },
};

export function drawMiniIcon(ctx: CanvasRenderingContext2D, kind: MiniIcon, cx: number, cy: number, size: number, lit: boolean, theme: ScreenTheme) {
  ctx.save();
  ctx.fillStyle = lit ? theme.fg : "rgba(255,255,255,0.22)";
  ctx.shadowColor = theme.glow;
  ctx.shadowBlur = lit ? theme.glowBlur * 1.5 : 0;
  PAINTERS[kind](ctx, cx, cy, size);
  ctx.restore();
}
