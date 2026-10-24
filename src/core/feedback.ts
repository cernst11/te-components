/**
 * Optional tactile/audible feedback (DESIGN.md §8): a tick per detent, a click per key press. Off unless a
 * card sets `feedback:` or the HA theme sets `te-feedback:` (`haptic`, `sound` or `both`).
 *
 * Haptics go through HA's `haptic` window event, which the companion apps turn into native feedback; plain
 * browsers fall back to `navigator.vibrate` (Android). Sounds are synthesized clicks via WebAudio, no assets.
 */

export type FeedbackMode = "off" | "haptic" | "sound" | "both";
/** tick: detent · stop: end of travel · press: key/action · confirm: slide/hold committed. */
export type FeedbackKind = "tick" | "stop" | "press" | "confirm";

export const FEEDBACK_MODES: readonly FeedbackMode[] = ["off", "haptic", "sound", "both"];

export const feedbackMode = (v: unknown): FeedbackMode | undefined => {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "true" || s === "on") return "both";
  if (s === "false" || s === "none") return "off";
  return (FEEDBACK_MODES as readonly string[]).includes(s) ? (s as FeedbackMode) : undefined;
};

/** HA's HapticType names. */
const HAPTIC: Record<FeedbackKind, string> = { tick: "selection", stop: "light", press: "light", confirm: "success" };
const VIBRATE: Record<FeedbackKind, number | number[]> = { tick: 4, stop: 12, press: 10, confirm: [12, 50, 18] };

/** Detents faster than this collapse into one tick, so a fast spin doesn't buzz. */
const MIN_TICK_MS = 28;
let lastTick = 0;

/** The companion apps implement the `haptic` event natively; vibrating as well would double up. */
const inCompanionApp = () => {
  const w = window as unknown as { externalApp?: unknown; webkit?: { messageHandlers?: { externalBus?: unknown } } };
  return !!(w.externalApp || w.webkit?.messageHandlers?.externalBus);
};

function haptic(kind: FeedbackKind) {
  window.dispatchEvent(new CustomEvent("haptic", { detail: HAPTIC[kind], bubbles: true, composed: true }));
  if (!inCompanionApp()) navigator.vibrate?.(VIBRATE[kind]);
}

// --- sound ---

let ctx: AudioContext | undefined;
let noise: AudioBuffer | undefined;

function audio(): AudioContext | undefined {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return undefined;
    ctx = new AC();
    noise = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.03), ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  // browsers start the context suspended until a gesture; pointerdown/keydown handlers count
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** One click: a filtered noise burst (the mechanism) plus an optional short tone (the body). */
function click(ac: AudioContext, at: number, opts: { freq: number; q: number; gain: number; decay: number; tone?: number }) {
  const src = ac.createBufferSource();
  src.buffer = noise!;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = opts.freq;
  filter.Q.value = opts.q;
  const env = ac.createGain();
  env.gain.setValueAtTime(opts.gain, at);
  env.gain.exponentialRampToValueAtTime(0.0001, at + opts.decay);
  src.connect(filter).connect(env).connect(ac.destination);
  src.start(at);
  src.stop(at + opts.decay + 0.01);
  if (opts.tone) {
    const osc = ac.createOscillator();
    osc.frequency.setValueAtTime(opts.tone, at);
    osc.frequency.exponentialRampToValueAtTime(opts.tone * 0.6, at + opts.decay);
    const g = ac.createGain();
    g.gain.setValueAtTime(opts.gain * 0.5, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + opts.decay);
    osc.connect(g).connect(ac.destination);
    osc.start(at);
    osc.stop(at + opts.decay + 0.01);
  }
}

function sound(kind: FeedbackKind) {
  const ac = audio();
  if (!ac || !noise) return;
  const t = ac.currentTime + 0.002;
  switch (kind) {
    case "tick":
      return click(ac, t, { freq: 4200, q: 1.2, gain: 0.18, decay: 0.012 });
    case "stop":
      return click(ac, t, { freq: 1500, q: 1, gain: 0.3, decay: 0.022, tone: 420 });
    case "press":
      return click(ac, t, { freq: 2600, q: 0.9, gain: 0.32, decay: 0.03, tone: 900 });
    case "confirm":
      click(ac, t, { freq: 2200, q: 0.9, gain: 0.3, decay: 0.03, tone: 700 });
      return click(ac, t + 0.07, { freq: 3200, q: 0.9, gain: 0.3, decay: 0.035, tone: 1100 });
  }
}

export function feedback(mode: FeedbackMode, kind: FeedbackKind) {
  if (mode === "off") return;
  if (kind === "tick") {
    const now = performance.now();
    if (now - lastTick < MIN_TICK_MS) return;
    lastTick = now;
  }
  if (mode === "haptic" || mode === "both") haptic(kind);
  if (mode === "sound" || mode === "both") sound(kind);
}

/**
 * Detent index for a 0..1 position: one per step when there are few steps (temperature, fan speed),
 * otherwise 24 per full travel like a typical encoder.
 */
export function detentOf(frac: number, steps: number): number {
  const n = steps > 0 && steps <= 48 ? Math.round(steps) : 24;
  return Math.round(frac * n);
}
