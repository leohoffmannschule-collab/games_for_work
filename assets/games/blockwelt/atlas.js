/**
 * Zeichnet alle Grafiken selbst – es werden keine Bilder geladen oder mitgeliefert:
 *  - den Block-Atlas (16x16-Kacheln, 8 je Zeile), inklusive Risse beim Abbauen,
 *  - Symbole fuer Gegenstaende (Werkzeuge, Essen, Eimer …) und Bloecke,
 *  - Herzen, Hunger und Luftblasen fuer die Anzeige,
 *  - den Atlas fuer Tiere und Zombies.
 */

import { TILES, TILE_PX, ATLAS_COLS, BLOCKS } from './blocks.js';
import {
  ITEMS,
  STICK,
  COAL,
  IRON_INGOT,
  APPLE,
  PORK,
  PORK_COOKED,
  BEEF,
  STEAK,
  MUTTON,
  MUTTON_COOKED,
  ROTTEN_FLESH,
  BUCKET,
  WATER_BUCKET,
} from './items.js';
import { ENTITY_TILES, ENTITY_COLS } from './models.js';
import { mulberry32 } from './noise.js';

const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));

/** Fuellt eine Kachel pixelweise: fn(x, y, rnd) -> [r, g, b, a?]. */
function paint(g, index, cols, fn, seed) {
  const rnd = mulberry32(seed * 7919 + 13);
  const ox = (index % cols) * TILE_PX;
  const oy = Math.floor(index / cols) * TILE_PX;
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

const stone = (x, y, rnd) => {
  const k = (rnd() - 0.5) * 30;
  const speck = rnd() < 0.06 ? -22 : 0;
  return [126 + k + speck, 126 + k + speck, 128 + k + speck];
};

/** Erz: Stein mit Klumpen in der Farbe des Erzes. */
const ore = (r, g, b) => {
  const spots = [
    [4, 4, 2.1],
    [11, 5, 1.8],
    [6, 11, 2.0],
    [12, 12, 1.6],
    [9, 8, 1.2],
  ];
  return (x, y, rnd) => {
    const base = stone(x, y, rnd);
    for (const [sx, sy, sr] of spots) {
      const d = Math.hypot(x - sx, y - sy);
      if (d < sr) {
        const k = (rnd() - 0.5) * 24 - (d > sr - 0.7 ? 18 : 0);
        return [r + k, g + k, b + k];
      }
    }
    return base;
  };
};

const planks = (x, y, rnd) => {
  const k = (rnd() - 0.5) * 14;
  const seam = y % 4 === 3 ? -34 : 0;
  const joint = (y >> 2) % 2 === 0 ? (x === 5 ? -28 : 0) : x === 12 ? -28 : 0;
  return [166 + k + seam + joint, 132 + k + seam + joint, 80 + k + seam + joint];
};

const cobble = (x, y, rnd) => {
  const cell = ((x >> 2) * 5 + (y >> 2) * 3) % 4;
  const edge = x % 4 === 0 || y % 4 === 0 ? -26 : 0;
  const k = (rnd() - 0.5) * 20 + cell * 7;
  return [108 + k + edge, 108 + k + edge, 110 + k + edge];
};

const smoothStone = (x, y, rnd) => {
  const k = (rnd() - 0.5) * 12;
  const edge = x === 0 || y === 0 || x === 15 || y === 15 ? -30 : 0;
  return [140 + k + edge, 140 + k + edge, 142 + k + edge];
};

const NONE = [0, 0, 0, 0];

/** Pflanze: Stiel plus Bluete (r, g, b), sonst durchsichtig. */
const flower = (petal, center, radius) => (x, y, rnd) => {
  const d = Math.hypot(x - 7.5, y - 5);
  if (d < 0.9) return center;
  if (d < radius) {
    const k = (rnd() - 0.5) * 30;
    return [petal[0] + k, petal[1] + k, petal[2] + k];
  }
  if ((x === 7 || x === 8) && y > 6) return [50, 130 + (rnd() - 0.5) * 30, 40];
  if (y === 11 && x >= 9 && x <= 11) return [60, 145, 45];
  if (y === 12 && x >= 4 && x <= 6) return [60, 145, 45];
  return NONE;
};

/** Reihenfolge, in der Risse beim Abbauen wachsen (Pixelindizes). */
const CRACK_RANK = (() => {
  const rnd = mulberry32(4242);
  const rank = new Int16Array(256).fill(-1);
  let n = 0;
  const add = (x, y) => {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix > 15 || iy > 15) return;
    const k = iy * 16 + ix;
    if (rank[k] < 0) rank[k] = n++;
  };
  const branches = Array.from({ length: 5 }, (_, i) => ({
    x: 7.5,
    y: 7.5,
    a: (i / 5) * Math.PI * 2 + rnd() * 0.5,
  }));
  add(7.5, 7.5);
  for (let step = 0; step < 12; step++) {
    for (const b of branches) {
      b.a += (rnd() - 0.5) * 0.9;
      b.x += Math.cos(b.a);
      b.y += Math.sin(b.a);
      add(b.x, b.y);
    }
    if (step % 3 === 2 && branches.length < 11) {
      const p = branches[Math.floor(rnd() * branches.length)];
      branches.push({ x: p.x, y: p.y, a: p.a + (rnd() < 0.5 ? 1.1 : -1.1) });
    }
  }
  rank.total = n;
  return rank;
})();

