// Pixelkunst aus Code: Kacheln, Gegenstände, Figuren, Gebäude.
// Alles wird einmal auf kleine Leinwände gezeichnet und dann zwischengespeichert.

import { T, ITEMS, PFLANZEN, WERKZEUG_STUFEN } from './daten.js';
import { hash } from './zufall.js';

const cache = new Map();
const UMRISS = '#2b1d1c';

export function leinwand(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return [c, g];
}
function gecacht(schluessel, fn) {
  let c = cache.get(schluessel);
  if (!c) { c = fn(); cache.set(schluessel, c); }
  return c;
}

// ─── Farben ─────────────────────────────────────────────────────────────────

function rgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function hex(r, g, b) {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}
export function mische(a, b, t) {
  const A = rgb(a);
  const B = rgb(b);
  return hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
export const hell = (f, t = 0.3) => mische(f, '#fffbea', t);
export const dunkel = (f, t = 0.3) => mische(f, '#1c1226', t);

// ─── Zeichenwerkzeug ────────────────────────────────────────────────────────

function P(g, x, y, f) { g.fillStyle = f; g.fillRect(x, y, 1, 1); }
function R(g, x, y, w, h, f) { g.fillStyle = f; g.fillRect(x, y, w, h); }
function E(g, cx, cy, rx, ry, f) {
  g.fillStyle = f;
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) g.fillRect(x, y, 1, 1);
    }
  }
}
function L(g, x0, y0, x1, y1, f, d = 1) {
  g.fillStyle = f;
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / n);
    const y = Math.round(y0 + ((y1 - y0) * i) / n);
    g.fillRect(x - Math.floor((d - 1) / 2), y - Math.floor((d - 1) / 2), d, d);
  }
}
function POLY(g, pts, f) {
  g.fillStyle = f;
  const ys = pts.map((p) => p[1]);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
    const yc = y + 0.5;
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const a = Math.round(xs[i]);
      const b = Math.round(xs[i + 1]);
      if (b > a) g.fillRect(a, y, b - a, 1);
    }
  }
}
function kugel(g, cx, cy, rx, ry, f) {
  E(g, cx, cy, rx, ry, dunkel(f, 0.32));
  E(g, cx - 0.5, cy - 0.6, rx - 0.7, ry - 0.8, f);
  E(g, cx - rx * 0.38, cy - ry * 0.42, Math.max(0.8, rx * 0.3), Math.max(0.8, ry * 0.26), hell(f, 0.4));
}
/** Dunkle Kontur um alle gezeichneten Pixel — der typische Pixelkunst-Rand. */
function umriss(c, farbe = UMRISS) {
  const g = c.getContext('2d');
  const { width: w, height: h } = c;
  const bild = g.getImageData(0, 0, w, h);
  const d = bild.data;
  const [r, gg, b] = rgb(farbe);
  const voll = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 40;
  const rand = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (voll(x, y)) continue;
      if (voll(x - 1, y) || voll(x + 1, y) || voll(x, y - 1) || voll(x, y + 1)) rand.push((y * w + x) * 4);
    }
  }
  for (const i of rand) { d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 235; }
  g.putImageData(bild, 0, 0);
  return c;
}
function gespiegelt(c) {
  const [n, g] = leinwand(c.width, c.height);
  g.translate(c.width, 0);
  g.scale(-1, 1);
  g.drawImage(c, 0, 0);
  return n;
}

// Winzige Pixelschrift für Ladenschilder (3×5)
const SCHRIFT = {
  A: ['010', '101', '111', '101', '101'], C: ['011', '100', '100', '100', '011'], D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '110', '100', '111'], G: ['011', '100', '101', '101', '011'], H: ['101', '101', '111', '101', '101'],
  I: ['111', '010', '010', '010', '111'], K: ['101', '110', '100', '110', '101'], L: ['100', '100', '100', '100', '111'],
  M: ['101', '111', '111', '101', '101'], N: ['110', '101', '101', '101', '101'], O: ['010', '101', '101', '101', '010'],
  R: ['110', '101', '110', '101', '101'], S: ['011', '100', '010', '001', '110'], T: ['111', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '011'], Z: ['111', '001', '010', '100', '111'], Ä: ['101', '010', '101', '111', '101'],
  Ü: ['101', '000', '101', '101', '011'], ' ': ['000', '000', '000', '000', '000'],
};
function schrift(g, text, x, y, f) {
  for (const ch of text) {
    const z = SCHRIFT[ch] || SCHRIFT[' '];
    for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (z[j][i] === '1') P(g, x + i, y + j, f);
    x += 4;
  }
}

// ─── Gegenstände ────────────────────────────────────────────────────────────

const HOLZ = '#9a6a3a';
const HOLZ_D = '#6e4626';
const BLATT = '#4f9a3a';
const BLATT_D = '#356f2a';
const BLATT_H = '#7cc25a';

