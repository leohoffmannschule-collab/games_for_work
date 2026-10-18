// Der laufende Spieltag: Spielerin bewegen, Werkzeuge schwingen, mit der Welt reden,
// Uhr, Dorfbewohner mit Tagesplan, Hühner, Mine. Die Oberfläche hängt sich über `hooks` an.

import { T, ITEMS, NPCS, LAEDEN, TAG_ENDE, MS_PRO_MINUTE, TIPPS, PFLANZEN } from './daten.js';
import { KARTEN, NPC_HEIM, boden, verbindungen } from './karten.js';
import * as L from './logik.js';
import { mineErzeugen, monsterSchritt, MONSTER, MINE_TIEFE } from './mine.js';
import { zufall } from './zufall.js';
import { angelnStart, angelnUpdate } from './angeln.js';

export const S = {
  s: null,
  ort: null,
  hooks: {},
  demo: false,
  sp: { x: 0, y: 0, blick: 'unten', lauf: 0, bewegt: false, aktion: null, laden: null, unverwundbar: 0, stoss: null, wiederholen: 0 },
  npcs: [],
  huehner: [],
  monster: [],
  partikel: [],
  texte: [],
  fallend: [],
  wackel: {},
  angeln: null,
  ziel: { x: 0, y: 0 },
  kamera: { x: 0, y: 0, zoom: 3, dpr: 1 },
  akku: 0,
  t: 0,
  pause: false,
  uebergang: false,
  blitz: 0,
  naechsterBlitz: 8,
  hinweis: '',
  mineEbene: 0,
  meldungZeit: {},
};

const VERBINDUNGEN = verbindungen();
const WIEDERHOLBAR = new Set(['axt', 'spitzhacke', 'sense', 'schwert']);

// ─── Hilfen ─────────────────────────────────────────────────────────────────

function ton(name) { S.hooks.ton?.(name); }
function meldung(text, art) {
  const jetzt = S.t;
  if (S.meldungZeit[text] && jetzt - S.meldungZeit[text] < 1.5) return;
  S.meldungZeit[text] = jetzt;
  S.hooks.meldung?.(text, art);
}
export function spielerFeld() {
  return { x: Math.floor(S.sp.x / T), y: Math.floor((S.sp.y - 3) / T) };
}
function text(t, x, y, f = '#ffffff') { S.texte.push({ text: t, x, y, t: 0, f }); }
function partikel(x, y, n, o) {
  for (let i = 0; i < n; i++) {
    S.partikel.push({
      x: x + (Math.random() - 0.5) * (o.streu ?? 8), y: y + (Math.random() - 0.5) * (o.streuY ?? 4),
      vx: (Math.random() - 0.5) * (o.v ?? 60), vy: -(o.hoch ?? 1) * (0.4 + Math.random() * 0.6) * (o.v ?? 60),
      g: o.g ?? 260, t: 0, dauer: (o.dauer ?? 0.5) * (0.7 + Math.random() * 0.6), f: Array.isArray(o.f) ? o.f[i % o.f.length] : o.f, s: o.s ?? 1,
    });
  }
}
const mitte = (tx, ty) => [tx * T + 8, ty * T + 10];
function staub(tx, ty, f) { const [x, y] = mitte(tx, ty); partikel(x, y, 6, { f, v: 50, streu: 10 }); }
function spritzer(tx, ty, n) { const [x, y] = mitte(tx, ty); partikel(x, y - 2, n, { f: ['#9ad8f8', '#d8f2ff', '#5aa8e0'], v: 55, hoch: 1.2, streu: 10 }); }
function splitter(tx, ty, f) { const [x, y] = mitte(tx, ty); partikel(x, y - 4, 7, { f: [f, '#ffffff'], v: 80, hoch: 1.2, streu: 6 }); }
function halme(tx, ty) { const [x, y] = mitte(tx, ty); partikel(x, y, 6, { f: ['#7cc25a', '#4f9a3a', '#a8d878'], v: 70, hoch: 1.4, streu: 12 }); }
function blaetter(tx, ty) { const [x, y] = mitte(tx, ty); partikel(x, y - 6, 10, { f: ['#7cc25a', '#4f9a3a', '#e8c24a'], v: 70, hoch: 1.2, streu: 16, g: 120, dauer: 0.9 }); }
function puff(x, y, f) { partikel(x, y - 6, 14, { f: [f, '#ffffff'], v: 90, hoch: 0.8, streu: 8, g: 60, dauer: 0.6 }); }
export function ringe(x, y) { partikel(x, y, 8, { f: ['#d8f2ff', '#9ad8f8'], v: 40, hoch: 0.3, streu: 4, g: 0, dauer: 0.5 }); }
function herzchen(x, y) { partikel(x, y - 14, 3, { f: '#ff6a8a', v: 20, hoch: 1.5, streu: 6, g: -10, dauer: 1, s: 2 }); }

function ergebnisZeigen(erg) {
  if (!erg) return;
  if (erg.items?.length) S.hooks.funde?.(erg.items);
  if (erg.voll) meldung('Der Rucksack ist voll – der Rest liegt am Boden.', 'warn');
  if (erg.grund) meldung(erg.grund);
  if (erg.text) meldung(erg.text);
  if (erg.stufe) { ton('stufe'); S.hooks.stufe?.(erg.stufe); }
}

function blickZu(ziel) {
  const f = spielerFeld();
  const dx = ziel.x - f.x;
  const dy = ziel.y - f.y;
  if (!dx && !dy) return;
  S.sp.blick = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'links' : 'rechts') : (dy < 0 ? 'oben' : 'unten');
}

// ─── Start und Kartenwechsel ────────────────────────────────────────────────

export function spielStarten(state, hooks, { demo = false } = {}) {
  S.s = state;
  S.hooks = hooks || {};
  S.demo = demo;
  S.pause = false;
  S.uebergang = false;
  S.angeln = null;
  S.akku = 0;
  S.npcs = Object.keys(NPCS).map((id) => ({ id, karte: null, x: 0, y: 0, blick: 'unten', pfad: null, ziel: null, eintrag: -1, anim: 0, pause: 0, laeuft: false }));
  const sp = state.spieler;
  const karte = KARTEN[sp.karte] ? sp.karte : 'haus';
  karteBetreten(karte, sp.x, sp.y, sp.blick);
  npcsPlatzieren();
}

