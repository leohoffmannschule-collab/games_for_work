// Bereich „mine": Mineneingang (Karte mine0), die Ebenen als Kartenanbieter, Gestein, Erze,
// Barren, Edelsteine, Monster, Schatztruhen, das rostige Schwert und der Förderkorb.

import { T, ITEMS, WERKZEUG_ARTEN, item, kategorie, objektTyp, bedingung, werkzeugArt } from '../../daten.js';
import { karte, karteVorbereiten, kartenAnbieter, bodenVon } from '../../karten.js';
import { system, mod } from '../../system.js';
import * as L from '../../logik.js';
import { MONSTER, monster, hoehleGraben, neuesMonster, monsterSchritt } from '../../mine.js';
import { zufall, ganz, waehle } from '../../zufall.js';
import {
  S, dekoAktion, wechseln, wechselnZu, ton, dialog, fenster, ergebnisZeigen, spielerFeld, schwebeText,
  puff, halme, schlafen,
} from '../../spiel.js';

export const MINE_TIEFE = 30;

kategorie('mineral', 'Mineral');
kategorie('erz', 'Erz');
kategorie('barren', 'Barren');

// ─── Gegenstände ────────────────────────────────────────────────────────────

const barrenText = 'Fünf Erz und eine Kohle ergeben einen Barren.';
item('kupfererz', { name: 'Kupfererz', kat: 'erz', preis: 5, bild: { art: 'erz', f: '#d98a4e' }, text: barrenText });
item('eisenerz', { name: 'Eisenerz', kat: 'erz', preis: 10, bild: { art: 'erz', f: '#dfe6ee' }, text: barrenText });
item('golderz', { name: 'Golderz', kat: 'erz', preis: 25, bild: { art: 'erz', f: '#f2c94c' }, text: barrenText });
item('kupferbarren', { name: 'Kupferbarren', kat: 'barren', preis: 60, bild: { art: 'barren', f: '#d98a4e' }, text: 'Bruno macht daraus bessere Werkzeuge.' });
item('eisenbarren', { name: 'Eisenbarren', kat: 'barren', preis: 120, bild: { art: 'barren', f: '#cfd7df' }, text: 'Bruno macht daraus bessere Werkzeuge.' });
item('goldbarren', { name: 'Goldbarren', kat: 'barren', preis: 250, bild: { art: 'barren', f: '#f2c94c' }, text: 'Bruno macht daraus die besten Werkzeuge.' });
item('quarz', { name: 'Quarz', kat: 'mineral', preis: 25, bild: { art: 'kristall', f: '#eef2f6' }, text: 'Klar wie Klarwasser.' });
item('erdkristall', { name: 'Erdkristall', kat: 'mineral', preis: 50, bild: { art: 'kristall', f: '#c9a45c' }, text: 'Riecht nach Regen.' });
item('traene', { name: 'Gefrorene Träne', kat: 'mineral', preis: 75, bild: { art: 'traene', f: '#a8e0ff' }, text: 'Kalt, selbst in der Hand.' });
item('amethyst', { name: 'Amethyst', kat: 'mineral', preis: 100, bild: { art: 'edelstein', f: '#a46ad8' }, text: 'Violett und vielflächig.' });
item('topas', { name: 'Topas', kat: 'mineral', preis: 80, bild: { art: 'edelstein', f: '#f2b23a' }, text: 'Funkelt wie Honig.' });
item('smaragd', { name: 'Smaragd', kat: 'mineral', preis: 250, bild: { art: 'edelstein', f: '#3ac77a' }, text: 'Tiefes Grün.' });
item('rubin', { name: 'Rubin', kat: 'mineral', preis: 250, bild: { art: 'edelstein', f: '#e0344a' }, text: 'Glüht im Dunkeln. Fast.' });
item('diamant', { name: 'Diamant', kat: 'mineral', preis: 750, bild: { art: 'edelstein', f: '#e6f8ff' }, text: 'Selten und begehrt.' });
item('schleim', { name: 'Schleim', kat: 'ressource', preis: 5, bild: { art: 'schleim', f: '#6fc94a' }, text: 'Klebt. Riecht. Wird trotzdem gekauft.' });
item('fluegel', { name: 'Fledermausflügel', kat: 'ressource', preis: 15, bild: { art: 'fluegel' }, text: 'Ledrig und leicht.' });

item('schwert', { name: 'Rostiges Schwert', kat: 'werkzeug', bild: { art: 'schwert' }, werkzeug: 'waffe', waffe: { schaden: [3, 7] }, text: 'Alt, aber scharf genug für Schleime.' });

