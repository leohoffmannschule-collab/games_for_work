/**
 * Zeichnet alle Bloecke selbst: ein 64x64-Atlas aus 16x16-Kacheln, komplett
 * prozedural – es werden keine Bilder geladen oder mitgeliefert.
 */

import { TILES, TILE_PX, ATLAS_COLS, BLOCKS } from './blocks.js';
import { mulberry32 } from './noise.js';

const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));

/** Fuellt eine Kachel pixelweise: fn(x, y, rnd) -> [r, g, b, a?]. */
function paint(g, index, fn, seed) {
  const rnd = mulberry32(seed * 7919 + 13);
  const ox = (index % ATLAS_COLS) * TILE_PX;
  const oy = Math.floor(index / ATLAS_COLS) * TILE_PX;
  const img = g.createImageData(TILE_PX, TILE_PX);
  for (let y = 0; y < TILE_PX; y++) {
    for (let x = 0; x < TILE_PX; x++) {
      const [r, gr, b, a = 255] = fn(x, y, rnd);
      const i = (y * TILE_PX + x) * 4;
      img.data[i] = clamp(r);
      img.data[i + 1] = clamp(gr);
      img.data[i + 2] = clamp(b);
      img.data[i + 3] = clamp(a);
    }
  }
  g.putImageData(img, ox, oy);
}

/** Grundfarbe mit zufaelliger Helligkeitsstreuung. */
const noisy = (r, g, b, spread) => (x, y, rnd) => {
  const k = (rnd() - 0.5) * spread;
  return [r + k, g + k, b + k];
};

const PAINTERS = {
  grass_top: noisy(96, 158, 52, 36),
  grass_side: (x, y, rnd) => {
    const depth = 3 + ((x * 7 + 3) % 3);
    const k = (rnd() - 0.5) * 30;
    if (y < depth) return [96 + k, 158 + k, 52 + k];
    return [134 + k, 96 + k, 67 + k];
  },
  dirt: noisy(134, 96, 67, 34),
  stone: (x, y, rnd) => {
    const k = (rnd() - 0.5) * 30;
    const speck = rnd() < 0.06 ? -22 : 0;
    return [126 + k + speck, 126 + k + speck, 128 + k + speck];
  },
  sand: noisy(219, 207, 160, 22),
  water: (x, y, rnd) => {
    const k = (rnd() - 0.5) * 14;
    return [48 + k, 92 + k, 205 + k, 165];
  },
  log_side: (x, y, rnd) => {
    const stripe = (x % 4 === 0 ? -16 : 0) + (rnd() - 0.5) * 14;
    return [104 + stripe, 80 + stripe, 48 + stripe];
  },
  log_top: (x, y, rnd) => {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    const ring = Math.floor(d) % 2 === 0 ? 0 : -18;
    const k = (rnd() - 0.5) * 10;
    if (d > 6.5) return [92 + k, 70 + k, 42 + k];
    return [176 + ring + k, 140 + ring + k, 86 + ring + k];
  },
  leaves: (x, y, rnd) => {
    const k = (rnd() - 0.5) * 44;
    if (rnd() < 0.16) return [0, 0, 0, 0];
    return [48 + k, 118 + k, 38 + k];
  },
  planks: (x, y, rnd) => {
    const k = (rnd() - 0.5) * 14;
    const seam = y % 4 === 3 ? -34 : 0;
    const joint = (y >> 2) % 2 === 0 ? (x === 5 ? -28 : 0) : x === 12 ? -28 : 0;
    return [166 + k + seam + joint, 132 + k + seam + joint, 80 + k + seam + joint];
  },
  cobble: (x, y, rnd) => {
    const cell = ((x >> 2) * 5 + (y >> 2) * 3) % 4;
    const edge = x % 4 === 0 || y % 4 === 0 ? -26 : 0;
    const k = (rnd() - 0.5) * 20 + cell * 7;
    return [108 + k + edge, 108 + k + edge, 110 + k + edge];
  },
  glass: (x, y, rnd) => {
    const border = x === 0 || y === 0 || x === 15 || y === 15;
    if (border) return [214, 232, 240, 255];
    const glint = (x === 3 && y >= 3 && y <= 6) || (y === 3 && x >= 3 && x <= 6);
    if (glint) return [255, 255, 255, 230];
    return [200, 225, 240, 0];
  },
  brick: (x, y) => {
    const row = y >> 2;
    const mortar = y % 4 === 3 || (x + (row % 2 ? 4 : 0)) % 8 === 7;
    const k = ((x * 13 + y * 7) % 9) * 2;
    return mortar ? [196, 190, 180] : [158 + k, 70 + k / 2, 56 + k / 2];
  },
  snow: noisy(244, 248, 252, 14),
  bedrock: (x, y, rnd) => {
    const k = (rnd() - 0.5) * 60;
    return [58 + k, 58 + k, 62 + k];
  },
  lamp: (x, y, rnd) => {
    const frame = x % 8 === 0 || y % 8 === 0;
    const k = (rnd() - 0.5) * 16;
    return frame ? [168 + k, 118 + k, 44 + k] : [255, 226 + k, 140 + k];
  },
};

let atlasCanvas = null;

export function buildAtlas() {
  if (atlasCanvas) return atlasCanvas;
  const size = TILE_PX * ATLAS_COLS;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  TILES.forEach((name, i) => paint(g, i, PAINTERS[name], i + 1));
  atlasCanvas = canvas;
  return canvas;
}

/* -------------------------------------------------------------- Symbole -- */

const iconCache = new Map();

/** Kleiner Isometrie-Wuerfel fuer Hotbar und Inventar, als Data-URL. */
export function blockIcon(id) {
  if (iconCache.has(id)) return iconCache.get(id);
  const atlas = buildAtlas();
  const def = BLOCKS[id];
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;

  const tile = (index, a, b, cc, d, e, f, shade) => {
    g.save();
    g.setTransform(a / TILE_PX, b / TILE_PX, cc / TILE_PX, d / TILE_PX, e, f);
    g.drawImage(
      atlas,
      (index % ATLAS_COLS) * TILE_PX,
      Math.floor(index / ATLAS_COLS) * TILE_PX,
      TILE_PX,
      TILE_PX,
      0,
      0,
      TILE_PX,
      TILE_PX,
    );
    if (shade) {
      g.fillStyle = `rgba(0,0,0,${shade})`;
      g.fillRect(0, 0, TILE_PX, TILE_PX);
    }
    g.restore();
  };
  tile(def.top, 14, -7, 14, 7, 2, 9, 0);
  tile(def.side, 14, 7, 0, 14, 2, 9, 0.22);
  tile(def.side, 14, -7, 0, 14, 16, 16, 0.4);

  const url = c.toDataURL();
  iconCache.set(id, url);
  return url;
}