const crack = (stage) => (x, y) => {
  const r = CRACK_RANK[y * 16 + x];
  if (r < 0 || r >= ((stage + 1) / 10) * CRACK_RANK.total) return NONE;
  return [30, 30, 30, 210];
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
  stone,
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
    if (rnd() < 0.16) return NONE;
    return [48 + k, 118 + k, 38 + k];
  },
  planks,
  cobble,
  glass: (x, y) => {
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
  coal_ore: ore(38, 38, 40),
  iron_ore: ore(214, 172, 140),
  table_top: (x, y, rnd) => {
    const p = planks(x, y, rnd);
    const frame = x === 0 || y === 0 || x === 15 || y === 15;
    const grid = (x === 5 || x === 10 || y === 5 || y === 10) && x > 0 && y > 0 && x < 15 && y < 15;
    if (frame) return [p[0] - 50, p[1] - 45, p[2] - 30];
    if (grid) return [p[0] - 35, p[1] - 30, p[2] - 20];
    return p;
  },
  table_side: (x, y, rnd) => {
    const p = planks(x, y, rnd);
    if (y < 3) return [p[0] - 40, p[1] - 35, p[2] - 25];
    // Saege und Hammer an der Wand.
    if (y >= 5 && y <= 11 && (x === 3 || x === 4) && y !== 5) return [150, 150, 155];
    if (y === 5 && x >= 2 && x <= 6) return [110, 80, 45];
    if (x >= 10 && x <= 12 && y >= 5 && y <= 6) return [140, 140, 145];
    if (x === 11 && y >= 7 && y <= 12) return [110, 80, 45];
    return p;
  },
  furnace_front: (x, y, rnd) => {
    const c = smoothStone(x, y, rnd);
    if (x >= 4 && x <= 11 && y >= 8 && y <= 12) return y === 8 ? [40, 40, 42] : [22, 20, 20];
    if (x >= 4 && x <= 11 && y >= 3 && y <= 4) return [c[0] - 30, c[1] - 30, c[2] - 30];
    return c;
  },
  furnace_side: smoothStone,
  furnace_top: (x, y, rnd) => {
    const k = (rnd() - 0.5) * 14;
    return [150 + k, 150 + k, 152 + k];
  },
  torch: (x, y, rnd) => {
    if (x < 7 || x > 8) return NONE;
    if (y < 4) return NONE;
    if (y === 4) return [255, 240, 170];
    if (y === 5) return [255, 214, 90];
    if (y === 6) return x === 7 ? [255, 180, 60] : [240, 150, 40];
    if (y === 7) return [200, 120, 40];
    const k = (rnd() - 0.5) * 16;
    return [110 + k, 82 + k, 46 + k];
  },
  wool: (x, y, rnd) => {
    const k = (rnd() - 0.5) * 18 + (((x * 3 + y * 5) % 4) - 1.5) * 4;
    return [236 + k, 236 + k, 232 + k];
  },
  tall_grass: (x, y, rnd) => {
    const blades = [
      [2, 6],
      [4, 3],
      [6, 7],
      [8, 2],
      [10, 5],
      [12, 4],
      [14, 8],
    ];
    for (const [bx, top] of blades) {
      const lean = Math.round((15 - y) * (bx < 8 ? -0.12 : 0.12));
      if (x === bx + lean && y >= top) {
        const k = (rnd() - 0.5) * 30;
        return [70 + k, 140 + k + (15 - y) * 2, 45 + k];
      }
    }
    return NONE;
  },
  poppy: flower([210, 40, 40], [30, 20, 20], 3.2),
  dandelion: flower([250, 215, 40], [230, 170, 20], 2.6),
};
for (let i = 0; i < 10; i++) PAINTERS['destroy_' + i] = crack(i);

let atlasCanvas = null;

