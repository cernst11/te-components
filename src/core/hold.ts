import type { ReactiveControllerHost } from "lit";

/**
 * Press-and-hold gesture. Bind `down`/`cancel` to pointer events; `holding` drives the fill
 * animation. After a hold fires, `consumeClick()` returns true once so the click is skipped.
 */
export class HoldGesture {
  holding = false;
  private fired = false;
  private timer?: ReturnType<typeof setTimeout>;

  constructor(
    private host: ReactiveControllerHost,
    private opts: { time: () => number; enabled: () => boolean; onHold: () => void },
  ) {}

  down = (ev: PointerEvent) => {
    if (ev.button !== 0 || !this.opts.enabled()) return;
    this.fired = false;
    this.holding = true;
    this.host.requestUpdate();
    this.timer = setTimeout(() => {
      this.holding = false;
      this.fired = true;
      this.host.requestUpdate();
      this.opts.onHold();
    }, this.opts.time());
  };

  cancel = () => {
    clearTimeout(this.timer);
    if (this.holding) {
      this.holding = false;
      this.host.requestUpdate();
    }
  };

  consumeClick(): boolean {
    const fired = this.fired;
    this.fired = false;
    return fired;
  }
}
