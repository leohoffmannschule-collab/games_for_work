// Zeichnet die Welt in fünf Ebenen:
//   boden       Boden (in Stücken gecacht), Glitzern, Beete, Wanddeko        – Weltkoordinaten
//   welt        Zeichenstücke { y, f(g) }, nach y sortiert (Tiefe)          – Weltkoordinaten
//   ueber       Zielrahmen, Angelschnur, Partikel, schwebende Texte           – Weltkoordinaten
//   licht       Wetter, Abdunkeln, Lichter                                  – Bildschirmpixel
//   bildschirm  Blitz, Drill-Anzeige                                         – Bildschirmpixel
// Jede Ebene hat Zeichner (Register `zeichner`). Der Kern bringt seine eigenen mit; Bereiche
// fügen in grafik.js weitere hinzu (Hühner, Monster, Angeln …). Gezeichnet wird nur, was im
// Bild liegt (Kulling).

import { T, NPCS, PFLANZEN, OBJEKT_TYPEN } from './daten.js';
import * as L from './logik.js';
import * as SP from './sprites.js';
import { S } from './spiel.js';

let canvas;
let ctx;
let dpr = 1;
let lichtC = null;
let lichtG = null;
let regen = [];

const klemme = (v, a, b) => Math.max(a, Math.min(b, v));

// ─── Register ───────────────────────────────────────────────────────────────

export const EBENEN = ['boden', 'welt', 'ueber', 'licht', 'bildschirm'];
export const ZEICHNER = Object.fromEntries(EBENEN.map((e) => [e, []]));
const WELTKOORDINATEN = new Set(['boden', 'welt', 'ueber']);

/**
 * zeichner({ name, ebene, reihe = 50, sammeln(ort, sicht) → [{ y, f(g) }] })   für ebene 'welt'
 * zeichner({ name, ebene, reihe = 50, zeichnen(g, kamera, ort, sicht) })       für alle anderen
 * Innerhalb einer Ebene laufen die Zeichner nach `reihe`. Vor jedem Zeichner stehen Transformation
 * (Welt- bzw. Bildschirmkoordinaten), Deckkraft 1 und normales Überblenden fest.
 * sicht: { x0, x1, y0, y1 (Felder mit Rand), sichtbar(tx, ty), imBild(px, py, b, h), def, s, jz, nacht, t, kamera }
 * kamera: { x, y, zoom, dpr, W, H, vw, vh }
 */
export function zeichner(def) {
  const liste = ZEICHNER[def.ebene];
  if (!liste) throw new Error(`Zeichner „${def.name}": unbekannte Ebene „${def.ebene}".`);
  if (def.ebene === 'welt' ? typeof def.sammeln !== 'function' : typeof def.zeichnen !== 'function') {
    throw new Error(`Zeichner „${def.name}" braucht ${def.ebene === 'welt' ? 'sammeln' : 'zeichnen'}.`);
  }
  if (def.name && liste.some((z) => z.name === def.name)) throw new Error(`Zeichner „${def.name}" gibt es schon.`);
  liste.push({ reihe: 50, ...def });
  liste.sort((a, b) => a.reihe - b.reihe);
}

/** Zusätzliche Lichtquellen: fn(ort, sicht) → [{ x, y, r (Felder), warm }] in Weltpixeln. */
export const LICHT_QUELLEN = [];
export function lichtQuelle(fn) { LICHT_QUELLEN.push(fn); }

// ─── Helfer für Zeichner ────────────────────────────────────────────────────

export function schatten(g, x, y, rx = 5, ry = 2) {
  g.fillStyle = 'rgba(20,12,24,0.28)';
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
}