const KUNST = {
  hacke(g, b, m) {
    L(g, 3, 13, 10, 6, '#b07a48', 1); L(g, 4, 13, 11, 6, HOLZ_D, 1);
    R(g, 8, 3, 6, 2, m); R(g, 12, 5, 2, 4, m); R(g, 8, 3, 5, 1, hell(m, 0.4)); R(g, 13, 5, 1, 4, dunkel(m, 0.25));
  },
  giesskanne(g, b, m) {
    R(g, 3, 7, 8, 7, m); R(g, 3, 13, 8, 1, dunkel(m, 0.3)); R(g, 4, 8, 1, 4, hell(m, 0.45)); R(g, 3, 6, 8, 1, hell(m, 0.2));
    L(g, 10, 10, 13, 6, m, 2); R(g, 13, 4, 2, 3, dunkel(m, 0.15));
    R(g, 5, 3, 4, 1, dunkel(m, 0.3)); P(g, 4, 4, dunkel(m, 0.3)); P(g, 9, 4, dunkel(m, 0.3)); P(g, 4, 5, dunkel(m, 0.3)); P(g, 9, 5, dunkel(m, 0.3));
  },
  axt(g, b, m) {
    L(g, 4, 14, 10, 4, '#b07a48', 1); L(g, 5, 14, 11, 4, HOLZ_D, 1);
    R(g, 8, 3, 3, 4, dunkel(m, 0.15)); R(g, 11, 2, 3, 7, m); R(g, 13, 2, 1, 7, hell(m, 0.5));
  },
  spitzhacke(g, b, m) {
    R(g, 7, 5, 2, 10, '#b07a48'); R(g, 8, 5, 1, 10, HOLZ_D);
    const pts = [[1, 8], [2, 6], [4, 5], [8, 4], [12, 5], [14, 6], [15, 8]];
    for (let i = 0; i + 1 < pts.length; i++) L(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], m, 2);
    L(g, 3, 5, 12, 4, hell(m, 0.45), 1);
  },
  sense(g, b, m) {
    L(g, 3, 14, 10, 3, '#b07a48', 2);
    const pts = [[10, 2], [7, 1], [4, 2], [2, 4], [1, 7]];
    for (let i = 0; i + 1 < pts.length; i++) L(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], m, 2);
    L(g, 9, 1, 4, 1, hell(m, 0.5), 1);
  },
  angel(g) {
    L(g, 2, 14, 13, 2, '#d8c070', 1); L(g, 3, 14, 13, 3, '#a8903a', 1);
    for (const [x, y] of [[5, 11], [8, 8], [11, 5]]) P(g, x, y, '#7a6a2a');
    R(g, 2, 12, 2, 3, '#7a4a2a');
    L(g, 13, 3, 13, 9, '#e8eef4', 1); E(g, 13, 11, 1.6, 1.6, '#e04040'); P(g, 13, 10, '#ffffff');
  },
  schwert(g) {
    L(g, 6, 10, 13, 3, '#b8a890', 2); L(g, 7, 9, 13, 3, '#e0d8c8', 1);
    P(g, 10, 6, '#9a6a4a'); P(g, 8, 8, '#9a6a4a');
    L(g, 3, 9, 7, 13, '#6a4a2a', 2); L(g, 2, 14, 4, 12, '#4a3020', 2);
  },
  saat(g, b) {
    R(g, 3, 2, 10, 12, '#ead9b0'); R(g, 3, 2, 10, 2, '#cdb684'); R(g, 3, 13, 10, 1, '#cdb684');
    E(g, 8, 8.5, 3, 3, b.f); E(g, 7, 7.5, 1, 1, hell(b.f, 0.5));
    for (const [x, y] of [[5, 12], [8, 12], [11, 12]]) P(g, x, y, '#7a5a3a');
  },
  wurzel(g, b) {
    L(g, 8, 6, 5, 1, b.f2 || BLATT, 2); L(g, 8, 6, 8, 0, BLATT_D, 2); L(g, 8, 6, 11, 1, b.f2 || BLATT, 2);
    POLY(g, [[5, 5], [11, 5], [10, 10], [8, 15], [7, 15], [6, 10]], b.f);
    L(g, 10, 6, 8, 14, dunkel(b.f, 0.2), 1); L(g, 6, 6, 7, 10, hell(b.f, 0.4), 1);
    P(g, 7, 9, dunkel(b.f, 0.35)); P(g, 9, 11, dunkel(b.f, 0.35));
  },
  rundwurzel(g, b) {
    L(g, 8, 6, 5, 1, b.f2 || BLATT, 2); L(g, 8, 6, 11, 1, b.f2 || BLATT, 2); L(g, 8, 6, 8, 2, BLATT_D, 1);
    kugel(g, 8, 10, 4.5, 4.2, b.f); L(g, 8, 14, 8, 15, dunkel(b.f, 0.3), 1);
  },
  knolle(g, b) {
    kugel(g, 8, 9, 5.8, 4.6, b.f);
    for (const [x, y] of [[6, 8], [10, 10], [8, 11], [11, 7]]) P(g, x, y, dunkel(b.f, 0.35));
  },
  blumenkohl(g, b) {
    E(g, 8, 11, 7, 3.6, b.f2); E(g, 8, 11.5, 6, 2.5, dunkel(b.f2, 0.2));
    kugel(g, 5.5, 7.5, 3, 3, b.f); kugel(g, 10.5, 7.5, 3, 3, b.f); kugel(g, 8, 5, 3, 3, b.f); kugel(g, 8, 9, 3.5, 2.6, b.f);
  },
  blattkohl(g, b) {
    R(g, 7, 11, 2, 4, '#b8d098');
    E(g, 4.5, 7, 3.2, 4.5, b.f); E(g, 11.5, 7, 3.2, 4.5, b.f); E(g, 8, 5.5, 3.5, 4.8, hell(b.f, 0.15));
    L(g, 8, 2, 8, 11, dunkel(b.f, 0.35), 1);
    for (const [x, y] of [[2, 5], [13, 5], [6, 1], [10, 1], [1, 8], [14, 8]]) P(g, x, y, b.f);
  },
  pakchoi(g, b) {
    R(g, 5, 8, 2, 7, b.f2); R(g, 9, 8, 2, 7, b.f2); R(g, 7, 9, 2, 6, hell(b.f2, 0.3));
    E(g, 5, 5, 3, 4, b.f); E(g, 11, 5, 3, 4, b.f); E(g, 8, 4, 3, 4, hell(b.f, 0.15));
  },
  schote(g, b) {
    L(g, 3, 12, 12, 3, b.f, 3); L(g, 3, 11, 11, 3, hell(b.f, 0.35), 1);
    for (const [x, y] of [[5, 10], [8, 7], [10, 5]]) P(g, x, y, hell(b.f, 0.5));
    L(g, 12, 3, 14, 1, BLATT_D, 1);
  },
  peperoni(g, b) {
    L(g, 4, 13, 9, 6, b.f, 3); L(g, 9, 6, 10, 4, b.f, 2); L(g, 5, 11, 8, 7, hell(b.f, 0.4), 1);
    R(g, 10, 2, 2, 3, '#4a8a3a'); P(g, 12, 2, '#4a8a3a');
  },
  tomate(g, b) {
    kugel(g, 8, 9, 5.5, 4.8, b.f);
    R(g, 6, 5, 5, 1, '#3f8f34'); P(g, 8, 4, '#3f8f34'); P(g, 7, 6, '#3f8f34'); P(g, 9, 6, '#3f8f34'); P(g, 8, 3, '#2f6f24');
  },
  melone(g, b) {
    kugel(g, 8, 9, 6.8, 5.3, b.f);
    for (const x of [4, 7, 10, 13]) for (let y = 5; y < 14; y++) {
      if (((x + 0.5 - 8) / 6.3) ** 2 + ((y + 0.5 - 9) / 4.8) ** 2 < 1) P(g, x + ((y >> 1) & 1), y, dunkel(b.f, 0.35));
    }
    E(g, 5, 6, 1.5, 1, hell(b.f, 0.45));
  },
  kuerbis(g, b) {
    kugel(g, 4.8, 10, 3.6, 4.5, dunkel(b.f, 0.08)); kugel(g, 11.2, 10, 3.6, 4.5, dunkel(b.f, 0.08)); kugel(g, 8, 10, 3.6, 5, b.f);
    R(g, 7, 3, 2, 3, '#6a5a2a'); P(g, 9, 3, '#4a8a3a'); P(g, 10, 4, '#4a8a3a');
  },
  aubergine(g, b) {
    kugel(g, 8, 10, 4.6, 5.5, b.f);
    R(g, 5, 4, 6, 2, '#4a8a3a'); P(g, 8, 2, '#3a7a2a'); P(g, 8, 3, '#3a7a2a'); P(g, 5, 6, '#4a8a3a'); P(g, 10, 6, '#4a8a3a');
  },
  beeren(g, b) {
    for (const [x, y] of [[5, 10], [10.5, 9.5], [7.5, 6], [8, 12.5]]) kugel(g, x, y, 2.6, 2.6, b.f);
    P(g, 7, 3, BLATT); P(g, 8, 3, BLATT); P(g, 8, 2, BLATT_D);
  },
  traube(g, b) {
    L(g, 8, 1, 8, 4, HOLZ_D, 1); E(g, 10.5, 2.5, 2, 1.4, BLATT);
    for (const [x, y] of [[5, 6], [8, 6], [11, 6], [6.5, 9], [9.5, 9], [8, 12]]) kugel(g, x, y, 2, 2, b.f);
  },
  kolben(g, b) {
    POLY(g, [[3, 15], [6, 4], [8, 14]], BLATT); POLY(g, [[13, 15], [10, 4], [8, 14]], BLATT_D);
    E(g, 8, 8, 3, 6, b.f);
    for (let y = 3; y < 14; y += 2) for (let x = 6; x < 11; x += 2) P(g, x + ((y >> 1) & 1), y, dunkel(b.f, 0.2));
    E(g, 7, 6, 1, 2, hell(b.f, 0.4));
  },
  aehre(g, b) {
    L(g, 5, 15, 6, 5, '#b89048', 1); L(g, 8, 15, 8, 3, '#b89048', 1); L(g, 11, 15, 10, 5, '#b89048', 1);
    for (const [x, y] of [[6, 4], [8, 2], [10, 4]]) { E(g, x, y + 1, 1.6, 3, b.f); P(g, x - 1, y, hell(b.f, 0.4)); }
  },
  tulpe(g, b) {
    L(g, 8, 15, 8, 7, BLATT_D, 1); E(g, 5.5, 12, 1.6, 3, BLATT); E(g, 10.5, 12, 1.6, 3, BLATT);
    E(g, 8, 5, 3.3, 3.3, b.f); P(g, 5, 2, b.f); P(g, 8, 1, b.f); P(g, 11, 2, b.f); R(g, 6, 3, 1, 3, hell(b.f, 0.35));
  },
  bluete(g, b) {
    L(g, 8, 15, 8, 8, BLATT_D, 1); E(g, 10, 12, 2, 1.2, BLATT);
    for (const [x, y] of [[5, 5], [11, 5], [8, 2], [8, 8], [6, 3], [10, 3], [6, 7], [10, 7]]) E(g, x, y, 1.6, 1.6, b.f2);
    kugel(g, 8, 5, 2.2, 2.2, b.f);
  },
  lauch(g) {
    R(g, 6, 6, 4, 9, '#f0f0d8'); R(g, 6, 6, 4, 3, '#c8e0a0'); R(g, 9, 6, 1, 9, '#d8d8c0');
    L(g, 7, 6, 4, 1, BLATT, 2); L(g, 9, 6, 12, 1, BLATT_D, 2);
    for (const x of [6, 8, 9]) P(g, x, 15, '#c8b890');
  },
  nuss(g, b) {
    kugel(g, 8, 10, 4.6, 4.2, b.f); E(g, 8, 6, 4, 2.4, '#8a7a4a'); R(g, 7, 2, 2, 3, '#6a5a3a');
    for (const x of [5, 7, 9, 11]) P(g, x, 8, '#6a5a2a');
  },
  pilz(g, b) {
    E(g, 8, 9, 6.5, 5.5, b.f);
    g.clearRect(0, 9, 16, 7);
    R(g, 6, 9, 4, 6, '#f0e8d8'); R(g, 9, 9, 1, 6, '#d8ccb8');
    R(g, 2, 8, 12, 1, dunkel(b.f, 0.3));
    E(g, 6, 5.5, 2, 1.2, hell(b.f, 0.45));
  },
  pflaume(g, b) {
    kugel(g, 8, 9.5, 5, 5, b.f); E(g, 6, 7, 1.6, 2, mische(b.f, '#c8b8e8', 0.5));
    L(g, 8, 4, 9, 2, HOLZ_D, 1); E(g, 11, 2.5, 2, 1.2, BLATT);
  },
  kristall(g, b) {
    POLY(g, [[8, 1], [12, 5], [12, 11], [8, 15], [4, 11], [4, 5]], b.f);
    POLY(g, [[8, 1], [8, 15], [4, 11], [4, 5]], hell(b.f, 0.35));
    L(g, 8, 2, 8, 14, hell(b.f, 0.6), 1); P(g, 6, 5, '#ffffff');
    POLY(g, [[12, 8], [14, 10], [14, 14], [12, 15], [11, 12]], dunkel(b.f, 0.15));
  },
  edelstein(g, b) {
    POLY(g, [[4, 4], [12, 4], [15, 7], [8, 14], [1, 7]], b.f);
    R(g, 4, 4, 8, 3, hell(b.f, 0.35)); L(g, 1, 7, 15, 7, dunkel(b.f, 0.15), 1);
    L(g, 6, 7, 8, 13, hell(b.f, 0.25), 1); P(g, 5, 5, '#ffffff'); P(g, 6, 5, '#ffffff');
  },
  traene(g, b) {
    E(g, 8, 10, 4.2, 4.6, b.f); POLY(g, [[8, 1], [4.5, 8], [11.5, 8]], b.f);
    E(g, 6.5, 9, 1.2, 2, hell(b.f, 0.6)); P(g, 7, 5, '#ffffff');
  },
  stechpalme(g) {
    E(g, 5, 10, 4, 2.4, '#2a6a3a'); E(g, 11, 10, 4, 2.4, '#2f7a42');
    for (const [x, y] of [[1, 9], [3, 12], [6, 13], [9, 7], [13, 12], [15, 9]]) P(g, x, y, '#2a6a3a');
    kugel(g, 6.5, 6.5, 1.7, 1.7, '#d02030'); kugel(g, 9.5, 6, 1.7, 1.7, '#d02030'); kugel(g, 8, 8.5, 1.7, 1.7, '#d02030');
  },
  muschel(g, b) {
    E(g, 8, 11, 6.5, 6, b.f);
    g.clearRect(0, 12, 16, 4);
    for (const x of [3, 5, 8, 11, 13]) L(g, 8, 12, x, 6, dunkel(b.f, 0.18), 1);
    R(g, 5, 12, 6, 2, dunkel(b.f, 0.3));
  },
  herzmuschel(g, b) {
    kugel(g, 8, 9, 5.5, 5, b.f);
    for (const x of [5, 7, 9, 11]) L(g, x, 5, x, 13, dunkel(b.f, 0.2), 1);
    R(g, 6, 2, 4, 2, dunkel(b.f, 0.2));
  },
  koralle(g, b) {
    L(g, 8, 15, 8, 8, b.f, 2); L(g, 8, 10, 4, 5, b.f, 2); L(g, 8, 9, 12, 4, b.f, 2);
    L(g, 5, 7, 3, 2, hell(b.f, 0.2), 1); L(g, 11, 6, 13, 2, hell(b.f, 0.2), 1); L(g, 8, 8, 8, 3, b.f, 1);
  },
  seeigel(g, b) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      L(g, 8, 9, Math.round(8 + Math.cos(a) * 7), Math.round(9 + Math.sin(a) * 6), dunkel(b.f, 0.25), 1);
    }
    kugel(g, 8, 9, 4, 4, b.f);
  },
  nautilus(g, b) {
    kugel(g, 8, 8, 6.5, 6.5, b.f);
    for (let i = 0; i < 5; i++) L(g, 8, 8, 8 + Math.round(Math.cos(i * 1.1 + 0.5) * 6), 8 + Math.round(Math.sin(i * 1.1 + 0.5) * 6), b.f2, 1);
    E(g, 8.5, 8.5, 2.2, 2.2, dunkel(b.f, 0.35)); E(g, 9, 9, 1, 1, dunkel(b.f, 0.6));
  },
  holz(g) {
    R(g, 2, 6, 12, 6, '#8a5a32'); R(g, 2, 6, 11, 1, '#a8784a'); R(g, 2, 11, 12, 1, '#6a4024');
    for (const x of [4, 7, 10]) P(g, x, 8, '#6a4024');
    E(g, 13, 9, 2, 3, '#d8b07a'); E(g, 13, 9, 1, 1.6, '#b08a5a');
  },
  hartholz(g) {
    R(g, 2, 5, 12, 7, '#6a3e22'); R(g, 2, 5, 11, 1, '#8a5a32'); R(g, 2, 11, 12, 1, '#4a2814');
    for (const x of [4, 6, 9]) P(g, x, 8, '#4a2814');
    E(g, 13, 8.5, 2, 3.5, '#b88a5a'); E(g, 13, 8.5, 1, 2, '#8a6038');
  },
  stein(g) {
    kugel(g, 6, 10, 4.2, 3.6, '#9a948c'); kugel(g, 10, 9, 4.2, 4, '#aaa49a');
    P(g, 9, 10, '#7a746c'); P(g, 5, 11, '#7a746c');
  },
  faser(g) {
    L(g, 4, 14, 6, 2, '#7aa84a', 1); L(g, 7, 14, 8, 2, '#8ab85a', 1); L(g, 10, 14, 11, 3, '#6a983a', 1); L(g, 12, 14, 13, 5, '#7aa84a', 1);
    R(g, 5, 9, 8, 2, '#c8b070');
  },
  saft(g) {
    E(g, 8, 10, 4, 4.5, '#d89a3a'); POLY(g, [[8, 2], [4.5, 8], [11.5, 8]], '#d89a3a');
    E(g, 6.5, 9, 1.2, 2, '#f2c870'); E(g, 9.5, 12, 1.6, 1, '#b8782a');
  },
  kohle(g) {
    kugel(g, 6, 10, 4.2, 3.6, '#2e2e36'); kugel(g, 10, 9, 4.2, 4, '#3c3c48');
    P(g, 9, 7, '#7a8aaa'); P(g, 5, 9, '#6a7a9a');
  },
  erz(g, b) {
    kugel(g, 8, 9, 6.2, 5.2, '#8a8078');
    for (const [x, y] of [[5, 7], [9, 6], [7, 10], [11, 10], [4, 11]]) { R(g, x, y, 2, 2, b.f); P(g, x, y, hell(b.f, 0.5)); }
  },
  barren(g, b) {
    POLY(g, [[2, 12], [4.5, 6], [11.5, 6], [14, 12]], b.f);
    R(g, 5, 6, 6, 2, hell(b.f, 0.45)); R(g, 2, 11, 12, 1, dunkel(b.f, 0.3));
    L(g, 12, 7, 13, 11, dunkel(b.f, 0.18), 1); P(g, 6, 9, hell(b.f, 0.6));
  },
  schleim(g, b) {
    E(g, 8, 11, 6, 3.6, dunkel(b.f, 0.2)); E(g, 8, 9, 4.5, 4, b.f); E(g, 6.5, 7.5, 1.4, 1.2, hell(b.f, 0.5));
    P(g, 3, 13, b.f); P(g, 13, 12, b.f);
  },
  fluegel(g) {
    POLY(g, [[1, 6], [8, 4], [14, 7], [12, 10], [10, 8], [8, 11], [6, 8], [3, 10]], '#4a3a5a');
    L(g, 8, 4, 8, 11, '#2a1e3a', 1); L(g, 8, 4, 4, 9, '#6a5a7a', 1); L(g, 8, 4, 12, 9, '#6a5a7a', 1);
  },
  treibholz(g) {
    L(g, 2, 12, 13, 5, '#a8a090', 3); L(g, 3, 11, 12, 5, '#c8c0b0', 1); P(g, 7, 8, '#6a6458'); L(g, 10, 7, 12, 10, '#a8a090', 1);
  },
  seetang(g) {
    for (const [x0, f] of [[4, '#3a8a5a'], [8, '#2f7a4a'], [11, '#4a9a6a']]) {
      for (let y = 2; y < 15; y++) P(g, x0 + Math.round(Math.sin(y * 0.8 + x0) * 1.5), y, f);
      for (let y = 3; y < 14; y++) P(g, x0 + 1 + Math.round(Math.sin(y * 0.8 + x0) * 1.5), y, f);
    }
  },
  stiefel(g) {
    R(g, 4, 2, 6, 9, '#6a4a2a'); R(g, 4, 10, 9, 4, '#6a4a2a'); R(g, 4, 13, 10, 1, '#3a2a1a');
    R(g, 4, 2, 6, 1, '#8a6a4a'); P(g, 7, 6, '#3a2a1a'); P(g, 11, 11, '#3a2a1a');
  },
  glas(g, b) {
    R(g, 4, 5, 8, 9, '#dbe7ee'); R(g, 5, 7, 6, 6, b.f); R(g, 5, 7, 1, 6, hell(b.f, 0.3));
    R(g, 3, 3, 10, 2, '#c8a050'); R(g, 3, 3, 10, 1, '#e8c870'); R(g, 6, 9, 4, 3, '#f2ead6');
  },
  glas2(g, b) {
    R(g, 4, 5, 8, 9, '#dbe7ee'); R(g, 5, 7, 6, 6, mische(b.f, '#c8c050', 0.35));
    for (const [x, y] of [[6, 8], [9, 9], [7, 11]]) R(g, x, y, 2, 1, dunkel(b.f, 0.2));
    R(g, 3, 3, 10, 2, '#4a7a3a'); R(g, 3, 3, 10, 1, '#6a9a5a');
  },
  ei(g, b) {
    if (b.gross) kugel(g, 8, 9, 5, 6, b.f); else kugel(g, 8, 9.5, 4.2, 5, b.f);
  },
  brot(g) {
    E(g, 8, 10, 6.5, 4, '#b8783a'); E(g, 8, 9, 6, 3.5, '#d29a5a');
    for (const x of [5, 8, 11]) L(g, x - 1, 8, x + 1, 10, '#f2d4a0', 1);
  },
  salat(g) {
    E(g, 8, 9, 5.5, 3, '#5aa83a'); E(g, 7, 8, 3, 2, '#7cc25a'); P(g, 10, 8, '#e04a3a'); P(g, 5, 9, '#e04a3a');
    POLY(g, [[1, 10], [15, 10], [12, 14], [4, 14]], '#efe8da'); R(g, 1, 10, 14, 1, '#ffffff');
  },
  kaffee(g) {
    R(g, 4, 7, 7, 7, '#f0ece4'); R(g, 4, 13, 7, 1, '#c8c0b4'); R(g, 5, 7, 5, 1, '#5a3a2a');
    P(g, 11, 8, '#f0ece4'); P(g, 12, 9, '#f0ece4'); P(g, 12, 10, '#f0ece4'); P(g, 11, 11, '#f0ece4');
    for (const [x, y] of [[6, 4], [7, 3], [8, 5], [9, 3]]) P(g, x, y, '#c8ccd8');
  },
  suppe(g) {
    E(g, 8, 9, 5.5, 2.4, '#e09a48'); P(g, 6, 9, '#f2d080'); P(g, 9, 8, '#c86a3a'); P(g, 10, 10, '#f2d080');
    POLY(g, [[1, 9], [15, 9], [12, 14], [4, 14]], '#5a7aa8'); R(g, 1, 9, 14, 1, '#7a9ac8');
  },
  truhe(g) {
    R(g, 2, 6, 12, 8, '#9a6a3a'); R(g, 2, 3, 12, 4, '#b07a48'); R(g, 2, 3, 12, 1, '#c8925a');
    R(g, 2, 7, 12, 1, '#5a3a1a'); R(g, 3, 3, 1, 11, '#7a5028'); R(g, 12, 3, 1, 11, '#7a5028'); R(g, 7, 6, 2, 3, '#e8c050');
  },
  vogelscheuche(g) {
    L(g, 8, 15, 8, 5, HOLZ, 1); R(g, 2, 8, 12, 1, HOLZ);
    R(g, 5, 7, 6, 5, '#5a7aa8'); R(g, 5, 11, 6, 1, '#3a5a88');
    E(g, 8, 4.5, 2.6, 2.6, '#e8d08a'); P(g, 7, 4, '#2a2a2a'); P(g, 9, 4, '#2a2a2a');
    R(g, 5, 1, 6, 2, '#6a4a2a'); R(g, 4, 2, 8, 1, '#5a3a1a');
    for (const [x, y] of [[2, 9], [13, 9], [6, 12], [10, 12]]) P(g, x, y, '#e8d08a');
  },
  sprenger(g, b, m) {
    const f = b.f || '#d98a4e';
    R(g, 4, 11, 8, 3, '#7a7a80'); R(g, 6, 5, 4, 7, f); R(g, 6, 5, 1, 7, hell(f, 0.4));
    R(g, 3, 7, 3, 1, f); R(g, 10, 7, 3, 1, f); R(g, 7, 3, 2, 2, f); P(g, 2, 7, '#8ad0f0'); P(g, 13, 7, '#8ad0f0'); P(g, 7, 2, '#8ad0f0');
  },
  qsprenger(g) {
    KUNST.sprenger(g, { f: '#e4ebf2' });
    P(g, 8, 8, '#f2c94c'); P(g, 7, 9, '#f2c94c'); P(g, 3, 4, '#8ad0f0'); P(g, 12, 4, '#8ad0f0'); P(g, 3, 11, '#8ad0f0'); P(g, 12, 11, '#8ad0f0');
  },
  einmachglas(g) {
    R(g, 3, 4, 10, 11, '#9a6a3a'); R(g, 3, 6, 10, 1, '#5a3a1a'); R(g, 3, 12, 10, 1, '#5a3a1a');
    R(g, 5, 7, 6, 5, '#c0dde8'); R(g, 5, 7, 1, 5, '#e8f4f8');
    R(g, 4, 2, 8, 2, '#7a4e2a'); R(g, 4, 2, 8, 1, '#9a6a3a');
  },
  sack(g, b) {
    E(g, 8, 10.5, 5.5, 4.5, b.f); R(g, 6, 3, 4, 4, b.f); R(g, 5, 5, 6, 1, '#5a3a1a');
    E(g, 6.5, 9, 1.3, 2, hell(b.f, 0.3)); for (const [x, y] of [[8, 11], [10, 9], [6, 12]]) P(g, x, y, '#4a8a3a');
  },
  koeder(g) {
    R(g, 3, 8, 10, 6, '#9aa0a8'); R(g, 3, 8, 10, 1, '#c8ccd2'); R(g, 3, 13, 10, 1, '#6a7078');
    L(g, 4, 7, 7, 5, '#e88a9a', 1); L(g, 7, 5, 9, 7, '#e88a9a', 1); L(g, 9, 7, 12, 4, '#d87a8a', 1);
  },
  medaille(g) {
    POLY(g, [[4, 0], [7, 0], [9, 6], [7, 7]], '#c83a3a'); POLY(g, [[9, 0], [12, 0], [9, 7], [7, 6]], '#3a5ac8');
    kugel(g, 8, 10.5, 4.5, 4.5, '#f2c94c');
    for (const [x, y] of [[8, 8], [7, 10], [9, 10], [8, 11], [6, 10], [10, 10]]) P(g, x, y, '#fff3b0');
  },
  fisch(g, b) {
    const f = b.f;
    const bauch = b.f2;
    const auge = (x, y) => { P(g, x, y, '#ffffff'); P(g, x, y + 1, '#141414'); };
    switch (b.form) {
      case 'flach':
        POLY(g, [[2, 8], [8, 3], [13, 8], [8, 13]], f); POLY(g, [[2, 8], [13, 8], [8, 13]], dunkel(f, 0.12));
        POLY(g, [[12, 8], [15, 5], [15, 11]], dunkel(f, 0.25)); auge(6, 6); auge(8, 5);
        break;
      case 'aal': {
        const pts = [[2, 10], [5, 7], [8, 9], [11, 6], [14, 8]];
        for (let i = 0; i + 1 < pts.length; i++) L(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], f, 3);
        for (let i = 0; i + 1 < pts.length; i++) L(g, pts[i][0], pts[i][1] + 1, pts[i + 1][0], pts[i + 1][1] + 1, bauch, 1);
        auge(2, 8);
        break;
      }
      case 'tinte':
        E(g, 8, 5, 3.6, 4.6, f); E(g, 7, 4, 1.2, 2.2, hell(f, 0.4));
        for (const x of [5, 7, 9, 11]) L(g, x, 9, x + Math.round(Math.sin(x) * 1.5), 15, dunkel(f, 0.15), 1);
        P(g, 6, 7, '#141414'); P(g, 10, 7, '#141414');
        break;
      case 'kugel':
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          P(g, Math.round(8 + Math.cos(a) * 6.5), Math.round(8 + Math.sin(a) * 6.5), dunkel(f, 0.3));
        }
        kugel(g, 8, 8, 5.4, 5.4, f); E(g, 8, 10.5, 4, 2.4, bauch); auge(5, 6); P(g, 2, 8, f);
        break;
      default: {
        const ry = b.form === 'hoch' ? 4.4 : b.form === 'lang' ? 2.4 : b.form === 'klein' ? 2.4 : 3.3;
        const rx = b.form === 'lang' ? 6.4 : b.form === 'klein' ? 4.2 : 5.2;
        const cx = b.form === 'lang' ? 7 : 7;
        POLY(g, [[cx + rx - 1, 8], [15, 8 - ry - 0.5], [14, 8], [15, 8 + ry + 0.5]], dunkel(f, 0.2));
        POLY(g, [[cx - 2, 8 - ry + 0.5], [cx + 2, 8 - ry - 2], [cx + 3, 8 - ry + 1]], dunkel(f, 0.25));
        E(g, cx, 8, rx, ry, f); E(g, cx, 8 + ry * 0.45, rx - 1, ry * 0.55, bauch);
        L(g, cx - rx + 2, 8 - 1, cx + rx - 2, 8 - 1, hell(f, 0.25), 1);
        auge(cx - rx + 2, 7);
        if (b.form === 'wels') { L(g, cx - rx + 1, 9, 1, 12, '#3a3a30', 1); L(g, cx - rx + 1, 9, 1, 10, '#3a3a30', 1); }
      }
    }
  },
};

