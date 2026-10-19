// Spieldaten: Kern-Konstanten und die Register, die die Bereiche füllen.
// Reine Beschreibung ohne DOM-Zugriff, damit die Tests alles direkt laden können.
//
// Jede Registrierung wirft bei doppelter ID, außer mit `ersetzen: true` (im def oder als
// drittes Argument). Die Inhalte selbst stehen in src/bereiche/*/inhalt.js.

import { alle } from './system.js';

export const T = 16;
export const JZ = ['fruehling', 'sommer', 'herbst', 'winter'];
export const JZ_NAME = { fruehling: 'Frühling', sommer: 'Sommer', herbst: 'Herbst', winter: 'Winter' };
export const WOCHENTAGE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
export const TAGE_PRO_JZ = 28;
export const TAG_BEGINN = 360;   // 6:00
export const TAG_ENDE = 1560;    // 2:00 nachts
export const MS_PRO_MINUTE = 700; // 7 Sekunden je 10 Spielminuten
export const MAX_ENERGIE = 270;
export const MAX_HP = 100;
export const STAPEL_MAX = 999;

export const XP_STUFEN = [100, 380, 770, 1300, 2150, 3300, 4800, 6900, 10000, 15000];
export const FAEHIGKEITEN = {
  landwirtschaft: 'Landwirtschaft',
  angeln: 'Angeln',
  sammeln: 'Sammeln',
  bergbau: 'Bergbau',
  kampf: 'Kampf',
};

export const QUALITAET = [
  { name: '', faktor: 1 },
  { name: 'Silber', faktor: 1.25 },
  { name: 'Gold', faktor: 1.5 },
  { name: 'Iridium', faktor: 2 },
];

// Werkzeug-Upgrades gibt es nur, wenn der Barren als Gegenstand registriert ist.
export const WERKZEUG_STUFEN = [
  { name: 'Basis', farbe: '#a3abb5' },
  { name: 'Kupfer', farbe: '#d98a4e', kosten: 1000, barren: 'kupferbarren' },
  { name: 'Eisen', farbe: '#e4ebf2', kosten: 2500, barren: 'eisenbarren' },
  { name: 'Gold', farbe: '#f2c94c', kosten: 5000, barren: 'goldbarren' },
  { name: 'Iridium', farbe: '#b77ee0', kosten: 25000, barren: 'iridiumbarren' },
];
/** Werkzeuge mit Stufen (Items mit `aufruestbar: true`, in Registrierungsreihenfolge). */
export const AUFRUESTBAR = [];
export const KANNE_INHALT = [40, 55, 70, 85, 100];

export const PUNKTE_PRO_HERZ = 250;
export const MAX_HERZEN = 10;
export const GESCHENK_PUNKTE = { liebt: 80, mag: 45, neutral: 20, magNicht: -20, hasst: -40 };

// ─── Hilfen ─────────────────────────────────────────────────────────────────

function eintragen(reg, id, wert, art, ersetzen) {
  if (id == null || id === '') throw new Error(`${art} ohne ID.`);
  if (Object.hasOwn(reg, id) && !ersetzen) throw new Error(`${art} „${id}" gibt es schon.`);
  reg[id] = wert;
  return wert;
}
function ohneErsetzen(def) {
  const { ersetzen, ...rest } = def;
  return [rest, !!ersetzen];
}
function inListe(liste, index, id, wert, art, ersetzen) {
  if (index.has(id)) {
    if (!ersetzen) throw new Error(`${art} „${id}" gibt es schon.`);
    liste[liste.findIndex((x) => x.id === id)] = wert;
  } else {
    index.add(id);
    liste.push(wert);
  }
  return wert;
}

// ─── Kategorien ─────────────────────────────────────────────────────────────

export const KATEGORIE_NAME = {};
export function kategorie(id, name, opt = {}) {
  return eintragen(KATEGORIE_NAME, id, name, 'Kategorie', opt.ersetzen);
}

// ─── Gegenstände ────────────────────────────────────────────────────────────

export const ITEMS = {};

/**
 * item(id, { name, kat, preis, bild, text|beschreibung, energie, gesundheit, buff, stapel,
 *            verkaufbar, aufstellbar, aufruestbar, werkzeug, waffe, ring, maschine, … })
 * Alte Form: item(id, name, kat, preis, bild, extra).
 * `energie` und `wert` dürfen Funktionen (slot) => Zahl sein (z. B. Marmelade aus Obst).
 */
