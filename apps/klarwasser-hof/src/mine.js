// Die alte Mine: Ebenen werden bei jedem Besuch neu gegraben.
// Höhlenform per zellulärem Automaten, dann Steine, Erze, Leiter und Schleime.

import { T } from './daten.js';
import { ganz, waehle } from './zufall.js';

export const MINE_TIEFE = 30;
const W = 26;
const H = 20;

export const BAENDER = [
  { name: 'Lehm', dunkel: 0.42 },
  { name: 'Frost', dunkel: 0.52 },
  { name: 'Glut', dunkel: 0.58 },
];
export const bandVon = (n) => (n <= 10 ? 0 : n <= 20 ? 1 : 2);

export const STEINARTEN = {
  stein: { hp: [1, 2, 3] },
  kohle: { hp: [2, 2, 3] },
  kupfer: { hp: [2, 2, 2] },
  eisen: { hp: [3, 3, 3] },
  gold: { hp: [4, 4, 4] },
  edel: { hp: [3, 3, 3] },
};

export const MONSTER = {
  schleim: { name: 'Grüner Schleim', hp: 24, schaden: 5, tempo: 34, xp: 3, farbe: '#6fc94a', art: 'schleim', beute: [['schleim', 0.8, 1, 2], ['kohle', 0.06, 1, 1]] },
  fledermaus: { name: 'Fledermaus', hp: 22, schaden: 6, tempo: 42, xp: 6, farbe: '#6a5878', art: 'fledermaus', fliegt: true, beute: [['fluegel', 0.35, 1, 1]] },
  frostschleim: { name: 'Frostschleim', hp: 55, schaden: 9, tempo: 38, xp: 8, farbe: '#7cc4ee', art: 'schleim', beute: [['schleim', 0.8, 1, 3], ['traene', 0.05, 1, 1]] },
  frostfledermaus: { name: 'Frostfledermaus', hp: 40, schaden: 10, tempo: 50, xp: 10, farbe: '#8eb0d0', art: 'fledermaus', fliegt: true, beute: [['fluegel', 0.4, 1, 2]] },
  glutschleim: { name: 'Glutschleim', hp: 90, schaden: 15, tempo: 42, xp: 15, farbe: '#e8603e', art: 'schleim', beute: [['schleim', 0.8, 2, 3], ['kohle', 0.2, 1, 2]] },
  glutfledermaus: { name: 'Glutfledermaus', hp: 70, schaden: 16, tempo: 58, xp: 18, farbe: '#b84a32', art: 'fledermaus', fliegt: true, beute: [['fluegel', 0.5, 1, 2], ['rubin', 0.02, 1, 1]] },
};

const MONSTER_JE_BAND = [
  ['schleim', 'schleim', 'fledermaus'],
  ['frostschleim', 'frostschleim', 'frostfledermaus'],
  ['glutschleim', 'glutschleim', 'glutfledermaus'],
];

export const SCHATZ = {
  10: [{ id: 'kupferbarren', n: 5 }, { id: 'amethyst', n: 1 }],
  20: [{ id: 'eisenbarren', n: 5 }, { id: 'smaragd', n: 1 }],
  30: [{ id: 'goldbarren', n: 5 }, { id: 'diamant', n: 1 }],
};

function steinArt(n, r) {
  const x = r();
  let p = 0;
  const kupfer = n <= 10 ? 0.11 : n <= 20 ? 0.05 : 0.03;
  const eisen = n < 8 ? 0 : n <= 20 ? 0.08 : 0.06;
  const gold = n < 18 ? 0 : 0.07;
  const kohle = n < 3 ? 0.02 : 0.05;
  const edel = 0.018;
  if (x < (p += kupfer)) return 'kupfer';
  if (x < (p += eisen)) return 'eisen';
  if (x < (p += gold)) return 'gold';
  if (x < (p += kohle)) return 'kohle';
  if (x < (p += edel)) return 'edel';
  return 'stein';
}

function automat(r) {
  let g = [];
  for (let y = 0; y < H; y++) {
    g.push([]);
    for (let x = 0; x < W; x++) {
      const rand = x === 0 || y === 0 || x === W - 1 || y === H - 1;
      g[y].push(rand || r() < 0.43);
    }
  }
  for (let runde = 0; runde < 4; runde++) {
    const neu = g.map((z) => z.slice());
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (g[y + dy][x + dx]) n++;
        neu[y][x] = n >= 5;
      }
    }
    g = neu;
  }
  return g;
}

