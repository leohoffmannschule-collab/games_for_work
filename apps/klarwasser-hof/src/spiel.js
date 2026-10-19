// Der laufende Spieltag: Spielerin bewegen, Werkzeuge schwingen, mit der Welt reden,
// Uhr, Dorfbewohner mit Tagesplan. Die Oberfläche hängt sich über `S.hooks` an, die Bereiche
// über Hooks (system.js), Deko-/Gebäudeaktionen und die exportierten Helfer.

import { T, ITEMS, NPCS, LAEDEN, TAG_ENDE, MS_PRO_MINUTE, PFLANZEN, OBJEKT_TYPEN, WERKZEUG_ARTEN, ITEM_BENUTZEN } from './daten.js';
import { karteHolen, karteVergessen, punkt, zielVon, warpZiel } from './karten.js';
import { alle, erster, sammle, mod } from './system.js';
import * as L from './logik.js';
import { angelnUpdate } from './angeln.js';

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

// ─── Register für Laufzeit-Aktionen ─────────────────────────────────────────

export const DEKO_AKTIONEN = {};
export const GEBAEUDE_AKTIONEN = {};

/** dekoAktion('bett', (d, ctx) => …, 'Schlafen' | (d, s) => Text) – Deko mit `aktion: 'bett'`. */
export function dekoAktion(name, fn, hinweis = '') {
  if (DEKO_AKTIONEN[name]) throw new Error(`Deko-Aktion „${name}" gibt es schon.`);
  DEKO_AKTIONEN[name] = { fn, hinweis };
}
/** gebaeudeAktion('muehle', (g, ctx) => …, 'Die alte Mühle') – Gebäude mit `aktion: 'muehle'`. */
export function gebaeudeAktion(name, fn, hinweis = '') {
  if (GEBAEUDE_AKTIONEN[name]) throw new Error(`Gebäude-Aktion „${name}" gibt es schon.`);
  GEBAEUDE_AKTIONEN[name] = { fn, hinweis };
}

// ─── Helfer für Bereiche ────────────────────────────────────────────────────

export function ton(name) { S.hooks.ton?.(name); }
export function meldung(text, art) {
  const jetzt = S.t;
  if (S.meldungZeit[text] && jetzt - S.meldungZeit[text] < 1.5) return;
  S.meldungZeit[text] = jetzt;
  S.hooks.meldung?.(text, art);
}
export const dialog = (npcId, texte, optionen = null, danach = null) => S.hooks.dialog?.(npcId, texte, optionen, danach);
export const frage = (text, optionen) => S.hooks.frage?.(text, optionen);
export const fenster = (name, daten) => S.hooks.fenster?.(name, daten);
export const fundeZeigen = (items) => S.hooks.funde?.(items);
export const fundeAnzeigen = fundeZeigen;

export function spielerFeld() {
  return { x: Math.floor(S.sp.x / T), y: Math.floor((S.sp.y - 3) / T) };
}
export function schwebeText(t, x, y, f = '#ffffff') { S.texte.push({ text: t, x, y, t: 0, f }); }
export function partikel(x, y, n, o) {
  for (let i = 0; i < n; i++) {
    S.partikel.push({
      x: x + (Math.random() - 0.5) * (o.streu ?? 8), y: y + (Math.random() - 0.5) * (o.streuY ?? 4),
      vx: (Math.random() - 0.5) * (o.v ?? 60), vy: -(o.hoch ?? 1) * (0.4 + Math.random() * 0.6) * (o.v ?? 60),
      g: o.g ?? 260, t: 0, dauer: (o.dauer ?? 0.5) * (0.7 + Math.random() * 0.6), f: Array.isArray(o.f) ? o.f[i % o.f.length] : o.f, s: o.s ?? 1,
    });
  }
}
export const mitte = (tx, ty) => [tx * T + 8, ty * T + 10];
export function staub(tx, ty, f) { const [x, y] = mitte(tx, ty); partikel(x, y, 6, { f, v: 50, streu: 10 }); }
export function spritzer(tx, ty, n) { const [x, y] = mitte(tx, ty); partikel(x, y - 2, n, { f: ['#9ad8f8', '#d8f2ff', '#5aa8e0'], v: 55, hoch: 1.2, streu: 10 }); }
export function splitter(tx, ty, f) { const [x, y] = mitte(tx, ty); partikel(x, y - 4, 7, { f: [f, '#ffffff'], v: 80, hoch: 1.2, streu: 6 }); }
export function halme(tx, ty) { const [x, y] = mitte(tx, ty); partikel(x, y, 6, { f: ['#7cc25a', '#4f9a3a', '#a8d878'], v: 70, hoch: 1.4, streu: 12 }); }
export function blaetter(tx, ty) { const [x, y] = mitte(tx, ty); partikel(x, y - 6, 10, { f: ['#7cc25a', '#4f9a3a', '#e8c24a'], v: 70, hoch: 1.2, streu: 16, g: 120, dauer: 0.9 }); }
export function puff(x, y, f) { partikel(x, y - 6, 14, { f: [f, '#ffffff'], v: 90, hoch: 0.8, streu: 8, g: 60, dauer: 0.6 }); }
export function ringe(x, y) { partikel(x, y, 8, { f: ['#d8f2ff', '#9ad8f8'], v: 40, hoch: 0.3, streu: 4, g: 0, dauer: 0.5 }); }
export function herzchen(x, y) { partikel(x, y - 14, 3, { f: '#ff6a8a', v: 20, hoch: 1.5, streu: 6, g: -10, dauer: 1, s: 2 }); }

