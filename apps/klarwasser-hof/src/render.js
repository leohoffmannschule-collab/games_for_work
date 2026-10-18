// Zeichnet die Welt: Boden aus dem Cache, dann alles nach Tiefe sortiert,
// darüber Werkzeug, Partikel, Wetter, Licht und das Angel-Minispiel.

import { T, ITEMS, NPCS, PFLANZEN } from './daten.js';
import * as L from './logik.js';
import * as SP from './sprites.js';
import { MONSTER } from './mine.js';
import { S, huehnerDraussen, spielerFeld } from './spiel.js';

let canvas;
let ctx;
let dpr = 1;
const bodenCache = new WeakMap();
let lichtC = null;
let lichtG = null;
let regen = [];

const klemme = (v, a, b) => Math.max(a, Math.min(b, v));

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

function bodenFuer(def, jz) {
  const c = bodenCache.get(def);
  if (c && c.jz === jz) return c.bild;
  const bild = SP.bodenBild(def, jz);
  bodenCache.set(def, { jz, bild });
  return bild;
}

function nachtAlpha(m) {
  if (m < 1080) return 0;
  if (m < 1200) return ((m - 1080) / 120) * 0.38;
  if (m < 1380) return 0.38 + ((m - 1200) / 180) * 0.3;
  return 0.68;
}

function phaseVon(p) {
  const d = PFLANZEN[p.id];
  if (p.tage >= d.tage) return 4;
  return Math.min(3, Math.floor((p.tage / d.tage) * 4));
}