/** Sprechblase mit „!" oder „…" über einer Figur oder Deko. */
export function blase(g, x, y, zeichen) {
  g.fillStyle = '#fbf6e8';
  g.fillRect(Math.round(x) - 4, Math.round(y) - 6, 9, 7);
  g.fillRect(Math.round(x) - 1, Math.round(y) + 1, 2, 1);
  g.fillStyle = '#3a2a2a';
  if (zeichen === '!') { g.fillRect(Math.round(x), Math.round(y) - 5, 1, 3); g.fillRect(Math.round(x), Math.round(y) - 1, 1, 1); }
  else { for (const dx of [-2, 0, 2]) g.fillRect(Math.round(x) + dx, Math.round(y) - 3, 1, 1); }
}

/** Steht die Spielerin hinter etwas, das unten mittig bei (bx, by) steht? */
export function spielerHinter(bx, by, breite, hoehe) {
  const sp = S.sp;
  return !S.demo && sp.x > bx - breite / 2 && sp.x < bx + breite / 2 && sp.y < by - 2 && sp.y > by - hoehe;
}

// ─── Start ──────────────────────────────────────────────────────────────────

export function renderStarten(c) {
  canvas = c;
  ctx = c.getContext('2d');
  groesse();
  window.addEventListener('resize', groesse);
}

function groesse() {
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const zCss = klemme(Math.floor(Math.min(w, h * 1.6) / 300), 2, 5);
  S.kamera.zoom = Math.max(1, Math.round(zCss * dpr));
  S.kamera.dpr = dpr;
}

// ─── Boden in Stücken ───────────────────────────────────────────────────────

const bodenCache = new WeakMap();
function bodenStueck(def, jz, sx, sy) {
  let c = bodenCache.get(def);
  if (!c || c.jz !== jz) { c = { jz, stuecke: new Map() }; bodenCache.set(def, c); }
  const key = sy * def.w + sx;
  let bild = c.stuecke.get(key);
  if (!bild) { bild = SP.bodenStueck(def, jz, sx, sy); c.stuecke.set(key, bild); }
  return bild;
}

function bodenZeichnen(def, jz, kamera) {
  const n = SP.BODEN_STUECK;
  const sx0 = Math.max(0, Math.floor(kamera.x / T / n));
  const sx1 = Math.min(Math.ceil(def.w / n) - 1, Math.floor((kamera.x + kamera.vw) / T / n));
  const sy0 = Math.max(0, Math.floor(kamera.y / T / n));
  const sy1 = Math.min(Math.ceil(def.h / n) - 1, Math.floor((kamera.y + kamera.vh) / T / n));
  for (let sy = sy0; sy <= sy1; sy++) {
    for (let sx = sx0; sx <= sx1; sx++) ctx.drawImage(bodenStueck(def, jz, sx * n, sy * n), sx * n * T, sy * n * T);
  }
}

// ─── Hauptfunktion ──────────────────────────────────────────────────────────