function groessteFlaeche(g) {
  const gesehen = new Set();
  let beste = [];
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (g[y][x] || gesehen.has(y * W + x)) continue;
      const flaeche = [];
      const offen = [[x, y]];
      gesehen.add(y * W + x);
      while (offen.length) {
        const [cx, cy] = offen.pop();
        flaeche.push([cx, cy]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (g[ny][nx] || gesehen.has(ny * W + nx)) continue;
          gesehen.add(ny * W + nx);
          offen.push([nx, ny]);
        }
      }
      if (flaeche.length > beste.length) beste = flaeche;
    }
  }
  return beste;
}

/**
 * Gräbt Ebene n. `schatzGeholt` sind die Ebenen, deren Truhe schon leer ist.
 * Ergebnis: { def, welt, start, monster }
 */
export function mineErzeugen(n, r, schatzGeholt = []) {
  let g;
  let flaeche;
  for (let versuch = 0; versuch < 30; versuch++) {
    g = automat(r);
    flaeche = groessteFlaeche(g);
    if (flaeche.length >= 150) break;
  }
  const inFlaeche = new Set(flaeche.map(([x, y]) => y * W + x));
  // Alles außerhalb der größten Fläche wird Fels — so ist jeder Stein erreichbar.
  const grid = [];
  for (let y = 0; y < H; y++) {
    let z = '';
    for (let x = 0; x < W; x++) z += inFlaeche.has(y * W + x) ? 'm' : '#';
    grid.push(z);
  }
  const offen = (x, y) => inFlaeche.has(y * W + x);

  // Start: ein Feld mit möglichst viel Platz drumherum
  const kandidaten = flaeche.filter(([x, y]) => offen(x, y + 1) && offen(x - 1, y) && offen(x + 1, y) && offen(x, y - 1));
  const [sx, sy] = waehle(r, kandidaten.length ? kandidaten : flaeche);
  const start = { x: sx, y: offen(sx, sy + 1) ? sy + 1 : sy };

  const objekte = {};
  const abstand = (x, y) => Math.abs(x - sx) + Math.abs(y - sy);
  const dichte = 0.17 + n * 0.003;
  const steine = [];
  for (const [x, y] of flaeche) {
    if (abstand(x, y) <= 2) continue;
    if (r() < dichte) {
      const art = steinArt(n, r);
      const o = { t: 'mstein', art, hp: STEINARTEN[art].hp[bandVon(n) ], v: ganz(r, 0, 3) };
      objekte[`${x},${y}`] = o;
      steine.push([x, y, o]);
    }
  }
  if (n < MINE_TIEFE && steine.length) {
    const fern = steine.filter(([x, y]) => abstand(x, y) >= 6);
    const [, , o] = waehle(r, fern.length ? fern : steine);
    o.leiter = true;
  }

  // Schatztruhe auf jeder zehnten Ebene
  if (SCHATZ[n] && !schatzGeholt.includes(n)) {
    const frei = flaeche.filter(([x, y]) => !objekte[`${x},${y}`] && abstand(x, y) >= 4);
    if (frei.length) {
      const [x, y] = waehle(r, frei);
      objekte[`${x},${y}`] = { t: 'schatz', ebene: n };
    }
  }

  const band = bandVon(n);
  const monster = [];
  const anzahl = Math.min(2 + Math.floor(n / 3), 9);
  const platz = flaeche.filter(([x, y]) => !objekte[`${x},${y}`] && abstand(x, y) >= 6);
  for (let i = 0; i < anzahl && platz.length; i++) {
    const idx = Math.floor(r() * platz.length);
    const [x, y] = platz.splice(idx, 1)[0];
    let typ = waehle(r, MONSTER_JE_BAND[band]);
    if (typ.includes('fledermaus') && n < 4) typ = MONSTER_JE_BAND[band][0];
    monster.push(neuesMonster(typ, x, y));
  }

  const def = {
    id: `mine${n}`, name: `Mine · Ebene ${n}`, w: W, h: H, grid, aussen: false, innen: 'mine', rand: 'mine',
    ebene: n, band, dunkel: BAENDER[band].dunkel,
    gebaeude: [], warps: [], sammel: [],
    deko: [{ typ: 'leiter_auf', x: sx, y: sy, aktion: 'mine_auf', begehbar: true }],
  };
  return { def, welt: { objekte, felder: {}, funde: [] }, start, monster };
}

