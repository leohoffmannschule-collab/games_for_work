// Spiellogik ohne Bildschirm: Spielstand, Rucksack, Feldarbeit, Tageswechsel,
// Freundschaften, Aufträge, Mühle, Läden, Basteln, Speichern.
//
// Ein „Ort" ist { def, welt }: die feste Kartenbeschreibung und ihr veränderlicher Teil
// (Objekte, Beete, liegengebliebene Funde). Für Minenebenen kommt beides vom Generator.

import {
  ITEMS, PFLANZEN, SAAT_ZU_PFLANZE, JZ, JZ_NAME, TAGE_PRO_JZ, TAG_BEGINN, MAX_ENERGIE, MAX_HP,
  STAPEL_MAX, XP_STUFEN, QUALITAET, KANNE_INHALT, WERKZEUG_STUFEN, AUFRUESTBAR, LAEDEN, NPCS,
  PUNKTE_PRO_HERZ, MAX_HERZEN, GESCHENK_PUNKTE, BUENDEL, BRIEFE, FISCHE, MUELL, HUEHNER_NAMEN,
  WOCHENTAGE,
} from './daten.js';
import { KARTEN, boden, BLOCK_BODEN } from './karten.js';
import { zufall, ganz, waehle } from './zufall.js';
import { steinErtrag, SCHATZ } from './mine.js';

export const SPEICHER_VERSION = 1;
export const k = (x, y) => `${x},${y}`;
export const RICHTUNG = { oben: [0, -1], unten: [0, 1], links: [-1, 0], rechts: [1, 0] };

export const BLOCKIERT = new Set([
  'baum', 'stumpf', 'ast', 'stein', 'fels', 'grossstumpf', 'unkraut',
  'truhe', 'vogelscheuche', 'sprenger', 'qsprenger', 'einmachglas', 'mstein', 'schatz',
]);
const AUFSTELLBAR = new Set(['truhe', 'vogelscheuche', 'sprenger', 'qsprenger', 'einmachglas']);
const MAX_PUNKTE = MAX_HERZEN * PUNKTE_PRO_HERZ;

// ─── Neues Spiel ────────────────────────────────────────────────────────────

export function neuesSpiel({ name = 'Liesel', hof = 'Sonnenhof', aussehen = {}, seed } = {}) {
  seed ??= Math.floor(Math.random() * 2 ** 31);
  const r = zufall(seed);
  const s = {
    version: SPEICHER_VERSION,
    seed,
    spieler: {
      name, hof,
      aussehen: { haut: '#f0c8a0', haare: '#6b4428', frisur: 'kurz', hemd: '#c8553d', hose: '#3b4a6b', ...aussehen },
      gold: 500, energie: MAX_ENERGIE, maxEnergie: MAX_ENERGIE, hp: MAX_HP, maxHp: MAX_HP,
      inv: Array(24).fill(null), invGroesse: 24, wahl: 0,
      werkzeug: { hacke: 0, giesskanne: 0, axt: 0, spitzhacke: 0 },
      wasser: KANNE_INHALT[0],
      xp: { landwirtschaft: 0, angeln: 0, sammeln: 0, bergbau: 0, kampf: 0 },
      karte: 'haus', x: 3, y: 4, blick: 'unten', tempoBis: 0,
    },
    zeit: { tag: 1, jz: 0, jahr: 1, minute: TAG_BEGINN, wetter: 'sonne', morgen: 'sonne' },
    welt: {},
    npcs: {},
    quest: null,
    brett: null,
    buendel: {},
    muehle: false,
    mine: { tiefste: 0, schwert: false, truhen: [] },
    stall: { gebaut: false, bauMorgen: false, huehner: [] },
    briefe: [],
    post: [],
    versand: [],
    stufeNeu: [],
    flags: {},
    stats: { verdient: 0, geerntet: 0, gefangen: 0, baeume: 0, auftraege: 0, tage: 1 },
  };
  ergaenzen(s);
  for (const id of ['hacke', 'giesskanne', 'axt', 'spitzhacke', 'sense']) hinzufuegen(s, { id, n: 1 });
  hinzufuegen(s, { id: 'pastinake_saat', n: 15 });
  verwildern(s, r);
  for (const id of ['hof', 'dorf', 'strand']) sammelSpawnen(s, id, r, 3);
  s.brett = questErzeugen(s, r);
  s.post = postFuerHeute(s);
  return s;
}

function ergaenzen(s) {
  s.welt ??= {};
  for (const id of Object.keys(KARTEN)) welt(s, id);
  for (const id of Object.keys(NPCS)) {
    s.npcs[id] ??= {};
    const n = s.npcs[id];
    n.punkte ??= 0;
    n.gesprochen ??= false;
    n.beschenkt ??= false;
    n.herzGesehen ??= [];
    n.herzGeschenke ??= [];
  }
  s.stufeNeu ??= [];
  s.flags ??= {};
  s.versand ??= [];
  s.post ??= [];
  s.briefe ??= [];
}

export function welt(s, id) {
  s.welt[id] ??= { objekte: {}, felder: {}, funde: [] };
  s.welt[id].funde ??= [];
  s.welt[id].felder ??= {};
  return s.welt[id];
}
export const ortVon = (s, id) => ({ def: KARTEN[id], welt: welt(s, id) });

function imBereich(b, x, y) { return x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h; }

/** Der Hof ist zu Beginn zugewachsen: Bäume, Steine, Unkraut, Äste. */
function verwildern(s, r) {
  const def = KARTEN.hof;
  const w = welt(s, 'hof');
  for (let y = 1; y < def.h - 1; y++) {
    for (let x = 1; x < def.w - 1; x++) {
      if (boden(def, x, y) !== '.') continue;
      if (def.frei.some((b) => imBereich(b, x, y))) continue;
      let nahWeg = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const b = boden(def, x + dx, y + dy);
        if (b === ':' || b === '~') nahWeg = true;
      }
      if (nahWeg || !begehbar(s, def, w, x, y)) continue;
      const z = r();
      let o = null;
      if (z < 0.07) o = { t: 'baum', hp: 8, art: r() < 0.3 ? 'kiefer' : 'eiche' };
      else if (z < 0.12) o = { t: 'stein', hp: 2, v: ganz(r, 0, 2) };
      else if (z < 0.2) o = { t: 'unkraut', v: ganz(r, 0, 2) };
      else if (z < 0.235) o = { t: 'ast', v: ganz(r, 0, 1) };
      else if (z < 0.241) o = { t: 'fels', hp: 6 };
      else if (z < 0.247) o = { t: 'grossstumpf', hp: 8 };
      if (o) w.objekte[k(x, y)] = o;
    }
  }
}

// ─── Bedingungen und Begehbarkeit ───────────────────────────────────────────

export function bedingung(s, b) {
  switch (b) {
    case undefined: case null: return true;
    case 'stall': return s.stall.gebaut;
    case 'keinStall': return !s.stall.gebaut && !s.stall.bauMorgen;
    case 'mineOffen': return !!s.flags.mineOffen;
    case 'keinSchwert': return !s.mine.schwert;
    case 'keineAngel': return !hat(s, 'angel');
    case 'rucksack': return s.spieler.invGroesse < 36;
    default: return true;
  }
}
export const gebaeudeListe = (s, def) => def.gebaeude.filter((g) => bedingung(s, g.nurWenn));
export const dekoListe = (s, def) => def.deko.filter((d) => bedingung(s, d.nurWenn));