export function item(id, def, kat, preis, bild, extra) {
  if (typeof def === 'string') def = { name: def, kat, preis, bild, ...extra };
  const [d, ersetzen] = ohneErsetzen(def);
  const it = { id, preis: 0, ...d };
  if (!it.name || !it.kat) throw new Error(`Gegenstand „${id}" braucht Name und Kategorie.`);
  it.text ??= it.beschreibung;
  if (it.text) it.beschreibung = it.text;
  it.stapel ??= it.kat !== 'werkzeug';
  it.verkaufbar ??= !['werkzeug', 'platz', 'besonders'].includes(it.kat);
  eintragen(ITEMS, id, it, 'Gegenstand', ersetzen);
  if (it.aufruestbar && !AUFRUESTBAR.includes(id)) AUFRUESTBAR.push(id);
  return it;
}

// ─── Pflanzen ───────────────────────────────────────────────────────────────

export const PFLANZEN = {};
export const SAAT_ZU_PFLANZE = {};

/**
 * pflanze(id, { saat, ernte, tage, nach|nachwachsen, jz: [...], menge, extra, wuchs, farbe,
 *               rankhilfe, riesig, … })
 */
export function pflanze(id, def) {
  const [d, ersetzen] = ohneErsetzen(def);
  const p = { id, saat: `${id}_saat`, ernte: id, nach: 0, menge: 1, extra: 0, ...d };
  if (d.nachwachsen != null) p.nach = d.nachwachsen;
  p.nachwachsen = p.nach;
  eintragen(PFLANZEN, id, p, 'Pflanze', ersetzen);
  SAAT_ZU_PFLANZE[p.saat] = id;
  return p;
}

// ─── Fische ─────────────────────────────────────────────────────────────────

export const FISCHE = [];
const FISCH_ID = new Set();

/**
 * fisch(id, { name, preis, bild, schwierigkeit, verhalten, orte: [Gewässerarten], jz, zeit, wetter })
 * Gewässerarten: teich, fluss, see, waldsee, meer, geheimteich, mine.
 */
export function fisch(id, def) {
  const [d, ersetzen] = ohneErsetzen(def);
  const { schwierigkeit, verhalten = 'gemischt', orte, jz, zeit = [600, 2600], wetter, ...rest } = d;
  const it = item(id, { kat: 'fisch', ...rest, fisch: { schwierigkeit, verhalten, orte, jz, zeit, wetter }, ersetzen });
  return inListe(FISCHE, FISCH_ID, id, it, 'Fisch', ersetzen);
}

/** Fang, der kein Fisch ist, je Gewässerart. */
export const MUELL = {};
export function muell(art, ids) {
  (MUELL[art] ??= []).push(...ids);
}

// ─── Rezepte ────────────────────────────────────────────────────────────────

export const REZEPTE = [];
const REZEPT_ID = new Set();

/** rezept(id, { art: 'basteln'|'kochen', zutaten, ergebnis = id, menge, stufe: [skill, n], frei(s) }) */
export function rezept(id, def) {
  const [d, ersetzen] = ohneErsetzen(def);
  return inListe(REZEPTE, REZEPT_ID, id, { id, art: 'basteln', ergebnis: id, zutaten: {}, ...d }, 'Rezept', ersetzen);
}

// ─── Läden ──────────────────────────────────────────────────────────────────

export const LAEDEN = {};

/**
 * laden(id, { name, npc, ort: { karte, punkt }, kauft: [Kategorien], ware: [...] | (s) => [...],
 *             zeiten: [von, bis], ruhetag: 'Mittwoch' })
 * Ware: { id, preis, bedingung } · { spezial: 'name', … } (siehe spezialWare).
 * Geöffnet ist, wenn die Person an der Theke steht (und es nicht Ruhetag ist).
 */
export function laden(id, def) {
  const [d, ersetzen] = ohneErsetzen(def);
  return eintragen(LAEDEN, id, { id, kauft: [], ware: [], ...d }, 'Laden', ersetzen);
}

export const SPEZIAL_WARE = {};

/**
 * spezialWare(id, { name, preis, text, zutaten, verfuegbar(s, ware), angebote(s, ware) → [ware…],
 *                   kaufen(s, { ware, n }) → { text } })
 * `angebote` ersetzt den Eintrag durch mehrere Waren (Saatgut der Jahreszeit, Upgrades …).
 */
export function spezialWare(id, def) {
  const [d, ersetzen] = ohneErsetzen(def);
  return eintragen(SPEZIAL_WARE, id, { id, ...d }, 'Spezialware', ersetzen);
}

