/**
 * Arbeitsbereich zum Vernetzen eines Chunks: der Chunk plus 15 Bloecke Rand in alle
 * Richtungen (so weit reicht Licht), samt Licht nach den Regeln des Vorbilds.
 *
 * Himmelslicht: Zellen ohne lichtundurchlaessigen Block darueber haben Stufe 15;
 * von dort sickert es seitlich und nach unten in Hoehlen und Haeuser, je Block eine
 * Stufe weniger. Blocklicht: Fackeln (14) und Lampen (15) leuchten genauso. Beides
 * wird mit einer Breitensuche ueber den Bereich verteilt.
 *
 * Die Arrays werden fuer jeden Chunk wiederverwendet (gilt bis zum naechsten Aufruf).
 */

import { OPAQUE, LIGHT } from './blocks.js';
import { CS, CH } from './world.js';

export const M = 15; // Rand
export const R = CS + 2 * M; // Breite des Bereichs (46)
export const RR = R * R;
export const RH = CH + 2; // eine Lage unter dem Boden und eine ueber dem Himmel
const SIZE = RR * RH;

const ids = new Uint8Array(SIZE);
const meta = new Uint8Array(SIZE);
const sky = new Uint8Array(SIZE);
const blk = new Uint8Array(SIZE);
const rtop = new Int16Array(RR);
const queue = new Int32Array(SIZE);

/** Index im Bereich; lx/lz relativ zum Chunk (-15..30), y in Weltkoordinaten (-1..64). */
export const ri = (lx, y, lz) => lx + M + (lz + M) * R + (y + 1) * RR;

const STEPS = [1, -1, R, -R, RR, -RR];
const DIRS4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function buildRegion(world, chunk) {
  // Bloecke und Zustaende aus den 3x3 Chunks kopieren.
  for (let dzc = -1; dzc <= 1; dzc++) {
    for (let dxc = -1; dxc <= 1; dxc++) {
      const c = world.getChunk(chunk.cx + dxc, chunk.cz + dzc);
      const xa = Math.max(-M, dxc * CS);
      const xb = Math.min(CS + M - 1, dxc * CS + CS - 1);
      const za = Math.max(-M, dzc * CS);
      const zb = Math.min(CS + M - 1, dzc * CS + CS - 1);
      for (let z = za; z <= zb; z++) {
        for (let x = xa; x <= xb; x++) {
          const col = x + M + (z + M) * R;
          const src = x - dxc * CS + (z - dzc * CS) * CS;
          rtop[col] = c ? c.top[src] : CH - 1;
          for (let y = 0; y < CH; y++) {
            const d = col + (y + 1) * RR;
            if (c) {
              ids[d] = c.blocks[src + y * 256];
              meta[d] = c.meta[src + y * 256];
            } else {
              ids[d] = 3; // fehlender Nachbar: wie Stein behandeln
              meta[d] = 0;
            }
          }
        }
      }
    }
  }
  // Unterste Lage: Fels, oberste: freie Luft.
  for (let col = 0; col < RR; col++) {
    ids[col] = 3;
    meta[col] = 0;
    ids[col + (RH - 1) * RR] = 0;
    meta[col + (RH - 1) * RR] = 0;
  }

  computeSky();
  computeBlockLight(world, chunk);

  // Licht des eigenen Chunks fuer spaetere Abfragen (Wesen, Spawnen) aufheben.
  if (!chunk.light) chunk.light = new Uint8Array(CS * CS * CH);
  for (let y = 0; y < CH; y++) {
    for (let z = 0; z < CS; z++) {
      for (let x = 0; x < CS; x++) {
        const i = ri(x, y, z);
        chunk.light[x + z * CS + y * 256] = (sky[i] << 4) | blk[i];
      }
    }
  }
  return { ids, meta, sky, blk };
}

function computeSky() {
  sky.fill(0);
  // Direktes Himmelslicht: alles oberhalb des obersten undurchlaessigen Blocks.
  for (let col = 0; col < RR; col++) {
    for (let y = rtop[col] + 1; y <= CH; y++) sky[col + (y + 1) * RR] = 15;
  }
  // Startpunkte: verdeckte, durchlaessige Zellen direkt neben einer Himmelszelle.
  let head = 0;
  let tail = 0;
  for (let z = 0; z < R; z++) {
    for (let x = 0; x < R; x++) {
      const col = x + z * R;
      const t = rtop[col];
      for (const [dx, dz] of DIRS4) {
        const nx = x + dx;
        const nz = z + dz;
        if (nx < 0 || nz < 0 || nx >= R || nz >= R) continue;
        const n = nx + nz * R;
        const tn = rtop[n];
        for (let y = t + 1; y <= tn; y++) {
          const j = n + (y + 1) * RR;
          if (!OPAQUE[ids[j]] && sky[j] < 14) {
            sky[j] = 14;
            queue[tail++] = j;
          }
        }
      }
    }
  }
  spread(sky, head, tail);
}

function computeBlockLight(world, chunk) {
  blk.fill(0);
  let tail = 0;
  // Leuchtende Bloecke der 3x3 Chunks, die hellsten zuerst in die Warteschlange.
  const seeds = [];
  for (let dzc = -1; dzc <= 1; dzc++) {
    for (let dxc = -1; dxc <= 1; dxc++) {
      const c = world.getChunk(chunk.cx + dxc, chunk.cz + dzc);
      if (!c || !c.emitters.size) continue;
      for (const idx of c.emitters) {
        const x = (idx & 15) + dxc * CS;
        const z = ((idx >> 4) & 15) + dzc * CS;
        const y = idx >> 8;
        if (x < -M || x >= CS + M || z < -M || z >= CS + M) continue;
        const level = LIGHT[c.blocks[idx]];
        if (level) seeds.push([ri(x, y, z), level]);
      }
    }
  }
  if (!seeds.length) return;
  seeds.sort((a, b) => b[1] - a[1]);
  for (const [i, level] of seeds) {
    if (blk[i] >= level) continue;
    blk[i] = level;
    queue[tail++] = i;
  }
  spread(blk, 0, tail);
}

/** Breitensuche: jede Zelle gibt Stufe - 1 an durchlaessige Nachbarn weiter. */
function spread(level, head, tail) {
  while (head < tail) {
    const i = queue[head++];
    const l = level[i] - 1;
    if (l <= 0) continue;
    const y = Math.floor(i / RR);
    const rem = i - y * RR;
    const z = Math.floor(rem / R);
    const x = rem - z * R;
    for (let k = 0; k < 6; k++) {
      if (k === 0 && x === R - 1) continue;
      if (k === 1 && x === 0) continue;
      if (k === 2 && z === R - 1) continue;
      if (k === 3 && z === 0) continue;
      if (k === 4 && y === RH - 1) continue;
      if (k === 5 && y === 0) continue;
      const j = i + STEPS[k];
      if (OPAQUE[ids[j]] || level[j] >= l) continue;
      level[j] = l;
      if (tail < queue.length) queue[tail++] = j;
    }
  }
}
