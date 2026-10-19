// Bereich „wildnis": Strand, Wald und Berg (Wald und Berg vorerst als kleine Platzhalter
// mit allen Rand-Punkten des Weltgraphen). Der Mineneingang liegt am Berg.

import { karte, raster, rechteck, ellipse, pfad, fertigRaster } from '../../karten.js';

karte({
  id: 'strand', name: 'Strand', aussen: true, wasser: 'meer', rand: 'fels',
  grid: [
    '#################::#################',
    '#################::#################',
    '#................::................#',
    '#................::................#',
    '#................::................#',
    '#ssssssssssssssss::ssssssssssssssss#',
    '#ssssssssssssssssssssssssssssssssss#',
    '#ssssssssssssssssssssssssssssssssss#',
    '#ssssssssssssssssssssssssssssssssss#',
    '#ssssssssssssssssssssssssssssssssss#',
    '#ssssssssssssssssssssssssssssssssss#',
    '#ssssssssssssssssssssssshhsssssssss#',
    '#ssssssssssssssssssssssshhsssssssss#',
    '~~~~~~~~~~~~~~~~~~~~~~~~hh~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~hh~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~hh~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~hh~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  ],
  gebaeude: [
    { typ: 'huette', x: 26, y: 5, w: 5, h: 4, tuer: { x: 28, y: 8 }, zu: 'Lenes Hütte. Es riecht nach Teer und Tang.' },
  ],
  deko: [
    { typ: 'stand', x: 28, y: 10, aktion: 'laden', laden: 'fischer' },
    { typ: 'strandkorb', x: 20, y: 7 },
    { typ: 'strandkorb', x: 8, y: 9 },
    { typ: 'felsen', x: 3, y: 6 }, { typ: 'felsen', x: 5, y: 11 }, { typ: 'felsen', x: 33, y: 7 },
    { typ: 'felsen', x: 13, y: 12 },
    { typ: 'busch', x: 4, y: 3 }, { typ: 'busch', x: 12, y: 2 }, { typ: 'busch', x: 30, y: 3 },
    { typ: 'laterne', x: 23, y: 11, licht: 4 },
  ],
  warps: [{ x: 17, y: 0, w: 2, h: 1, karte: 'dorf', punkt: 'vonStrand' }],
  punkte: {
    vonDorf: [17, 2, 'unten'],
    steg: [24, 16, 'unten'],
    stand: [27, 10, 'rechts'],
    vorFischladen: [28, 9, 'unten'],
    vorHuetteMats: [10, 4],
    strand1: [8, 6],
    strand2: [20, 9],
    gezeiten: [4, 12],
    lagerfeuer: [14, 8],
  },
  bereiche: {
    fest: [2, 6, 18, 6],
  },
  sammel: [{ x: 1, y: 6, w: 34, h: 7, art: 'strand', max: 6 }],
});

// ─── Wald (Platzhalter) ─────────────────────────────────────────────────────

const wald = raster(30, 20, '.');
rechteck(wald, 0, 0, 30, 2, '#');
rechteck(wald, 0, 18, 30, 2, '#');
rechteck(wald, 0, 0, 1, 20, '#');
rechteck(wald, 29, 0, 1, 20, '#');
pfad(wald, [[14, 0], [14, 9], [29, 9]], 2, ':');
pfad(wald, [[14, 11], [14, 16]], 2, ':');
ellipse(wald, 5.5, 5.5, 3.6, 2.4, '~');
rechteck(wald, 1, 14, 28, 1, '~');
rechteck(wald, 14, 14, 2, 1, 'h');

karte({
  id: 'wald', name: 'Wald', aussen: true, wasser: 'fluss', rand: 'wald',
  grid: fertigRaster(wald),
  gewaesser: [{ x: 1, y: 2, b: 10, h: 7, art: 'teich' }],
  deko: [
    { typ: 'schild', x: 16, y: 3, aktion: 'text', text: 'Der Wald. Nördlich liegt dein Hof, östlich das Dorf. Tiefer hinein führt noch kein Weg.' },
    { typ: 'baum', x: 3, y: 10 }, { typ: 'baum', x: 9, y: 11 }, { typ: 'baum', x: 20, y: 4 },
    { typ: 'baum', x: 25, y: 12 }, { typ: 'baum', x: 6, y: 16 }, { typ: 'baum', x: 22, y: 16 },
    { typ: 'busch', x: 11, y: 3 }, { typ: 'busch', x: 18, y: 12 }, { typ: 'busch', x: 26, y: 3 },
  ],
  warps: [
    { x: 14, y: 0, w: 2, h: 1, karte: 'hof', punkt: 'vonWald' },
    { x: 29, y: 9, w: 1, h: 2, karte: 'dorf', punkt: 'vonWald' },
  ],
  punkte: {
    vonHof: [14, 2, 'unten'],
    vonDorf: [27, 9, 'links'],
    vorRanch: [22, 7],
    vorTurm: [4, 12],
    haendler: [20, 11],
    see1: [10, 5, 'links'],
    fluss1: [20, 13, 'unten'],
    lichtung: [9, 16],
    vorGeheimwald: [2, 16, 'links'],
  },
  bereiche: {
    fest: [17, 2, 11, 6],
  },
  sammel: [{ x: 1, y: 15, w: 28, h: 3, art: 'wald', max: 3 }],
});

// ─── Berg (Platzhalter) ─────────────────────────────────────────────────────

const berg = raster(30, 20, '.');
rechteck(berg, 0, 0, 30, 2, '#');
rechteck(berg, 0, 18, 30, 2, '#');
rechteck(berg, 0, 0, 1, 20, '#');
rechteck(berg, 29, 0, 1, 20, '#');
rechteck(berg, 1, 2, 28, 2, 'X');
pfad(berg, [[5, 19], [5, 8], [24, 8], [24, 19]], 2, ':');
pfad(berg, [[8, 3], [8, 8]], 2, ':');
ellipse(berg, 21, 5, 3.4, 1.4, '~');

karte({
  id: 'berg', name: 'Am Berg', aussen: true, wasser: 'teich', rand: 'fels',
  grid: fertigRaster(berg),
  gebaeude: [
    {
      typ: 'hoehle', x: 7, y: 2, w: 3, h: 2, tuer: { x: 8, y: 3 }, ziel: { karte: 'mine0', punkt: 'eingang' }, tuerWenn: 'mineOffen',
      sonst: 'Geröll versperrt den Eingang. Jemand mit kräftigen Armen müsste es wegräumen.',
    },
  ],
  deko: [
    { typ: 'schild', x: 12, y: 7, aktion: 'text', text: 'Am Berg. Oben die alte Mine, unten links dein Hof, unten rechts das Dorf.' },
    { typ: 'felsen', x: 3, y: 5 }, { typ: 'felsen', x: 13, y: 15 }, { typ: 'felsen', x: 11, y: 14 },
    { typ: 'felsen', x: 17, y: 13 }, { typ: 'felsen', x: 27, y: 11 },
    { typ: 'baum', x: 2, y: 13 }, { typ: 'baum', x: 16, y: 4 }, { typ: 'busch', x: 27, y: 15 },
  ],
  warps: [
    { x: 5, y: 19, w: 2, h: 1, karte: 'hof', punkt: 'vonBerg' },
    { x: 24, y: 19, w: 2, h: 1, karte: 'dorf', punkt: 'vonBerg' },
  ],
  punkte: {
    vonHof: [5, 17, 'oben'],
    vonDorf: [24, 17, 'oben'],
    vorMine: [8, 4, 'unten'],
    vorZimmerei: [14, 11],
    vorGilde: [27, 7],
    see1: [21, 7, 'oben'],
    steinbruch: [12, 16],
  },
});