export function zeichnen() {
  const W = canvas.width;
  const H = canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#0d0b10';
  ctx.fillRect(0, 0, W, H);
  if (!S.ort || !S.s) return;
  const ort = S.ort;
  const def = ort.def;
  const s = S.s;
  const jz = L.jahreszeit(s);
  const z = S.kamera.zoom;
  const vw = W / z;
  const vh = H / z;
  const mw = def.w * T;
  const mh = def.h * T;
  let cx;
  let cy;
  if (S.demo) {
    cx = ((Math.sin(S.t * 0.04) + 1) / 2) * Math.max(0, mw - vw);
    cy = Math.max(0, Math.min(mh - vh, 6 * T));
  } else {
    cx = S.sp.x - vw / 2;
    cy = S.sp.y - 10 - vh / 2;
  }
  cx = mw <= vw ? (mw - vw) / 2 : klemme(cx, 0, mw - vw);
  cy = mh <= vh ? (mh - vh) / 2 : klemme(cy, 0, mh - vh);
  cx = Math.round(cx * z) / z;
  cy = Math.round(cy * z) / z;
  S.kamera.x = cx;
  S.kamera.y = cy;

  const kamera = { x: cx, y: cy, zoom: z, dpr, W, H, vw, vh };
  const x0 = Math.max(0, Math.floor(cx / T) - 2);
  const x1 = Math.min(def.w - 1, Math.ceil((cx + vw) / T) + 2);
  const y0 = Math.max(0, Math.floor(cy / T) - 1);
  const y1 = Math.min(def.h - 1, Math.ceil((cy + vh) / T) + 3);
  const sicht = {
    x0, x1, y0, y1, def, s, jz, kamera, t: S.t,
    nacht: s.zeit.minute >= (def.aussen ? 1110 : 1140),
    sichtbar: (tx, ty) => tx >= x0 && tx <= x1 && ty >= y0 && ty <= y1,
    imBild: (px, py, b, h) => px + b >= cx && px <= cx + vw && py + h >= cy && py <= cy + vh,
  };

  const welt = () => { ctx.setTransform(z, 0, 0, z, -cx * z, -cy * z); };
  const bildschirm = () => { ctx.setTransform(1, 0, 0, 1, 0, 0); };
  const ebene = (name) => {
    for (const zr of ZEICHNER[name]) {
      if (WELTKOORDINATEN.has(name)) welt(); else bildschirm();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      zr.zeichnen(ctx, kamera, ort, sicht);
    }
  };

  welt();
  bodenZeichnen(def, jz, kamera);
  ebene('boden');

  welt();
  const liste = [];
  for (const zr of ZEICHNER.welt) {
    const teile = zr.sammeln(ort, sicht);
    if (teile) for (const t of teile) liste.push(t);
  }
  liste.sort((a, b) => a.y - b.y);
  for (const e of liste) e.f(ctx);

  ebene('ueber');
  ebene('licht');
  ebene('bildschirm');
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  bildschirm();
}

// ─── Kern-Zeichner: Boden ───────────────────────────────────────────────────

zeichner({
  name: 'glitzern', ebene: 'boden', reihe: 10,
  zeichnen(g, k, ort, v) {
    const def = ort.def;
    g.fillStyle = 'rgba(230,248,255,0.55)';
    const t = Math.floor(S.t * 4);
    for (let ty = v.y0; ty <= v.y1; ty++) {
      const z = def.grid[ty];
      for (let tx = v.x0; tx <= v.x1; tx++) {
        if (z[tx] !== '~') continue;
        const p = (tx * 7 + ty * 13 + t) % 23;
        if (p < 3) g.fillRect(tx * T + ((tx * 5 + t) % 11) + 2, ty * T + ((ty * 3 + tx) % 12) + 2, 3 - p, 1);
      }
    }
  },
});

zeichner({
  name: 'beete', ebene: 'boden', reihe: 20,
  zeichnen(g, k, ort, v) {
    const felder = ort.welt.felder;
    for (let ty = v.y0; ty <= v.y1; ty++) {
      for (let tx = v.x0; tx <= v.x1; tx++) {
        const f = felder[L.k(tx, ty)];
        if (!f) continue;
        const x = tx * T;
        const y = ty * T;
        g.fillStyle = f.nass ? '#5a3c27' : '#8a5e3a';
        g.fillRect(x, y, T, T);
        g.fillStyle = f.nass ? '#3e2818' : '#6a4426';
        if (!felder[L.k(tx, ty - 1)]) g.fillRect(x, y, T, 1);
        if (!felder[L.k(tx, ty + 1)]) g.fillRect(x, y + 15, T, 1);
        if (!felder[L.k(tx - 1, ty)]) g.fillRect(x, y, 1, T);
        if (!felder[L.k(tx + 1, ty)]) g.fillRect(x + 15, y, 1, T);
        g.fillStyle = f.nass ? '#4a3020' : '#7a5232';
        for (let r = 3; r < 16; r += 4) g.fillRect(x + 2, y + r, 12, 1);
        if (f.duenger) {
          g.fillStyle = '#b8c4d0';
          g.fillRect(x + 3, y + 5, 1, 1); g.fillRect(x + 10, y + 9, 1, 1); g.fillRect(x + 6, y + 12, 1, 1);
        }
      }
    }
  },
});

