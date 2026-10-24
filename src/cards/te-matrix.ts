import { css, html, type PropertyValues } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import type { ActionConfig } from "../core/actions";
import { TeBaseCard, type BaseConfig } from "../core/base-card";
import { pickEntity } from "../core/entity";
import { F } from "../core/form";
import { bucket, fetchHistory, type Sample } from "../core/history";
import { MODELS, registerCard } from "../registry";
import { ANIMATION_NAMES, ANIMATIONS } from "../screen/animations";
import { ScreenController, type Frame } from "../screen/controller";
import { ACCENT, DIM, DotBuffer, LIT, MatrixPainter } from "../screen/matrix";
import { screenStyles } from "../screen/styles";
import { screenName, screenTheme } from "../screen/themes";
import { sharedStyles } from "../theme/shared";
import type { HassEntity, HomeAssistant } from "../types";
import { toNumber } from "../utils/math";

const MODES = ["graph", "appliance"] as const;
const STYLES = ["area", "line", "bars"] as const;

interface MatrixConfig extends BaseConfig {
  entity: string;
  mode: (typeof MODES)[number];
  screen: string;
  /** Dots across; rows follow from `aspect`. */
  dots: number;
  /** Height / width. */
  aspect: number;
  // graph
  hours: number;
  style: (typeof STYLES)[number];
  min?: number;
  max?: number;
  unit?: string;
  decimals?: number;
  // appliance
  animation: string;
  active_state?: string[];
  status_entity?: string;
  remaining_entity?: string;
  progress_entity?: string;
  tap_action: ActionConfig;
}

/** States that mean "not running" for appliances, unless `active_state` says otherwise. */
const INACTIVE = ["off", "idle", "standby", "unavailable", "unknown", "paused", "finished", "complete", "completed", "done", "ready", "stop", "stopped", "end", "disconnected", "not_charging", "no_power", "parked"];
const HISTORY_REFRESH_MS = 5 * 60_000;

/** Seconds left from a sensor that reports minutes/hours/seconds, "h:mm[:ss]", or a finish timestamp. */
function remainingSeconds(st?: HassEntity): number | undefined {
  if (!st) return undefined;
  const s = st.state;
  const n = toNumber(s);
  if (n !== undefined) {
    const unit = String(st.attributes.unit_of_measurement ?? "min").toLowerCase();
    return n * (unit.startsWith("h") ? 3600 : unit.startsWith("s") ? 1 : 60);
  }
  const hms = /^(\d+):(\d{1,2})(?::(\d{1,2}))?$/.exec(s);
  if (hms) return Number(hms[1]) * 3600 + Number(hms[2]) * 60 + Number(hms[3] ?? 0);
  const ts = Date.parse(s);
  return Number.isNaN(ts) ? undefined : Math.max(0, (ts - Date.now()) / 1000);
}

const fmtRemaining = (sec: number) => {
  const m = Math.ceil(sec / 60);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
};

