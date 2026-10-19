// Bereich „hof": die Hof-Karte und das Wohnhaus, das Verwildern zu Spielbeginn,
// Unkraut und Steine, die über Nacht nachkommen, Bett, Fernseher, Versandkiste, Briefkasten.

import { TIPPS } from '../../daten.js';
import { karte, boden } from '../../karten.js';
import { system } from '../../system.js';
import * as L from '../../logik.js';
import { S, dekoAktion, frage, fenster, dialog, ton, schlafen, postZeigen } from '../../spiel.js';
import { ganz } from '../../zufall.js';

karte({
  id: 'hof', name: 'Dein Hof', aussen: true, farmbar: true, wasser: 'teich', rand: 'wald', npcWege: false,
  grid: [
    '#####::#################################',
    '#####::#################################',
    '#XXXX::XXXX............................#',
    '#XXXX::XXXX............................#',
    '#....:.................................#',
    '#....:.................................#',
    '#....:.................................#',
    '#....:..............:..................#',
    '#....:..............:..................#',
    '#....::::::::::::::::..................#',
    '#...................:..................#',
    '#...................:..................#',
    '#...................:..................#',
    '#...................:..................#',
    '#...................:..................#',
    '#...................::::::::::::::::::::',
    '#...................::::::::::::::::::::',
    '#...................::.................#',
    '#...................::.................#',
    '#...................::.................#',
    '#...................::.................#',
    '#...~~~~............::.................#',
    '#..~~~~~~...........::.................#',
    '#..~~~~~~~..........::.................#',
    '#..~~~~~~~..........::.................#',
    '#...~~~~~...........::.................#',
    '#....~~~............::.................#',
    '#...................::.................#',
    '####################::##################',
    '####################::##################',
  ],
  gebaeude: [
    { typ: 'haus', x: 18, y: 2, w: 5, h: 5, tuer: { x: 20, y: 6 }, ziel: { karte: 'haus', punkt: 'eingang' } },
  ],
  deko: [
    { typ: 'versandkiste', x: 23, y: 6, w: 2, aktion: 'versand' },
    { typ: 'briefkasten', x: 17, y: 6, aktion: 'post' },
  ],
  warps: [
    { x: 39, y: 15, w: 1, h: 2, karte: 'dorf', punkt: 'vonHof' },
    { x: 5, y: 0, w: 2, h: 1, karte: 'berg', punkt: 'vonHof' },
    { x: 20, y: 29, w: 2, h: 1, karte: 'wald', punkt: 'vonHof' },
  ],
  punkte: {
    vonDorf: [38, 15, 'links'],
    vonWald: [20, 27, 'oben'],
    vonBerg: [5, 2, 'unten'],
    vorHaus: [20, 7, 'unten'],
    vorGewaechshaus: [3, 6, 'oben'],
    versandkiste: [23, 7, 'oben'],
    briefkasten: [17, 7, 'oben'],
  },
  bereiche: {
    bauland: [26, 18, 12, 9],
    stall: [29, 3, 5, 4],
    auslauf: [27, 7, 11, 6],
  },
  sammel: [{ x: 1, y: 17, w: 38, h: 11, art: 'wald', max: 3 }],
  // Flächen, die beim Verwildern frei bleiben
  frei: [
    { x: 15, y: 2, w: 12, h: 9 },   // Haus und Versandkiste
    { x: 26, y: 2, w: 13, h: 12 },  // Stall und Auslauf
    { x: 2, y: 3, w: 7, h: 8 },     // Platz am Nordausgang
    { x: 33, y: 13, w: 7, h: 6 },   // Ausgang ins Dorf
  ],
});

karte({
  id: 'haus', name: 'Dein Haus', aussen: false, innen: 'haus', npcWege: false,
  grid: [
    '############',
    '############',
    '#__________#',
    '#__________#',
    '#__________#',
    '#___tttt___#',
    '#___tttt___#',
    '#___tttt___#',
    '#__________#',
    '#####_######',
  ],
  deko: [
    { typ: 'bett', x: 1, y: 2, w: 2, h: 2, aktion: 'bett' },
    { typ: 'tv', x: 5, y: 2, aktion: 'tv' },
    { typ: 'kamin', x: 7, y: 0, w: 2, h: 2, wand: true, licht: 3 },
    { typ: 'fenster', x: 3, y: 1, wand: true },
    { typ: 'bild', x: 5, y: 1, wand: true },
    { typ: 'herd', x: 9, y: 2 },
    { typ: 'pflanze', x: 10, y: 2 },
    { typ: 'tisch', x: 9, y: 6 },
    { typ: 'kiste', x: 10, y: 8 },
  ],
  warps: [{ x: 5, y: 9, w: 1, h: 1, karte: 'hof', punkt: 'vorHaus' }],
  punkte: {
    eingang: [5, 8, 'oben'],
    bett: [3, 4, 'unten'],
    fernseher: [5, 3, 'oben'],
    kueche: [9, 3, 'oben'],
    partner: [7, 4, 'unten'],
  },
});

