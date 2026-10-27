import { css, html, type PropertyValues } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { TeBaseCard, type BaseConfig } from "../core/base-card";
import { pickEntity } from "../core/entity";
import { configForm, F } from "../core/form";
import { displayAttribute } from "../core/value";
import { MODELS, registerCard } from "../registry";
import { ScreenController, type Frame } from "../screen/controller";
import { applyMesh, clear, dotMetrics, drawLine, glyphHeight, newMarquee, pixelMetrics, StripCache, type Marquee } from "../screen/render";
import { screenName, screenTheme, type ScreenTheme } from "../screen/themes";
import { screenStyles } from "../screen/styles";
import { sharedStyles } from "../theme/shared";
import type { HomeAssistant } from "../types";
import { domainOf, toNumber } from "../utils/math";

interface ChipConfig {
  entity: string;
  attribute?: string;
  /** Chip lights when the state/attribute equals this. */
  value?: string;
  label?: string;
  /** Show the first number found in the state instead of a label. */
  number?: boolean;
}

interface DisplayConfig extends BaseConfig {
  attribute?: string;
  unit: string;
  decimals?: number;
  screen: string;
  progress: boolean;
  chips: ChipConfig[];
  height: number;
  text_size: number;
  demo: boolean;
}

const DEFAULTS = { progress: false, height: 92, text_size: 2, demo: false } satisfies Partial<DisplayConfig>;

interface Progress {
  position: number;
  duration: number;
  updatedAt: number;
  playing: boolean;
}

const DEMO_TRACKS = [
  { text: "Jellyfin - Daft Punk - One More Time", duration: 19 },
  { text: "Spotify - Tame Impala - The Less I Know The Better", duration: 16 },
  { text: "YouTube - Vintage Synthesizer Repair Part 4", duration: 22 },
  { text: "Cast - Boards Of Canada - Roygbiv", duration: 14 },
];

/** DS-8 — main screen: scrolling pixel text, status chips, segmented progress. */
export class TeDisplay extends TeBaseCard<DisplayConfig> {
  private screen = new ScreenController(this, (f) => this.draw(f));
  private strips = new StripCache();
  private marquee: Marquee = newMarquee();
  private demoStart = performance.now();

  static styles = [
    sharedStyles,
    screenStyles,
    css`
      .card {
        align-items: stretch;
      }
    `,
  ];

  static getStubConfig(hass?: HomeAssistant) {
    return { entity: pickEntity(hass, ["media_player", "sensor"]), label: "NOW PLAYING", progress: true };
  }

  static getConfigForm() {
    return configForm(
      [
        { ...F.entity(), required: false },
        F.text("label"),
        F.grid(F.screen(), F.num("text_size", 0.5), F.num("height", 1)),
        F.grid(F.bool("progress"), F.bool("demo")),
        F.attribute(),
        F.grid(F.text("unit"), F.num("decimals", 1)),
        F.look(),
      ],
      DEFAULTS,
    );
  }

  protected normalizeConfig(c: Record<string, any>): DisplayConfig {
    if (!c.demo && !c.entity) throw new Error("entity is required");
    return {
      ...c,
      type: c.type,
      unit: c.unit ?? "",
      screen: screenName(c.screen ?? c.theme),
      progress: c.progress ?? DEFAULTS.progress,
      chips: c.chips ?? c.icons ?? [],
      height: c.height ?? DEFAULTS.height,
      text_size: c.text_size ?? DEFAULTS.text_size,
      demo: c.demo ?? DEFAULTS.demo,
      tile: c.tile === true,
    };
  }

  protected watchedEntities() {
    const c = this._config;
    return c ? [c.entity, ...c.chips.map((ch) => ch.entity)].filter(Boolean) as string[] : [];
  }

  getCardSize() {
    return 2;
  }

  getGridOptions() {
    return { columns: 12, rows: 2, min_columns: 6, min_rows: 2 };
  }

  protected firstUpdated() {
    this.screen.attach(this.renderRoot.querySelector("canvas"));
  }

  protected updated(changed: PropertyValues) {
    if (changed.has("_config")) this.demoStart = performance.now();
  }

  private demoState() {
    const total = DEMO_TRACKS.reduce((s, t) => s + t.duration, 0);
    let t = ((performance.now() - this.demoStart) / 1000) % total;
    for (let i = 0; i < DEMO_TRACKS.length; i++) {
      if (t < DEMO_TRACKS[i].duration) return { i, track: DEMO_TRACKS[i], pos: t };
      t -= DEMO_TRACKS[i].duration;
    }
    return { i: 0, track: DEMO_TRACKS[0], pos: 0 };
  }

  private text(): string {
    const c = this._config!;
    if (c.demo) return this.demoState().track.text.toUpperCase();
    const st = this.stateObj();
    if (!st) return "----";
    const attr = c.attribute ? displayAttribute(st, c.attribute) : undefined;
    let raw: unknown = attr?.raw;
    if (raw === undefined || raw === null || raw === "") {
      if (domainOf(c.entity) === "media_player") {
        const a = st.attributes;
        raw = [a.media_artist, a.media_title].filter(Boolean).join(" - ") || a.app_name || st.state;
      } else raw = st.state;
    }
    const num = toNumber(raw);
    const text = num !== undefined && c.decimals !== undefined ? num.toFixed(c.decimals) : String(raw);
    return `${text}${c.unit || attr?.unit || ""}`.toUpperCase();
  }

