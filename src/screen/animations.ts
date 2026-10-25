import { ACCENT, DIM, LIT, type DotBuffer } from "./matrix";

export interface Area {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface AnimState {
  /** Seconds; frozen while idle. */
  t: number;
  active: boolean;
  /** 0..1 — e.g. fan percentage, or 1 for a washer's spin cycle. */
  intensity: number;
  /** Footer status text, upper case (e.g. "CHARGING", "DRIVING"). */
  status: string;
  /** 0..1 from `progress_entity` (battery level for the car), if configured. */
  level?: number;
}

type Anim = (buf: DotBuffer, a: Area, s: AnimState) => void;

/** Deterministic hash → 0..1, so particles don't flicker randomly between frames. */
const rand = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const square = (a: Area) => {
  const size = Math.min(a.x1 - a.x0, a.y1 - a.y0);
  const cx = (a.x0 + a.x1) / 2;
  const cy = (a.y0 + a.y1) / 2;
  return { size, cx, cy, x0: Math.round(cx - size / 2), y0: Math.round(cy - size / 2), x1: Math.round(cx + size / 2), y1: Math.round(cy + size / 2) };
};

/** Front-loader body: frame, control strip with a little display and knob. Returns the porthole geometry. */
function loaderBody(buf: DotBuffer, a: Area, s: AnimState) {
  const q = square(a);
  buf.rect(q.x0, q.y0, q.x1, q.y1, DIM);
  const strip = q.y0 + Math.round(q.size * 0.18);
  buf.hline(q.x0, q.x1, strip, DIM);
  // mini display + knob on the control strip
  buf.fillRect(q.x0 + 3, q.y0 + 2, q.x0 + 3 + Math.round(q.size * 0.3), strip - 2, DIM);
  buf.disc(q.x1 - 5, (q.y0 + strip) / 2, 1.6, s.active ? ACCENT : LIT);
  const cy = (strip + q.y1) / 2 + 0.5;
  const r = (q.y1 - strip) / 2 - 3;
  buf.circle(q.cx, cy, r, LIT, 1.6);
  buf.circle(q.cx, cy, r - 2.5, DIM);
  return { cx: q.cx, cy, r: r - 3.5 };
}

/** Clothes tumbling in the drum: they ride up with the drum, then drop. */
function tumble(buf: DotBuffer, cx: number, cy: number, r: number, s: AnimState, count: number, speed: number) {
  for (let i = 0; i < count; i++) {
    let ang: number;
    if (!s.active) {
      ang = Math.PI / 2 + (i - (count - 1) / 2) * 0.45; // resting at the bottom
    } else {
      const spin = s.t * speed + i * ((Math.PI * 2) / count);
      ang = Math.PI / 2 + Math.sin(spin) * (s.intensity > 0.8 ? Math.PI : 1.4);
      if (s.intensity > 0.8) ang = spin; // spin cycle: pinned to the drum wall
    }
    const rr = s.intensity > 0.8 ? r - 1.5 : r - 2.5;
    buf.disc(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr, 1.8, i === 0 ? ACCENT : LIT);
  }
}

const washer: Anim = (buf, a, s) => {
  const { cx, cy, r } = loaderBody(buf, a, s);
  if (s.active && s.intensity <= 0.8) {
    // sloshing water + bubbles
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const surface = cy + r * 0.25 + Math.sin(x * 0.7 + s.t * 5) * 1.2;
      for (let y = Math.ceil(surface); y <= cy + r; y++) if (Math.hypot(x - cx, y - cy) <= r && (x + y) % 2 === 0) buf.add(x, y, DIM);
    }
    for (let i = 0; i < 4; i++) {
      const p = (s.t * 0.6 + rand(i)) % 1;
      buf.add(cx - r * 0.6 + rand(i + 9) * r * 1.2, cy + r - p * r * 1.2, LIT);
    }
  }
  tumble(buf, cx, cy, r, s, 3, s.intensity > 0.8 ? 9 : 2.2);
};

const dryer: Anim = (buf, a, s) => {
  const { cx, cy, r } = loaderBody(buf, a, s);
  tumble(buf, cx, cy, r, s, 4, 3);
  if (s.active) {
    // warm air drifting up
    for (let i = 0; i < 6; i++) {
      const p = (s.t * 0.5 + rand(i)) % 1;
      const x = cx - r * 0.7 + rand(i + 3) * r * 1.4 + Math.sin(s.t * 3 + i) * 1;
      buf.add(x, cy + r * 0.4 - p * r * 1.2, DIM);
    }
  }
};

