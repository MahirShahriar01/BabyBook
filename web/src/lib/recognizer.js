// Tiny "$1 Unistroke Recognizer" (Wobbrock et al., 2007) used by the AI Lab
// "Draw & the AI guesses" experiment. Pure JS, works offline, no model download.
const N = 64;
const SIZE = 250;
const PHI = 0.5 * (-1 + Math.sqrt(5));
const ANGLE = (45 * Math.PI) / 180;
const STEP = (2 * Math.PI) / 180;

const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const pathLength = (pts) => pts.slice(1).reduce((s, p, i) => s + dist(pts[i], p), 0);
const centroid = (pts) => ({ x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length });

function resample(points, n = N) {
  const pts = points.map((p) => ({ ...p }));
  const I = pathLength(pts) / (n - 1);
  let D = 0;
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const d = dist(pts[i - 1], pts[i]);
    if (D + d >= I && d > 0) {
      const q = { x: pts[i - 1].x + ((I - D) / d) * (pts[i].x - pts[i - 1].x), y: pts[i - 1].y + ((I - D) / d) * (pts[i].y - pts[i - 1].y) };
      out.push(q);
      pts.splice(i, 0, q);
      D = 0;
    } else D += d;
  }
  while (out.length < n) out.push(pts[pts.length - 1]);
  return out.slice(0, n);
}

function rotateBy(pts, a) {
  const c = centroid(pts);
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return pts.map((p) => ({ x: (p.x - c.x) * cos - (p.y - c.y) * sin + c.x, y: (p.x - c.x) * sin + (p.y - c.y) * cos + c.y }));
}

function normalize(points) {
  let pts = resample(points);
  const c = centroid(pts);
  pts = rotateBy(pts, -Math.atan2(c.y - pts[0].y, c.x - pts[0].x));
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const w = Math.max(...xs) - Math.min(...xs) || 1;
  const h = Math.max(...ys) - Math.min(...ys) || 1;
  pts = pts.map((p) => ({ x: (p.x * SIZE) / w, y: (p.y * SIZE) / h }));
  const c2 = centroid(pts);
  return pts.map((p) => ({ x: p.x - c2.x, y: p.y - c2.y }));
}

const pathDistance = (a, b) => a.reduce((s, p, i) => s + dist(p, b[i]), 0) / a.length;

function distanceAtBestAngle(pts, tpl) {
  let a = -ANGLE;
  let b = ANGLE;
  let x1 = PHI * a + (1 - PHI) * b;
  let f1 = pathDistance(rotateBy(pts, x1), tpl);
  let x2 = (1 - PHI) * a + PHI * b;
  let f2 = pathDistance(rotateBy(pts, x2), tpl);
  while (Math.abs(b - a) > STEP) {
    if (f1 < f2) {
      b = x2;
      x2 = x1;
      f2 = f1;
      x1 = PHI * a + (1 - PHI) * b;
      f1 = pathDistance(rotateBy(pts, x1), tpl);
    } else {
      a = x1;
      x1 = x2;
      f1 = f2;
      x2 = (1 - PHI) * a + PHI * b;
      f2 = pathDistance(rotateBy(pts, x2), tpl);
    }
  }
  return Math.min(f1, f2);
}

// ---- templates (generated, several start points / directions each)
const poly = (corners, steps = 16) => {
  const out = [];
  for (let i = 0; i < corners.length - 1; i++)
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      out.push({ x: corners[i].x + (corners[i + 1].x - corners[i].x) * t, y: corners[i].y + (corners[i + 1].y - corners[i].y) * t });
    }
  out.push(corners[corners.length - 1]);
  return out;
};
const circle = (start, dir) => Array.from({ length: 65 }, (_, i) => ({ x: Math.cos(start + (dir * i * 2 * Math.PI) / 64) * 100, y: Math.sin(start + (dir * i * 2 * Math.PI) / 64) * 100 }));
const rotateList = (arr, k) => [...arr.slice(k), ...arr.slice(0, k)];
const closed = (c) => [...c, c[0]];

const TRI = [{ x: 0, y: -100 }, { x: 100, y: 80 }, { x: -100, y: 80 }];
const SQ = [{ x: -100, y: -100 }, { x: 100, y: -100 }, { x: 100, y: 100 }, { x: -100, y: 100 }];
const STAR = [0, 1, 2, 3, 4].map((i) => ({ x: Math.cos(-Math.PI / 2 + (i * 4 * Math.PI) / 5) * 100, y: Math.sin(-Math.PI / 2 + (i * 4 * Math.PI) / 5) * 100 }));