export function karteBetreten(id, tx, ty, blick = 'unten', ebene = 0) {
  const s = S.s;
  S.monster = [];
  S.partikel = [];
  S.fallend = [];
  S.angeln = null;
  S.sp.aktion = null;
  S.sp.laden = null;
  S.sp.stoss = null;
  if (ebene > 0) {
    const gen = mineErzeugen(ebene, zufall(Math.floor(Math.random() * 2 ** 31)), s.mine.truhen);
    S.ort = { def: gen.def, welt: gen.welt };
    S.monster = gen.monster;
    tx = gen.start.x;
    ty = gen.start.y;
    blick = 'unten';
    S.mineEbene = ebene;
    if (ebene > s.mine.tiefste) s.mine.tiefste = ebene;
    s.spieler.karte = 'mine0';
  } else {
    S.ort = L.ortVon(s, id);
    S.mineEbene = 0;
    s.spieler.karte = id;
  }
  S.sp.x = tx * T + 8;
  S.sp.y = ty * T + 13;
  S.sp.blick = blick;
  s.spieler.x = tx;
  s.spieler.y = ty;
  s.spieler.blick = blick;
  huehnerAufstellen();
  S.hooks.karteGewechselt?.(S.ort.def);
}

function wechseln(karte, x, y, blick, ebene = 0) {
  S.uebergang = true;
  ton('tuer');
  const weiter = () => { karteBetreten(karte, x, y, blick, ebene); S.uebergang = false; };
  if (S.hooks.ueberblende) S.hooks.ueberblende(weiter); else weiter();
}

// ─── Hauptschleife ──────────────────────────────────────────────────────────

export function update(dt, E) {
  S.t += dt;
  partikelUpdate(dt);
  if (!S.s || S.demo) return;
  if (S.blitz > 0) S.blitz = Math.max(0, S.blitz - dt * 2.5);
  if (S.pause || S.uebergang) return;
  zeitUpdate(dt);
  if (S.pause) return;
  npcsUpdate(dt);
  huehnerUpdate(dt);
  if (S.mineEbene) monsterUpdate(dt);
  spielerUpdate(dt, E);
  fundeEinsammeln();
  hinweisBerechnen();
  wetterUpdate(dt);
}

