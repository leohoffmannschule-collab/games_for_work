// Schauplätze als lesbare Raster.
//
//   .  Gras          :  Erdweg        =  Pflaster      s  Sand
//   ~  Wasser        h  Steg/Brücke   _  Holzboden     t  Teppich
//   m  Minenboden    #  Wald, Wand oder Fels (je nach Schauplatz)
//   X  Felsklippe
//
// Gebäude stehen auf dem Raster und blockieren ihr ganzes Rechteck. Ihre Tür liegt
// in der untersten Reihe: mit `ziel` führt sie hinein, mit `zu` bleibt sie verschlossen,
// mit `aktion` öffnet sie ein Fenster (die Mühle).

export const KARTEN = {};
function karte(def) {
  def.h = def.grid.length;
  def.w = def.grid[0].length;
  def.gebaeude ??= [];
  def.deko ??= [];
  def.warps ??= [];
  def.sammel ??= [];
  KARTEN[def.id] = def;
}

karte({
  id: 'hof', name: 'Dein Hof', aussen: true, farmbar: true, wasser: 'teich', rand: 'wald',
  grid: [
    '########################################',
    '########################################',
    '#XXXXXXXXXX............................#',
    '#XXXX:XXXXX............................#',
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
    '#......................................#',
    '#......................................#',
    '#......................................#',
    '#......................................#',
    '#...~~~~...............................#',
    '#..~~~~~~..............................#',
    '#..~~~~~~~.............................#',
    '#..~~~~~~~.............................#',
    '#...~~~~~..............................#',
    '#....~~~...............................#',
    '#......................................#',
    '########################################',
    '########################################',
  ],
  gebaeude: [
    { typ: 'haus', x: 18, y: 2, w: 5, h: 5, tuer: { x: 20, y: 6 }, ziel: { karte: 'haus', x: 5, y: 8, blick: 'oben' } },
    { typ: 'stall', x: 29, y: 3, w: 5, h: 4, tuer: { x: 31, y: 6 }, aktion: 'stall', nurWenn: 'stall' },
    { typ: 'hoehle', x: 4, y: 2, w: 3, h: 2, tuer: { x: 5, y: 3 }, ziel: { karte: 'mine0', x: 6, y: 9, blick: 'oben' }, tuerWenn: 'mineOffen', sonst: 'Geröll versperrt den Eingang. Jemand mit kräftigen Armen müsste es wegräumen.' },
  ],
  deko: [
    { typ: 'versandkiste', x: 23, y: 6, w: 2, aktion: 'versand' },
    { typ: 'schild', x: 31, y: 6, aktion: 'text', nurWenn: 'keinStall', text: 'Bauplatz. Bruno, der Schmied im Dorf, kann hier einen Hühnerstall bauen.' },
    { typ: 'briefkasten', x: 17, y: 6, aktion: 'post' },
  ],
  warps: [
    { x: 39, y: 15, w: 1, h: 2, karte: 'dorf', zx: 1, zy: 15, blick: 'rechts' },
  ],
  sammel: [{ x: 1, y: 17, w: 38, h: 11, art: 'wald', max: 3 }],
  // Bereiche, die beim Verwildern frei bleiben
  frei: [
    { x: 15, y: 2, w: 12, h: 9 },   // Haus und Versandkiste
    { x: 26, y: 2, w: 13, h: 12 },  // Stall und Auslauf
    { x: 2, y: 3, w: 7, h: 8 },     // Höhlenvorplatz
    { x: 33, y: 13, w: 7, h: 6 },   // Ausgang ins Dorf
  ],
  auslauf: { x: 27, y: 7, w: 11, h: 6 },
});

karte({
  id: 'haus', name: 'Dein Haus', aussen: false, innen: 'haus',
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
  warps: [{ x: 5, y: 9, w: 1, h: 1, karte: 'hof', zx: 20, zy: 7, blick: 'unten' }],
});