  private progress(): Progress | null {
    const c = this._config!;
    if (!c.progress) return null;
    if (c.demo) {
      const d = this.demoState();
      return { position: d.pos, duration: d.track.duration, updatedAt: Date.now(), playing: false };
    }
    const a = this.stateObj()?.attributes;
    if (!a || typeof a.media_duration !== "number" || a.media_duration <= 0) return null;
    return {
      position: a.media_position || 0,
      duration: a.media_duration,
      updatedAt: a.media_position_updated_at ? Date.parse(a.media_position_updated_at) : Date.now(),
      playing: this.stateObj()?.state === "playing",
    };
  }

  private chips(): { text: string; lit: boolean }[] {
    const c = this._config!;
    const demo = c.demo ? this.demoState().i : -1;
    return c.chips.map((ch, i) => {
      const st = this.hass?.states[ch.entity];
      const raw = st ? (ch.attribute ? st.attributes[ch.attribute] : st.state) : undefined;
      if (ch.number) {
        const n = demo >= 0 ? String((demo + i) % 10) : (String(raw ?? "").match(/\d+/)?.[0] ?? "-");
        return { text: n, lit: true };
      }
      const text = (ch.label ?? ch.value ?? ch.entity).toUpperCase();
      const lit = demo >= 0 ? i === demo % c.chips.length : raw !== undefined && String(raw) === String(ch.value);
      return { text, lit };
    });
  }

  private drawChips(ctx: CanvasRenderingContext2D, f: Frame, theme: ScreenTheme): number {
    const chips = this.chips();
    if (!chips.length) return 0;
    const { dpr } = f;
    const m = pixelMetrics(1, dpr);
    const boxH = 15 * dpr;
    const padX = 5 * dpr;
    const gap = 5 * dpr;
    const top = 9 * dpr;
    const items = chips.map((ch) => {
      const strip = this.strips.get(ch.text, m, ch.lit ? theme.fg2 : "rgba(255,255,255,0.3)", { ...theme, glowBlur: ch.lit ? theme.glowBlur * 0.6 : 0, ghost: 0 });
      return { ...ch, strip, w: Math.max(boxH, strip.width + padX * 2) };
    });
    let x = f.w - 12 * dpr - items.reduce((s, it) => s + it.w, 0) - gap * (items.length - 1);
    ctx.save();
    ctx.lineWidth = Math.max(1, Math.round(dpr));
    for (const it of items) {
      ctx.strokeStyle = it.lit ? theme.fg2 : "rgba(255,255,255,0.18)";
      ctx.beginPath();
      ctx.roundRect(x + 0.5, top + 0.5, it.w - 1, boxH - 1, 2 * dpr);
      ctx.stroke();
      ctx.drawImage(it.strip.canvas, Math.round(x + (it.w - it.strip.width) / 2) - it.strip.pad, Math.round(top + (boxH - it.strip.height) / 2) - it.strip.pad);
      x += it.w + gap;
    }
    ctx.restore();
    return top + boxH;
  }

  private drawProgress(ctx: CanvasRenderingContext2D, f: Frame, theme: ScreenTheme): number {
    const p = this.progress();
    if (!this._config!.progress) return 0;
    const { dpr, w, h } = f;
    const barH = 6 * dpr;
    const bottom = 11 * dpr;
    const side = 14 * dpr;
    const segs = 28;
    const segGap = 3 * dpr;
    const segW = (w - side * 2) / segs - segGap;
    let frac = 0;
    if (p) {
      const elapsed = p.position + (p.playing ? (Date.now() - p.updatedAt) / 1000 : 0);
      frac = Math.max(0, Math.min(1, elapsed / p.duration));
    }
    const filled = Math.round(frac * segs);
    ctx.save();
    ctx.shadowColor = theme.glow;
    for (let i = 0; i < segs; i++) {
      const on = i < filled;
      ctx.shadowBlur = on ? theme.glowBlur * 1.5 * dpr : 0;
      ctx.fillStyle = on ? theme.fg2 : "rgba(255,255,255,0.08)";
      ctx.fillRect(Math.round(side + i * (segW + segGap)), h - bottom - barH, Math.round(segW), barH);
    }
    ctx.restore();
    return bottom + barH;
  }

  private draw(f: Frame) {
    if (!this._config) return;
    const { ctx, w, h, dpr } = f;
    const theme = screenTheme(this._config.screen);
    clear(ctx, theme);
    const top = this.drawChips(ctx, f, theme);
    const bottom = this.drawProgress(ctx, f, theme);

    const text = this.text();
    if (text !== this.marquee.text) this.marquee = newMarquee(text);
    const m = dotMetrics(this._config.text_size, dpr, theme);
    const strip = this.strips.get(text, m, theme.fg, theme);
    const margin = 14 * dpr;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, top, w, h - top - bottom);
    ctx.clip();
    drawLine(ctx, strip, {
      x0: margin,
      y: top + (h - top - bottom - glyphHeight(m)) / 2,
      availW: w - margin * 2,
      align: "center",
      scroll: !f.reducedMotion,
      marquee: this.marquee,
      dt: f.dt,
      m,
    });
    ctx.restore();
    if (theme.mesh) applyMesh(ctx);
  }

  render() {
    const c = this._config!;
    return html`
      <div class="card ${classMap({ tile: !!c.tile })}">
        <div class="label">${c.label ?? ""}</div>
        <div class="screen" role="img" aria-label=${this.text()} style=${styleMap({ height: `${c.height}px` })}>
          <canvas></canvas>
        </div>
      </div>
    `;
  }
}

registerCard({ ...MODELS.display, description: "Pixel screen (VFD, OLED or LCD) with marquee text, status chips and progress." }, TeDisplay);
