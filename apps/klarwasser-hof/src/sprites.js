// Pixelkunst-Kern: Leinwände, Zeichen-Grundfunktionen und die Bild-Register.
// Alles wird einmal auf kleine Leinwände gezeichnet und dann zwischengespeichert.
//
// Die Kunst selbst liegt in den Bereichen (src/bereiche/*/grafik.js); hier stehen nur die
// Mechanik, der Boden (Grund-Bodenzeichen der karten.js), Figuren, Porträts und Symbole.
// Fehlt ein Bild, zeichnet der Kern ein sichtbares Ersatzbild (magenta/schwarz kariert).
//
// Register (Name → Bild), gefüllt über die Funktionen in Klammern:
//   KUNST[art]            Gegenstand 16×16: (g, bild, metall)                    (kunst)
//   OBJEKT_BILD[t]        Objekt auf der Karte (welt.objekte)                    (objektKunst)
//   DEKO_BILD[typ]        Deko einer Karte                                       (dekoKunst)
//   GEBAEUDE_BILD[typ]    Gebäude einer Karte                                    (gebaeudeKunst)
//   GEBAEUDE_LICHT[typ]   Fensterpunkte für Licht bei Nacht                      (gebaeudeKunst: licht)
//   BODEN_BILD[z]         Bodenkachel, auch `z:rand` (z. B. '#:wald')            (bodenKunst)
//   PFLANZEN_BILD[name]   Wuchsform oder Pflanzen-ID, Phasen 2–4                 (pflanzenKunst)
//   MONSTER_BILD[art]     Monster 16×16, auch je Monster-ID                      (monsterKunst)
//   TIER_BILD[art]        Tier, nach links schauend                              (tierKunst)
//   SYMBOL[art]           Symbole der Oberfläche 16×16                           (symbolKunst)

import { T, ITEMS, PFLANZEN, WERKZEUG_STUFEN } from './daten.js';
import { hash } from './zufall.js';

const cache = new Map();
export const UMRISS = '#2b1d1c';

export function leinwand(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return [c, g];
}
/** Einmal zeichnen, danach aus dem Zwischenspeicher. Schlüssel global eindeutig wählen. */
export function gecacht(schluessel, fn) {
  let c = cache.get(schluessel);
  if (!c) { c = fn(); cache.set(schluessel, c); }
  return c;
}

// ─── Farben ─────────────────────────────────────────────────────────────────

function rgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function hex(r, g, b) {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}
export function mische(a, b, t) {
  const A = rgb(a);
  const B = rgb(b);
  return hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
export const hell = (f, t = 0.3) => mische(f, '#fffbea', t);
export const dunkel = (f, t = 0.3) => mische(f, '#1c1226', t);

// ─── Zeichenwerkzeug ────────────────────────────────────────────────────────
// P Pixel · R Rechteck · E gefüllte Ellipse · L Linie (Dicke d) · POLY Vieleck · kugel schattiert

export function P(g, x, y, f) { g.fillStyle = f; g.fillRect(x, y, 1, 1); }
export function R(g, x, y, w, h, f) { g.fillStyle = f; g.fillRect(x, y, w, h); }
export function E(g, cx, cy, rx, ry, f) {
  g.fillStyle = f;
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) g.fillRect(x, y, 1, 1);
    }
  }
}
export function L(g, x0, y0, x1, y1, f, d = 1) {
  g.fillStyle = f;
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / n);
    const y = Math.round(y0 + ((y1 - y0) * i) / n);
    g.fillRect(x - Math.floor((d - 1) / 2), y - Math.floor((d - 1) / 2), d, d);
  }
}
export function POLY(g, pts, f) {
  g.fillStyle = f;
  const ys = pts.map((p) => p[1]);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
    const yc = y + 0.5;
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const a = Math.round(xs[i]);
      const b = Math.round(xs[i + 1]);
      if (b > a) g.fillRect(a, y, b - a, 1);
    }
  }
}
export function kugel(g, cx, cy, rx, ry, f) {
  E(g, cx, cy, rx, ry, dunkel(f, 0.32));
  E(g, cx - 0.5, cy - 0.6, rx - 0.7, ry - 0.8, f);
  E(g, cx - rx * 0.38, cy - ry * 0.42, Math.max(0.8, rx * 0.3), Math.max(0.8, ry * 0.26), hell(f, 0.4));
}
/** Dunkle Kontur um alle gezeichneten Pixel — der typische Pixelkunst-Rand. */
export function umriss(c, farbe = UMRISS) {
  const g = c.getContext('2d');
  const { width: w, height: h } = c;
  const bild = g.getImageData(0, 0, w, h);
  const d = bild.data;
  const [r, gg, b] = rgb(farbe);
  const voll = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 40;
  const rand = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (voll(x, y)) continue;
      if (voll(x - 1, y) || voll(x + 1, y) || voll(x, y - 1) || voll(x, y + 1)) rand.push((y * w + x) * 4);
    }
  }
  for (const i of rand) { d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 235; }
  g.putImageData(bild, 0, 0);
  return c;
}
export function gespiegelt(c) {
  const [n, g] = leinwand(c.width, c.height);
  g.translate(c.width, 0);
  g.scale(-1, 1);
  g.drawImage(c, 0, 0);
  return n;
}

// Winzige Pixelschrift für Schilder (3×5, Großbuchstaben)
const SCHRIFT = {
  A: ['010', '101', '111', '101', '101'], C: ['011', '100', '100', '100', '011'], D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '110', '100', '111'], G: ['011', '100', '101', '101', '011'], H: ['101', '101', '111', '101', '101'],
  I: ['111', '010', '010', '010', '111'], K: ['101', '110', '100', '110', '101'], L: ['100', '100', '100', '100', '111'],
  M: ['101', '111', '111', '101', '101'], N: ['110', '101', '101', '101', '101'], O: ['010', '101', '101', '101', '010'],
  R: ['110', '101', '110', '101', '101'], S: ['011', '100', '010', '001', '110'], T: ['111', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '011'], Z: ['111', '001', '010', '100', '111'], Ä: ['101', '010', '101', '111', '101'],
  Ü: ['101', '000', '101', '101', '011'], ' ': ['000', '000', '000', '000', '000'],
};
export function schrift(g, text, x, y, f) {
  for (const ch of text) {
    const z = SCHRIFT[ch] || SCHRIFT[' '];
    for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (z[j][i] === '1') P(g, x + i, y + j, f);
    x += 4;
  }
}

// ─── Gemeinsame Farben ──────────────────────────────────────────────────────

export const HOLZ = '#9a6a3a';
export const HOLZ_D = '#6e4626';
export const BLATT = '#4f9a3a';
export const BLATT_D = '#356f2a';
export const BLATT_H = '#7cc25a';