karte({
  id: 'dorf', name: 'Klarwasser', aussen: true, wasser: 'fluss', rand: 'wald',
  grid: [
    '####################################~~~#####',
    '####################################~~~#####',
    '#...................................~~~....#',
    '#...................................~~~....#',
    '#...................................~~~....#',
    '#...................................~~~....#',
    '#...................................~~~....#',
    '#...................................~~~....#',
    '#.................:.................~~~....#',
    '#..........:......:.......:......:..~~~....#',
    '#..........:......:.......:......:..~~~....#',
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
    '#....................::.............~~~....#',
    '#....................:::::::::......~~~....#',
    '#....................::.............~~~....#',
    '#....................::.............~~~....#',
    '#####################::#############~~~#####',
    '#####################::#############~~~#####',
  ],
  gebaeude: [
    { typ: 'laden', x: 8, y: 3, w: 7, h: 6, tuer: { x: 11, y: 8 }, ziel: { karte: 'laden', x: 6, y: 8, blick: 'oben' } },
    { typ: 'rathaus', x: 16, y: 2, w: 5, h: 6, tuer: { x: 18, y: 7 }, zu: 'Das Rathaus. An der Tür hängt ein Zettel: „Sprechstunde auf dem Marktplatz. – Frieda"' },
    { typ: 'gasthaus', x: 23, y: 2, w: 7, h: 7, tuer: { x: 26, y: 8 }, ziel: { karte: 'gasthaus', x: 7, y: 9, blick: 'oben' } },
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
    { typ: 'schild', x: 2, y: 14, aktion: 'text', text: 'Klarwasser. Westlich liegt dein Hof, südlich der Strand.' },
    { typ: 'baum', x: 2, y: 3 }, { typ: 'baum', x: 5, y: 5 }, { typ: 'baum', x: 3, y: 9 },
    { typ: 'baum', x: 6, y: 12 }, { typ: 'baum', x: 14, y: 22 }, { typ: 'baum', x: 17, y: 25 },
    { typ: 'baum', x: 25, y: 24 }, { typ: 'baum', x: 33, y: 24 }, { typ: 'baum', x: 2, y: 28 },
    { typ: 'baum', x: 11, y: 28 }, { typ: 'baum', x: 40, y: 4 }, { typ: 'baum', x: 41, y: 12 },
    { typ: 'baum', x: 40, y: 20 }, { typ: 'baum', x: 42, y: 26 }, { typ: 'baum', x: 34, y: 28 },
    { typ: 'busch', x: 15, y: 4 }, { typ: 'busch', x: 22, y: 6 }, { typ: 'busch', x: 7, y: 8 },
    { typ: 'busch', x: 30, y: 20 }, { typ: 'busch', x: 13, y: 18 },
  ],
  warps: [
    { x: 0, y: 15, w: 1, h: 2, karte: 'hof', zx: 38, zy: 15, blick: 'links' },
    { x: 21, y: 31, w: 2, h: 1, karte: 'strand', zx: 17, zy: 2, blick: 'unten' },
  ],
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
  warps: [{ x: 6, y: 9, w: 1, h: 1, karte: 'dorf', zx: 11, zy: 9, blick: 'unten' }],
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
  warps: [{ x: 7, y: 10, w: 1, h: 1, karte: 'dorf', zx: 26, zy: 9, blick: 'unten' }],
});

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
  warps: [{ x: 17, y: 0, w: 2, h: 1, karte: 'dorf', zx: 21, zy: 29, blick: 'oben' }],
  sammel: [{ x: 1, y: 6, w: 34, h: 7, art: 'strand', max: 6 }],
});

karte({
  id: 'mine0', name: 'Alte Mine', aussen: false, innen: 'mine', rand: 'mine', dunkel: 0.25,
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
  warps: [{ x: 6, y: 10, w: 2, h: 1, karte: 'hof', zx: 5, zy: 4, blick: 'unten' }],
});

// Wo die Dorfbewohner hingehen, wenn ihr Plan „zu Hause" sagt.
export const NPC_HEIM = {
  ottilie: { karte: 'laden', x: 12, y: 3 },
  bruno: { karte: 'dorf', x: 5, y: 23 },
  lene: { karte: 'strand', x: 28, y: 9 },
  frieda: { karte: 'dorf', x: 18, y: 8 },
  mats: { karte: 'dorf', x: 29, y: 27 },
  hannes: { karte: 'gasthaus', x: 13, y: 2 },
};

export const BLOCK_BODEN = new Set(['#', 'X', '~']);

export function boden(def, x, y) {
  if (x < 0 || y < 0 || x >= def.w || y >= def.h) return '#';
  return def.grid[y][x];
}

/** Verbindungen zwischen Schauplätzen, für Wege der Dorfbewohner. */
export function verbindungen() {
  const v = [];
  for (const def of Object.values(KARTEN)) {
    for (const w of def.warps) {
      v.push({ von: def.id, nach: w.karte, x: w.x, y: w.y, zx: w.zx, zy: w.zy });
    }
    for (const g of def.gebaeude) {
      if (g.ziel) v.push({ von: def.id, nach: g.ziel.karte, x: g.tuer.x, y: g.tuer.y, zx: g.ziel.x, zy: g.ziel.y });
    }
  }
  return v;
}