werkzeugArt('waffe', {
  wiederholbar: true, dauer: 0.24, schwungTon: 'schwung',
  felder: L.senseFelder,
  wirkung({ s, ort, felder }) {
    const erg = L.senseSchnitt(s, ort, felder, Math.random, 'waffe');
    if (erg.n) { ton('sense'); for (const [x, y] of felder) halme(x, y); }
    return erg;
  },
});

// ─── Monster ────────────────────────────────────────────────────────────────

monster('schleim', { name: 'Grüner Schleim', hp: 24, schaden: 5, tempo: 34, xp: 3, farbe: '#6fc94a', art: 'schleim', beute: [['schleim', 0.8, 1, 2], ['kohle', 0.06, 1, 1]] });
monster('fledermaus', { name: 'Fledermaus', hp: 22, schaden: 6, tempo: 42, xp: 6, farbe: '#6a5878', art: 'fledermaus', fliegt: true, beute: [['fluegel', 0.35, 1, 1]] });
monster('frostschleim', { name: 'Frostschleim', hp: 55, schaden: 9, tempo: 38, xp: 8, farbe: '#7cc4ee', art: 'schleim', beute: [['schleim', 0.8, 1, 3], ['traene', 0.05, 1, 1]] });
monster('frostfledermaus', { name: 'Frostfledermaus', hp: 40, schaden: 10, tempo: 50, xp: 10, farbe: '#8eb0d0', art: 'fledermaus', fliegt: true, beute: [['fluegel', 0.4, 1, 2]] });
monster('glutschleim', { name: 'Glutschleim', hp: 90, schaden: 15, tempo: 42, xp: 15, farbe: '#e8603e', art: 'schleim', beute: [['schleim', 0.8, 2, 3], ['kohle', 0.2, 1, 2]] });
monster('glutfledermaus', { name: 'Glutfledermaus', hp: 70, schaden: 16, tempo: 58, xp: 18, farbe: '#b84a32', art: 'fledermaus', fliegt: true, beute: [['fluegel', 0.5, 1, 2], ['rubin', 0.02, 1, 1]] });

// ─── Ebenen ─────────────────────────────────────────────────────────────────

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

/**
 * Gräbt Ebene n. `schatzGeholt` sind die Ebenen, deren Truhe schon leer ist.
 * Ergebnis: { def, welt, start, monster }
 */
export function mineErzeugen(n, r, schatzGeholt = []) {
  const { grid, flaeche, offen } = hoehleGraben(r, { breite: 26, hoehe: 20 });

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
      const o = { t: 'mstein', art, hp: STEINARTEN[art].hp[bandVon(n)], v: ganz(r, 0, 3) };
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
  const liste = [];
  const anzahl = Math.min(2 + Math.floor(n / 3), 9);
  const platz = flaeche.filter(([x, y]) => !objekte[`${x},${y}`] && abstand(x, y) >= 6);
  for (let i = 0; i < anzahl && platz.length; i++) {
    const idx = Math.floor(r() * platz.length);
    const [x, y] = platz.splice(idx, 1)[0];
    let typ = waehle(r, MONSTER_JE_BAND[band]);
    if (typ.includes('fledermaus') && n < 4) typ = MONSTER_JE_BAND[band][0];
    liste.push(neuesMonster(typ, x, y));
  }

  const def = karteVorbereiten({
    id: `mine${n}`, name: `Mine · Ebene ${n}`, grid, aussen: false, innen: 'mine', rand: 'mine', npcWege: false,
    ebene: n, band, dunkel: BAENDER[band].dunkel,
    deko: [{ typ: 'leiter_auf', x: sx, y: sy, aktion: 'mine_auf', begehbar: true }],
    punkte: { start: [start.x, start.y, 'unten'] },
  });
  return { def, welt: { objekte, felder: {}, funde: [] }, start, monster: liste };
}

const mineEbeneVon = (id) => (/^mine\d+$/.test(id) ? Number(id.slice(4)) : 0);

kartenAnbieter((id) => mineEbeneVon(id) >= 1 && mineEbeneVon(id) <= MINE_TIEFE, (id, s) => {
  const gen = mineErzeugen(mineEbeneVon(id), zufall(Math.floor(Math.random() * 2 ** 31)), s?.mine?.truhen ?? []);
  return { ...gen.def, fluechtig: true, weltStart: gen.welt, monsterStart: gen.monster, speicherOrt: { karte: 'mine0', punkt: 'leiter' } };
});

