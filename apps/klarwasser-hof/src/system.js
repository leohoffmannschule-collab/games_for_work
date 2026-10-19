// Hooks und Modifikatoren: Bereiche hängen sich hier an den Kern, ohne ihn zu ändern.
//
//   system({ name: 'tiere', neuesSpiel(s) {…}, tagEnde(s, bericht) {…} })
//   alle('tagEnde', s, bericht)        ruft jeden Hook dieses Namens
//   erster('interagieren', ctx)        erster Rückgabewert !== undefined
//   sammle('gebaeude', ort, s)         hängt die zurückgegebenen Listen aneinander
//   modifikator('energieKosten', (wert, k) => wert * 0.9)
//   mod('energieKosten', wert, k)      faltet alle Modifikatoren über den Wert
//
// Systeme laufen in der Reihenfolge, in der die Bereiche geladen werden
// (siehe bereiche/inhalt.js). Dort ist sie fest, damit Ergebnisse reproduzierbar bleiben.

/** Hooks, die der Kern aufruft. Neue Namen hier eintragen, sonst schlägt der Test an. */
export const BEKANNTE_HOOKS = [
  'neuesSpiel', 'ergaenzen', 'tagEnde', 'morgen', 'minuten', 'fertig',
  'karteBetreten', 'karteVerlassen', 'update',
  'interagieren', 'hinweis', 'schwung',
  'npcAnsprechen', 'npcOptionen', 'npcPlan', 'gespraech', 'gegessen',
  'gebaeude', 'deko', 'objekteDynamisch',
];

/** Modifikatoren, an die der Kern seine Rechnungen hängt. */
export const BEKANNTE_MODIFIKATOREN = [
  'energieKosten', 'laufTempo', 'verkaufspreis', 'xp', 'ernteQualitaet', 'wachstum',
  'fangBalken', 'bissZeit', 'schaden', 'verteidigung', 'maxEnergie', 'maxGesundheit',
  'glueck', 'erzMenge',
];

export const SYSTEME = [];
const MODIFIKATOREN = {};

export function system(def) {
  if (!def?.name) throw new Error('Ein System braucht einen Namen.');
  if (SYSTEME.some((x) => x.name === def.name)) throw new Error(`System „${def.name}" gibt es schon.`);
  SYSTEME.push(def);
  return def;
}

export function alle(name, ...args) {
  for (const sy of SYSTEME) sy[name]?.(...args);
}

export function erster(name, ...args) {
  for (const sy of SYSTEME) {
    const r = sy[name]?.(...args);
    if (r !== undefined) return r;
  }
  return undefined;
}

export function sammle(name, ...args) {
  const liste = [];
  for (const sy of SYSTEME) {
    const r = sy[name]?.(...args);
    if (r) liste.push(...r);
  }
  return liste;
}

export function modifikator(name, fn) {
  (MODIFIKATOREN[name] ??= []).push(fn);
}

export function mod(name, wert, kontext = {}) {
  const liste = MODIFIKATOREN[name];
  if (!liste) return wert;
  for (const fn of liste) wert = fn(wert, kontext);
  return wert;
}

export const modifikatorenVon = (name) => MODIFIKATOREN[name] || [];