/** Grob: liegt die Deko (samt Bild, das bis zu 6 Felder nach oben ragen darf) im Sichtbereich? */
const dekoGrobSichtbar = (d, v) => d.x + (d.w || 1) - 1 >= v.x0 && d.x <= v.x1 && d.y + (d.h || 1) - 1 >= v.y0 && d.y - 6 <= v.y1;

// Wanddeko (Fenster, Kamin, Bilder) liegt hinter allem
zeichner({
  name: 'wanddeko', ebene: 'boden', reihe: 30,
  zeichnen(g, k, ort, v) {
    const dk = { jz: v.jz, nacht: v.nacht, innen: ort.def.innen, s: v.s };
    for (const d of L.dekoListe(v.s, ort.def)) {
      if (!d.wand || !dekoGrobSichtbar(d, v)) continue;
      const c = SP.dekoBild(d, dk);
      g.drawImage(c, d.x * T + ((d.w || 1) * T - c.width) / 2, (d.y + (d.h || 1)) * T - c.height);
    }
  },
});

// ─── Kern-Zeichner: Welt (nach Tiefe sortiert) ──────────────────────────────

/** Ein Zeichenstück für Objekt oder Deko mit den Darstellungsfeldern aus sprites.js. */
function stueck(a, bild, x, y, bx, by, tiefeY, danach) {
  return {
    y: tiefeY,
    f: (g) => {
      if (a.schatten) schatten(g, bx, by + (a.schatten[2] ?? 0), a.schatten[0], a.schatten[1]);
      if (a.durchsichtig) g.globalAlpha = spielerHinter(bx, by, a.durchsichtig[0], a.durchsichtig[1]) ? 0.45 : 1;
      g.drawImage(bild, x, y);
      g.globalAlpha = 1;
      if (danach) danach(g, { x, y, bx, by, bild });
    },
  };
}

zeichner({
  name: 'objekte', ebene: 'welt', reihe: 10,
  sammeln(ort, v) {
    const teile = [];
    const gespeichert = ort.welt.objekte;
    const k = { jz: v.jz, band: ort.def.band, nacht: v.nacht, s: v.s, t: v.t, tx: 0, ty: 0 };
    const dazu = (o, tx, ty, kk) => {
      const a = SP.objektArt(o.t);
      k.tx = tx;
      k.ty = ty;
      const bild = SP.objektBild(o, k);
      const wackel = a.wackeln && S.wackel[kk] ? Math.sin(S.wackel[kk] * 60) * 1.2 : 0;
      const [dx, dy] = a.versatz ? a.versatz(o, k) : [0, 0];
      const bx = tx * T + 8;
      const by = (ty + 1) * T;
      const kd = a.danach ? { ...k } : null;
      const danach = kd ? ((g, lage) => a.danach(g, o, lage, kd)) : null;
      teile.push(stueck(a, bild, tx * T + (T - bild.width) / 2 + wackel + dx, by - bild.height + dy, bx, by, by + a.tiefe, danach));
    };
    for (let ty = v.y0; ty <= v.y1; ty++) {
      for (let tx = v.x0; tx <= v.x1; tx++) {
        const kk = L.k(tx, ty);
        const o = gespeichert[kk];
        if (o) dazu(o, tx, ty, kk);
      }
    }
    const dyn = L.kartenStand(v.s, ort.def).objekte;
    if (dyn.size) {
      for (const [kk, o] of dyn) {
        const [tx, ty] = L.ausK(kk);
        if (v.sichtbar(tx, ty)) dazu(o, tx, ty, kk);
      }
    }
    return teile;
  },
});

function phaseVon(p) {
  const d = PFLANZEN[p.id];
  if (!d || p.tage >= d.tage) return 4;
  return Math.min(3, Math.floor((p.tage / d.tage) * 4));
}