/** Bild eines Gegenstands (16×16). */
export function itemBild(slot, stufe = 0) {
  const it = ITEMS[slot.id];
  const von = slot.von || '';
  return gecacht(`item:${slot.id}:${von}:${stufe}`, () => {
    const [c, g] = leinwand(16, 16);
    let b = it.bild;
    if (it.kat === 'artisan' && slot.von) b = { ...b, f: ITEMS[slot.von].bild.f };
    const metall = WERKZEUG_STUFEN[stufe]?.farbe || WERKZEUG_STUFEN[0].farbe;
    (KUNST[b.art] || KUNST.stein)(g, b, metall);
    return umriss(c);
  });
}

export function itemDatenUrl(slot, stufe = 0) {
  return gecacht(`url:${slot.id}:${slot.von || ''}:${stufe}`, () => itemBild(slot, stufe).toDataURL());
}

// ─── Kacheln ────────────────────────────────────────────────────────────────

export const GRAS = {
  fruehling: { b: '#78ad4c', d: '#5e913e', h: '#93c662', blume: ['#f4f0e0', '#f2d24a', '#ec97be'] },
  sommer: { b: '#5f9c3d', d: '#4a8032', h: '#7bb352', blume: ['#f2d24a', '#f6f2e8'] },
  herbst: { b: '#a69f4a', d: '#88813b', h: '#c2b35c', blume: ['#d8742f', '#b8452f'] },
  winter: { b: '#e4ebf1', d: '#c8d4df', h: '#ffffff', blume: [] },
};
const WASSER = { teich: '#4c97a6', fluss: '#4a89c2', meer: '#3d7dbf' };
const INNEN = {
  haus: { tapete: '#d7b98c', streifen: '#c9a676', leiste: '#7a4e2c', teppich: '#a8453f', muster: '#e0b060' },
  laden: { tapete: '#b4c79a', streifen: '#a3b888', leiste: '#5d4630', teppich: '#4f7aa8', muster: '#d8e4f0' },
  gasthaus: { tapete: '#a8744a', streifen: '#946238', leiste: '#4a2c18', teppich: '#7a3a5a', muster: '#e8b860' },
};
const MINE_FARBEN = [
  { boden: '#8a6c50', d: '#735840', h: '#a3845f', wand: '#4a3628', wandH: '#6a5040', stein: '#9a8a74' },
  { boden: '#6f8296', d: '#5b6c80', h: '#8b9db0', wand: '#2f4054', wandH: '#4a5e76', stein: '#a8b8c8' },
  { boden: '#5a3a34', d: '#48302a', h: '#74504a', wand: '#2a1816', wandH: '#4a2a24', stein: '#7a6460' },
];
export const mineFarben = (band) => MINE_FARBEN[band || 0];

function grasKachel(g, x0, y0, jz, tx, ty) {
  const p = GRAS[jz];
  R(g, x0, y0, T, T, p.b);
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(hash(tx, ty, i) * 16);
    const y = Math.floor(hash(tx, ty, i + 40) * 15);
    R(g, x0 + x, y0 + y, 1, 2, p.d);
  }
  for (let i = 0; i < 4; i++) P(g, x0 + Math.floor(hash(tx, ty, i + 80) * 16), y0 + Math.floor(hash(tx, ty, i + 90) * 16), p.h);
  if (p.blume.length && hash(tx, ty, 7) < 0.06) {
    const f = p.blume[Math.floor(hash(tx, ty, 8) * p.blume.length)];
    const x = x0 + 4 + Math.floor(hash(tx, ty, 9) * 8);
    const y = y0 + 4 + Math.floor(hash(tx, ty, 10) * 8);
    P(g, x, y - 1, f); P(g, x - 1, y, f); P(g, x + 1, y, f); P(g, x, y + 1, f); P(g, x, y, '#f2d24a');
  }
}

function zackenRand(g, x0, y0, seite, f, tx, ty) {
  for (let i = 0; i < 16; i++) {
    const tief = 1 + Math.floor(hash(tx * 3 + i, ty, seite.length) * 2.2);
    if (seite === 'n') R(g, x0 + i, y0, 1, tief, f);
    if (seite === 's') R(g, x0 + i, y0 + 16 - tief, 1, tief, f);
    if (seite === 'w') R(g, x0, y0 + i, tief, 1, f);
    if (seite === 'o') R(g, x0 + 16 - tief, y0 + i, tief, 1, f);
  }
}

