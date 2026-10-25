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
 * Fastback EV side profile (Model 3-ish), front to the left. x: 0..1 of car length; y: 0 = roof, 0.33 = ground.
 * Short hood, steep windshield, roof peak behind the driver, long sloping fastback, short tail.
 */
const CAR_BODY: [number, number][] = [
  [0.02, 0.27],
  [0.0, 0.215],
  [0.025, 0.17],
  [0.12, 0.15],
  [0.33, 0.13],
  [0.47, 0.035],
  [0.58, 0.0],
  [0.7, 0.015],
  [0.82, 0.065],
  [0.93, 0.12],
  [0.99, 0.135],
  [1.0, 0.2],
  [0.985, 0.27],
];
const CAR_GLASS: [number, number][] = [
  [0.37, 0.125],
  [0.48, 0.045],
  [0.58, 0.022],
  [0.69, 0.033],
  [0.8, 0.075],
  [0.88, 0.122],
];
const CAR_WHEELS = [0.195, 0.8];
const CAR_GROUND = 0.33;
const BOLT: [number, number][] = [[2, 0], [3, 0], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2], [3, 2], [1, 3], [2, 3], [0, 4], [1, 4]];

const car: Anim = (buf, a, s) => {
  const driving = s.active && /DRIV/.test(s.status);
  const charging = s.active && !driving;
  const w = a.x1 - a.x0;
  // leave room for the wall charger on the right unless we're on the road; 7 rows above the roof for the bolt
  const L = Math.min(driving ? w * 0.9 : w * 0.74, ((a.y1 - a.y0 - 9) / CAR_GROUND) * 0.98);
  // the car is wider than tall, so on a square screen it sits in the middle, not on the bottom edge
  const gy = Math.min(a.y1 - 1, Math.round((a.y0 + a.y1) / 2 + (CAR_GROUND * L) / 2 + 3));
  const cx0 = driving ? a.x0 + (w - L) / 2 : a.x0 + 2;
  const P = ([x, y]: [number, number]): [number, number] => [cx0 + x * L, gy - CAR_GROUND * L + y * L];

  // ground: scrolling road dashes when driving, a dotted floor when parked
  if (driving) {
    const shift = Math.floor(s.t * 24);
    for (let x = a.x0; x <= a.x1; x++) if ((x + shift) % 6 < 3) buf.set(x, gy + 1, DIM);
  } else buf.hline(a.x0, a.x1, gy + 1, DIM, 2);

  const body = CAR_BODY.map(P);
  buf.fillPoly(body, DIM, (x, y) => (x + y) % 2 === 0);
  buf.fillPoly(CAR_GLASS.map(P), DIM);
  buf.poly(body, LIT);
  // B-pillar, door seams, door handles
  const [bx, by] = P([0.6, 0.03]);
  buf.vline(bx, by, P([0.6, 0.125])[1], LIT);
  for (const dx of [0.47, 0.66]) {
    const [x, y0] = P([dx, 0.14]);
    buf.vline(x, y0, P([dx, 0.25])[1], DIM);
  }
  buf.set(...P([0.53, 0.155]), LIT);
  buf.set(...P([0.71, 0.155]), LIT);
  // headlight sliver, tail light (the charge port lives behind the left tail light)
  buf.hline(P([0.02, 0.17])[0], P([0.07, 0.17])[0], P([0.02, 0.17])[1], LIT);
  buf.hline(P([0.95, 0.15])[0], P([0.995, 0.15])[0], P([0.95, 0.15])[1], ACCENT);

  // battery pack along the floor: lit to the battery level
  if (s.level !== undefined) {
    const [x0, y] = P([0.3, 0.245]);
    const x1 = P([0.7, 0.245])[0];
    buf.hline(x0, x1, y, DIM);
    buf.hline(x0, x0 + (x1 - x0) * Math.max(0, Math.min(1, s.level)), y, charging ? ACCENT : LIT);
  }

  // wheels: cut the arches, then tire, rim spokes (turning when driving) and hub
  const r = 0.075 * L;
  for (const wx of CAR_WHEELS) {
    const [x, y] = P([wx, CAR_GROUND - 0.075]);
    buf.disc(x, y, r + 1.4, 0);
    buf.circle(x, y, r, LIT, 1.4);
    const rot = driving ? s.t * 9 : 0.3;
    for (let k = 0; k < 5; k++) {
      const ang = rot + (k * Math.PI * 2) / 5;
      buf.line(x, y, x + Math.cos(ang) * (r - 1.5), y + Math.sin(ang) * (r - 1.5), DIM);
    }
    buf.set(x, y, LIT);
  }

  if (driving) return;

  // wall charger
  const postX0 = Math.round(a.x1 - 6);
  const postTop = Math.round(gy - 0.27 * L);
  buf.rect(postX0, postTop, a.x1 - 1, gy, LIT);
  buf.fillRect(postX0 + 2, postTop + 2, a.x1 - 3, postTop + 4, DIM);
  buf.set(postX0 + 3, postTop + 7, charging ? ACCENT : DIM);
  if (!charging) return;

  // cable from the charger, sagging to the floor, into the port; pulses run toward the car
  const [px, py] = P([0.985, 0.155]);
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