export function ergebnisZeigen(erg) {
  if (!erg) return;
  if (erg.items?.length) fundeZeigen(erg.items);
  if (erg.voll) meldung('Der Rucksack ist voll – der Rest liegt am Boden.', 'warn');
  if (erg.grund) meldung(erg.grund);
  if (erg.text) meldung(erg.text);
  if (erg.stufe) { ton('stufe'); S.hooks.stufe?.(erg.stufe); }
}

/** Gegenstand zur Laufzeit geben (Rucksack, sonst vor die Füße) und anzeigen. */
export function geben(slot) {
  const erg = L.neuesErgebnis();
  const f = spielerFeld();
  L.geben(S.s, S.ort, f.x, f.y, slot, erg);
  ergebnisZeigen(erg);
  return erg;
}

export function blickZu(ziel) {
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
  S.ort = null;
  S.npcs = Object.keys(NPCS).map((id) => ({ id, karte: null, x: 0, y: 0, blick: 'unten', pfad: null, ziel: null, eintrag: -1, anim: 0, pause: 0, laeuft: false }));
  const sp = state.spieler;
  const def = karteHolen(sp.karte, state);
  if (def && !def.fluechtig) karteBetreten(sp.karte, sp.x, sp.y, sp.blick);
  else { const b = L.bettPunkt(); karteBetreten('haus', b.x, b.y, 'unten'); }
  npcsPlatzieren();
}

/**
 * Karte betreten. Ohne Koordinaten gilt ihr Punkt „start". Flüchtige Karten (Minenebenen)
 * entstehen dabei neu; gespeichert wird stattdessen ihr `speicherOrt`.
 */
export function karteBetreten(id, tx, ty, blick = 'unten') {
  const s = S.s;
  if (S.ort) alle('karteVerlassen', S.ort);
  S.monster = [];
  S.partikel = [];
  S.fallend = [];
  S.angeln = null;
  S.sp.aktion = null;
  S.sp.laden = null;
  S.sp.stoss = null;
  let def = karteHolen(id, s);
  if (def?.fluechtig) { karteVergessen(id); def = karteHolen(id, s); }
  if (!def) throw new Error(`Unbekannte Karte „${id}".`);
  if (tx == null) {
    const p = punkt(def, 'start') || { x: Math.floor(def.w / 2), y: Math.floor(def.h / 2) };
    tx = p.x;
    ty = p.y;
    blick = p.blick ?? blick;
  }
  S.ort = { def, welt: def.fluechtig ? def.weltStart : L.welt(s, id) };
  s.spieler.karte = def.fluechtig ? (def.speicherOrt?.karte ?? 'haus') : id;
  S.sp.x = tx * T + 8;
  S.sp.y = ty * T + 13;
  S.sp.blick = blick;
  s.spieler.x = tx;
  s.spieler.y = ty;
  s.spieler.blick = blick;
  alle('karteBetreten', S.ort);
  S.hooks.karteGewechselt?.(S.ort.def);
}