/** Zeichnet den ganzen Boden eines Schauplatzes auf eine Leinwand (wird gecacht). */
export function bodenBild(def, jz) {
  const [c, g] = leinwand(def.w * T, def.h * T);
  const at = (x, y) => (x < 0 || y < 0 || x >= def.w || y >= def.h ? '#' : def.grid[y][x]);
  const winter = jz === 'winter';
  const innen = INNEN[def.innen];
  const mf = mineFarben(def.band);
  const rand = def.rand || (def.innen === 'mine' ? 'mine' : 'wand');
  const gras = GRAS[jz];
  for (let ty = 0; ty < def.h; ty++) {
    for (let tx = 0; tx < def.w; tx++) {
      const b = at(tx, ty);
      const x0 = tx * T;
      const y0 = ty * T;
      const nachbarn = { n: at(tx, ty - 1), s: at(tx, ty + 1), w: at(tx - 1, ty), o: at(tx + 1, ty) };
      if (b === '.') {
        grasKachel(g, x0, y0, jz, tx, ty);
      } else if (b === ':') {
        R(g, x0, y0, T, T, winter ? '#d9d2c6' : '#b98f5d');
        for (let i = 0; i < 7; i++) P(g, x0 + Math.floor(hash(tx, ty, i) * 16), y0 + Math.floor(hash(tx, ty, i + 9) * 16), winter ? '#c4bcae' : '#a27a4b');
        for (let i = 0; i < 3; i++) P(g, x0 + Math.floor(hash(tx, ty, i + 20) * 16), y0 + Math.floor(hash(tx, ty, i + 30) * 16), winter ? '#ffffff' : '#cba673');
        for (const [s, n] of Object.entries(nachbarn)) if (n === '.') zackenRand(g, x0, y0, s, gras.b, tx, ty);
      } else if (b === '=') {
        R(g, x0, y0, T, T, '#8b857c');
        for (let r = 0; r < 2; r++) {
          for (let sp = -1; sp < 2; sp++) {
            const sx = x0 + sp * 8 + (r % 2 ? 4 : 0) + ((tx + ty) % 2 ? 0 : 0);
            const sy = y0 + r * 8;
            const f = hash(tx * 2 + sp, ty * 2 + r, 3) < 0.5 ? '#b5aea4' : '#aaa398';
            R(g, Math.max(x0, sx + 1), sy + 1, Math.min(7, x0 + 16 - Math.max(x0, sx + 1)), 6, f);
            if (sx + 1 >= x0) R(g, sx + 1, sy + 1, Math.min(6, x0 + 16 - sx - 1), 1, '#c8c2b8');
          }
        }
        if (winter) for (let i = 0; i < 6; i++) P(g, x0 + Math.floor(hash(tx, ty, i) * 16), y0 + Math.floor(hash(tx, ty, i + 5) * 16), '#ffffff');
      } else if (b === 's') {
        R(g, x0, y0, T, T, '#ead6a2');
        for (let i = 0; i < 8; i++) P(g, x0 + Math.floor(hash(tx, ty, i) * 16), y0 + Math.floor(hash(tx, ty, i + 9) * 16), '#d6c08a');
        for (let i = 0; i < 3; i++) P(g, x0 + Math.floor(hash(tx, ty, i + 20) * 16), y0 + Math.floor(hash(tx, ty, i + 30) * 16), '#f8ecc8');
        for (const [s, n] of Object.entries(nachbarn)) if (n === '.') zackenRand(g, x0, y0, s, gras.b, tx, ty);
      } else if (b === '~' || b === 'h') {
        const basis = WASSER[def.wasser] || WASSER.fluss;
        R(g, x0, y0, T, T, basis);
        for (let i = 0; i < 4; i++) {
          const x = Math.floor(hash(tx, ty, i) * 12);
          const y = Math.floor(hash(tx, ty, i + 9) * 15);
          R(g, x0 + x, y0 + y, 3, 1, mische(basis, '#ffffff', 0.18));
        }
        if (hash(tx, ty, 50) < 0.5) R(g, x0 + 2, y0 + 2, 12, 12, mische(basis, '#123050', 0.06));
        const land = (n) => n !== '~' && n !== 'h';
        if (land(nachbarn.n)) { R(g, x0, y0, T, 3, mische(basis, '#123050', 0.35)); R(g, x0, y0 + 3, T, 1, mische(basis, '#ffffff', 0.45)); }
        if (land(nachbarn.s)) R(g, x0, y0 + 15, T, 1, mische(basis, '#ffffff', 0.55));
        if (land(nachbarn.w)) R(g, x0, y0, 1, T, mische(basis, '#ffffff', 0.45));
        if (land(nachbarn.o)) R(g, x0 + 15, y0, 1, T, mische(basis, '#ffffff', 0.45));
        if (b === 'h') {
          const quer = nachbarn.n === 'h' || nachbarn.s === 'h' || nachbarn.n === 's' || nachbarn.s === 's';
          const planke = '#a87848';
          if (quer) {
            R(g, x0 + 1, y0, 14, T, planke);
            for (let i = 0; i < 4; i++) R(g, x0 + 1, y0 + i * 4 + 3, 14, 1, '#7a5230');
            R(g, x0, y0, 2, T, '#6a4426'); R(g, x0 + 14, y0, 2, T, '#6a4426');
          } else {
            R(g, x0, y0 + 1, T, 14, planke);
            for (let i = 0; i < 4; i++) R(g, x0 + i * 4 + 3, y0 + 1, 1, 14, '#7a5230');
            R(g, x0, y0, T, 2, '#6a4426'); R(g, x0, y0 + 14, T, 2, '#6a4426');
          }
          if (winter) for (let i = 0; i < 5; i++) P(g, x0 + Math.floor(hash(tx, ty, i) * 16), y0 + Math.floor(hash(tx, ty, i + 3) * 16), '#ffffff');
        }
      } else if (b === '_') {
        R(g, x0, y0, T, T, '#b8875a');
        for (let r = 0; r < 4; r++) {
          R(g, x0, y0 + r * 4 + 3, T, 1, '#8f653f');
          const fuge = Math.floor(hash(tx, ty * 4 + r, 1) * 14) + 1;
          R(g, x0 + fuge, y0 + r * 4, 1, 3, '#9a7048');
          R(g, x0, y0 + r * 4, T, 1, '#c8986a');
        }
      } else if (b === 't') {
        const t = innen || INNEN.haus;
        R(g, x0, y0, T, T, t.teppich);
        if (nachbarn.n !== 't') R(g, x0, y0 + 1, T, 1, t.muster);
        if (nachbarn.s !== 't') R(g, x0, y0 + 14, T, 1, t.muster);
        if (nachbarn.w !== 't') R(g, x0 + 1, y0, 1, T, t.muster);
        if (nachbarn.o !== 't') R(g, x0 + 14, y0, 1, T, t.muster);
        P(g, x0 + 7, y0 + 7, t.muster); P(g, x0 + 8, y0 + 8, t.muster); P(g, x0 + 7, y0 + 8, dunkel(t.teppich, 0.2)); P(g, x0 + 8, y0 + 7, dunkel(t.teppich, 0.2));
      } else if (b === 'm') {
        R(g, x0, y0, T, T, mf.boden);
        for (let i = 0; i < 7; i++) P(g, x0 + Math.floor(hash(tx, ty, i) * 16), y0 + Math.floor(hash(tx, ty, i + 9) * 16), mf.d);
        for (let i = 0; i < 3; i++) P(g, x0 + Math.floor(hash(tx, ty, i + 20) * 16), y0 + Math.floor(hash(tx, ty, i + 30) * 16), mf.h);
        if (hash(tx, ty, 77) < 0.15) L(g, x0 + 3, y0 + 10, x0 + 9, y0 + 7, mf.d, 1);
      } else if (b === 'X') {
        R(g, x0, y0, T, T, '#8e7a62');
        for (let r = 0; r < 4; r++) R(g, x0, y0 + 3 + r * 4, T, 1, '#76644e');
        for (let i = 0; i < 5; i++) P(g, x0 + Math.floor(hash(tx, ty, i) * 16), y0 + Math.floor(hash(tx, ty, i + 9) * 16), '#a8947a');
        if (nachbarn.n !== 'X' && nachbarn.n !== '#') zackenRand(g, x0, y0, 'n', gras.b, tx, ty);
        if (nachbarn.s !== 'X' && nachbarn.s !== '#') R(g, x0, y0 + 14, T, 2, '#5e4e3c');
      } else {
        // '#': Wald, Felsen, Wand oder Minenfels
        if (rand === 'wald') {
          const laub = {
            fruehling: ['#2f5f2c', '#3e7a36', '#58994a'], sommer: ['#29552a', '#35702f', '#4c8c3e'],
            herbst: ['#6a3e22', '#a0582a', '#c88038'], winter: ['#3a5048', '#4a6458', '#f2f6fa'],
          }[jz];
          R(g, x0, y0, T, T, laub[0]);
          for (let i = 0; i < 4; i++) {
            const cx = x0 + 3 + Math.floor(hash(tx, ty, i) * 10);
            const cy = y0 + 3 + Math.floor(hash(tx, ty, i + 5) * 10);
            E(g, cx, cy, 4.5, 4, laub[1]);
            E(g, cx - 1, cy - 1.5, 2, 1.5, laub[2]);
          }
          if (nachbarn.s !== '#' && nachbarn.s !== 'X') {
            R(g, x0, y0 + 12, T, 4, mische(laub[0], '#000000', 0.25));
            R(g, x0 + 3, y0 + 11, 2, 5, '#5a3a24'); R(g, x0 + 11, y0 + 12, 2, 4, '#5a3a24');
          }
        } else if (rand === 'fels') {
          R(g, x0, y0, T, T, '#86806f');
          E(g, x0 + 5, y0 + 6, 5, 4, '#9a937f'); E(g, x0 + 11, y0 + 10, 5, 4, '#918a77');
          P(g, x0 + 4, y0 + 4, '#b0a990');
          if (nachbarn.s !== '#') R(g, x0, y0 + 14, T, 2, '#5e5a4c');
        } else if (rand === 'mine') {
          const flaeche = nachbarn.s !== '#';
          R(g, x0, y0, T, T, flaeche ? mf.wandH : mf.wand);
          for (let i = 0; i < 5; i++) P(g, x0 + Math.floor(hash(tx, ty, i) * 16), y0 + Math.floor(hash(tx, ty, i + 9) * 16), dunkel(mf.wand, 0.3));
          if (flaeche) {
            for (let i = 0; i < 3; i++) R(g, x0 + Math.floor(hash(tx, ty, i + 20) * 12), y0 + 4 + i * 4, 4, 1, hell(mf.wandH, 0.15));
            R(g, x0, y0 + 15, T, 1, dunkel(mf.wand, 0.4));
          }
        } else {
          const t = innen || INNEN.haus;
          if (nachbarn.s !== '#' && ty > 0) {
            R(g, x0, y0, T, T, t.tapete);
            for (let i = 0; i < 4; i++) R(g, x0 + i * 4 + 1, y0, 1, 13, t.streifen);
            R(g, x0, y0 + 12, T, 4, t.leiste); R(g, x0, y0 + 12, T, 1, hell(t.leiste, 0.25));
            R(g, x0, y0, T, 1, dunkel(t.tapete, 0.3));
          } else {
            R(g, x0, y0, T, T, '#2e221d');
            if (hash(tx, ty, 3) < 0.4) P(g, x0 + 7, y0 + 7, '#3a2c26');
          }
        }
      }
    }
  }
  return c;
}

// ─── Objekte auf der Karte ──────────────────────────────────────────────────

const LAUB = {
  fruehling: { b: '#5fa84a', d: '#3e7a34', h: '#8ccd68', bluete: '#f4c6d8' },
  sommer: { b: '#3f8a3a', d: '#2b682b', h: '#62a84a' },
  herbst: { b: '#d07a2a', d: '#a0501e', h: '#eaa24a' },
  winter: null,
};

/** Baum 32×44; der Stamm steht unten mittig auf seinem Feld. */
export function baumBild(art, jz) {
  return gecacht(`baum:${art}:${jz}`, () => {
    const [c, g] = leinwand(32, 44);
    R(g, 13, 30, 6, 14, '#7a5232'); R(g, 17, 30, 2, 14, '#5a3a22'); R(g, 14, 30, 1, 14, '#9a6e44');
    P(g, 12, 43, '#7a5232'); P(g, 19, 43, '#7a5232');
    if (art === 'kiefer') {
      const gruen = jz === 'herbst' ? ['#2a5a3a', '#3a6e48', '#4a8458'] : ['#24603e', '#2f7a4c', '#46945e'];
      for (const [y, w] of [[30, 13], [21, 11], [12, 8]]) {
        POLY(g, [[16, y - 13], [16 - w, y + 1], [16 + w, y + 1]], gruen[0]);
        POLY(g, [[16, y - 12], [16 - w + 2, y], [16 + w - 4, y]], gruen[1]);
        L(g, 16, y - 11, 16 - w + 4, y - 1, gruen[2], 1);
        if (jz === 'winter') { L(g, 16, y - 12, 16 - w + 2, y, '#f4f8fb', 1); L(g, 16, y - 12, 16 + w - 3, y - 1, '#e4ecf2', 1); }
      }
    } else if (jz === 'winter') {
      const ast = '#6a4a30';
      L(g, 16, 30, 16, 8, ast, 2); L(g, 16, 22, 7, 12, ast, 2); L(g, 16, 18, 25, 9, ast, 2);
      L(g, 10, 15, 6, 6, ast, 1); L(g, 22, 12, 27, 5, ast, 1); L(g, 16, 12, 13, 4, ast, 1); L(g, 16, 12, 20, 3, ast, 1);
      for (const [x, y] of [[7, 11], [25, 8], [13, 4], [20, 3], [16, 8], [6, 6], [27, 5]]) { P(g, x, y - 1, '#ffffff'); P(g, x + 1, y - 1, '#f0f4f8'); }
    } else {
      const p = LAUB[jz];
      E(g, 16, 17, 14, 13, p.d); E(g, 9, 20, 7, 6, p.d); E(g, 23, 20, 7, 6, p.d);
      E(g, 16, 15, 12.5, 11, p.b); E(g, 9.5, 19, 6, 5, p.b); E(g, 22.5, 19, 6, 5, p.b);
      E(g, 12, 10, 5, 4, p.h); E(g, 21, 13, 3, 2.5, p.h);
      for (let i = 0; i < 18; i++) P(g, 4 + Math.floor(hash(i, 3, art.length) * 24), 4 + Math.floor(hash(i, 7, 2) * 22), i % 2 ? p.d : p.h);
      if (p.bluete) for (let i = 0; i < 10; i++) P(g, 5 + Math.floor(hash(i, 11, 1) * 22), 4 + Math.floor(hash(i, 13, 1) * 20), p.bluete);
    }
    return umriss(c);
  });
}

export function objektBild(o, jz, band) {
  switch (o.t) {
    case 'stumpf': return gecacht('stumpf', () => {
      const [c, g] = leinwand(16, 16);
      R(g, 4, 8, 8, 6, '#7a5232'); R(g, 10, 8, 2, 6, '#5a3a22'); E(g, 8, 8, 4, 2, '#c8a070'); E(g, 8, 8, 2, 1, '#a8804e');
      P(g, 3, 13, '#7a5232'); P(g, 12, 13, '#7a5232');
      return umriss(c);
    });
    case 'grossstumpf': return gecacht('grossstumpf', () => {
      const [c, g] = leinwand(16, 16);
      R(g, 2, 6, 12, 9, '#6a4428'); R(g, 11, 6, 3, 9, '#4e3018'); E(g, 8, 6, 6, 2.5, '#c09464'); E(g, 8, 6, 3.5, 1.4, '#9a7046'); E(g, 8, 6, 1.2, 0.6, '#c09464');
      P(g, 1, 14, '#6a4428'); P(g, 14, 14, '#6a4428'); P(g, 5, 15, '#6a4428');
      return umriss(c);
    });
    case 'ast': return gecacht(`ast:${o.v || 0}`, () => {
      const [c, g] = leinwand(16, 16);
      if (o.v) { L(g, 3, 9, 13, 12, '#7a5232', 2); L(g, 8, 10, 7, 6, '#7a5232', 1); }
      else { L(g, 3, 12, 13, 9, '#7a5232', 2); L(g, 9, 10, 11, 6, '#7a5232', 1); P(g, 11, 5, BLATT); }
      return umriss(c);
    });
    case 'stein': return gecacht(`stein:${o.v || 0}`, () => {
      const [c, g] = leinwand(16, 16);
      const f = ['#9a948c', '#a39a8a', '#8f8a84'][o.v || 0];
      kugel(g, 8, 10, 5.5, 4.2, f); P(g, 10, 11, dunkel(f, 0.3)); P(g, 6, 12, dunkel(f, 0.3));
      return umriss(c);
    });
    case 'fels': return gecacht('fels', () => {
      const [c, g] = leinwand(16, 16);
      kugel(g, 8, 9, 7.4, 6.6, '#8a847a'); L(g, 6, 5, 8, 9, '#6a645a', 1); L(g, 8, 9, 11, 10, '#6a645a', 1);
      return umriss(c);
    });
    case 'unkraut': return gecacht(`unkraut:${o.v || 0}:${jz}`, () => {
      const [c, g] = leinwand(16, 16);
      const f = { fruehling: ['#4f9a3a', '#7cc25a'], sommer: ['#3f8a32', '#62a84a'], herbst: ['#9a7a2a', '#c09a3a'], winter: ['#8a7a5a', '#c8c0b0'] }[jz];
      const v = o.v || 0;
      L(g, 8, 14, 3 + v, 6, f[0], 2); L(g, 8, 14, 6, 3, f[1], 2); L(g, 8, 14, 11 - v, 4, f[0], 2); L(g, 8, 14, 13, 8 + v, f[1], 2);
      if (v === 2 && jz !== 'winter') { P(g, 6, 2, '#f2f0e0'); P(g, 13, 7, '#f2f0e0'); }
      return umriss(c);
    });
    case 'mstein': return gecacht(`mstein:${o.art}:${band}:${o.v || 0}`, () => {
      const [c, g] = leinwand(16, 16);
      const f = mineFarben(band).stein;
      kugel(g, 8, 10, 6.6, 5.3, mische(f, '#000000', (o.v || 0) * 0.05));
      const flecken = { kupfer: '#d98a4e', eisen: '#e8eef4', gold: '#f2c94c', edel: '#c07af0', kohle: '#1e1e24' }[o.art];
      if (flecken) for (const [x, y] of [[5, 8], [9, 7], [7, 11], [11, 10]]) { R(g, x, y, 2, 2, flecken); P(g, x, y, hell(flecken, 0.5)); }
      else { P(g, 7, 10, dunkel(f, 0.3)); P(g, 10, 12, dunkel(f, 0.3)); }
      return umriss(c);
    });
    case 'leiter': return gecacht('leiter', () => {
      const [c, g] = leinwand(16, 16);
      E(g, 8, 10, 6.5, 4.5, '#120c0a'); R(g, 5, 2, 1, 10, '#a8763e'); R(g, 10, 2, 1, 10, '#a8763e');
      for (const y of [3, 6, 9]) R(g, 5, y, 6, 1, '#c8925a');
      return c;
    });
    case 'schatz': return gecacht('schatz', () => {
      const [c, g] = leinwand(16, 16);
      KUNST.truhe(g);
      R(g, 2, 7, 12, 1, '#f2c94c'); R(g, 3, 3, 1, 11, '#f2c94c'); R(g, 12, 3, 1, 11, '#f2c94c');
      return umriss(c);
    });
    case 'sammel': return itemBild({ id: o.id });
    case 'einmachglas': return gecacht(`glas:${o.inhalt ? (o.fertig ? 'fertig' : 'arbeit') : 'leer'}`, () => {
      const [c, g] = leinwand(16, 20);
      g.translate(0, 4);
      KUNST.einmachglas(g);
      if (o.inhalt && !o.fertig) { P(g, 7, 9, '#ffffff'); P(g, 9, 8, '#ffffff'); }
      g.setTransform(1, 0, 0, 1, 0, 0);
      if (o.fertig) { R(g, 5, 0, 6, 5, '#e8c870'); R(g, 6, 1, 4, 3, '#c2283f'); }
      return umriss(c);
    });
    default:
      return itemBild({ id: o.t });
  }
}

