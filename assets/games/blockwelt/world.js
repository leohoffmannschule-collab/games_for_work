/**
 * Die Welt: Chunks, Gelaendeerzeugung, Bloecke lesen/setzen, Strahlentest.
 *
 * Ein Chunk ist 16 x 64 x 16 Bloecke gross und liegt als flaches Uint8Array vor
 * (Index = x + z*16 + y*256), dazu ein gleich grosses Array mit Zustandswerten
 * (Wasserstand, Ausrichtung von Fackel und Ofen). Die Welt ist in x/z unbegrenzt;
 * Chunks werden um den Spieler herum erzeugt und wieder verworfen. Nur Aenderungen
 * (`edits`) werden gespeichert – alles andere erzeugt der Seed neu.
 */

import {
  AIR,
  GRASS,
  DIRT,
  STONE,
  SAND,
  WATER,
  LOG,
  LEAVES,
  SNOW,
  BEDROCK,
  COAL_ORE,
  IRON_ORE,
  TALL_GRASS,
  POPPY,
  DANDELION,
  BLOCKS,
  OPAQUE,
  SOLID,
  LIGHT,
  WASHABLE,
  TORCH_WALL,
  blockBox,
} from './blocks.js';
import { Perlin, hash2, mulberry32 } from './noise.js';
import { waterTick, flowAt, TICK_DELAY, SOURCE } from './fluids.js';

export const CS = 16; // Chunk-Kantenlaenge
export const CH = 64; // Welthoehe
export const SEA = 20; // Meeresspiegel (oberster Wasserblock)

const BIOME = { WIESE: 0, WALD: 1, WUESTE: 2, SCHNEE: 3 };
const TREE_DENSITY = [0.004, 0.032, 0, 0.006];
const GRASS_DENSITY = [0.12, 0.06, 0, 0.03];
const PAD = 3; // Rand, in dem Baeume aus Nachbar-Chunks hineinragen koennen
const H4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const chunkKey = (cx, cz) => (cx + 32768) * 65536 + (cz + 32768);
const posKey = (x, y, z) => ((x + 1048576) * 2097152 + (z + 1048576)) * 64 + y;

/**
 * Schnittpunkt eines Strahls mit einem Quader (Slab-Verfahren).
 * Liefert { t, n } (Abstand, Flaechennormale) oder null.
 */
export function rayBox(ox, oy, oz, dx, dy, dz, x0, y0, z0, x1, y1, z1) {
  const o = [ox, oy, oz];
  const d = [dx, dy, dz];
  const lo = [x0, y0, z0];
  const hi = [x1, y1, z1];
  let tmin = -Infinity;
  let tmax = Infinity;
  let axis = -1;
  let sign = 0;
  for (let a = 0; a < 3; a++) {
    if (Math.abs(d[a]) < 1e-12) {
      if (o[a] < lo[a] || o[a] > hi[a]) return null;
      continue;
    }
    let t1 = (lo[a] - o[a]) / d[a];
    let t2 = (hi[a] - o[a]) / d[a];
    let s = -1;
    if (t1 > t2) {
      [t1, t2] = [t2, t1];
      s = 1;
    }
    if (t1 > tmin) {
      tmin = t1;
      axis = a;
      sign = s;
    }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }
  if (tmax < 0) return null;
  const n = [0, 0, 0];
  if (axis >= 0 && tmin >= 0) n[axis] = sign;
  return { t: Math.max(0, tmin), n };
}

export class Chunk {
  constructor(cx, cz) {
    this.cx = cx;
    this.cz = cz;
    this.blocks = new Uint8Array(CS * CS * CH);
    this.meta = new Uint8Array(CS * CS * CH);
    /** Hoehe des obersten lichtundurchlaessigen Blocks je Spalte (-1 = keiner). */
    this.top = new Int16Array(CS * CS).fill(-1);
    /** Lokale Indizes aller leuchtenden Bloecke. */
    this.emitters = new Set();
    /** Licht je Zelle (Himmel << 4 | Block), berechnet beim Vernetzen. */
    this.light = null;
    this.ready = false;
    this.dirty = true;
    this.mesh = null;
  }
}

