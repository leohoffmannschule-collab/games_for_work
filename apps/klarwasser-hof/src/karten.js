// Kartenformat, Bodenarten, benannte Punkte und Bereiche, Gewässer, dynamische Karten.
// Die Karten selbst liegen in den Bereichen (hof, dorf, wildnis, mine …).
//
// Raster aus Zeichen (Grundarten, weitere über bodenTyp):
//   .  Gras          :  Erdweg        =  Pflaster      s  Sand
//   ~  Wasser        h  Steg/Brücke   _  Holzboden     t  Teppich
//   m  Minenboden    #  Wald, Wand oder Fels (je nach `rand`)
//   X  Felsklippe
//
// Eine Karte:
//   karte({ id, name, aussen, farmbar, innen, rand, wasser: 'teich', grid: [...Zeilen],
//           gebaeude: [{ typ, x, y, w, h, tuer: {x, y}, ziel: { karte, punkt }, zu, aktion, nurWenn, tuerWenn, sonst }],
//           deko: [{ typ, x, y, w, h, aktion, wand, begehbar, licht, nurWenn, … }],
//           warps: [{ x, y, w, h, karte, punkt }],
//           punkte: { name: [x, y, blick?] }, bereiche: { name: [x, y, b, h] },
//           gewaesser: [{ x, y, b, h, art }], sammel: [{ x, y, w, h, art, max, boden }], npcWege })
//
// Gebäude blockieren ihr ganzes Rechteck. Ihre Tür liegt in der untersten Reihe: mit `ziel`
// führt sie hinein, mit `zu` bleibt sie verschlossen, mit `aktion` löst sie eine Gebäudeaktion aus.
// Türen und Warps auf Karten anderer Bereiche verweisen nur über Punkte, nie über Koordinaten.

export const KARTEN = {};

// ─── Bodenarten ─────────────────────────────────────────────────────────────

export const BODEN = {};
let bodenStand = 0;

/** bodenTyp(z, { name, begehbar, farmbar, wasser, wand, … }) – neues Bodenzeichen. */
export function bodenTyp(z, def, opt = {}) {
  if (typeof z !== 'string' || z.length !== 1) throw new Error(`Bodenzeichen muss ein Zeichen sein: „${z}"`);
  if (BODEN[z] && !opt.ersetzen && !def.ersetzen) throw new Error(`Bodenzeichen „${z}" gibt es schon.`);
  const { ersetzen, ...rest } = def;
  BODEN[z] = { zeichen: z, begehbar: false, farmbar: false, wasser: false, wand: false, ...rest };
  bodenStand++;
  return BODEN[z];
}
export const bodenArt = bodenTyp;

bodenTyp('.', { name: 'gras', begehbar: true, farmbar: true });
bodenTyp(':', { name: 'erdweg', begehbar: true, farmbar: true });
bodenTyp('=', { name: 'pflaster', begehbar: true });
bodenTyp('s', { name: 'sand', begehbar: true });
bodenTyp('~', { name: 'wasser', wasser: true });
bodenTyp('h', { name: 'steg', begehbar: true });
bodenTyp('_', { name: 'holzboden', begehbar: true });
bodenTyp('t', { name: 'teppich', begehbar: true });
bodenTyp('m', { name: 'minenboden', begehbar: true });
bodenTyp('#', { name: 'wand', wand: true });
bodenTyp('X', { name: 'klippe' });

// ─── Karten anlegen ─────────────────────────────────────────────────────────

let kartenStand = 0;
/** Zählt jede Kartenregistrierung (für Caches wie verbindungen()). */
export const kartenVersion = () => kartenStand;

/** Ergänzt Standardfelder; auch für Karten aus einem kartenAnbieter. */
export function karteVorbereiten(def) {
  if (Array.isArray(def.grid?.[0])) def.grid = fertigRaster(def.grid);
  if (!def.grid?.length) throw new Error(`Karte „${def.id}" hat kein Raster.`);
  def.h = def.grid.length;
  def.w = def.grid[0].length;
  def.gebaeude ??= [];
  def.deko ??= [];
  def.warps ??= [];
  def.sammel ??= [];
  def.punkte ??= {};
  def.bereiche ??= {};
  def.gewaesser ??= [];
  return def;
}