// ─── Pflanzen ───────────────────────────────────────────────────────────────

/** Pflanze in einer Wachstumsphase (0–3 wachsend, 4 reif). 16×24, Fuß unten. */
export function pflanzeBild(id, phase, tot) {
  return gecacht(`pfl:${id}:${phase}:${tot ? 1 : 0}`, () => {
    const [c, g] = leinwand(16, 24);
    const p = PFLANZEN[id];
    const f = ITEMS[p.ernte].bild.f;
    const fuss = 21;
    if (tot) {
      L(g, 8, fuss, 5, fuss - 6, '#8a6a3a', 1); L(g, 8, fuss, 11, fuss - 5, '#7a5a2a', 1); L(g, 8, fuss, 8, fuss - 8, '#9a7a4a', 1);
      P(g, 4, fuss - 6, '#6a4a2a'); P(g, 12, fuss - 5, '#6a4a2a');
      return umriss(c);
    }
    if (phase === 0) {
      P(g, 6, fuss - 1, '#5a3a20'); P(g, 9, fuss, '#5a3a20'); P(g, 8, fuss - 2, BLATT_H);
      return c;
    }
    if (phase === 1) {
      L(g, 8, fuss, 8, fuss - 3, BLATT_D, 1); E(g, 6, fuss - 4, 2, 1.2, BLATT); E(g, 10, fuss - 4, 2, 1.2, BLATT_H);
      return umriss(c);
    }
    const gross = phase >= 3;
    switch (p.wuchs) {
      case 'wurzel':
      case 'knolle':
      case 'kohl': {
        const h = gross ? 7 : 5;
        for (const [dx, f2] of [[-4, BLATT], [4, BLATT], [-2, BLATT_H], [2, BLATT_D], [0, BLATT_H]]) L(g, 8, fuss, 8 + dx, fuss - h - Math.abs(dx % 3), f2, 2);
        if (phase === 4) {
          if (p.wuchs === 'wurzel') { E(g, 8, fuss - 1, 3, 2, f); P(g, 7, fuss - 2, hell(f, 0.4)); }
          else if (p.wuchs === 'knolle') { for (const [x, y] of [[5, fuss - 9], [10, fuss - 8], [8, fuss - 10]]) { P(g, x, y, '#f4f0f8'); P(g, x + 1, y, '#c8a8e8'); } }
          else if (id === 'gruenkohl') { E(g, 8, fuss - 5, 5, 4.5, f); E(g, 7, fuss - 7, 2.5, 2, hell(f, 0.2)); }
          else { kugel(g, 8, fuss - 5, 4.5, 3.6, f); }
        }
        break;
      }
      case 'rank': {
        R(g, 7, fuss - 18, 2, 18, '#a8784a');
        const h = gross ? 17 : 11;
        for (let y = 0; y < h; y += 3) { E(g, 6, fuss - y - 2, 2.2, 1.4, BLATT); E(g, 10, fuss - y - 3, 2.2, 1.4, BLATT_D); }
        if (phase === 4) for (const [x, y] of [[5, fuss - 8], [11, fuss - 11], [6, fuss - 14], [10, fuss - 5]]) {
          if (id === 'bohne') L(g, x, y, x, y + 4, f, 2); else kugel(g, x, y, 1.8, 1.8, f);
        }
        break;
      }
      case 'busch': {
        const r = gross ? 6 : 4;
        E(g, 8, fuss - r, r + 0.5, r, BLATT_D); E(g, 7.5, fuss - r - 1, r - 0.5, r - 1, BLATT); E(g, 6, fuss - r - 2.5, 1.8, 1.2, BLATT_H);
        if (phase === 4) {
          const pos = [[5, fuss - 9], [10, fuss - 10], [8, fuss - 6], [11, fuss - 5], [4, fuss - 5]];
          for (const [x, y] of pos) {
            if (id === 'peperoni') L(g, x, y, x, y + 3, f, 2);
            else if (id === 'aubergine') kugel(g, x, y + 1, 1.8, 2.6, f);
            else kugel(g, x, y, 1.5, 1.5, f);
          }
        }
        break;
      }
      case 'gross': {
        L(g, 2, fuss - 1, 14, fuss - 2, BLATT_D, 1);
        for (const x of [3, 8, 13]) E(g, x, fuss - 3, 2.6, 2, x === 8 ? BLATT_H : BLATT);
        if (phase === 4) {
          if (id === 'melone') { kugel(g, 8, fuss - 4, 6, 4.6, f); for (const x of [5, 8, 11]) L(g, x, fuss - 8, x, fuss - 1, dunkel(f, 0.35), 1); }
          else { kugel(g, 5.5, fuss - 4, 3.5, 4, dunkel(f, 0.08)); kugel(g, 10.5, fuss - 4, 3.5, 4, dunkel(f, 0.08)); kugel(g, 8, fuss - 4, 3.6, 4.4, f); R(g, 7, fuss - 10, 2, 2, '#6a5a2a'); }
        } else if (gross) E(g, 8, fuss - 5, 3, 3, BLATT);
        break;
      }
      case 'hoch': {
        const h = gross ? 20 : 12;
        R(g, 7, fuss - h, 2, h, '#6a9a3a');
        for (let y = 3; y < h; y += 4) { L(g, 8, fuss - y, 3, fuss - y - 3, BLATT, 1); L(g, 8, fuss - y - 1, 13, fuss - y - 4, BLATT_D, 1); }
        if (phase === 4) {
          E(g, 10.5, fuss - 10, 1.8, 3.5, f); E(g, 5.5, fuss - 14, 1.8, 3.5, f);
          L(g, 10, fuss - 13, 12, fuss - 14, BLATT, 1); P(g, 8, fuss - h - 1, '#e8d88a'); P(g, 7, fuss - h - 2, '#e8d88a'); P(g, 9, fuss - h - 2, '#e8d88a');
        }
        break;
      }
      case 'aehre': {
        const h = gross ? 14 : 9;
        const farbe = phase === 4 ? '#d4b048' : BLATT;
        for (const x of [4, 6, 8, 10, 12]) L(g, 8, fuss, x, fuss - h + Math.abs(x - 8) / 2, farbe, 1);
        if (phase === 4) for (const x of [4, 6, 8, 10, 12]) E(g, x, fuss - h + Math.abs(x - 8) / 2 - 1, 1.2, 2.4, '#e8c860');
        break;
      }
      case 'blume': {
        const h = gross ? 10 : 6;
        L(g, 8, fuss, 8, fuss - h, BLATT_D, 1); E(g, 6, fuss - 3, 1.6, 3, BLATT); E(g, 10, fuss - 4, 1.6, 3, BLATT_H);
        if (phase === 4) { E(g, 8, fuss - h - 2, 3, 3, f); P(g, 5, fuss - h - 4, f); P(g, 8, fuss - h - 5, f); P(g, 11, fuss - h - 4, f); P(g, 7, fuss - h - 3, hell(f, 0.4)); }
        else if (gross) E(g, 8, fuss - h - 1, 1.5, 2, BLATT_H);
        break;
      }
      default:
        E(g, 8, fuss - 4, 4, 4, BLATT);
    }
    return umriss(c);
  });
}

// ─── Deko ───────────────────────────────────────────────────────────────────

