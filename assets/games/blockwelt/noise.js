/**
 * Zufall und Rauschen fuer die Weltgenerierung. Alles ist rein deterministisch:
 * dieselbe Zahl (Seed) ergibt immer dieselbe Welt, auf jedem Rechner.
 */

/** Kleiner, schneller Zufallsgenerator (liefert Zahlen in [0, 1)). */
export function mulberry32(seed) {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Zustandsloser Hash aus Position und Seed, Ergebnis in [0, 1). */
export function hash2(x, z, seed) {
  let h =
    Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (t, a, b) => a + t * (b - a);

function grad(h, x, y, z) {
  h &= 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return (h & 1 ? -u : u) + (h & 2 ? -v : v);
}

/** Perlin-Rauschen (verbesserte Variante) mit eigener Permutationstabelle. */
export class Perlin {
  constructor(seed) {
    const rnd = mulberry32(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = (rnd() * (i + 1)) | 0;
      const t = p[i];
      p[i] = p[j];
      p[j] = t;
    }
    this.p = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.p[i] = p[i & 255];
  }

  /** Wert in etwa [-1, 1]. */
  noise3(x, y, z) {
    const p = this.p;
    const X = Math.floor(x);
    const Y = Math.floor(y);
    const Z = Math.floor(z);
    x -= X;
    y -= Y;
    z -= Z;
    const xi = X & 255;
    const yi = Y & 255;
    const zi = Z & 255;
    const u = fade(x);
    const v = fade(y);
    const w = fade(z);
    const A = p[xi] + yi;
    const AA = p[A] + zi;
    const AB = p[A + 1] + zi;
    const B = p[xi + 1] + yi;
    const BA = p[B] + zi;
    const BB = p[B + 1] + zi;
    return lerp(
      w,
      lerp(
        v,
        lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)),
        lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z)),
      ),
      lerp(
        v,
        lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)),
        lerp(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1)),
      ),
    );
  }

  noise2(x, y) {
    return this.noise3(x, y, 0.37);
  }

  /** Mehrere Oktaven uebereinander; Ergebnis bleibt grob in [-1, 1]. */
  fbm2(x, y, octaves = 4) {
    let sum = 0;
    let amp = 1;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += amp * this.noise2(x, y);
      norm += amp;
      amp *= 0.5;
      x *= 2;
      y *= 2;
    }
    return sum / norm;
  }
}