/** Gras je Jahreszeit (Boden '.', Ränder von Wegen und Sand). */
export const GRAS = {
  fruehling: { b: '#78ad4c', d: '#5e913e', h: '#93c662', blume: ['#f4f0e0', '#f2d24a', '#ec97be'] },
  sommer: { b: '#5f9c3d', d: '#4a8032', h: '#7bb352', blume: ['#f2d24a', '#f6f2e8'] },
  herbst: { b: '#a69f4a', d: '#88813b', h: '#c2b35c', blume: ['#d8742f', '#b8452f'] },
  winter: { b: '#e4ebf1', d: '#c8d4df', h: '#ffffff', blume: [] },
};
/** Laub je Jahreszeit (Bäume, Büsche); im Winter kahl (null). */
export const LAUB = {
  fruehling: { b: '#5fa84a', d: '#3e7a34', h: '#8ccd68', bluete: '#f4c6d8' },
  sommer: { b: '#3f8a3a', d: '#2b682b', h: '#62a84a' },
  herbst: { b: '#d07a2a', d: '#a0501e', h: '#eaa24a' },
  winter: null,
};
/** Wasserfarbe je Gewässerart der Karte (`def.wasser`); unbekannt → fluss. */
export const WASSER_FARBE = { teich: '#4c97a6', fluss: '#4a89c2', meer: '#3d7dbf' };
/** Farben eines Innenraums (`def.innen`): Tapete, Leiste, Teppich. Fehlt er, gilt `standard`. */
export const INNEN_FARBEN = {
  standard: { tapete: '#d7b98c', streifen: '#c9a676', leiste: '#7a4e2c', teppich: '#a8453f', muster: '#e0b060' },
};
/** Farben der Minen-Bänder (Index = `def.band`); der Bereich mine füllt die Liste. */
export const MINE_FARBEN = [];
const MINE_STANDARD = { boden: '#7a7068', d: '#6a6058', h: '#8a8078', wand: '#3a3430', wandH: '#5a5450', stein: '#9a948c' };
export const mineFarben = (band) => MINE_FARBEN[band || 0] || MINE_FARBEN[0] || MINE_STANDARD;

// ─── Register ───────────────────────────────────────────────────────────────

export const KUNST = {};
export const OBJEKT_BILD = {};
export const DEKO_BILD = {};
export const GEBAEUDE_BILD = {};
export const GEBAEUDE_LICHT = {};
export const BODEN_BILD = {};
export const PFLANZEN_BILD = {};
export const MONSTER_BILD = {};
export const TIER_BILD = {};
export const SYMBOL = {};

function eintragen(reg, art, name, wert, opt = {}) {
  if (!name) throw new Error(`${art} ohne Namen.`);
  if (Object.hasOwn(reg, name) && !opt.ersetzen) throw new Error(`${art} „${name}" gibt es schon.`);
  reg[name] = wert;
  return wert;
}
/** Registrierfunktion: (name, wert, opt) oder ({ name: wert, … }, opt). */
function registrierer(reg, art, form = (w) => w) {
  return (name, wert, opt) => {
    if (typeof name === 'object') {
      for (const [n, w] of Object.entries(name)) eintragen(reg, art, n, form(w, n), wert);
      return undefined;
    }
    return eintragen(reg, art, name, form(wert, name), opt);
  };
}
const alsObjekt = (feld) => (w) => (typeof w === 'function' ? { [feld]: w } : w);

/** kunst('hacke', (g, bild, metall) => …) oder kunst({ hacke(g, b, m) {…}, … }). Bild 16×16, Umriss macht der Kern. */
export const kunst = registrierer(KUNST, 'Kunst');
/**
 * objektKunst(t, def) – Objekt auf der Karte. def ist eine Funktion (o, k) → Leinwand oder
 * { bild(o, k) → Leinwand } bzw. { b, h, schluessel(o, k), malen(g, o, k), umriss } und dazu:
 * tiefe (Sortier-y relativ zur Unterkante, Standard −1), schatten: [rx, ry, dy],
 * durchsichtig: [breite, hoehe] (halb durchsichtig, wenn die Spielerin dahinter steht),
 * versatz(o, k) → [dx, dy], wackeln (Standard true), danach(g, o, x, y, k).
 * k: { jz, band, nacht, s, t, tx, ty }.
 */
export const objektKunst = registrierer(OBJEKT_BILD, 'Objektbild', alsObjekt('bild'));
/**
 * dekoKunst(typ, def) – Deko. def ist eine Funktion (g, d, k) (Leinwand w×16) oder
 * { b(d), h, malen(g, d, k), umriss (Standard true), zustand(d, k) → Objekt (geht in den Schlüssel) }
 * bzw. { bild(d, k) → Leinwand }; dazu flach (sortiert nach der Oberkante), schatten,
 * durchsichtig, danach(g, d, x, y, k) wie bei objektKunst.
 * k: { jz, winter, nacht, innen, s, w, zustand }.
 */
export const dekoKunst = registrierer(DEKO_BILD, 'Dekobild', alsObjekt('malen'));
/**
 * gebaeudeKunst(typ, { b, h, malen(g, k), zustand(s) → Objekt, licht: [[px, py]…], umriss })
 * k: { jz, winter, nacht, zustand }. `licht` landet in GEBAEUDE_LICHT.
 */
export function gebaeudeKunst(typ, def, opt) {
  if (def.licht) eintragen(GEBAEUDE_LICHT, 'Gebäudelicht', typ, def.licht, opt);
  return eintragen(GEBAEUDE_BILD, 'Gebäudebild', typ, def, opt);
}
/** bodenKunst(z, (g, x0, y0, k) => …); `z:rand` gilt nur für Karten mit diesem `rand`. */
export const bodenKunst = registrierer(BODEN_BILD, 'Bodenbild');
/** pflanzenKunst(wuchs | pflanzenId, (g, k) => …) für Phase 2–4; k: { p, id, phase, f, fuss, gross }. */
export const pflanzenKunst = registrierer(PFLANZEN_BILD, 'Pflanzenbild');
/** monsterKunst(art | monsterId, (g, farbe, phase) => …), 16×16. */
export const monsterKunst = registrierer(MONSTER_BILD, 'Monsterbild');
/** tierKunst(art, { b, h, malen(g, schritt) }) – nach links schauend; rechts spiegelt der Kern. */
export const tierKunst = registrierer(TIER_BILD, 'Tierbild', alsObjekt('malen'));
/** symbolKunst(art, (g) => …), 16×16, für die Oberfläche. */
export const symbolKunst = registrierer(SYMBOL, 'Symbol');

// ─── Ersatzbild ─────────────────────────────────────────────────────────────

const gewarnt = new Set();
function fehltWarnung(was) {
  if (gewarnt.has(was)) return;
  gewarnt.add(was);
  console.warn(`Klarwasser: kein Bild für ${was} – Ersatzbild.`);
}
/** Magenta/schwarz kariert mit Rahmen; `c.ersatz` ist gesetzt (Tests prüfen das). */
export function ersatzBild(b = 16, h = 16, was = '') {
  return gecacht(`ersatz:${b}:${h}`, () => {
    const [c, g] = leinwand(b, h);
    for (let y = 0; y < h; y += 4) for (let x = 0; x < b; x += 4) R(g, x, y, 4, 4, ((x + y) / 4) % 2 ? '#141414' : '#ff00dc');
    g.strokeStyle = '#ff00dc';
    g.strokeRect(0.5, 0.5, b - 1, h - 1);
    c.ersatz = true;
    if (was) fehltWarnung(was);
    return c;
  });
}
function ersatz(b, h, was) {
  fehltWarnung(was);
  return ersatzBild(b, h);
}
function ersatzMalen(g, x0, y0, b, h) {
  for (let y = 0; y < h; y += 4) for (let x = 0; x < b; x += 4) R(g, x0 + x, y0 + y, 4, 4, ((x + y) / 4) % 2 ? '#141414' : '#ff00dc');
}

