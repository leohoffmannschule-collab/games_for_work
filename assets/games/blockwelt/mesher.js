/**
 * Baut aus einem Chunk Dreiecke fuer die Grafikkarte.
 *
 * Nur sichtbare Flaechen werden erzeugt. Jede Ecke bekommt "Ambient Occlusion"
 * (Ecken und Kanten werden dunkler, wenn dort Bloecke zusammenstossen) und ein
 * Himmelslicht-Bit: Flaechen unter einem lichtundurchlaessigen Block liegen im
 * Dunkeln. Vertexformat (7 Floats): x y z u v schatten himmel.
 */

import { BLOCKS, AIR, WATER, OPAQUE, ATLAS_COLS } from './blocks.js';
import { CS, CH } from './world.js';

export const FLOATS = 7;

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
  },
];
const UV = [
  [0, 1],
  [1, 1],
  [1, 0],
  [0, 0],
];

// Fuer jede Ecke: die beiden Nachbarn "an der Seite" und der diagonale Nachbar,
// jeweils relativ zum Block (also schon um die Flaechennormale verschoben).
for (const f of FACES) {
  const axis = f.n.findIndex((v) => v !== 0);
  const t = [0, 1, 2].filter((a) => a !== axis);
  f.ao = f.c.map((corner) => {
    const s = t.map((a) => (corner[a] ? 1 : -1));
    const at = (k1, k2) => {
      const o = [f.n[0], f.n[1], f.n[2]];
      o[t[0]] += k1 * s[0];
      o[t[1]] += k2 * s[1];
      return o;
    };
    return [at(1, 0), at(0, 1), at(1, 1)];
  });
}

const AO_LEVEL = [0.5, 0.68, 0.84, 1];

class Buf {
  constructor() {
    this.a = new Float32Array(1 << 16);
    this.n = 0;
  }
  push(x, y, z, u, v, shade, sky) {
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
    this.n = i;
  }
  result() {
    return this.a.slice(0, this.n);
  }
}

const INSET = 0.004; // Abstand zum Kachelrand, gegen Farbbluten im Atlas

/**
 * @returns {{solid: Float32Array, water: Float32Array}} Eckdaten; leer = nichts zu zeichnen
 */
export function meshChunk(world, chunk) {
  const nb = [];
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) nb.push(world.getChunk(chunk.cx + dx, chunk.cz + dz));
  }
  const blockAt = (x, y, z) => {
    if (y < 0) return 3;
    if (y >= CH) return AIR;
    const c = nb[(z < 0 ? 0 : z >= CS ? 2 : 1) * 3 + (x < 0 ? 0 : x >= CS ? 2 : 1)];
    return c ? c.blocks[(x & 15) + (z & 15) * CS + y * 256] : AIR;
  };
  const skyAt = (x, y, z) => {
    if (y >= CH) return 1;
    if (y < 0) return 0;
    const c = nb[(z < 0 ? 0 : z >= CS ? 2 : 1) * 3 + (x < 0 ? 0 : x >= CS ? 2 : 1)];
    return !c || c.top[(x & 15) + (z & 15) * CS] < y ? 1 : 0;
  };

  const solid = new Buf();
  const water = new Buf();
  const ao = [0, 0, 0, 0];
  const blocks = chunk.blocks;

  for (let y = 0; y < CH; y++) {
    for (let z = 0; z < CS; z++) {
      for (let x = 0; x < CS; x++) {
        const id = blocks[x + z * CS + y * 256];
        if (id === AIR) continue;
        const def = BLOCKS[id];
        const out = id === WATER ? water : solid;

        for (const f of FACES) {
          const nx = x + f.n[0];
          const ny = y + f.n[1];
          const nz = z + f.n[2];
          const nid = blockAt(nx, ny, nz);
          if (OPAQUE[nid] || nid === id) continue;

          const sky = def.emissive ? 2 : skyAt(nx, ny, nz);
          const tile = def[f.tile];
          const tu = (tile % ATLAS_COLS) / ATLAS_COLS;
          const tv = Math.floor(tile / ATLAS_COLS) / ATLAS_COLS;
          const span = 1 / ATLAS_COLS;

          for (let k = 0; k < 4; k++) {
            if (id === WATER || def.emissive) {
              ao[k] = 1;
              continue;
            }
            const [s1, s2, co] = f.ao[k];
            const a = OPAQUE[blockAt(x + s1[0], y + s1[1], z + s1[2])];
            const b = OPAQUE[blockAt(x + s2[0], y + s2[1], z + s2[2])];
            const c = OPAQUE[blockAt(x + co[0], y + co[1], z + co[2])];
            ao[k] = a && b ? 0 : 3 - (a + b + c);
          }

          // Wasseroberflaeche liegt etwas unter der Blockkante.
          const dip = id === WATER && ny >= 0 && blockAt(x, y + 1, z) !== WATER ? 0.125 : 0;

          const v = [];
          for (let k = 0; k < 4; k++) {
            const c = f.c[k];
            const cy = c[1] && dip ? 1 - dip : c[1];
            const lvl = id === WATER || def.emissive ? 1 : AO_LEVEL[ao[k]];
            v.push([
              x + c[0],
              y + cy,
              z + c[2],
              tu + (UV[k][0] ? span - INSET * span : INSET * span),
              tv + (UV[k][1] ? span - INSET * span : INSET * span),
              f.shade * lvl,
            ]);
          }
          // Diagonale so waehlen, dass der Helligkeitsverlauf nicht "knickt".
          const order = ao[0] + ao[2] > ao[1] + ao[3] ? [0, 1, 2, 0, 2, 3] : [1, 2, 3, 1, 3, 0];
          for (const i of order) {
            const p = v[i];
            out.push(p[0], p[1], p[2], p[3], p[4], p[5], sky);
          }
        }
      }
    }
  }
  return { solid: solid.result(), water: water.result() };
}