const dishwasher: Anim = (buf, a, s) => {
  const q = square(a);
  buf.rect(q.x0, q.y0, q.x1, q.y1, DIM);
  const strip = q.y0 + Math.round(q.size * 0.14);
  buf.hline(q.x0, q.x1, strip, DIM);
  buf.disc(q.x1 - 5, (q.y0 + strip) / 2, 1.4, s.active ? ACCENT : LIT);
  buf.hline(q.x0 + 3, q.x0 + 3 + Math.round(q.size * 0.25), (q.y0 + strip) / 2, DIM);

  const inner = { x0: q.x0 + 3, x1: q.x1 - 3, y0: strip + 3, y1: q.y1 - 3 };
  const rackTop = Math.round(inner.y0 + (inner.y1 - inner.y0) * 0.38);
  const rackBot = Math.round(inner.y0 + (inner.y1 - inner.y0) * 0.78);
  buf.hline(inner.x0, inner.x1, rackTop, DIM, 2);
  buf.hline(inner.x0, inner.x1, rackBot, DIM, 2);
  // cups on the top rack, plates on the bottom rack
  for (let x = inner.x0 + 3; x < inner.x1 - 3; x += 6) buf.fillRect(x, rackTop - 4, x + 2, rackTop - 1, LIT);
  for (let x = inner.x0 + 2; x < inner.x1 - 1; x += 3) buf.vline(x, rackBot - 8, rackBot - 1, LIT);

  // spray arm under the bottom rack, seen edge-on as it rotates
  const armY = Math.round((rackBot + inner.y1) / 2) + 1;
  const half = ((inner.x1 - inner.x0) / 2 - 2) * (s.active ? Math.abs(Math.cos(s.t * 4)) : 1);
  buf.hline(q.cx - half, q.cx + half, armY, LIT);
  buf.set(q.cx, armY, ACCENT);
  if (s.active) {
    for (let i = 0; i < 14; i++) {
      const p = (s.t * 1.4 + rand(i)) % 1;
      const x = inner.x0 + rand(i + 20) * (inner.x1 - inner.x0);
      buf.add(x + Math.sin(p * 6 + i) * 0.8, armY - 1 - p * (armY - inner.y0 - 1), DIM);
    }
  }
};

const fan: Anim = (buf, a, s) => {
  const q = square(a);
  const r = q.size / 2 - 1;
  const cx = q.cx;
  const cy = q.cy;
  buf.circle(cx, cy, r, DIM);
  // grille spokes
  for (let k = 0; k < 8; k++) {
    const ang = (k * Math.PI) / 4;
    for (let d = r * 0.82; d < r; d += 1) buf.add(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, DIM);
  }
  const rot = s.active ? s.t * (2 + s.intensity * 10) : 0.4;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d < 2.6 || d > r * 0.78) continue;
      // three swept blades: angle offset grows with radius
      const ang = Math.atan2(y - cy, x - cx) - rot - d * 0.06;
      const phase = (((ang % ((Math.PI * 2) / 3)) + (Math.PI * 2) / 3) % ((Math.PI * 2) / 3)) / ((Math.PI * 2) / 3);
      if (phase < 0.32) buf.add(x, y, LIT);
    }
  }
  buf.disc(cx, cy, 2.2, s.active ? ACCENT : LIT);
};

/**
 * Model 3 side profile traced from a press photo, front to the left. x: 0..1 of car length; y: 0 = roof peak,
 * CAR_GROUND = where the tires meet the road (both in car lengths). Long low nose, windshield raked back to a roof
 * peak just behind the B-pillar, one unbroken fastback line into a short ducktail.
 */
const CAR_BODY: [number, number][] = [
  [0.014, 0.264], // front bumper, bottom
  [0.002, 0.232],
  [0.0, 0.2], // nose
  [0.014, 0.162],
  [0.06, 0.136],
  [0.12, 0.118], // hood
  [0.267, 0.1], // base of the windshield
  [0.399, 0.027],
  [0.555, 0.0], // roof peak
  [0.709, 0.012],
  [0.845, 0.047], // rear glass
  [0.94, 0.072],
  [0.988, 0.084], // ducktail
  [0.996, 0.14],
  [0.992, 0.194],
  [0.973, 0.267], // rear bumper, bottom
];
/** Side windows, front and rear of the B-pillar. */
const CAR_GLASS: [number, number][][] = [
  [
    [0.32, 0.104],
    [0.44, 0.03],
    [0.56, 0.02],
    [0.56, 0.093],
  ],
  [
    [0.6, 0.02],
    [0.73, 0.03],
    [0.84, 0.06],
    [0.79, 0.08],
    [0.6, 0.09],
  ],
];
const CAR_WHEELS = [0.171, 0.814];
const CAR_WHEEL_R = 0.071;
const CAR_GROUND = 0.304;
const BOLT: [number, number][] = [[2, 0], [3, 0], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2], [3, 2], [1, 3], [2, 3], [0, 4], [1, 4]];