// ─── Gegenstände ────────────────────────────────────────────────────────────

/** Maler aus KUNST aufrufen (für Kunst, die andere Kunst wiederverwendet); fehlt er: Ersatz. */
export function kunstMalen(g, art, b = {}, metall = WERKZEUG_STUFEN[0].farbe) {
  const maler = KUNST[art];
  if (maler) maler(g, b, metall);
  else { fehltWarnung(`Kunst „${art}"`); ersatzMalen(g, 0, 0, 16, 16); }
}

/** Bild eines Gegenstands (16×16): KUNST[item.bild.art], sonst KUNST[itemId]. */
export function itemBild(slot, stufe = 0) {
  const it = ITEMS[slot.id];
  const von = slot.von || '';
  return gecacht(`item:${slot.id}:${von}:${stufe}`, () => {
    let b = it?.bild || {};
    const maler = KUNST[b.art] || KUNST[slot.id];
    if (!it || !maler) return ersatz(16, 16, `Gegenstand „${slot.id}"`);
    const [c, g] = leinwand(16, 16);
    if (it.kat === 'artisan' && slot.von && ITEMS[slot.von]?.bild) b = { ...b, f: ITEMS[slot.von].bild.f };
    const metall = WERKZEUG_STUFEN[stufe]?.farbe || WERKZEUG_STUFEN[0].farbe;
    maler(g, b, metall);
    return umriss(c);
  });
}

export function itemDatenUrl(slot, stufe = 0) {
  return gecacht(`url:${slot.id}:${slot.von || ''}:${stufe}`, () => itemBild(slot, stufe).toDataURL());
}

// ─── Boden ──────────────────────────────────────────────────────────────────

export function grasKachel(g, x0, y0, jz, tx, ty) {
  const p = GRAS[jz];
  R(g, x0, y0, T, T, p.b);
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(hash(tx, ty, i) * 16);
    const y = Math.floor(hash(tx, ty, i + 40) * 15);
    R(g, x0 + x, y0 + y, 1, 2, p.d);
  }
  for (let i = 0; i < 4; i++) P(g, x0 + Math.floor(hash(tx, ty, i + 80) * 16), y0 + Math.floor(hash(tx, ty, i + 90) * 16), p.h);
  if (p.blume.length && hash(tx, ty, 7) < 0.06) {
    const f = p.blume[Math.floor(hash(tx, ty, 8) * p.blume.length)];
    const x = x0 + 4 + Math.floor(hash(tx, ty, 9) * 8);
    const y = y0 + 4 + Math.floor(hash(tx, ty, 10) * 8);
    P(g, x, y - 1, f); P(g, x - 1, y, f); P(g, x + 1, y, f); P(g, x, y + 1, f); P(g, x, y, '#f2d24a');
  }
}

/** Ausgefranster Rand in Farbe f an einer Seite ('n', 's', 'w', 'o') einer Kachel. */
export function zackenRand(g, x0, y0, seite, f, tx, ty) {
  for (let i = 0; i < 16; i++) {
    const tief = 1 + Math.floor(hash(tx * 3 + i, ty, seite.length) * 2.2);
    if (seite === 'n') R(g, x0 + i, y0, 1, tief, f);
    if (seite === 's') R(g, x0 + i, y0 + 16 - tief, 1, tief, f);
    if (seite === 'w') R(g, x0, y0 + i, tief, 1, f);
    if (seite === 'o') R(g, x0 + 16 - tief, y0 + i, tief, 1, f);
  }
}

