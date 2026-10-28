import type { ReactiveController, ReactiveControllerHost } from "lit";

export interface Frame {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  dpr: number;
  /** Seconds since the previous drawn frame. */
  dt: number;
  reducedMotion: boolean;
}

/**
 * Draws a frame; returns true while the screen is animating (marquee, blink, clock) so the
 * controller keeps the loop running. A static screen draws once and waits for the next change.
 */
export type DrawFn = (f: Frame) => boolean | void;

/**
 * Owns a screen canvas: DPR-aware sizing and a capped-FPS draw loop that only runs while the
 * screen animates. It redraws after every host update, on resize and when scrolled back into
 * view; it pauses when off-screen or the tab is hidden, and restarts when the card is re-attached.
 */
export class ScreenController implements ReactiveController {
  private canvas?: HTMLCanvasElement;
  private ctx?: CanvasRenderingContext2D;
  private ro?: ResizeObserver;
  private io?: IntersectionObserver;
  private raf = 0;
  private lastDraw = 0;
  private visible = true;
  private motion = matchMedia("(prefers-reduced-motion: reduce)");

  constructor(
    host: ReactiveControllerHost,
    private draw: DrawFn,
    private fps = 30,
  ) {
    host.addController(this);
  }

  attach(canvas: HTMLCanvasElement | null) {
    if (!canvas || canvas === this.canvas) return;
    this.teardown();
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.setup();
  }

  hostConnected() {
    if (this.canvas) this.setup();
  }

  hostDisconnected() {
    this.teardown();
  }

  /** The host re-rendered: its state may have changed, so draw it. */
  hostUpdated() {
    this.invalidate();
  }

  /** Draws on the next frame; call it when something the screen shows changed outside a host update. */
  invalidate() {
    this.start();
  }

  private setup() {
    if (!this.canvas || this.ro) return;
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.canvas);
    this.io = new IntersectionObserver((entries) => {
      this.visible = entries.some((e) => e.isIntersecting);
      if (this.visible) this.start();
    });
    this.io.observe(this.canvas);
    this.resize();
    this.start();
  }

  private teardown() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.ro?.disconnect();
    this.io?.disconnect();
    this.ro = this.io = undefined;
  }

  private resize() {
    const c = this.canvas!;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(c.clientWidth * dpr));
    const h = Math.max(1, Math.round(c.clientHeight * dpr));
    if (c.width !== w) c.width = w;
    if (c.height !== h) c.height = h;
    // a resize clears the canvas; draw again right away
    this.lastDraw = 0;
    this.start();
  }

  private start() {
    if (!this.raf && this.canvas && this.visible) this.raf = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    this.raf = 0;
    if (!this.canvas || !this.ctx || !this.visible) return;
    if (now - this.lastDraw < 1000 / this.fps - 1) {
      this.raf = requestAnimationFrame(this.tick);
      return;
    }
    const dt = this.lastDraw ? Math.min(0.1, (now - this.lastDraw) / 1000) : 0;
    const animating = this.draw({
      ctx: this.ctx,
      w: this.canvas.width,
      h: this.canvas.height,
      dpr: window.devicePixelRatio || 1,
      dt,
      reducedMotion: this.motion.matches,
    });
    if (animating) {
      this.lastDraw = now;
      this.raf = requestAnimationFrame(this.tick);
    } else {
      // idle: the next draw (after a change) starts with dt 0 and isn't held back by the fps cap
      this.lastDraw = 0;
    }
  };
}