export function buildAtlas() {
  if (atlasCanvas) return atlasCanvas;
  const size = TILE_PX * ATLAS_COLS;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  TILES.forEach((name, i) => paint(g, i, ATLAS_COLS, PAINTERS[name], i + 1));
  atlasCanvas = canvas;
  return canvas;
}

/* ------------------------------------------------------- Wesen-Texturen -- */

const eyes = (base, eyeRow) => (x, y, rnd) => {
  if (y === eyeRow && (x === 3 || x === 12)) return [20, 20, 20];
  if (y === eyeRow && (x === 4 || x === 11)) return [240, 240, 240];
  return base(x, y, rnd);
};

const ENTITY_PAINTERS = {
  pig_skin: noisy(238, 160, 160, 18),
  pig_face: eyes(noisy(238, 160, 160, 14), 6),
  pig_snout: (x, y, rnd) => {
    if ((x === 5 || x === 10) && y >= 6 && y <= 9) return [120, 60, 60];
    return noisy(250, 190, 190, 12)(x, y, rnd);
  },
  cow_hide: (x, y, rnd) => {
    const patch = Math.sin(x * 0.7 + y * 0.3) + Math.cos(y * 0.9 - x * 0.2) > 0.9;
    const k = (rnd() - 0.5) * 14;
    return patch ? [235 + k, 232 + k, 226 + k] : [64 + k, 48 + k, 40 + k];
  },
  cow_face: (x, y, rnd) => {
    const k = (rnd() - 0.5) * 12;
    if (y >= 11) return [190 + k, 150 + k, 140 + k];
    if (y === 5 && (x === 3 || x === 12)) return [15, 15, 15];
    if (x >= 6 && x <= 9 && y < 11) return [235 + k, 232 + k, 226 + k];
    return [64 + k, 48 + k, 40 + k];
  },
  horn: noisy(220, 214, 196, 12),
  wool: (x, y, rnd) => {
    const k = (rnd() - 0.5) * 18 + (((x * 3 + y * 5) % 4) - 1.5) * 5;
    return [236 + k, 236 + k, 230 + k];
  },
  sheep_face: eyes(noisy(214, 180, 158, 14), 7),
  sheep_skin: noisy(214, 180, 158, 16),
  zombie_skin: noisy(86, 140, 78, 22),
  zombie_face: (x, y, rnd) => {
    if (y >= 6 && y <= 7 && ((x >= 3 && x <= 4) || (x >= 11 && x <= 12))) return [14, 14, 14];
    if (y === 11 && x >= 6 && x <= 9) return [50, 80, 45];
    return noisy(86, 140, 78, 18)(x, y, rnd);
  },
  zombie_shirt: noisy(38, 150, 160, 22),
  zombie_arm: (x, y, rnd) => (y < 6 ? noisy(38, 150, 160, 22) : noisy(86, 140, 78, 22))(x, y, rnd),
  zombie_pants: noisy(62, 62, 150, 20),
};

let entityCanvas = null;

export function buildEntityAtlas() {
  if (entityCanvas) return entityCanvas;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TILE_PX * ENTITY_COLS;
  const g = canvas.getContext('2d');
  ENTITY_TILES.forEach((name, i) => paint(g, i, ENTITY_COLS, ENTITY_PAINTERS[name], 100 + i));
  entityCanvas = canvas;
  return canvas;
}

/* --------------------------------------------------- Gegenstands-Symbole -- */

/** Zeichnet mit Linien und Flaechen und macht danach harte Pixelkanten daraus. */
function pixelIcon(draw) {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const g = c.getContext('2d');
  draw(g);
  const img = g.getImageData(0, 0, 16, 16);
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] < 110 ? 0 : 255;
  g.putImageData(img, 0, 0);
  return c;
}

function line(g, x0, y0, x1, y1, w, color) {
  g.strokeStyle = color;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.stroke();
}

function blob(g, x, y, rx, ry, color, rot = 0) {
  g.fillStyle = color;
  g.beginPath();
  g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  g.fill();
}

const TIER_COLORS = [
  ['#c9a266', '#6e5126'],
  ['#a2a2a2', '#585858'],
  ['#f0f0f0', '#9c9c9c'],
];

function handle(g) {
  line(g, 2.5, 13.5, 9.5, 6.5, 2.6, '#4b3519');
  line(g, 2.5, 13.5, 9.5, 6.5, 1.2, '#93703c');
}