function partikelUpdate(dt) {
  for (const p of S.partikel) { p.t += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  S.partikel = S.partikel.filter((p) => p.t < p.dauer);
  for (const t of S.texte) { t.t += dt; t.y -= 16 * dt; }
  S.texte = S.texte.filter((t) => t.t < 1.1);
  for (const f of S.fallend) f.t += dt;
  S.fallend = S.fallend.filter((f) => f.t < 1.1);
  for (const k of Object.keys(S.wackel)) { S.wackel[k] -= dt; if (S.wackel[k] <= 0) delete S.wackel[k]; }
}

function zeitUpdate(dt) {
  S.akku += dt * 1000;
  const schritt = MS_PRO_MINUTE * 10;
  while (S.akku >= schritt) {
    S.akku -= schritt;
    const z = S.s.zeit;
    z.minute += 10;
    if (z.minute === 1440) meldung('Mitternacht. Zeit fürs Bett.', 'warn');
    if (z.minute === 1500) meldung('Dir fallen fast die Augen zu…', 'warn');
    if (z.minute >= TAG_ENDE) {
      const daheim = S.ort.def.id === 'haus';
      meldung(daheim ? 'Du schläfst im Sitzen ein.' : 'Du bist vor Erschöpfung zusammengebrochen.', 'warn');
      schlafen(!daheim);
      return;
    }
  }
}

function wetterUpdate(dt) {
  if (S.s.zeit.wetter !== 'sturm' || !S.ort.def.aussen) return;
  S.naechsterBlitz -= dt;
  if (S.naechsterBlitz <= 0) {
    S.blitz = 1;
    S.naechsterBlitz = 7 + Math.random() * 14;
    setTimeout(() => ton('donner'), 400 + Math.random() * 900);
  }
}

// ─── Spielerin ──────────────────────────────────────────────────────────────

function frei(px, py) {
  const def = S.ort.def;
  const w = S.ort.welt;
  const ecken = [[px - 5, py - 5], [px + 4.99, py - 5], [px - 5, py - 0.01], [px + 4.99, py - 0.01]];
  for (const [cx, cy] of ecken) {
    if (!L.begehbar(S.s, def, w, Math.floor(cx / T), Math.floor(cy / T))) return false;
  }
  return true;
}

function schieben(mx, my) {
  const sp = S.sp;
  if (mx) {
    if (frei(sp.x + mx, sp.y)) sp.x += mx;
    else if (!my) rutschen('x', mx);
  }
  if (my) {
    if (frei(sp.x, sp.y + my)) sp.y += my;
    else if (!mx) rutschen('y', my);
  }
}

/** Um Ecken herumgleiten, damit man nicht an Türkanten hängenbleibt. */
function rutschen(achse, m) {
  const sp = S.sp;
  const schritt = Math.abs(m);
  for (let d = 1; d <= 7; d++) {
    for (const v of [d, -d]) {
      const ok = achse === 'x' ? frei(sp.x + m, sp.y + v) : frei(sp.x + v, sp.y + m);
      if (ok) {
        const dv = Math.sign(v) * Math.min(schritt, Math.abs(v));
        if (achse === 'x') { if (frei(sp.x, sp.y + dv)) sp.y += dv; } else if (frei(sp.x + dv, sp.y)) sp.x += dv;
        return;
      }
    }
  }
}

function spielerUpdate(dt, E) {
  const sp = S.sp;
  if (sp.unverwundbar > 0) sp.unverwundbar -= dt;
  if (sp.wiederholen > 0) sp.wiederholen -= dt;
  if (sp.stoss) {
    schieben(sp.stoss.vx * dt, 0);
    schieben(0, sp.stoss.vy * dt);
    sp.stoss.t -= dt;
    if (sp.stoss.t <= 0) sp.stoss = null;
  }
  if (E.slot != null && E.slot < 12 && !S.angeln && !sp.laden) S.s.spieler.wahl = E.slot;
  if (E.rad && !S.angeln && !sp.laden) S.s.spieler.wahl = (S.s.spieler.wahl + E.rad + 12) % 12;

  if (S.angeln) {
    sp.bewegt = false;
    angelnUpdate(S, dt, E, { ton, meldung, ringe, ergebnis: ergebnisZeigen });
    return;
  }
  if (sp.aktion) { aktionUpdate(dt); return; }
  if (sp.laden) { ladenUpdate(dt, E); return; }

  bewegung(dt, E);
  zielBerechnen(E);
  if (E.tippen) tippen(E.tippen);
  if (E.benutzen.gedrueckt) benutzen();
  else if (E.benutzen.gehalten && sp.wiederholen <= 0 && wiederholbar()) benutzen();
  if (E.aktion.gedrueckt) interagieren();
  if (E.essen) essenVersuchen(S.s.spieler.wahl);
}

function bewegung(dt, E) {
  const sp = S.sp;
  const s = S.s;
  const dx = E.richtung.x;
  const dy = E.richtung.y;
  sp.bewegt = Math.hypot(dx, dy) > 0.1;
  if (!sp.bewegt) { sp.lauf = 0; return; }
  if (Math.abs(dx) > Math.abs(dy) + 0.05) sp.blick = dx < 0 ? 'links' : 'rechts';
  else if (Math.abs(dy) > 0.05) sp.blick = dy < 0 ? 'oben' : 'unten';
  const tempo = 76 * (s.spieler.tempoBis > s.zeit.minute ? 1.3 : 1) * (s.spieler.energie <= 0 ? 0.7 : 1);
  schieben(dx * tempo * dt, dy * tempo * dt);
  sp.lauf += dt;
  warpPruefen();
}

function warpPruefen() {
  const { x, y } = spielerFeld();
  const def = S.ort.def;
  const w = L.warpAn(def, x, y);
  if (w) { wechseln(w.karte, w.zx, w.zy, w.blick); return; }
  for (const g of L.gebaeudeListe(S.s, def)) {
    if (g.ziel && g.tuer.x === x && g.tuer.y === y && L.bedingung(S.s, g.tuerWenn)) {
      wechseln(g.ziel.karte, g.ziel.x, g.ziel.y, g.ziel.blick);
      return;
    }
  }
}

function zielBerechnen(E) {
  const f = spielerFeld();
  const [dx, dy] = L.RICHTUNG[S.sp.blick];
  let ziel = { x: f.x + dx, y: f.y + dy };
  if (E.maus.aktiv) {
    const k = S.kamera;
    const mx = Math.floor(((E.maus.x * k.dpr) / k.zoom + k.x) / T);
    const my = Math.floor(((E.maus.y * k.dpr) / k.zoom + k.y) / T);
    if (Math.max(Math.abs(mx - f.x), Math.abs(my - f.y)) <= 1) ziel = { x: mx, y: my };
  }
  S.ziel = ziel;
}

/** Tippen auf die Welt (Touch): auf ein Nachbarfeld zielen und dort handeln. */
function tippen(p) {
  const k = S.kamera;
  const mx = Math.floor(((p.x * k.dpr) / k.zoom + k.x) / T);
  const my = Math.floor(((p.y * k.dpr) / k.zoom + k.y) / T);
  const f = spielerFeld();
  if (Math.max(Math.abs(mx - f.x), Math.abs(my - f.y)) > 1) return;
  S.ziel = { x: mx, y: my };
  blickZu(S.ziel);
  interagieren();
}

function wiederholbar() {
  const slot = S.s.spieler.inv[S.s.spieler.wahl];
  if (!slot) return false;
  if (WIEDERHOLBAR.has(slot.id)) return true;
  return (slot.id === 'hacke' || slot.id === 'giesskanne') && !S.s.spieler.werkzeug[slot.id];
}

function benutzen() {
  const s = S.s;
  const sp = S.sp;
  const idx = s.spieler.wahl;
  const slot = s.spieler.inv[idx];
  sp.wiederholen = 0.08;
  if (!slot) return;
  const it = ITEMS[slot.id];
  const { x, y } = S.ziel;
  blickZu(S.ziel);
  if (it.kat === 'werkzeug') {
    if (slot.id === 'angel') {
      if (!S.ort.def.wasser) { meldung('Hier gibt es kein Wasser zum Angeln.'); return; }
      angelnStart(S);
      return;
    }
    const lvl = s.spieler.werkzeug[slot.id] || 0;
    if ((slot.id === 'hacke' || slot.id === 'giesskanne') && lvl > 0) { sp.laden = { id: slot.id, t: 0, stufe: 0, max: lvl }; return; }
    schwingen(slot.id, 0);
    return;
  }
  const o = S.ort.welt.objekte[L.k(x, y)];
  if (o?.t === 'einmachglas') { glas(x, y); return; }
  if (it.kat === 'saat') {
    const r = L.saeen(s, S.ort, x, y, idx);
    if (r.ok) { ton('saat'); staub(x, y, '#6a4a2a'); } else if (r.grund) meldung(r.grund);
    return;
  }
  if (it.kat === 'duenger') {
    const r = L.duengen(s, S.ort, x, y, idx);
    if (r.ok) { ton('saat'); staub(x, y, '#9aa8b8'); } else if (r.grund) meldung(r.grund);
    return;
  }
  if (it.kat === 'platz') {
    const f = spielerFeld();
    if (f.x === x && f.y === y) { meldung('Dort stehst du gerade selbst.'); return; }
    const r = L.aufstellen(s, S.ort, x, y, idx);
    if (r.ok) { ton('truhe'); staub(x, y, '#a8784a'); } else if (r.grund) meldung(r.grund);
  }
}

function schwingen(id, ladung) {
  const s = S.s;
  const kosten = L.energieKosten(s, id, ladung);
  if (kosten > 0 && s.spieler.energie < kosten) {
    meldung('Du bist zu erschöpft. Iss etwas oder geh schlafen.', 'warn');
    return;
  }
  let felder;
  if (id === 'hacke' || id === 'giesskanne') felder = L.werkzeugFelder(S.ziel.x, S.ziel.y, S.sp.blick, ladung);
  else if (id === 'sense' || id === 'schwert') felder = L.senseFelder(S.ziel.x, S.ziel.y, S.sp.blick);
  else felder = [[S.ziel.x, S.ziel.y]];
  const kurz = id === 'sense' || id === 'schwert';
  S.sp.aktion = { art: 'werkzeug', id, t: 0, dauer: kurz ? 0.24 : 0.34, ladung, felder, getan: false, kosten };
  if (kurz) ton('schwung');
}

function aktionUpdate(dt) {
  const a = S.sp.aktion;
  a.t += dt;
  if (!a.getan && a.t >= a.dauer * 0.55) { a.getan = true; werkzeugWirkung(a); }
  if (a.t >= a.dauer) S.sp.aktion = null;
}

function ladenUpdate(dt, E) {
  const l = S.sp.laden;
  l.t += dt;
  const neu = Math.min(l.max, Math.floor(l.t / 0.45));
  if (neu > l.stufe) { l.stufe = neu; ton('laden'); }
  if (!E.benutzen.gehalten) { S.sp.laden = null; schwingen(l.id, l.stufe); }
}

function werkzeugWirkung(a) {
  const s = S.s;
  const ort = S.ort;
  if (a.kosten) {
    const vorher = s.spieler.energie;
    s.spieler.energie = Math.max(0, s.spieler.energie - a.kosten);
    if (vorher > 30 && s.spieler.energie <= 30) meldung('Du wirst müde. Etwas zu essen würde helfen.', 'warn');
  }
  const [zx, zy] = a.felder[0];
  let erg = null;
  switch (a.id) {
    case 'hacke':
      erg = L.hacken(s, ort, a.felder);
      if (erg.n) { ton('hacken'); for (const [x, y] of a.felder) if (ort.welt.felder[L.k(x, y)]) staub(x, y, '#8a5e3a'); }
      else ton('dumpf');
      break;
    case 'giesskanne':
      erg = L.giessen(s, ort, a.felder);
      if (erg.gefuellt) { ton('wasser'); meldung('Gießkanne gefüllt.'); spritzer(zx, zy, 10); }
      else if (erg.leer) { ton('dumpf'); meldung('Die Gießkanne ist leer. Fülle sie an Teich, Fluss oder Meer.'); }
      else { ton('giessen'); for (const [x, y] of a.felder) spritzer(x, y, 4); }
      break;
    case 'axt':
      erg = L.axtHieb(s, ort, zx, zy);
      if (erg.treffer === 'holz') { ton('axt'); splitter(zx, zy, '#c8925a'); S.wackel[L.k(zx, zy)] = 0.25; }
      else if (erg.treffer === 'abprall') ton('abprall');
      else if (erg.treffer === 'unkraut') { ton('sense'); halme(zx, zy); }
      else if (erg.treffer === 'aufheben') ton('pop');
      else ton('schwung');
      if (erg.gefallen) { ton('baumfall'); S.fallend.push({ x: zx, y: zy, art: erg.gefallen, t: 0, richtung: S.sp.x < zx * T + 8 ? 1 : -1 }); blaetter(zx, zy); }
      break;
    case 'spitzhacke':
      erg = L.spitzhackeHieb(s, ort, zx, zy);
      if (erg.treffer === 'stein') { ton('stein'); splitter(zx, zy, '#a8a29a'); S.wackel[L.k(zx, zy)] = 0.2; }
      else if (erg.treffer === 'abprall') ton('abprall');
      else if (erg.treffer === 'unkraut') { ton('sense'); halme(zx, zy); }
      else if (erg.treffer === 'aufheben') ton('pop');
      else if (erg.treffer === 'erde') { ton('hacken'); staub(zx, zy, '#7a8a5a'); }
      else ton('dumpf');
      if (erg.leiter) { ton('leiter'); meldung('Darunter: eine Leiter nach unten!'); }
      break;
    case 'sense':
    case 'schwert':
      erg = L.senseSchnitt(s, ort, a.felder);
      if (erg.n) { ton('sense'); for (const [x, y] of a.felder) halme(x, y); }
      if (S.mineEbene || a.id === 'schwert') monsterTreffen(a.id);
      break;
    default:
      break;
  }
  ergebnisZeigen(erg);
}

function essenVersuchen(idx) {
  const s = S.s;
  const slot = s.spieler.inv[idx];
  if (!slot) return;
  if (!L.essbar(slot)) { meldung(`${L.nameVon(slot, s)} kann man nicht essen.`); return; }
  essenAus(idx);
}

export function essenAus(idx) {
  const r = L.essen(S.s, idx);
  if (!r) return null;
  ton('essen');
  meldung(`${r.name} gegessen: +${r.energie} Energie${r.tempo ? ', flinke Füße!' : ''}`);
  return r;
}

// ─── Interaktion ────────────────────────────────────────────────────────────

function npcAn(x, y) {
  const id = S.ort.def.id;
  return S.npcs.find((n) => n.karte === id && Math.abs(n.x - (x * T + 8)) < 13 && Math.abs(n.y - (y * T + 12)) < 14);
}
function huhnAn(x, y) {
  if (!huehnerDraussen()) return null;
  return S.huehner.find((h) => Math.abs(h.x - (x * T + 8)) < 12 && Math.abs(h.y - (y * T + 12)) < 12);
}

function interagieren() {
  const s = S.s;
  const ort = S.ort;
  const def = ort.def;
  const { x, y } = S.ziel;
  const f = spielerFeld();
  blickZu(S.ziel);
  const n = npcAn(x, y) || npcAn(f.x, f.y);
  if (n) { npcAnsprechen(n); return; }
  const h = huhnAn(x, y);
  if (h) { huhnStreicheln(h); return; }
  const kk = L.k(x, y);
  const o = ort.welt.objekte[kk];
  if (o) {
    if (o.t === 'sammel') { const erg = L.aufsammeln(s, ort, x, y); if (erg?.ok) ton('pflueck'); ergebnisZeigen(erg); return; }
    if (o.t === 'einmachglas') { glas(x, y); return; }
    if (o.t === 'truhe') { ton('truhe'); S.hooks.fenster?.('truhe', { truhe: o }); return; }
    if (o.t === 'schatz') { const erg = L.schatzOeffnen(s, ort, x, y); ton('fanfare'); ergebnisZeigen(erg); return; }
    if (o.t === 'leiter') { mineAb(); return; }
  }
  const feld = ort.welt.felder[kk];
  if (L.reif(feld)) {
    const erg = L.ernten(s, ort, x, y);
    if (erg?.ok) { ton('ernte'); blaetter(x, y); }
    ergebnisZeigen(erg);
    return;
  }
  const d = L.dekoAn(s, def, x, y) || L.dekoAn(s, def, f.x, f.y);
  if (d?.aktion) { dekoAktion(d); return; }
  const g = L.gebaeudeAn(s, def, x, y);
  if (g) gebaeudeAktion(g);
}

function dekoAktion(d) {
  const s = S.s;
  switch (d.aktion) {
    case 'bett':
      S.hooks.frage?.('Schlafen gehen und den Tag beenden?', [['Schlafen', () => schlafen(false)], ['Noch nicht', null]]);
      break;
    case 'tv': fernsehen(); break;
    case 'versand': ton('truhe'); S.hooks.fenster?.('versand'); break;
    case 'brett': S.hooks.fenster?.('brett'); break;
    case 'laden': {
      const l = LAEDEN[d.laden];
      const n = S.npcs.find((x) => x.id === l.npc);
      if (ladenGeoeffnetBei(n) === d.laden) npcAnsprechen(n);
      else ladenOeffnen(d.laden);
      break;
    }
    case 'text': S.hooks.dialog?.(null, [d.text]); break;
    case 'post': postZeigen(true); break;
    case 'mine_ab': mineAb(); break;
    case 'mine_auf': mineAuf(); break;
    case 'aufzug': S.hooks.fenster?.('aufzug'); break;
    case 'schwert': {
      s.mine.schwert = true;
      const erg = { items: [] };
      const f = spielerFeld();
      L.geben(s, S.ort, f.x, f.y, { id: 'schwert', n: 1 }, erg);
      ton('fanfare');
      S.hooks.dialog?.(null, ['Du nimmst das rostige Schwert. Es liegt erstaunlich gut in der Hand.', 'Wähle es in der Werkzeugleiste und schlag damit nach Schleimen.']);
      ergebnisZeigen(erg);
      break;
    }
    default: break;
  }
}

function gebaeudeAktion(g) {
  const s = S.s;
  if (g.aktion === 'muehle') { S.hooks.fenster?.('muehle'); return; }
  if (g.aktion === 'stall') {
    const h = s.stall.huehner;
    if (!h.length) { S.hooks.dialog?.(null, ['Der Stall ist noch leer. Küken gibt es bei Ottilie im Krämerladen.']); return; }
    if (!huehnerDraussen()) {
      let n = 0;
      for (const huhn of h) {
        if (huhn.gestreichelt) continue;
        huhn.gestreichelt = true;
        n++;
      }
      if (n) { ton('gack'); herzchen(S.sp.x, S.sp.y); }
      S.hooks.dialog?.(null, [n ? `Du streichelst ${n === 1 ? 'dein Huhn' : `deine ${n} Hühner`} im Stall. Zufriedenes Gackern.` : 'Die Hühner dösen zufrieden im Stroh.']);
    } else {
      S.hooks.dialog?.(null, [`${h.length} ${h.length === 1 ? 'Huhn' : 'Hühner'}. Sie scharren draußen im Auslauf. Streicheln macht sie glücklich – glückliche Hühner legen große Eier.`]);
    }
    return;
  }
  if (g.zu) { S.hooks.dialog?.(null, [g.zu]); return; }
  if (g.tuerWenn && !L.bedingung(s, g.tuerWenn)) S.hooks.dialog?.(null, [g.sonst]);
}

function glas(x, y) {
  const erg = L.glasBenutzen(S.s, S.ort, x, y, S.s.spieler.wahl);
  if (erg.ok) ton(erg.items.length ? 'pop' : 'glas');
  ergebnisZeigen(erg);
}

function fernsehen() {
  const s = S.s;
  const vorhersage = {
    sonne: 'Morgen scheint die Sonne. Gießkanne bereithalten!',
    regen: 'Morgen regnet es. Die Felder gießen sich von selbst.',
    sturm: 'Morgen ziehen Gewitter auf. Bleibt bei Blitzen lieber in der Nähe eines Daches.',
    schnee: 'Morgen schneit es. Warm anziehen!',
  }[s.zeit.morgen];
  const tipp = TIPPS[(L.tagNr(s.zeit) - 1) % TIPPS.length];
  S.hooks.dialog?.(null, [`Klarwasser-Wetter: ${vorhersage}`, `Tipp des Tages: ${tipp}`]);
}

export function postZeigen(manuell) {
  const s = S.s;
  if (s.post.length) { S.hooks.fenster?.('brief', { id: s.post[0], weiter: true }); return; }
  if (manuell) S.hooks.dialog?.(null, ['Keine neue Post.']);
}

function oeffnungszeiten(ladenId) {
  const l = LAEDEN[ladenId];
  const plan = NPCS[l.npc].plan.normal;
  const i = plan.findIndex(([, k, x, y]) => k === l.ort.karte && x === l.ort.x && y === l.ort.y);
  if (i < 0) return '';
  const minute = (z) => Math.floor(z / 100) * 60 + (z % 100);
  const bis = plan[i + 1]?.[0] ?? 2400;
  return `${L.uhrzeit(minute(plan[i][0]))} bis ${L.uhrzeit(minute(bis))} Uhr`;
}

function ladenOeffnen(ladenId) {
  const l = LAEDEN[ladenId];
  const n = S.npcs.find((x) => x.id === l.npc);
  const da = n.karte === l.ort.karte && Math.abs(n.x - (l.ort.x * T + 8)) < 20 && Math.abs(n.y - (l.ort.y * T + 13)) < 20;
  if (da) { ton('laden'); S.hooks.fenster?.('laden', { laden: ladenId }); return; }
  const zeiten = oeffnungszeiten(ladenId);
  S.hooks.dialog?.(null, [`${NPCS[l.npc].name} ist gerade nicht hier.${zeiten ? ` ${l.name}: ${zeiten}.` : ''}`]);
}

export function ladenGeoeffnetBei(n) {
  for (const [id, l] of Object.entries(LAEDEN)) {
    if (l.npc !== n.id) continue;
    if (n.karte === l.ort.karte && Math.abs(n.x - (l.ort.x * T + 8)) < 20 && Math.abs(n.y - (l.ort.y * T + 13)) < 20) return id;
  }
  return null;
}

function npcAnsprechen(n) {
  const s = S.s;
  const sp = S.sp;
  n.blick = Math.abs(sp.x - n.x) > Math.abs(sp.y - n.y) ? (sp.x < n.x ? 'links' : 'rechts') : (sp.y < n.y ? 'oben' : 'unten');
  n.pause = 3;
  const idx = s.spieler.wahl;
  const slot = s.spieler.inv[idx];
  const q = s.quest;
  if (q && q.npc === n.id && slot?.id === q.id && L.anzahl(s, q.id) >= q.n) {
    const erg = L.questAbgeben(s, n.id);
    ton('geld');
    S.hooks.dialog?.(n.id, [erg.text, `Du bekommst ${erg.belohnung} g.`]);
    return;
  }
  const optionen = [];
  const laden = ladenGeoeffnetBei(n);
  if (laden) optionen.push(['Einkaufen', () => { ton('laden'); S.hooks.fenster?.('laden', { laden }); }]);
  optionen.push(['Reden', () => reden(n)]);
  if (L.verschenkbar(slot) && !s.npcs[n.id].beschenkt) {
    optionen.push([`${L.nameVon(slot, s)} schenken`, () => schenken(n, idx)]);
  }
  if (optionen.length > 1) {
    S.hooks.dialog?.(n.id, [laden ? 'Was darf’s sein?' : 'Ja?'], optionen);
    return;
  }
  reden(n);
}

function reden(n) {
  const erg = L.gespraech(S.s, n.id, S.ort);
  S.hooks.dialog?.(n.id, erg.texte);
  if (erg.items.length) { ton('fanfare'); ergebnisZeigen(erg); }
}

function schenken(n, idx) {
  const erg = L.schenken(S.s, n.id, idx);
  if (!erg) return;
  if (erg.grund) { S.hooks.dialog?.(n.id, [erg.grund]); return; }
  ton(erg.punkte > 0 ? 'pop' : 'dumpf');
  if (erg.punkte > 0) herzchen(n.x, n.y);
  S.hooks.dialog?.(n.id, [erg.text]);
}

// ─── Schlafen ───────────────────────────────────────────────────────────────

export function schlafen(ohnmacht = false) {
  S.pause = true;
  S.angeln = null;
  S.sp.aktion = null;
  S.sp.laden = null;
  ton('schlafen');
  const bericht = L.tagBeenden(S.s, { ohnmacht });
  S.hooks.tagEnde?.(bericht, ohnmacht);
}

export function neuerMorgen() {
  for (const n of S.npcs) Object.assign(n, { karte: null, pfad: null, ziel: null, eintrag: -1, pause: 0 });
  karteBetreten('haus', 3, 4, 'unten');
  S.akku = 0;
  S.pause = false;
  speichern();
  postZeigen(false);
}

export function speichern() {
  try {
    localStorage.setItem(L.SPEICHER_SCHLUESSEL, L.serialisieren(zustandSichern()));
    return true;
  } catch {
    return false;
  }
}

/** Laufzeit in den Spielstand übertragen (Position), etwa vor dem Speichern. */
export function zustandSichern() {
  const s = S.s;
  if (!s || !S.ort) return s;
  if (S.mineEbene) { s.spieler.karte = 'mine0'; s.spieler.x = 9; s.spieler.y = 5; }
  else {
    const f = spielerFeld();
    const imWarp = L.warpAn(S.ort.def, f.x, f.y) || L.gebaeudeListe(s, S.ort.def).some((g) => g.tuer && g.tuer.x === f.x && g.tuer.y === f.y);
    s.spieler.karte = S.ort.def.id;
    if (!imWarp) { s.spieler.x = f.x; s.spieler.y = f.y; }
  }
  s.spieler.blick = S.sp.blick;
  return s;
}

// ─── Mine ───────────────────────────────────────────────────────────────────

function mineAb() {
  const n = S.mineEbene + 1;
  if (n > MINE_TIEFE) return;
  ton('leiter');
  wechseln(null, 0, 0, 'unten', n);
}
function mineAuf() {
  ton('leiter');
  wechseln('mine0', 9, 5, 'unten');
}
export function aufzugFahren(n) {
  if (n === 0) wechseln('mine0', 9, 5, 'unten');
  else wechseln(null, 0, 0, 'unten', n);
}

function monsterUpdate(dt) {
  const sp = S.sp;
  const def = S.ort.def;
  const w = S.ort.welt;
  const frei2 = (px, py, fliegt) => {
    const tx = Math.floor(px / T);
    const ty = Math.floor((py - 4) / T);
    if (boden(def, tx, ty) === '#') return false;
    return fliegt || L.begehbar(S.s, def, w, tx, ty);
  };
  for (const m of S.monster) {
    const trifft = monsterSchritt(m, dt, sp, frei2);
    if (trifft && sp.unverwundbar <= 0 && !S.pause) spielerGetroffen(m);
  }
}

function spielerGetroffen(m) {
  const d = MONSTER[m.typ];
  const s = S.s;
  s.spieler.hp = Math.max(0, s.spieler.hp - d.schaden);
  S.sp.unverwundbar = 1.1;
  ton('au');
  text(`-${d.schaden}`, S.sp.x, S.sp.y - 26, '#ff7a6a');
  const dx = S.sp.x - m.x;
  const dy = S.sp.y - m.y;
  const l = Math.hypot(dx, dy) || 1;
  S.sp.stoss = { vx: (dx / l) * 150, vy: (dy / l) * 150, t: 0.15 };
  if (s.spieler.hp <= 0) {
    S.pause = true;
    S.hooks.dialog?.(null, ['Alles wird schwarz…', 'Jemand hat dich aus der Mine nach Hause getragen. Unterwegs ist ein Teil deines Geldes verloren gegangen.'], null, () => schlafen(true));
  }
}

function monsterTreffen(id) {
  const sp = S.sp;
  const [dx, dy] = L.RICHTUNG[sp.blick];
  const cx = sp.x + dx * 14;
  const cy = sp.y - 6 + dy * 14;
  for (const m of [...S.monster]) {
    if (Math.abs(m.x - cx) < 17 && Math.abs(m.y - 4 - cy) < 17) {
      const kampf = L.stufe(S.s, 'kampf');
      const schaden = id === 'schwert' ? 3 + Math.floor(Math.random() * 5) + kampf : 1 + Math.floor(Math.random() * 2);
      m.hp -= schaden;
      m.blitz = 0.15;
      m.stoss = 0.2;
      const l = Math.hypot(m.x - sp.x, m.y - sp.y) || 1;
      m.vx = ((m.x - sp.x) / l) * 160;
      m.vy = ((m.y - sp.y) / l) * 160;
      text(String(schaden), m.x, m.y - 16, '#fff3b0');
      ton('treffer');
      if (m.hp <= 0) monsterBesiegt(m);
    }
  }
}

function monsterBesiegt(m) {
  S.monster = S.monster.filter((x) => x !== m);
  const d = MONSTER[m.typ];
  const erg = { items: [] };
  const tx = Math.floor(m.x / T);
  const ty = Math.floor(m.y / T);
  for (const [id, chance, a, b] of d.beute) {
    if (Math.random() < chance) L.geben(S.s, S.ort, tx, ty, { id, n: a + Math.floor(Math.random() * (b - a + 1)) }, erg);
  }
  L.xpGeben(S.s, 'kampf', d.xp, erg);
  puff(m.x, m.y, d.farbe);
  ton('besiegt');
  ergebnisZeigen(erg);
}

// ─── Funde am Boden ─────────────────────────────────────────────────────────

function fundeEinsammeln() {
  const w = S.ort.welt;
  const f = spielerFeld();
  const o = w.objekte[L.k(f.x, f.y)];
  if (o?.t === 'sammel') {
    const erg = L.aufsammeln(S.s, S.ort, f.x, f.y);
    if (erg?.ok) { ton('pflueck'); ergebnisZeigen(erg); }
  }
  if (!w.funde?.length) return;
  for (const fund of [...w.funde]) {
    const fx = fund.x * T + 8;
    const fy = fund.y * T + 8;
    if (Math.hypot(fx - S.sp.x, fy - (S.sp.y - 6)) >= 22) continue;
    const rest = L.hinzufuegen(S.s, fund.slot);
    if (rest < fund.slot.n) { S.hooks.funde?.([{ ...fund.slot, n: fund.slot.n - rest }]); ton('pop'); }
    if (rest <= 0) w.funde.splice(w.funde.indexOf(fund), 1);
    else fund.slot.n = rest;
  }
}

// ─── Hinweis, was die Aktionstaste gerade täte ──────────────────────────────

function hinweisBerechnen() {
  const s = S.s;
  const { x, y } = S.ziel;
  const ort = S.ort;
  const f = spielerFeld();
  let h = '';
  const n = npcAn(x, y) || npcAn(f.x, f.y);
  const o = ort.welt.objekte[L.k(x, y)];
  const feld = ort.welt.felder[L.k(x, y)];
  if (n) {
    const q = s.quest;
    const slot = s.spieler.inv[s.spieler.wahl];
    if (q && q.npc === n.id && slot?.id === q.id) h = `Auftrag abgeben an ${NPCS[n.id].name}`;
    else h = `${NPCS[n.id].name} ansprechen`;
  } else if (huhnAn(x, y)) {
    h = 'Huhn streicheln';
  } else if (o?.t === 'sammel') h = `${ITEMS[o.id].name} aufheben`;
  else if (o?.t === 'einmachglas') h = o.fertig ? 'Glas leeren' : o.inhalt ? 'Wird eingemacht…' : 'Einmachen';
  else if (o?.t === 'truhe') h = 'Truhe öffnen';
  else if (o?.t === 'schatz') h = 'Schatztruhe öffnen';
  else if (o?.t === 'leiter') h = 'Hinabsteigen';
  else if (L.reif(feld)) h = `${ITEMS[PFLANZEN[feld.pflanze.id].ernte].name} ernten`;
  else {
    const d = L.dekoAn(s, ort.def, x, y) || L.dekoAn(s, ort.def, f.x, f.y);
    const texte = {
      bett: 'Schlafen', tv: 'Fernsehen', versand: 'Versandkiste', brett: 'Schwarzes Brett lesen', text: 'Lesen', post: 'Briefkasten',
      mine_ab: 'Hinabsteigen', mine_auf: 'Hinaufsteigen', aufzug: 'Förderkorb', schwert: 'Schwert nehmen',
    };
    if (d?.aktion === 'laden') h = LAEDEN[d.laden].name;
    else if (d?.aktion) h = texte[d.aktion] || '';
    else {
      const g = L.gebaeudeAn(s, ort.def, x, y);
      if (g?.aktion === 'muehle') h = 'Die alte Mühle';
      else if (g?.aktion === 'stall') h = 'Hühnerstall';
      else if (g && (g.zu || (g.tuerWenn && !L.bedingung(s, g.tuerWenn)))) h = 'Tür';
    }
  }
  S.hinweis = h;
}

// ─── Dorfbewohner ───────────────────────────────────────────────────────────

function planVon(id) {
  const p = NPCS[id].plan;
  return (L.regnet(S.s) && p.regen) || p.normal;
}
function aktuellerEintrag(id) {
  const plan = planVon(id);
  const m = S.s.zeit.minute;
  let idx = 0;
  for (let i = 0; i < plan.length; i++) {
    const [zeit] = plan[i];
    const minute = Math.floor(zeit / 100) * 60 + (zeit % 100);
    if (minute <= m) idx = i;
  }
  return [idx, plan[idx]];
}

function npcsPlatzieren() {
  for (const n of S.npcs) {
    const [idx, [, karte, x, y]] = aktuellerEintrag(n.id);
    n.eintrag = idx;
    n.pfad = [];
    if (karte) {
      n.karte = karte;
      n.x = x * T + 8;
      n.y = y * T + 13;
      n.ziel = { karte, x, y };
    } else {
      n.karte = null;
      n.ziel = { ...NPC_HEIM[n.id], heim: true };
    }
  }
}

function npcsUpdate(dt) {
  for (const n of S.npcs) {
    const [idx, [, karte, x, y]] = aktuellerEintrag(n.id);
    if (idx !== n.eintrag) {
      n.eintrag = idx;
      n.ziel = karte ? { karte, x, y } : { ...NPC_HEIM[n.id], heim: true };
      if (!n.karte && !n.ziel.heim) {
        const h = NPC_HEIM[n.id];
        n.karte = h.karte;
        n.x = h.x * T + 8;
        n.y = h.y * T + 13;
      }
      n.pfad = n.karte ? wegPlanen(n) : [];
    }
    npcBewegen(n, dt);
  }
}

function kartenWeg(von, nach) {
  const vorher = { [von]: null };
  const offen = [von];
  while (offen.length) {
    const k = offen.shift();
    if (k === nach) break;
    for (const v of VERBINDUNGEN) {
      if (v.von !== k || v.nach in vorher || v.nach.startsWith('mine') || v.nach === 'hof' || v.nach === 'haus') continue;
      vorher[v.nach] = v;
      offen.push(v.nach);
    }
  }
  if (!(nach in vorher)) return null;
  const weg = [];
  for (let k = nach; vorher[k]; k = vorher[k].von) weg.unshift(vorher[k]);
  return weg;
}

function feldWeg(karte, sx, sy, zx, zy) {
  const def = KARTEN[karte];
  const w = L.welt(S.s, karte);
  const start = L.k(sx, sy);
  const vorher = new Map([[start, null]]);
  const offen = [[sx, sy]];
  let kopf = 0;
  while (kopf < offen.length) {
    const [x, y] = offen[kopf++];
    if (x === zx && y === zy) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const kk = L.k(nx, ny);
      if (vorher.has(kk)) continue;
      if (!(nx === zx && ny === zy) && !L.begehbar(S.s, def, w, nx, ny)) continue;
      vorher.set(kk, [x, y]);
      offen.push([nx, ny]);
    }
  }
  if (!vorher.has(L.k(zx, zy))) return null;
  const weg = [];
  for (let p = [zx, zy]; p && L.k(...p) !== start; p = vorher.get(L.k(...p))) weg.unshift(p);
  return weg;
}