const blockCache = new WeakMap();
export function statischBlockiert(s, def) {
  const schluessel = `${s.stall.gebaut}|${s.mine.schwert}|${!!s.flags.mineOffen}|${s.stall.bauMorgen}`;
  const c = blockCache.get(def);
  if (c && c.schluessel === schluessel) return c.set;
  const set = new Set();
  for (const g of gebaeudeListe(s, def)) {
    for (let y = g.y; y < g.y + g.h; y++) for (let x = g.x; x < g.x + g.w; x++) set.add(k(x, y));
    if (g.ziel && bedingung(s, g.tuerWenn)) set.delete(k(g.tuer.x, g.tuer.y));
  }
  for (const d of dekoListe(s, def)) {
    if (d.wand || d.begehbar) continue;
    for (let y = d.y; y < d.y + (d.h || 1); y++) for (let x = d.x; x < d.x + (d.w || 1); x++) set.add(k(x, y));
  }
  blockCache.set(def, { schluessel, set });
  return set;
}

export function begehbar(s, def, w, x, y) {
  if (BLOCK_BODEN.has(boden(def, x, y))) return false;
  if (statischBlockiert(s, def).has(k(x, y))) return false;
  const o = w?.objekte[k(x, y)];
  return !(o && BLOCKIERT.has(o.t));
}

export function dekoAn(s, def, x, y) {
  return dekoListe(s, def).find((d) => x >= d.x && x < d.x + (d.w || 1) && y >= d.y && y < d.y + (d.h || 1));
}
export function gebaeudeAn(s, def, x, y) {
  return gebaeudeListe(s, def).find((g) => x >= g.x && x < g.x + g.w && y >= g.y && y < g.y + g.h);
}
export function warpAn(def, x, y) {
  return def.warps.find((w) => imBereich(w, x, y));
}

// ─── Zeit ───────────────────────────────────────────────────────────────────

export const tagNr = (z) => (z.jahr - 1) * TAGE_PRO_JZ * 4 + z.jz * TAGE_PRO_JZ + z.tag;
export const wochentag = (z) => WOCHENTAGE[(tagNr(z) - 1) % 7];
export function uhrzeit(minute) {
  const h = Math.floor(minute / 60) % 24;
  return `${h}:${String(minute % 60).padStart(2, '0')}`;
}
export const regnet = (s) => s.zeit.wetter === 'regen' || s.zeit.wetter === 'sturm';
export const jahreszeit = (s) => JZ[s.zeit.jz];

// ─── Rucksack ───────────────────────────────────────────────────────────────

export const stapelbar = (id) => ITEMS[id].kat !== 'werkzeug';
export const gleich = (a, b) => a.id === b.id && (a.q || 0) === (b.q || 0) && (a.von || null) === (b.von || null);
export const hat = (s, id) => s.spieler.inv.some((x) => x && x.id === id);

function slotKopie(slot, n) {
  const neu = { id: slot.id, n };
  if (slot.q) neu.q = slot.q;
  if (slot.von) neu.von = slot.von;
  return neu;
}

export function platzFuer(s, slot) {
  const inv = s.spieler.inv;
  if (!stapelbar(slot.id)) return inv.some((x) => !x) ? 1 : 0;
  let platz = 0;
  for (const x of inv) {
    if (!x) platz += STAPEL_MAX;
    else if (gleich(x, slot)) platz += STAPEL_MAX - x.n;
  }
  return platz;
}

/** Legt einen Stapel in den Rucksack. Gibt zurück, wie viel nicht hineinpasste. */
export function hinzufuegen(s, slot) {
  return inBehaelter(s.spieler.inv, slot);
}

export function inBehaelter(inv, slot) {
  let rest = slot.n;
  if (stapelbar(slot.id)) {
    for (const x of inv) {
      if (rest <= 0) break;
      if (x && gleich(x, slot) && x.n < STAPEL_MAX) {
        const dazu = Math.min(rest, STAPEL_MAX - x.n);
        x.n += dazu;
        rest -= dazu;
      }
    }
  }
  for (let i = 0; i < inv.length && rest > 0; i++) {
    if (inv[i]) continue;
    const dazu = stapelbar(slot.id) ? Math.min(rest, STAPEL_MAX) : 1;
    inv[i] = slotKopie(slot, dazu);
    rest -= dazu;
  }
  return rest;
}

export function anzahl(s, id) {
  return s.spieler.inv.reduce((n, x) => n + (x && x.id === id ? x.n : 0), 0);
}

/** Nimmt n Stück einer Sorte heraus, schlechteste Qualität zuerst. */
export function entfernen(s, id, n) {
  if (anzahl(s, id) < n) return false;
  const inv = s.spieler.inv;
  const reihenfolge = inv.map((x, i) => [x, i]).filter(([x]) => x && x.id === id).sort((a, b) => (a[0].q || 0) - (b[0].q || 0));
  for (const [x, i] of reihenfolge) {
    if (n <= 0) break;
    const weg = Math.min(n, x.n);
    x.n -= weg;
    n -= weg;
    if (x.n <= 0) inv[i] = null;
  }
  return true;
}

export function entfernenAusSlot(s, idx, n = 1) {
  const x = s.spieler.inv[idx];
  if (!x) return;
  x.n -= n;
  if (x.n <= 0) s.spieler.inv[idx] = null;
}

export function tauschen(s, a, b) {
  const inv = s.spieler.inv;
  if (inv[a] && inv[b] && a !== b && gleich(inv[a], inv[b]) && stapelbar(inv[a].id)) {
    const dazu = Math.min(inv[a].n, STAPEL_MAX - inv[b].n);
    inv[b].n += dazu;
    inv[a].n -= dazu;
    if (inv[a].n <= 0) inv[a] = null;
    return;
  }
  [inv[a], inv[b]] = [inv[b], inv[a]];
}

export function grundpreis(slot) {
  const it = ITEMS[slot.id];
  if (it.kat === 'artisan' && slot.von) return ITEMS[slot.von].preis * 2 + 50;
  return it.preis;
}
export const preisVon = (slot) => Math.floor(grundpreis(slot) * QUALITAET[slot.q || 0].faktor);

export function nameVon(slot, s) {
  const it = ITEMS[slot.id];
  if (it.kat === 'artisan' && slot.von) return `${it.name} (${ITEMS[slot.von].name})`;
  if (s && it.kat === 'werkzeug' && AUFRUESTBAR.includes(slot.id)) return werkzeugName(slot.id, s.spieler.werkzeug[slot.id]);
  return it.name;
}

export function werkzeugName(id, stufe) {
  if (!stufe) return ITEMS[id].name;
  const grund = { hacke: 'hacke', giesskanne: 'gießkanne', axt: 'axt', spitzhacke: 'spitzhacke' }[id];
  return `${WERKZEUG_STUFEN[stufe].name}${grund}`;
}

export function energieVon(slot) {
  const it = ITEMS[slot.id];
  let e = it.energie || 0;
  if (it.kat === 'artisan' && slot.von) e = Math.round((ITEMS[slot.von].energie || 20) * 2);
  return Math.round(e * (1 + 0.4 * (slot.q || 0)));
}
export const essbar = (slot) => !!slot && (energieVon(slot) > 0 || !!ITEMS[slot.id].tempo);

export function verkaufbar(slot) {
  const it = ITEMS[slot.id];
  return !['werkzeug', 'platz', 'besonders'].includes(it.kat) && preisVon(slot) > 0;
}

// ─── Fähigkeiten ────────────────────────────────────────────────────────────

export function stufe(s, skill) {
  const xp = s.spieler.xp[skill];
  let l = 0;
  while (l < 10 && xp >= XP_STUFEN[l]) l++;
  return l;
}