const TOOL_DRAW = {
  pickaxe(g, [light, dark]) {
    handle(g);
    g.lineCap = 'round';
    g.strokeStyle = dark;
    g.lineWidth = 3.2;
    g.beginPath();
    g.moveTo(3.5, 4);
    g.quadraticCurveTo(13.5, 2.5, 12, 12.5);
    g.stroke();
    g.strokeStyle = light;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(4, 4);
    g.quadraticCurveTo(13, 3, 11.8, 12);
    g.stroke();
  },
  axe(g, [light, dark]) {
    handle(g);
    g.fillStyle = dark;
    g.beginPath();
    g.moveTo(6.5, 3);
    g.lineTo(11, 1.5);
    g.lineTo(14.5, 5);
    g.lineTo(13, 9.5);
    g.lineTo(9.5, 8.5);
    g.closePath();
    g.fill();
    g.fillStyle = light;
    g.beginPath();
    g.moveTo(8, 3.5);
    g.lineTo(11, 2.8);
    g.lineTo(13.4, 5.2);
    g.lineTo(12.3, 8.3);
    g.lineTo(10, 7.6);
    g.closePath();
    g.fill();
  },
  shovel(g, [light, dark]) {
    handle(g);
    blob(g, 11.3, 4.7, 2.7, 3.9, dark, Math.PI / 4);
    blob(g, 11.3, 4.7, 1.6, 2.7, light, Math.PI / 4);
  },
  sword(g, [light, dark]) {
    line(g, 2.5, 13.5, 4.8, 11.2, 2.4, '#4b3519');
    line(g, 2.8, 9.2, 6.8, 13.2, 2.2, '#3d2c15');
    line(g, 5.2, 10.8, 13.5, 2.5, 3.1, dark);
    line(g, 5.6, 10.4, 13, 3, 1.3, light);
  },
};

const ITEM_DRAW = {
  [STICK]: (g) => {
    line(g, 3, 13, 13, 3, 2.6, '#4b3519');
    line(g, 3, 13, 13, 3, 1.2, '#93703c');
  },
  [COAL]: (g) => {
    blob(g, 8, 8.5, 5.2, 4.6, '#262626');
    blob(g, 6.5, 7, 1.4, 1, '#4d4d4d');
    blob(g, 10, 10, 1.2, 0.9, '#4d4d4d');
  },
  [IRON_INGOT]: (g) => {
    g.fillStyle = '#8f8f8f';
    g.beginPath();
    g.moveTo(1.5, 10);
    g.lineTo(8.5, 5.5);
    g.lineTo(14.5, 8);
    g.lineTo(7.5, 12.8);
    g.closePath();
    g.fill();
    g.fillStyle = '#e6e6e6';
    g.beginPath();
    g.moveTo(3.5, 9.6);
    g.lineTo(8.6, 6.6);
    g.lineTo(12.6, 8.2);
    g.lineTo(7.4, 11.3);
    g.closePath();
    g.fill();
  },
  [APPLE]: (g) => {
    blob(g, 8, 9.5, 5, 4.8, '#b81c22');
    blob(g, 6.2, 8, 1.4, 1.2, '#ef6a6a');
    line(g, 8, 3, 8.6, 5.6, 1.2, '#5b3b18');
    blob(g, 10.4, 3.8, 1.8, 0.9, '#3f9a32', -0.4);
  },
  [BUCKET]: (g) => bucket(g, null),
  [WATER_BUCKET]: (g) => bucket(g, '#3463d6'),
};

function meat(raw, cooked, fat) {
  return (g) => {
    blob(g, 8.5, 8.5, 6, 4.6, raw, -0.5);
    blob(g, 9, 8, 4, 2.6, cooked, -0.5);
    if (fat) line(g, 5, 11, 12, 5.5, 1, fat);
    blob(g, 3.8, 12.2, 1.6, 1.4, '#efe6d2');
  };
}
ITEM_DRAW[PORK] = meat('#e88f92', '#f4b8b6', '#fbd9d6');
ITEM_DRAW[PORK_COOKED] = meat('#9a5a2f', '#c88650', null);
ITEM_DRAW[BEEF] = meat('#b5302a', '#d9564c', '#f0d8d0');
ITEM_DRAW[STEAK] = meat('#6e3f1f', '#99602f', null);
ITEM_DRAW[MUTTON] = meat('#cf5454', '#e27d77', '#f3dcd4');
ITEM_DRAW[MUTTON_COOKED] = meat('#8d5530', '#b9783f', null);
ITEM_DRAW[ROTTEN_FLESH] = (g) => {
  blob(g, 8.3, 8.6, 6, 4.4, '#7a7f37', -0.4);
  blob(g, 6, 7.5, 1.8, 1.3, '#5a4a28');
  blob(g, 10.8, 9.8, 1.6, 1.1, '#9da84a');
};

