// Seedbarer Zufall (mulberry32) und kleine Helfer.

export function zufall(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ganz = (r, a, b) => a + Math.floor(r() * (b - a + 1));
export const waehle = (r, liste) => liste[Math.floor(r() * liste.length)];

/** Fester Pseudozufall pro Rasterfeld — für Grasbüschel, Steinchen, Varianten. */
export function hash(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