export function xpGeben(s, skill, n, erg) {
  const vor = stufe(s, skill);
  s.spieler.xp[skill] += Math.round(n);
  const nach = stufe(s, skill);
  if (nach > vor) {
    s.stufeNeu.push({ skill, stufe: nach });
    if (erg) erg.stufe = { skill, stufe: nach };
    if (skill === 'kampf') s.spieler.maxHp = MAX_HP + 5 * nach;
  }
}

export function energieKosten(s, id, ladung = 0) {
  const skill = { hacke: 'landwirtschaft', giesskanne: 'landwirtschaft', axt: 'sammeln', spitzhacke: 'bergbau' }[id];
  if (!skill) return 0;
  return Math.max(0.5, 2 - 0.1 * stufe(s, skill)) * (ladung + 1);
}

// ─── Feldarbeit ─────────────────────────────────────────────────────────────

/** Welche Felder ein (aufgeladenes) Werkzeug trifft, beginnend beim Zielfeld. */
export function werkzeugFelder(zx, zy, blick, ladung = 0) {
  const [dx, dy] = RICHTUNG[blick];
  const quer = [dy !== 0 ? 1 : 0, dx !== 0 ? 1 : 0];
  const felder = [];
  if (ladung <= 0) return [[zx, zy]];
  if (ladung <= 2) {
    const lang = ladung === 1 ? 3 : 5;
    for (let i = 0; i < lang; i++) felder.push([zx + dx * i, zy + dy * i]);
  } else {
    for (let i = 0; i < 3; i++) for (let j = -1; j <= 1; j++) felder.push([zx + dx * i + quer[0] * j, zy + dy * i + quer[1] * j]);
  }
  return felder;
}

export function senseFelder(zx, zy, blick) {
  const [dx, dy] = RICHTUNG[blick];
  const qx = dy !== 0 ? 1 : 0;
  const qy = dx !== 0 ? 1 : 0;
  return [[zx, zy], [zx + qx, zy + qy], [zx - qx, zy - qy]];
}

/** Gibt einen Stapel in den Rucksack; was nicht passt, bleibt auf dem Boden liegen. */
export function geben(s, ort, x, y, slot, erg) {
  const rest = hinzufuegen(s, slot);
  if (erg) erg.items.push(slotKopie(slot, slot.n));
  if (rest > 0) {
    if (ort) ort.welt.funde.push({ x, y, slot: slotKopie(slot, rest) });
    if (erg) erg.voll = true;
  }
}

const neuesErgebnis = () => ({ items: [] });

export function hacken(s, ort, felder) {
  const { def, welt: w } = ort;
  const erg = neuesErgebnis();
  erg.n = 0;
  for (const [x, y] of felder) {
    if (!def.farmbar) { erg.grund = 'Hier lässt sich nichts anbauen. Dafür ist dein Hof da.'; break; }
    const b = boden(def, x, y);
    if (b !== '.' && b !== ':') continue;
    const kk = k(x, y);
    if (w.felder[kk] || w.objekte[kk] || !begehbar(s, def, w, x, y) || warpAn(def, x, y)) continue;
    w.felder[kk] = { nass: regnet(s) };
    erg.n++;
  }
  return erg;
}

export function giessen(s, ort, felder) {
  const { def, welt: w } = ort;
  const sp = s.spieler;
  const erg = neuesErgebnis();
  const [fx, fy] = felder[0];
  if (boden(def, fx, fy) === '~') {
    sp.wasser = KANNE_INHALT[sp.werkzeug.giesskanne];
    erg.gefuellt = true;
    return erg;
  }
  if (sp.wasser <= 0) { erg.leer = true; return erg; }
  erg.n = 0;
  for (const [x, y] of felder) {
    if (sp.wasser <= 0) break;
    const f = w.felder[k(x, y)];
    if (!f) continue;
    f.nass = true;
    sp.wasser--;
    erg.n++;
  }
  return erg;
}

export function saeen(s, ort, x, y, idx) {
  const slot = s.spieler.inv[idx];
  const pid = SAAT_ZU_PFLANZE[slot.id];
  const p = PFLANZEN[pid];
  const f = ort.welt.felder[k(x, y)];
  if (!f) return { grund: ort.def.farmbar ? 'Erst mit der Hacke den Boden lockern.' : null };
  if (f.pflanze) return {};
  const jz = jahreszeit(s);
  if (!p.jz.includes(jz)) {
    return { grund: `${ITEMS[slot.id].name} wachsen nur im ${p.jz.map((j) => JZ_NAME[j]).join(' und ')}.` };
  }
  f.pflanze = { id: pid, tage: 0 };
  entfernenAusSlot(s, idx, 1);
  return { ok: true };
}

export function duengen(s, ort, x, y, idx) {
  const f = ort.welt.felder[k(x, y)];
  if (!f) return { grund: 'Dünger gehört auf ein gelockertes Beet.' };
  if (f.duenger) return { grund: 'Hier ist schon gedüngt.' };
  if (f.pflanze && f.pflanze.tage > 0) return { grund: 'Dünger wirkt nur vor der Aussaat oder direkt danach.' };
  f.duenger = true;
  entfernenAusSlot(s, idx, 1);
  return { ok: true };
}

export const reif = (f) => !!f?.pflanze && !f.pflanze.tot && f.pflanze.tage >= PFLANZEN[f.pflanze.id].tage;

export function qualitaetWuerfeln(lvl, duenger, r = Math.random) {
  const gold = 0.01 + lvl * 0.02 + (duenger ? 0.12 : 0);
  const silber = Math.min(0.75, gold * 2 + (duenger ? 0.15 : 0));
  const z = r();
  return z < gold ? 2 : z < silber ? 1 : 0;
}

export function ernten(s, ort, x, y, r = Math.random) {
  const f = ort.welt.felder[k(x, y)];
  if (!reif(f)) return null;
  const p = f.pflanze;
  const def = PFLANZEN[p.id];
  if (platzFuer(s, { id: def.ernte, n: 1 }) < 1) return { grund: 'Dein Rucksack ist voll.', items: [] };
  const erg = neuesErgebnis();
  const q = qualitaetWuerfeln(stufe(s, 'landwirtschaft'), f.duenger, r);
  let n = def.menge;
  if (def.extra && r() < def.extra) n++;
  geben(s, ort, x, y, { id: def.ernte, n: 1, q }, erg);
  if (n > 1) geben(s, ort, x, y, { id: def.ernte, n: n - 1 }, erg);
  xpGeben(s, 'landwirtschaft', 16 * Math.log(0.018 * ITEMS[def.ernte].preis + 1), erg);
  if (def.nach) p.tage = def.tage - def.nach;
  else f.pflanze = null;
  s.stats.geerntet += n;
  erg.ok = true;
  return erg;
}

function unkrautWeg(s, ort, x, y, erg, r) {
  delete ort.welt.objekte[k(x, y)];
  if (r() < 0.5) geben(s, ort, x, y, { id: 'faser', n: 1 }, erg);
  erg.treffer = 'unkraut';
}

function aufheben(s, ort, x, y, o, erg) {
  if (o.t === 'truhe' && o.inv.some(Boolean)) { erg.grund = 'Die Truhe ist nicht leer.'; return; }
  if (o.t === 'einmachglas' && o.inhalt) { erg.grund = 'Im Einmachglas ist noch etwas.'; return; }
  if (platzFuer(s, { id: o.t, n: 1 }) < 1) { erg.grund = 'Dein Rucksack ist voll.'; return; }
  delete ort.welt.objekte[k(x, y)];
  geben(s, ort, x, y, { id: o.t, n: 1 }, erg);
  erg.treffer = 'aufheben';
}