zeichner({
  name: 'pflanzen', ebene: 'welt', reihe: 20,
  sammeln(ort, v) {
    const teile = [];
    const felder = ort.welt.felder;
    for (let ty = v.y0; ty <= v.y1; ty++) {
      for (let tx = v.x0; tx <= v.x1; tx++) {
        const p = felder[L.k(tx, ty)]?.pflanze;
        if (!p) continue;
        const bild = SP.pflanzeBild(p.id, phaseVon(p), p.tot);
        teile.push({ y: ty * T + 13, f: (g) => g.drawImage(bild, tx * T, ty * T - 8) });
      }
    }
    return teile;
  },
});

zeichner({
  name: 'deko', ebene: 'welt', reihe: 30,
  sammeln(ort, v) {
    const teile = [];
    const k = { jz: v.jz, nacht: v.nacht, innen: ort.def.innen, s: v.s };
    for (const d of L.dekoListe(v.s, ort.def)) {
      if (d.wand || !dekoGrobSichtbar(d, v)) continue;
      const a = SP.dekoArt(d.typ) || {};
      const c = SP.dekoBild(d, k);
      const bx = d.x * T + ((d.w || 1) * T) / 2;
      const by = (d.y + (d.h || 1)) * T;
      const danach = a.danach ? ((g, lage) => a.danach(g, d, lage, k)) : null;
      teile.push(stueck(a, c, Math.round(bx - c.width / 2), by - c.height, bx, by, a.flach ? by - T * (d.h || 1) + 1 : by - 1, danach));
    }
    return teile;
  },
});

zeichner({
  name: 'gebaeude', ebene: 'welt', reihe: 40,
  sammeln(ort, v) {
    const teile = [];
    const k = { jz: v.jz, nacht: v.nacht, s: v.s };
    for (const g of L.gebaeudeListe(v.s, ort.def)) {
      const c = SP.gebaeudeBild(g, k);
      const x = g.x * T;
      const y = (g.y + g.h) * T - c.height;
      if (!v.imBild(x, y, c.width, c.height)) continue;
      teile.push({ y: (g.y + g.h) * T, f: (gr) => gr.drawImage(c, x, y) });
    }
    return teile;
  },
});

zeichner({
  name: 'funde', ebene: 'welt', reihe: 50,
  sammeln(ort, v) {
    const teile = [];
    for (const fund of ort.welt.funde || []) {
      if (!v.sichtbar(fund.x, fund.y)) continue;
      const bild = SP.itemBild(fund.slot);
      teile.push({ y: fund.y * T + 12, f: (g) => g.drawImage(bild, fund.x * T + 3, fund.y * T + 3 + Math.sin(S.t * 3) * 1, 10, 10) });
    }
    return teile;
  },
});

zeichner({
  name: 'npcs', ebene: 'welt', reihe: 60,
  sammeln(ort, v) {
    const teile = [];
    for (const n of S.npcs) {
      if (n.karte !== ort.def.id || !v.imBild(n.x - 10, n.y - 40, 20, 44)) continue;
      const a = NPCS[n.id].aussehen;
      const schritt = n.laeuft ? [1, 0, 2, 0][Math.floor(n.anim * 7) % 4] : 0;
      teile.push({ y: n.y, f: (g) => {
        schatten(g, n.x, n.y, 5, 2);
        g.drawImage(SP.figurBild(a, n.blick, schritt), Math.round(n.x - 8), Math.round(n.y - 24));
        if (!v.s.npcs[n.id]?.gesprochen && !n.laeuft) blase(g, n.x, n.y - 27, '…');
      } });
    }
    return teile;
  },
});

zeichner({
  name: 'spieler', ebene: 'welt', reihe: 90,
  sammeln() {
    return S.demo ? null : [{ y: S.sp.y, f: spielerZeichnen }];
  },
});