function schatten(x, y, rx = 5, ry = 2) {
  ctx.fillStyle = 'rgba(20,12,24,0.28)';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function zeichnen() {
  const W = canvas.width;
  const H = canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#0d0b10';
  ctx.fillRect(0, 0, W, H);
  if (!S.ort || !S.s) return;
  const def = S.ort.def;
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
  ctx.setTransform(z, 0, 0, z, -cx * z, -cy * z);

  ctx.drawImage(bodenFuer(def, jz), 0, 0);
  const x0 = Math.max(0, Math.floor(cx / T) - 2);
  const x1 = Math.min(def.w - 1, Math.ceil((cx + vw) / T) + 2);
  const y0 = Math.max(0, Math.floor(cy / T) - 1);
  const y1 = Math.min(def.h - 1, Math.ceil((cy + vh) / T) + 3);
  const sichtbar = (tx, ty) => tx >= x0 && tx <= x1 && ty >= y0 && ty <= y1;
  const nacht = s.zeit.minute >= (def.aussen ? 1110 : 1140);

  wasserGlitzern(def, x0, x1, y0, y1);
  beeteZeichnen(def, sichtbar);

  // Wanddeko (Fenster, Kamin, Bilder) liegt hinter allem
  for (const d of L.dekoListe(s, def)) {
    if (!d.wand) continue;
    const c = SP.dekoBild(d, jz, nacht, { innen: def.innen });
    ctx.drawImage(c, d.x * T + ((d.w || 1) * T - c.width) / 2, (d.y + (d.h || 1)) * T - c.height);
  }

  const liste = [];
  const sp = S.sp;
  const spielerHinter = (bx, by, breite, hoehe) => !S.demo && sp.x > bx - breite / 2 && sp.x < bx + breite / 2 && sp.y < by - 2 && sp.y > by - hoehe;

  for (const [kk, o] of Object.entries(S.ort.welt.objekte)) {
    const [tx, ty] = kk.split(',').map(Number);
    if (!sichtbar(tx, ty)) continue;
    const wackel = S.wackel[kk] ? Math.sin(S.wackel[kk] * 60) * 1.2 : 0;
    if (o.t === 'baum') {
      const bild = SP.baumBild(o.art, jz);
      const bx = tx * T + 8;
      const by = (ty + 1) * T;
      liste.push({ y: by, f: () => {
        schatten(bx, by - 2, 7, 2.5);
        ctx.globalAlpha = spielerHinter(bx, by, 30, 40) ? 0.45 : 1;
        ctx.drawImage(bild, bx - 16 + wackel, by - 44);
        ctx.globalAlpha = 1;
      } });
    } else if (o.t === 'sammel') {
      const bild = SP.itemBild({ id: o.id });
      const huepf = Math.sin(S.t * 2 + tx) * 0.6;
      liste.push({ y: ty * T + 12, f: () => { schatten(tx * T + 8, ty * T + 13, 5, 2); ctx.drawImage(bild, tx * T, ty * T - 2 + huepf); } });
    } else {
      const bild = SP.objektBild(o, jz, def.band);
      const hoch = bild.height;
      liste.push({ y: (ty + 1) * T - (o.t === 'leiter' ? 15 : 1), f: () => ctx.drawImage(bild, tx * T + (T - bild.width) / 2 + wackel, (ty + 1) * T - hoch) });
    }
  }

  for (const [kk, f] of Object.entries(S.ort.welt.felder)) {
    if (!f.pflanze) continue;
    const [tx, ty] = kk.split(',').map(Number);
    if (!sichtbar(tx, ty)) continue;
    const bild = SP.pflanzeBild(f.pflanze.id, phaseVon(f.pflanze), f.pflanze.tot);
    liste.push({ y: ty * T + 13, f: () => ctx.drawImage(bild, tx * T, ty * T - 8) });
  }

  for (const d of L.dekoListe(s, def)) {
    if (d.wand) continue;
    if (!sichtbar(d.x, d.y) && !sichtbar(d.x + (d.w || 1) - 1, d.y + (d.h || 1) - 1)) continue;
    const extra = { innen: def.innen, flagge: d.typ === 'briefkasten' && s.post.length > 0 };
    const c = SP.dekoBild(d, jz, nacht, extra);
    const bx = d.x * T + ((d.w || 1) * T) / 2;
    const by = (d.y + (d.h || 1)) * T;
    const flach = d.typ === 'leiter_ab' || d.typ === 'bett';
    liste.push({ y: flach ? by - T * (d.h || 1) + 1 : by - 1, f: () => {
      if (d.typ === 'baum') schatten(bx, by - 2, 7, 2.5);
      ctx.globalAlpha = d.typ === 'baum' && spielerHinter(bx, by, 30, 40) ? 0.45 : 1;
      ctx.drawImage(c, Math.round(bx - c.width / 2), by - c.height);
      ctx.globalAlpha = 1;
      if (d.typ === 'brett' && s.brett) blase(bx, by - c.height - 3, '!');
    } });
  }

  for (const g of L.gebaeudeListe(s, def)) {
    const c = SP.gebaeudeBild(g.typ, jz, nacht, { offen: !!s.flags.mineOffen, repariert: s.muehle });
    liste.push({ y: (g.y + g.h) * T, f: () => ctx.drawImage(c, g.x * T, (g.y + g.h) * T - c.height) });
    if (g.typ === 'muehle') {
      const rad = SP.muehlradBild(s.muehle ? Math.floor(S.t * 5) % 8 : 0, s.muehle);
      liste.push({ y: (g.y + g.h) * T + 1, f: () => ctx.drawImage(rad, (g.x + g.w) * T - 6, (g.y + 2) * T - 4) });
    }
  }

  for (const f of S.fallend) {
    const bild = SP.baumBild(f.art, jz);
    const bx = f.x * T + 8;
    const by = (f.y + 1) * T;
    liste.push({ y: by, f: () => {
      const w = Math.min(1, f.t / 0.75);
      ctx.save();
      ctx.globalAlpha = f.t > 0.75 ? Math.max(0, 1 - (f.t - 0.75) / 0.35) : 1;
      ctx.translate(bx, by - 4);
      ctx.rotate(f.richtung * w * w * 1.45);
      ctx.drawImage(bild, -16, -40);
      ctx.restore();
    } });
  }

  for (const fund of S.ort.welt.funde || []) {
    if (!sichtbar(fund.x, fund.y)) continue;
    const bild = SP.itemBild(fund.slot);
    liste.push({ y: fund.y * T + 12, f: () => ctx.drawImage(bild, fund.x * T + 3, fund.y * T + 3 + Math.sin(S.t * 3) * 1, 10, 10) });
  }

  for (const n of S.npcs) {
    if (n.karte !== def.id) continue;
    const a = NPCS[n.id].aussehen;
    const schritt = n.laeuft ? [1, 0, 2, 0][Math.floor(n.anim * 7) % 4] : 0;
    liste.push({ y: n.y, f: () => {
      schatten(n.x, n.y, 5, 2);
      ctx.drawImage(SP.figurBild(a, n.blick, schritt), Math.round(n.x - 8), Math.round(n.y - 24));
      if (!s.npcs[n.id].gesprochen && !n.laeuft) blase(n.x, n.y - 27, '…');
    } });
  }

  if (huehnerDraussen()) {
    for (const h of S.huehner) {
      const schritt = h.pick > 0 ? 2 : h.zx != null ? Math.floor(h.anim * 6) % 2 : 0;
      liste.push({ y: h.y, f: () => { schatten(h.x, h.y, 4, 1.5); ctx.drawImage(SP.huhnBild(schritt, h.links), Math.round(h.x - 8), Math.round(h.y - 15)); } });
    }
  }

  for (const m of S.monster) {
    const d = MONSTER[m.typ];
    const phase = d.art === 'schleim' ? (m.phase === 'sprung' ? 2 : Math.floor(m.anim * 3) % 2) : Math.floor(m.anim * 9) % 2;
    liste.push({ y: m.y, f: () => {
      schatten(m.x, m.y, 5, 2);
      const hoch = d.fliegt ? 8 + Math.sin(m.anim * 4) * 2 : 0;
      ctx.globalAlpha = m.blitz > 0 ? 0.5 : 1;
      ctx.drawImage(SP.monsterBild(m.typ, d.farbe, d.art, phase), Math.round(m.x - 8), Math.round(m.y - 15 - hoch));
      ctx.globalAlpha = 1;
      if (m.hp < m.max) {
        ctx.fillStyle = '#2a1a1a'; ctx.fillRect(m.x - 7, m.y - 19 - hoch, 14, 2);
        ctx.fillStyle = '#e8504a'; ctx.fillRect(m.x - 7, m.y - 19 - hoch, 14 * (m.hp / m.max), 2);
      }
    } });
  }

  if (!S.demo) liste.push({ y: sp.y, f: spielerZeichnen });

  liste.sort((a, b) => a.y - b.y);
  for (const e of liste) e.f();

  if (!S.demo) {
    zielZeichnen();
    angelnZeichnen();
  }
  for (const p of S.partikel) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / p.dauer);
    ctx.fillStyle = p.f;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
  }
  ctx.globalAlpha = 1;
  ctx.font = '8px "Pixelify Sans", monospace';
  ctx.textAlign = 'center';
  for (const t of S.texte) {
    ctx.globalAlpha = Math.max(0, 1 - t.t / 1.1);
    ctx.fillStyle = '#1a1018';
    ctx.fillText(t.text, t.x + 0.6, t.y + 0.6);
    ctx.fillStyle = t.f;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  wetterZeichnen(W, H, def, s);
  lichtZeichnen(W, H, def, s);
  if (S.blitz > 0) { ctx.fillStyle = `rgba(240,245,255,${S.blitz * 0.6})`; ctx.fillRect(0, 0, W, H); }
  drillZeichnen(W, H);
}