const RAW = [];
for (const dir of [1, -1]) for (const s of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) RAW.push(['circle', circle(s, dir)]);
for (let k = 0; k < 3; k++) {
  RAW.push(['triangle', poly(closed(rotateList(TRI, k)))]);
  RAW.push(['triangle', poly(closed(rotateList([...TRI].reverse(), k)))]);
}
for (let k = 0; k < 4; k++) {
  RAW.push(['square', poly(closed(rotateList(SQ, k)))]);
  RAW.push(['square', poly(closed(rotateList([...SQ].reverse(), k)))]);
}
for (let k = 0; k < 5; k++) RAW.push(['star', poly(closed(rotateList(STAR, k)))]);
RAW.push(['zigzag', poly([{ x: -100, y: 0 }, { x: -50, y: -60 }, { x: 0, y: 0 }, { x: 50, y: -60 }, { x: 100, y: 0 }])]);
RAW.push(['zigzag', poly([{ x: 100, y: 0 }, { x: 50, y: -60 }, { x: 0, y: 0 }, { x: -50, y: -60 }, { x: -100, y: 0 }])]);
RAW.push(['check', poly([{ x: -100, y: 0 }, { x: -40, y: 70 }, { x: 100, y: -100 }])]);
RAW.push(['heart', poly([{ x: 0, y: 100 }, { x: -100, y: 0 }, { x: -90, y: -70 }, { x: -40, y: -90 }, { x: 0, y: -50 }, { x: 40, y: -90 }, { x: 90, y: -70 }, { x: 100, y: 0 }, { x: 0, y: 100 }], 8)]);

const TEMPLATES = RAW.map(([name, pts]) => ({ name, pts: normalize(pts) }));

export const SHAPES = {
  circle: { emoji: '⚪', name: 'circle', hint: 'round with no corners' },
  triangle: { emoji: '🔺', name: 'triangle', hint: '3 corners' },
  square: { emoji: '🟥', name: 'square', hint: '4 corners' },
  star: { emoji: '⭐', name: 'star', hint: '5 points' },
  zigzag: { emoji: '⚡', name: 'zigzag', hint: 'up and down like lightning' },
  check: { emoji: '✅', name: 'tick', hint: 'a check mark' },
  heart: { emoji: '❤️', name: 'heart', hint: 'love shape' },
};

/** Returns guesses sorted best-first: [{name, score 0..1}] */
export function recognize(points) {
  if (!points || points.length < 8 || pathLength(points) < 40) return [];
  const pts = normalize(points);
  const best = {};
  for (const t of TEMPLATES) {
    const d = distanceAtBestAngle(pts, t.pts);
    if (best[t.name] == null || d < best[t.name]) best[t.name] = d;
  }
  const half = 0.5 * Math.sqrt(SIZE * SIZE * 2);
  return Object.entries(best)
    .map(([name, d]) => ({ name, score: Math.max(0, 1 - d / (half * 0.45)) }))
    .sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------- tiny k-NN for "Teach the Robot"
/** k-nearest-neighbour vote over numeric feature vectors. */
export function knn(examples, features, k = 3) {
  const scored = examples
    .map((e) => ({ ...e, d: Math.sqrt(e.features.reduce((s, v, i) => s + (v - features[i]) ** 2, 0)) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, k);
  const votes = {};
  for (const e of scored) votes[e.label] = (votes[e.label] || 0) + 1 / (1 + e.d);
  const ranked = Object.entries(votes).sort((a, b) => b[1] - a[1]);
  const total = ranked.reduce((s, [, v]) => s + v, 0) || 1;
  return { label: ranked[0]?.[0], confidence: ranked[0] ? ranked[0][1] / total : 0, nearest: scored[0] };
}

/** Next-item predictor (frequency of what followed the last item) for the pattern lab. */
export function predictNext(history, options) {
  const counts = Object.fromEntries(options.map((o) => [o, 1])); // +1 smoothing
  const last = history[history.length - 1];
  for (let i = 0; i < history.length - 1; i++) if (history[i] === last) counts[history[i + 1]] = (counts[history[i + 1]] || 1) + 1;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return options.map((o) => ({ option: o, p: counts[o] / total })).sort((a, b) => b.p - a.p);
}