// Grund-Bodenzeichen aus karten.js. k: { tx, ty, z, jz, winter, def, innen, mf, rand, gras, nachbarn, at }
bodenKunst({
  '.': (g, x0, y0, k) => grasKachel(g, x0, y0, k.jz, k.tx, k.ty),
  ':'(g, x0, y0, { tx, ty, winter, gras, nachbarn }) {
    R(g, x0, y0, T, T, winter ? '#d9d2c6' : '#b98f5d');
    for (let i = 0; i < 7; i++) P(g, x0 + Math.floor(hash(tx, ty, i) * 16), y0 + Math.floor(hash(tx, ty, i + 9) * 16), winter ? '#c4bcae' : '#a27a4b');
    for (let i = 0; i < 3; i++) P(g, x0 + Math.floor(hash(tx, ty, i + 20) * 16), y0 + Math.floor(hash(tx, ty, i + 30) * 16), winter ? '#ffffff' : '#cba673');
    for (const [s, n] of Object.entries(nachbarn)) if (n === '.') zackenRand(g, x0, y0, s, gras.b, tx, ty);
  },
  '='(g, x0, y0, { tx, ty, winter }) {
    R(g, x0, y0, T, T, '#8b857c');
    for (let r = 0; r < 2; r++) {
      for (let sp = -1; sp < 2; sp++) {
        const sx = x0 + sp * 8 + (r % 2 ? 4 : 0);
        const sy = y0 + r * 8;
        const f = hash(tx * 2 + sp, ty * 2 + r, 3) < 0.5 ? '#b5aea4' : '#aaa398';
        R(g, Math.max(x0, sx + 1), sy + 1, Math.min(7, x0 + 16 - Math.max(x0, sx + 1)), 6, f);
        if (sx + 1 >= x0) R(g, sx + 1, sy + 1, Math.min(6, x0 + 16 - sx - 1), 1, '#c8c2b8');
      }
    }
    if (winter) for (let i = 0; i < 6; i++) P(g, x0 + Math.floor(hash(tx, ty, i) * 16), y0 + Math.floor(hash(tx, ty, i + 5) * 16), '#ffffff');
  },
  s(g, x0, y0, { tx, ty, gras, nachbarn }) {
    R(g, x0, y0, T, T, '#ead6a2');
    for (let i = 0; i < 8; i++) P(g, x0 + Math.floor(hash(tx, ty, i) * 16), y0 + Math.floor(hash(tx, ty, i + 9) * 16), '#d6c08a');
    for (let i = 0; i < 3; i++) P(g, x0 + Math.floor(hash(tx, ty, i + 20) * 16), y0 + Math.floor(hash(tx, ty, i + 30) * 16), '#f8ecc8');
    for (const [s, n] of Object.entries(nachbarn)) if (n === '.') zackenRand(g, x0, y0, s, gras.b, tx, ty);
  },
  '~': (g, x0, y0, k) => wasserKachel(g, x0, y0, k),
  h: (g, x0, y0, k) => wasserKachel(g, x0, y0, k),
  _(g, x0, y0, { tx, ty }) {
    R(g, x0, y0, T, T, '#b8875a');
    for (let r = 0; r < 4; r++) {
      R(g, x0, y0 + r * 4 + 3, T, 1, '#8f653f');
      const fuge = Math.floor(hash(tx, ty * 4 + r, 1) * 14) + 1;
      R(g, x0 + fuge, y0 + r * 4, 1, 3, '#9a7048');
      R(g, x0, y0 + r * 4, T, 1, '#c8986a');
    }
  },
  t(g, x0, y0, { innen, nachbarn }) {
    const t = innen || INNEN_FARBEN.standard;
    R(g, x0, y0, T, T, t.teppich);
    if (nachbarn.n !== 't') R(g, x0, y0 + 1, T, 1, t.muster);
    if (nachbarn.s !== 't') R(g, x0, y0 + 14, T, 1, t.muster);
    if (nachbarn.w !== 't') R(g, x0 + 1, y0, 1, T, t.muster);
    if (nachbarn.o !== 't') R(g, x0 + 14, y0, 1, T, t.muster);
    P(g, x0 + 7, y0 + 7, t.muster); P(g, x0 + 8, y0 + 8, t.muster); P(g, x0 + 7, y0 + 8, dunkel(t.teppich, 0.2)); P(g, x0 + 8, y0 + 7, dunkel(t.teppich, 0.2));
  },
  m(g, x0, y0, { tx, ty, mf }) {
    R(g, x0, y0, T, T, mf.boden);
    for (let i = 0; i < 7; i++) P(g, x0 + Math.floor(hash(tx, ty, i) * 16), y0 + Math.floor(hash(tx, ty, i + 9) * 16), mf.d);
    for (let i = 0; i < 3; i++) P(g, x0 + Math.floor(hash(tx, ty, i + 20) * 16), y0 + Math.floor(hash(tx, ty, i + 30) * 16), mf.h);
    if (hash(tx, ty, 77) < 0.15) L(g, x0 + 3, y0 + 10, x0 + 9, y0 + 7, mf.d, 1);
  },
  X(g, x0, y0, { tx, ty, gras, nachbarn }) {
    R(g, x0, y0, T, T, '#8e7a62');
    for (let r = 0; r < 4; r++) R(g, x0, y0 + 3 + r * 4, T, 1, '#76644e');
    for (let i = 0; i < 5; i++) P(g, x0 + Math.floor(hash(tx, ty, i) * 16), y0 + Math.floor(hash(tx, ty, i + 9) * 16), '#a8947a');
    if (nachbarn.n !== 'X' && nachbarn.n !== '#') zackenRand(g, x0, y0, 'n', gras.b, tx, ty);
    if (nachbarn.s !== 'X' && nachbarn.s !== '#') R(g, x0, y0 + 14, T, 2, '#5e4e3c');
  },
  // '#' je nach `rand` der Karte: Wald, Felsen, Minenfels, sonst Wand (Innenräume)
  '#'(g, x0, y0, { tx, ty, innen, nachbarn }) {
    const t = innen || INNEN_FARBEN.standard;
    if (nachbarn.s !== '#' && ty > 0) {
      R(g, x0, y0, T, T, t.tapete);
      for (let i = 0; i < 4; i++) R(g, x0 + i * 4 + 1, y0, 1, 13, t.streifen);
      R(g, x0, y0 + 12, T, 4, t.leiste); R(g, x0, y0 + 12, T, 1, hell(t.leiste, 0.25));
      R(g, x0, y0, T, 1, dunkel(t.tapete, 0.3));
    } else {
      R(g, x0, y0, T, T, '#2e221d');
      if (hash(tx, ty, 3) < 0.4) P(g, x0 + 7, y0 + 7, '#3a2c26');
    }
  },
  '#:wald'(g, x0, y0, { tx, ty, jz, nachbarn }) {
    const laub = {
      fruehling: ['#2f5f2c', '#3e7a36', '#58994a'], sommer: ['#29552a', '#35702f', '#4c8c3e'],
      herbst: ['#6a3e22', '#a0582a', '#c88038'], winter: ['#3a5048', '#4a6458', '#f2f6fa'],
    }[jz];
    R(g, x0, y0, T, T, laub[0]);
    for (let i = 0; i < 4; i++) {
      const cx = x0 + 3 + Math.floor(hash(tx, ty, i) * 10);
      const cy = y0 + 3 + Math.floor(hash(tx, ty, i + 5) * 10);
      E(g, cx, cy, 4.5, 4, laub[1]);
      E(g, cx - 1, cy - 1.5, 2, 1.5, laub[2]);
    }
    if (nachbarn.s !== '#' && nachbarn.s !== 'X') {
      R(g, x0, y0 + 12, T, 4, mische(laub[0], '#000000', 0.25));
      R(g, x0 + 3, y0 + 11, 2, 5, '#5a3a24'); R(g, x0 + 11, y0 + 12, 2, 4, '#5a3a24');
    }
  },
  '#:fels'(g, x0, y0, { nachbarn }) {
    R(g, x0, y0, T, T, '#86806f');
    E(g, x0 + 5, y0 + 6, 5, 4, '#9a937f'); E(g, x0 + 11, y0 + 10, 5, 4, '#918a77');
    P(g, x0 + 4, y0 + 4, '#b0a990');
    if (nachbarn.s !== '#') R(g, x0, y0 + 14, T, 2, '#5e5a4c');
  },
  '#:mine'(g, x0, y0, { tx, ty, mf, nachbarn }) {
    const flaeche = nachbarn.s !== '#';
    R(g, x0, y0, T, T, flaeche ? mf.wandH : mf.wand);
    for (let i = 0; i < 5; i++) P(g, x0 + Math.floor(hash(tx, ty, i) * 16), y0 + Math.floor(hash(tx, ty, i + 9) * 16), dunkel(mf.wand, 0.3));
    if (flaeche) {
      for (let i = 0; i < 3; i++) R(g, x0 + Math.floor(hash(tx, ty, i + 20) * 12), y0 + 4 + i * 4, 4, 1, hell(mf.wandH, 0.15));
      R(g, x0, y0 + 15, T, 1, dunkel(mf.wand, 0.4));
    }
  },
});

/** Wasser ('~') und Steg/Brücke ('h'); Farbe aus WASSER_FARBE[def.wasser]. */
function wasserKachel(g, x0, y0, { tx, ty, z, def, winter, nachbarn }) {
  const basis = WASSER_FARBE[def.wasser] || WASSER_FARBE.fluss;
  R(g, x0, y0, T, T, basis);
  for (let i = 0; i < 4; i++) {
    const x = Math.floor(hash(tx, ty, i) * 12);
    const y = Math.floor(hash(tx, ty, i + 9) * 15);
    R(g, x0 + x, y0 + y, 3, 1, mische(basis, '#ffffff', 0.18));
  }
  if (hash(tx, ty, 50) < 0.5) R(g, x0 + 2, y0 + 2, 12, 12, mische(basis, '#123050', 0.06));
  const land = (n) => n !== '~' && n !== 'h';
  if (land(nachbarn.n)) { R(g, x0, y0, T, 3, mische(basis, '#123050', 0.35)); R(g, x0, y0 + 3, T, 1, mische(basis, '#ffffff', 0.45)); }
  if (land(nachbarn.s)) R(g, x0, y0 + 15, T, 1, mische(basis, '#ffffff', 0.55));
  if (land(nachbarn.w)) R(g, x0, y0, 1, T, mische(basis, '#ffffff', 0.45));
  if (land(nachbarn.o)) R(g, x0 + 15, y0, 1, T, mische(basis, '#ffffff', 0.45));
  if (z === 'h') {
    const quer = nachbarn.n === 'h' || nachbarn.s === 'h' || nachbarn.n === 's' || nachbarn.s === 's';
    const planke = '#a87848';
    if (quer) {
      R(g, x0 + 1, y0, 14, T, planke);
      for (let i = 0; i < 4; i++) R(g, x0 + 1, y0 + i * 4 + 3, 14, 1, '#7a5230');
      R(g, x0, y0, 2, T, '#6a4426'); R(g, x0 + 14, y0, 2, T, '#6a4426');
    } else {
      R(g, x0, y0 + 1, T, 14, planke);
      for (let i = 0; i < 4; i++) R(g, x0 + i * 4 + 3, y0 + 1, 1, 14, '#7a5230');
      R(g, x0, y0, T, 2, '#6a4426'); R(g, x0, y0 + 14, T, 2, '#6a4426');
    }
    if (winter) for (let i = 0; i < 5; i++) P(g, x0 + Math.floor(hash(tx, ty, i) * 16), y0 + Math.floor(hash(tx, ty, i + 3) * 16), '#ffffff');
  }
}