/** Was ein zerschlagener Stein hergibt. */
export function steinErtrag(art, n, r, bergbau, s) {
  const band = bandVon(n);
  const items = [];
  let xp = 1;
  const bonus = () => (r() < bergbau * 0.04 ? 1 : 0);
  const erz = (id, menge) => ({ id, n: Math.max(1, Math.round(mod('erzMenge', menge, { s, id }))) });
  if (art === 'stein') {
    items.push({ id: 'stein', n: 1 + bonus() });
    if (r() < 0.04 + band * 0.02) items.push({ id: 'kohle', n: 1 });
    if (r() < 0.02) items.push({ id: waehle(r, [['erdkristall', 'quarz'], ['traene', 'quarz'], ['quarz', 'topas']][band]), n: 1 });
  } else if (art === 'kohle') {
    items.push({ id: 'kohle', n: ganz(r, 1, 2) + bonus() });
    xp = 3;
  } else if (art === 'kupfer') {
    items.push(erz('kupfererz', ganz(r, 1, 3) + bonus()));
    xp = 5;
  } else if (art === 'eisen') {
    items.push(erz('eisenerz', ganz(r, 1, 3) + bonus()));
    xp = 12;
  } else if (art === 'gold') {
    items.push(erz('golderz', ganz(r, 1, 3) + bonus()));
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

export function schatzOeffnen(s, ort, x, y) {
  const o = ort.welt.objekte[L.k(x, y)];
  const erg = L.neuesErgebnis();
  for (const it of SCHATZ[o.ebene] || []) L.geben(s, ort, x, y, it, erg);
  s.mine.truhen.push(o.ebene);
  delete ort.welt.objekte[L.k(x, y)];
  erg.ok = true;
  return erg;
}

objektTyp('mstein', {
  blockiert: true,
  spitzhacke({ s, ort, x, y, kk, o, erg, r, kraft }) {
    o.hp -= kraft;
    erg.treffer = 'stein';
    if (o.hp <= 0) {
      const ebene = ort.def.ebene || 1;
      const ertrag = steinErtrag(o.art, ebene, r, L.stufe(s, 'bergbau'), s);
      delete ort.welt.objekte[kk];
      for (const it of ertrag.items) L.geben(s, ort, x, y, it, erg);
      L.xpGeben(s, 'bergbau', ertrag.xp, erg);
      erg.zerbrochen = o.art;
      if (o.leiter || (ebene < MINE_TIEFE && r() < 0.025 + L.glueck(s) * 0.01)) {
        ort.welt.objekte[kk] = { t: 'leiter' };
        erg.leiter = true;
      }
    }
    return true;
  },
});

objektTyp('leiter', { interagieren: () => mineAb(), hinweis: 'Hinabsteigen' });

objektTyp('schatz', {
  blockiert: true,
  interagieren({ s, ort, x, y }) {
    const erg = schatzOeffnen(s, ort, x, y);
    ton('fanfare');
    ergebnisZeigen(erg);
  },
  hinweis: 'Schatztruhe öffnen',
});

// ─── Mineneingang ───────────────────────────────────────────────────────────

karte({
  id: 'mine0', name: 'Alte Mine', aussen: false, innen: 'mine', rand: 'mine', dunkel: 0.25, npcWege: false,
  grid: [
    '##############',
    '##############',
    '#mmmmmmmmmmmm#',
    '#mmmmmmmmmmmm#',
    '#mmmmmmmmmmmm#',
    '#mmmmmmmmmmmm#',
    '#mmmmmmmmmmmm#',
    '#mmmmmmmmmmmm#',
    '#mmmmmmmmmmmm#',
    '#mmmmmmmmmmmm#',
    '######mm######',
  ],
  deko: [
    { typ: 'leiter_ab', x: 9, y: 4, aktion: 'mine_ab', begehbar: true },
    { typ: 'aufzug', x: 11, y: 2, aktion: 'aufzug' },
    { typ: 'schwertfund', x: 3, y: 2, aktion: 'schwert', nurWenn: 'keinSchwert' },
    { typ: 'wandlampe', x: 5, y: 1, wand: true, licht: 4 },
    { typ: 'wandlampe', x: 9, y: 1, wand: true, licht: 4 },
    { typ: 'felsen', x: 1, y: 8 }, { typ: 'felsen', x: 12, y: 7 },
    { typ: 'kiste', x: 2, y: 5 },
  ],
  warps: [{ x: 6, y: 10, w: 2, h: 1, karte: 'berg', punkt: 'vorMine' }],
  punkte: {
    eingang: [6, 9, 'oben'],
    leiter: [9, 5, 'unten'],
  },
});

bedingung('mineOffen', (s) => !!s.flags.mineOffen);
bedingung('keinSchwert', (s) => !s.mine.schwert);

function mineAb() {
  const n = S.mineEbene + 1;
  if (n > MINE_TIEFE) return;
  ton('leiter');
  wechseln(`mine${n}`);
}
function mineAuf() {
  ton('leiter');
  wechselnZu({ karte: 'mine0', punkt: 'leiter' });
}
/** Förderkorb: 0 ist der Eingang, sonst die Ebene. */
export function aufzugFahren(n) {
  if (n === 0) wechselnZu({ karte: 'mine0', punkt: 'leiter' });
  else wechseln(`mine${n}`);
}

dekoAktion('mine_ab', () => mineAb(), 'Hinabsteigen');
dekoAktion('mine_auf', () => mineAuf(), 'Hinaufsteigen');
dekoAktion('aufzug', () => fenster('aufzug'), 'Förderkorb');
dekoAktion('schwert', () => {
  const s = S.s;
  s.mine.schwert = true;
  const erg = { items: [] };
  const f = spielerFeld();
  L.geben(s, S.ort, f.x, f.y, { id: 'schwert', n: 1 }, erg);
  ton('fanfare');
  dialog(null, ['Du nimmst das rostige Schwert. Es liegt erstaunlich gut in der Hand.', 'Wähle es in der Werkzeugleiste und schlag damit nach Schleimen.']);
  ergebnisZeigen(erg);
}, 'Schwert nehmen');

// ─── Kampf ──────────────────────────────────────────────────────────────────

function monsterUpdate(dt) {
  const sp = S.sp;
  const def = S.ort.def;
  const w = S.ort.welt;
  const frei = (px, py, fliegt) => {
    const tx = Math.floor(px / T);
    const ty = Math.floor((py - 4) / T);
    if (bodenVon(def, tx, ty).wand) return false;
    return fliegt || L.begehbar(S.s, def, w, tx, ty);
  };
  for (const m of S.monster) {
    const trifft = monsterSchritt(m, dt, sp, frei);
    if (trifft && sp.unverwundbar <= 0 && !S.pause) spielerGetroffen(m);
  }
}

function spielerGetroffen(m) {
  const d = MONSTER[m.typ];
  const s = S.s;
  const schaden = Math.max(1, Math.round(d.schaden - mod('verteidigung', 0, { s, monster: m })));
  s.spieler.hp = Math.max(0, s.spieler.hp - schaden);
  S.sp.unverwundbar = 1.1;
  ton('au');
  schwebeText(`-${schaden}`, S.sp.x, S.sp.y - 26, '#ff7a6a');
  const dx = S.sp.x - m.x;
  const dy = S.sp.y - m.y;
  const l = Math.hypot(dx, dy) || 1;
  S.sp.stoss = { vx: (dx / l) * 150, vy: (dy / l) * 150, t: 0.15 };
  if (s.spieler.hp <= 0) {
    S.pause = true;
    dialog(null, ['Alles wird schwarz…', 'Jemand hat dich aus der Mine nach Hause getragen. Unterwegs ist ein Teil deines Geldes verloren gegangen.'], null, () => schlafen(true));
  }
}

function monsterTreffen(id, [von, bis], bonus) {
  const sp = S.sp;
  const [dx, dy] = L.RICHTUNG[sp.blick];
  const cx = sp.x + dx * 14;
  const cy = sp.y - 6 + dy * 14;
  for (const m of [...S.monster]) {
    if (Math.abs(m.x - cx) < 17 && Math.abs(m.y - 4 - cy) < 17) {
      const grund = von + Math.floor(Math.random() * (bis - von + 1)) + bonus;
      const schaden = Math.max(1, Math.round(mod('schaden', grund, { s: S.s, monster: m, waffe: id })));
      m.hp -= schaden;
      m.blitz = 0.15;
      m.stoss = 0.2;
      const l = Math.hypot(m.x - sp.x, m.y - sp.y) || 1;
      m.vx = ((m.x - sp.x) / l) * 160;
      m.vy = ((m.y - sp.y) / l) * 160;
      schwebeText(String(schaden), m.x, m.y - 16, '#fff3b0');
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

system({
  name: 'mine',
  ergaenzen(s) {
    s.mine ??= { tiefste: 0, schwert: false, truhen: [] };
  },
  tagEnde(s) {
    if (L.tagNr(s.zeit) >= 4) s.flags.mineOffen = true;
  },
  karteBetreten(ort) {
    S.mineEbene = ort.def.ebene || 0;
    if (!S.mineEbene) return;
    S.monster = (ort.def.monsterStart || []).map((m) => ({ ...m }));
    if (S.mineEbene > S.s.mine.tiefste) S.s.mine.tiefste = S.mineEbene;
  },
  update(dt) {
    if (S.mineEbene) monsterUpdate(dt);
  },
  /** Waffen treffen Monster überall, die Sense nur in der Mine. */
  schwung(ctx) {
    const schaden = ITEMS[ctx.id]?.waffe?.schaden ?? WERKZEUG_ARTEN[ctx.art]?.schaden;
    if (!schaden || (ctx.art !== 'waffe' && !S.mineEbene)) return;
    monsterTreffen(ctx.id, schaden, ctx.art === 'waffe' ? L.stufe(S.s, 'kampf') : 0);
  },
});