export class World {
  constructor(seed, edits = null) {
    this.seed = seed | 0;
    this.chunks = new Map();
    /** chunkKey -> Map(lokaler Index -> Block | Zustand << 8): alles, was sich geaendert hat. */
    this.edits = edits || new Map();
    this.onChunkRemoved = null;
    /** Ereignisse fuer das Spiel, z. B. weggespuelte Fackeln ({ type: 'drop', id, x, y, z }). */
    this.events = [];
    this.tickCount = 0;
    this.fluidQueue = new Map();
    this.depth = 0;

    const s = this.seed;
    this.nBase = new Perlin(s ^ 0x1a2b3c);
    this.nHill = new Perlin(s ^ 0x4d5e6f);
    this.nMount = new Perlin(s ^ 0x7a8b9c);
    this.nTemp = new Perlin(s ^ 0x0f1e2d);
    this.nWet = new Perlin(s ^ 0x3c4b5a);
    this.nCave = new Perlin(s ^ 0x6978a1);
  }

  /* ------------------------------------------------------- Gelaendeform -- */

  /** Oberflaechenhoehe und Biom an einer Weltposition (rein funktional). */
  column(x, z) {
    // Grossraeumige "Kontinentalitaet": negativ = Meer, positiv = Land.
    const c = this.nBase.fbm2(x * 0.0028, z * 0.0028, 4);
    const hills = this.nHill.fbm2(x * 0.012 + 100, z * 0.012, 3) * 8;
    // Gebirgsgrate dort, wo das Land weit genug im Landesinneren liegt.
    const ridge = 1 - Math.abs(this.nMount.noise2(x * 0.007 + 500, z * 0.007)) * 2;
    const mountain = Math.pow(Math.max(0, ridge - 0.5), 1.5) * 110 * smooth(0, 0.22, c);
    let h = SEA + 4 + c * 60 + hills + mountain;
    if (h > 46) h = 46 + 9 * Math.tanh((h - 46) / 25); // Gipfel sanft abrunden statt kappen
    h = Math.max(4, Math.min(CH - 9, Math.round(h)));

    const temp = this.nTemp.fbm2(x * 0.0025 + 900, z * 0.0025, 3);
    const wet = this.nWet.fbm2(x * 0.0032 - 400, z * 0.0032, 3);
    let biome = BIOME.WIESE;
    if (h >= 44 || temp < -0.28) biome = BIOME.SCHNEE;
    else if (temp > 0.2 && wet < 0.05) biome = BIOME.WUESTE;
    else if (wet > 0.08) biome = BIOME.WALD;
    return { h, biome };
  }

  /** Sucht eine trockene Startposition nahe (0, 0). */
  findSpawn() {
    for (let r = 0; r < 400; r += 4) {
      for (let a = 0; a < 8; a++) {
        const x = Math.round(Math.cos((a / 8) * Math.PI * 2) * r);
        const z = Math.round(Math.sin((a / 8) * Math.PI * 2) * r);
        const { h, biome } = this.column(x, z);
        if (h > SEA + 1 && h < SEA + 10 && biome !== BIOME.SCHNEE) {
          return { x: x + 0.5, y: h + 1, z: z + 0.5 };
        }
      }
    }
    return { x: 0.5, y: SEA + 8, z: 0.5 };
  }

  /* ----------------------------------------------------------- Chunks -- */

  getChunk(cx, cz) {
    return this.chunks.get(chunkKey(cx, cz));
  }

