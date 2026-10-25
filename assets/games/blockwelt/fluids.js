/**
 * Fliessendes Wasser nach den Regeln des Vorbilds.
 *
 * Zustandswert eines Wasserblocks: 0 = Quelle, 1..7 = Fliessstufe (Abstand zur
 * Quelle), 8 = fallendes Wasser. Wasser rechnet alle 5 Ticks neu, fliesst zuerst nach
 * unten und sonst hoechstens 7 Bloecke zur Seite – und zwar bevorzugt in die
 * Richtung, in der innerhalb von 4 Bloecken ein Gefaelle liegt. Zwei Quellen neben
 * einem Block auf festem Grund machen ihn ebenfalls zur Quelle ("unendliche Quelle").
 */

import { AIR, WATER, SOLID, WASHABLE } from './blocks.js';

export const SOURCE = 0;
export const FALLING = 8;
export const TICK_DELAY = 5;
const SLOPE_FIND = 4;
const H = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** "Menge" im Sinne des Vorbilds: Quelle und fallendes Wasser 8, Stufe n: 8 - n. */
export const amountOf = (meta) => (meta & FALLING ? 8 : 8 - (meta & 7));
/** Hoehe der Wasseroberflaeche in der Zelle (Quelle 8/9). */
export const ownHeight = (meta) => amountOf(meta) / 9;

/** Luft oder etwas, das Wasser wegspuelt (Fackeln, Pflanzen). */
const canHold = (id) => id === AIR || WASHABLE[id] === 1;

function isWater(world, x, y, z) {
  return world.getBlock(x, y, z) === WATER;
}

/** Durchlaessig fuer die Gefaellesuche: nicht fest und keine Quelle. */
function passable(world, x, y, z) {
  const id = world.getBlock(x, y, z);
  if (id === WATER) return world.getMeta(x, y, z) !== SOURCE;
  return canHold(id);
}

/** Kann von hier aus Wasser nach unten weiter? */
function isHole(world, x, y, z) {
  if (y < 1) return false;
  const id = world.getBlock(x, y, z);
  return id === WATER || canHold(id);
}

function sourceNeighbors(world, x, y, z) {
  let n = 0;
  for (const [dx, dz] of H) {
    if (isWater(world, x + dx, y, z + dz) && world.getMeta(x + dx, y, z + dz) === SOURCE) n++;
  }
  return n;
}

/** Welcher Zustand ergibt sich aus den Nachbarn? -1 = kein Wasser. */
export function newLiquid(world, x, y, z) {
  let maxAmount = 0;
  let sources = 0;
  for (const [dx, dz] of H) {
    if (!isWater(world, x + dx, y, z + dz)) continue;
    const m = world.getMeta(x + dx, y, z + dz);
    if (m === SOURCE) sources++;
    maxAmount = Math.max(maxAmount, amountOf(m));
  }
  if (sources >= 2) {
    const below = world.getBlock(x, y - 1, z);
    if (SOLID[below] || (below === WATER && world.getMeta(x, y - 1, z) === SOURCE)) return SOURCE;
  }
  if (isWater(world, x, y + 1, z)) return FALLING;
  const amount = maxAmount - 1;
  return amount <= 0 ? -1 : 8 - amount;
}

function slopeDistance(world, x, y, z, depth, fromDx, fromDz) {
  let best = 1000;
  for (const [dx, dz] of H) {
    if (dx === -fromDx && dz === -fromDz) continue;
    const nx = x + dx;
    const nz = z + dz;
    if (!passable(world, nx, y, nz)) continue;
    if (isHole(world, nx, y - 1, nz)) return depth;
    if (depth < SLOPE_FIND) {
      const d = slopeDistance(world, nx, y, nz, depth + 1, dx, dz);
      if (d < best) best = d;
    }
  }
  return best;
}

/** Richtungen mit dem kuerzesten Weg zum naechsten Gefaelle. */
function spreadDirections(world, x, y, z) {
  let best = 1000;
  const out = [];
  for (const [dx, dz] of H) {
    const nx = x + dx;
    const nz = z + dz;
    if (!passable(world, nx, y, nz)) continue;
    const d = isHole(world, nx, y - 1, nz) ? 0 : slopeDistance(world, nx, y, nz, 1, dx, dz);
    if (d < best) {
      out.length = 0;
      best = d;
    }
    if (d <= best) out.push([dx, dz]);
  }
  return out;
}

function spreadToSides(world, x, y, z, meta) {
  const amount = meta & FALLING ? 7 : amountOf(meta) - 1;
  if (amount <= 0) return;
  for (const [dx, dz] of spreadDirections(world, x, y, z)) {
    const nx = x + dx;
    const nz = z + dz;
    if (!canHold(world.getBlock(nx, y, nz))) continue;
    const state = newLiquid(world, nx, y, nz);
    if (state >= 0) world.setBlock(nx, y, nz, WATER, state);
  }
}

function spread(world, x, y, z, meta) {
  const below = world.getBlock(x, y - 1, z);
  if (y > 1 && canHold(below)) {
    world.setBlock(x, y - 1, z, WATER, FALLING);
    if (sourceNeighbors(world, x, y, z) >= 3) spreadToSides(world, x, y, z, meta);
  } else if (meta === SOURCE || below !== WATER) {
    spreadToSides(world, x, y, z, meta);
  }
}

/** Ein geplanter Wasser-Tick an dieser Stelle. */
export function waterTick(world, x, y, z) {
  if (!isWater(world, x, y, z)) return;
  let meta = world.getMeta(x, y, z);
  if (meta !== SOURCE) {
    const next = newLiquid(world, x, y, z);
    if (next < 0) {
      world.setBlock(x, y, z, AIR);
      return;
    }
    if (next !== meta) {
      world.setBlock(x, y, z, WATER, next);
      meta = next;
    }
  }
  spread(world, x, y, z, meta);
}

/**
 * Stroemungsrichtung (normiert, nur waagerecht) wie im Vorbild: Wasser zieht von
 * hohen zu niedrigen Nachbarn und ueber Kanten hinab.
 */
export function flowAt(world, x, y, z) {
  if (!isWater(world, x, y, z)) return [0, 0];
  const own = ownHeight(world.getMeta(x, y, z));
  let fx = 0;
  let fz = 0;
  for (const [dx, dz] of H) {
    const nx = x + dx;
    const nz = z + dz;
    const id = world.getBlock(nx, y, nz);
    let diff = 0;
    if (id === WATER) {
      diff = own - ownHeight(world.getMeta(nx, y, nz));
    } else if (!SOLID[id] && isWater(world, nx, y - 1, nz)) {
      diff = own - (ownHeight(world.getMeta(nx, y - 1, nz)) - 0.8888889);
    }
    fx += dx * diff;
    fz += dz * diff;
  }
  const len = Math.hypot(fx, fz);
  return len > 1e-6 ? [fx / len, fz / len] : [0, 0];
}
