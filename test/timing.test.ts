import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HoldGesture } from "../src/core/hold";
import { Throttle } from "../src/core/throttle";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("Throttle", () => {
  it("sends the first value at once, then at most one per interval with the latest value", () => {
    const sent: number[] = [];
    const t = new Throttle<number>(100, (v) => sent.push(v));
    t.push(1);
    t.push(2);
    t.push(3);
    expect(sent).toEqual([1]);
    vi.advanceTimersByTime(100);
    expect(sent).toEqual([1, 3]);
    vi.advanceTimersByTime(500);
    expect(sent).toEqual([1, 3]);
  });

  it("flush sends immediately and cancels the pending send", () => {
    const sent: number[] = [];
    const t = new Throttle<number>(100, (v) => sent.push(v));
    t.push(1);
    t.push(2);
    t.flush(9);
    vi.advanceTimersByTime(200);
    expect(sent).toEqual([1, 9]);
  });
});

describe("HoldGesture", () => {
  const setup = (enabled = true) => {
    const onHold = vi.fn();
    const host = { requestUpdate: vi.fn() } as never;
    const g = new HoldGesture(host, { time: () => 500, enabled: () => enabled, onHold });
    return { g, onHold };
  };
  const press = (button = 0) => ({ button }) as PointerEvent;

  it("fires after the hold time and swallows the following click once", () => {
    const { g, onHold } = setup();
    g.down(press());
    expect(g.holding).toBe(true);
    vi.advanceTimersByTime(499);
    expect(onHold).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onHold).toHaveBeenCalledOnce();
    expect(g.holding).toBe(false);
    expect(g.consumeClick()).toBe(true);
    expect(g.consumeClick()).toBe(false);
  });

  it("does not fire when released early", () => {
    const { g, onHold } = setup();
    g.down(press());
    vi.advanceTimersByTime(300);
    g.cancel();
    vi.advanceTimersByTime(1000);
    expect(onHold).not.toHaveBeenCalled();
    expect(g.holding).toBe(false);
    expect(g.consumeClick()).toBe(false);
  });

  it("ignores non-primary buttons and disabled gestures", () => {
    const a = setup();
    a.g.down(press(2));
    const b = setup(false);
    b.g.down(press());
    vi.advanceTimersByTime(1000);
    expect(a.onHold).not.toHaveBeenCalled();
    expect(b.onHold).not.toHaveBeenCalled();
  });
});