function spielerZeichnen(g) {
  const sp = S.sp;
  const s = S.s;
  if (sp.unverwundbar > 0 && Math.floor(sp.unverwundbar * 12) % 2) return;
  const a = s.spieler.aussehen;
  let schritt = 0;
  if (sp.bewegt && !sp.aktion) schritt = [1, 0, 2, 0][Math.floor(sp.lauf * 8) % 4];
  const hinten = sp.aktion && sp.blick === 'oben';
  if (hinten) werkzeugZeichnen(g, sp.aktion);
  schatten(g, sp.x, sp.y, 5, 2);
  g.drawImage(SP.figurBild(a, sp.blick, schritt), Math.round(sp.x - 8), Math.round(sp.y - 24));
  if (sp.aktion && !hinten) werkzeugZeichnen(g, sp.aktion);
  if (sp.laden) {
    const anteil = Math.min(1, sp.laden.t / (0.45 * sp.laden.max));
    g.fillStyle = '#1a1018'; g.fillRect(sp.x - 9, sp.y - 32, 18, 4);
    g.fillStyle = '#7cc25a'; g.fillRect(sp.x - 8, sp.y - 31, 16 * anteil, 2);
  }
}

function werkzeugZeichnen(g, a) {
  const sp = S.sp;
  const s = S.s;
  const p = Math.min(1, a.t / a.dauer);
  const bild = SP.itemBild({ id: a.id }, s.spieler.werkzeug[a.id] || 0);
  let winkel;
  let hx = sp.x;
  let hy = sp.y - 11;
  let spiegeln = false;
  const kanne = a.id === 'giesskanne';
  switch (sp.blick) {
    case 'rechts': winkel = kanne ? 0.5 * p : -1.9 + p * 2.7; hx += 3; break;
    case 'links': winkel = kanne ? 0.5 * p : -1.9 + p * 2.7; hx -= 3; spiegeln = true; break;
    case 'unten': winkel = kanne ? 0.8 : -1.2 + p * 2.6; hx += 3; hy += 2; break;
    default: winkel = kanne ? -0.6 : -0.6 - p * 1.2; hx -= 2; hy -= 4;
  }
  g.save();
  g.translate(Math.round(hx), Math.round(hy));
  if (spiegeln) g.scale(-1, 1);
  g.rotate(winkel);
  g.drawImage(bild, -3, -13);
  g.restore();
}

// ─── Kern-Zeichner: über der Welt ───────────────────────────────────────────

zeichner({
  name: 'ziel', ebene: 'ueber', reihe: 10,
  zeichnen(g) {
    const s = S.s;
    if (S.demo || S.angeln || S.pause) return;
    const slot = s.spieler.inv[s.spieler.wahl];
    const lw = 1 / S.kamera.zoom;
    g.lineWidth = Math.max(lw, 0.5);
    let felder = [[S.ziel.x, S.ziel.y]];
    if (S.sp.laden) felder = L.werkzeugFelder(S.ziel.x, S.ziel.y, S.sp.blick, S.sp.laden.stufe);
    g.strokeStyle = S.hinweis ? 'rgba(255,236,160,0.85)' : slot ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.25)';
    for (const [x, y] of felder) g.strokeRect(x * T + 0.5, y * T + 0.5, T - 1, T - 1);
  },
});

zeichner({
  name: 'partikel', ebene: 'ueber', reihe: 30,
  zeichnen(g) {
    for (const p of S.partikel) {
      g.globalAlpha = Math.max(0, 1 - p.t / p.dauer);
      g.fillStyle = p.f;
      g.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
    }
  },
});

zeichner({
  name: 'texte', ebene: 'ueber', reihe: 40,
  zeichnen(g) {
    g.font = '8px "Pixelify Sans", monospace';
    g.textAlign = 'center';
    for (const t of S.texte) {
      g.globalAlpha = Math.max(0, 1 - t.t / 1.1);
      g.fillStyle = '#1a1018';
      g.fillText(t.text, t.x + 0.6, t.y + 0.6);
      g.fillStyle = t.f;
      g.fillText(t.text, t.x, t.y);
    }
  },
});

// ─── Kern-Zeichner: Wetter und Licht ────────────────────────────────────────