export function neuesMonster(typ, tx, ty) {
  const d = MONSTER[typ];
  return {
    typ, x: tx * T + T / 2, y: ty * T + T / 2 + 2, hp: d.hp, max: d.hp,
    vx: 0, vy: 0, uhr: Math.random() * 1.5, phase: 'ruhe', stoss: 0, blitz: 0, anim: Math.random() * 10,
  };
}

/** Was ein zerschlagener Stein hergibt. */
export function steinErtrag(art, n, r, bergbau) {
  const band = bandVon(n);
  const items = [];
  let xp = 1;
  const bonus = () => (r() < bergbau * 0.04 ? 1 : 0);
  if (art === 'stein') {
    items.push({ id: 'stein', n: 1 + bonus() });
    if (r() < 0.04 + band * 0.02) items.push({ id: 'kohle', n: 1 });
    if (r() < 0.02) items.push({ id: waehle(r, [['erdkristall', 'quarz'], ['traene', 'quarz'], ['quarz', 'topas']][band]), n: 1 });
  } else if (art === 'kohle') {
    items.push({ id: 'kohle', n: ganz(r, 1, 2) + bonus() });
    xp = 3;
  } else if (art === 'kupfer') {
    items.push({ id: 'kupfererz', n: ganz(r, 1, 3) + bonus() });
    xp = 5;
  } else if (art === 'eisen') {
    items.push({ id: 'eisenerz', n: ganz(r, 1, 3) + bonus() });
    xp = 12;
  } else if (art === 'gold') {
    items.push({ id: 'golderz', n: ganz(r, 1, 3) + bonus() });
    xp = 18;
  } else if (art === 'edel') {
    const pool = [['amethyst', 'topas', 'quarz'], ['topas', 'smaragd', 'amethyst'], ['rubin', 'smaragd', 'topas']][band];
    let id = waehle(r, pool);
    if (band === 2 && r() < 0.12) id = 'diamant';
    items.push({ id, n: 1 });
    xp = 12;
  }
  return { items, xp };
}

/**
 * Ein Schritt Monster-Verhalten. `frei(px, py, fliegt)` sagt, ob ein Punkt begehbar ist.
 * Gibt true zurück, wenn das Monster den Spieler berührt.
 */
export function monsterSchritt(m, dt, spieler, frei) {
  const d = MONSTER[m.typ];
  m.anim += dt;
  if (m.blitz > 0) m.blitz -= dt;
  const dx = spieler.x - m.x;
  const dy = spieler.y - m.y;
  const dist = Math.hypot(dx, dy) || 1;
  const jagt = dist < 9 * T;

  if (m.stoss > 0) {
    m.stoss -= dt;
  } else if (d.art === 'schleim') {
    m.uhr -= dt;
    if (m.phase === 'ruhe' && m.uhr <= 0) {
      m.phase = 'sprung';
      m.uhr = 0.38;
      const ziel = jagt ? Math.atan2(dy, dx) : Math.random() * Math.PI * 2;
      m.vx = Math.cos(ziel) * d.tempo * 2.2;
      m.vy = Math.sin(ziel) * d.tempo * 2.2;
    } else if (m.phase === 'sprung' && m.uhr <= 0) {
      m.phase = 'ruhe';
      m.uhr = 0.5 + Math.random() * 0.7;
      m.vx = 0;
      m.vy = 0;
    }
  } else {
    // Fledermaus: flattert in Wellen auf den Spieler zu
    const winkel = jagt ? Math.atan2(dy, dx) + Math.sin(m.anim * 3) * 0.6 : m.anim * 0.8;
    m.vx = Math.cos(winkel) * d.tempo;
    m.vy = Math.sin(winkel) * d.tempo;
  }

  const nx = m.x + m.vx * dt;
  if (frei(nx, m.y, d.fliegt)) m.x = nx; else m.vx = -m.vx * 0.5;
  const ny = m.y + m.vy * dt;
  if (frei(m.x, ny, d.fliegt)) m.y = ny; else m.vy = -m.vy * 0.5;

  return Math.hypot(spieler.x - m.x, spieler.y - 4 - m.y) < 11;
}
