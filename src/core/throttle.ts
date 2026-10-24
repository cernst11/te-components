/** Sends at most one value per `ms`, always delivering the latest value (trailing edge). */
export class Throttle<T> {
  private last = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private pending?: T;

  constructor(
    private ms: number,
    private send: (value: T) => void,
  ) {}

  push(value: T) {
    this.pending = value;
    const wait = this.ms - (Date.now() - this.last);
    if (wait <= 0) this.fire();
    else if (!this.timer) this.timer = setTimeout(() => this.fire(), wait);
  }

  flush(value: T) {
    this.pending = value;
    this.fire();
  }

  private fire() {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.last = Date.now();
    this.send(this.pending as T);
  }
}
