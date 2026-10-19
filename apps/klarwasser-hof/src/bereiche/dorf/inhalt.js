// Bereich „dorf": die Dorfkarte mit Krämerladen und Gasthaus als Innenräume, die Mühle als
// Gebäude, die Läden von Ottilie, Bruno und Hannes, Rucksack und Werkzeug-Upgrades.

import { ITEMS, WERKZEUG_STUFEN, AUFRUESTBAR, KANNE_INHALT, WERKZEUG_ARTEN, item, kategorie, laden, spezialWare } from '../../daten.js';
import { karte } from '../../karten.js';
import * as L from '../../logik.js';

karte({
  id: 'dorf', name: 'Klarwasser', aussen: true, wasser: 'fluss', rand: 'wald',
  grid: [
    '#####################::#############~~~#####',
    '#####################::#############~~~#####',
    '#....................::.............~~~....#',
    '#....................::.............~~~....#',
    '#....................::.............~~~....#',
    '#....................::.............~~~....#',
    '#....................::.............~~~....#',
    '#....................::.............~~~....#',
    '#.................:..::.............~~~....#',
    '#..........:......:..::...:......:..~~~....#',
    '#..........:......:..::...:......:..~~~....#',
    '#..........:....============.....:..~~~....#',
    '#..........:....============.....:..~~~....#',
    '#..........:....============.....:..~~~....#',
    '#..........:....============.....:..~~~....#',
    '::::::::::::::::============::::::::hhh:::.#',
    '::::::::::::::::============::::::::hhh:::.#',
    '#........:......============........~~~....#',
    '#........:......============........~~~....#',
    '#........:......============........~~~....#',
    '#........:...........::.............~~~....#',
    '#........:...........::.............~~~....#',
    '#........:...........::.............~~~....#',
    '#..:::::::...........::.............~~~....#',
    '#..:::::::...........::.............~~~....#',
    '#..:::::::...........::.............~~~....#',
    ':....................::.............~~~....#',
    ':....................:::::::::......~~~....#',
    '#....................::.............~~~....#',
    '#....................::.............~~~....#',
    '#####################::#############~~~#####',
    '#####################::#############~~~#####',
  ],
  gebaeude: [
    { typ: 'laden', x: 8, y: 3, w: 7, h: 6, tuer: { x: 11, y: 8 }, ziel: { karte: 'laden', punkt: 'eingang' } },
    { typ: 'rathaus', x: 16, y: 2, w: 5, h: 6, tuer: { x: 18, y: 7 }, zu: 'Das Rathaus. An der Tür hängt ein Zettel: „Sprechstunde auf dem Marktplatz. – Frieda"' },
    { typ: 'gasthaus', x: 23, y: 2, w: 7, h: 7, tuer: { x: 26, y: 8 }, ziel: { karte: 'gasthaus', punkt: 'eingang' } },
    { typ: 'muehle', x: 31, y: 3, w: 5, h: 6, tuer: { x: 33, y: 8 }, aktion: 'muehle' },
    { typ: 'schmiede', x: 3, y: 18, w: 6, h: 5, tuer: { x: 5, y: 22 }, zu: 'Brunos Werkstatt. Drinnen glüht die Esse. Bruno arbeitet draußen am Amboss.' },
    { typ: 'atelier', x: 27, y: 22, w: 5, h: 5, tuer: { x: 29, y: 26 }, zu: 'Mats’ Atelier. Ein Zettel an der Tür: „Bin draußen malen."' },
  ],
  deko: [
    { typ: 'brunnen', x: 21, y: 12, w: 2, h: 2 },
    { typ: 'brett', x: 17, y: 11, aktion: 'brett' },
    { typ: 'laterne', x: 16, y: 11, licht: 4 },
    { typ: 'laterne', x: 27, y: 11, licht: 4 },
    { typ: 'laterne', x: 16, y: 19, licht: 4 },
    { typ: 'laterne', x: 27, y: 19, licht: 4 },
    { typ: 'laterne', x: 10, y: 14, licht: 4 },
    { typ: 'laterne', x: 30, y: 14, licht: 4 },
    { typ: 'bank', x: 19, y: 17, w: 2 },
    { typ: 'bank', x: 24, y: 17, w: 2 },
    { typ: 'blumen', x: 9, y: 9 },
    { typ: 'blumen', x: 13, y: 9 },
    { typ: 'blumen', x: 24, y: 9 },
    { typ: 'amboss', x: 8, y: 24, aktion: 'laden', laden: 'schmiede' },
    { typ: 'fass', x: 4, y: 24 },
    { typ: 'schild', x: 2, y: 14, aktion: 'text', text: 'Klarwasser. Westlich liegt dein Hof, südlich der Strand, nördlich die Berge.' },
    { typ: 'baum', x: 2, y: 3 }, { typ: 'baum', x: 5, y: 5 }, { typ: 'baum', x: 3, y: 9 },
    { typ: 'baum', x: 6, y: 12 }, { typ: 'baum', x: 14, y: 22 }, { typ: 'baum', x: 17, y: 25 },
    { typ: 'baum', x: 25, y: 24 }, { typ: 'baum', x: 33, y: 24 }, { typ: 'baum', x: 2, y: 28 },
    { typ: 'baum', x: 11, y: 28 }, { typ: 'baum', x: 40, y: 4 }, { typ: 'baum', x: 41, y: 12 },
    { typ: 'baum', x: 40, y: 20 }, { typ: 'baum', x: 42, y: 26 }, { typ: 'baum', x: 34, y: 28 },
    { typ: 'busch', x: 15, y: 4 }, { typ: 'busch', x: 12, y: 22 }, { typ: 'busch', x: 7, y: 8 },
    { typ: 'busch', x: 30, y: 20 }, { typ: 'busch', x: 13, y: 18 },
  ],
  warps: [
    { x: 0, y: 15, w: 1, h: 2, karte: 'hof', punkt: 'vonDorf' },
    { x: 21, y: 31, w: 2, h: 1, karte: 'strand', punkt: 'vonDorf' },
    { x: 21, y: 0, w: 2, h: 1, karte: 'berg', punkt: 'vonDorf' },
    { x: 0, y: 26, w: 1, h: 2, karte: 'wald', punkt: 'vonDorf' },
  ],
  punkte: {
    vonHof: [1, 15, 'rechts'],
    vonStrand: [21, 29, 'oben'],
    vonBerg: [21, 2, 'unten'],
    vonWald: [1, 26, 'rechts'],
    brunnen: [19, 13],
    platz: [24, 13],
    brett: [17, 12, 'oben'],
    bank1: [19, 18, 'oben'],
    bank2: [25, 18, 'oben'],
    fluss1: [40, 9, 'links'],
    fluss2: [34, 19, 'rechts'],
    spielplatz: [14, 27],
    friedhof: [41, 28],
    garten: [20, 22],
    vorLaden: [11, 9, 'unten'],
    vorGasthaus: [26, 9, 'unten'],
    vorSchmiede: [5, 23, 'unten'],
    vorRathaus: [18, 8, 'unten'],
    vorArzt: [30, 11],
    vorMuseum: [4, 12],
    vorMuehle: [33, 9, 'unten'],
    vorHausRosa: [14, 21],
    vorAtelier: [29, 27, 'unten'],
    amboss: [7, 24, 'rechts'],
    ladenbeet: [12, 10],
    rathausweg: [18, 9],
    sprechstunde: [17, 13],
    muehlblick: [32, 10],
  },
  bereiche: {
    fest: [13, 10, 16, 12],
  },
  sammel: [
    { x: 39, y: 2, w: 4, h: 28, art: 'wald', max: 3 },
    { x: 1, y: 2, w: 6, h: 12, art: 'wald', max: 2 },
    { x: 1, y: 26, w: 19, h: 4, art: 'wald', max: 2 },
  ],
});