export function karte(def) {
  const { ersetzen } = def;
  delete def.ersetzen;
  if (KARTEN[def.id] && !ersetzen) throw new Error(`Karte „${def.id}" gibt es schon.`);
  KARTEN[def.id] = karteVorbereiten(def);
  kartenStand++;
  return def;
}

// ─── Bau-Helfer für große Karten ────────────────────────────────────────────
// Ein Raster g ist hier ein Feld von Zeilen aus Einzelzeichen; fertigRaster macht Strings daraus.

export function raster(b, h, z = '.') {
  return Array.from({ length: h }, () => Array(b).fill(z));
}
function setzen(g, x, y, z) {
  if (y >= 0 && y < g.length && x >= 0 && x < g[y].length) g[y][x] = z;
}
export function rechteck(g, x, y, b, h, z) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + b; xx++) setzen(g, xx, yy, z);
  return g;
}
export function ellipse(g, cx, cy, rx, ry, z) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) setzen(g, x, y, z);
    }
  }
  return g;
}
/** Weg durch die Punkte [[x, y], …]; die Breite wächst nach rechts bzw. unten. */
export function pfad(g, punkte, breite = 1, z = ':') {
  const pinsel = (x, y) => rechteck(g, x, y, breite, breite, z);
  for (let i = 0; i < punkte.length; i++) {
    const [x0, y0] = punkte[i];
    const [x1, y1] = punkte[i + 1] || punkte[i];
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let j = 0; j <= n; j++) pinsel(Math.round(x0 + ((x1 - x0) * j) / n), Math.round(y0 + ((y1 - y0) * j) / n));
  }
  return g;
}
export function rahmen(g, z = '#', dicke = 1) {
  const h = g.length;
  const b = g[0].length;
  rechteck(g, 0, 0, b, dicke, z);
  rechteck(g, 0, h - dicke, b, dicke, z);
  rechteck(g, 0, 0, dicke, h, z);
  rechteck(g, b - dicke, 0, dicke, h, z);
  return g;
}
export const fertigRaster = (g) => g.map((zeile) => (Array.isArray(zeile) ? zeile.join('') : zeile));

// ─── Abfragen ───────────────────────────────────────────────────────────────

export function boden(def, x, y) {
  if (x < 0 || y < 0 || x >= def.w || y >= def.h) return '#';
  return def.grid[y][x];
}
export const bodenVon = (def, x, y) => BODEN[boden(def, x, y)] || BODEN['#'];

const rasterCache = new WeakMap();
export const B_BEGEHBAR = 1;
export const B_FARMBAR = 2;
export const B_WASSER = 4;
/** Bodenflags je Feld (Index y * w + x), gecacht. */
export function bodenRaster(def) {
  const c = rasterCache.get(def);
  if (c && c.stand === bodenStand && c.grid === def.grid) return c.flags;
  const flags = new Uint8Array(def.w * def.h);
  for (let y = 0; y < def.h; y++) {
    const zeile = def.grid[y];
    for (let x = 0; x < def.w; x++) {
      const b = BODEN[zeile[x]] || BODEN['#'];
      flags[y * def.w + x] = (b.begehbar ? B_BEGEHBAR : 0) | (b.farmbar ? B_FARMBAR : 0) | (b.wasser ? B_WASSER : 0);
    }
  }
  rasterCache.set(def, { stand: bodenStand, grid: def.grid, flags });
  return flags;
}
export function bodenFlag(def, x, y, flag) {
  if (x < 0 || y < 0 || x >= def.w || y >= def.h) return false;
  return (bodenRaster(def)[y * def.w + x] & flag) !== 0;
}
export const istWasser = (def, x, y) => bodenFlag(def, x, y, B_WASSER);
export const hatWasser = (def) => !!def.wasser || def.gewaesser?.length > 0;

/** Gewässerart an einem Feld (für die Fischtabellen): gewaesser-Rechtecke, sonst def.wasser. */
export function wasserArt(ort, x, y) {
  const def = ort.def ?? ort;
  for (const g of def.gewaesser || []) if (x >= g.x && x < g.x + g.b && y >= g.y && y < g.y + g.h) return g.art;
  return def.wasser || null;
}