/** Malt die Felder [fx0, fx1) × [fy0, fy1) zeilenweise (gleiche Reihenfolge wie die ganze Karte). */
function bodenMalen(g, def, jz, fx0, fy0, fx1, fy1) {
  const at = (x, y) => (x < 0 || y < 0 || x >= def.w || y >= def.h ? '#' : def.grid[y][x]);
  const rand = def.rand || (def.innen === 'mine' ? 'mine' : 'wand');
  const k = {
    tx: 0, ty: 0, z: '', jz, winter: jz === 'winter', def, innen: INNEN_FARBEN[def.innen], mf: mineFarben(def.band),
    rand, gras: GRAS[jz], nachbarn: null, at,
  };
  for (let ty = fy0; ty < fy1; ty++) {
    for (let tx = fx0; tx < fx1; tx++) {
      const z = at(tx, ty);
      k.tx = tx;
      k.ty = ty;
      k.z = z;
      k.nachbarn = { n: at(tx, ty - 1), s: at(tx, ty + 1), w: at(tx - 1, ty), o: at(tx + 1, ty) };
      const maler = BODEN_BILD[`${z}:${rand}`] ?? BODEN_BILD[z];
      if (maler) maler(g, tx * T, ty * T, k);
      else { fehltWarnung(`Boden „${z}"`); ersatzMalen(g, tx * T, ty * T, T, T); }
    }
  }
}

/** Felder je Bodenstück (Kantenlänge); render.js zeichnet nur die sichtbaren Stücke. */
export const BODEN_STUECK = 16;

/**
 * Bodenstück ab Feld (sx, sy), höchstens BODEN_STUECK² Felder. Die Nachbarn rechts und unten
 * werden mitgemalt, weil Kacheln ein Pixel nach links/oben überstehen dürfen (Waldrand).
 */
export function bodenStueck(def, jz, sx, sy) {
  const b = Math.min(BODEN_STUECK, def.w - sx);
  const h = Math.min(BODEN_STUECK, def.h - sy);
  const [c, g] = leinwand(b * T, h * T);
  g.translate(-sx * T, -sy * T);
  bodenMalen(g, def, jz, sx, sy, Math.min(def.w, sx + b + 1), Math.min(def.h, sy + h + 1));
  return c;
}

/** Der ganze Boden einer Karte auf einer Leinwand. */
export function bodenBild(def, jz) {
  const [c, g] = leinwand(def.w * T, def.h * T);
  bodenMalen(g, def, jz, 0, 0, def.w, def.h);
  return c;
}

// ─── Objekte auf der Karte ──────────────────────────────────────────────────

const OBJEKT_STANDARD = { tiefe: -1, wackeln: true };
const objektArtCache = new Map();
/** Darstellung eines Objekttyps mit Standardwerten; ohne Eintrag: das Bild des gleichnamigen Gegenstands. */
export function objektArt(t) {
  const roh = OBJEKT_BILD[t];
  let a = objektArtCache.get(t);
  if (a && a.def === roh) return a;
  a = { ...OBJEKT_STANDARD, ...alsObjekt('bild')(roh), def: roh };
  objektArtCache.set(t, a);
  return a;
}

/** Bild eines Objekts (welt.objekte); k: { jz, band, nacht, s, t }. */
export function objektBild(o, k = {}) {
  const a = objektArt(o.t);
  if (a.bild) return a.bild(o, k);
  if (a.malen) {
    const schluessel = `obj:${o.t}:${a.schluessel ? a.schluessel(o, k) : ''}`;
    return gecacht(schluessel, () => {
      const [c, g] = leinwand(a.b ?? 16, a.h ?? 16);
      a.malen(g, o, k);
      return a.umriss === false ? c : umriss(c);
    });
  }
  if (ITEMS[o.t]) return itemBild({ id: o.t });
  return ersatz(16, 16, `Objekt „${o.t}"`);
}

// ─── Pflanzen ───────────────────────────────────────────────────────────────

/** Pflanze in einer Wachstumsphase (0–3 wachsend, 4 reif). 16×24, Fuß unten. */
export function pflanzeBild(id, phase, tot) {
  return gecacht(`pfl:${id}:${phase}:${tot ? 1 : 0}`, () => {
    const p = PFLANZEN[id];
    if (!p) return ersatz(16, 24, `Pflanze „${id}"`);
    const [c, g] = leinwand(16, 24);
    const f = ITEMS[p.ernte]?.bild?.f ?? p.farbe ?? BLATT;
    const fuss = 21;
    if (tot) {
      L(g, 8, fuss, 5, fuss - 6, '#8a6a3a', 1); L(g, 8, fuss, 11, fuss - 5, '#7a5a2a', 1); L(g, 8, fuss, 8, fuss - 8, '#9a7a4a', 1);
      P(g, 4, fuss - 6, '#6a4a2a'); P(g, 12, fuss - 5, '#6a4a2a');
      return umriss(c);
    }
    if (phase === 0) {
      P(g, 6, fuss - 1, '#5a3a20'); P(g, 9, fuss, '#5a3a20'); P(g, 8, fuss - 2, BLATT_H);
      return c;
    }
    if (phase === 1) {
      L(g, 8, fuss, 8, fuss - 3, BLATT_D, 1); E(g, 6, fuss - 4, 2, 1.2, BLATT); E(g, 10, fuss - 4, 2, 1.2, BLATT_H);
      return umriss(c);
    }
    const maler = PFLANZEN_BILD[id] ?? PFLANZEN_BILD[p.wuchs];
    if (!maler) return ersatz(16, 24, `Wuchsform „${p.wuchs}"`);
    maler(g, { p, id, phase, f, fuss, gross: phase >= 3 });
    return umriss(c);
  });
}

// ─── Deko ───────────────────────────────────────────────────────────────────

