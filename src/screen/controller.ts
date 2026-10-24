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
 * Owns a screen canvas: DPR-aware sizing, a capped-FPS draw loop that pauses when
 * off-screen or the tab is hidden, and restarts when the card is re-attached.
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
    private draw: (f: Frame) => void,
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
    this.lastDraw = 0;
  }

  private start() {
    if (!this.raf && this.canvas) this.raf = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    this.raf = 0;
    if (!this.canvas || !this.ctx || !this.visible) return;
    if (now - this.lastDraw >= 1000 / this.fps - 1) {
      const dt = this.lastDraw ? Math.min(0.1, (now - this.lastDraw) / 1000) : 0;
      this.lastDraw = now;
      this.draw({
        ctx: this.ctx,
        w: this.canvas.width,
        h: this.canvas.height,
        dpr: window.devicePixelRatio || 1,
        dt,
        reducedMotion: this.motion.matches,
      });
    }
    this.raf = requestAnimationFrame(this.tick);
  };
}
