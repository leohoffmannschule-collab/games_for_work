/**
 * Gegenstaende: Bloecke zum Setzen, Werkzeuge, Essen, Rohstoffe – plus Abbauregeln,
 * Rezepte und das Inventar. Reine Logik ohne DOM.
 *
 * Abbauzeit wie im Vorbild: pro Tick waechst der Fortschritt um
 *   Tempo / Haerte / 30  (mit passendem Werkzeug bzw. ohne noetiges Werkzeug)
 *   Tempo / Haerte / 100 (wenn der Block ein besseres Werkzeug verlangt)
 * Tempo ist 1, mit passendem Werkzeug 2 (Holz), 4 (Stein) oder 6 (Eisen); unter
 * Wasser und in der Luft jeweils ein Fuenftel. Stein mit der Hand: 7,5 s, mit der
 * Holzspitzhacke 1,15 s – tools/blockwelt-pruefen.mjs rechnet das nach.
 */

import {
  BLOCKS,
  WATER,
  BEDROCK,
  LOG,
  LEAVES,
  PLANKS,
  COBBLE,
  STONE,
  SAND,
  GLASS,
  BRICK,
  LAMP,
  COAL_ORE,
  IRON_ORE,
  TABLE,
  FURNACE,
  TORCH,
} from './blocks.js';

export const STICK = 64;
export const COAL = 65;
export const IRON_INGOT = 66;
export const APPLE = 67;
export const PORK = 68;
export const PORK_COOKED = 69;
export const BEEF = 70;
export const STEAK = 71;
export const MUTTON = 72;
export const MUTTON_COOKED = 73;
export const ROTTEN_FLESH = 74;
export const BUCKET = 75;
export const WATER_BUCKET = 76;

export const TOOL_KINDS = ['pickaxe', 'axe', 'shovel', 'sword'];
const KIND_NAME = { pickaxe: 'spitzhacke', axe: 'axt', shovel: 'schaufel', sword: 'schwert' };
const KIND_DAMAGE = { pickaxe: 2, axe: 3, shovel: 1, sword: 4 };

/** Werkzeugstufen des Vorbilds: Abbautempo und Haltbarkeit. */
export const TIERS = [
  { name: 'Holz', speed: 2, uses: 59, material: PLANKS },
  { name: 'Stein', speed: 4, uses: 131, material: COBBLE },
  { name: 'Eisen', speed: 6, uses: 250, material: IRON_INGOT },
];

/** Item-Nummer eines Werkzeugs: 80 + Art * 3 + Stufe. */
export const toolId = (kind, tier) => 80 + TOOL_KINDS.indexOf(kind) * 3 + tier;
export const WOOD_PICKAXE = toolId('pickaxe', 0);
export const STONE_PICKAXE = toolId('pickaxe', 1);
export const IRON_PICKAXE = toolId('pickaxe', 2);
export const WOOD_SWORD = toolId('sword', 0);
export const STONE_SWORD = toolId('sword', 1);
export const IRON_SWORD = toolId('sword', 2);

export const ITEMS = [];

function item(id, name, extra = {}) {
  ITEMS[id] = { id, name, stack: 64, block: null, tool: null, food: null, fuel: 0, ...extra };
  return ITEMS[id];
}

// Jeder Block ausser Luft, Wasser und Grundgestein ist auch ein Gegenstand.
for (const b of BLOCKS) {
  if (!b || b.id === WATER || b.id === BEDROCK) continue;
  item(b.id, b.name, { block: b.id });
}
ITEMS[LOG].fuel = 1.5;
ITEMS[PLANKS].fuel = 1.5;
ITEMS[TABLE].fuel = 1.5;

item(STICK, 'Stock', { fuel: 0.5 });
item(COAL, 'Kohle', { fuel: 8 });
item(IRON_INGOT, 'Eisenbarren');
// Nahrung: [Hungerpunkte, Saettigung] wie im Vorbild.
item(APPLE, 'Apfel', { food: [4, 2.4] });
item(PORK, 'Rohes Schweinefleisch', { food: [3, 1.8] });
item(PORK_COOKED, 'Gebratenes Schweinefleisch', { food: [8, 12.8] });
item(BEEF, 'Rohes Rindfleisch', { food: [3, 1.8] });
item(STEAK, 'Steak', { food: [8, 12.8] });
item(MUTTON, 'Rohes Hammelfleisch', { food: [2, 1.2] });
item(MUTTON_COOKED, 'Gebratenes Hammelfleisch', { food: [6, 9.6] });
item(ROTTEN_FLESH, 'Verdorbenes Fleisch', { food: [4, 0.8] });
item(BUCKET, 'Eimer', { stack: 16 });
item(WATER_BUCKET, 'Wassereimer', { stack: 1 });

for (const kind of TOOL_KINDS) {
  TIERS.forEach((tier, t) => {
    const name = tier.name + KIND_NAME[kind];
    item(toolId(kind, t), name, {
      stack: 1,
      fuel: t === 0 ? 1 : 0,
      tool: {
        type: kind,
        tier: t,
        speed: tier.speed,
        uses: tier.uses,
        damage: KIND_DAMAGE[kind] + t,
      },
    });
  });
}

