/**
 * Baut aus einem Chunk Dreiecke fuer die Grafikkarte.
 *
 * Nur sichtbare Flaechen werden erzeugt. Jede Ecke bekommt "Ambient Occlusion"
 * (Ecken und Kanten werden dunkler, wo Bloecke zusammenstossen) und weiches Licht:
 * Himmels- und Blocklicht werden ueber die vier Zellen gemittelt, die an der Ecke
 * liegen – wie die "weiche Beleuchtung" des Vorbilds.
 *
 * Vertexformat (8 Floats): x y z u v schatten himmel block.
 */

import { BLOCKS, AIR, WATER, FURNACE, OPAQUE, SOLID, ATLAS_COLS, TORCH_WALL } from './blocks.js';
import { CS, CH } from './world.js';
import { buildRegion, ri, R, RR } from './region.js';
import { amountOf } from './fluids.js';
import { hash2 } from './noise.js';

export const FLOATS = 8;
const SPAN = 1 / ATLAS_COLS;
const INSET = 0.004 * SPAN; // Abstand zum Kachelrand, gegen Farbbluten im Atlas

/** Flaechen: Normale, vier Ecken gegen den Uhrzeigersinn (von aussen), Grundhelligkeit. */
const FACES = [
  {
    n: [1, 0, 0],
    c: [
      [1, 0, 1],
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
    ],
    shade: 0.6,
    tile: 'side',
    facing: 1,
  },
  {
    n: [-1, 0, 0],
    c: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
    shade: 0.6,
    tile: 'side',
    facing: 3,
  },
  {
    n: [0, 1, 0],
    c: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
    shade: 1,
    tile: 'top',
    facing: -1,
  },
  {
    n: [0, -1, 0],
    c: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
    shade: 0.5,
    tile: 'bottom',
    facing: -1,
  },
  {
    n: [0, 0, 1],
    c: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
    shade: 0.8,
    tile: 'side',
    facing: 2,
  },
  {
    n: [0, 0, -1],
    c: [
      [1, 0, 0],
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
    shade: 0.8,
    tile: 'side',
    facing: 0,
  },
];
const UV = [
  [0, 1],
  [1, 1],
  [1, 0],
  [0, 0],
];

const delta = (o) => o[0] + o[2] * R + o[1] * RR;

// Fuer jede Ecke: die beiden Nachbarn "an der Seite" und der diagonale Nachbar,
// jeweils relativ zum Block (also schon um die Flaechennormale verschoben).
for (const f of FACES) {
  const axis = f.n.findIndex((v) => v !== 0);
  const t = [0, 1, 2].filter((a) => a !== axis);
  f.d = delta(f.n);
  f.ao = f.c.map((corner) => {
    const s = t.map((a) => (corner[a] ? 1 : -1));
    const at = (k1, k2) => {
      const o = [f.n[0], f.n[1], f.n[2]];
      o[t[0]] += k1 * s[0];
      o[t[1]] += k2 * s[1];
      return delta(o);
    };
    return [at(1, 0), at(0, 1), at(1, 1)];
  });
}

const AO_LEVEL = [0.5, 0.68, 0.84, 1];

class Buf {
  constructor() {
    this.a = new Float32Array(1 << 17);
    this.n = 0;
  }
  push(x, y, z, u, v, shade, sky, block) {
    if (this.n + FLOATS > this.a.length) {
      const b = new Float32Array(this.a.length * 2);
      b.set(this.a);
      this.a = b;
    }
    const a = this.a;
    let i = this.n;
    a[i++] = x;
    a[i++] = y;
    a[i++] = z;
    a[i++] = u;
    a[i++] = v;
    a[i++] = shade;
    a[i++] = sky;
    a[i++] = block;
    this.n = i;
  }
  take() {
    const out = this.a.slice(0, this.n);
    this.n = 0;
    return out;
  }
}

const solidBuf = new Buf();
const waterBuf = new Buf();

const tileU = (tile, u) => (tile % ATLAS_COLS) * SPAN + INSET + u * (SPAN - 2 * INSET);
const tileV = (tile, v) => Math.floor(tile / ATLAS_COLS) * SPAN + INSET + v * (SPAN - 2 * INSET);

/* ---------------------------------------------------------------- Wuerfel -- */

const ao = [0, 0, 0, 0];
const ls = [0, 0, 0, 0];
const lb = [0, 0, 0, 0];

function cube(out, reg, i, x, y, z, id, def) {
  const { ids, meta, sky, blk } = reg;
  for (const f of FACES) {
    const j = i + f.d;
    const nid = ids[j];
    if (OPAQUE[nid] || nid === id) continue;
    const tile = id === FURNACE && f.facing === meta[i] ? def.front : def[f.tile];

    for (let k = 0; k < 4; k++) {
      const a = f.ao[k];
      const o1 = OPAQUE[ids[i + a[0]]];
      const o2 = OPAQUE[ids[i + a[1]]];
      const o3 = OPAQUE[ids[i + a[2]]];
      ao[k] = o1 && o2 ? 0 : 3 - (o1 + o2 + o3);
      let s = sky[j];
      let b = blk[j];
      let n = 1;
      if (!o1) {
        s += sky[i + a[0]];
        b += blk[i + a[0]];
        n++;
      }
      if (!o2) {
        s += sky[i + a[1]];
        b += blk[i + a[1]];
        n++;
      }
      if (!o3 && !(o1 && o2)) {
        s += sky[i + a[2]];
        b += blk[i + a[2]];
        n++;
      }
      ls[k] = s / (15 * n);
      lb[k] = b / (15 * n);
    }

    // Diagonale so waehlen, dass der Helligkeitsverlauf nicht "knickt".
    const order = ao[0] + ao[2] > ao[1] + ao[3] ? ORDER_A : ORDER_B;
    for (const k of order) {
      const c = f.c[k];
      out.push(
        x + c[0],
        y + c[1],
        z + c[2],
        tileU(tile, UV[k][0]),
        tileV(tile, UV[k][1]),
        f.shade * AO_LEVEL[ao[k]],
        ls[k],
        lb[k],
      );
    }
  }
}
const ORDER_A = [0, 1, 2, 0, 2, 3];
const ORDER_B = [1, 2, 3, 1, 3, 0];

/* ----------------------------------------------------------------- Wasser -- */

/** Hoehe nach Vorbild: 1 bei Wasser darueber, sonst Menge/9; 0 fuer Luft, -1 fuer fest. */
function heightOf(reg, j) {
  const { ids, meta } = reg;
  if (ids[j] === WATER) return ids[j + RR] === WATER ? 1 : amountOf(meta[j]) / 9;
  return SOLID[ids[j]] ? -1 : 0;
}

/** Eckhoehe als gewichtetes Mittel der vier anliegenden Zellen (wie im Vorbild). */
function cornerHeight(reg, own, h1, h2, diag) {
  if (h1 >= 1 || h2 >= 1) return 1;
  let sum = 0;
  let weight = 0;
  const add = (h) => {
    if (h >= 0.8) {
      sum += h * 10;
      weight += 10;
    } else if (h >= 0) {
      sum += h;
      weight += 1;
    }
  };
  if (h1 > 0 || h2 > 0) {
    const d = heightOf(reg, diag);
    if (d >= 1) return 1;
    add(d);
  }
  add(own);
  add(h1);
  add(h2);
  return weight ? sum / weight : own;
}

function liquid(out, reg, i, x, y, z, def) {
  const { ids, sky, blk } = reg;
  const own = heightOf(reg, i);
  // Ecken: [x][z] -> Hoehe; Norden = -z, Osten = +x.
  let nw = 1;
  let ne = 1;
  let se = 1;
  let sw = 1;
  if (own < 1) {
    const n = heightOf(reg, i - R);
    const s = heightOf(reg, i + R);
    const e = heightOf(reg, i + 1);
    const w = heightOf(reg, i - 1);
    ne = cornerHeight(reg, own, n, e, i - R + 1);
    nw = cornerHeight(reg, own, n, w, i - R - 1);
    se = cornerHeight(reg, own, s, e, i + R + 1);
    sw = cornerHeight(reg, own, s, w, i + R - 1);
  }
  const hAt = (cx, cz) => (cx ? (cz ? se : ne) : cz ? sw : nw);
  const tile = def.top;

  for (const f of FACES) {
    const j = i + f.d;
    const nid = ids[j];
    if (f.n[1] === 1) {
      if (nid === WATER) continue;
    } else if (nid === WATER || OPAQUE[nid]) continue;
    // Oben zaehlt das eigene Licht (die Zelle darueber kann ein Block sein).
    const s = (f.n[1] === 1 ? sky[i] : sky[j]) / 15;
    const b = (f.n[1] === 1 ? blk[i] : blk[j]) / 15;
    for (const k of ORDER_A) {
      const c = f.c[k];
      const cy = c[1] ? hAt(c[0], c[2]) : 0;
      const v = f.n[1] === 0 ? 1 - cy : UV[k][1];
      out.push(x + c[0], y + cy, z + c[2], tileU(tile, UV[k][0]), tileV(tile, v), f.shade, s, b);
    }
  }
}

/* ---------------------------------------------------------------- Pflanzen -- */

const CROSS = [
  [
    [0.15, 0, 0.15],
    [0.85, 0, 0.85],
    [0.85, 1, 0.85],
    [0.15, 1, 0.15],
  ],
  [
    [0.15, 0, 0.85],
    [0.85, 0, 0.15],
    [0.85, 1, 0.15],
    [0.15, 1, 0.85],
  ],
];

function cross(out, reg, i, x, y, z, def, wx, wz) {
  const s = reg.sky[i] / 15;
  const b = reg.blk[i] / 15;
  // Wie im Vorbild leicht versetzt, damit Wiesen nicht wie ein Raster wirken.
  const ox = (hash2(wx, wz, 0x5157) - 0.5) * 0.3;
  const oz = (hash2(wz, wx, 0x7151) - 0.5) * 0.3;
  const tile = def.side;
  for (const q of CROSS) {
    for (const order of [ORDER_A, [0, 2, 1, 0, 3, 2]]) {
      for (const k of order) {
        const c = q[k];
        out.push(
          x + c[0] + ox,
          y + c[1],
          z + c[2] + oz,
          tileU(tile, UV[k][0]),
          tileV(tile, UV[k][1]),
          0.9,
          s,
          b,
        );
      }
    }
  }
}

/* ---------------------------------------------------------------- Fackeln -- */

const PX = 1 / 16;

function torch(out, reg, i, x, y, z, def, m) {
  const s = reg.sky[i] / 15;
  const b = reg.blk[i] / 15;
  const wall = TORCH_WALL[m];
  const tile = def.side;
  // Duenner Stab, 2 x 10 Pixel; an der Wand schraeg vom Block weg geneigt.
  const place = (c) => {
    let px = 7 * PX + c[0] * 2 * PX;
    let py = c[1] * 10 * PX;
    let pz = 7 * PX + c[2] * 2 * PX;
    if (wall) {
      const lean = py * 0.42;
      px += wall[0] * (0.3125 - lean);
      pz += wall[2] * (0.3125 - lean);
      py += 3.5 * PX;
    }
    return [x + px, y + py, z + pz];
  };
  for (const f of FACES) {
    // Ausschnitt der Kachel: Stab in den Spalten 7..9, Flamme oben.
    let u0 = 7 / 16;
    let u1 = 9 / 16;
    let v0 = 6 / 16;
    let v1 = 1;
    if (f.n[1] === 1) v1 = 8 / 16;
    else if (f.n[1] === -1) v0 = 14 / 16;
    for (const k of ORDER_A) {
      const p = place(f.c[k]);
      const u = u0 + UV[k][0] * (u1 - u0);
      const v = v0 + UV[k][1] * (v1 - v0);
      out.push(p[0], p[1], p[2], tileU(tile, u), tileV(tile, v), f.shade, s, b);
    }
  }
}

/* ------------------------------------------------------------- Hauptteil -- */

/**
 * @returns {{solid: Float32Array, water: Float32Array}} Eckdaten; leer = nichts zu zeichnen
 */
export function meshChunk(world, chunk) {
  const reg = buildRegion(world, chunk);
  const { ids, meta } = reg;
  const wx0 = chunk.cx * CS;
  const wz0 = chunk.cz * CS;

  for (let y = 0; y < CH; y++) {
    for (let z = 0; z < CS; z++) {
      let i = ri(0, y, z);
      for (let x = 0; x < CS; x++, i++) {
        const id = ids[i];
        if (id === AIR) continue;
        const def = BLOCKS[id];
        if (!def) continue;
        switch (def.model) {
          case 'liquid':
            liquid(waterBuf, reg, i, x, y, z, def);
            break;
          case 'cross':
            cross(solidBuf, reg, i, x, y, z, def, wx0 + x, wz0 + z);
            break;
          case 'torch':
            torch(solidBuf, reg, i, x, y, z, def, meta[i]);
            break;
          default:
            cube(solidBuf, reg, i, x, y, z, id, def);
        }
      }
    }
  }
  return { solid: solidBuf.take(), water: waterBuf.take() };
}