export function axtHieb(s, ort, x, y, r = Math.random) {
  const w = ort.welt;
  const kk = k(x, y);
  const o = w.objekte[kk];
  const lvl = s.spieler.werkzeug.axt;
  const kraft = 1 + lvl;
  const erg = neuesErgebnis();
  if (!o) return erg;
  if (o.t === 'baum') {
    o.hp -= kraft;
    erg.treffer = 'holz';
    if (o.hp <= 0) {
      geben(s, ort, x, y, { id: 'holz', n: ganz(r, 10, 14) }, erg);
      if (r() < 0.6) geben(s, ort, x, y, { id: 'saft', n: ganz(r, 1, 3) }, erg);
      xpGeben(s, 'sammeln', 12, erg);
      w.objekte[kk] = { t: 'stumpf', hp: 4, art: o.art };
      s.stats.baeume++;
      erg.gefallen = o.art || 'eiche';
    }
  } else if (o.t === 'stumpf') {
    o.hp -= kraft;
    erg.treffer = 'holz';
    if (o.hp <= 0) {
      delete w.objekte[kk];
      geben(s, ort, x, y, { id: 'holz', n: ganz(r, 3, 5) }, erg);
      xpGeben(s, 'sammeln', 2, erg);
    }
  } else if (o.t === 'ast') {
    delete w.objekte[kk];
    geben(s, ort, x, y, { id: 'holz', n: ganz(r, 1, 2) }, erg);
    erg.treffer = 'holz';
  } else if (o.t === 'grossstumpf') {
    if (lvl < 1) {
      erg.grund = 'Dieser Stumpf ist zu zäh. Bruno kann deine Axt verbessern.';
      erg.treffer = 'abprall';
    } else {
      o.hp -= kraft;
      erg.treffer = 'holz';
      if (o.hp <= 0) {
        delete w.objekte[kk];
        geben(s, ort, x, y, { id: 'hartholz', n: 2 }, erg);
        xpGeben(s, 'sammeln', 25, erg);
      }
    }
  } else if (o.t === 'unkraut') {
    unkrautWeg(s, ort, x, y, erg, r);
  } else if (AUFSTELLBAR.has(o.t)) {
    aufheben(s, ort, x, y, o, erg);
  }
  return erg;
}

export function spitzhackeHieb(s, ort, x, y, r = Math.random) {
  const w = ort.welt;
  const kk = k(x, y);
  const o = w.objekte[kk];
  const lvl = s.spieler.werkzeug.spitzhacke;
  const kraft = 1 + lvl;
  const erg = neuesErgebnis();
  if (!o) {
    const f = w.felder[kk];
    if (f && !f.pflanze) {
      delete w.felder[kk];
      erg.treffer = 'erde';
    }
    return erg;
  }
  if (o.t === 'stein') {
    o.hp -= kraft;
    erg.treffer = 'stein';
    if (o.hp <= 0) {
      delete w.objekte[kk];
      geben(s, ort, x, y, { id: 'stein', n: ganz(r, 1, 2) }, erg);
      if (r() < 0.04) geben(s, ort, x, y, { id: 'kohle', n: 1 }, erg);
      xpGeben(s, 'bergbau', 1, erg);
    }
  } else if (o.t === 'fels') {
    if (lvl < 1) {
      erg.grund = 'Dieser Felsbrocken ist zu hart. Bruno kann deine Spitzhacke verbessern.';
      erg.treffer = 'abprall';
    } else {
      o.hp -= kraft;
      erg.treffer = 'stein';
      if (o.hp <= 0) {
        delete w.objekte[kk];
        geben(s, ort, x, y, { id: 'stein', n: ganz(r, 10, 15) }, erg);
        if (r() < 0.5) geben(s, ort, x, y, { id: 'kupfererz', n: ganz(r, 1, 3) }, erg);
        xpGeben(s, 'bergbau', 15, erg);
      }
    }
  } else if (o.t === 'mstein') {
    o.hp -= kraft;
    erg.treffer = 'stein';
    if (o.hp <= 0) {
      const ebene = ort.def.ebene || 1;
      const ertrag = steinErtrag(o.art, ebene, r, stufe(s, 'bergbau'));
      delete w.objekte[kk];
      for (const it of ertrag.items) geben(s, ort, x, y, it, erg);
      xpGeben(s, 'bergbau', ertrag.xp, erg);
      erg.zerbrochen = o.art;
      if (o.leiter || (ebene < 30 && r() < 0.025)) {
        w.objekte[kk] = { t: 'leiter' };
        erg.leiter = true;
      }
    }
  } else if (o.t === 'unkraut') {
    unkrautWeg(s, ort, x, y, erg, r);
  } else if (AUFSTELLBAR.has(o.t)) {
    aufheben(s, ort, x, y, o, erg);
  }
  return erg;
}

export function senseSchnitt(s, ort, felder, r = Math.random) {
  const w = ort.welt;
  const erg = neuesErgebnis();
  erg.n = 0;
  for (const [x, y] of felder) {
    const kk = k(x, y);
    const o = w.objekte[kk];
    if (o && o.t === 'unkraut') {
      unkrautWeg(s, ort, x, y, erg, r);
      erg.n++;
    }
    const f = w.felder[kk];
    if (f?.pflanze?.tot) {
      f.pflanze = null;
      erg.n++;
    }
  }
  return erg;
}

export function aufstellen(s, ort, x, y, idx) {
  const slot = s.spieler.inv[idx];
  const { def, welt: w } = ort;
  if (!def.farmbar) return { grund: 'Das kannst du nur auf deinem Hof aufstellen.' };
  const kk = k(x, y);
  if (w.objekte[kk] || w.felder[kk] || !begehbar(s, def, w, x, y) || warpAn(def, x, y)) return { grund: 'Hier ist kein Platz.' };
  const o = { t: slot.id };
  if (slot.id === 'truhe') o.inv = Array(24).fill(null);
  if (slot.id === 'einmachglas') { o.inhalt = null; o.fertig = false; }
  w.objekte[kk] = o;
  entfernenAusSlot(s, idx, 1);
  return { ok: true };
}

export function glasBenutzen(s, ort, x, y, idx) {
  const o = ort.welt.objekte[k(x, y)];
  const erg = neuesErgebnis();
  if (o.fertig) {
    if (platzFuer(s, { ...o.inhalt, n: 1 }) < 1) return { grund: 'Dein Rucksack ist voll.', items: [] };
    geben(s, ort, x, y, { id: o.inhalt.id, von: o.inhalt.von, n: 1 }, erg);
    o.inhalt = null;
    o.fertig = false;
    erg.ok = true;
    return erg;
  }
  if (o.inhalt) return { grund: `${ITEMS[o.inhalt.von].name} wird eingemacht. Morgen früh ist es fertig.`, items: [] };
  const slot = idx != null ? s.spieler.inv[idx] : null;
  const it = slot && ITEMS[slot.id];
  if (!it || !['ernte', 'sammel'].includes(it.kat) || !(it.frucht || it.gemuese)) {
    return { grund: 'Halte Obst oder Gemüse in der Hand und benutze das Glas damit.', items: [] };
  }
  o.inhalt = { id: it.frucht ? 'marmelade' : 'eingelegt', von: slot.id };
  entfernenAusSlot(s, idx, 1);
  erg.ok = true;
  erg.text = `${it.name} eingelegt. Morgen früh ist es fertig.`;
  return erg;
}