/** Deko-Bilder; `nacht` schaltet Lampen und Fenster ein. Breite/Höhe in Pixeln. */
export function dekoBild(d, jz, nacht, extra = {}) {
  if (d.typ === 'baum') return baumBild(hash(d.x, d.y, 1) < 0.3 ? 'kiefer' : 'eiche', jz);
  const w = (d.w || 1) * T;
  const key = `deko:${d.typ}:${d.w || 1}:${jz}:${nacht ? 1 : 0}:${extra.flagge ? 1 : 0}:${extra.innen || ''}`;
  return gecacht(key, () => {
    let [c, g] = leinwand(w, T);
    const neu = (ww, hh) => { [c, g] = leinwand(ww, hh); };
    switch (d.typ) {
      case 'busch': {
        neu(16, 18);
        if (jz === 'winter') { E(g, 8, 11, 7, 6, '#3a5a48'); E(g, 8, 8, 6, 3, '#f2f6fa'); }
        else {
          const p = LAUB[jz];
          E(g, 8, 11, 7.4, 6.4, p.d); E(g, 7.5, 10, 6.4, 5.4, p.b); E(g, 5.5, 8, 2.4, 1.8, p.h);
          if (jz === 'sommer') for (const [x, y] of [[4, 11], [10, 9], [8, 13], [12, 12]]) P(g, x, y, '#d8302a');
          if (jz === 'fruehling') for (const [x, y] of [[4, 9], [11, 8], [9, 13]]) P(g, x, y, '#f4f0e0');
        }
        break;
      }
      case 'laterne': {
        neu(16, 32);
        R(g, 7, 10, 2, 22, '#2e2e36'); R(g, 5, 30, 6, 2, '#2e2e36');
        R(g, 4, 3, 8, 8, '#2e2e36'); R(g, 5, 4, 6, 6, nacht ? '#ffe28a' : '#d8e4ea'); R(g, 3, 2, 10, 1, '#2e2e36'); P(g, 8, 1, '#2e2e36');
        if (jz === 'winter') R(g, 3, 1, 10, 1, '#ffffff');
        break;
      }
      case 'brunnen': {
        neu(32, 32);
        E(g, 16, 22, 15, 9, '#8f8981'); E(g, 16, 21, 14, 8, '#b5aea4'); E(g, 16, 21, 11.5, 6, '#4a8ac2'); E(g, 13, 19, 4, 1.6, '#7ab4e0');
        R(g, 14, 6, 4, 14, '#a8a29a'); R(g, 14, 6, 1, 14, '#c8c2b8'); E(g, 16, 7, 5.5, 2.2, '#b5aea4'); E(g, 16, 6.5, 4, 1.2, '#4a8ac2');
        P(g, 16, 3, '#9ad0f0'); P(g, 15, 4, '#9ad0f0'); P(g, 17, 4, '#9ad0f0');
        if (jz === 'winter') { E(g, 16, 21, 11.5, 6, '#c8e4f2'); R(g, 11, 14, 10, 1, '#ffffff'); }
        break;
      }
      case 'brett': {
        neu(16, 24);
        R(g, 2, 10, 2, 14, '#6a4426'); R(g, 12, 10, 2, 14, '#6a4426');
        R(g, 1, 2, 14, 12, '#8a5a32'); R(g, 1, 2, 14, 1, '#a87848'); R(g, 1, 13, 14, 1, '#5a3a1e');
        R(g, 3, 4, 4, 5, '#f2ead8'); R(g, 8, 5, 5, 4, '#e8dfc8'); R(g, 4, 10, 6, 2, '#f2ead8');
        P(g, 5, 4, '#c83a3a'); P(g, 10, 5, '#3a5ac8');
        break;
      }
      case 'bank': {
        neu(32, 16);
        R(g, 1, 2, 30, 3, '#8a5a32'); R(g, 1, 7, 30, 4, '#9a6a3a'); R(g, 1, 7, 30, 1, '#b07a48');
        R(g, 3, 11, 2, 4, '#4a3a2a'); R(g, 27, 11, 2, 4, '#4a3a2a'); R(g, 3, 4, 2, 4, '#4a3a2a'); R(g, 27, 4, 2, 4, '#4a3a2a');
        if (jz === 'winter') R(g, 1, 6, 30, 1, '#ffffff');
        break;
      }
      case 'blumen': {
        R(g, 1, 9, 14, 6, '#7a4a2a'); R(g, 1, 9, 14, 1, '#9a6a3a');
        if (jz !== 'winter') {
          const farben = { fruehling: ['#e8506a', '#f2d24a', '#f4f0f8'], sommer: ['#f2a03a', '#e8506a', '#8a5ad8'], herbst: ['#d8742f', '#b8452f', '#f2c94c'] }[jz];
          for (let i = 0; i < 5; i++) {
            const x = 3 + i * 2.5;
            L(g, x, 9, x, 6, BLATT_D, 1); E(g, x, 5, 1.4, 1.4, farben[i % 3]);
          }
        } else R(g, 2, 8, 12, 1, '#ffffff');
        break;
      }
      case 'amboss': {
        R(g, 3, 11, 10, 5, '#7a5232'); R(g, 3, 11, 10, 1, '#9a6e44');
        R(g, 2, 4, 11, 3, '#4a4a54'); POLY(g, [[13, 4], [16, 5], [13, 7]], '#4a4a54'); R(g, 5, 7, 6, 4, '#3a3a44'); R(g, 2, 4, 11, 1, '#7a7a88');
        break;
      }
      case 'stand': {
        R(g, 1, 5, 14, 10, '#9a7a4a'); R(g, 1, 5, 14, 1, '#b8945a'); R(g, 2, 6, 12, 4, '#cfe8f2');
        for (const [x, f] of [[3, '#7aa8c8'], [7, '#c86a5a'], [10, '#a89a5a']]) { R(g, x, 7, 3, 2, f); P(g, x + 3, 7, f); }
        R(g, 1, 10, 14, 1, '#6a5030');
        break;
      }
      case 'felsen': {
        kugel(g, 8, 10, 7, 5.6, '#8f8878'); P(g, 6, 8, '#b0a890'); L(g, 9, 9, 11, 12, '#6a6456', 1);
        break;
      }
      case 'schild': {
        R(g, 7, 8, 2, 8, '#6a4426'); R(g, 2, 2, 12, 7, '#a87848'); R(g, 2, 2, 12, 1, '#c8925a');
        for (const y of [4, 6]) R(g, 4, y, 8, 1, '#6a4426');
        break;
      }
      case 'versandkiste': {
        neu(32, 18);
        R(g, 1, 6, 30, 12, '#9a6a3a'); R(g, 1, 10, 30, 1, '#7a4e2a'); R(g, 1, 14, 30, 1, '#7a4e2a');
        R(g, 0, 2, 32, 5, '#b07a48'); R(g, 0, 2, 32, 1, '#c8925a');
        R(g, 1, 6, 2, 12, '#6a6a72'); R(g, 29, 6, 2, 12, '#6a6a72'); R(g, 13, 8, 6, 4, '#f2ead8'); R(g, 14, 9, 4, 1, '#c84a3a');
        if (jz === 'winter') R(g, 0, 1, 32, 2, '#ffffff');
        break;
      }
      case 'briefkasten': {
        neu(16, 24);
        R(g, 7, 12, 2, 12, '#6a4426');
        R(g, 3, 5, 10, 8, '#c84a3a'); E(g, 8, 5, 5, 2.5, '#c84a3a'); R(g, 4, 9, 8, 1, '#8a2a20'); R(g, 4, 6, 1, 6, '#e06a5a');
        if (extra.flagge) { R(g, 13, 2, 1, 6, '#3a3a3a'); R(g, 13, 2, 3, 2, '#f2c94c'); }
        if (jz === 'winter') R(g, 4, 2, 8, 1, '#ffffff');
        break;
      }
      case 'fass': {
        E(g, 8, 9, 6, 6.5, '#8a5a32'); R(g, 2, 5, 12, 1, '#4a4a52'); R(g, 2, 12, 12, 1, '#4a4a52'); E(g, 8, 3.5, 5, 1.6, '#a87848');
        L(g, 5, 4, 5, 14, '#6a4426', 1); L(g, 11, 4, 11, 14, '#6a4426', 1);
        break;
      }
      case 'kiste': {
        R(g, 2, 4, 12, 11, '#a8784a'); R(g, 2, 4, 12, 1, '#c8925a'); L(g, 3, 5, 13, 14, '#7a5230', 1); L(g, 13, 5, 3, 14, '#7a5230', 1);
        R(g, 2, 4, 1, 11, '#7a5230'); R(g, 13, 4, 1, 11, '#7a5230');
        break;
      }
      case 'strandkorb': {
        neu(16, 24);
        R(g, 2, 4, 12, 18, '#e2cfa0'); for (let y = 6; y < 22; y += 2) R(g, 2, y, 12, 1, '#c8b480');
        R(g, 2, 2, 12, 4, '#3a7ac0'); for (const x of [4, 8, 12]) R(g, x, 2, 2, 4, '#f4f0e8');
        R(g, 4, 8, 8, 8, '#2f5f9a'); R(g, 4, 14, 8, 3, '#e8e0c8'); R(g, 2, 22, 12, 2, '#a8946a');
        break;
      }
      case 'bett': {
        neu(32, 32);
        R(g, 1, 0, 30, 6, '#7a4e2c'); R(g, 1, 0, 30, 1, '#9a6a3a');
        R(g, 2, 5, 28, 26, '#8a5a32'); R(g, 3, 5, 26, 7, '#f4f0e8'); R(g, 5, 6, 9, 5, '#ffffff'); R(g, 18, 6, 9, 5, '#ffffff');
        R(g, 3, 12, 26, 18, '#4a7ac0');
        for (let y = 14; y < 30; y += 4) for (let x = 5; x < 29; x += 6) R(g, x, y, 3, 2, '#6a9ae0');
        R(g, 3, 12, 26, 1, '#7aa6e8');
        break;
      }
      case 'tv': {
        R(g, 1, 9, 14, 7, '#7a4e2c'); R(g, 1, 9, 14, 1, '#9a6a3a');
        R(g, 2, 1, 12, 9, '#3a3a40'); R(g, 3, 2, 10, 6, nacht ? '#5a7ac8' : '#7aa0c0'); P(g, 4, 3, '#c8e0f0'); R(g, 6, 0, 1, 1, '#3a3a40'); R(g, 10, 0, 1, 1, '#3a3a40');
        break;
      }
      case 'kamin': {
        neu(32, 32);
        R(g, 2, 2, 28, 30, '#8a7a6a'); for (let y = 4; y < 30; y += 4) for (let x = 2 + ((y / 4) % 2) * 3; x < 30; x += 6) R(g, x, y, 5, 3, '#9a8a78');
        R(g, 0, 0, 32, 4, '#6a5a4a'); R(g, 8, 14, 16, 18, '#1e1410');
        R(g, 10, 26, 12, 3, '#5a3a20');
        E(g, 16, 25, 5, 4, '#e86a2a'); E(g, 16, 24, 3, 3, '#f2c94c'); E(g, 16, 22, 1.4, 2, '#fff3b0');
        break;
      }
      case 'fenster': {
        R(g, 2, 2, 12, 11, '#f0e8d8'); R(g, 3, 3, 10, 9, nacht ? '#22305a' : '#9ad0f0'); R(g, 7, 3, 2, 9, '#f0e8d8'); R(g, 3, 7, 10, 1, '#f0e8d8');
        if (!nacht) { P(g, 4, 4, '#ffffff'); P(g, 10, 9, '#d8f0ff'); } else { P(g, 5, 5, '#f8f0c0'); P(g, 11, 4, '#f8f0c0'); }
        R(g, 1, 2, 2, 11, extra.innen === 'gasthaus' ? '#8a2a3a' : '#c84a3a'); R(g, 13, 2, 2, 11, extra.innen === 'gasthaus' ? '#8a2a3a' : '#c84a3a');
        break;
      }
      case 'bild': {
        R(g, 2, 2, 12, 10, '#c8a050'); R(g, 3, 3, 10, 8, '#9ad0f0'); R(g, 3, 8, 10, 3, '#5fa84a'); E(g, 6, 8, 3, 2, '#3e7a34'); E(g, 11, 5, 1.4, 1.4, '#f2d24a');
        break;
      }
      case 'herd': {
        neu(16, 24);
        R(g, 1, 8, 14, 16, '#3a3a44'); R(g, 1, 8, 14, 2, '#5a5a66'); R(g, 3, 14, 10, 7, '#2a2a32'); R(g, 4, 15, 8, 2, nacht ? '#e86a2a' : '#4a2a20');
        R(g, 3, 4, 5, 4, '#9aa0a8'); R(g, 3, 4, 5, 1, '#c8ccd2'); R(g, 10, 5, 4, 3, '#c84a3a');
        break;
      }
      case 'pflanze': {
        neu(16, 24);
        R(g, 4, 16, 8, 7, '#b8603a'); R(g, 4, 16, 8, 1, '#d8805a'); R(g, 5, 22, 6, 1, '#8a4a2a');
        E(g, 8, 11, 5, 5, BLATT_D); E(g, 6, 8, 3, 4, BLATT); E(g, 11, 9, 3, 3, BLATT_H); E(g, 8, 5, 2, 3, BLATT);
        break;
      }
      case 'tisch': {
        R(g, 1, 5, 14, 5, '#9a6a3a'); R(g, 1, 5, 14, 1, '#b8885a'); R(g, 2, 10, 2, 6, '#6a4426'); R(g, 12, 10, 2, 6, '#6a4426');
        R(g, 6, 1, 4, 4, '#5a7aa8'); P(g, 7, 0, '#e8506a'); P(g, 8, 0, '#f2d24a');
        break;
      }
      case 'theke': {
        R(g, 0, 3, w, 6, '#a8784a'); R(g, 0, 3, w, 1, '#c8986a'); R(g, 0, 9, w, 7, '#6a4426');
        for (let x = 6; x < w; x += 16) R(g, x, 10, 1, 6, '#4e3018');
        if (extra.innen === 'gasthaus') { for (const x of [10, 30, 58]) if (x < w) { R(g, x, 0, 4, 4, '#e8c870'); R(g, x, 0, 4, 1, '#ffffff'); } }
        else { R(g, 5, 0, 8, 4, '#4a4a54'); R(g, 6, 1, 6, 1, '#9ad070'); R(g, 30, 1, 6, 3, '#e8dcc0'); }
        break;
      }
      case 'regal': {
        neu(w, 24);
        R(g, 0, 0, w, 24, '#6a4426'); R(g, 1, 1, w - 2, 22, '#4e3018');
        for (const y of [7, 15, 22]) R(g, 1, y, w - 2, 1, '#8a5a32');
        for (let x = 2; x < w - 2; x += 4) {
          const f = ['#c84a3a', '#e8c870', '#5a8ac8', '#7ab04a', '#e8e0d0'][Math.floor(hash(x, d.x, 2) * 5)];
          R(g, x, 3, 3, 4, f); R(g, x, 11, 3, 4, ['#d8b07a', '#c8d8e8', '#a87848'][Math.floor(hash(x, d.y, 3) * 3)]); R(g, x, 18, 3, 4, f);
        }
        break;
      }
      case 'saatregal': {
        R(g, 0, 4, w, 12, '#8a5a32'); R(g, 0, 4, w, 1, '#a87848');
        for (let x = 2; x < w - 3; x += 5) {
          const f = ['#efe0a0', '#5fae3c', '#f4f0e0', '#e0475b', '#c99a5b'][Math.floor(hash(x, 1, 5) * 5)];
          R(g, x, 0, 4, 9, '#ead9b0'); R(g, x + 1, 3, 2, 3, f);
        }
        break;
      }
      case 'flaschen': {
        R(g, 0, 12, w, 2, '#6a4426');
        for (let x = 2; x < w - 2; x += 5) {
          const f = ['#3a7a4a', '#8a3a2a', '#c8a050', '#4a5aa8'][Math.floor(hash(x, 2, 1) * 4)];
          R(g, x, 6, 3, 6, f); R(g, x + 1, 3, 1, 3, f); P(g, x, 7, hell(f, 0.4));
        }
        break;
      }
      case 'leiter_ab': return objektBild({ t: 'leiter' });
      case 'leiter_auf': {
        neu(16, 24);
        R(g, 4, 0, 2, 22, '#a8763e'); R(g, 10, 0, 2, 22, '#a8763e');
        for (let y = 2; y < 22; y += 4) R(g, 4, y, 8, 1, '#c8925a');
        E(g, 8, 21, 5, 2, 'rgba(0,0,0,0.35)');
        break;
      }
      case 'aufzug': {
        neu(16, 32);
        R(g, 1, 0, 2, 32, '#5a5a62'); R(g, 13, 0, 2, 32, '#5a5a62'); R(g, 1, 0, 14, 2, '#5a5a62');
        E(g, 8, 4, 3, 3, '#8a8a92'); E(g, 8, 4, 1, 1, '#3a3a40'); L(g, 8, 6, 8, 16, '#3a3a40', 1);
        R(g, 2, 16, 12, 12, '#8a6a3a'); R(g, 2, 16, 12, 1, '#a8885a'); R(g, 2, 20, 12, 1, '#6a4a2a'); R(g, 4, 24, 3, 3, '#f2c94c');
        break;
      }
      case 'schwertfund': {
        neu(16, 24);
        L(g, 5, 20, 11, 4, '#b8a890', 2); L(g, 6, 19, 11, 5, '#e0d8c8', 1);
        L(g, 3, 18, 8, 21, '#6a4a2a', 2); L(g, 4, 21, 3, 23, '#4a3020', 2);
        P(g, 12, 3, '#ffffff'); P(g, 13, 2, '#ffffff'); P(g, 11, 2, '#fff3b0');
        break;
      }
      case 'wandlampe': {
        R(g, 7, 8, 2, 6, '#5a3a24'); R(g, 5, 7, 6, 2, '#4a4a52');
        E(g, 8, 5, 2.4, 3, '#f2a03a'); E(g, 8, 5.5, 1.4, 2, '#fff3b0');
        break;
      }
      default:
        R(g, 2, 2, 12, 12, '#a8784a');
    }
    if (!['kamin', 'fenster', 'bild', 'flaschen', 'wandlampe', 'leiter_auf'].includes(d.typ)) umriss(c);
    return c;
  });
}

// ─── Gebäude ────────────────────────────────────────────────────────────────

function dach(g, x0, y0, x1, yUnten, yOben, einzug, f, winter) {
  POLY(g, [[x0, yUnten], [x1, yUnten], [x1 - einzug, yOben], [x0 + einzug, yOben]], f);
  for (let y = yOben + 3; y < yUnten; y += 4) {
    const t = (y - yOben) / (yUnten - yOben);
    const a = x0 + einzug * (1 - t);
    const b = x1 - einzug * (1 - t);
    R(g, Math.round(a), y, Math.round(b - a), 1, dunkel(f, 0.25));
  }
  R(g, x0 + einzug, yOben, x1 - x0 - 2 * einzug, 2, hell(f, 0.25));
  R(g, x0, yUnten - 1, x1 - x0, 2, dunkel(f, 0.4));
  if (winter) {
    POLY(g, [[x0 + einzug - 2, yOben - 1], [x1 - einzug + 2, yOben - 1], [x1 - einzug * 0.6, yOben + (yUnten - yOben) * 0.4], [x0 + einzug * 0.6, yOben + (yUnten - yOben) * 0.4]], '#f2f6fa');
    for (let x = x0 + 4; x < x1 - 4; x += 7) R(g, x, yOben + Math.round((yUnten - yOben) * 0.4), 2, 2, '#e0eaf2');
  }
}
function fensterKasten(g, x, y, w, h, nacht, rahmen = '#f0e8d8') {
  R(g, x - 1, y - 1, w + 2, h + 2, rahmen);
  R(g, x, y, w, h, nacht ? '#ffd47a' : '#8ac0e0');
  R(g, x + Math.floor(w / 2), y, 1, h, rahmen); R(g, x, y + Math.floor(h / 2), w, 1, rahmen);
  if (!nacht) { P(g, x + 1, y + 1, '#d8f0ff'); P(g, x + 2, y + 1, '#d8f0ff'); }
}
function tuer(g, x, y, w, h, f) {
  R(g, x - 1, y - 1, w + 2, h + 1, '#4a2e18'); R(g, x, y, w, h, f); R(g, x + 1, y + 1, w - 2, h - 2, hell(f, 0.12));
  for (let yy = y + 3; yy < y + h; yy += 4) R(g, x + 1, yy, w - 2, 1, dunkel(f, 0.2));
  P(g, x + w - 3, y + Math.floor(h / 2), '#f2c94c');
}

/** Fensterpositionen (in Pixeln innerhalb des Gebäudebilds) — für Licht bei Nacht. */
export const GEBAEUDE_LICHT = {
  haus: [[21, 52], [59, 52]],
  laden: [[18, 70], [94, 70]],
  rathaus: [[18, 56], [62, 56]],
  gasthaus: [[22, 76], [90, 76], [30, 44], [82, 44]],
  muehle: [[40, 40]],
  schmiede: [[70, 54]],
  atelier: [[22, 50], [58, 50]],
  huette: [[56, 38]],
  stall: [[58, 34]],
};