karte({
  id: 'laden', name: 'Krämerladen', aussen: false, innen: 'laden',
  grid: [
    '##############',
    '##############',
    '#____________#',
    '#____________#',
    '#____________#',
    '#____________#',
    '#____tttt____#',
    '#____tttt____#',
    '#____tttt____#',
    '######_#######',
  ],
  deko: [
    { typ: 'theke', x: 2, y: 4, w: 4, aktion: 'laden', laden: 'laden' },
    { typ: 'regal', x: 8, y: 2, w: 2 },
    { typ: 'regal', x: 11, y: 2, w: 2 },
    { typ: 'saatregal', x: 10, y: 5, w: 2 },
    { typ: 'fenster', x: 3, y: 1, wand: true },
    { typ: 'fenster', x: 6, y: 1, wand: true },
    { typ: 'fass', x: 1, y: 8 },
    { typ: 'fass', x: 12, y: 8 },
    { typ: 'pflanze', x: 1, y: 2 },
  ],
  warps: [{ x: 6, y: 9, w: 1, h: 1, karte: 'dorf', punkt: 'vorLaden' }],
  punkte: {
    eingang: [6, 8, 'oben'],
    theke: [3, 3, 'unten'],
    regal: [9, 3, 'oben'],
    bett_ottilie: [12, 3],
    bett_jonas: [1, 5],
  },
});