export function aufsammeln(s, ort, x, y, r = Math.random) {
  const o = ort.welt.objekte[k(x, y)];
  if (!o || o.t !== 'sammel') return null;
  if (platzFuer(s, { id: o.id, n: 1 }) < 1) return { grund: 'Dein Rucksack ist voll.', items: [] };
  const erg = neuesErgebnis();
  const it = ITEMS[o.id];
  let q = 0;
  if (it.kat === 'sammel') {
    const lvl = stufe(s, 'sammeln');
    const z = r();
    q = z < lvl * 0.02 ? 2 : z < lvl * 0.07 ? 1 : 0;
  }
  delete ort.welt.objekte[k(x, y)];
  geben(s, ort, x, y, { id: o.id, n: 1, q }, erg);
  if (it.kat === 'tier') xpGeben(s, 'landwirtschaft', 5, erg);
  else xpGeben(s, 'sammeln', 7, erg);
  erg.ok = true;
  return erg;
}

export function schatzOeffnen(s, ort, x, y) {
  const o = ort.welt.objekte[k(x, y)];
  const erg = neuesErgebnis();
  for (const it of SCHATZ[o.ebene] || []) geben(s, ort, x, y, it, erg);
  s.mine.truhen.push(o.ebene);
  delete ort.welt.objekte[k(x, y)];
  erg.ok = true;
  return erg;
}

export function essen(s, idx) {
  const slot = s.spieler.inv[idx];
  if (!essbar(slot)) return null;
  const sp = s.spieler;
  const e = energieVon(slot);
  const name = nameVon(slot);
  sp.energie = Math.min(sp.maxEnergie, sp.energie + e);
  sp.hp = Math.min(sp.maxHp, sp.hp + Math.round(e * 0.45));
  if (ITEMS[slot.id].tempo) sp.tempoBis = s.zeit.minute + ITEMS[slot.id].tempo;
  entfernenAusSlot(s, idx, 1);
  return { energie: e, name, tempo: !!ITEMS[slot.id].tempo };
}

// ─── Versand und Truhen ─────────────────────────────────────────────────────

export function versenden(s, idx) {
  const slot = s.spieler.inv[idx];
  if (!slot || !verkaufbar(slot)) return null;
  s.spieler.inv[idx] = null;
  const rest = inBehaelter(s.versand, slot);
  if (rest > 0) s.versand.push(slotKopie(slot, rest));
  s.versandLetztes = slotKopie(slot, slot.n);
  return slot;
}

export function versandZurueck(s) {
  const slot = s.versandLetztes;
  if (!slot) return null;
  const i = s.versand.findIndex((x) => x && gleich(x, slot));
  if (i < 0) return null;
  const stapel = s.versand[i];
  const n = Math.min(slot.n, stapel.n);
  const rest = hinzufuegen(s, slotKopie(stapel, n));
  stapel.n -= n - rest;
  if (stapel.n <= 0) s.versand.splice(i, 1);
  s.versandLetztes = null;
  return true;
}

export const versandWert = (s) => s.versand.reduce((g, x) => g + preisVon(x) * x.n, 0);

/** Verschiebt einen ganzen Stapel zwischen Rucksack und Truhe. */
export function umlagern(von, idx, nach) {
  const slot = von[idx];
  if (!slot) return;
  const rest = inBehaelter(nach, slot);
  if (rest <= 0) von[idx] = null;
  else slot.n = rest;
}

// ─── Tageswechsel ───────────────────────────────────────────────────────────

export function wetterWuerfeln(s, r = Math.random) {
  let tag = s.zeit.tag + 1;
  let jz = s.zeit.jz;
  if (tag > TAGE_PRO_JZ) { tag = 1; jz = (jz + 1) % 4; }
  if (tag === 1 || tagNr(s.zeit) + 1 <= 3) return 'sonne';
  const j = JZ[jz];
  const z = r();
  if (j === 'winter') return z < 0.3 ? 'schnee' : 'sonne';
  const regen = { fruehling: 0.2, sommer: 0.12, herbst: 0.22 }[j];
  const sturm = { fruehling: 0.03, sommer: 0.08, herbst: 0.04 }[j];
  return z < sturm ? 'sturm' : z < sturm + regen ? 'regen' : 'sonne';
}

export function sammelPool(art, jz) {
  return Object.values(ITEMS)
    .filter((i) => i.kat === 'sammel' && (art === 'strand' ? i.strand : !i.strand) && (!i.jz || i.jz.includes(jz)))
    .map((i) => i.id);
}

export function sammelSpawnen(s, id, r, anzahlNeu) {
  const def = KARTEN[id];
  const w = welt(s, id);
  const jz = jahreszeit(s);
  for (const zone of def.sammel) {
    const pool = sammelPool(zone.art, jz);
    if (!pool.length) continue;
    const da = Object.entries(w.objekte).filter(([kk, o]) => {
      const [x, y] = kk.split(',').map(Number);
      return o.t === 'sammel' && o.wild && imBereich(zone, x, y);
    }).length;
    let n = Math.min(anzahlNeu, zone.max - da);
    for (let versuch = 0; versuch < 60 && n > 0; versuch++) {
      const x = zone.x + Math.floor(r() * zone.w);
      const y = zone.y + Math.floor(r() * zone.h);
      const b = boden(def, x, y);
      if (b !== (zone.art === 'strand' ? 's' : '.')) continue;
      const kk = k(x, y);
      if (w.objekte[kk] || w.felder[kk] || !begehbar(s, def, w, x, y)) continue;
      let wahl = waehle(r, pool);
      if (ITEMS[wahl].selten && r() > 0.25) wahl = waehle(r, pool.filter((p) => !ITEMS[p].selten));
      w.objekte[kk] = { t: 'sammel', id: wahl, wild: true };
      n--;
    }
  }
}

function nachwachsen(s, r) {
  const def = KARTEN.hof;
  const w = welt(s, 'hof');
  const winter = jahreszeit(s) === 'winter';
  const ziel = ganz(r, 1, 4);
  let gesetzt = 0;
  for (let i = 0; i < 60 && gesetzt < ziel; i++) {
    const x = ganz(r, 1, def.w - 2);
    const y = ganz(r, 2, def.h - 3);
    const kk = k(x, y);
    if (boden(def, x, y) !== '.' || def.frei.some((b) => imBereich(b, x, y))) continue;
    if (w.objekte[kk] || w.felder[kk] || !begehbar(s, def, w, x, y)) continue;
    const z = r();
    if (winter) w.objekte[kk] = z < 0.5 ? { t: 'stein', hp: 2, v: ganz(r, 0, 2) } : { t: 'ast', v: ganz(r, 0, 1) };
    else w.objekte[kk] = z < 0.6 ? { t: 'unkraut', v: ganz(r, 0, 2) } : z < 0.85 ? { t: 'stein', hp: 2, v: ganz(r, 0, 2) } : { t: 'ast', v: ganz(r, 0, 1) };
    gesetzt++;
  }
}

function eierLegen(s, r, bericht) {
  const def = KARTEN.hof;
  const w = welt(s, 'hof');
  const a = def.auslauf;
  let gelegt = 0;
  for (const h of s.stall.huehner) {
    h.freundschaft = Math.max(0, Math.min(1000, h.freundschaft + (h.gestreichelt ? 15 : -5)));
    h.gestreichelt = false;
    if (h.neu) { h.neu = false; continue; }
    const id = r() < (h.freundschaft / 1000) * 0.6 ? 'grossesei' : 'ei';
    for (let versuch = 0; versuch < 40; versuch++) {
      const x = a.x + Math.floor(r() * a.w);
      const y = a.y + Math.floor(r() * a.h);
      const kk = k(x, y);
      if (boden(def, x, y) === '~' || w.objekte[kk] || w.felder[kk] || !begehbar(s, def, w, x, y)) continue;
      w.objekte[kk] = { t: 'sammel', id };
      gelegt++;
      break;
    }
  }
  if (gelegt) bericht.meldungen.push(gelegt === 1 ? 'Im Auslauf liegt ein frisches Ei.' : `Im Auslauf liegen ${gelegt} frische Eier.`);
}