function blase(x, y, zeichen) {
  ctx.fillStyle = '#fbf6e8';
  ctx.fillRect(Math.round(x) - 4, Math.round(y) - 6, 9, 7);
  ctx.fillRect(Math.round(x) - 1, Math.round(y) + 1, 2, 1);
  ctx.fillStyle = '#3a2a2a';
  if (zeichen === '!') { ctx.fillRect(Math.round(x), Math.round(y) - 5, 1, 3); ctx.fillRect(Math.round(x), Math.round(y) - 1, 1, 1); }
  else { for (const dx of [-2, 0, 2]) ctx.fillRect(Math.round(x) + dx, Math.round(y) - 3, 1, 1); }
}

function wasserGlitzern(def, x0, x1, y0, y1) {
  ctx.fillStyle = 'rgba(230,248,255,0.55)';
  const t = Math.floor(S.t * 4);
  for (let ty = y0; ty <= y1; ty++) {
    const z = def.grid[ty];
    for (let tx = x0; tx <= x1; tx++) {
      if (z[tx] !== '~') continue;
      const p = (tx * 7 + ty * 13 + t) % 23;
      if (p < 3) ctx.fillRect(tx * T + ((tx * 5 + t) % 11) + 2, ty * T + ((ty * 3 + tx) % 12) + 2, 3 - p, 1);
    }
  }
}

