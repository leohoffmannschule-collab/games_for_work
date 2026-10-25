/**
 * Blockarten und ihre Eigenschaften. Reine Daten – ohne DOM, damit Welt und
 * Physik auch in Node (tools/blockwelt-pruefen.mjs) laufen.
 *
 * Haerte, passendes Werkzeug und noetige Werkzeugstufe entsprechen dem Vorbild;
 * items.js rechnet daraus Abbauzeit und Beute aus. Tile-Nummern verweisen auf den
 * Texturatlas (siehe atlas.js).
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
export const COAL_ORE = 15;
export const IRON_ORE = 16;
export const TABLE = 17;
export const FURNACE = 18;
export const TORCH = 19;
export const WOOL = 20;
export const TALL_GRASS = 21;
export const POPPY = 22;
export const DANDELION = 23;

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
  'coal_ore',
  'iron_ore',
  'table_top',
  'table_side',
  'furnace_front',
  'furnace_side',
  'furnace_top',
  'torch',
  'wool',
  'tall_grass',
  'poppy',
  'dandelion',
  // Risse beim Abbauen, Stufe 0 bis 9.
  ...Array.from({ length: 10 }, (_, i) => 'destroy_' + i),
];
export const ATLAS_COLS = 8;
export const TILE_PX = 16;

export const tile = (name) => {
  const i = TILES.indexOf(name);
  if (i < 0) throw new Error('Unbekannte Kachel: ' + name);
  return i;
};

const PICK = { tool: 'pickaxe', tier: 0 };

function def(id, name, tiles, extra = {}) {
  const [top, side = top, bottom = top] = Array.isArray(tiles) ? tiles : [tiles];
  const { front, ...rest } = extra;
  return {
    id,
    name,
    top: tile(top),
    side: tile(side),
    bottom: tile(bottom),
    front: tile(front || side),
    model: 'cube', // 'cube' | 'cross' (Pflanzen) | 'torch' | 'liquid'
    solid: true, // hat eine Kollisionsbox
    opaque: true, // verdeckt dahinterliegende Flaechen und haelt Licht auf
    cutout: false, // Textur hat durchsichtige Pixel
    light: 0, // eigene Leuchtkraft 0..15
    hardness: 1, // -1 = unzerstoerbar
    tool: null, // Werkzeugart, die den Abbau beschleunigt
    needs: null, // Mindestwerkzeug, ohne das nichts herausfaellt
    drop: id,
    replaceable: false, // beim Setzen einfach ueberschreiben (hohes Gras)
    washable: false, // wird von fliessendem Wasser weggespuelt
    support: null, // 'ground' (Pflanzen) oder 'torch'
    gravity: false, // faellt wie Sand
    ...rest,
  };
}

const PLANT = {
  model: 'cross',
  solid: false,
  opaque: false,
  cutout: true,
  hardness: 0,
  washable: true,
  support: 'ground',
};

export const BLOCKS = [
  null,
  def(GRASS, 'Gras', ['grass_top', 'grass_side', 'dirt'], {
    hardness: 0.6,
    tool: 'shovel',
    drop: DIRT,
  }),
  def(DIRT, 'Erde', 'dirt', { hardness: 0.5, tool: 'shovel' }),
  def(STONE, 'Stein', 'stone', { hardness: 1.5, tool: 'pickaxe', needs: PICK, drop: COBBLE }),
  def(SAND, 'Sand', 'sand', { hardness: 0.5, tool: 'shovel', gravity: true }),
  def(WATER, 'Wasser', 'water', {
    model: 'liquid',
    solid: false,
    opaque: false,
    hardness: -1,
    drop: null,
    replaceable: true,
  }),
  def(LOG, 'Holz', ['log_top', 'log_side'], { hardness: 2, tool: 'axe' }),
  def(LEAVES, 'Laub', 'leaves', { opaque: false, cutout: true, hardness: 0.2, drop: null }),
  def(PLANKS, 'Bretter', 'planks', { hardness: 2, tool: 'axe' }),
  def(COBBLE, 'Bruchstein', 'cobble', { hardness: 2, tool: 'pickaxe', needs: PICK }),
  def(GLASS, 'Glas', 'glass', { opaque: false, cutout: true, hardness: 0.3, drop: null }),
  def(BRICK, 'Ziegel', 'brick', { hardness: 2, tool: 'pickaxe', needs: PICK }),
  def(SNOW, 'Schnee', 'snow', { hardness: 0.2, tool: 'shovel' }),
  def(BEDROCK, 'Grundgestein', 'bedrock', { hardness: -1, drop: null }),
  def(LAMP, 'Lampe', 'lamp', { hardness: 0.3, light: 15 }),
  def(COAL_ORE, 'Kohleerz', 'coal_ore', { hardness: 3, tool: 'pickaxe', needs: PICK }),
  def(IRON_ORE, 'Eisenerz', 'iron_ore', {
    hardness: 3,
    tool: 'pickaxe',
    needs: { tool: 'pickaxe', tier: 1 },
  }),
  def(TABLE, 'Werkbank', ['table_top', 'table_side', 'planks'], { hardness: 2.5, tool: 'axe' }),
  def(FURNACE, 'Ofen', ['furnace_top', 'furnace_side', 'furnace_top'], {
    front: 'furnace_front',
    hardness: 3.5,
    tool: 'pickaxe',
    needs: PICK,
  }),
  def(TORCH, 'Fackel', 'torch', {
    model: 'torch',
    solid: false,
    opaque: false,
    cutout: true,
    hardness: 0,
    light: 14,
    washable: true,
    support: 'torch',
  }),
  def(WOOL, 'Wolle', 'wool', { hardness: 0.8 }),
  def(TALL_GRASS, 'Hohes Gras', 'tall_grass', { ...PLANT, drop: null, replaceable: true }),
  def(POPPY, 'Mohn', 'poppy', PLANT),
  def(DANDELION, 'Löwenzahn', 'dandelion', PLANT),
];

export const COUNT = BLOCKS.length;

/** Tabellen fuer die heissen Schleifen (Typed Arrays statt Objekt-Lookups). */
export const OPAQUE = new Uint8Array(256);
export const SOLID = new Uint8Array(256);
export const LIGHT = new Uint8Array(256);
export const WASHABLE = new Uint8Array(256);
export const REPLACEABLE = new Uint8Array(256);
for (const b of BLOCKS) {
  if (!b) continue;
  OPAQUE[b.id] = b.opaque ? 1 : 0;
  SOLID[b.id] = b.solid ? 1 : 0;
  LIGHT[b.id] = b.light;
  WASHABLE[b.id] = b.washable ? 1 : 0;
  REPLACEABLE[b.id] = b.replaceable ? 1 : 0;
}