export function postFuerHeute(s) {
  const heute = tagNr(s.zeit);
  const jz = jahreszeit(s);
  const post = [];
  for (const b of BRIEFE) {
    if (b.tagNr && b.tagNr <= heute && !s.briefe.includes(b.id)) post.push(b.id);
    const jahresId = `${b.id}_${s.zeit.jahr}`;
    if (b.jz && b.jz === jz && b.tag === s.zeit.tag && !s.briefe.includes(jahresId)) post.push(jahresId);
  }
  return post;
}

export function briefGelesen(s, id) {
  if (!s.briefe.includes(id)) s.briefe.push(id);
  s.post = s.post.filter((p) => p !== id);
}

export function briefVon(id) {
  return BRIEFE.find((b) => b.id === id || id.startsWith(`${b.id}_`));
}

/**
 * Die Nacht: Versand auszahlen, Kalender weiter, Pflanzen wachsen lassen, Wetter,
 * Sprenger, Krähen, Einmachgläser, Hühner, Aufträge, Post. Gibt einen Bericht zurück.
 */
export function tagBeenden(s, { ohnmacht = false, r = Math.random } = {}) {
  const sp = s.spieler;
  const bericht = { verkauf: [], summe: 0, meldungen: [], stufen: [] };

  for (const slot of s.versand) {
    const preis = preisVon(slot) * slot.n;
    bericht.summe += preis;
    bericht.verkauf.push({ slot, preis });
  }
  sp.gold += bericht.summe;
  s.stats.verdient += bericht.summe;
  s.versand = [];
  s.versandLetztes = null;

  if (ohnmacht) {
    const verlust = Math.min(1000, Math.floor(sp.gold * 0.1));
    sp.gold -= verlust;
    bericht.ohnmacht = verlust;
  }

  const z = s.zeit;
  const alteJz = z.jz;
  z.tag++;
  if (z.tag > TAGE_PRO_JZ) {
    z.tag = 1;
    z.jz++;
    if (z.jz > 3) { z.jz = 0; z.jahr++; }
  }
  const neueJz = JZ[z.jz];
  const jzWechsel = z.jz !== alteJz;
  z.minute = TAG_BEGINN;
  z.wetter = z.morgen;
  z.morgen = wetterWuerfeln(s, r);

  const hof = welt(s, 'hof');
  let verwelkt = 0;
  for (const [kk, f] of Object.entries(hof.felder)) {
    const p = f.pflanze;
    if (p && !p.tot) {
      const def = PFLANZEN[p.id];
      if (f.nass && p.tage < def.tage) p.tage++;
      if (jzWechsel && !def.jz.includes(neueJz)) { p.tot = true; verwelkt++; }
    }
    if (!f.pflanze && !f.nass && r() < 0.1) { delete hof.felder[kk]; continue; }
    f.nass = false;
  }
  if (jzWechsel) {
    bericht.meldungen.push(`Der ${JZ_NAME[neueJz]} beginnt.`);
    if (verwelkt) bericht.meldungen.push(`${verwelkt} ${verwelkt === 1 ? 'Pflanze ist' : 'Pflanzen sind'} über Nacht verwelkt – sie wachsen nicht im ${JZ_NAME[neueJz]}.`);
  }

  // Krähen
  if (neueJz !== 'winter') {
    const pflanzen = Object.entries(hof.felder).filter(([, f]) => f.pflanze && !f.pflanze.tot);
    if (pflanzen.length >= 16 && r() < 0.4) {
      const scheuchen = Object.entries(hof.objekte).filter(([, o]) => o.t === 'vogelscheuche').map(([kk]) => kk.split(',').map(Number));
      const offen = pflanzen.filter(([kk]) => {
        const [x, y] = kk.split(',').map(Number);
        return !scheuchen.some(([sx, sy]) => (sx - x) ** 2 + (sy - y) ** 2 <= 64);
      });
      if (offen.length) {
        const [, f] = waehle(r, offen);
        bericht.meldungen.push(`Eine Krähe hat in der Nacht eine Pflanze gefressen (${ITEMS[f.pflanze.id].name}). Eine Vogelscheuche hält sie fern.`);
        f.pflanze = null;
      }
    }
  }

  if (regnet(s)) for (const f of Object.values(hof.felder)) f.nass = true;
  for (const [kk, o] of Object.entries(hof.objekte)) {
    if (o.t !== 'sprenger' && o.t !== 'qsprenger') continue;
    const [x, y] = kk.split(',').map(Number);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        if (o.t === 'sprenger' && dx && dy) continue;
        const f = hof.felder[k(x + dx, y + dy)];
        if (f) f.nass = true;
      }
    }
  }

  for (const w of Object.values(s.welt)) {
    for (const o of Object.values(w.objekte)) if (o.t === 'einmachglas' && o.inhalt && !o.fertig) o.fertig = true;
  }

  nachwachsen(s, r);
  if (jzWechsel) {
    for (const w of Object.values(s.welt)) {
      for (const [kk, o] of Object.entries(w.objekte)) if (o.t === 'sammel' && o.wild && !ITEMS[o.id].strand) delete w.objekte[kk];
    }
  }
  for (const id of ['hof', 'dorf', 'strand']) sammelSpawnen(s, id, r, 2);

  if (s.stall.bauMorgen) {
    s.stall.gebaut = true;
    s.stall.bauMorgen = false;
    bericht.meldungen.push('Bruno hat über Nacht deinen Hühnerstall gebaut! Küken gibt es bei Ottilie.');
  }
  if (s.stall.gebaut) eierLegen(s, r, bericht);

  for (const n of Object.values(s.npcs)) { n.gesprochen = false; n.beschenkt = false; }

  const heute = tagNr(z);
  if (s.quest && heute > s.quest.frist) {
    bericht.meldungen.push(`Der Auftrag von ${NPCS[s.quest.npc].name} ist abgelaufen.`);
    s.quest = null;
  }
  if (s.brett && heute > s.brett.bis) s.brett = null;
  if (!s.brett && !s.quest && r() < 0.6) s.brett = questErzeugen(s, r);

  if (heute >= 4) s.flags.mineOffen = true;
  s.post = postFuerHeute(s);

  sp.energie = ohnmacht ? Math.round(sp.maxEnergie / 2) : sp.maxEnergie;
  sp.hp = sp.maxHp;
  sp.karte = 'haus';
  sp.x = 3;
  sp.y = 4;
  sp.blick = 'unten';
  sp.tempoBis = 0;

  bericht.stufen = s.stufeNeu;
  s.stufeNeu = [];
  s.stats.tage++;
  return bericht;
}

// ─── Dorfbewohner ───────────────────────────────────────────────────────────

export const herzen = (s, id) => Math.floor(s.npcs[id].punkte / PUNKTE_PRO_HERZ);
export function geburtstagHeute(s, id) {
  const g = NPCS[id].geburtstag;
  return jahreszeit(s) === g.jz && s.zeit.tag === g.tag;
}
const ersetze = (s, t) => t.replaceAll('{name}', s.spieler.name).replaceAll('{hof}', s.spieler.hof);