  generate(cx, cz) {
    const key = chunkKey(cx, cz);
    let chunk = this.chunks.get(key);
    if (chunk && chunk.ready) return chunk;
    chunk = new Chunk(cx, cz);
    const { blocks } = chunk;
    const x0 = cx * CS;
    const z0 = cz * CS;
    const W = CS + PAD * 2;

    // Spalten einmal berechnen, inklusive Rand fuer die Baeume.
    const cols = new Array(W * W);
    for (let dz = 0; dz < W; dz++) {
      for (let dx = 0; dx < W; dx++) cols[dx + dz * W] = this.column(x0 + dx - PAD, z0 + dz - PAD);
    }
    const colAt = (lx, lz) => cols[lx + PAD + (lz + PAD) * W];

    for (let lz = 0; lz < CS; lz++) {
      for (let lx = 0; lx < CS; lx++) {
        const wx = x0 + lx;
        const wz = z0 + lz;
        const { h, biome } = colAt(lx, lz);
        const beach = h <= SEA + 1;
        const desert = biome === BIOME.WUESTE;
        const snowy = biome === BIOME.SCHNEE;
        const surface = beach || desert ? SAND : snowy && h >= 40 ? SNOW : GRASS;
        const sub = beach || desert ? SAND : DIRT;
        const cave = h > SEA + 1 ? h - 1 : h - 4; // unter Meeren nicht durchstossen

        for (let y = 0; y <= Math.max(h, SEA); y++) {
          let id;
          if (y === 0) id = BEDROCK;
          else if (y > h) id = WATER;
          else if (y === h) id = surface;
          else if (y >= h - 3) id = sub;
          else id = STONE;

          if (y > 2 && y <= cave && id !== WATER) {
            const a = this.nCave.noise3(wx * 0.045, y * 0.07, wz * 0.045);
            const b = this.nCave.noise3(wx * 0.045 + 77, y * 0.07 + 31, wz * 0.045 - 53);
            const big = this.nCave.noise3(wx * 0.022 - 40, y * 0.035, wz * 0.022 + 12);
            if ((Math.abs(a) < 0.055 && Math.abs(b) < 0.055) || (big > 0.5 && y < h - 6)) id = AIR;
          }
          blocks[lx + lz * CS + y * 256] = id;
        }
      }
    }

    this.placeOres(chunk, x0, z0);

    // Baeume: auch die aus Nachbar-Chunks, soweit sie hereinragen.
    for (let tx = x0 - 2; tx < x0 + CS + 2; tx++) {
      for (let tz = z0 - 2; tz < z0 + CS + 2; tz++) {
        const { h, biome } = colAt(tx - x0, tz - z0);
        if (h <= SEA + 1 || biome === BIOME.WUESTE || (biome === BIOME.SCHNEE && h >= 40)) continue;
        if (hash2(tx, tz, this.seed ^ 0x7777) >= TREE_DENSITY[biome]) continue;
        const height = 4 + Math.floor(hash2(tx, tz, this.seed ^ 0x1234) * 3);
        this.growTree(chunk, x0, z0, tx, tz, h + 1, height);
      }
    }

    // Hohes Gras und Blumen auf freien Grasflaechen.
    for (let lz = 0; lz < CS; lz++) {
      for (let lx = 0; lx < CS; lx++) {
        const { h, biome } = colAt(lx, lz);
        const i = lx + lz * CS + h * 256;
        if (h >= CH - 1 || blocks[i] !== GRASS || blocks[i + 256] !== AIR) continue;
        const r = hash2(x0 + lx, z0 + lz, this.seed ^ 0x9e37);
        if (r < 0.012) {
          blocks[i + 256] = hash2(x0 + lx, z0 + lz, this.seed ^ 0x51) < 0.5 ? POPPY : DANDELION;
        } else if (r < 0.012 + GRASS_DENSITY[biome]) {
          blocks[i + 256] = TALL_GRASS;
        }
      }
    }

    // Aenderungen des Spielers einarbeiten.
    const edits = this.edits.get(key);
    if (edits) {
      for (const [idx, v] of edits) {
        blocks[idx] = v & 255;
        chunk.meta[idx] = v >> 8;
        if (LIGHT[v & 255]) chunk.emitters.add(idx);
      }
    }

    for (let i = 0; i < CS * CS; i++) this.recomputeTop(chunk, i);
    chunk.ready = true;
    chunk.dirty = true;
    this.chunks.set(key, chunk);
    return chunk;
  }

