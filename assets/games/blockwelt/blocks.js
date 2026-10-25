/**
 * Blockarten und ihre Eigenschaften. Reine Daten – ohne DOM, damit Welt und
 * Physik auch in Node (tools/blockwelt-pruefen.mjs) laufen.
 *
 * Tile-Nummern verweisen auf den Texturatlas (siehe atlas.js).
 */

export const AIR = 0;
export const GRASS = 1;
export const DIRT = 2;
export const STONE = 3;
export const SAND = 4;
export const WATER = 5;
export const LOG = 6;
export const LEAVES = 7;
export const PLANKS = 8;
export const COBBLE = 9;
export const GLASS = 10;
export const BRICK = 11;
export const SNOW = 12;
export const BEDROCK = 13;
export const LAMP = 14;

export const TILES = [
  'grass_top',
  'grass_side',
  'dirt',
  'stone',
  'sand',
  'water',
  'log_side',
  'log_top',
  'leaves',
  'planks',
  'cobble',
  'glass',
  'brick',
  'snow',
  'bedrock',
  'lamp',
];
export const ATLAS_COLS = 4;
export const TILE_PX = 16;

const t = (name) => TILES.indexOf(name);

function def(id, name, top, side, bottom, extra = {}) {
  return {
    id,
    name,
    top: t(top),
    side: t(side),
    bottom: t(bottom),
    solid: true, // hat eine Kollisionsbox
    opaque: true, // verdeckt dahinterliegende Flaechen und blockiert Licht
    cutout: false, // Textur hat durchsichtige Pixel (Laub, Glas)
    emissive: false,
    hardness: 1,
    drop: id,
    ...extra,
  };
}

/** Haerte-Werte wie im Original (Sekunden mit der blossen Hand = Haerte x 1,5). */
export const BLOCKS = [
  null,
  def(GRASS, 'Gras', 'grass_top', 'grass_side', 'dirt', { hardness: 0.6, drop: DIRT }),
  def(DIRT, 'Erde', 'dirt', 'dirt', 'dirt', { hardness: 0.5 }),
  def(STONE, 'Stein', 'stone', 'stone', 'stone', { hardness: 1.5, drop: COBBLE }),
  def(SAND, 'Sand', 'sand', 'sand', 'sand', { hardness: 0.5 }),
  def(WATER, 'Wasser', 'water', 'water', 'water', {
    solid: false,
    opaque: false,
    hardness: 100,
    drop: AIR,
  }),
  def(LOG, 'Holz', 'log_top', 'log_side', 'log_top', { hardness: 2 }),
  def(LEAVES, 'Laub', 'leaves', 'leaves', 'leaves', {
    opaque: false,
    cutout: true,
    hardness: 0.2,
    drop: AIR,
  }),
  def(PLANKS, 'Bretter', 'planks', 'planks', 'planks', { hardness: 2 }),
  def(COBBLE, 'Bruchstein', 'cobble', 'cobble', 'cobble', { hardness: 2 }),
  def(GLASS, 'Glas', 'glass', 'glass', 'glass', {
    opaque: false,
    cutout: true,
    hardness: 0.3,
    drop: AIR,
  }),
  def(BRICK, 'Ziegel', 'brick', 'brick', 'brick', { hardness: 2 }),
  def(SNOW, 'Schnee', 'snow', 'snow', 'snow', { hardness: 0.2 }),
  def(BEDROCK, 'Grundgestein', 'bedrock', 'bedrock', 'bedrock', { hardness: Infinity }),
  def(LAMP, 'Lampe', 'lamp', 'lamp', 'lamp', { hardness: 0.3, emissive: true }),
];

export const COUNT = BLOCKS.length;

/** Tabellen fuer die heissen Schleifen (Typed Arrays statt Objekt-Lookups). */
export const OPAQUE = new Uint8Array(COUNT);
export const SOLID = new Uint8Array(COUNT);
for (const b of BLOCKS) {
  if (!b) continue;
  OPAQUE[b.id] = b.opaque ? 1 : 0;
  SOLID[b.id] = b.solid ? 1 : 0;
}

/** Was man im Kreativmenue auswaehlen kann. */
export const PLACEABLE = BLOCKS.filter((b) => b && b.id !== WATER && b.id !== BEDROCK).map(
  (b) => b.id,
);

/** Einfache Rezepte fuer den Ueberlebensmodus: [Zutaten] -> Ergebnis. */
export const RECIPES = [
  { in: [[LOG, 1]], out: [PLANKS, 4] },
  { in: [[SAND, 4]], out: [GLASS, 2] },
  { in: [[COBBLE, 4]], out: [BRICK, 4] },
  {
    in: [
      [PLANKS, 2],
      [GLASS, 2],
    ],
    out: [LAMP, 2],
  },
  {
    in: [
      [DIRT, 2],
      [SAND, 2],
    ],
    out: [SNOW, 4],
  },
  { in: [[COBBLE, 1]], out: [STONE, 1] },
];