export function gespraech(s, id, ort, r = Math.random) {
  const n = NPCS[id];
  const st = s.npcs[id];
  const erg = { texte: [], items: [] };
  const px = s.spieler.x;
  const py = s.spieler.y;

  if (id === 'lene' && !hat(s, 'angel') && !s.flags.angelBekommen && tagNr(s.zeit) >= 2) {
    erg.texte.push(ersetze(s, 'Ah, du bist {name}! Hier – die alte Bambusangel meines Großvaters. Hat lange genug in der Ecke gestanden.'));
    erg.texte.push('Halt die Taste gedrückt zum Auswerfen. Wenn’s zuckt: sofort ziehen! Dann den grünen Balken über dem Fisch halten.');
    geben(s, ort, px, py, { id: 'angel', n: 1 }, erg);
    s.flags.angelBekommen = true;
    if (!st.gesprochen) { st.gesprochen = true; st.punkte = Math.min(MAX_PUNKTE, st.punkte + 20); }
    return erg;
  }
  if (st.gesprochen) {
    erg.texte.push(ersetze(s, waehle(r, n.zeilen.wieder)));
    return erg;
  }
  st.gesprochen = true;
  st.punkte = Math.min(MAX_PUNKTE, st.punkte + 20);
  const h = herzen(s, id);
  const offen = [2, 4, 6, 8, 10].find((l) => h >= l && !st.herzGesehen.includes(l));
  let text;
  if (offen) {
    text = n.zeilen.herz[offen];
    st.herzGesehen.push(offen);
  } else if (regnet(s) && n.zeilen.regen && r() < 0.5) {
    text = waehle(r, n.zeilen.regen);
  } else if (r() < 0.35) {
    text = waehle(r, n.zeilen[jahreszeit(s)]);
  } else {
    const liste = n.zeilen.allgemein;
    text = liste[(tagNr(s.zeit) + Object.keys(NPCS).indexOf(id)) % liste.length];
  }
  erg.texte.push(ersetze(s, text));
  if (geburtstagHeute(s, id)) erg.texte.push('Heute ist übrigens mein Geburtstag.');
  for (const [lvl, g] of Object.entries(n.herzGeschenk || {})) {
    if (h >= Number(lvl) && !st.herzGeschenke.includes(Number(lvl))) {
      st.herzGeschenke.push(Number(lvl));
      geben(s, ort, px, py, { id: g.id, n: g.n }, erg);
    }
  }
  return erg;
}

export function reaktion(id, slot) {
  const n = NPCS[id];
  const kat = `kat:${ITEMS[slot.id].kat}`;
  const arten = ['liebt', 'hasst', 'mag', 'magNicht'];
  for (const art of arten) if ((n[art] || []).includes(slot.id)) return art;
  for (const art of arten) if ((n[art] || []).includes(kat)) return art;
  return 'neutral';
}

export const verschenkbar = (slot) => !!slot && !['werkzeug'].includes(ITEMS[slot.id].kat);

export function schenken(s, id, idx) {
  const st = s.npcs[id];
  const slot = s.spieler.inv[idx];
  if (!verschenkbar(slot)) return null;
  if (st.beschenkt) return { grund: `Du hast ${NPCS[id].name} heute schon etwas geschenkt.` };
  const art = reaktion(id, slot);
  const gb = geburtstagHeute(s, id);
  let punkte = GESCHENK_PUNKTE[art];
  if (gb) punkte *= 8;
  st.punkte = Math.max(0, Math.min(MAX_PUNKTE, st.punkte + punkte));
  st.beschenkt = true;
  entfernenAusSlot(s, idx, 1);
  const gut = art === 'liebt' || art === 'mag' || art === 'neutral';
  const text = gb && gut ? NPCS[id].zeilen.geburtstag : NPCS[id].antwort[art];
  return { art, text: ersetze(s, text), punkte };
}

// ─── Aufträge ───────────────────────────────────────────────────────────────

const AUFTRAG_TEXT = {
  ernte: ['Ich koche heute für die halbe Straße und mir fehlen {n}× {item}. Wer hilft?', 'Gesucht: {n}× {item}, frisch vom Feld. Gute Bezahlung!'],
  sammel: ['Für ein altes Familienrezept suche ich {n}× {item}.', 'Wer findet mir {n}× {item}? Ich habe keine Zeit zum Suchen.'],
  fisch: ['Ich hätte so gern {n}× {item}. Frisch, wenn’s geht!', 'Mein Abendessen schwimmt noch. Bringt mir jemand {n}× {item}?'],
  erz: ['Für ein kleines Projekt bräuchte ich {n}× {item}.'],
  mineral: ['Für ein kleines Projekt bräuchte ich {n}× {item}.'],
  ressource: ['Für ein kleines Projekt bräuchte ich {n}× {item}.'],
};

export function questErzeugen(s, r = Math.random) {
  const jz = jahreszeit(s);
  const kand = [];
  for (const p of Object.values(PFLANZEN)) if (p.jz.includes(jz)) kand.push(p.ernte);
  for (const it of Object.values(ITEMS)) {
    if (it.kat === 'sammel' && !it.strand && it.jz?.includes(jz)) kand.push(it.id);
    if (it.kat === 'fisch' && it.fisch.jz.includes(jz) && it.fisch.d <= 60) kand.push(it.id);
  }
  kand.push('kupfererz', 'quarz', 'kohle');
  if (s.mine.tiefste >= 10) kand.push('eisenerz');
  const id = waehle(r, kand);
  const it = ITEMS[id];
  const n = it.preis < 50 ? ganz(r, 3, 5) : it.preis < 120 ? ganz(r, 1, 3) : 1;
  const npc = waehle(r, Object.keys(NPCS));
  const belohnung = Math.max(100, Math.round((it.preis * n * 3) / 10) * 10);
  const text = waehle(r, AUFTRAG_TEXT[it.kat] || AUFTRAG_TEXT.ernte).replace('{n}', n).replace('{item}', it.name);
  return { npc, id, n, belohnung, text, bis: tagNr(s.zeit) + 2 };
}

export function questAnnehmen(s) {
  if (!s.brett) return;
  s.quest = { ...s.brett, frist: tagNr(s.zeit) + 3 };
  s.brett = null;
}

export function questAbgeben(s, npcId) {
  const q = s.quest;
  if (!q || q.npc !== npcId || anzahl(s, q.id) < q.n) return null;
  entfernen(s, q.id, q.n);
  s.spieler.gold += q.belohnung;
  s.npcs[npcId].punkte = Math.min(MAX_PUNKTE, s.npcs[npcId].punkte + 150);
  s.quest = null;
  s.stats.auftraege++;
  return { belohnung: q.belohnung, text: 'Danke! Genau das hab ich gebraucht. Hier, für deine Mühe.' };
}

// ─── Die Mühle ──────────────────────────────────────────────────────────────

export const buendelEintraege = (b) => b.items.map((e) => (typeof e === 'string' ? { id: e, n: 1 } : e));
export const buendelNoetig = (b) => b.noetig ?? b.items.length;
export const buendelFertig = (s, b) => (s.buendel[b.id] || []).length >= buendelNoetig(b);

/** Index des Bündel-Eintrags, den dieser Stapel erfüllen könnte, sonst -1. */
export function buendelPlatz(s, b, slot) {
  if (!slot || buendelFertig(s, b)) return -1;
  const geg = s.buendel[b.id] || [];
  return buendelEintraege(b).findIndex((e, j) => e.id === slot.id && !geg.includes(j));
}