  /**
   * Erzadern als kurze Zufallswege durch den Stein. Jede Ader gehoert zu einem
   * Ursprungs-Chunk und wird von dessen Nachbarn genauso berechnet – so passen die
   * Chunks nahtlos aneinander.
   */
  placeOres(chunk, x0, z0) {
    for (let ocx = chunk.cx - 1; ocx <= chunk.cx + 1; ocx++) {
      for (let ocz = chunk.cz - 1; ocz <= chunk.cz + 1; ocz++) {
        const rnd = mulberry32((hash2(ocx, ocz, this.seed ^ 0x5eed) * 4294967296) | 0);
        for (let i = 0; i < 14; i++) this.vein(chunk, x0, z0, rnd, ocx, ocz, COAL_ORE, 5, 52, 12);
        for (let i = 0; i < 7; i++) this.vein(chunk, x0, z0, rnd, ocx, ocz, IRON_ORE, 3, 34, 7);
      }
    }
  }

  vein(chunk, x0, z0, rnd, ocx, ocz, ore, yMin, yMax, size) {
    let x = ocx * CS + rnd() * CS;
    let y = yMin + rnd() * (yMax - yMin);
    let z = ocz * CS + rnd() * CS;
    for (let k = 0; k < size; k++) {
      const lx = Math.floor(x) - x0;
      const ly = Math.floor(y);
      const lz = Math.floor(z) - z0;
      if (lx >= 0 && lx < CS && lz >= 0 && lz < CS && ly > 0 && ly < CH) {
        const i = lx + lz * CS + ly * 256;
        if (chunk.blocks[i] === STONE) chunk.blocks[i] = ore;
      }
      const a = rnd() * Math.PI * 2;
      x += Math.cos(a) * 0.9;
      z += Math.sin(a) * 0.9;
      y += (rnd() * 2 - 1) * 0.6;
    }
  }