function beeteZeichnen(def, sichtbar) {
  const felder = S.ort.welt.felder;
  for (const [kk, f] of Object.entries(felder)) {
    const [tx, ty] = kk.split(',').map(Number);
    if (!sichtbar(tx, ty)) continue;
    const x = tx * T;
    const y = ty * T;
    const basis = f.nass ? '#5a3c27' : '#8a5e3a';
    const kante = f.nass ? '#3e2818' : '#6a4426';
    ctx.fillStyle = basis;
    ctx.fillRect(x, y, T, T);
    ctx.fillStyle = kante;
    if (!felder[L.k(tx, ty - 1)]) ctx.fillRect(x, y, T, 1);
    if (!felder[L.k(tx, ty + 1)]) ctx.fillRect(x, y + 15, T, 1);
    if (!felder[L.k(tx - 1, ty)]) ctx.fillRect(x, y, 1, T);
    if (!felder[L.k(tx + 1, ty)]) ctx.fillRect(x + 15, y, 1, T);
    ctx.fillStyle = f.nass ? '#4a3020' : '#7a5232';
    for (let r = 3; r < 16; r += 4) ctx.fillRect(x + 2, y + r, 12, 1);
    if (f.duenger) {
      ctx.fillStyle = '#b8c4d0';
      ctx.fillRect(x + 3, y + 5, 1, 1); ctx.fillRect(x + 10, y + 9, 1, 1); ctx.fillRect(x + 6, y + 12, 1, 1);
    }
  }
}

function spielerZeichnen() {
  const sp = S.sp;
  const s = S.s;
  if (sp.unverwundbar > 0 && Math.floor(sp.unverwundbar * 12) % 2) return;
  const a = s.spieler.aussehen;
  let schritt = 0;
  if (sp.bewegt && !sp.aktion) schritt = [1, 0, 2, 0][Math.floor(sp.lauf * 8) % 4];
  const hinten = sp.aktion && sp.blick === 'oben';
  if (hinten) werkzeugZeichnen(sp.aktion);
  schatten(sp.x, sp.y, 5, 2);
  ctx.drawImage(SP.figurBild(a, sp.blick, schritt), Math.round(sp.x - 8), Math.round(sp.y - 24));
  if (sp.aktion && !hinten) werkzeugZeichnen(sp.aktion);
  if (S.angeln?.phase === 'fang') {
    const bild = SP.itemBild({ id: S.angeln.id });
    ctx.drawImage(bild, Math.round(sp.x - 8), Math.round(sp.y - 42));
  }
  if (sp.laden) {
    const anteil = Math.min(1, sp.laden.t / (0.45 * sp.laden.max));
    ctx.fillStyle = '#1a1018'; ctx.fillRect(sp.x - 9, sp.y - 32, 18, 4);
    ctx.fillStyle = '#7cc25a'; ctx.fillRect(sp.x - 8, sp.y - 31, 16 * anteil, 2);
  }
}

function werkzeugZeichnen(a) {
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
  ctx.save();
  ctx.translate(Math.round(hx), Math.round(hy));
  if (spiegeln) ctx.scale(-1, 1);
  ctx.rotate(winkel);
  ctx.drawImage(bild, -3, -13);
  ctx.restore();
}

function zielZeichnen() {
  const s = S.s;
  if (S.angeln || S.pause) return;
  const slot = s.spieler.inv[s.spieler.wahl];
  const lw = 1 / S.kamera.zoom;
  ctx.lineWidth = Math.max(lw, 0.5);
  let felder = [[S.ziel.x, S.ziel.y]];
  if (S.sp.laden) felder = L.werkzeugFelder(S.ziel.x, S.ziel.y, S.sp.blick, S.sp.laden.stufe);
  ctx.strokeStyle = S.hinweis ? 'rgba(255,236,160,0.85)' : slot ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.25)';
  for (const [x, y] of felder) ctx.strokeRect(x * T + 0.5, y * T + 0.5, T - 1, T - 1);
}

