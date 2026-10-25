/**
 * Die Welt: Chunks, Gelaendeerzeugung, Bloecke lesen/setzen, Strahlentest.
 *
 * Ein Chunk ist 16 x 64 x 16 Bloecke gross und liegt als flaches Uint8Array vor
 * (Index = x + z*16 + y*256). Die Welt ist in x/z unbegrenzt; Chunks werden um den
 * Spieler herum erzeugt und wieder verworfen. Nur Aenderungen des Spielers
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
  OPAQUE,
  SOLID,
} from './blocks.js';
import { Perlin, hash2 } from './noise.js';

export const CS = 16; // Chunk-Kantenlaenge
export const CH = 64; // Welthoehe
export const SEA = 20; // Meeresspiegel (oberster Wasserblock)

const BIOME = { WIESE: 0, WALD: 1, WUESTE: 2, SCHNEE: 3 };
const TREE_DENSITY = [0.004, 0.032, 0, 0.006];
const PAD = 3; // Rand, in dem Baeume aus Nachbar-Chunks hineinragen koennen

const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const chunkKey = (cx, cz) => (cx + 32768) * 65536 + (cz + 32768);

export class Chunk {
  constructor(cx, cz) {
    this.cx = cx;
    this.cz = cz;
    this.blocks = new Uint8Array(CS * CS * CH);
    /** Hoehe des obersten lichtundurchlaessigen Blocks je Spalte (-1 = keiner). */
    this.top = new Int16Array(CS * CS).fill(-1);
    this.ready = false;
    this.dirty = true;
    this.mesh = null;
  }
}

export class World {
  constructor(seed, edits = null) {
    this.seed = seed | 0;
    this.chunks = new Map();
    /** chunkKey -> Map(lokaler Index -> Block-ID), alles was der Spieler veraendert hat. */
    this.edits = edits || new Map();
    this.onChunkRemoved = null;

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

    for (let lz = 0; lz < CS; lz++) {
      for (let lx = 0; lx < CS; lx++) {
        const wx = x0 + lx;
        const wz = z0 + lz;
        const { h, biome } = cols[lx + PAD + (lz + PAD) * W];
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

    // Baeume: auch die aus Nachbar-Chunks, soweit sie hereinragen.
    for (let tx = x0 - 2; tx < x0 + CS + 2; tx++) {
      for (let tz = z0 - 2; tz < z0 + CS + 2; tz++) {
        const { h, biome } = cols[tx - x0 + PAD + (tz - z0 + PAD) * W];
        if (h <= SEA + 1 || biome === BIOME.WUESTE || (biome === BIOME.SCHNEE && h >= 40)) continue;
        if (hash2(tx, tz, this.seed ^ 0x7777) >= TREE_DENSITY[biome]) continue;
        const height = 4 + Math.floor(hash2(tx, tz, this.seed ^ 0x1234) * 3);
        this.growTree(chunk, x0, z0, tx, tz, h + 1, height);
      }
    }

    // Aenderungen des Spielers einarbeiten.
    const edits = this.edits.get(key);
    if (edits) for (const [idx, id] of edits) blocks[idx] = id;

    for (let i = 0; i < CS * CS; i++) this.recomputeTop(chunk, i);
    chunk.ready = true;
    chunk.dirty = true;
    this.chunks.set(key, chunk);
    return chunk;
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

  /** Oberster fester Block einer Spalte (zum Aufsetzen nach dem Laden). */
  surfaceY(x, z) {
    for (let y = CH - 1; y >= 0; y--) if (this.solidAt(x, y, z)) return y;
    return 0;
  }

  /* --------------------------------------------------- Bloecke setzen -- */

  /** Setzt einen Block und merkt die Aenderung fuer den Spielstand. */
  setBlock(x, y, z, id) {
    if (y < 1 || y >= CH) return false; // Grundgestein bleibt, oben ist Luft
    const cx = x >> 4;
    const cz = z >> 4;
    const c = this.chunks.get(chunkKey(cx, cz));
    if (!c) return false;
    const lx = x & 15;
    const lz = z & 15;
    const idx = lx + lz * CS + y * 256;
    if (c.blocks[idx] === id) return false;
    c.blocks[idx] = id;

    const key = chunkKey(cx, cz);
    let e = this.edits.get(key);
    if (!e) this.edits.set(key, (e = new Map()));
    e.set(idx, id);

    this.recomputeTop(c, lx + lz * CS);
    this.markDirty(c, lx, lz);
    return true;
  }

  markDirty(c, lx, lz) {
    c.dirty = true;
    const dxs = lx === 0 ? [-1, 0] : lx === CS - 1 ? [0, 1] : [0];
    const dzs = lz === 0 ? [-1, 0] : lz === CS - 1 ? [0, 1] : [0];
    for (const dx of dxs) {
      for (const dz of dzs) {
        if (!dx && !dz) continue;
        const n = this.getChunk(c.cx + dx, c.cz + dz);
        if (n) n.dirty = true;
      }
    }
  }

  /* ------------------------------------------------------- Strahlentest -- */

  /**
   * Gitter-Durchlauf (Amanatides & Woo): liefert den ersten Block, der kein Wasser
   * oder Luft ist, samt Flaechennormale. Richtung muss normiert sein.
   */
  raycast(ox, oy, oz, dx, dy, dz, maxDist) {
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
      if (id !== AIR && id !== WATER) return { x, y, z, nx, ny, nz, id, dist: t };
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

  /* --------------------------------------------------------- Speichern -- */

  serializeEdits() {
    const out = [];
    for (const [key, map] of this.edits) {
      if (!map.size) continue;
      const cx = Math.floor(key / 65536) - 32768;
      const cz = (key % 65536) - 32768;
      const flat = [];
      for (const [idx, id] of map) flat.push(idx, id);
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