export function gebaeudeBild(typ, jz, nacht, zustand = {}) {
  const key = `geb:${typ}:${jz}:${nacht ? 1 : 0}:${zustand.offen ? 1 : 0}:${zustand.repariert ? 1 : 0}`;
  return gecacht(key, () => {
    const winter = jz === 'winter';
    let c;
    let g;
    const neu = (w, h) => { [c, g] = leinwand(w, h); };
    switch (typ) {
      case 'haus': {
        neu(80, 80);
        R(g, 6, 34, 68, 46, '#d6b383'); for (let x = 10; x < 72; x += 5) R(g, x, 34, 1, 46, '#bf9a6a');
        R(g, 6, 34, 4, 46, '#7a5232'); R(g, 70, 34, 4, 46, '#7a5232'); R(g, 6, 77, 68, 3, '#8a7a6a');
        R(g, 54, 2, 9, 18, '#8a6a5a'); R(g, 53, 2, 11, 2, '#6a4a3a');
        dach(g, 0, 38, 80, 38, 8, 12, '#a8452f', winter);
        tuer(g, 33, 56, 14, 24, '#7a4a2a');
        fensterKasten(g, 15, 47, 12, 10, nacht); fensterKasten(g, 53, 47, 12, 10, nacht);
        R(g, 14, 59, 14, 3, '#7a4e2c'); R(g, 52, 59, 14, 3, '#7a4e2c');
        if (!winter) for (const x of [15, 18, 21, 24, 53, 56, 59, 62]) P(g, x + 1, 58, ['#e8506a', '#f2d24a', '#f4f0f8'][x % 3]);
        break;
      }
      case 'stall': {
        neu(80, 64);
        R(g, 6, 24, 68, 40, '#b8483a'); for (let x = 10; x < 72; x += 6) R(g, x, 24, 1, 40, '#9a3a2e');
        R(g, 6, 24, 68, 2, '#f0e8d8'); R(g, 6, 62, 68, 2, '#6a5a4a');
        dach(g, 0, 28, 80, 28, 4, 10, '#5a3a3a', winter);
        R(g, 31, 40, 18, 24, '#f0e8d8'); R(g, 33, 42, 14, 22, '#8a3a2e'); L(g, 33, 42, 46, 63, '#f0e8d8', 1); L(g, 46, 42, 33, 63, '#f0e8d8', 1);
        fensterKasten(g, 54, 30, 10, 8, nacht); fensterKasten(g, 16, 30, 10, 8, nacht);
        break;
      }
      case 'laden': {
        neu(112, 96);
        R(g, 4, 30, 104, 66, '#ecd7a2'); R(g, 4, 84, 104, 12, '#9a948a'); for (let x = 4; x < 108; x += 8) R(g, x, 84, 1, 12, '#7a746a');
        dach(g, 0, 34, 112, 34, 4, 12, '#3f7a5a', winter);
        R(g, 30, 36, 52, 12, '#6a4426'); R(g, 31, 37, 50, 10, '#8a5a32'); schrift(g, 'LADEN', 46, 40, '#f2e8c8');
        for (let x = 4; x < 108; x += 8) { R(g, x, 52, 4, 8, '#3f8a5a'); R(g, x + 4, 52, 4, 8, '#f4f0e8'); }
        for (let x = 4; x < 108; x += 4) P(g, x + 2, 60, x % 8 ? '#f4f0e8' : '#3f8a5a');
        fensterKasten(g, 12, 64, 26, 16, nacht, '#6a4426'); fensterKasten(g, 74, 64, 26, 16, nacht, '#6a4426');
        if (!nacht) { for (const [x, f] of [[16, '#e8506a'], [22, '#f2d24a'], [28, '#7cc25a'], [80, '#e5872a'], [88, '#c99a5b']]) R(g, x, 75, 4, 4, f); }
        tuer(g, 49, 66, 14, 30, '#5a8a6a');
        break;
      }
      case 'rathaus': {
        neu(80, 96);
        R(g, 4, 36, 72, 60, '#cbc3b2'); for (let y = 40; y < 92; y += 6) R(g, 4, y, 72, 1, '#b3ab9a');
        R(g, 4, 90, 72, 6, '#9a928a');
        dach(g, 0, 40, 80, 40, 6, 16, '#4a5a7a', winter);
        E(g, 40, 22, 7, 7, '#f0e8d8'); E(g, 40, 22, 5.5, 5.5, '#ffffff'); L(g, 40, 22, 40, 18, '#2a2a2a', 1); L(g, 40, 22, 43, 22, '#2a2a2a', 1);
        R(g, 23, 46, 34, 9, '#5a4a3a'); schrift(g, 'RATHAUS', 26, 48, '#f2e8c8');
        R(g, 22, 60, 4, 30, '#e8e0d0'); R(g, 54, 60, 4, 30, '#e8e0d0');
        fensterKasten(g, 10, 60, 10, 14, nacht); fensterKasten(g, 60, 60, 10, 14, nacht);
        tuer(g, 33, 70, 14, 26, '#3a4a6a');
        R(g, 62, 0, 1, 12, '#3a3a3a'); R(g, 63, 0, 8, 5, '#3a8a5a');
        break;
      }
      case 'gasthaus': {
        neu(112, 112);
        R(g, 4, 34, 104, 78, '#efe4c8');
        const balken = '#5a3a24';
        for (const x of [4, 30, 56, 82, 104]) R(g, x, 34, 4, 78, balken);
        for (const y of [34, 64, 108]) R(g, 4, y, 104, 4, balken);
        L(g, 8, 38, 30, 64, balken, 2); L(g, 82, 64, 104, 38, balken, 2);
        dach(g, 0, 38, 112, 38, 2, 14, '#8a3a2a', winter);
        R(g, 47, 42, 18, 10, balken); schrift(g, 'KRUG', 49, 45, '#f2e8c8');
        fensterKasten(g, 34, 42, 14, 12, nacht, balken); fensterKasten(g, 64, 42, 14, 12, nacht, balken);
        fensterKasten(g, 12, 72, 18, 14, nacht, balken); fensterKasten(g, 82, 72, 18, 14, nacht, balken);
        tuer(g, 49, 82, 14, 30, '#7a4a2a');
        R(g, 66, 72, 10, 1, '#3a3a3a'); R(g, 68, 73, 6, 7, '#c8a050'); R(g, 69, 75, 4, 4, '#f2e8c8'); P(g, 74, 76, '#c8a050');
        break;
      }
      case 'muehle': {
        neu(80, 96);
        R(g, 6, 50, 68, 46, '#a8a090'); for (let y = 54; y < 94; y += 6) for (let x = 6 + ((y / 6) % 2) * 5; x < 74; x += 10) R(g, x, y, 9, 5, '#b8b0a0');
        R(g, 10, 22, 60, 30, '#9a6a3a'); for (let x = 14; x < 70; x += 5) R(g, x, 22, 1, 30, '#7a4e2a');
        dach(g, 2, 26, 78, 26, 0, 14, zustand.repariert ? '#6a4a3a' : '#5a4a42', winter);
        if (!zustand.repariert) { R(g, 26, 8, 8, 5, '#2a1e18'); R(g, 50, 14, 6, 4, '#2a1e18'); }
        if (zustand.repariert) fensterKasten(g, 34, 34, 12, 10, nacht);
        else { R(g, 33, 33, 14, 12, '#3a2a20'); L(g, 33, 33, 46, 44, '#a87848', 2); L(g, 46, 33, 33, 44, '#a87848', 2); }
        tuer(g, 33, 72, 14, 24, zustand.repariert ? '#7a4a2a' : '#5a4a3a');
        if (!zustand.repariert) { R(g, 31, 78, 18, 3, '#a87848'); R(g, 31, 86, 18, 3, '#a87848'); }
        if (zustand.repariert) { R(g, 10, 0, 1, 10, '#3a3a3a'); R(g, 11, 0, 8, 5, '#e8c24a'); }
        break;
      }
      case 'schmiede': {
        neu(96, 80);
        R(g, 4, 28, 88, 52, '#6a6460'); for (let y = 32; y < 78; y += 6) for (let x = 4 + ((y / 6) % 2) * 6; x < 92; x += 12) R(g, x, y, 11, 5, '#7a746e');
        R(g, 70, 0, 12, 24, '#5a5450'); R(g, 69, 0, 14, 3, '#3a3634');
        if (!winter) { E(g, 76, 0, 3, 2, 'rgba(200,200,200,0.5)'); }
        dach(g, 0, 32, 96, 32, 8, 12, '#3a3a44', winter);
        R(g, 22, 36, 44, 9, '#3a2a20'); schrift(g, 'SCHMIEDE', 28, 38, '#f2c94c');
        R(g, 60, 48, 22, 16, '#2a1e18'); E(g, 71, 60, 8, 4, '#e86a2a'); E(g, 71, 59, 5, 2.4, '#f2c94c');
        R(g, 59, 47, 24, 2, '#4a4040');
        tuer(g, 33, 54, 14, 26, '#5a3a24');
        break;
      }
      case 'atelier': {
        neu(80, 80);
        R(g, 6, 32, 68, 48, '#5a7ab0'); for (let x = 10; x < 72; x += 6) R(g, x, 32, 1, 48, '#4e6a9c');
        R(g, 6, 76, 68, 4, '#3a4a6a');
        dach(g, 0, 36, 80, 36, 6, 12, '#e8e0d0', winter);
        R(g, 44, 10, 18, 12, '#c8dce8'); R(g, 43, 9, 20, 1, '#6a6a72'); L(g, 44, 10, 61, 21, '#a8c8d8', 1);
        fensterKasten(g, 14, 44, 16, 12, nacht); fensterKasten(g, 52, 44, 12, 12, nacht);
        tuer(g, 33, 56, 14, 24, '#e8c24a');
        for (const [x, y, f] of [[12, 66, '#e8506a'], [20, 70, '#f2d24a'], [60, 64, '#7cc25a'], [66, 70, '#e8506a']]) { R(g, x, y, 2, 2, f); P(g, x + 2, y + 1, f); }
        break;
      }
      case 'huette': {
        neu(80, 64);
        R(g, 6, 24, 68, 36, '#9a8a6a'); for (let y = 26; y < 60; y += 4) R(g, 6, y, 68, 1, '#7a6a4e');
        for (const x of [8, 28, 50, 70]) R(g, x, 58, 3, 6, '#5a4a3a');
        dach(g, 0, 28, 80, 28, 6, 8, '#5a6a7a', winter);
        tuer(g, 33, 40, 14, 22, '#3a5a7a');
        fensterKasten(g, 52, 32, 10, 8, nacht);
        for (let x = 10; x < 28; x += 3) L(g, x, 30, x + 4, 46, '#d8d0b0', 1);
        for (let y = 32; y < 46; y += 4) L(g, 10, y, 28, y, '#d8d0b0', 1);
        E(g, 64, 50, 4, 4, '#e84a3a'); E(g, 64, 50, 2, 2, '#9a8a6a'); P(g, 60, 50, '#ffffff'); P(g, 68, 50, '#ffffff');
        break;
      }
      case 'hoehle': {
        neu(48, 32);
        E(g, 24, 28, 10, 14, '#140e0c'); R(g, 14, 28, 20, 4, '#140e0c');
        R(g, 12, 8, 4, 24, '#6a4a2a'); R(g, 32, 8, 4, 24, '#6a4a2a'); R(g, 10, 6, 28, 4, '#7a5a32'); R(g, 10, 6, 28, 1, '#9a7a4a');
        if (!zustand.offen) {
          for (const [x, y, r] of [[18, 26, 5], [27, 25, 6], [22, 20, 4], [31, 28, 4], [15, 29, 3]]) kugel(g, x, y, r, r * 0.8, '#8a847a');
        }
        if (winter) R(g, 10, 5, 28, 1, '#ffffff');
        break;
      }
      default:
        neu(32, 32);
        R(g, 0, 0, 32, 32, '#a8784a');
    }
    return umriss(c);
  });
}

/** Mühlrad, 40×48, Phase 0–3. */
export function muehlradBild(phase, repariert) {
  return gecacht(`rad:${phase}:${repariert ? 1 : 0}`, () => {
    const [c, g] = leinwand(40, 48);
    E(g, 20, 24, 18, 18, '#6a4426');
    g.globalCompositeOperation = 'destination-out';
    E(g, 20, 24, 15.5, 15.5, '#000000');
    g.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 8; i++) {
      if (!repariert && [1, 4, 6].includes(i)) continue;
      const a = (i / 8) * Math.PI * 2 + (phase * Math.PI) / 16;
      L(g, 20, 24, Math.round(20 + Math.cos(a) * 16), Math.round(24 + Math.sin(a) * 16), '#8a5a32', 2);
      const px = Math.round(20 + Math.cos(a) * 18);
      const py = Math.round(24 + Math.sin(a) * 18);
      R(g, px - 2, py - 2, 4, 4, '#a87848');
    }
    E(g, 20, 24, 3, 3, '#4a4a52');
    return umriss(c);
  });
}

// ─── Figuren ────────────────────────────────────────────────────────────────

const SCHUH = '#3a2a24';

function kopfHaare(g, a, richtung) {
  const h = a.haare;
  const hd = dunkel(h, 0.25);
  const fr = a.frisur;
  if (richtung === 'oben') {
    if (fr === 'glatze') { R(g, 4, 3, 8, 8, a.haut); R(g, 4, 6, 8, 3, h); P(g, 6, 4, hell(a.haut, 0.3)); }
    else { R(g, 4, 2, 8, 9, h); R(g, 5, 1, 6, 1, h); R(g, 4, 9, 8, 2, hd); }
    if (fr === 'lang') R(g, 4, 10, 8, 4, h);
    if (fr === 'zopf') { R(g, 7, 11, 2, 6, h); P(g, 7, 13, hd); P(g, 8, 15, hd); }
    if (fr === 'dutt') E(g, 8, 1.5, 2.5, 2, h);
    if (fr === 'locken') for (const x of [3, 12]) R(g, x, 4, 1, 5, h);
    return;
  }
  if (fr === 'glatze') {
    R(g, 4, 5, 1, 4, h); R(g, 11, 5, 1, 4, h); P(g, 7, 3, hell(a.haut, 0.35));
    return;
  }
  if (richtung === 'links') {
    R(g, 5, 2, 7, 3, h); R(g, 9, 4, 3, 5, h); R(g, 5, 4, 2, 1, h); R(g, 6, 1, 5, 1, h);
    if (fr === 'lang') R(g, 9, 4, 3, 9, h);
    if (fr === 'zopf') { R(g, 11, 6, 2, 8, h); P(g, 11, 9, hd); P(g, 12, 12, hd); }
    if (fr === 'dutt') E(g, 10, 1.5, 2.5, 2, h);
    if (fr === 'locken') { P(g, 12, 3, h); P(g, 12, 6, h); P(g, 5, 1, h); }
    return;
  }
  // unten
  R(g, 4, 2, 8, 3, h); R(g, 5, 1, 6, 1, h); R(g, 4, 5, 1, 2, h); R(g, 11, 5, 1, 2, h); R(g, 5, 5, 2, 1, h); R(g, 9, 5, 2, 1, hd);
  if (fr === 'lang') { R(g, 3, 4, 2, 9, h); R(g, 11, 4, 2, 9, h); }
  if (fr === 'zopf') { R(g, 12, 6, 2, 8, h); P(g, 12, 9, hd); P(g, 13, 12, hd); }
  if (fr === 'dutt') E(g, 8, 1, 2.5, 1.8, h);
  if (fr === 'locken') { for (const x of [4, 6, 8, 10]) P(g, x + 1, 0, h); R(g, 3, 3, 1, 4, h); R(g, 12, 3, 1, 4, h); }
}