/** punkt('dorf', 'brunnen') → { x, y, blick } oder null. */
export function punkt(kartenId, name) {
  const def = typeof kartenId === 'string' ? karteHolen(kartenId) : kartenId;
  const p = def?.punkte?.[name];
  if (!p) return null;
  return { x: p[0], y: p[1], blick: p[2] };
}

/** bereichVon('hof', 'auslauf') → { x, y, w, h } oder null. */
export function bereichVon(kartenId, name) {
  const def = typeof kartenId === 'string' ? karteHolen(kartenId) : kartenId;
  const b = def?.bereiche?.[name];
  if (!b) return null;
  return { x: b[0], y: b[1], w: b[2], h: b[3] };
}

function punktOderFehler(kartenId, name) {
  const p = punkt(kartenId, name);
  if (!p) throw new Error(`Punkt „${kartenId}.${name}" fehlt.`);
  return p;
}

/** Ziel einer Tür oder eines Plans: { karte, punkt, blick } oder { karte, x, y, blick }. */
export function zielVon(z) {
  if (z.punkt) {
    const p = punktOderFehler(z.karte, z.punkt);
    return { karte: z.karte, x: p.x, y: p.y, blick: z.blick ?? p.blick ?? 'unten' };
  }
  return { karte: z.karte, x: z.x, y: z.y, blick: z.blick ?? 'unten' };
}

/** Ziel eines Warp-Streifens: { karte, punkt } oder { karte, zx, zy }. */
export function warpZiel(w) {
  if (w.punkt) return zielVon({ karte: w.karte, punkt: w.punkt, blick: w.blick });
  return { karte: w.karte, x: w.zx, y: w.zy, blick: w.blick ?? 'unten' };
}

// ─── Dynamische Karten ──────────────────────────────────────────────────────

const ANBIETER = [];
const DYNAMISCH = new Map();

/**
 * kartenAnbieter(pruefen(id) → bool, erzeugen(id, s) → def): Karten, die erst bei Bedarf
 * entstehen (Minenebenen, Stall-Innenräume). Mit `fluechtig: true` im def entsteht die
 * Karte bei jedem Betreten neu und ihr Zustand (`weltStart`) wird nicht gespeichert.
 */
export function kartenAnbieter(pruefen, erzeugen) {
  ANBIETER.push({ pruefen, erzeugen });
}

export function karteHolen(id, s) {
  if (id == null) return null;
  if (KARTEN[id]) return KARTEN[id];
  if (DYNAMISCH.has(id)) return DYNAMISCH.get(id);
  const a = ANBIETER.find((x) => x.pruefen(id));
  if (!a) return null;
  const def = karteVorbereiten(a.erzeugen(id, s));
  def.id ??= id;
  def.dynamisch = true;
  DYNAMISCH.set(id, def);
  return def;
}
export const karteVergessen = (id) => DYNAMISCH.delete(id);
export const istKarte = (id) => !!KARTEN[id] || ANBIETER.some((a) => a.pruefen(id));

// ─── Verbindungen ───────────────────────────────────────────────────────────

let vCache = null;
let vStand = -1;

/** Alle Warps und Türen zwischen festen Karten (für Wege der Dorfbewohner), gecacht. */
export function verbindungen() {
  if (vCache && vStand === kartenStand) return vCache;
  const v = [];
  for (const def of Object.values(KARTEN)) {
    for (const w of def.warps) {
      const z = warpZiel(w);
      v.push({ von: def.id, nach: z.karte, x: w.x, y: w.y, zx: z.x, zy: z.y, art: 'warp' });
    }
    for (const g of def.gebaeude) {
      if (!g.ziel) continue;
      const z = zielVon(g.ziel);
      v.push({ von: def.id, nach: z.karte, x: g.tuer.x, y: g.tuer.y, zx: z.x, zy: z.y, art: 'tuer', tuerWenn: g.tuerWenn });
    }
  }
  vCache = v;
  vStand = kartenStand;
  return v;
}