/** Mit Überblendung wechseln. Ohne x/y: Punkt „start" der Zielkarte. */
export function wechseln(karte, x, y, blick) {
  S.uebergang = true;
  ton('tuer');
  const weiter = () => { karteBetreten(karte, x, y, blick); S.uebergang = false; };
  if (S.hooks.ueberblende) S.hooks.ueberblende(weiter); else weiter();
}
/** wechselnZu({ karte, punkt }) oder ({ karte, x, y, blick }). */
export function wechselnZu(ziel) {
  const z = zielVon(ziel);
  wechseln(z.karte, z.x, z.y, z.blick);
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
  alle('update', dt);
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
    L.zeitVergeht(S.s, 10);
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

/** Spielerin um (mx, my) Pixel schieben, mit Gleiten an Kanten. */
export function schieben(mx, my) {
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
  const grund = 76 * (s.spieler.tempoBis > s.zeit.minute ? 1.3 : 1) * (s.spieler.energie <= 0 ? 0.7 : 1);
  const tempo = mod('laufTempo', grund, { s });
  schieben(dx * tempo * dt, dy * tempo * dt);
  sp.lauf += dt;
  warpPruefen();
}

function warpPruefen() {
  const { x, y } = spielerFeld();
  const def = S.ort.def;
  const w = L.warpAn(def, x, y);
  if (w) { const z = warpZiel(w); wechseln(z.karte, z.x, z.y, z.blick); return; }
  const g = L.tuerAn(S.s, def, x, y);
  if (g) { const z = zielVon(g.ziel); wechseln(z.karte, z.x, z.y, z.blick); }
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

const werkzeugArtVon = (id) => WERKZEUG_ARTEN[ITEMS[id]?.werkzeug];

function wiederholbar() {
  const slot = S.s.spieler.inv[S.s.spieler.wahl];
  const art = slot && werkzeugArtVon(slot.id);
  if (!art) return false;
  if (art.wiederholbar) return true;
  return !!art.aufladbar && !S.s.spieler.werkzeug[slot.id];
}

/** Kontext für Handler, die auf das Zielfeld wirken. */
function zielKontext(slot, idx) {
  const { x, y } = S.ziel;
  return { s: S.s, ort: S.ort, x, y, kk: L.k(x, y), o: L.objektAn(S.s, S.ort, x, y), slot, idx, it: slot && ITEMS[slot.id], f: spielerFeld(), S };
}

function benutzen() {
  const s = S.s;
  const sp = S.sp;
  const idx = s.spieler.wahl;
  const slot = s.spieler.inv[idx];
  sp.wiederholen = 0.08;
  if (!slot) return;
  blickZu(S.ziel);
  const art = werkzeugArtVon(slot.id);
  if (art) {
    if (art.benutzen) { art.benutzen(zielKontext(slot, idx)); return; }
    const lvl = s.spieler.werkzeug[slot.id] || 0;
    if (art.aufladbar && lvl > 0) { sp.laden = { id: slot.id, t: 0, stufe: 0, max: lvl }; return; }
    schwingen(slot.id, 0);
    return;
  }
  const c = zielKontext(slot, idx);
  const typ = c.o && OBJEKT_TYPEN[c.o.t];
  if (typ?.einlegen) { typ.einlegen(c); return; }
  for (const h of ITEM_BENUTZEN) if (h.pruefen(c)) { h.fn(c); return; }
}

function schwingen(id, ladung) {
  const s = S.s;
  const art = werkzeugArtVon(id);
  const kosten = L.energieKosten(s, id, ladung);
  if (kosten > 0 && s.spieler.energie < kosten) {
    meldung('Du bist zu erschöpft. Iss etwas oder geh schlafen.', 'warn');
    return;
  }
  const felder = art.felder ? art.felder(S.ziel.x, S.ziel.y, S.sp.blick, ladung) : [[S.ziel.x, S.ziel.y]];
  S.sp.aktion = { art: 'werkzeug', id, werkzeugArt: art.art, t: 0, dauer: art.dauer, ladung, felder, getan: false, kosten };
  if (art.schwungTon) ton(art.schwungTon);
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
  if (a.kosten) {
    const vorher = s.spieler.energie;
    s.spieler.energie = Math.max(0, s.spieler.energie - a.kosten);
    if (vorher > 30 && s.spieler.energie <= 30) meldung('Du wirst müde. Etwas zu essen würde helfen.', 'warn');
  }
  const art = werkzeugArtVon(a.id);
  const [zx, zy] = a.felder[0];
  const ctx = { s, ort: S.ort, id: a.id, art: art.art, felder: a.felder, zx, zy, ladung: a.ladung, S };
  ctx.erg = art.wirkung?.(ctx) ?? null;
  alle('schwung', ctx);
  ergebnisZeigen(ctx.erg);
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

function interagieren() {
  const s = S.s;
  const ort = S.ort;
  const def = ort.def;
  const { x, y } = S.ziel;
  const f = spielerFeld();
  blickZu(S.ziel);
  const n = npcAn(x, y) || npcAn(f.x, f.y);
  const idx = s.spieler.wahl;
  const ctx = { s, ort, x, y, f, npc: n, slot: s.spieler.inv[idx], idx, S };
  if (erster('interagieren', ctx) !== undefined) return;
  if (n) { npcAnsprechen(n); return; }
  const kk = L.k(x, y);
  const o = L.objektAn(s, ort, x, y);
  const typ = o && OBJEKT_TYPEN[o.t];
  if (typ?.interagieren) { typ.interagieren({ ...ctx, kk, o }); return; }
  if (typ?.aufnehmen) {
    const erg = typ.aufnehmen({ ...ctx, kk, o });
    if (erg?.ok) ton('pflueck');
    ergebnisZeigen(erg);
    return;
  }
  const feld = ort.welt.felder[kk];
  if (L.reif(feld)) {
    const erg = L.ernten(s, ort, x, y);
    if (erg?.ok) { ton('ernte'); blaetter(x, y); }
    ergebnisZeigen(erg);
    return;
  }
  const d = L.dekoAn(s, def, x, y) || L.dekoAn(s, def, f.x, f.y);
  if (d?.aktion) { DEKO_AKTIONEN[d.aktion]?.fn(d, ctx); return; }
  const g = L.gebaeudeAn(s, def, x, y);
  if (g) gebaeudeBenutzen(g, ctx);
}

function gebaeudeBenutzen(g, ctx) {
  const s = S.s;
  if (g.aktion && GEBAEUDE_AKTIONEN[g.aktion]) { GEBAEUDE_AKTIONEN[g.aktion].fn(g, ctx); return; }
  if (g.zu) { dialog(null, [g.zu]); return; }
  if (g.tuerWenn && !L.erfuellt(s, g.tuerWenn)) dialog(null, [g.sonst]);
}

export function postZeigen(manuell) {
  const s = S.s;
  if (s.post.length) { fenster('brief', { id: s.post[0], weiter: true }); return; }
  if (manuell) dialog(null, ['Keine neue Post.']);
}

// Läden: offen ist, wenn die Person an der Theke steht.

function ladenOffenBei(ladenId, n) {
  const l = LAEDEN[ladenId];
  if (!n || l.npc !== n.id) return false;
  if (l.ruhetag && L.wochentag(S.s.zeit) === l.ruhetag) return false;
  if (l.zeiten) {
    const m = S.s.zeit.minute;
    if (m < L.planMinute(l.zeiten[0]) || m >= L.planMinute(l.zeiten[1])) return false;
  }
  const o = L.ladenOrt(ladenId);
  return n.karte === o.karte && Math.abs(n.x - (o.x * T + 8)) < 20 && Math.abs(n.y - (o.y * T + 13)) < 20;
}

function oeffnungszeiten(ladenId) {
  const l = LAEDEN[ladenId];
  const ruhe = l.ruhetag ? `, ${l.ruhetag} geschlossen` : '';
  if (l.zeiten) return `${L.uhrzeit(L.planMinute(l.zeiten[0]))} bis ${L.uhrzeit(L.planMinute(l.zeiten[1]))} Uhr${ruhe}`;
  const plan = NPCS[l.npc].plan.normal;
  const o = L.ladenOrt(ladenId);
  const i = plan.findIndex((e) => { const z = L.planZiel(e); return z && z.karte === o.karte && z.x === o.x && z.y === o.y; });
  if (i < 0) return '';
  const bis = plan[i + 1]?.[0] ?? 2400;
  return `${L.uhrzeit(L.planMinute(plan[i][0]))} bis ${L.uhrzeit(L.planMinute(bis))} Uhr${ruhe}`;
}

export function ladenOeffnen(ladenId) {
  const l = LAEDEN[ladenId];
  const n = S.npcs.find((x) => x.id === l.npc);
  if (ladenOffenBei(ladenId, n)) { ton('laden'); fenster('laden', { laden: ladenId }); return; }
  const zeiten = oeffnungszeiten(ladenId);
  dialog(null, [`${NPCS[l.npc].name} ist gerade nicht hier.${zeiten ? ` ${l.name}: ${zeiten}.` : ''}`]);
}

export function ladenGeoeffnetBei(n) {
  for (const id of Object.keys(LAEDEN)) if (ladenOffenBei(id, n)) return id;
  return null;
}

export function npcAnsprechen(n) {
  const s = S.s;
  const sp = S.sp;
  n.blick = Math.abs(sp.x - n.x) > Math.abs(sp.y - n.y) ? (sp.x < n.x ? 'links' : 'rechts') : (sp.y < n.y ? 'oben' : 'unten');
  n.pause = 3;
  const idx = s.spieler.wahl;
  const slot = s.spieler.inv[idx];
  if (erster('npcAnsprechen', n, { s, slot, idx, S }) !== undefined) return;
  const optionen = [];
  const laden = ladenGeoeffnetBei(n);
  if (laden) optionen.push(['Einkaufen', () => { ton('laden'); fenster('laden', { laden }); }]);
  optionen.push(['Reden', () => reden(n)]);
  optionen.push(...sammle('npcOptionen', n, s));
  if (L.verschenkbar(slot) && !s.npcs[n.id].beschenkt) {
    optionen.push([`${L.nameVon(slot, s)} schenken`, () => schenken(n, idx)]);
  }
  if (optionen.length > 1) {
    dialog(n.id, [laden ? 'Was darf’s sein?' : 'Ja?'], optionen);
    return;
  }
  reden(n);
}

function reden(n) {
  const erg = L.gespraech(S.s, n.id, S.ort);
  dialog(n.id, erg.texte);
  if (erg.items.length) { ton('fanfare'); ergebnisZeigen(erg); }
}

function schenken(n, idx) {
  const erg = L.schenken(S.s, n.id, idx);
  if (!erg) return;
  if (erg.grund) { dialog(n.id, [erg.grund]); return; }
  ton(erg.punkte > 0 ? 'pop' : 'dumpf');
  if (erg.punkte > 0) herzchen(n.x, n.y);
  dialog(n.id, [erg.text]);
}

// Deko-Aktionen, die zum Kern gehören (Läden, Schilder)
dekoAktion('laden', (d) => {
  const l = LAEDEN[d.laden];
  const n = S.npcs.find((x) => x.id === l.npc);
  if (n && ladenGeoeffnetBei(n) === d.laden) npcAnsprechen(n);
  else ladenOeffnen(d.laden);
}, (d) => LAEDEN[d.laden]?.name || '');
dekoAktion('text', (d) => dialog(null, [d.text]), 'Lesen');

// ─── Schlafen und Speichern ─────────────────────────────────────────────────

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
  const b = L.bettPunkt();
  karteBetreten('haus', b.x, b.y, 'unten');
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
  const def = S.ort.def;
  if (def.fluechtig) {
    const z = def.speicherOrt ? zielVon(def.speicherOrt) : { karte: 'haus', ...L.bettPunkt() };
    s.spieler.karte = z.karte;
    s.spieler.x = z.x;
    s.spieler.y = z.y;
  } else {
    const f = spielerFeld();
    const imWarp = L.warpAn(def, f.x, f.y) || L.tuerAn(s, def, f.x, f.y);
    s.spieler.karte = def.id;
    if (!imWarp) { s.spieler.x = f.x; s.spieler.y = f.y; }
  }
  s.spieler.blick = S.sp.blick;
  return s;
}

// ─── Funde am Boden ─────────────────────────────────────────────────────────

function fundeEinsammeln() {
  const w = S.ort.welt;
  const f = spielerFeld();
  const kk = L.k(f.x, f.y);
  const o = w.objekte[kk];
  const typ = o && OBJEKT_TYPEN[o.t];
  if (typ?.aufnehmen) {
    const erg = typ.aufnehmen({ s: S.s, ort: S.ort, x: f.x, y: f.y, kk, o, automatisch: true, S });
    if (erg?.ok) { ton('pflueck'); ergebnisZeigen(erg); }
  }
  if (!w.funde?.length) return;
  for (const fund of [...w.funde]) {
    const fx = fund.x * T + 8;
    const fy = fund.y * T + 8;
    if (Math.hypot(fx - S.sp.x, fy - (S.sp.y - 6)) >= 22) continue;
    const rest = L.hinzufuegen(S.s, fund.slot);
    if (rest < fund.slot.n) { fundeZeigen([{ ...fund.slot, n: fund.slot.n - rest }]); ton('pop'); }
    if (rest <= 0) w.funde.splice(w.funde.indexOf(fund), 1);
    else fund.slot.n = rest;
  }
}

// ─── Hinweis, was die Aktionstaste gerade täte ──────────────────────────────

const aktionsHinweis = (a, ding, s) => (typeof a?.hinweis === 'function' ? a.hinweis(ding, s) : a?.hinweis || '');

function hinweisBerechnen() {
  const s = S.s;
  const { x, y } = S.ziel;
  const ort = S.ort;
  const f = spielerFeld();
  const n = npcAn(x, y) || npcAn(f.x, f.y);
  const ctx = { s, ort, x, y, f, npc: n, slot: s.spieler.inv[s.spieler.wahl], S };
  const h = erster('hinweis', ctx);
  S.hinweis = (h === undefined ? standardHinweis(ctx) : h) || '';
}

function standardHinweis({ s, ort, x, y, f, npc }) {
  if (npc) return `${NPCS[npc.id].name} ansprechen`;
  const o = L.objektAn(s, ort, x, y);
  const typ = o && OBJEKT_TYPEN[o.t];
  if (typ?.hinweis) {
    const h = typeof typ.hinweis === 'function' ? typ.hinweis({ s, ort, x, y, o }) : typ.hinweis;
    if (h) return h;
  }
  const feld = ort.welt.felder[L.k(x, y)];
  if (L.reif(feld)) return `${ITEMS[PFLANZEN[feld.pflanze.id].ernte].name} ernten`;
  const d = L.dekoAn(s, ort.def, x, y) || L.dekoAn(s, ort.def, f.x, f.y);
  if (d?.aktion) return aktionsHinweis(DEKO_AKTIONEN[d.aktion], d, s);
  const g = L.gebaeudeAn(s, ort.def, x, y);
  if (g?.aktion && GEBAEUDE_AKTIONEN[g.aktion]) return aktionsHinweis(GEBAEUDE_AKTIONEN[g.aktion], g, s);
  if (g && (g.zu || (g.tuerWenn && !L.erfuellt(s, g.tuerWenn)))) return 'Tür';
  return '';
}

// ─── Dorfbewohner ───────────────────────────────────────────────────────────

function aktuellerEintrag(id) {
  const plan = L.npcTagesplan(S.s, id);
  const m = S.s.zeit.minute;
  let idx = 0;
  for (let i = 0; i < plan.length; i++) if (L.planMinute(plan[i][0]) <= m) idx = i;
  return [idx, plan[idx]];
}

function npcsPlatzieren() {
  for (const n of S.npcs) {
    const [idx, eintrag] = aktuellerEintrag(n.id);
    const z = L.planZiel(eintrag);
    n.eintrag = idx;
    n.pfad = [];
    if (z) {
      n.karte = z.karte;
      n.x = z.x * T + 8;
      n.y = z.y * T + 13;
      n.ziel = z;
    } else {
      n.karte = null;
      n.ziel = { ...L.npcHeim(n.id), heim: true };
    }
  }
}

function npcsUpdate(dt) {
  for (const n of S.npcs) {
    const [idx, eintrag] = aktuellerEintrag(n.id);
    if (idx !== n.eintrag) {
      n.eintrag = idx;
      const z = L.planZiel(eintrag);
      n.ziel = z || { ...L.npcHeim(n.id), heim: true };
      if (!n.karte && !n.ziel.heim) {
        const h = L.npcHeim(n.id);
        n.karte = h.karte;
        n.x = h.x * T + 8;
        n.y = h.y * T + 13;
      }
      n.pfad = n.karte ? L.wegPlanen(S.s, { karte: n.karte, x: Math.floor(n.x / T), y: Math.floor((n.y - 3) / T) }, n.ziel).schritte : [];
    }
    npcBewegen(n, dt);
  }
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