const car: Anim = (buf, a, s) => {
  const driving = s.active && /DRIV/.test(s.status);
  const charging = s.active && !driving;
  const w = a.x1 - a.x0;
  // the wall charger only shows while charging; otherwise the car gets the width. 7 rows above the roof for the bolt
  const L = Math.min(charging ? w * 0.76 : w * 0.94, ((a.y1 - a.y0 - 9) / CAR_GROUND) * 0.98);
  // the car is wider than tall, so on a square screen it sits in the middle, not on the bottom edge
  const gy = Math.min(a.y1 - 1, Math.round((a.y0 + a.y1) / 2 + (CAR_GROUND * L) / 2 + 3));
  const cx0 = charging ? a.x0 + 1 : a.x0 + (w - L) / 2;
  const P = ([x, y]: [number, number]): [number, number] => [cx0 + x * L, gy - CAR_GROUND * L + y * L];

  // ground: scrolling road dashes when driving, a dotted floor when parked
  if (driving) {
    const shift = Math.floor(s.t * 24);
    for (let x = a.x0; x <= a.x1; x++) if ((x + shift) % 6 < 3) buf.set(x, gy + 1, DIM);
  } else buf.hline(a.x0, a.x1, gy + 1, DIM, 2);

  // at ~50×15 dots a clean silhouette reads better than detail: softly lit paint, dark windows either side of
  // the B-pillar, a bright outline, headlight and tail light. No dither, seams or handles.
  const body = CAR_BODY.map(P);
  buf.fillPoly(body, DIM);
  for (const glass of CAR_GLASS) buf.fillPoly(glass.map(P), 0);
  buf.poly(body, LIT);
  buf.hline(P([0.02, 0.185])[0], P([0.075, 0.185])[0], P([0.02, 0.185])[1], LIT);
  buf.hline(P([0.915, 0.115])[0], P([0.985, 0.115])[0], P([0.915, 0.115])[1], ACCENT);

  // wheels: cut the arches, then tire and hub; spokes only while driving, to show them turning
  const r = CAR_WHEEL_R * L;
  for (const wx of CAR_WHEELS) {
    const [x, y] = P([wx, CAR_GROUND - CAR_WHEEL_R]);
    buf.disc(x, y, r + 1.2, 0);
    buf.circle(x, y, r, LIT, 1.4);
    if (driving) {
      for (let k = 0; k < 3; k++) {
        const ang = s.t * 9 + (k * Math.PI * 2) / 3;
        buf.line(x, y, x + Math.cos(ang) * (r - 1.5), y + Math.sin(ang) * (r - 1.5), DIM);
      }
    }
    buf.disc(x, y, 1, DIM);
  }

  if (!charging) return;

  // wall charger
  const postX0 = Math.round(a.x1 - 6);
  const postTop = Math.round(gy - 0.25 * L);
  buf.rect(postX0, postTop, a.x1 - 1, gy, LIT);
  buf.fillRect(postX0 + 2, postTop + 2, a.x1 - 3, postTop + 4, DIM);
  buf.set(postX0 + 3, postTop + 7, ACCENT);

  // cable from the charger, sagging to the floor, into the port; pulses run toward the car
  const [px, py] = P([0.99, 0.13]);
  const qx = postX0;
  const qy = postTop + Math.round(0.14 * L);
  const ctrlX = (px + qx) / 2;
  const ctrlY = gy + 3;
  const at = (t: number): [number, number] => [
    (1 - t) ** 2 * px + 2 * (1 - t) * t * ctrlX + t ** 2 * qx,
    Math.min(gy, (1 - t) ** 2 * py + 2 * (1 - t) * t * ctrlY + t ** 2 * qy),
  ];
  for (let i = 0; i <= 40; i++) buf.add(...at(i / 40), LIT);
  for (let k = 0; k < 3; k++) {
    const t = 1 - ((s.t * 0.7 + k / 3) % 1);
    buf.set(...at(t), ACCENT);
  }
  // blinking bolt over the roof
  if (Math.floor(s.t * 2) % 2 === 0) {
    const [rx, ry] = P([0.58, 0]);
    for (const [dx, dy] of BOLT) buf.set(rx - 2 + dx, ry - 7 + dy, ACCENT);
  }
};

export const ANIMATIONS: Record<string, Anim> = { washer, dryer, dishwasher, fan, car };
export const ANIMATION_NAMES = Object.keys(ANIMATIONS);
