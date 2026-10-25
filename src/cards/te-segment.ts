import { css, html } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import type { ActionConfig } from "../core/actions";
import { TeBaseCard, type BaseConfig } from "../core/base-card";
import { pickEntity } from "../core/entity";
import { F } from "../core/form";
import { displayAttribute } from "../core/value";
import { MODELS, registerCard } from "../registry";
import { ScreenController, type Frame } from "../screen/controller";
import { applyMesh, clear, pixelMetrics, StripCache } from "../screen/render";
import { cellsWidth, drawCells, toCells } from "../screen/segments";
import { screenStyles } from "../screen/styles";
import { screenName, screenTheme } from "../screen/themes";
import { sharedStyles } from "../theme/shared";
import type { HassEntity, HomeAssistant } from "../types";
import { domainOf, toNumber } from "../utils/math";

interface SegmentConfig extends BaseConfig {
  /** Show the time instead of an entity. */
  clock: boolean;
  seconds: boolean;
  hour12: boolean;
  /** Blink the colon each second (clock, running timer); false keeps it lit. */
  blink: boolean;
  attribute?: string;
  unit?: string;
  decimals?: number;
  /** Fixed number of digit cells; unused ones show as unlit 8s. */
  digits?: number;
  screen: string;
  height: number;
  tap_action: ActionConfig;
}

/** "h:mm:ss" / "mm:ss" duration string → seconds. */
const parseDuration = (s: unknown) => {
  const parts = String(s ?? "").split(":").map(Number);
  if (parts.some(Number.isNaN) || !parts.length) return undefined;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
};

const fmtDuration = (sec: number) => {
  const s = Math.max(0, Math.ceil(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
};

/** Seconds left on an HA timer: counts down from `finishes_at` while active. */
function timerSeconds(st: HassEntity): number | undefined {
  if (st.state === "active" && st.attributes.finishes_at) return (Date.parse(st.attributes.finishes_at) - Date.now()) / 1000;
  return parseDuration(st.state === "paused" ? st.attributes.remaining : st.attributes.duration);
}

/** SG-7 — big seven-segment numerals: a value, a clock, or an HA timer counting down. */
export class TeSegment extends TeBaseCard<SegmentConfig> {
  private screen = new ScreenController(this, (f) => this.draw(f), 4);
  private strips = new StripCache();

  static styles = [
    sharedStyles,
    screenStyles,
    css`
      .card {
        align-items: stretch;
      }
      .screen {
        cursor: pointer;
      }
    `,
  ];

  static getStubConfig(hass?: HomeAssistant) {
    return { entity: pickEntity(hass, ["sensor", "timer"]), label: "VALUE" };
  }

  static getConfigForm() {
    return {
      schema: [
        { ...F.entity(), required: false },
        F.text("label"),
        F.grid(F.bool("clock"), F.bool("seconds"), F.bool("hour12"), F.bool("blink")),
        F.grid(F.screen(), F.num("height", 1), F.num("digits", 1)),
        F.attribute(),
        F.grid(F.text("unit"), F.num("decimals", 1)),
        F.action("tap_action"),
        F.look(),
      ],
    };
  }

  protected normalizeConfig(c: Record<string, any>): SegmentConfig {
    if (!c.clock && !c.entity) throw new Error("entity is required (or set clock: true)");
    return {
      ...c,
      type: c.type,
      clock: c.clock === true,
      seconds: c.seconds === true,
      hour12: c.hour12 === true,
      blink: c.blink !== false,
      screen: screenName(c.screen),
      height: c.height ?? 96,
      tap_action: c.tap_action ?? (c.entity ? { action: "more-info" } : { action: "none" }),
      tile: c.tile === true,
    };
  }

  getGridOptions() {
    return { columns: 6, rows: 2, min_columns: 3 };
  }

  protected firstUpdated() {
    this.screen.attach(this.renderRoot.querySelector("canvas"));
  }

  /** Text for the digits, the small unit beside them, and whether the colon is lit this frame. */
  private content(): { text: string; unit: string; colon: boolean } {
    const c = this._config!;
    const blink = !c.blink || Math.floor(Date.now() / 500) % 2 === 0;
    if (c.clock) {
      const d = new Date();
      let h = d.getHours();
      const suffix = c.hour12 ? (h < 12 ? "AM" : "PM") : "";
      if (c.hour12) h = h % 12 || 12;
      const mm = String(d.getMinutes()).padStart(2, "0");
      const text = `${c.hour12 ? h : String(h).padStart(2, "0")}:${mm}${c.seconds ? `:${String(d.getSeconds()).padStart(2, "0")}` : ""}`;
      return { text, unit: suffix, colon: c.seconds || blink };
    }
    const st = this.stateObj();
    if (!st) return { text: "----", unit: "", colon: true };
    if (domainOf(c.entity) === "timer") {
      const sec = timerSeconds(st);
      // a running timer's colon blinks; paused/idle stays solid
      return { text: sec === undefined ? "--:--" : fmtDuration(sec), unit: st.state === "active" ? "" : st.state.toUpperCase(), colon: st.state !== "active" || blink };
    }
    const attr = c.attribute ? displayAttribute(st, c.attribute) : undefined;
    const raw = attr ? attr.raw : st.state;
    const n = toNumber(raw);
    const text = n === undefined ? String(raw ?? "--") : c.decimals !== undefined ? n.toFixed(c.decimals) : String(n);
    return { text, unit: (c.unit ?? (attr ? attr.unit : st.attributes.unit_of_measurement) ?? "").toUpperCase(), colon: true };
  }

  private draw(f: Frame) {
    if (!this._config) return;
    const { ctx, w, h, dpr } = f;
    const theme = screenTheme(this._config.screen);
    clear(ctx, theme);
    const { text, unit, colon } = this.content();
    const cells = toCells(text, this._config.digits, colon);

    const unitM = pixelMetrics(Math.max(1, Math.round(h / dpr / 40)), dpr);
    const unitStrip = unit ? this.strips.get(unit, unitM, theme.fg2, { ...theme, ghost: 0 }) : undefined;
    const pad = 14 * dpr;
    const unitW = unitStrip ? unitStrip.width + 8 * dpr : 0;
    // as tall as the screen allows, then shrink to fit the width
    let digitH = h * 0.64;
    const fitW = w - pad * 2 - unitW;
    const natural = cellsWidth(cells, digitH);
    if (natural > fitW) digitH *= fitW / natural;
    const total = cellsWidth(cells, digitH) + unitW;
    const x = (w - total) / 2;
    const y = (h - digitH) / 2;
    drawCells(ctx, cells, x, y, digitH, theme);
    if (unitStrip) ctx.drawImage(unitStrip.canvas, Math.round(x + total - unitStrip.width) - unitStrip.pad, Math.round(y) - unitStrip.pad);
    if (theme.mesh) applyMesh(ctx);
  }

  render() {
    const c = this._config!;
    const { text, unit } = this.content();
    return html`
      <div class="card ${classMap({ tile: !!c.tile })}">
        <div class="label">${c.label ?? ""}</div>
        <div
          class="screen"
          role="button"
          tabindex="0"
          aria-label=${`${c.label ?? ""} ${text} ${unit}`.trim()}
          style=${styleMap({ height: `${c.height}px` })}
          @click=${() => this.run(c.tap_action)}
          @keydown=${(e: KeyboardEvent) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), this.run(c.tap_action))}
        >
          <canvas></canvas>
        </div>
      </div>
    `;
  }
}

registerCard({ ...MODELS.segment, description: "Big seven-segment numerals for a value, a clock, or an HA timer counting down." }, TeSegment);