const DEKO_STANDARD = { umriss: true };
const dekoArtCache = new Map();
/** Darstellung eines Deko-Typs mit Standardwerten (oder null). */
export function dekoArt(typ) {
  const roh = DEKO_BILD[typ];
  if (!roh) return null;
  let a = dekoArtCache.get(typ);
  if (a && a.def === roh) return a;
  a = { ...DEKO_STANDARD, ...alsObjekt('malen')(roh), def: roh };
  dekoArtCache.set(typ, a);
  return a;
}

/** Deko-Bild; k: { jz, nacht, innen, s }. `nacht` schaltet Lampen und Fenster ein. */
export function dekoBild(d, k) {
  const a = dekoArt(d.typ);
  const w = (d.w || 1) * T;
  if (!a) return ersatz(w, (d.h || 1) * T, `Deko „${d.typ}"`);
  if (a.bild) return a.bild(d, k);
  const zustand = a.zustand ? a.zustand(d, k) : null;
  const key = `deko:${d.typ}:${d.w || 1}:${k.jz}:${k.nacht ? 1 : 0}:${zustand ? JSON.stringify(zustand) : ''}:${k.innen || ''}`;
  return gecacht(key, () => {
    const b = typeof a.b === 'function' ? a.b(d) : a.b ?? w;
    const [c, g] = leinwand(b, a.h ?? T);
    a.malen(g, d, { ...k, winter: k.jz === 'winter', w, zustand: zustand || {} });
    return a.umriss ? umriss(c) : c;
  });
}

// ─── Gebäude ────────────────────────────────────────────────────────────────

/** Dach als Trapez mit Ziegelreihen; im Winter mit Schnee. */
export function dach(g, x0, y0, x1, yUnten, yOben, einzug, f, winter) {
  POLY(g, [[x0, yUnten], [x1, yUnten], [x1 - einzug, yOben], [x0 + einzug, yOben]], f);
  for (let y = yOben + 3; y < yUnten; y += 4) {
    const t = (y - yOben) / (yUnten - yOben);
    const a = x0 + einzug * (1 - t);
    const b = x1 - einzug * (1 - t);
    R(g, Math.round(a), y, Math.round(b - a), 1, dunkel(f, 0.25));
  }
  R(g, x0 + einzug, yOben, x1 - x0 - 2 * einzug, 2, hell(f, 0.25));
  R(g, x0, yUnten - 1, x1 - x0, 2, dunkel(f, 0.4));
  if (winter) {
    POLY(g, [[x0 + einzug - 2, yOben - 1], [x1 - einzug + 2, yOben - 1], [x1 - einzug * 0.6, yOben + (yUnten - yOben) * 0.4], [x0 + einzug * 0.6, yOben + (yUnten - yOben) * 0.4]], '#f2f6fa');
    for (let x = x0 + 4; x < x1 - 4; x += 7) R(g, x, yOben + Math.round((yUnten - yOben) * 0.4), 2, 2, '#e0eaf2');
  }
}
/** Fenster mit Sprossen; nachts erleuchtet. */
export function fensterKasten(g, x, y, w, h, nacht, rahmen = '#f0e8d8') {
  R(g, x - 1, y - 1, w + 2, h + 2, rahmen);
  R(g, x, y, w, h, nacht ? '#ffd47a' : '#8ac0e0');
  R(g, x + Math.floor(w / 2), y, 1, h, rahmen); R(g, x, y + Math.floor(h / 2), w, 1, rahmen);
  if (!nacht) { P(g, x + 1, y + 1, '#d8f0ff'); P(g, x + 2, y + 1, '#d8f0ff'); }
}
/** Tür mit Rahmen, Querleisten und Klinke. */
export function tuer(g, x, y, w, h, f) {
  R(g, x - 1, y - 1, w + 2, h + 1, '#4a2e18'); R(g, x, y, w, h, f); R(g, x + 1, y + 1, w - 2, h - 2, hell(f, 0.12));
  for (let yy = y + 3; yy < y + h; yy += 4) R(g, x + 1, yy, w - 2, 1, dunkel(f, 0.2));
  P(g, x + w - 3, y + Math.floor(h / 2), '#f2c94c');
}

/** Gebäudebild für ein Gebäude { typ, w, h }; k: { jz, nacht, s }. */
export function gebaeudeBild(geb, k) {
  const def = GEBAEUDE_BILD[geb.typ];
  if (!def) return ersatz((geb.w || 2) * T, (geb.h || 2) * T, `Gebäude „${geb.typ}"`);
  const zustand = def.zustand && k.s ? def.zustand(k.s) : {};
  const key = `geb:${geb.typ}:${k.jz}:${k.nacht ? 1 : 0}:${JSON.stringify(zustand)}`;
  return gecacht(key, () => {
    const [c, g] = leinwand(def.b, def.h);
    def.malen(g, { jz: k.jz, winter: k.jz === 'winter', nacht: !!k.nacht, zustand });
    return def.umriss === false ? c : umriss(c);
  });
}

// ─── Figuren ────────────────────────────────────────────────────────────────

const SCHUH = '#3a2a24';

function kopfHaare(g, a, richtung) {
  const h = a.haare;
  const hd = dunkel(h, 0.25);
  const fr = a.frisur;
  if (richtung === 'oben') {
    if (fr === 'glatze') { R(g, 4, 3, 8, 8, a.haut); R(g, 4, 6, 8, 3, h); P(g, 6, 4, hell(a.haut, 0.3)); }
    else { R(g, 4, 2, 8, 9, h); R(g, 5, 1, 6, 1, h); R(g, 4, 9, 8, 2, hd); }
    if (fr === 'lang') R(g, 4, 10, 8, 4, h);
    if (fr === 'zopf') { R(g, 7, 11, 2, 6, h); P(g, 7, 13, hd); P(g, 8, 15, hd); }
    if (fr === 'dutt') E(g, 8, 1.5, 2.5, 2, h);
    if (fr === 'locken') for (const x of [3, 12]) R(g, x, 4, 1, 5, h);
    return;
  }
  if (fr === 'glatze') {
    R(g, 4, 5, 1, 4, h); R(g, 11, 5, 1, 4, h); P(g, 7, 3, hell(a.haut, 0.35));
    return;
  }
  if (richtung === 'links') {
    R(g, 5, 2, 7, 3, h); R(g, 9, 4, 3, 5, h); R(g, 5, 4, 2, 1, h); R(g, 6, 1, 5, 1, h);
    if (fr === 'lang') R(g, 9, 4, 3, 9, h);
    if (fr === 'zopf') { R(g, 11, 6, 2, 8, h); P(g, 11, 9, hd); P(g, 12, 12, hd); }
    if (fr === 'dutt') E(g, 10, 1.5, 2.5, 2, h);
    if (fr === 'locken') { P(g, 12, 3, h); P(g, 12, 6, h); P(g, 5, 1, h); }
    return;
  }
  // unten
  R(g, 4, 2, 8, 3, h); R(g, 5, 1, 6, 1, h); R(g, 4, 5, 1, 2, h); R(g, 11, 5, 1, 2, h); R(g, 5, 5, 2, 1, h); R(g, 9, 5, 2, 1, hd);
  if (fr === 'lang') { R(g, 3, 4, 2, 9, h); R(g, 11, 4, 2, 9, h); }
  if (fr === 'zopf') { R(g, 12, 6, 2, 8, h); P(g, 12, 9, hd); P(g, 13, 12, hd); }
  if (fr === 'dutt') E(g, 8, 1, 2.5, 1.8, h);
  if (fr === 'locken') { for (const x of [4, 6, 8, 10]) P(g, x + 1, 0, h); R(g, 3, 3, 1, 4, h); R(g, 12, 3, 1, 4, h); }
}

