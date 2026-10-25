import { TeBaseCard, type BaseConfig } from "./base-card";
import { detentOf } from "./feedback";
import { Throttle } from "./throttle";
import { formatValue, fracOf, hvacStatus, resolveValue, valueAt, writeValue, type ResolvedValue, type ValueConfig } from "./value";
import { clamp01 } from "../utils/math";

export interface ValueCardConfig extends BaseConfig, ValueConfig {
  entity: string;
  /** Show the live value in the sublabel line while adjusting (default true; reserves the line). */
  show_value?: boolean;
}

export interface DragStart {
  x: number;
  y: number;
  frac: number;
  rect: DOMRect;
}

/** How long a locally-set value is shown before deferring back to HA state. */
const LOCAL_HOLD_MS = 1500;

/**
 * Base for controls bound to one numeric value. Handles pointer drag, keyboard, wheel,
 * throttled writes and ARIA. Subclasses implement `dragFrac` (pointer → 0..1).
 */
export abstract class TeValueCard<C extends ValueCardConfig> extends TeBaseCard<C> {
  static properties = {
    _local: { state: true },
  };

  /** Fraction shown while dragging / until HA reports the new value. */
  declare _local: number | null;
  protected dragging = false;
  /** Absolute controls (fader) jump to the pointer; relative ones (knob, dial) don't. */
  protected absoluteDrag = false;

  private _drag?: DragStart & { id: number; moved: boolean };
  private _release?: ReturnType<typeof setTimeout>;
  /** Last detent passed, for one tick per detent while dragging. */
  private _detent?: number;
  private _throttle = new Throttle<number>(120, (v) => {
    if (this.hass && this._config) writeValue(this, this.hass, this._config, v);
  });

  constructor() {
    super();
    this._local = null;
  }

  protected abstract dragFrac(ev: PointerEvent, start: DragStart): number;

  /** Called once per drag before any `dragFrac`, for controls that track incremental state. */
  protected onDragStart(_ev: PointerEvent, _start: DragStart): void {}

  protected get resolved(): ResolvedValue {
    return resolveValue(this.hass, this._config!);
  }

  protected currentFrac(r = this.resolved): number {
    if (this._local !== null) return this._local;
    return r.value === null ? 0 : fracOf(r, r.value);
  }

  /** Sublabel text: live value while adjusting, otherwise the configured sublabel. */
  protected readoutText(r = this.resolved): string {
    const adjusting = this.dragging || this._local !== null;
    return this._config!.show_value !== false && adjusting ? this.displayValue(r) : (this._config!.sublabel ?? hvacStatus(r.stateObj)?.text ?? "");
  }

  protected get readoutClass(): string {
    return this._config!.show_value !== false ? "sublabel readout" : "sublabel";
  }

  protected displayValue(r = this.resolved): string {
    return formatValue(r, this._local !== null ? valueAt(r, this._local) : r.value);
  }

  private setLocal(frac: number, final: boolean) {
    const r = this.resolved;
    this.detentFeedback(r, clamp01(frac));
    this._local = clamp01(frac);
    const v = valueAt(r, this._local);
    if (final) this._throttle.flush(v);
    else this._throttle.push(v);
    clearTimeout(this._release);
    if (!this.dragging) this._release = setTimeout(() => (this._local = null), LOCAL_HOLD_MS);
  }

  private detentFeedback(r: ResolvedValue, frac: number) {
    const steps = (r.max - r.min) / (r.step || 1);
    const d = detentOf(frac, steps);
    const prev = this._detent;
    this._detent = d;
    if (prev === undefined || prev === d) return;
    this.feedback(frac <= 0 || frac >= 1 ? "stop" : "tick");
  }

  protected onPointerDown = (ev: PointerEvent) => {
    if (ev.button !== 0 || !this.hass) return;
    const el = ev.currentTarget as HTMLElement;
    el.setPointerCapture(ev.pointerId);
    this.dragging = true;
    this._drag = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, frac: this.currentFrac(), rect: el.getBoundingClientRect(), moved: false };
    this._detent = detentOf(this._drag.frac, (this.resolved.max - this.resolved.min) / (this.resolved.step || 1));
    this.onDragStart(ev, this._drag);
    if (this.absoluteDrag) this.setLocal(this.dragFrac(ev, this._drag), false);
  };

  protected onPointerMove = (ev: PointerEvent) => {
    const d = this._drag;
    if (!d || d.id !== ev.pointerId) return;
    if (!d.moved && Math.hypot(ev.clientX - d.x, ev.clientY - d.y) < 3) return;
    d.moved = true;
    this.setLocal(this.dragFrac(ev, d), false);
  };

  protected onPointerUp = (ev: PointerEvent) => {
    const d = this._drag;
    if (!d || d.id !== ev.pointerId) return;
    this._drag = undefined;
    this.dragging = false;
    if (d.moved || this.absoluteDrag) this.setLocal(this.dragFrac(ev, d), true);
    else this.requestUpdate();
  };

  private nudge(to: (cur: number, r: ResolvedValue) => number) {
    const r = this.resolved;
    const cur = this._local !== null ? valueAt(r, this._local) : (r.value ?? r.min);
    const next = fracOf(r, to(cur, r));
    // every key press / wheel notch is a detent, even on fine ranges
    if (clamp01(next) !== fracOf(r, cur)) this.feedback(next <= 0 || next >= 1 ? "stop" : "tick");
    this._detent = undefined;
    this.setLocal(next, false);
  }

  protected onKeyDown = (ev: KeyboardEvent) => {
    const big = (r: ResolvedValue) => Math.max(r.step, (r.max - r.min) / 10);
    const moves: Record<string, (cur: number, r: ResolvedValue) => number> = {
      ArrowUp: (c, r) => c + r.step,
      ArrowRight: (c, r) => c + r.step,
      ArrowDown: (c, r) => c - r.step,
      ArrowLeft: (c, r) => c - r.step,
      PageUp: (c, r) => c + big(r),
      PageDown: (c, r) => c - big(r),
      Home: (_, r) => r.min,
      End: (_, r) => r.max,
    };
    const move = moves[ev.key];
    if (!move) return;
    ev.preventDefault();
    this.nudge(move);
  };

  /** Wheel only adjusts a focused control, so dashboards still scroll normally. */
  protected onWheel = (ev: WheelEvent) => {
    if (!this.shadowRoot?.activeElement || ev.deltaY === 0) return;
    ev.preventDefault();
    const dir = ev.deltaY < 0 ? 1 : -1;
    this.nudge((c, r) => c + dir * r.step);
  };
}