function angelnZeichnen() {
  const a = S.angeln;
  if (!a) return;
  const sp = S.sp;
  const [dx] = L.RICHTUNG[sp.blick];
  const spitzeX = sp.x + (dx || 0.3) * 14;
  const spitzeY = sp.y - 26;
  // Rute
  ctx.strokeStyle = '#c8a050';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sp.x + (dx || 0.3) * 4, sp.y - 12);
  ctx.lineTo(spitzeX, spitzeY);
  ctx.stroke();
  if (a.phase === 'laden') {
    ctx.fillStyle = '#1a1018'; ctx.fillRect(sp.x - 14, sp.y - 34, 4, 22);
    const h = 20 * a.kraft;
    ctx.fillStyle = a.kraft > 0.8 ? '#7cc25a' : a.kraft > 0.4 ? '#e8c24a' : '#e8604a';
    ctx.fillRect(sp.x - 13, sp.y - 13 - h, 2, h);
    return;
  }
  if (a.phase === 'fang' || a.bx == null) return;
  let bx = a.bx;
  let by = a.by;
  if (a.phase === 'wurf') {
    const p = Math.min(1, a.t / 0.45);
    bx = spitzeX + (a.bx - spitzeX) * p;
    by = spitzeY + (a.by - spitzeY) * p - Math.sin(p * Math.PI) * 18;
  } else if (a.phase === 'warten') by += Math.sin(S.t * 3) * 0.6;
  else if (a.phase === 'biss' || a.phase === 'drill') by += Math.sin(S.t * 30) * 1.2 + 1;
  ctx.strokeStyle = 'rgba(240,240,250,0.8)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(spitzeX, spitzeY);
  ctx.quadraticCurveTo((spitzeX + bx) / 2, Math.max(spitzeY, by) + 6, bx, by);
  ctx.stroke();
  ctx.fillStyle = '#e04040'; ctx.fillRect(Math.round(bx) - 1, Math.round(by) - 2, 3, 2);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(bx) - 1, Math.round(by) - 3, 3, 1);
  if (a.phase === 'biss') {
    ctx.fillStyle = '#fbf6e8'; ctx.fillRect(sp.x - 3, sp.y - 40, 7, 10);
    ctx.fillStyle = '#d83a3a'; ctx.fillRect(sp.x, sp.y - 38, 1, 5); ctx.fillRect(sp.x, sp.y - 32, 1, 1);
  }
}

function wetterZeichnen(W, H, def, s) {
  const w = s.zeit.wetter;
  if (!def.aussen || (w !== 'regen' && w !== 'sturm' && w !== 'schnee') || S.demo) { regen = []; return; }
  const schnee = w === 'schnee';
  const ziel = Math.round(((W * H) / (dpr * dpr)) / (schnee ? 5000 : 3000));
  while (regen.length < ziel) regen.push({ x: Math.random() * W, y: Math.random() * H, v: 0.7 + Math.random() * 0.6 });
  regen.length = Math.min(regen.length, ziel);
  const dt = 1 / 60;
  if (schnee) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const p of regen) {
      p.y += 40 * p.v * dpr * dt;
      p.x += Math.sin(S.t * 1.5 + p.v * 10) * 12 * dpr * dt;
      if (p.y > H) { p.y = -4; p.x = Math.random() * W; }
      const g = Math.round(2 * dpr * p.v);
      ctx.fillRect(Math.round(p.x), Math.round(p.y), g, g);
    }
  } else {
    ctx.strokeStyle = 'rgba(190,215,250,0.55)';
    ctx.lineWidth = Math.max(1.5, 1.5 * dpr);
    ctx.beginPath();
    for (const p of regen) {
      p.y += 520 * p.v * dpr * dt;
      p.x -= 120 * p.v * dpr * dt;
      if (p.y > H) { p.y = -20; p.x = Math.random() * (W + 200); }
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + 5 * dpr, p.y - 20 * dpr);
    }
    ctx.stroke();
  }
}

function lichtQuellen(def, s) {
  const q = [];
  const m = s.zeit.minute;
  const sp = S.sp;
  const nacht = m >= 1080;
  if (def.aussen) {
    if (!nacht && !L.regnet(s)) return q;
    for (const g of L.gebaeudeListe(s, def)) {
      for (const [px, py] of SP.GEBAEUDE_LICHT[g.typ] || []) {
        const c = SP.gebaeudeBild(g.typ, L.jahreszeit(s), true, { offen: !!s.flags.mineOffen, repariert: s.muehle });
        q.push({ x: g.x * T + px, y: (g.y + g.h) * T - c.height + py, r: 2.4, warm: true });
      }
    }
    for (const d of L.dekoListe(s, def)) if (d.licht) q.push({ x: d.x * T + 8, y: d.y * T + 4, r: d.licht, warm: true });
    if (nacht) q.push({ x: sp.x, y: sp.y - 8, r: 2.6 });
  } else {
    for (const d of L.dekoListe(s, def)) if (d.licht) q.push({ x: d.x * T + ((d.w || 1) * T) / 2, y: (d.y + (d.h || 1)) * T - 8, r: d.licht, warm: true });
    q.push({ x: sp.x, y: sp.y - 8, r: def.innen === 'mine' ? 5.5 : 4 });
  }
  return q;
}