/** Figur 16×24 in einer Richtung (unten, oben, links, rechts) und Schrittphase 0–2. */
export function figurBild(a, richtung, schritt) {
  const key = `fig:${JSON.stringify(a)}:${richtung}:${schritt}`;
  return gecacht(key, () => {
    if (richtung === 'rechts') return gespiegelt(figurBild(a, 'links', schritt));
    const [c, g] = leinwand(16, 24);
    const haut = a.haut;
    const hemd = a.hemd;
    const hose = a.hose;
    const huepf = schritt === 0 ? 0 : 1;
    g.translate(0, -huepf + 1);
    if (richtung === 'links') {
      const vorn = schritt === 1 ? -1 : schritt === 2 ? 1 : 0;
      R(g, 6 + vorn, 17, 2, 4, hose); R(g, 8 - vorn, 17, 2, 4, dunkel(hose, 0.15));
      R(g, 5 + vorn, 21, 3, 2, SCHUH); R(g, 8 - vorn, 21, 3, 2, SCHUH);
      R(g, 5, 11, 6, 7, hemd); R(g, 10, 11, 1, 7, dunkel(hemd, 0.2));
      if (a.schuerze) R(g, 5, 13, 2, 6, a.schuerze);
      R(g, 5, 3, 7, 8, haut); P(g, 4, 7, haut); P(g, 4, 8, dunkel(haut, 0.12));
      P(g, 6, 7, '#2a1a1a'); P(g, 6, 6, '#2a1a1a');
      if (a.bart) R(g, 5, 9, 4, 2, a.bart);
      if (a.brille) { R(g, 5, 6, 3, 1, '#2a2a30'); P(g, 5, 7, '#2a2a30'); }
      kopfHaare(g, a, 'links');
      if (a.muetze) { R(g, 5, 1, 7, 3, a.muetze); R(g, 4, 3, 3, 1, dunkel(a.muetze, 0.2)); }
      const arm = schritt === 1 ? 1 : schritt === 2 ? -1 : 0;
      R(g, 7 + arm, 12, 2, 5, dunkel(hemd, 0.1)); R(g, 7 + arm, 17, 2, 1, haut);
      if (a.flecken) { P(g, 6, 13, '#e8506a'); P(g, 9, 15, '#3a7ac0'); }
    } else {
      const l = schritt === 1 ? -1 : 0;
      const r = schritt === 2 ? -1 : 0;
      R(g, 5, 17, 2, 4 + l, hose); R(g, 9, 17, 2, 4 + r, dunkel(hose, 0.12));
      R(g, 4, 21 + l, 3, 2, SCHUH); R(g, 9, 21 + r, 3, 2, SCHUH);
      R(g, 4, 11, 8, 7, hemd); R(g, 11, 11, 1, 7, dunkel(hemd, 0.2)); R(g, 4, 17, 8, 1, dunkel(hemd, 0.25));
      if (richtung === 'unten') { R(g, 6, 11, 4, 1, hell(hemd, 0.25)); }
      if (a.schuerze && richtung === 'unten') { R(g, 5, 13, 6, 6, a.schuerze); R(g, 5, 13, 6, 1, dunkel(a.schuerze, 0.15)); }
      const al = schritt === 2 ? 1 : schritt === 1 ? -1 : 0;
      R(g, 3, 12 + al, 1, 5, hemd); R(g, 12, 12 - al, 1, 5, dunkel(hemd, 0.15));
      P(g, 3, 17 + al, haut); P(g, 12, 17 - al, haut);
      R(g, 4, 3, 8, 8, haut);
      g.clearRect(4, 3, 1, 1); g.clearRect(11, 3, 1, 1);
      R(g, 4, 10, 8, 1, dunkel(haut, 0.12));
      if (richtung === 'unten') {
        R(g, 6, 6, 1, 2, '#2a1a1a'); R(g, 9, 6, 1, 2, '#2a1a1a');
        P(g, 5, 8, mische(haut, '#e86a6a', 0.35)); P(g, 10, 8, mische(haut, '#e86a6a', 0.35));
        R(g, 7, 9, 2, 1, dunkel(haut, 0.3));
        if (a.bart) { R(g, 5, 8, 6, 3, a.bart); R(g, 7, 9, 2, 1, dunkel(a.bart, 0.3)); }
        if (a.brille) { R(g, 5, 6, 6, 1, '#2a2a30'); P(g, 5, 7, '#2a2a30'); P(g, 7, 7, '#2a2a30'); P(g, 8, 7, '#2a2a30'); P(g, 10, 7, '#2a2a30'); }
        if (a.flecken) { P(g, 5, 13, '#e8506a'); P(g, 10, 15, '#3a7ac0'); P(g, 7, 16, '#f2d24a'); }
      }
      kopfHaare(g, a, richtung);
      if (a.muetze) { R(g, 4, 1, 8, 3, a.muetze); R(g, 4, 3, 8, 1, dunkel(a.muetze, 0.2)); P(g, 8, 0, '#f4f0e8'); }
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    return umriss(c);
  });
}

/** Porträt 32×32 für Gespräche. */
export function portraetBild(a) {
  return gecacht(`portraet:${JSON.stringify(a)}`, () => {
    const [c, g] = leinwand(32, 32);
    const haut = a.haut;
    R(g, 4, 26, 24, 6, a.hemd); R(g, 4, 26, 24, 1, hell(a.hemd, 0.2));
    if (a.schuerze) R(g, 9, 27, 14, 5, a.schuerze);
    if (a.flecken) { P(g, 7, 28, '#e8506a'); P(g, 22, 29, '#3a7ac0'); P(g, 16, 30, '#f2d24a'); }
    R(g, 13, 22, 6, 5, dunkel(haut, 0.15));
    const fr = a.frisur;
    if (fr === 'lang') { R(g, 5, 9, 22, 18, a.haare); }
    if (fr === 'zopf') { R(g, 23, 12, 4, 16, a.haare); for (const y of [16, 20, 24]) R(g, 23, y, 4, 1, dunkel(a.haare, 0.25)); }
    E(g, 16, 15, 9, 10, haut);
    E(g, 16, 22, 6, 3, dunkel(haut, 0.06));
    // Haare
    if (fr === 'glatze') { R(g, 7, 12, 2, 6, a.haare); R(g, 23, 12, 2, 6, a.haare); P(g, 13, 7, hell(haut, 0.4)); P(g, 14, 7, hell(haut, 0.4)); }
    else {
      E(g, 16, 9, 10, 6, a.haare); R(g, 6, 9, 3, 8, a.haare); R(g, 23, 9, 3, 8, a.haare);
      R(g, 9, 11, 14, 2, a.haare); P(g, 12, 13, a.haare); P(g, 19, 13, a.haare);
      E(g, 12, 6, 3, 1.4, hell(a.haare, 0.25));
      if (fr === 'locken') for (const [x, y] of [[6, 6], [10, 3], [16, 2], [22, 3], [26, 6], [6, 12], [26, 12]]) E(g, x, y, 2, 2, a.haare);
      if (fr === 'dutt') E(g, 16, 2.5, 4, 3, a.haare);
    }
    if (a.muetze) { E(g, 16, 7, 11, 5, a.muetze); R(g, 5, 9, 22, 3, dunkel(a.muetze, 0.2)); E(g, 16, 1.5, 2, 2, '#f4f0e8'); }
    // Gesicht
    R(g, 10, 13, 4, 1, dunkel(a.haare, 0.15)); R(g, 18, 13, 4, 1, dunkel(a.haare, 0.15));
    R(g, 11, 15, 2, 3, '#2a1a1a'); R(g, 19, 15, 2, 3, '#2a1a1a'); P(g, 11, 15, '#ffffff'); P(g, 19, 15, '#ffffff');
    P(g, 16, 18, dunkel(haut, 0.2)); P(g, 15, 19, dunkel(haut, 0.12));
    E(g, 9.5, 19.5, 1.6, 1, mische(haut, '#e86a6a', 0.4)); E(g, 22.5, 19.5, 1.6, 1, mische(haut, '#e86a6a', 0.4));
    if (a.bart) { E(g, 16, 22, 7, 4, a.bart); R(g, 13, 20, 6, 1, a.bart); R(g, 14, 22, 4, 1, dunkel(a.bart, 0.4)); }
    else { P(g, 13, 21, '#8a3a2a'); R(g, 14, 22, 4, 1, '#8a3a2a'); P(g, 18, 21, '#8a3a2a'); }
    if (a.brille) { R(g, 9, 14, 6, 1, '#2a2a30'); R(g, 17, 14, 6, 1, '#2a2a30'); R(g, 9, 14, 1, 5, '#2a2a30'); R(g, 14, 14, 1, 5, '#2a2a30'); R(g, 17, 14, 1, 5, '#2a2a30'); R(g, 22, 14, 1, 5, '#2a2a30'); R(g, 9, 18, 6, 1, '#2a2a30'); R(g, 17, 18, 6, 1, '#2a2a30'); R(g, 15, 15, 2, 1, '#2a2a30'); }
    return umriss(c);
  });
}

// ─── Tiere und Monster ──────────────────────────────────────────────────────

export function huhnBild(schritt, links) {
  return gecacht(`huhn:${schritt}:${links ? 1 : 0}`, () => {
    const [c, g] = leinwand(16, 16);
    const pick = schritt === 2;
    E(g, 8, 10, 5, 4, '#f4f0e8'); E(g, 7, 11, 3, 2, '#e0dacc'); P(g, 3, 7, '#f4f0e8'); P(g, 3, 8, '#e8e2d4'); P(g, 2, 7, '#e0dacc');
    const kx = pick ? 12 : 11;
    const ky = pick ? 9 : 6;
    E(g, kx, ky, 2.6, 2.6, '#f4f0e8'); R(g, kx - 1, ky - 4, 2, 2, '#d83a3a'); P(g, kx + 3, ky, '#f2a03a'); P(g, kx + 1, ky - 1, '#141414');
    P(g, kx + 1, ky + 2, '#d83a3a');
    const bein = schritt === 1 ? 1 : 0;
    P(g, 7, 14 - bein, '#f2a03a'); P(g, 9, 14, '#f2a03a'); P(g, 7, 15 - bein, '#f2a03a'); P(g, 9, 15, '#f2a03a');
    umriss(c);
    return links ? c : gespiegelt(c);
  });
}

export function monsterBild(typ, farbe, art, phase) {
  return gecacht(`mon:${typ}:${phase}`, () => {
    const [c, g] = leinwand(16, 16);
    if (art === 'schleim') {
      const [rx, ry, cy] = phase === 0 ? [6, 4.5, 11] : phase === 1 ? [7, 3.6, 12] : [5, 5.6, 9];
      E(g, 8, cy, rx, ry, dunkel(farbe, 0.15)); E(g, 8, cy - 0.8, rx - 1, ry - 1, farbe); E(g, 6, cy - ry * 0.5, 1.6, 1.2, hell(farbe, 0.55));
      P(g, 6, cy, '#141414'); P(g, 10, cy, '#141414'); P(g, 6, cy - 1, '#141414'); P(g, 10, cy - 1, '#141414');
    } else {
      E(g, 8, 8, 2.8, 3.2, farbe); P(g, 6, 4, farbe); P(g, 10, 4, farbe);
      if (phase % 2 === 0) { POLY(g, [[6, 8], [0, 3], [2, 6], [1, 9]], dunkel(farbe, 0.1)); POLY(g, [[10, 8], [16, 3], [14, 6], [15, 9]], dunkel(farbe, 0.1)); }
      else { POLY(g, [[6, 8], [0, 12], [3, 10], [2, 7]], dunkel(farbe, 0.1)); POLY(g, [[10, 8], [16, 12], [13, 10], [14, 7]], dunkel(farbe, 0.1)); }
      P(g, 7, 7, '#f2d24a'); P(g, 9, 7, '#f2d24a');
    }
    return umriss(c);
  });
}

// ─── Kleine Symbole für die Oberfläche ──────────────────────────────────────

export function symbolUrl(art) {
  return gecacht(`sym:${art}`, () => {
    const [c, g] = leinwand(16, 16);
    switch (art) {
      case 'sonne':
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; L(g, 8 + Math.round(Math.cos(a) * 5), 8 + Math.round(Math.sin(a) * 5), 8 + Math.round(Math.cos(a) * 7), 8 + Math.round(Math.sin(a) * 7), '#f2b23a', 1); }
        kugel(g, 8, 8, 4, 4, '#f2c94c');
        break;
      case 'regen': case 'sturm':
        E(g, 6, 7, 4, 3, '#c8d0dc'); E(g, 10, 6, 4.5, 3.5, '#dfe5ee'); R(g, 3, 7, 11, 3, '#dfe5ee');
        if (art === 'regen') for (const x of [4, 8, 12]) L(g, x, 11, x - 1, 14, '#5a9ad8', 1);
        else POLY(g, [[9, 10], [6, 13], [8, 13], [6, 16], [11, 12], [9, 12], [11, 10]], '#f2c94c');
        break;
      case 'schnee':
        for (const [a, b, c2, d] of [[8, 2, 8, 14], [2, 8, 14, 8], [4, 4, 12, 12], [12, 4, 4, 12]]) L(g, a, b, c2, d, '#e8f4ff', 1);
        E(g, 8, 8, 1.5, 1.5, '#ffffff');
        break;
      case 'gold':
        kugel(g, 8, 8, 5.5, 5.5, '#f2c94c'); R(g, 7, 5, 2, 6, '#c89a2a');
        break;
      case 'herz': case 'herzLeer': {
        const f = art === 'herz' ? '#e8405a' : '#5a4a52';
        E(g, 5.5, 6, 3.2, 3.2, f); E(g, 10.5, 6, 3.2, 3.2, f); POLY(g, [[2.5, 7], [13.5, 7], [8, 14]], f);
        if (art === 'herz') P(g, 5, 5, '#ffb0c0');
        break;
      }
      case 'silber': case 'goldstern': {
        const f = art === 'silber' ? '#d8e0ea' : '#f2c94c';
        POLY(g, [[8, 1], [10, 6], [15, 6], [11, 9], [13, 15], [8, 11], [3, 15], [5, 9], [1, 6], [6, 6]], f);
        break;
      }
      case 'rucksack':
        R(g, 4, 4, 8, 10, '#8a5a32'); R(g, 4, 4, 8, 1, '#a87848'); R(g, 3, 8, 10, 6, '#7a4e2a');
        R(g, 5, 9, 6, 3, '#9a6a3a'); R(g, 7, 10, 2, 1, '#e8c24a'); R(g, 5, 2, 6, 2, '#5a3a1e'); R(g, 6, 2, 4, 1, '#7a4e2a');
        break;
      case 'energie':
        POLY(g, [[9, 1], [3, 9], [7, 9], [6, 15], [13, 6], [9, 6], [11, 1]], '#7cc25a');
        break;
      case 'hp':
        E(g, 5.5, 6, 3.2, 3.2, '#e8405a'); E(g, 10.5, 6, 3.2, 3.2, '#e8405a'); POLY(g, [[2.5, 7], [13.5, 7], [8, 14]], '#e8405a');
        break;
      default:
        R(g, 4, 4, 8, 8, '#aaaaaa');
    }
    return umriss(c).toDataURL();
  });
}