export const itemName = (id) => (ITEMS[id] ? ITEMS[id].name : '?');
export const maxStack = (id) => (ITEMS[id] ? ITEMS[id].stack : 64);

/** Reihenfolge fuer die Auswahl im Kreativmodus. */
export const CREATIVE_ITEMS = [
  ...BLOCKS.filter((b) => b && ITEMS[b.id]).map((b) => b.id),
  BUCKET,
  WATER_BUCKET,
  ...TOOL_KINDS.flatMap((k) => [0, 1, 2].map((t) => toolId(k, t))),
  STICK,
  COAL,
  IRON_INGOT,
  APPLE,
  PORK,
  PORK_COOKED,
  BEEF,
  STEAK,
  MUTTON,
  MUTTON_COOKED,
  ROTTEN_FLESH,
];

/* ------------------------------------------------------------- Abbauen -- */

export function toolOf(itemId) {
  return (ITEMS[itemId] && ITEMS[itemId].tool) || null;
}

/** Faellt beim Abbauen mit diesem Gegenstand etwas heraus? */
export function canHarvest(blockId, itemId) {
  const need = BLOCKS[blockId] && BLOCKS[blockId].needs;
  if (!need) return true;
  const tool = toolOf(itemId);
  return !!tool && tool.type === need.tool && tool.tier >= need.tier;
}

/** Abbautempo nach Vorbild (ohne Verzauberungen und Effekte). */
export function breakSpeed(blockId, itemId, { inWater = false, onGround = true } = {}) {
  const b = BLOCKS[blockId];
  const tool = toolOf(itemId);
  let speed = tool && b && b.tool === tool.type ? tool.speed : 1;
  if (inWater) speed /= 5;
  if (!onGround) speed /= 5;
  return speed;
}

/** Ticks bis zum Abbau; 0 = sofort, Infinity = unzerstoerbar. */
export function breakTicks(blockId, itemId, env = {}) {
  const b = BLOCKS[blockId];
  if (!b || b.hardness < 0) return Infinity;
  if (b.hardness === 0) return 0;
  const perTick =
    breakSpeed(blockId, itemId, env) / b.hardness / (canHarvest(blockId, itemId) ? 30 : 100);
  return perTick >= 1 ? 0 : Math.ceil(1 / perTick);
}

/** Was beim Abbauen herausfaellt: Liste von [Item, Anzahl]. */
export function drops(blockId, itemId, rnd = Math.random) {
  const b = BLOCKS[blockId];
  if (!b || !canHarvest(blockId, itemId)) return [];
  if (blockId === LEAVES) return rnd() < 0.05 ? [[APPLE, 1]] : [];
  if (blockId === COAL_ORE) return [[COAL, 1]];
  return b.drop ? [[b.drop, 1]] : [];
}

/** Abnutzung eines Werkzeugs beim Abbauen bzw. beim Angriff (Vorbild). */
export function wearOnBreak(itemId, blockId) {
  const tool = toolOf(itemId);
  if (!tool || !(BLOCKS[blockId] && BLOCKS[blockId].hardness > 0)) return 0;
  return tool.type === 'sword' ? 2 : 1;
}
export function wearOnAttack(itemId) {
  const tool = toolOf(itemId);
  if (!tool) return 0;
  return tool.type === 'sword' ? 1 : 2;
}
export function attackDamage(itemId) {
  const tool = toolOf(itemId);
  return tool ? tool.damage : 1;
}

/* ------------------------------------------------------------- Rezepte -- */

/**
 * `at`: null = aus der Hand (2x2-Feld im Vorbild), TABLE = an der Werkbank,
 * FURNACE = im Ofen (verbraucht Brennstoff).
 */
export const RECIPES = [
  { out: [PLANKS, 4], in: [[LOG, 1]], at: null },
  { out: [STICK, 4], in: [[PLANKS, 2]], at: null },
  { out: [TABLE, 1], in: [[PLANKS, 4]], at: null },
  {
    out: [TORCH, 4],
    in: [
      [COAL, 1],
      [STICK, 1],
    ],
    at: null,
  },
  { out: [FURNACE, 1], in: [[COBBLE, 8]], at: TABLE },
];
TIERS.forEach((tier, t) => {
  const m = tier.material;
  RECIPES.push(
    {
      out: [toolId('pickaxe', t), 1],
      in: [
        [m, 3],
        [STICK, 2],
      ],
      at: TABLE,
    },
    {
      out: [toolId('axe', t), 1],
      in: [
        [m, 3],
        [STICK, 2],
      ],
      at: TABLE,
    },
    {
      out: [toolId('shovel', t), 1],
      in: [
        [m, 1],
        [STICK, 2],
      ],
      at: TABLE,
    },
    {
      out: [toolId('sword', t), 1],
      in: [
        [m, 2],
        [STICK, 1],
      ],
      at: TABLE,
    },
  );
});
RECIPES.push(
  { out: [BUCKET, 1], in: [[IRON_INGOT, 3]], at: TABLE },
  { out: [BRICK, 4], in: [[STONE, 4]], at: TABLE },
  {
    out: [LAMP, 1],
    in: [
      [GLASS, 1],
      [TORCH, 1],
    ],
    at: TABLE,
  },
  { out: [IRON_INGOT, 1], in: [[IRON_ORE, 1]], at: FURNACE },
  { out: [GLASS, 1], in: [[SAND, 1]], at: FURNACE },
  { out: [STONE, 1], in: [[COBBLE, 1]], at: FURNACE },
  { out: [COAL, 1], in: [[LOG, 1]], at: FURNACE },
  { out: [PORK_COOKED, 1], in: [[PORK, 1]], at: FURNACE },
  { out: [STEAK, 1], in: [[BEEF, 1]], at: FURNACE },
  { out: [MUTTON_COOKED, 1], in: [[MUTTON, 1]], at: FURNACE },
);