// ─── Verwildern und Nachwachsen ─────────────────────────────────────────────

const imFrei = (def, x, y) => def.frei.some((b) => L.imBereich(b, x, y));

/** Der Hof ist zu Beginn zugewachsen: Bäume, Steine, Unkraut, Äste. */
function verwildern(s, r) {
  const ort = L.ortVon(s, 'hof');
  const { def, welt: w } = ort;
  for (let y = 1; y < def.h - 1; y++) {
    for (let x = 1; x < def.w - 1; x++) {
      if (boden(def, x, y) !== '.' || imFrei(def, x, y)) continue;
      let nahWeg = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const b = boden(def, x + dx, y + dy);
        if (b === ':' || b === '~') nahWeg = true;
      }
      if (nahWeg || w.objekte[L.k(x, y)] || !L.begehbar(s, def, w, x, y)) continue;
      const z = r();
      let o = null;
      if (z < 0.07) o = { t: 'baum', hp: 8, art: r() < 0.3 ? 'kiefer' : 'eiche' };
      else if (z < 0.12) o = { t: 'stein', hp: 2, v: ganz(r, 0, 2) };
      else if (z < 0.2) o = { t: 'unkraut', v: ganz(r, 0, 2) };
      else if (z < 0.235) o = { t: 'ast', v: ganz(r, 0, 1) };
      else if (z < 0.241) o = { t: 'fels', hp: 6 };
      else if (z < 0.247) o = { t: 'grossstumpf', hp: 8 };
      if (o) w.objekte[L.k(x, y)] = o;
    }
  }
}

/** Über Nacht kommen ein paar Hindernisse nach. */
function nachwachsen(s, r) {
  const { def, welt: w } = L.ortVon(s, 'hof');
  const winter = L.jahreszeit(s) === 'winter';
  const ziel = ganz(r, 1, 4);
  let gesetzt = 0;
  for (let i = 0; i < 60 && gesetzt < ziel; i++) {
    const x = ganz(r, 1, def.w - 2);
    const y = ganz(r, 2, def.h - 3);
    const kk = L.k(x, y);
    if (boden(def, x, y) !== '.' || imFrei(def, x, y)) continue;
    if (w.objekte[kk] || w.felder[kk] || !L.begehbar(s, def, w, x, y)) continue;
    const z = r();
    if (winter) w.objekte[kk] = z < 0.5 ? { t: 'stein', hp: 2, v: ganz(r, 0, 2) } : { t: 'ast', v: ganz(r, 0, 1) };
    else w.objekte[kk] = z < 0.6 ? { t: 'unkraut', v: ganz(r, 0, 2) } : z < 0.85 ? { t: 'stein', hp: 2, v: ganz(r, 0, 2) } : { t: 'ast', v: ganz(r, 0, 1) };
    gesetzt++;
  }
}

system({
  name: 'hof',
  neuesSpiel(s, r) { verwildern(s, r); },
  tagEnde(s, bericht, r) { nachwachsen(s, r); },
});

// ─── Möbel und Kisten ───────────────────────────────────────────────────────

function fernsehen() {
  const s = S.s;
  const vorhersage = {
    sonne: 'Morgen scheint die Sonne. Gießkanne bereithalten!',
    regen: 'Morgen regnet es. Die Felder gießen sich von selbst.',
    sturm: 'Morgen ziehen Gewitter auf. Bleibt bei Blitzen lieber in der Nähe eines Daches.',
    schnee: 'Morgen schneit es. Warm anziehen!',
  }[s.zeit.morgen];
  const tipp = TIPPS.length ? TIPPS[(L.tagNr(s.zeit) - 1) % TIPPS.length] : '';
  dialog(null, [`Klarwasser-Wetter: ${vorhersage}`, ...(tipp ? [`Tipp des Tages: ${tipp}`] : [])]);
}

dekoAktion('bett', () => frage('Schlafen gehen und den Tag beenden?', [['Schlafen', () => schlafen(false)], ['Noch nicht', null]]), 'Schlafen');
dekoAktion('tv', fernsehen, 'Fernsehen');
dekoAktion('versand', () => { ton('truhe'); fenster('versand'); }, 'Versandkiste');
dekoAktion('post', () => postZeigen(true), 'Briefkasten');