/** Figur 16×24 in einer Richtung (unten, oben, links, rechts) und Schrittphase 0–2. */
export function figurBild(a, richtung, schritt) {
  const key = `fig:${JSON.stringify(a)}:${richtung}:${schritt}`;
  return gecacht(key, () => {
    if (richtung === 'rechts') return gespiegelt(figurBild(a, 'links', schritt));
    const [c, g] = leinwand(16, 24);
    const haut = a.haut;
    const hemd = a.hemd;
    const hose = a.hose;
    const huepf = schritt === 0 ? 0 : 1;
    g.translate(0, -huepf + 1);
    if (richtung === 'links') {
      const vorn = schritt === 1 ? -1 : schritt === 2 ? 1 : 0;
      R(g, 6 + vorn, 17, 2, 4, hose); R(g, 8 - vorn, 17, 2, 4, dunkel(hose, 0.15));
      R(g, 5 + vorn, 21, 3, 2, SCHUH); R(g, 8 - vorn, 21, 3, 2, SCHUH);
      R(g, 5, 11, 6, 7, hemd); R(g, 10, 11, 1, 7, dunkel(hemd, 0.2));
      if (a.schuerze) R(g, 5, 13, 2, 6, a.schuerze);
      R(g, 5, 3, 7, 8, haut); P(g, 4, 7, haut); P(g, 4, 8, dunkel(haut, 0.12));
      P(g, 6, 7, '#2a1a1a'); P(g, 6, 6, '#2a1a1a');
      if (a.bart) R(g, 5, 9, 4, 2, a.bart);
      if (a.brille) { R(g, 5, 6, 3, 1, '#2a2a30'); P(g, 5, 7, '#2a2a30'); }
      kopfHaare(g, a, 'links');
      if (a.muetze) { R(g, 5, 1, 7, 3, a.muetze); R(g, 4, 3, 3, 1, dunkel(a.muetze, 0.2)); }
      const arm = schritt === 1 ? 1 : schritt === 2 ? -1 : 0;
      R(g, 7 + arm, 12, 2, 5, dunkel(hemd, 0.1)); R(g, 7 + arm, 17, 2, 1, haut);
      if (a.flecken) { P(g, 6, 13, '#e8506a'); P(g, 9, 15, '#3a7ac0'); }
    } else {
      const l = schritt === 1 ? -1 : 0;
      const r = schritt === 2 ? -1 : 0;
      R(g, 5, 17, 2, 4 + l, hose); R(g, 9, 17, 2, 4 + r, dunkel(hose, 0.12));
      R(g, 4, 21 + l, 3, 2, SCHUH); R(g, 9, 21 + r, 3, 2, SCHUH);
      R(g, 4, 11, 8, 7, hemd); R(g, 11, 11, 1, 7, dunkel(hemd, 0.2)); R(g, 4, 17, 8, 1, dunkel(hemd, 0.25));
      if (richtung === 'unten') { R(g, 6, 11, 4, 1, hell(hemd, 0.25)); }
      if (a.schuerze && richtung === 'unten') { R(g, 5, 13, 6, 6, a.schuerze); R(g, 5, 13, 6, 1, dunkel(a.schuerze, 0.15)); }
      const al = schritt === 2 ? 1 : schritt === 1 ? -1 : 0;
      R(g, 3, 12 + al, 1, 5, hemd); R(g, 12, 12 - al, 1, 5, dunkel(hemd, 0.15));
      P(g, 3, 17 + al, haut); P(g, 12, 17 - al, haut);
      R(g, 4, 3, 8, 8, haut);
      g.clearRect(4, 3, 1, 1); g.clearRect(11, 3, 1, 1);
      R(g, 4, 10, 8, 1, dunkel(haut, 0.12));
      if (richtung === 'unten') {
        R(g, 6, 6, 1, 2, '#2a1a1a'); R(g, 9, 6, 1, 2, '#2a1a1a');
        P(g, 5, 8, mische(haut, '#e86a6a', 0.35)); P(g, 10, 8, mische(haut, '#e86a6a', 0.35));
        R(g, 7, 9, 2, 1, dunkel(haut, 0.3));
        if (a.bart) { R(g, 5, 8, 6, 3, a.bart); R(g, 7, 9, 2, 1, dunkel(a.bart, 0.3)); }
        if (a.brille) { R(g, 5, 6, 6, 1, '#2a2a30'); P(g, 5, 7, '#2a2a30'); P(g, 7, 7, '#2a2a30'); P(g, 8, 7, '#2a2a30'); P(g, 10, 7, '#2a2a30'); }
        if (a.flecken) { P(g, 5, 13, '#e8506a'); P(g, 10, 15, '#3a7ac0'); P(g, 7, 16, '#f2d24a'); }
      }
      kopfHaare(g, a, richtung);
      if (a.muetze) { R(g, 4, 1, 8, 3, a.muetze); R(g, 4, 3, 8, 1, dunkel(a.muetze, 0.2)); P(g, 8, 0, '#f4f0e8'); }
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    return umriss(c);
  });
}

/** Porträt 32×32 für Gespräche. */
export function portraetBild(a) {
  return gecacht(`portraet:${JSON.stringify(a)}`, () => {
    const [c, g] = leinwand(32, 32);
    const haut = a.haut;
    R(g, 4, 26, 24, 6, a.hemd); R(g, 4, 26, 24, 1, hell(a.hemd, 0.2));
    if (a.schuerze) R(g, 9, 27, 14, 5, a.schuerze);
    if (a.flecken) { P(g, 7, 28, '#e8506a'); P(g, 22, 29, '#3a7ac0'); P(g, 16, 30, '#f2d24a'); }
    R(g, 13, 22, 6, 5, dunkel(haut, 0.15));
    const fr = a.frisur;
    if (fr === 'lang') { R(g, 5, 9, 22, 18, a.haare); }
    if (fr === 'zopf') { R(g, 23, 12, 4, 16, a.haare); for (const y of [16, 20, 24]) R(g, 23, y, 4, 1, dunkel(a.haare, 0.25)); }
    E(g, 16, 15, 9, 10, haut);
    E(g, 16, 22, 6, 3, dunkel(haut, 0.06));
    // Haare
    if (fr === 'glatze') { R(g, 7, 12, 2, 6, a.haare); R(g, 23, 12, 2, 6, a.haare); P(g, 13, 7, hell(haut, 0.4)); P(g, 14, 7, hell(haut, 0.4)); }
    else {
      E(g, 16, 9, 10, 6, a.haare); R(g, 6, 9, 3, 8, a.haare); R(g, 23, 9, 3, 8, a.haare);
      R(g, 9, 11, 14, 2, a.haare); P(g, 12, 13, a.haare); P(g, 19, 13, a.haare);
      E(g, 12, 6, 3, 1.4, hell(a.haare, 0.25));
      if (fr === 'locken') for (const [x, y] of [[6, 6], [10, 3], [16, 2], [22, 3], [26, 6], [6, 12], [26, 12]]) E(g, x, y, 2, 2, a.haare);
      if (fr === 'dutt') E(g, 16, 2.5, 4, 3, a.haare);
    }
    if (a.muetze) { E(g, 16, 7, 11, 5, a.muetze); R(g, 5, 9, 22, 3, dunkel(a.muetze, 0.2)); E(g, 16, 1.5, 2, 2, '#f4f0e8'); }
    // Gesicht
    R(g, 10, 13, 4, 1, dunkel(a.haare, 0.15)); R(g, 18, 13, 4, 1, dunkel(a.haare, 0.15));
    R(g, 11, 15, 2, 3, '#2a1a1a'); R(g, 19, 15, 2, 3, '#2a1a1a'); P(g, 11, 15, '#ffffff'); P(g, 19, 15, '#ffffff');
    P(g, 16, 18, dunkel(haut, 0.2)); P(g, 15, 19, dunkel(haut, 0.12));
    E(g, 9.5, 19.5, 1.6, 1, mische(haut, '#e86a6a', 0.4)); E(g, 22.5, 19.5, 1.6, 1, mische(haut, '#e86a6a', 0.4));
    if (a.bart) { E(g, 16, 22, 7, 4, a.bart); R(g, 13, 20, 6, 1, a.bart); R(g, 14, 22, 4, 1, dunkel(a.bart, 0.4)); }
    else { P(g, 13, 21, '#8a3a2a'); R(g, 14, 22, 4, 1, '#8a3a2a'); P(g, 18, 21, '#8a3a2a'); }
    if (a.brille) { R(g, 9, 14, 6, 1, '#2a2a30'); R(g, 17, 14, 6, 1, '#2a2a30'); R(g, 9, 14, 1, 5, '#2a2a30'); R(g, 14, 14, 1, 5, '#2a2a30'); R(g, 17, 14, 1, 5, '#2a2a30'); R(g, 22, 14, 1, 5, '#2a2a30'); R(g, 9, 18, 6, 1, '#2a2a30'); R(g, 17, 18, 6, 1, '#2a2a30'); R(g, 15, 15, 2, 1, '#2a2a30'); }
    return umriss(c);
  });
}

// ─── Tiere und Monster ──────────────────────────────────────────────────────

/** Tier in Schrittphase `schritt`; `links` schaut nach links, sonst gespiegelt. */
export function tierBild(art, schritt = 0, links = true) {
  return gecacht(`tier:${art}:${schritt}:${links ? 1 : 0}`, () => {
    const def = alsObjekt('malen')(TIER_BILD[art]);
    if (!def) return ersatz(16, 16, `Tier „${art}"`);
    const [c, g] = leinwand(def.b ?? 16, def.h ?? 16);
    def.malen(g, schritt);
    umriss(c);
    return links ? c : gespiegelt(c);
  });
}

/** Monster 16×16: MONSTER_BILD[typ], sonst MONSTER_BILD[art]. */
export function monsterBild(typ, farbe, art, phase) {
  return gecacht(`mon:${typ}:${phase}`, () => {
    const maler = MONSTER_BILD[typ] ?? MONSTER_BILD[art];
    if (!maler) return ersatz(16, 16, `Monster „${typ}"`);
    const [c, g] = leinwand(16, 16);
    maler(g, farbe, phase);
    return umriss(c);
  });
}

// ─── Kleine Symbole für die Oberfläche ──────────────────────────────────────

symbolKunst({
  sonne(g) {
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; L(g, 8 + Math.round(Math.cos(a) * 5), 8 + Math.round(Math.sin(a) * 5), 8 + Math.round(Math.cos(a) * 7), 8 + Math.round(Math.sin(a) * 7), '#f2b23a', 1); }
    kugel(g, 8, 8, 4, 4, '#f2c94c');
  },
  regen: (g) => wolke(g, 'regen'),
  sturm: (g) => wolke(g, 'sturm'),
  schnee(g) {
    for (const [a, b, c2, d] of [[8, 2, 8, 14], [2, 8, 14, 8], [4, 4, 12, 12], [12, 4, 4, 12]]) L(g, a, b, c2, d, '#e8f4ff', 1);
    E(g, 8, 8, 1.5, 1.5, '#ffffff');
  },
  gold(g) { kugel(g, 8, 8, 5.5, 5.5, '#f2c94c'); R(g, 7, 5, 2, 6, '#c89a2a'); },
  herz: (g) => herz(g, 'herz'),
  herzLeer: (g) => herz(g, 'herzLeer'),
  silber: (g) => stern(g, '#d8e0ea'),
  goldstern: (g) => stern(g, '#f2c94c'),
  iridiumstern: (g) => stern(g, '#b77ee0'),
  rucksack(g) {
    R(g, 4, 4, 8, 10, '#8a5a32'); R(g, 4, 4, 8, 1, '#a87848'); R(g, 3, 8, 10, 6, '#7a4e2a');
    R(g, 5, 9, 6, 3, '#9a6a3a'); R(g, 7, 10, 2, 1, '#e8c24a'); R(g, 5, 2, 6, 2, '#5a3a1e'); R(g, 6, 2, 4, 1, '#7a4e2a');
  },
  energie(g) { POLY(g, [[9, 1], [3, 9], [7, 9], [6, 15], [13, 6], [9, 6], [11, 1]], '#7cc25a'); },
  hp(g) { E(g, 5.5, 6, 3.2, 3.2, '#e8405a'); E(g, 10.5, 6, 3.2, 3.2, '#e8405a'); POLY(g, [[2.5, 7], [13.5, 7], [8, 14]], '#e8405a'); },
});
function wolke(g, art) {
  E(g, 6, 7, 4, 3, '#c8d0dc'); E(g, 10, 6, 4.5, 3.5, '#dfe5ee'); R(g, 3, 7, 11, 3, '#dfe5ee');
  if (art === 'regen') for (const x of [4, 8, 12]) L(g, x, 11, x - 1, 14, '#5a9ad8', 1);
  else POLY(g, [[9, 10], [6, 13], [8, 13], [6, 16], [11, 12], [9, 12], [11, 10]], '#f2c94c');
}
function herz(g, art) {
  const f = art === 'herz' ? '#e8405a' : '#5a4a52';
  E(g, 5.5, 6, 3.2, 3.2, f); E(g, 10.5, 6, 3.2, 3.2, f); POLY(g, [[2.5, 7], [13.5, 7], [8, 14]], f);
  if (art === 'herz') P(g, 5, 5, '#ffb0c0');
}
function stern(g, f) {
  POLY(g, [[8, 1], [10, 6], [15, 6], [11, 9], [13, 15], [8, 11], [3, 15], [5, 9], [1, 6], [6, 6]], f);
}

/** Symbol als Daten-URL (16×16, mit Umriss). */
export function symbolUrl(art) {
  return gecacht(`sym:${art}`, () => {
    const maler = SYMBOL[art];
    if (!maler) return ersatz(16, 16, `Symbol „${art}"`).toDataURL();
    const [c, g] = leinwand(16, 16);
    maler(g);
    return umriss(c).toDataURL();
  });
}