/** Wieviel Brennstoff (in geschmolzenen Gegenstaenden) ein Stueck liefert. */
export const fuelValue = (id) => (ITEMS[id] ? ITEMS[id].fuel : 0);

/** Alles Brennbare, das ergiebigste zuerst (Kohle 8, Holz 1,5, Stock 0,5 Vorgaenge). */
export const FUELS = ITEMS.filter((it) => it && it.fuel > 0)
  .map((it) => it.id)
  .sort((a, b) => fuelValue(b) - fuelValue(a));

/* ------------------------------------------------------------ Inventar -- */

/**
 * Ein Stapel ist { id, count, wear }. `wear` zaehlt die Abnutzung eines Werkzeugs.
 * Plaetze 0..8 sind die Schnellleiste, 9..35 der Rucksack.
 */
export class Inventory {
  constructor(size = 36) {
    this.slots = Array(size).fill(null);
  }

  count(id) {
    let n = 0;
    for (const s of this.slots) if (s && s.id === id) n += s.count;
    return n;
  }

  /** Wie viele Stueck dieses Gegenstands noch hineinpassen. */
  room(id) {
    const max = maxStack(id);
    let n = 0;
    for (const s of this.slots) {
      if (!s) n += max;
      else if (s.id === id && !s.wear) n += max - s.count;
    }
    return n;
  }

  /** Legt Gegenstaende ab (erst auf passende Stapel, dann in freie Plaetze). Gibt den Rest zurueck. */
  add(id, n = 1) {
    const max = maxStack(id);
    for (const s of this.slots) {
      if (n <= 0) break;
      if (s && s.id === id && !s.wear && s.count < max) {
        const k = Math.min(n, max - s.count);
        s.count += k;
        n -= k;
      }
    }
    for (let i = 0; i < this.slots.length && n > 0; i++) {
      if (!this.slots[i]) {
        const k = Math.min(n, max);
        this.slots[i] = { id, count: k, wear: 0 };
        n -= k;
      }
    }
    return n;
  }

  /** Nimmt Gegenstaende heraus, bevorzugt aus dem Rucksack. Gibt die entnommene Menge zurueck. */
  remove(id, n) {
    let taken = 0;
    for (let i = this.slots.length - 1; i >= 0 && taken < n; i--) {
      const s = this.slots[i];
      if (!s || s.id !== id) continue;
      const k = Math.min(n - taken, s.count);
      s.count -= k;
      taken += k;
      if (s.count <= 0) this.slots[i] = null;
    }
    return taken;
  }

  /** Verschiebt oder tauscht zwei Plaetze; gleiche Gegenstaende werden zusammengelegt. */
  move(from, to) {
    if (from === to) return;
    const a = this.slots[from];
    const b = this.slots[to];
    if (!a) return;
    if (b && b.id === a.id && !a.wear && !b.wear) {
      const k = Math.min(a.count, maxStack(a.id) - b.count);
      b.count += k;
      a.count -= k;
      if (a.count <= 0) this.slots[from] = null;
      return;
    }
    this.slots[from] = b;
    this.slots[to] = a;
  }

  canCraft(recipe) {
    return recipe.in.every(([id, n]) => this.count(id) >= n);
  }

  /**
   * Stellt einmal her. Gibt einen Fehlertext zurueck oder null bei Erfolg.
   * Ob Werkbank oder Ofen in der Naehe sind, prueft der Aufrufer.
   */
  craft(recipe) {
    if (!this.canCraft(recipe)) return 'Es fehlen Zutaten.';
    const [out, n] = recipe.out;
    // Platz pruefen, nachdem die Zutaten weg waeren.
    const backup = this.slots.map((s) => (s ? { ...s } : null));
    for (const [id, k] of recipe.in) this.remove(id, k);
    if (this.room(out) < n) {
      this.slots = backup;
      return 'Kein Platz im Inventar.';
    }
    this.add(out, n);
    return null;
  }

  serialize() {
    return this.slots.map((s) => (s ? [s.id, s.count, s.wear || 0] : null));
  }

  static from(list, size = 36) {
    const inv = new Inventory(size);
    (list || []).slice(0, size).forEach((s, i) => {
      if (s && ITEMS[s[0]] && s[1] > 0) inv.slots[i] = { id: s[0], count: s[1], wear: s[2] || 0 };
    });
    return inv;
  }
}