/** Blickrichtung der Ofenfront (Zustandswert 0..3). */
export const FACING = [
  [0, 0, -1],
  [1, 0, 0],
  [0, 0, 1],
  [-1, 0, 0],
];

/** Fackeln: Zustandswert 0 = auf dem Boden, 1..4 = an der Wand in dieser Richtung. */
export const TORCH_WALL = [null, [-1, 0, 0], [1, 0, 0], [0, 0, -1], [0, 0, 1]];

/**
 * Kleinere Form als ein voller Wuerfel (fuer Zielen und Umriss), sonst null.
 * Masse in Bloecken relativ zur Zelle: [x0, y0, z0, x1, y1, z1].
 */
export function blockBox(id, meta) {
  const model = BLOCKS[id] && BLOCKS[id].model;
  if (model === 'cross') return [0.125, 0, 0.125, 0.875, 0.8125, 0.875];
  if (model !== 'torch') return null;
  const lo = 5.5 / 16;
  const hi = 10.5 / 16;
  const top = 13 / 16;
  const low = 3 / 16;
  const d = 5 / 16;
  switch (meta) {
    case 1:
      return [0, low, lo, d, top, hi];
    case 2:
      return [1 - d, low, lo, 1, top, hi];
    case 3:
      return [lo, low, 0, hi, top, d];
    case 4:
      return [lo, low, 1 - d, hi, top, 1];
    default:
      return [6 / 16, 0, 6 / 16, 10 / 16, 10 / 16, 10 / 16];
  }
}