  growTree(chunk, x0, z0, tx, tz, y0, height) {
    const put = (x, y, z, id, onlyAir) => {
      const lx = x - x0;
      const lz = z - z0;
      if (lx < 0 || lz < 0 || lx >= CS || lz >= CS || y < 0 || y >= CH) return;
      const i = lx + lz * CS + y * 256;
      if (onlyAir && chunk.blocks[i] !== AIR) return;
      chunk.blocks[i] = id;
    };
    const topY = y0 + height - 1;
    for (let dy = -2; dy <= 1; dy++) {
      const r = dy >= 0 ? 1 : 2;
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          const corner = Math.abs(dx) === r && Math.abs(dz) === r;
          if (corner && (r === 1 || hash2(tx + dx, tz + dz, this.seed + dy) < 0.5)) continue;
          put(tx + dx, topY + dy + 1, tz + dz, LEAVES, true);
        }
      }
    }
    for (let y = y0; y <= topY; y++) put(tx, y, tz, LOG, false);
  }

  recomputeTop(chunk, col) {
    let y = CH - 1;
    while (y >= 0 && !OPAQUE[chunk.blocks[col + y * 256]]) y--;
    chunk.top[col] = y;
  }

  /** Gibt Chunks frei, die zu weit weg sind. */
  unloadFar(pcx, pcz, radius) {
    for (const [key, c] of this.chunks) {
      if (Math.max(Math.abs(c.cx - pcx), Math.abs(c.cz - pcz)) > radius) {
        this.chunks.delete(key);
        if (this.onChunkRemoved) this.onChunkRemoved(c);
      }
    }
  }

  /* ---------------------------------------------------- Bloecke lesen -- */

  getBlock(x, y, z) {
    if (y < 0) return STONE;
    if (y >= CH) return AIR;
    const c = this.chunks.get(chunkKey(x >> 4, z >> 4));
    if (!c) return AIR;
    return c.blocks[(x & 15) + (z & 15) * CS + y * 256];
  }

  getMeta(x, y, z) {
    if (y < 0 || y >= CH) return 0;
    const c = this.chunks.get(chunkKey(x >> 4, z >> 4));
    return c ? c.meta[(x & 15) + (z & 15) * CS + y * 256] : 0;
  }

  isLoaded(x, z) {
    return this.chunks.has(chunkKey(x >> 4, z >> 4));
  }

  /** Fuer die Physik: Kollisionsblock? Nicht geladene Bereiche zaehlen als fest. */
  solidAt(x, y, z) {
    if (y < 0) return true;
    if (y >= CH) return false;
    const c = this.chunks.get(chunkKey(x >> 4, z >> 4));
    if (!c) return true;
    return SOLID[c.blocks[(x & 15) + (z & 15) * CS + y * 256]] === 1;
  }

  isWater(x, y, z) {
    return this.getBlock(x, y, z) === WATER;
  }

  flowAt(x, y, z) {
    return flowAt(this, x, y, z);
  }

  /** Oberster fester Block einer Spalte (zum Aufsetzen nach dem Laden). */
  surfaceY(x, z) {
    for (let y = CH - 1; y >= 0; y--) if (this.solidAt(x, y, z)) return y;
    return 0;
  }

  /** Sieht diese Zelle den Himmel (nichts Lichtundurchlaessiges darueber)? */
  canSeeSky(x, y, z) {
    const c = this.chunks.get(chunkKey(x >> 4, z >> 4));
    return !c || y > c.top[(x & 15) + (z & 15) * CS];
  }

  /** Licht in einer Zelle (je 0..15). Ohne berechnetes Licht nur grob geschaetzt. */
  lightAt(x, y, z) {
    if (y >= CH) return { sky: 15, block: 0 };
    if (y < 0) return { sky: 0, block: 0 };
    const c = this.chunks.get(chunkKey(x >> 4, z >> 4));
    if (!c) return { sky: 15, block: 0 };
    const i = (x & 15) + (z & 15) * CS + y * 256;
    if (c.light) return { sky: c.light[i] >> 4, block: c.light[i] & 15 };
    return { sky: y > c.top[(x & 15) + (z & 15) * CS] ? 15 : 0, block: 0 };
  }

  /* --------------------------------------------------- Bloecke setzen -- */

  /** Setzt einen Block samt Zustand, merkt die Aenderung und loest Folgen aus. */
  setBlock(x, y, z, id, meta = 0) {
    if (y < 1 || y >= CH) return false; // Grundgestein bleibt, oben ist Luft
    const cx = x >> 4;
    const cz = z >> 4;
    const c = this.chunks.get(chunkKey(cx, cz));
    if (!c) return false;
    const lx = x & 15;
    const lz = z & 15;
    const idx = lx + lz * CS + y * 256;
    const old = c.blocks[idx];
    if (old === id && c.meta[idx] === meta) return false;
    c.blocks[idx] = id;
    c.meta[idx] = meta;

    const key = chunkKey(cx, cz);
    let e = this.edits.get(key);
    if (!e) this.edits.set(key, (e = new Map()));
    e.set(idx, id | (meta << 8));

    if (LIGHT[old]) c.emitters.delete(idx);
    if (LIGHT[id]) c.emitters.add(idx);
    const lightChanged = OPAQUE[old] !== OPAQUE[id] || LIGHT[old] !== LIGHT[id];
    if (OPAQUE[old] !== OPAQUE[id]) this.recomputeTop(c, lx + lz * CS);
    this.markDirty(c, lx, lz, lightChanged);
    this.changed(x, y, z);
    return true;
  }

  /**
   * Chunk neu vernetzen lassen. Aendert sich Licht, koennen auch Nachbarn betroffen
   * sein (Licht reicht 15 Bloecke weit), sonst nur an der Kante wegen der Schatten.
   */
  markDirty(c, lx, lz, light) {
    c.dirty = true;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (!dx && !dz) continue;
        const edge =
          (dx === 0 || (dx < 0 ? lx === 0 : lx === CS - 1)) &&
          (dz === 0 || (dz < 0 ? lz === 0 : lz === CS - 1));
        if (!light && !edge) continue;
        const n = this.getChunk(c.cx + dx, c.cz + dz);
        if (n) n.dirty = true;
      }
    }
  }

  /** Folgen einer Aenderung: Wasser rechnet neu, haltlose Bloecke fallen ab, Sand faellt. */
  changed(x, y, z) {
    this.wakeWater(x, y, z);
    this.wakeWater(x, y + 1, z);
    this.wakeWater(x, y - 1, z);
    for (const [dx, dz] of H4) this.wakeWater(x + dx, y, z + dz);
    if (this.depth > 80) return; // Sicherung gegen sehr lange Kettenreaktionen
    this.depth++;
    this.checkSupport(x, y + 1, z);
    for (const [dx, dz] of H4) this.checkSupport(x + dx, y, z + dz);
    this.checkFall(x, y, z);
    this.checkFall(x, y + 1, z);
    this.depth--;
  }

  wakeWater(x, y, z) {
    if (this.getBlock(x, y, z) === WATER) this.scheduleFluid(x, y, z);
  }

  /** Haelt der Block noch? Pflanzen brauchen Erde, Fackeln einen festen Block. */
  hasSupport(x, y, z, id, meta) {
    const def = BLOCKS[id];
    if (!def || !def.support) return true;
    if (def.support === 'ground') {
      const below = this.getBlock(x, y - 1, z);
      return below === GRASS || below === DIRT;
    }
    const wall = TORCH_WALL[meta];
    return wall
      ? SOLID[this.getBlock(x + wall[0], y, z + wall[2])] === 1
      : SOLID[this.getBlock(x, y - 1, z)] === 1;
  }

  checkSupport(x, y, z) {
    const id = this.getBlock(x, y, z);
    if (!BLOCKS[id] || !BLOCKS[id].support) return;
    if (this.hasSupport(x, y, z, id, this.getMeta(x, y, z))) return;
    this.setBlock(x, y, z, AIR);
    this.events.push({ type: 'drop', id, x, y, z });
  }

  checkFall(x, y, z) {
    const id = this.getBlock(x, y, z);
    if (!BLOCKS[id] || !BLOCKS[id].gravity) return;
    const fallsInto = (b) => b === AIR || b === WATER || WASHABLE[b] === 1;
    let ty = y;
    while (ty > 1 && fallsInto(this.getBlock(x, ty - 1, z))) ty--;
    if (ty === y) return;
    const meta = this.getMeta(x, y, z);
    // Erst ankommen, dann loslassen – sonst landet der naechste Sand am selben Fleck.
    this.setBlock(x, ty, z, id, meta);
    this.setBlock(x, y, z, AIR);
  }

  /* ------------------------------------------------------------ Wasser -- */

  scheduleFluid(x, y, z, delay = TICK_DELAY) {
    const k = posKey(x, y, z);
    if (!this.fluidQueue.has(k)) this.fluidQueue.set(k, { x, y, z, due: this.tickCount + delay });
  }

  /** Ein Welttick: geplante Wasser-Updates abarbeiten (mit Obergrenze pro Tick). */
  tick(budget = 400) {
    this.tickCount++;
    let n = 0;
    for (const [k, e] of this.fluidQueue) {
      if (e.due > this.tickCount) break; // gleiche Verzoegerung -> Einfuegereihenfolge = Faelligkeit
      this.fluidQueue.delete(k);
      waterTick(this, e.x, e.y, e.z);
      if (++n >= budget) break;
    }
  }

  /* ------------------------------------------------------- Strahlentest -- */

  /**
   * Gitter-Durchlauf (Amanatides & Woo): liefert den ersten Block samt Flaechennormale.
   * Kleine Bloecke (Fackeln, Pflanzen) werden mit ihrer echten Form getroffen. Mit
   * `fluids` zaehlen auch Wasserquellen als Treffer (fuer den Eimer).
   */
  raycast(ox, oy, oz, dx, dy, dz, maxDist, fluids = false) {
    let x = Math.floor(ox);
    let y = Math.floor(oy);
    let z = Math.floor(oz);
    const sx = Math.sign(dx);
    const sy = Math.sign(dy);
    const sz = Math.sign(dz);
    const tdx = dx !== 0 ? Math.abs(1 / dx) : Infinity;
    const tdy = dy !== 0 ? Math.abs(1 / dy) : Infinity;
    const tdz = dz !== 0 ? Math.abs(1 / dz) : Infinity;
    let tx = dx > 0 ? (x + 1 - ox) * tdx : dx < 0 ? (ox - x) * tdx : Infinity;
    let ty = dy > 0 ? (y + 1 - oy) * tdy : dy < 0 ? (oy - y) * tdy : Infinity;
    let tz = dz > 0 ? (z + 1 - oz) * tdz : dz < 0 ? (oz - z) * tdz : Infinity;
    let nx = 0;
    let ny = 0;
    let nz = 0;
    let t = 0;

    while (t <= maxDist) {
      const id = this.getBlock(x, y, z);
      if (id === WATER) {
        if (fluids && this.getMeta(x, y, z) === SOURCE) {
          return { x, y, z, nx, ny, nz, id, meta: 0, dist: t, box: null };
        }
      } else if (id !== AIR) {
        const meta = this.getMeta(x, y, z);
        const box = blockBox(id, meta);
        if (!box) return { x, y, z, nx, ny, nz, id, meta, dist: t, box: null };
        const r = rayBox(
          ox,
          oy,
          oz,
          dx,
          dy,
          dz,
          x + box[0],
          y + box[1],
          z + box[2],
          x + box[3],
          y + box[4],
          z + box[5],
        );
        if (r && r.t <= maxDist) {
          return { x, y, z, nx: r.n[0], ny: r.n[1], nz: r.n[2], id, meta, dist: r.t, box };
        }
      }
      if (tx < ty && tx < tz) {
        x += sx;
        t = tx;
        tx += tdx;
        nx = -sx;
        ny = nz = 0;
      } else if (ty < tz) {
        y += sy;
        t = ty;
        ty += tdy;
        ny = -sy;
        nx = nz = 0;
      } else {
        z += sz;
        t = tz;
        tz += tdz;
        nz = -sz;
        nx = ny = 0;
      }
    }
    return null;
  }

  /** Freie Sicht zwischen zwei Punkten (nur lichtundurchlaessige Bloecke stoeren). */
  canSee(ax, ay, az, bx, by, bz) {
    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-6) return true;
    const steps = Math.ceil(len * 2);
    for (let i = 1; i < steps; i++) {
      const f = i / steps;
      if (
        OPAQUE[
          this.getBlock(Math.floor(ax + dx * f), Math.floor(ay + dy * f), Math.floor(az + dz * f))
        ]
      ) {
        return false;
      }
    }
    return true;
  }

  /* --------------------------------------------------------- Speichern -- */

  serializeEdits() {
    const out = [];
    for (const [key, map] of this.edits) {
      if (!map.size) continue;
      const cx = Math.floor(key / 65536) - 32768;
      const cz = (key % 65536) - 32768;
      const flat = [];
      for (const [idx, v] of map) flat.push(idx, v);
      out.push([cx, cz, flat]);
    }
    return out;
  }

  static parseEdits(list) {
    const edits = new Map();
    for (const [cx, cz, flat] of list || []) {
      const m = new Map();
      for (let i = 0; i + 1 < flat.length; i += 2) m.set(flat[i], flat[i + 1]);
      edits.set(chunkKey(cx, cz), m);
    }
    return edits;
  }
}