function wegPlanen(n) {
  const schritte = [];
  let karte = n.karte;
  let x = Math.floor(n.x / T);
  let y = Math.floor((n.y - 3) / T);
  const ziel = n.ziel;
  const sprung = () => [{ sprung: { karte: ziel.karte, x: ziel.x, y: ziel.y } }];
  if (karte !== ziel.karte) {
    const links = kartenWeg(karte, ziel.karte);
    if (!links) return sprung();
    for (const l of links) {
      const weg = feldWeg(karte, x, y, l.x, l.y);
      if (!weg) return sprung();
      for (const [fx, fy] of weg) schritte.push({ x: fx, y: fy });
      schritte.push({ sprung: { karte: l.nach, x: l.zx, y: l.zy } });
      karte = l.nach;
      x = l.zx;
      y = l.zy;
    }
  }
  const weg = feldWeg(karte, x, y, ziel.x, ziel.y);
  if (!weg) return [...schritte, ...sprung()];
  for (const [fx, fy] of weg) schritte.push({ x: fx, y: fy });
  return schritte;
}

function npcBewegen(n, dt) {
  n.laeuft = false;
  if (!n.karte) return;
  if (n.pause > 0) { n.pause -= dt; return; }
  if (!n.pfad?.length) {
    if (n.ziel?.heim) n.karte = null;
    return;
  }
  const st = n.pfad[0];
  if (st.sprung) {
    n.karte = st.sprung.karte;
    n.x = st.sprung.x * T + 8;
    n.y = st.sprung.y * T + 13;
    n.pfad.shift();
    return;
  }
  const zx = st.x * T + 8;
  const zy = st.y * T + 13;
  const dx = zx - n.x;
  const dy = zy - n.y;
  const d = Math.hypot(dx, dy);
  const v = 40 * dt;
  if (d <= v) { n.x = zx; n.y = zy; n.pfad.shift(); } else { n.x += (dx / d) * v; n.y += (dy / d) * v; }
  if (d > 0.5) n.blick = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'links' : 'rechts') : (dy < 0 ? 'oben' : 'unten');
  n.laeuft = true;
  n.anim += dt;
}