karte({
  id: 'gasthaus', name: 'Gasthaus „Zum Krug"', aussen: false, innen: 'gasthaus',
  grid: [
    '################',
    '################',
    '#______________#',
    '#______________#',
    '#______________#',
    '#______________#',
    '#_tttttt_______#',
    '#_tttttt_______#',
    '#_tttttt_______#',
    '#______________#',
    '#######_########',
  ],
  deko: [
    { typ: 'theke', x: 9, y: 4, w: 6, aktion: 'laden', laden: 'gasthaus' },
    { typ: 'flaschen', x: 10, y: 1, w: 4, wand: true },
    { typ: 'kamin', x: 2, y: 0, w: 2, h: 2, wand: true, licht: 3 },
    { typ: 'fenster', x: 6, y: 1, wand: true },
    { typ: 'bild', x: 8, y: 1, wand: true },
    { typ: 'tisch', x: 3, y: 7 },
    { typ: 'tisch', x: 6, y: 7 },
    { typ: 'fass', x: 14, y: 7 },
    { typ: 'fass', x: 14, y: 8 },
    { typ: 'pflanze', x: 1, y: 2 },
  ],
  warps: [{ x: 7, y: 10, w: 1, h: 1, karte: 'dorf', punkt: 'vorGasthaus' }],
  punkte: {
    eingang: [7, 9, 'oben'],
    theke: [11, 3, 'unten'],
    tisch1: [4, 5],
    tisch2: [5, 8],
    tisch3: [3, 4],
    kamin: [3, 3],
    billard: [12, 8],
    bett_hannes: [13, 2],
    tresen1: [10, 5, 'oben'],
    tresen2: [12, 5, 'oben'],
  },
});

// ─── Gasthaus-Küche ─────────────────────────────────────────────────────────

kategorie('essen', 'Essen');
item('brot', { name: 'Brot', kat: 'essen', preis: 60, bild: { art: 'brot' }, energie: 50, text: 'Knusprige Kruste.' });
item('salat', { name: 'Salat', kat: 'essen', preis: 110, bild: { art: 'salat' }, energie: 113, text: 'Frisch und knackig.' });
item('kaffee', { name: 'Kaffee', kat: 'essen', preis: 150, bild: { art: 'kaffee' }, energie: 3, tempo: 120, text: 'Zwei Stunden lang flinke Füße.' });
item('fischsuppe', { name: 'Fischsuppe', kat: 'essen', preis: 125, bild: { art: 'suppe' }, energie: 150, text: 'Nach Lenes Rezept. Mit Butter.' });

// ─── Läden ──────────────────────────────────────────────────────────────────

laden('laden', {
  name: 'Krämerladen', npc: 'ottilie', ort: { karte: 'laden', punkt: 'theke' },
  kauft: ['ernte', 'sammel', 'artisan', 'tier'],
  ware: [
    { spezial: 'saatgut' },
    { id: 'duenger', preis: 100 },
    { spezial: 'kueken' },
    { spezial: 'rucksack' },
  ],
});

laden('schmiede', {
  name: 'Schmiede', npc: 'bruno', ort: { karte: 'dorf', punkt: 'amboss' },
  kauft: ['erz', 'barren', 'mineral'],
  ware: [
    { id: 'kohle', preis: 60 },
    { id: 'kupfererz', preis: 75 },
    { id: 'eisenerz', preis: 150 },
    { id: 'golderz', preis: 400 },
    { spezial: 'upgrade' },
    { spezial: 'stall' },
  ],
});

laden('gasthaus', {
  name: 'Gasthaus „Zum Krug"', npc: 'hannes', ort: { karte: 'gasthaus', punkt: 'theke' },
  kauft: ['fisch', 'ernte'],
  ware: [
    { id: 'brot', preis: 120 },
    { id: 'salat', preis: 220 },
    { id: 'kaffee', preis: 300 },
    { id: 'fischsuppe', preis: 250 },
  ],
});

spezialWare('rucksack', {
  name: 'Großer Rucksack', preis: 2000, text: '36 statt 24 Plätze.',
  verfuegbar: (s) => s.spieler.invGroesse < 36,
  kaufen(s) {
    const sp = s.spieler;
    sp.invGroesse = 36;
    while (sp.inv.length < 36) sp.inv.push(null);
    return { text: 'Dein Rucksack hat jetzt 36 Plätze.' };
  },
});

/** Bruno verbessert Werkzeuge um eine Stufe – nur, wenn es den Barren dafür gibt. */
spezialWare('upgrade', {
  angebote(s) {
    const liste = [];
    for (const wz of AUFRUESTBAR) {
      const l = s.spieler.werkzeug[wz] || 0;
      const st = WERKZEUG_STUFEN[l + 1];
      if (!st || !ITEMS[st.barren] || !L.hat(s, wz)) continue;
      liste.push({
        spezial: 'upgrade', werkzeug: wz, stufe: l + 1, name: L.werkzeugName(wz, l + 1), preis: st.kosten,
        zutaten: { [st.barren]: 5 }, text: WERKZEUG_ARTEN[ITEMS[wz].werkzeug]?.upgradeText || '',
      });
    }
    return liste;
  },
  kaufen(s, { ware }) {
    s.spieler.werkzeug[ware.werkzeug] = ware.stufe;
    if (ware.werkzeug === 'giesskanne') s.spieler.wasser = KANNE_INHALT[ware.stufe];
    return { text: `Fertig! Deine ${ware.name} fühlt sich gleich ganz anders an.` };
  },
});