export function spenden(s, bId, idx, ort) {
  const b = BUENDEL.find((x) => x.id === bId);
  const slot = s.spieler.inv[idx];
  const i = buendelPlatz(s, b, slot);
  if (i < 0) return null;
  const e = buendelEintraege(b)[i];
  if (anzahl(s, slot.id) < e.n) return { grund: `Dafür brauchst du ${e.n}× ${ITEMS[slot.id].name}.`, items: [] };
  entfernen(s, slot.id, e.n);
  (s.buendel[b.id] ??= []).push(i);
  const erg = { ok: true, items: [] };
  if (buendelFertig(s, b)) {
    erg.fertig = b;
    if (b.belohnung.gold) {
      s.spieler.gold += b.belohnung.gold;
      erg.gold = b.belohnung.gold;
    } else {
      geben(s, ort, s.spieler.x, s.spieler.y, { id: b.belohnung.id, n: b.belohnung.n }, erg);
    }
  }
  if (!s.muehle && BUENDEL.every((x) => buendelFertig(s, x))) {
    s.muehle = true;
    erg.muehle = true;
    geben(s, ort, s.spieler.x, s.spieler.y, { id: 'medaille', n: 1 }, erg);
    for (const n of Object.values(s.npcs)) n.punkte = Math.min(MAX_PUNKTE, n.punkte + 250);
  }
  return erg;
}

// ─── Basteln und Läden ──────────────────────────────────────────────────────

export const rezeptFrei = (s, r) => !r.stufe || stufe(s, r.stufe[0]) >= r.stufe[1];
export const kannBasteln = (s, r) => rezeptFrei(s, r) && Object.entries(r.zutaten).every(([id, n]) => anzahl(s, id) >= n);

export function basteln(s, rezept) {
  if (!kannBasteln(s, rezept)) return null;
  const slot = { id: rezept.id, n: rezept.menge || 1 };
  if (platzFuer(s, slot) < slot.n) return { grund: 'Kein Platz im Rucksack.' };
  for (const [id, n] of Object.entries(rezept.zutaten)) entfernen(s, id, n);
  hinzufuegen(s, slot);
  return { ok: true, slot };
}

export function ladenWare(s, ladenId) {
  const L = LAEDEN[ladenId];
  const jz = jahreszeit(s);
  const liste = [];
  for (const w of L.ware) {
    if (w.saatgut) {
      for (const p of Object.values(PFLANZEN)) if (p.jz.includes(jz)) liste.push({ id: p.saat, preis: ITEMS[p.saat].kauf });
      continue;
    }
    if (w.spezial === 'upgrade') {
      for (const wz of AUFRUESTBAR) {
        const l = s.spieler.werkzeug[wz];
        if (l >= 3 || !hat(s, wz)) continue;
        const st = WERKZEUG_STUFEN[l + 1];
        liste.push({
          spezial: 'upgrade', werkzeug: wz, stufe: l + 1, name: werkzeugName(wz, l + 1), preis: st.kosten,
          zutaten: { [st.barren]: 5 }, text: wz === 'giesskanne' ? 'Fasst mehr Wasser. Gedrückt halten gießt mehrere Beete.' : wz === 'hacke' ? 'Gedrückt halten lockert mehrere Felder.' : 'Schlägt kräftiger zu und schafft Härteres.',
        });
      }
      continue;
    }
    if (w.bedingung && !bedingung(s, w.bedingung)) continue;
    if (w.spezial === 'kueken' && s.stall.huehner.length >= 8) continue;
    liste.push({ ...w });
  }
  return liste;
}

export function kaufen(s, ware, n = 1) {
  const sp = s.spieler;
  const kosten = ware.preis * n;
  if (sp.gold < kosten) return { grund: 'Dafür reicht dein Geld nicht.' };
  for (const [id, m] of Object.entries(ware.zutaten || {})) {
    if (anzahl(s, id) < m * n) return { grund: `Dafür brauchst du ${m * n}× ${ITEMS[id].name}.` };
  }
  if (ware.id) {
    if (platzFuer(s, { id: ware.id, n }) < n) return { grund: 'Kein Platz im Rucksack.' };
    hinzufuegen(s, { id: ware.id, n });
  } else if (ware.spezial === 'kueken') {
    const name = HUEHNER_NAMEN[s.stall.huehner.length % HUEHNER_NAMEN.length];
    s.stall.huehner.push({ name, freundschaft: 0, gestreichelt: false, neu: true });
  } else if (ware.spezial === 'rucksack') {
    sp.invGroesse = 36;
    while (sp.inv.length < 36) sp.inv.push(null);
  } else if (ware.spezial === 'stall') {
    s.stall.bauMorgen = true;
  } else if (ware.spezial === 'upgrade') {
    sp.werkzeug[ware.werkzeug] = ware.stufe;
    if (ware.werkzeug === 'giesskanne') sp.wasser = KANNE_INHALT[ware.stufe];
  }
  for (const [id, m] of Object.entries(ware.zutaten || {})) entfernen(s, id, m * n);
  sp.gold -= kosten;
  return { ok: true };
}

export function kauftLaden(ladenId, slot) {
  return !!slot && LAEDEN[ladenId].kauft.includes(ITEMS[slot.id].kat) && verkaufbar(slot);
}

export function verkaufen(s, ladenId, idx, n = 1) {
  const slot = s.spieler.inv[idx];
  if (!kauftLaden(ladenId, slot)) return null;
  n = Math.min(n, slot.n);
  const gold = preisVon(slot) * n;
  s.spieler.gold += gold;
  s.stats.verdient += gold;
  entfernenAusSlot(s, idx, n);
  return { gold };
}

// ─── Angeln ─────────────────────────────────────────────────────────────────

export function fischWaehlen(s, wasserArt, r = Math.random) {
  const jz = jahreszeit(s);
  const m = s.zeit.minute;
  const uhr = Math.floor(m / 60) * 100 + (m % 60);
  const wetter = regnet(s) ? 'regen' : 'sonne';
  const pool = FISCHE.filter((f) => {
    const d = f.fisch;
    return d.o.includes(wasserArt) && d.jz.includes(jz) && uhr >= d.z[0] && uhr < d.z[1] && (!d.w || d.w === wetter);
  });
  if (!pool.length || r() < 0.08) return { muell: waehle(r, MUELL[wasserArt]) };
  const gewicht = pool.map((f) => 110 - f.fisch.d);
  let z = r() * gewicht.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    z -= gewicht[i];
    if (z <= 0) return { fisch: pool[i] };
  }
  return { fisch: pool[pool.length - 1] };
}

export function fangGeben(s, ort, id, perfekt, r = Math.random) {
  const it = ITEMS[id];
  const erg = neuesErgebnis();
  const x = s.spieler.x;
  const y = s.spieler.y;
  if (it.kat !== 'fisch') {
    geben(s, ort, x, y, { id, n: 1 }, erg);
    xpGeben(s, 'angeln', 3, erg);
    return erg;
  }
  const lvl = stufe(s, 'angeln');
  const z = r();
  let q = z < 0.03 + lvl * 0.03 ? 2 : z < 0.15 + lvl * 0.06 ? 1 : 0;
  if (perfekt && q < 2 && r() < 0.5) q++;
  geben(s, ort, x, y, { id, n: 1, q }, erg);
  xpGeben(s, 'angeln', ((q + 1) * 3 + it.fisch.d / 3) * (perfekt ? 2 : 1), erg);
  s.stats.gefangen++;
  erg.q = q;
  return erg;
}

// ─── Speichern ──────────────────────────────────────────────────────────────

export const SPEICHER_SCHLUESSEL = 'klarwasser-hof-v1';

export function serialisieren(s) {
  return JSON.stringify(s);
}

export function deserialisieren(text) {
  const s = JSON.parse(text);
  if (!s || s.version !== SPEICHER_VERSION || !s.spieler || !s.zeit) throw new Error('Dieser Spielstand passt nicht zu dieser Version.');
  ergaenzen(s);
  return s;
}

export { zufall };