// ─── Hühner ─────────────────────────────────────────────────────────────────

export function huehnerDraussen() {
  const s = S.s;
  return S.ort?.def.id === 'hof' && s.stall.gebaut && s.zeit.minute < 1110 && !L.regnet(s) && s.zeit.wetter !== 'schnee' && L.jahreszeit(s) !== 'winter';
}

function huehnerAufstellen() {
  S.huehner = [];
  if (S.ort.def.id !== 'hof' || !S.s.stall.gebaut) return;
  const a = S.ort.def.auslauf;
  S.s.stall.huehner.forEach((h, i) => {
    S.huehner.push({ i, x: (a.x + 1 + ((i * 3) % (a.w - 2))) * T + 8, y: (a.y + 1 + (i % 3)) * T + 12, zx: null, zy: null, t: Math.random() * 2, pick: 0, links: Math.random() < 0.5, anim: 0 });
  });
}

function huehnerUpdate(dt) {
  if (!huehnerDraussen()) return;
  const a = S.ort.def.auslauf;
  for (const h of S.huehner) {
    h.t -= dt;
    h.anim += dt;
    if (h.pick > 0) h.pick -= dt;
    if (h.t <= 0) {
      if (Math.random() < 0.4) { h.pick = 0.9; h.zx = null; h.t = 1 + Math.random() * 2; }
      else { h.zx = (a.x + 0.5 + Math.random() * (a.w - 1)) * T; h.zy = (a.y + 0.5 + Math.random() * (a.h - 1)) * T + 6; h.t = 2 + Math.random() * 3; }
    }
    if (h.zx != null) {
      const dx = h.zx - h.x;
      const dy = h.zy - h.y;
      const d = Math.hypot(dx, dy);
      if (d < 1) { h.zx = null; continue; }
      const nx = h.x + (dx / d) * 14 * dt;
      const ny = h.y + (dy / d) * 14 * dt;
      if (L.begehbar(S.s, S.ort.def, S.ort.welt, Math.floor(nx / T), Math.floor((ny - 3) / T))) { h.x = nx; h.y = ny; h.links = dx < 0; }
      else h.zx = null;
    }
  }
}

function huhnStreicheln(h) {
  const huhn = S.s.stall.huehner[h.i];
  if (huhn.gestreichelt) { S.hooks.dialog?.(null, [`${huhn.name} gackert zufrieden. Für heute ist sie glücklich.`]); return; }
  huhn.gestreichelt = true;
  h.pick = 0.6;
  ton('gack');
  herzchen(h.x, h.y);
  meldung(`${huhn.name} mag das.`);
}