// ─── Leute, Bündel, Briefe, Tipps ───────────────────────────────────────────

export const NPCS = {};

/**
 * npc(id, { name, voll, rolle, aussehen, geburtstag, liebt, mag, magNicht, hasst,
 *           heim: { karte, punkt }, plan: { normal: [[zeit, karte, punkt]…], regen }, zeilen, antwort, herzGeschenk })
 * Plan-Eintrag mit Karte null: zu Hause, nicht zu sehen. Zahlen-Form [zeit, karte, x, y] geht auch.
 */
export function npc(id, def) {
  const [d, ersetzen] = ohneErsetzen(def);
  return eintragen(NPCS, id, { id, ...d }, 'Dorfbewohner', ersetzen);
}

export const BUENDEL = [];
const BUENDEL_ID = new Set();
/** buendel(id, { name, raum, items: [id | { id, n }], noetig, belohnung: { id, n } | { gold } }) */
export function buendel(id, def) {
  const [d, ersetzen] = ohneErsetzen(def);
  return inListe(BUENDEL, BUENDEL_ID, id, { id, ...d }, 'Bündel', ersetzen);
}

export const BRIEFE = [];
const BRIEF_ID = new Set();
/**
 * brief(id, { von, text, tagNr | jz+tag (jährlich) | wann(s), start })
 * `start: true` ist der Brief zum Spielbeginn; er kommt nicht mit der Post.
 */
export function brief(id, def) {
  const [d, ersetzen] = ohneErsetzen(def);
  return inListe(BRIEFE, BRIEF_ID, id, { id, ...d }, 'Brief', ersetzen);
}

export const TIPPS = [];
export function tipp(text) {
  if (TIPPS.includes(text)) throw new Error(`Tipp doppelt: ${text}`);
  TIPPS.push(text);
}

// ─── Mechanik-Register ──────────────────────────────────────────────────────

export const OBJEKT_TYPEN = {};

/**
 * Objekte auf der Karte (welt.objekte[x,y].t):
 * objektTyp(t, { blockiert, axt(ctx), spitzhacke(ctx), sense(ctx), hacke(ctx), waffe(ctx),
 *                interagieren(ctx), einlegen(ctx), aufnehmen(ctx) → erg, nacht(ctx), minuten(ctx, n),
 *                hinweis(ctx) → Text, licht, anlegen(o, slot), nichtLeer(o) → Grund, item })
 * Werkzeug-Handler bekommen { s, ort, x, y, kk, o, erg, r, stufe, kraft } und geben true zurück,
 * wenn sie etwas getroffen haben.
 */
export function objektTyp(t, def) {
  const [d, ersetzen] = ohneErsetzen(def);
  return eintragen(OBJEKT_TYPEN, t, { t, ...d }, 'Objekttyp', ersetzen);
}

export const BEDINGUNGEN = {};
/** bedingung('mineOffen', (s) => !!s.flags.mineOffen) – für nurWenn, tuerWenn, Ware. */
export function bedingung(name, fn, opt = {}) {
  return eintragen(BEDINGUNGEN, name, fn, 'Bedingung', opt.ersetzen);
}

export const WERKZEUG_ARTEN = {};
/**
 * werkzeugArt(art, { skill, wiederholbar, aufladbar, dauer, schwungTon, upgradeText,
 *                    felder(zx, zy, blick, ladung) → [[x,y]…], wirkung(ctx) → erg, benutzen(ctx) })
 * Items verweisen mit `werkzeug: 'axt'` darauf. `benutzen` ersetzt den Schwung (Angel).
 */
export function werkzeugArt(art, def) {
  const [d, ersetzen] = ohneErsetzen(def);
  return eintragen(WERKZEUG_ARTEN, art, { art, dauer: 0.34, ...d }, 'Werkzeugart', ersetzen);
}

export const ITEM_BENUTZEN = [];
/** Gegenstand aus der Hand benutzen: der erste Handler, dessen pruefen(ctx) stimmt, läuft. */
export function itemBenutzen(pruefen, fn) {
  ITEM_BENUTZEN.push({ pruefen, fn });
}

// ─── Fertig-Phase ───────────────────────────────────────────────────────────

let geladen = false;
/** Einmal aufrufen, nachdem alle Bereiche geladen sind (macht bereiche/inhalt.js). */
export function fertig() {
  if (geladen) return;
  geladen = true;
  alle('fertig');
}
export const istFertig = () => geladen;