zeichner({
  name: 'wetter', ebene: 'licht', reihe: 10,
  zeichnen(g, { W, H }, ort, v) {
    const w = v.s.zeit.wetter;
    if (!ort.def.aussen || (w !== 'regen' && w !== 'sturm' && w !== 'schnee') || S.demo) { regen = []; return; }
    const schnee = w === 'schnee';
    const ziel = Math.round(((W * H) / (dpr * dpr)) / (schnee ? 5000 : 3000));
    while (regen.length < ziel) regen.push({ x: Math.random() * W, y: Math.random() * H, v: 0.7 + Math.random() * 0.6 });
    regen.length = Math.min(regen.length, ziel);
    const dt = 1 / 60;
    if (schnee) {
      g.fillStyle = 'rgba(255,255,255,0.85)';
      for (const p of regen) {
        p.y += 40 * p.v * dpr * dt;
        p.x += Math.sin(S.t * 1.5 + p.v * 10) * 12 * dpr * dt;
        if (p.y > H) { p.y = -4; p.x = Math.random() * W; }
        const gr = Math.round(2 * dpr * p.v);
        g.fillRect(Math.round(p.x), Math.round(p.y), gr, gr);
      }
    } else {
      g.strokeStyle = 'rgba(190,215,250,0.55)';
      g.lineWidth = Math.max(1.5, 1.5 * dpr);
      g.beginPath();
      for (const p of regen) {
        p.y += 520 * p.v * dpr * dt;
        p.x -= 120 * p.v * dpr * dt;
        if (p.y > H) { p.y = -20; p.x = Math.random() * (W + 200); }
        g.moveTo(p.x, p.y);
        g.lineTo(p.x + 5 * dpr, p.y - 20 * dpr);
      }
      g.stroke();
    }
  },
});

function nachtAlpha(m) {
  if (m < 1080) return 0;
  if (m < 1200) return ((m - 1080) / 120) * 0.38;
  if (m < 1380) return 0.38 + ((m - 1200) / 180) * 0.3;
  return 0.68;
}

let lichtTypen = null;
let lichtTypenStand = -1;
/** Objekttypen mit `licht` (objektTyp in daten.js). */
function objektTypenMitLicht() {
  const n = Object.keys(OBJEKT_TYPEN).length;
  if (n !== lichtTypenStand) {
    lichtTypenStand = n;
    lichtTypen = new Map(Object.values(OBJEKT_TYPEN).filter((t) => t.licht).map((t) => [t.t, t.licht]));
  }
  return lichtTypen;
}

function objektLichter(q, ort, v) {
  const typen = objektTypenMitLicht();
  if (!typen.size) return;
  const dazu = (o, tx, ty) => { const r = typen.get(o.t); if (r) q.push({ x: tx * T + 8, y: ty * T + 4, r, warm: true }); };
  const objekte = ort.welt.objekte;
  for (let ty = Math.max(0, v.y0 - 4); ty <= Math.min(ort.def.h - 1, v.y1 + 4); ty++) {
    for (let tx = Math.max(0, v.x0 - 4); tx <= Math.min(ort.def.w - 1, v.x1 + 4); tx++) {
      const o = objekte[L.k(tx, ty)];
      if (o) dazu(o, tx, ty);
    }
  }
  for (const [kk, o] of L.kartenStand(v.s, ort.def).objekte) { const [tx, ty] = L.ausK(kk); dazu(o, tx, ty); }
}