/** DS-64 — large square dot-matrix screen: history graphs or appliance animations. */
export class TeMatrix extends TeBaseCard<MatrixConfig> {
  private screen = new ScreenController(this, (f) => this.draw(f), 15);
  private painter = new MatrixPainter();
  private buf = new DotBuffer(64, 64);
  private samples: Sample[] = [];
  private fetchedAt = 0;
  private fetching = false;
  private t = 0;

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
    return { entity: pickEntity(hass, ["sensor"]), mode: "graph", label: "TEMP", hours: 24 };
  }

  static getConfigForm() {
    return {
      schema: [
        F.entity(),
        F.grid(F.text("label"), F.select("mode", MODES)),
        F.grid(F.screen(), F.num("dots", 1), F.num("aspect", 0.05)),
        {
          type: "expandable",
          name: "",
          title: "Graph",
          schema: [F.grid(F.num("hours", 1), F.select("style", STYLES)), F.grid(F.num("min"), F.num("max")), F.grid(F.text("unit"), F.num("decimals", 1))],
        },
        {
          type: "expandable",
          name: "",
          title: "Appliance",
          schema: [
            F.select("animation", ANIMATION_NAMES),
            { name: "status_entity", selector: { entity: {} } },
            { name: "remaining_entity", selector: { entity: {} } },
            { name: "progress_entity", selector: { entity: {} } },
          ],
        },
        F.action("tap_action"),
        F.look(),
      ],
    };
  }

  protected normalizeConfig(c: Record<string, any>): MatrixConfig {
    if (!c.entity) throw new Error("entity is required");
    const mode = MODES.includes(c.mode) ? c.mode : c.animation ? "appliance" : "graph";
    if (mode === "appliance" && c.animation && !ANIMATIONS[c.animation]) throw new Error(`animation must be one of: ${ANIMATION_NAMES.join(", ")}`);
    const dots = Math.max(24, Math.min(96, Math.round(c.dots ?? 64)));
    const aspect = Math.max(0.5, Math.min(1.5, c.aspect ?? 1));
    return {
      ...c,
      type: c.type,
      entity: c.entity,
      mode,
      screen: screenName(c.screen),
      dots,
      aspect,
      hours: Math.max(1, c.hours ?? 24),
      style: STYLES.includes(c.style) ? c.style : "area",
      animation: c.animation ?? "washer",
      active_state: c.active_state === undefined ? undefined : [c.active_state].flat().map(String),
      tap_action: c.tap_action ?? { action: "more-info" },
      tile: c.tile === true,
    };
  }

  protected watchedEntities() {
    const c = this._config!;
    return [c.entity, c.status_entity, c.remaining_entity, c.progress_entity].filter(Boolean) as string[];
  }

  getCardSize() {
    return 5;
  }

  getGridOptions() {
    return { columns: 6, rows: "auto", min_columns: 4 };
  }

  protected firstUpdated() {
    this.screen.attach(this.renderRoot.querySelector("canvas"));
  }

  protected willUpdate(changed: PropertyValues) {
    super.willUpdate(changed);
    const c = this._config;
    if (!c) return;
    if (changed.has("_config")) {
      const rows = Math.round(c.dots * c.aspect);
      if (this.buf.w !== c.dots || this.buf.h !== rows) this.buf = new DotBuffer(c.dots, rows);
      const old = changed.get("_config") as MatrixConfig | undefined;
      if (!old || old.entity !== c.entity || old.hours !== c.hours) {
        this.samples = [];
        this.fetchedAt = 0;
      }
    }
    if (c.mode === "graph" && changed.has("hass")) this.trackSample();
  }

  /** Live updates between history refreshes: append the current state as a sample. */
  private trackSample() {
    const c = this._config!;
    if (this.hass && !this.fetching && Date.now() - this.fetchedAt > HISTORY_REFRESH_MS) this.loadHistory();
    const v = toNumber(this.stateObj()?.state);
    if (v === undefined) return;
    const last = this.samples[this.samples.length - 1];
    if (!last || last.v !== v) this.samples.push({ t: Date.now(), v });
    const cutoff = Date.now() - c.hours * 3600_000 * 1.1;
    if (this.samples.length > 2000 || (this.samples[0] && this.samples[0].t < cutoff)) this.samples = this.samples.filter((s) => s.t >= cutoff).slice(-2000);
  }

  private async loadHistory() {
    const c = this._config!;
    this.fetching = true;
    this.fetchedAt = Date.now();
    try {
      const hist = await fetchHistory(this.hass!, c.entity, c.hours);
      const since = hist.length ? hist[hist.length - 1].t : 0;
      this.samples = [...hist, ...this.samples.filter((s) => s.t > since)];
    } catch (err) {
      console.warn("te-matrix: history unavailable", err);
    } finally {
      this.fetching = false;
    }
  }

  private valueText(): string {
    const c = this._config!;
    const st = this.stateObj();
    if (!st) return "--";
    const n = toNumber(st.state);
    const unit = c.unit ?? st.attributes.unit_of_measurement ?? "";
    const text = n === undefined ? st.state : c.decimals !== undefined ? n.toFixed(c.decimals) : String(n);
    return `${text}${unit}`.toUpperCase();
  }

  private isActive(): boolean {
    const c = this._config!;
    const st = this.stateObj();
    if (!st) return false;
    if (c.active_state) return c.active_state.includes(st.state);
    return !INACTIVE.includes(st.state.toLowerCase());
  }

  private statusText(): string {
    const c = this._config!;
    const st = this.hass?.states[c.status_entity ?? c.entity];
    return (st?.state ?? "--").replace(/_/g, " ").toUpperCase();
  }

  private drawGraph() {
    const c = this._config!;
    const b = this.buf;
    const W = b.w;
    const H = b.h;
    const value = this.valueText();
    const label = (c.label ?? "").toUpperCase();
    // tall screens: label, then a big 2× value; short ones put the value in the header row
    let gy0: number;
    if (H >= 56) {
      b.text(b.fitText(label, W - 2), 1, 1, LIT);
      const valueY = 11;
      if (DotBuffer.textWidth(value, 2) <= W - 2) b.text(value, (W - DotBuffer.textWidth(value, 2)) / 2, valueY, LIT, 2);
      else b.text(b.fitText(value, W - 2), (W - DotBuffer.textWidth(b.fitText(value, W - 2))) / 2, valueY + 3, LIT);
      gy0 = valueY + 18;
    } else {
      const vw = DotBuffer.textWidth(value);
      b.text(value, W - 1 - vw, 1, LIT);
      b.text(b.fitText(label, W - vw - 5), 1, 1, LIT);
      gy0 = 11;
    }
    const gx0 = 1;
    const gx1 = W - 2;
    const gy1 = H - 8;
    const gridY = [gy0, Math.round((gy0 + gy1) / 2), gy1];
    for (const y of gridY) b.hline(gx0, gx1, y, DIM, 4);

    const bars = c.style === "bars";
    const n = bars ? Math.floor((gx1 - gx0 + 2) / 2) : gx1 - gx0 + 1;
    const series = bucket(this.samples, n, c.hours);
    const known = series.filter((v): v is number => v !== null);
    let lo = c.min ?? (known.length ? Math.min(...known) : 0);
    let hi = c.max ?? (known.length ? Math.max(...known) : 1);
    if (hi - lo < 1e-6) {
      lo -= 1;
      hi += 1;
    } else if (c.min === undefined || c.max === undefined) {
      const pad = (hi - lo) * 0.1;
      if (c.min === undefined) lo -= pad;
      if (c.max === undefined) hi += pad;
    }
    const yOf = (v: number) => Math.round(gy1 - ((v - lo) / (hi - lo)) * (gy1 - gy0));

    let prevY: number | undefined;
    series.forEach((v, i) => {
      if (v === null) return;
      const y = Math.max(gy0, Math.min(gy1, yOf(v)));
      if (bars) {
        const x = gx0 + i * 2;
        b.vline(x, y, gy1, i === n - 1 ? ACCENT : LIT);
        return;
      }
      const x = gx0 + i;
      if (c.style === "area") for (let yy = y + 1; yy <= gy1; yy++) if ((x + yy) % 2 === 0) b.add(x, yy, DIM);
      b.vline(x, prevY ?? y, y, LIT);
      prevY = y;
    });
    // "now" marker blinks at 1Hz on line/area graphs
    const last = series[series.length - 1];
    if (!bars && last !== null && last !== undefined && Math.floor(performance.now() / 500) % 2 === 0) b.disc(gx1, yOf(last), 1, ACCENT);

    // footer: time span left, low/high of the window right (tiny font)
    const fmt = (v: number) => (Math.abs(hi - lo) < 10 ? v.toFixed(1) : String(Math.round(v)));
    const span = `${c.hours}H`;
    b.tiny(span, 1, H - 6, LIT);
    const range = known.length ? `${fmt(Math.min(...known))}/${fmt(Math.max(...known))}` : "";
    if (DotBuffer.tinyWidth(span) + DotBuffer.tinyWidth(range) + 4 <= W - 2) b.tiny(range, W - 1 - DotBuffer.tinyWidth(range), H - 6, LIT);
  }

  private drawAppliance(f: Frame) {
    const c = this._config!;
    const b = this.buf;
    const W = b.w;
    const H = b.h;
    const active = this.isActive();
    if (active && !f.reducedMotion) this.t += f.dt;

    const rem = remainingSeconds(c.remaining_entity ? this.hass?.states[c.remaining_entity] : undefined);
    const remText = active && rem !== undefined ? fmtRemaining(rem) : "";
    const remW = DotBuffer.textWidth(remText);
    if (remText) b.text(remText, W - 1 - remW, 1, ACCENT);
    b.text(b.fitText((c.label ?? "").toUpperCase(), W - 2 - (remText ? remW + 3 : 0)), 1, 1, LIT);

    const progress = c.progress_entity ? toNumber(this.hass?.states[c.progress_entity]?.state) : undefined;
    const status = this.statusText();
    const footer = H - 8;
    const barY = footer - 3;
    const animBottom = progress !== undefined ? barY - 2 : footer - 2;

    const st = this.stateObj();
    const pct = toNumber(st?.attributes.percentage);
    const intensity = pct !== undefined ? pct / 100 : /spin/i.test(status) ? 1 : 0.5;
    ANIMATIONS[c.animation](b, { x0: 1, y0: 10, x1: W - 2, y1: animBottom }, { t: this.t, active, intensity, status, level: progress === undefined ? undefined : progress / 100 });

    if (progress !== undefined) {
      const segs = Math.floor((W - 1) / 4);
      const lit = Math.round((Math.max(0, Math.min(100, progress)) / 100) * segs);
      for (let i = 0; i < segs; i++) b.fillRect(1 + i * 4, barY, 3 + i * 4, barY + 1, i < lit ? LIT : DIM);
    }
    // the % readout yields to the status when both don't fit (the bar still shows progress)
    let right = progress !== undefined ? `${Math.round(progress)}%` : "";
    if (right && DotBuffer.textWidth(status) + DotBuffer.textWidth(right) + 3 > W - 2) right = "";
    if (right) b.text(right, W - 1 - DotBuffer.textWidth(right), footer, LIT);
    b.text(b.fitText(status, W - 2 - (right ? DotBuffer.textWidth(right) + 3 : 0)), 1, footer, active ? LIT : DIM);
  }

  private draw(f: Frame) {
    if (!this._config) return;
    this.buf.clear();
    if (this._config.mode === "graph") this.drawGraph();
    else this.drawAppliance(f);
    this.painter.paint(f.ctx, this.buf, screenTheme(this._config.screen), 6 * f.dpr);
  }

  render() {
    const c = this._config!;
    const desc = c.mode === "graph" ? `${c.label ?? ""} ${this.valueText()}` : `${c.label ?? ""} ${this.statusText()}`;
    return html`
      <div class="card ${classMap({ tile: !!c.tile })}">
        <div
          class="screen"
          role="button"
          tabindex="0"
          aria-label=${desc.trim()}
          style=${styleMap({ aspectRatio: `1 / ${c.aspect}` })}
          @click=${() => this.run(c.tap_action)}
          @keydown=${(e: KeyboardEvent) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), this.run(c.tap_action))}
        >
          <canvas></canvas>
        </div>
      </div>
    `;
  }
}

registerCard({ ...MODELS.matrix, description: "Large square dot-matrix screen: history graphs or appliance animations (washer, dryer, dishwasher, fan)." }, TeMatrix);