function bucket(g, water) {
  g.strokeStyle = '#5e5e5e';
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(8, 6, 5, Math.PI, 0);
  g.stroke();
  g.fillStyle = '#6f6f6f';
  g.beginPath();
  g.moveTo(2.5, 6);
  g.lineTo(13.5, 6);
  g.lineTo(11.8, 14.5);
  g.lineTo(4.2, 14.5);
  g.closePath();
  g.fill();
  g.fillStyle = '#c4c4c4';
  g.beginPath();
  g.moveTo(3.8, 7);
  g.lineTo(12.2, 7);
  g.lineTo(10.9, 13.4);
  g.lineTo(5.1, 13.4);
  g.closePath();
  g.fill();
  if (water) blob(g, 8, 6.6, 5, 1.3, water);
}

const iconCache = new Map();

/** Symbol eines Gegenstands oder Blocks als Data-URL (32 x 32 Pixel). */
export function itemIcon(id) {
  if (iconCache.has(id)) return iconCache.get(id);
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const it = ITEMS[id];
  const def = it && it.block ? BLOCKS[it.block] : null;

  if (def && def.model === 'cube') {
    isoCube(g, def);
  } else if (def) {
    // Fackeln und Pflanzen: die Kachel flach zeigen.
    const atlas = buildAtlas();
    const t = def.side;
    g.drawImage(
      atlas,
      (t % ATLAS_COLS) * TILE_PX,
      Math.floor(t / ATLAS_COLS) * TILE_PX,
      16,
      16,
      0,
      0,
      32,
      32,
    );
  } else if (it && it.tool) {
    g.drawImage(
      pixelIcon((pg) => TOOL_DRAW[it.tool.type](pg, TIER_COLORS[it.tool.tier])),
      0,
      0,
      32,
      32,
    );
  } else if (ITEM_DRAW[id]) {
    g.drawImage(pixelIcon(ITEM_DRAW[id]), 0, 0, 32, 32);
  }
  const url = c.toDataURL();
  iconCache.set(id, url);
  return url;
}

/** Kleiner Isometrie-Wuerfel aus drei Kacheln. */
function isoCube(g, def) {
  const atlas = buildAtlas();
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
  tile(def.front, 14, 7, 0, 14, 2, 9, 0.22);
  tile(def.side, 14, -7, 0, 14, 16, 16, 0.4);
}

/** Frueherer Name, Bloecke und Gegenstaende teilen sich jetzt dieselben Symbole. */
export const blockIcon = itemIcon;

/* ----------------------------------------------------------- Anzeige-Symbole -- */

const HUD_MAPS = {
  heart: [
    '.##...##.',
    '#hr#.#rr#',
    '#rrr#rrr#',
    '#rrrrrrr#',
    '.#rrrrr#.',
    '..#rrr#..',
    '...#r#...',
    '....#....',
  ],
  food: [
    '.....###.',
    '....#mmm#',
    '...#mmmm#',
    '..#mmmmm#',
    '.#mmmmm#.',
    '#bb#mm#..',
    '#bbb##...',
    '.##......',
  ],
  bubble: ['..###..', '.#fff#.', '#fwfff#', '#fffff#', '#fffff#', '.#fff#.', '..###..'],
};
const HUD_COLORS = {
  '#': [24, 6, 6],
  r: [214, 30, 30],
  h: [255, 150, 150],
  m: [190, 108, 44],
  b: [236, 226, 200],
  w: [255, 255, 255],
  f: [120, 170, 255],
  '.': null,
};

const hudCache = new Map();

/**
 * Herz, Keule oder Luftblase in den Zustaenden 'voll', 'halb' und 'leer'.
 * Leere Haelften werden dunkel gezeichnet wie im Vorbild.
 */
export function hudIcon(kind, state = 'full') {
  const key = kind + ':' + state;
  if (hudCache.has(key)) return hudCache.get(key);
  const map = HUD_MAPS[kind];
  const w = map[0].length;
  const h = map.length;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = map[y][x];
      let col = HUD_COLORS[ch];
      if (!col) continue;
      const empty =
        state === 'empty' || (state === 'half' && (kind === 'food' ? x < w / 2 : x >= w / 2));
      if (empty && ch !== '#') col = [50, 18, 18];
      const i = (y * w + x) * 4;
      img.data[i] = col[0];
      img.data[i + 1] = col[1];
      img.data[i + 2] = col[2];
      img.data[i + 3] = ch === 'f' ? 160 : 255;
    }
  }
  g.putImageData(img, 0, 0);
  const url = c.toDataURL();
  hudCache.set(key, url);
  return url;
}