function lichtQuellen(ort, v) {
  const def = ort.def;
  const s = v.s;
  const q = [];
  const nacht = s.zeit.minute >= 1080;
  const sp = S.sp;
  if (def.aussen) {
    if (!nacht && !L.regnet(s)) return q;
    const k = { jz: v.jz, nacht: true, s };
    for (const g of L.gebaeudeListe(s, def)) {
      const punkte = SP.GEBAEUDE_LICHT[g.typ];
      if (!punkte) continue;
      const c = SP.gebaeudeBild(g, k);
      for (const [px, py] of punkte) q.push({ x: g.x * T + px, y: (g.y + g.h) * T - c.height + py, r: 2.4, warm: true });
    }
    for (const d of L.dekoListe(s, def)) if (d.licht) q.push({ x: d.x * T + 8, y: d.y * T + 4, r: d.licht, warm: true });
  } else {
    for (const d of L.dekoListe(s, def)) if (d.licht) q.push({ x: d.x * T + ((d.w || 1) * T) / 2, y: (d.y + (d.h || 1)) * T - 8, r: d.licht, warm: true });
  }
  objektLichter(q, ort, v);
  for (const fn of LICHT_QUELLEN) { const l = fn(ort, v); if (l) q.push(...l); }
  if (!def.aussen) q.push({ x: sp.x, y: sp.y - 8, r: def.innen === 'mine' ? 5.5 : 4 });
  else if (nacht) q.push({ x: sp.x, y: sp.y - 8, r: 2.6 });
  return q;
}

zeichner({
  name: 'dunkel', ebene: 'licht', reihe: 50,
  zeichnen(g, { W, H, zoom: z }, ort, v) {
    if (S.demo) return;
    const def = ort.def;
    const m = v.s.zeit.minute;
    let a = 0;
    let farbe = '12,18,44';
    if (def.aussen) { a = nachtAlpha(m); if (L.regnet(v.s)) a = Math.max(a, 0.22); }
    else if (def.innen === 'mine') { a = def.dunkel ?? 0.4; farbe = '8,5,12'; }
    else a = nachtAlpha(m) * 0.5;
    if (a < 0.02) return;
    if (!lichtC || lichtC.width !== W || lichtC.height !== H) {
      lichtC = document.createElement('canvas');
      lichtC.width = W;
      lichtC.height = H;
      lichtG = lichtC.getContext('2d');
    }
    const quellen = lichtQuellen(ort, v);
    lichtG.globalCompositeOperation = 'source-over';
    lichtG.clearRect(0, 0, W, H);
    lichtG.fillStyle = `rgba(${farbe},${a})`;
    lichtG.fillRect(0, 0, W, H);
    lichtG.globalCompositeOperation = 'destination-out';
    for (const q of quellen) {
      const sx = (q.x - S.kamera.x) * z;
      const sy = (q.y - S.kamera.y) * z;
      const r = q.r * T * z;
      if (sx < -r || sy < -r || sx > W + r || sy > H + r) continue;
      const gr = lichtG.createRadialGradient(sx, sy, 0, sx, sy, r);
      gr.addColorStop(0, 'rgba(0,0,0,1)');
      gr.addColorStop(0.5, 'rgba(0,0,0,0.7)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      lichtG.fillStyle = gr;
      lichtG.fillRect(sx - r, sy - r, r * 2, r * 2);
    }
    g.drawImage(lichtC, 0, 0);
    g.globalCompositeOperation = 'lighter';
    for (const q of quellen) {
      if (!q.warm) continue;
      const sx = (q.x - S.kamera.x) * z;
      const sy = (q.y - S.kamera.y) * z;
      const r = q.r * T * z * 0.7;
      if (sx < -r || sy < -r || sx > W + r || sy > H + r) continue;
      const gr = g.createRadialGradient(sx, sy, 0, sx, sy, r);
      gr.addColorStop(0, `rgba(255,180,90,${0.22 * Math.min(1, a * 2)})`);
      gr.addColorStop(1, 'rgba(255,180,90,0)');
      g.fillStyle = gr;
      g.fillRect(sx - r, sy - r, r * 2, r * 2);
    }
    g.globalCompositeOperation = 'source-over';
  },
});

// ─── Kern-Zeichner: Bildschirm ──────────────────────────────────────────────

zeichner({
  name: 'blitz', ebene: 'bildschirm', reihe: 10,
  zeichnen(g, { W, H }) {
    if (S.blitz > 0) { g.fillStyle = `rgba(240,245,255,${S.blitz * 0.6})`; g.fillRect(0, 0, W, H); }
  },
});