function lichtZeichnen(W, H, def, s) {
  if (S.demo) return;
  const m = s.zeit.minute;
  let a = 0;
  let farbe = '12,18,44';
  if (def.aussen) { a = nachtAlpha(m); if (L.regnet(s)) a = Math.max(a, 0.22); }
  else if (def.innen === 'mine') { a = def.dunkel ?? 0.4; farbe = '8,5,12'; }
  else a = nachtAlpha(m) * 0.5;
  if (a < 0.02) return;
  if (!lichtC || lichtC.width !== W || lichtC.height !== H) {
    lichtC = document.createElement('canvas');
    lichtC.width = W;
    lichtC.height = H;
    lichtG = lichtC.getContext('2d');
  }
  const z = S.kamera.zoom;
  const quellen = lichtQuellen(def, s);
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
  ctx.drawImage(lichtC, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  for (const q of quellen) {
    if (!q.warm) continue;
    const sx = (q.x - S.kamera.x) * z;
    const sy = (q.y - S.kamera.y) * z;
    const r = q.r * T * z * 0.7;
    const gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    gr.addColorStop(0, `rgba(255,180,90,${0.22 * Math.min(1, a * 2)})`);
    gr.addColorStop(1, 'rgba(255,180,90,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
}

function drillZeichnen(W, H) {
  const a = S.angeln;
  if (!a || a.phase !== 'drill') return;
  const d = a.drill;
  const u = dpr * Math.max(1, Math.min(1.6, H / dpr / 520));
  const pw = 54 * u;
  const ph = 230 * u;
  const z = S.kamera.zoom;
  let px = (S.sp.x - S.kamera.x) * z + 36 * u;
  let py = (S.sp.y - S.kamera.y) * z - ph * 0.75;
  px = klemme(px, 8 * u, W - pw - 8 * u);
  py = klemme(py, 8 * u, H - ph - 8 * u);
  ctx.fillStyle = '#4a2e1c';
  ctx.fillRect(px - 4 * u, py - 4 * u, pw + 8 * u, ph + 8 * u);
  ctx.fillStyle = '#d9b25f';
  ctx.fillRect(px - 2 * u, py - 2 * u, pw + 4 * u, ph + 4 * u);
  ctx.fillStyle = '#4a2e1c';
  ctx.fillRect(px, py, pw, ph);
  const sx = px + 6 * u;
  const sw = 30 * u;
  const sy = py + 8 * u;
  const sh = ph - 16 * u;
  const gr = ctx.createLinearGradient(0, sy, 0, sy + sh);
  gr.addColorStop(0, '#3f8ac2');
  gr.addColorStop(1, '#1f4a72');
  ctx.fillStyle = gr;
  ctx.fillRect(sx, sy, sw, sh);
  const zy = sy + sh - (d.p + d.zone) * sh;
  const drin = d.fp >= d.p && d.fp <= d.p + d.zone;
  ctx.fillStyle = drin ? 'rgba(130,230,110,0.85)' : 'rgba(110,200,100,0.6)';
  ctx.fillRect(sx + 2 * u, zy, sw - 4 * u, d.zone * sh);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(sx + 2 * u, zy, sw - 4 * u, 2 * u);
  const fisch = SP.itemBild({ id: d.fisch });
  const fy = sy + sh - d.fp * sh;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(fisch, sx + sw / 2 - 12 * u, fy - 12 * u, 24 * u, 24 * u);
  const bx = px + 40 * u;
  ctx.fillStyle = '#1a1018';
  ctx.fillRect(bx, sy, 8 * u, sh);
  ctx.fillStyle = d.fort > 0.66 ? '#7cc25a' : d.fort > 0.33 ? '#e8c24a' : '#e8604a';
  ctx.fillRect(bx + u, sy + sh - d.fort * sh, 6 * u, d.fort * sh);
}
