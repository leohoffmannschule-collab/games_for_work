// Spieldaten: Gegenstände, Pflanzen, Fische, Rezepte, Läden, Dorfbewohner, Bündel.
// Reine Beschreibung ohne DOM-Zugriff, damit die Tests alles direkt laden können.

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
];

export const WERKZEUG_STUFEN = [
  { name: 'Basis', farbe: '#a3abb5' },
  { name: 'Kupfer', farbe: '#d98a4e', kosten: 1000, barren: 'kupferbarren' },
  { name: 'Eisen', farbe: '#e4ebf2', kosten: 2500, barren: 'eisenbarren' },
  { name: 'Gold', farbe: '#f2c94c', kosten: 5000, barren: 'goldbarren' },
];
export const AUFRUESTBAR = ['hacke', 'giesskanne', 'axt', 'spitzhacke'];
export const KANNE_INHALT = [40, 55, 70, 85];

// ─── Gegenstände ────────────────────────────────────────────────────────────

export const ITEMS = {};
function item(id, name, kat, preis, bild, extra = {}) {
  ITEMS[id] = { id, name, kat, preis, bild, ...extra };
}

item('hacke', 'Hacke', 'werkzeug', 0, { art: 'hacke' }, { text: 'Lockert Gras zu einem Beet. Ab Kupfer gedrückt halten für mehr Fläche.' });
item('giesskanne', 'Gießkanne', 'werkzeug', 0, { art: 'giesskanne' }, { text: 'Gießt Beete. An Teich, Fluss oder Meer wieder füllen.' });
item('axt', 'Axt', 'werkzeug', 0, { art: 'axt' }, { text: 'Fällt Bäume und zerhackt Äste und Stümpfe.' });
item('spitzhacke', 'Spitzhacke', 'werkzeug', 0, { art: 'spitzhacke' }, { text: 'Zerschlägt Steine und Erz. Entfernt auch Beete und aufgestellte Dinge.' });
item('sense', 'Sense', 'werkzeug', 0, { art: 'sense' }, { text: 'Mäht Unkraut und verwelkte Pflanzen in einem Bogen.' });
item('angel', 'Bambusangel', 'werkzeug', 0, { art: 'angel' }, { text: 'Gedrückt halten zum Auswerfen. Wenn es zuckt: sofort ziehen!' });
item('schwert', 'Rostiges Schwert', 'werkzeug', 0, { art: 'schwert' }, { text: 'Alt, aber scharf genug für Schleime.' });

// Pflanzen: id, Ernte, Saat, Kaufpreis, Wachstumstage, Nachwuchs, Jahreszeiten, Verkauf, Menge, Wuchsform, Bild, Extra
export const PFLANZEN = {};
const PFL = [
  ['pastinake', 'Pastinake', 'Pastinakensamen', 20, 4, 0, ['fruehling'], 35, 1, 'wurzel', { art: 'wurzel', f: '#efe0a0', f2: '#6aa84f' }, { energie: 25 }],
  ['bohne', 'Grüne Bohne', 'Bohnenkerne', 60, 10, 3, ['fruehling'], 40, 1, 'rank', { art: 'schote', f: '#5fae3c' }, { energie: 25 }],
  ['blumenkohl', 'Blumenkohl', 'Blumenkohlsamen', 80, 12, 0, ['fruehling'], 175, 1, 'kohl', { art: 'blumenkohl', f: '#f4f0e0', f2: '#5c9a45' }, { energie: 75 }],
  ['kartoffel', 'Kartoffel', 'Saatkartoffeln', 50, 6, 0, ['fruehling'], 80, 1, 'knolle', { art: 'knolle', f: '#c99a5b' }, { energie: 25, extra: 0.25 }],
  ['gruenkohl', 'Grünkohl', 'Grünkohlsamen', 70, 6, 0, ['fruehling'], 110, 1, 'kohl', { art: 'blattkohl', f: '#3f8a4a' }, { energie: 50 }],
  ['tulpe', 'Tulpe', 'Tulpenzwiebeln', 20, 6, 0, ['fruehling'], 30, 1, 'blume', { art: 'tulpe', f: '#e0475b' }, { energie: 18 }],
  ['melone', 'Melone', 'Melonensamen', 80, 12, 0, ['sommer'], 250, 1, 'gross', { art: 'melone', f: '#6fb648', f2: '#e8506a' }, { energie: 113, frucht: true }],
  ['tomate', 'Tomate', 'Tomatensamen', 50, 11, 4, ['sommer'], 60, 1, 'rank', { art: 'tomate', f: '#e2412f' }, { energie: 20 }],
  ['blaubeere', 'Blaubeere', 'Blaubeersamen', 80, 13, 4, ['sommer'], 50, 3, 'busch', { art: 'beeren', f: '#4a63c9' }, { energie: 25, frucht: true }],
  ['peperoni', 'Peperoni', 'Peperonisamen', 40, 5, 3, ['sommer'], 40, 1, 'busch', { art: 'peperoni', f: '#d8342a' }, { energie: 13, frucht: true }],
  ['radieschen', 'Radieschen', 'Radieschensamen', 40, 6, 0, ['sommer'], 90, 1, 'wurzel', { art: 'rundwurzel', f: '#e04a72', f2: '#6aa84f' }, { energie: 45 }],
  ['mais', 'Mais', 'Maiskörner', 150, 14, 4, ['sommer', 'herbst'], 50, 1, 'hoch', { art: 'kolben', f: '#f2cf45' }, { energie: 25 }],
  ['weizen', 'Weizen', 'Weizensamen', 10, 4, 0, ['sommer', 'herbst'], 25, 1, 'aehre', { art: 'aehre', f: '#d9b45a' }, {}],
  ['kuerbis', 'Kürbis', 'Kürbiskerne', 100, 13, 0, ['herbst'], 320, 1, 'gross', { art: 'kuerbis', f: '#e5872a' }, {}],
  ['aubergine', 'Aubergine', 'Auberginensamen', 20, 5, 5, ['herbst'], 60, 1, 'busch', { art: 'aubergine', f: '#6b3a8f' }, { energie: 20 }],
  ['preiselbeere', 'Preiselbeere', 'Preiselbeersamen', 240, 7, 5, ['herbst'], 75, 2, 'busch', { art: 'beeren', f: '#c2283f' }, { energie: 38, frucht: true }],
  ['rotebete', 'Rote Bete', 'Rote-Bete-Samen', 30, 6, 0, ['herbst'], 70, 1, 'wurzel', { art: 'rundwurzel', f: '#8e2a4a', f2: '#5c9a45' }, { energie: 30 }],
  ['pakchoi', 'Pak Choi', 'Pak-Choi-Samen', 50, 4, 0, ['herbst'], 80, 1, 'kohl', { art: 'pakchoi', f: '#8fcf6a', f2: '#eef5dc' }, { energie: 25 }],
];
for (const [id, name, saatName, kauf, tage, nach, jz, preis, menge, wuchs, bild, extra] of PFL) {
  const saat = `${id}_saat`;
  PFLANZEN[id] = { id, saat, ernte: id, tage, nach, jz, menge, wuchs, extra: extra.extra || 0, farbe: bild.f };
  item(id, name, 'ernte', preis, bild, {
    energie: extra.energie, frucht: !!extra.frucht, gemuese: !extra.frucht,
    text: `${jz.map((j) => JZ_NAME[j]).join(' & ')}-Ernte.`,
  });
  item(saat, saatName, 'saat', Math.floor(kauf / 2), { art: 'saat', f: bild.f }, {
    kauf, pflanze: id,
    text: `${JZ_NAME[jz[0]]}${jz[1] ? ' & ' + JZ_NAME[jz[1]] : ''}. Reift in ${tage} Tagen${nach ? `, trägt danach alle ${nach} Tage` : ''}.`,
  });
}
export const SAAT_ZU_PFLANZE = Object.fromEntries(Object.values(PFLANZEN).map((p) => [p.saat, p.id]));

// Sammelfunde
function sammel(id, name, preis, bild, extra = {}) { item(id, name, 'sammel', preis, bild, extra); }
sammel('meerrettich', 'Wilder Meerrettich', 50, { art: 'wurzel', f: '#e6dcc2', f2: '#7ba05b' }, { energie: 13, jz: ['fruehling'], gemuese: true });
sammel('narzisse', 'Narzisse', 30, { art: 'bluete', f: '#f5d83a', f2: '#fbf3c4' }, { jz: ['fruehling'] });
sammel('lauch', 'Lauch', 60, { art: 'lauch' }, { energie: 40, jz: ['fruehling'], gemuese: true });
sammel('loewenzahn', 'Löwenzahn', 40, { art: 'bluete', f: '#f2c12e', f2: '#f7d64a' }, { energie: 25, jz: ['fruehling'] });
sammel('gewuerzbeere', 'Gewürzbeere', 80, { art: 'beeren', f: '#d8402e' }, { energie: 63, jz: ['sommer'], frucht: true });
sammel('wildtraube', 'Wildtraube', 80, { art: 'traube', f: '#7b4fae' }, { energie: 38, jz: ['sommer'], frucht: true });
sammel('platterbse', 'Platterbse', 50, { art: 'bluete', f: '#e58fc8', f2: '#f7d0ea' }, { jz: ['sommer'] });
sammel('brombeere', 'Brombeere', 20, { art: 'beeren', f: '#3b2a4f' }, { energie: 25, jz: ['herbst'], frucht: true });
sammel('haselnuss', 'Haselnuss', 90, { art: 'nuss', f: '#a8743f' }, { energie: 30, jz: ['herbst'] });
sammel('pilz', 'Wiesenchampignon', 40, { art: 'pilz', f: '#eadfce' }, { energie: 38, jz: ['herbst'] });
sammel('pfifferling', 'Pfifferling', 160, { art: 'pilz', f: '#e8a13a' }, { energie: 75, jz: ['herbst'] });
sammel('wildpflaume', 'Wilde Pflaume', 80, { art: 'pflaume', f: '#6b3d8f' }, { energie: 25, jz: ['herbst'], frucht: true });
sammel('winterwurzel', 'Winterwurzel', 70, { art: 'knolle', f: '#a8865a' }, { energie: 25, jz: ['winter'], gemuese: true });
sammel('kristallfrucht', 'Kristallfrucht', 150, { art: 'kristall', f: '#9fe0f0' }, { energie: 63, jz: ['winter'], frucht: true });
sammel('krokus', 'Krokus', 60, { art: 'tulpe', f: '#a77ad8' }, { jz: ['winter'] });
sammel('stechpalme', 'Stechpalme', 80, { art: 'stechpalme' }, { jz: ['winter'] });
sammel('muschel', 'Venusmuschel', 50, { art: 'muschel', f: '#d8c8b0' }, { strand: true });
sammel('herzmuschel', 'Herzmuschel', 50, { art: 'herzmuschel', f: '#e8b8a0' }, { strand: true });
sammel('koralle', 'Koralle', 80, { art: 'koralle', f: '#f07a6a' }, { strand: true });
sammel('seeigel', 'Seeigel', 160, { art: 'seeigel', f: '#6a3a7a' }, { strand: true, selten: true });
sammel('nautilus', 'Nautilusschale', 120, { art: 'nautilus', f: '#f0e0d0', f2: '#c06a40' }, { strand: true, jz: ['winter'] });

// Rohstoffe, Erze, Barren, Mineralien
item('holz', 'Holz', 'ressource', 2, { art: 'holz' }, { text: 'Zum Basteln und Bauen.' });
item('hartholz', 'Hartholz', 'ressource', 15, { art: 'hartholz' }, { text: 'Aus großen Baumstümpfen. Sehr fest.' });
item('stein', 'Stein', 'ressource', 2, { art: 'stein' }, { text: 'Zum Basteln und Bauen.' });
item('faser', 'Faser', 'ressource', 1, { art: 'faser' }, { text: 'Zähe Halme aus Unkraut.' });
item('saft', 'Baumharz', 'ressource', 2, { art: 'saft' }, { text: 'Klebriger Saft aus gefällten Bäumen.' });
item('kohle', 'Kohle', 'ressource', 15, { art: 'kohle' }, { text: 'Brennt heiß. Nötig für Barren.' });
item('kupfererz', 'Kupfererz', 'erz', 5, { art: 'erz', f: '#d98a4e' }, { text: 'Fünf Erz und eine Kohle ergeben einen Barren.' });
item('eisenerz', 'Eisenerz', 'erz', 10, { art: 'erz', f: '#dfe6ee' }, { text: 'Fünf Erz und eine Kohle ergeben einen Barren.' });
item('golderz', 'Golderz', 'erz', 25, { art: 'erz', f: '#f2c94c' }, { text: 'Fünf Erz und eine Kohle ergeben einen Barren.' });
item('kupferbarren', 'Kupferbarren', 'barren', 60, { art: 'barren', f: '#d98a4e' }, { text: 'Bruno macht daraus bessere Werkzeuge.' });
item('eisenbarren', 'Eisenbarren', 'barren', 120, { art: 'barren', f: '#cfd7df' }, { text: 'Bruno macht daraus bessere Werkzeuge.' });
item('goldbarren', 'Goldbarren', 'barren', 250, { art: 'barren', f: '#f2c94c' }, { text: 'Bruno macht daraus die besten Werkzeuge.' });
item('quarz', 'Quarz', 'mineral', 25, { art: 'kristall', f: '#eef2f6' }, { text: 'Klar wie Klarwasser.' });
item('erdkristall', 'Erdkristall', 'mineral', 50, { art: 'kristall', f: '#c9a45c' }, { text: 'Riecht nach Regen.' });
item('traene', 'Gefrorene Träne', 'mineral', 75, { art: 'traene', f: '#a8e0ff' }, { text: 'Kalt, selbst in der Hand.' });
item('amethyst', 'Amethyst', 'mineral', 100, { art: 'edelstein', f: '#a46ad8' }, { text: 'Violett und vielflächig.' });
item('topas', 'Topas', 'mineral', 80, { art: 'edelstein', f: '#f2b23a' }, { text: 'Funkelt wie Honig.' });
item('smaragd', 'Smaragd', 'mineral', 250, { art: 'edelstein', f: '#3ac77a' }, { text: 'Tiefes Grün.' });
item('rubin', 'Rubin', 'mineral', 250, { art: 'edelstein', f: '#e0344a' }, { text: 'Glüht im Dunkeln. Fast.' });
item('diamant', 'Diamant', 'mineral', 750, { art: 'edelstein', f: '#e6f8ff' }, { text: 'Selten und begehrt.' });
item('schleim', 'Schleim', 'ressource', 5, { art: 'schleim', f: '#6fc94a' }, { text: 'Klebt. Riecht. Wird trotzdem gekauft.' });
item('fluegel', 'Fledermausflügel', 'ressource', 15, { art: 'fluegel' }, { text: 'Ledrig und leicht.' });

// Fang, der kein Fisch ist
item('treibholz', 'Treibholz', 'muell', 1, { art: 'treibholz' }, { text: 'Vom Meer glattgeschliffen.' });
item('seetang', 'Seetang', 'muell', 20, { art: 'seetang' }, { text: 'Glitschig.' });
item('stiefel', 'Alter Stiefel', 'muell', 0, { art: 'stiefel' }, { text: 'Der andere ist sicher auch irgendwo da unten.' });

// Handwerkswaren und Tierprodukte
item('marmelade', 'Marmelade', 'artisan', 0, { art: 'glas', f: '#c2283f' }, { energie: 0, text: 'Aus dem Einmachglas. Doppelter Fruchtwert plus 50.' });
item('eingelegt', 'Eingelegtes', 'artisan', 0, { art: 'glas2', f: '#6aa84f' }, { energie: 0, text: 'Aus dem Einmachglas. Doppelter Gemüsewert plus 50.' });
item('ei', 'Ei', 'tier', 50, { art: 'ei', f: '#f4ede0' }, { energie: 25, text: 'Frisch aus dem Hühnerstall.' });
item('grossesei', 'Großes Ei', 'tier', 95, { art: 'ei', f: '#f8f1e4', gross: true }, { energie: 38, text: 'Von einer sehr glücklichen Henne.' });

// Gekochtes aus dem Gasthaus
item('brot', 'Brot', 'essen', 60, { art: 'brot' }, { energie: 50, text: 'Knusprige Kruste.' });
item('salat', 'Salat', 'essen', 110, { art: 'salat' }, { energie: 113, text: 'Frisch und knackig.' });
item('kaffee', 'Kaffee', 'essen', 150, { art: 'kaffee' }, { energie: 3, tempo: 120, text: 'Zwei Stunden lang flinke Füße.' });
item('fischsuppe', 'Fischsuppe', 'essen', 125, { art: 'suppe' }, { energie: 150, text: 'Nach Lenes Rezept. Mit Butter.' });

// Aufstellbares und Hilfsmittel
item('truhe', 'Truhe', 'platz', 0, { art: 'truhe' }, { text: 'Bewahrt 24 Stapel auf. Leer mit der Axt wieder einsammeln.' });
item('vogelscheuche', 'Vogelscheuche', 'platz', 0, { art: 'vogelscheuche' }, { text: 'Hält Krähen in 8 Feldern Umkreis fern.' });
item('sprenger', 'Sprenger', 'platz', 0, { art: 'sprenger' }, { text: 'Gießt jeden Morgen die vier angrenzenden Beete.' });
item('qsprenger', 'Qualitätssprenger', 'platz', 0, { art: 'qsprenger' }, { text: 'Gießt jeden Morgen alle acht Beete rundherum.' });
item('einmachglas', 'Einmachglas', 'platz', 0, { art: 'einmachglas' }, { text: 'Macht über Nacht aus Obst Marmelade und aus Gemüse Eingelegtes.' });
item('duenger', 'Dünger', 'duenger', 5, { art: 'sack', f: '#8a6a4a' }, { text: 'Vor der Aussaat aufs Beet streuen. Bessere Ernte-Qualität.' });
item('koeder', 'Köder', 'koeder', 1, { art: 'koeder' }, { text: 'Liegt er im Rucksack, beißen Fische doppelt so schnell.' });
item('medaille', 'Klarwasser-Medaille', 'besonders', 0, { art: 'medaille' }, { text: 'Für die Rettung der alten Mühle. Von ganz Klarwasser.' });

// Fische: Preis, Schwierigkeit, Verhalten, Orte, Jahreszeiten, Uhrzeit, Wetter
const ALLE = [...JZ];
function fisch(id, name, preis, daten, bild) {
  item(id, name, 'fisch', preis, { art: 'fisch', ...bild }, { fisch: daten });
}
fisch('karpfen', 'Karpfen', 30, { d: 15, v: 'ruhig', o: ['teich', 'fluss'], jz: ALLE, z: [600, 2600] }, { f: '#a89a5a', f2: '#e0d8a0' });
fisch('sonnenbarsch', 'Sonnenbarsch', 30, { d: 30, v: 'gemischt', o: ['fluss', 'teich'], jz: ['fruehling', 'sommer'], z: [600, 1900], w: 'sonne' }, { f: '#e8b83a', f2: '#7ac0d8', form: 'hoch' });
fisch('wels', 'Wels', 200, { d: 75, v: 'gemischt', o: ['fluss', 'teich'], jz: ['fruehling', 'herbst'], z: [600, 2400], w: 'regen' }, { f: '#6a6a5a', f2: '#c8c0a0', form: 'wels' });
fisch('doebel', 'Döbel', 50, { d: 35, v: 'flink', o: ['fluss', 'teich'], jz: ALLE, z: [600, 2600] }, { f: '#8aa0a8', f2: '#e0e8e8' });
fisch('forelle', 'Regenbogenforelle', 65, { d: 45, v: 'gemischt', o: ['fluss'], jz: ['sommer'], z: [600, 1900], w: 'sonne' }, { f: '#8ab06a', f2: '#e88aa0' });
fisch('lachs', 'Lachs', 75, { d: 50, v: 'gemischt', o: ['fluss'], jz: ['herbst'], z: [600, 1900] }, { f: '#c86a5a', f2: '#f0b8a0' });
fisch('hecht', 'Hecht', 100, { d: 60, v: 'flink', o: ['fluss', 'teich'], jz: ['sommer', 'winter'], z: [600, 2600] }, { f: '#6a8a4a', f2: '#d8e0a0', form: 'lang' });
fisch('zander', 'Zander', 105, { d: 45, v: 'ruhig', o: ['fluss', 'teich'], jz: ['herbst', 'winter'], z: [1200, 2600], w: 'regen' }, { f: '#a8a070', f2: '#e8e0c0', form: 'lang' });
fisch('barsch', 'Flussbarsch', 55, { d: 35, v: 'flink', o: ['fluss', 'teich'], jz: ['winter'], z: [600, 2600] }, { f: '#8ab04a', f2: '#e8a050', form: 'hoch' });
fisch('brasse', 'Brasse', 45, { d: 35, v: 'ruhig', o: ['fluss'], jz: ALLE, z: [1800, 2600] }, { f: '#a8a8a0', f2: '#e0e0d8', form: 'hoch' });
fisch('sardine', 'Sardine', 40, { d: 30, v: 'flink', o: ['meer'], jz: ['fruehling', 'herbst', 'winter'], z: [600, 1900] }, { f: '#7aa8c8', f2: '#e8f0f8', form: 'klein' });
fisch('hering', 'Hering', 30, { d: 25, v: 'flink', o: ['meer'], jz: ALLE, z: [600, 2600] }, { f: '#6a8ab0', f2: '#d8e0f0', form: 'klein' });
fisch('heilbutt', 'Heilbutt', 80, { d: 50, v: 'sinker', o: ['meer'], jz: ['fruehling', 'sommer', 'winter'], z: [600, 2600] }, { f: '#9a8a6a', f2: '#e8e0d0', form: 'flach' });
fisch('thunfisch', 'Thunfisch', 100, { d: 70, v: 'gemischt', o: ['meer'], jz: ['sommer', 'winter'], z: [600, 1900] }, { f: '#3a5a8a', f2: '#c8d8e8' });
fisch('rotbarbe', 'Rotbarbe', 75, { d: 55, v: 'ruhig', o: ['meer'], jz: ['sommer', 'winter'], z: [600, 1900] }, { f: '#e0605a', f2: '#f8d0c0' });
fisch('aal', 'Aal', 85, { d: 70, v: 'ruhig', o: ['meer'], jz: ['fruehling', 'herbst'], z: [1600, 2600], w: 'regen' }, { f: '#4a5a3a', f2: '#a8b080', form: 'aal' });
fisch('tintenfisch', 'Tintenfisch', 80, { d: 75, v: 'sinker', o: ['meer'], jz: ['winter'], z: [1800, 2600] }, { f: '#e8a0b0', f2: '#f8d8e0', form: 'tinte' });
fisch('kugelfisch', 'Kugelfisch', 200, { d: 80, v: 'flink', o: ['meer'], jz: ['sommer'], z: [1200, 1600], w: 'sonne' }, { f: '#e8d06a', f2: '#f8f0d0', form: 'kugel' });

export const FISCHE = Object.values(ITEMS).filter((i) => i.kat === 'fisch');
export const MUELL = { teich: ['stiefel', 'treibholz'], fluss: ['stiefel', 'treibholz'], meer: ['seetang', 'treibholz', 'stiefel'] };

export const KATEGORIE_NAME = {
  werkzeug: 'Werkzeug', saat: 'Saatgut', ernte: 'Ernte', sammel: 'Sammelfund', fisch: 'Fisch',
  mineral: 'Mineral', erz: 'Erz', barren: 'Barren', ressource: 'Rohstoff', artisan: 'Handwerksware',
  tier: 'Tierprodukt', essen: 'Essen', platz: 'Aufstellbar', duenger: 'Dünger', koeder: 'Köder',
  muell: 'Fundstück', besonders: 'Besonderes',
};

// ─── Basteln ────────────────────────────────────────────────────────────────

export const REZEPTE = [
  { id: 'truhe', zutaten: { holz: 50 } },
  { id: 'kupferbarren', zutaten: { kupfererz: 5, kohle: 1 } },
  { id: 'eisenbarren', zutaten: { eisenerz: 5, kohle: 1 } },
  { id: 'goldbarren', zutaten: { golderz: 5, kohle: 1 } },
  { id: 'duenger', menge: 2, zutaten: { saft: 2 }, stufe: ['landwirtschaft', 1] },
  { id: 'vogelscheuche', zutaten: { holz: 50, kohle: 1, faser: 20 }, stufe: ['landwirtschaft', 1] },
  { id: 'sprenger', zutaten: { kupferbarren: 1, eisenbarren: 1 }, stufe: ['landwirtschaft', 2] },
  { id: 'koeder', menge: 5, zutaten: { faser: 3, schleim: 1 }, stufe: ['angeln', 2] },
  { id: 'einmachglas', zutaten: { holz: 50, stein: 40, kohle: 8 }, stufe: ['landwirtschaft', 4] },
  { id: 'qsprenger', zutaten: { eisenbarren: 1, goldbarren: 1, quarz: 1 }, stufe: ['landwirtschaft', 6] },
];

// ─── Läden ──────────────────────────────────────────────────────────────────
// bedingung: stall (Stall steht) · keinStall · keineAngel · rucksack (noch klein)

export const LAEDEN = {
  laden: {
    name: 'Krämerladen', npc: 'ottilie', ort: { karte: 'laden', x: 3, y: 3 },
    kauft: ['ernte', 'sammel', 'artisan', 'tier'],
    ware: [
      { saatgut: true },
      { id: 'duenger', preis: 100 },
      { spezial: 'kueken', name: 'Küken', preis: 800, bedingung: 'stall', text: 'Zieht sofort in deinen Hühnerstall. Legt jeden Morgen ein Ei.' },
      { spezial: 'rucksack', name: 'Großer Rucksack', preis: 2000, bedingung: 'rucksack', text: '36 statt 24 Plätze.' },
    ],
  },
  schmiede: {
    name: 'Schmiede', npc: 'bruno', ort: { karte: 'dorf', x: 7, y: 24 },
    kauft: ['erz', 'barren', 'mineral'],
    ware: [
      { id: 'kohle', preis: 60 },
      { id: 'kupfererz', preis: 75 },
      { id: 'eisenerz', preis: 150 },
      { id: 'golderz', preis: 400 },
      { spezial: 'upgrade' },
      { spezial: 'stall', name: 'Hühnerstall', preis: 3000, zutaten: { holz: 150, stein: 50 }, bedingung: 'keinStall', text: 'Bruno baut ihn über Nacht neben dein Haus. Danach gibt es bei Ottilie Küken.' },
    ],
  },
  fischer: {
    name: 'Lenes Fischstand', npc: 'lene', ort: { karte: 'strand', x: 27, y: 10 },
    kauft: ['fisch', 'muell'],
    ware: [
      { id: 'koeder', preis: 5 },
      { id: 'angel', preis: 500, bedingung: 'keineAngel' },
    ],
  },
  gasthaus: {
    name: 'Gasthaus „Zum Krug"', npc: 'hannes', ort: { karte: 'gasthaus', x: 11, y: 3 },
    kauft: ['fisch', 'ernte'],
    ware: [
      { id: 'brot', preis: 120 },
      { id: 'salat', preis: 220 },
      { id: 'kaffee', preis: 300 },
      { id: 'fischsuppe', preis: 250 },
    ],
  },
};

// ─── Dorfbewohner ───────────────────────────────────────────────────────────
// plan: [Uhrzeit, Karte, x, y] — Karte null heißt: zu Hause, nicht zu sehen.

export const NPCS = {
  ottilie: {
    name: 'Ottilie', voll: 'Ottilie Krämer', rolle: 'Ladenbesitzerin',
    aussehen: { haut: '#f1c7a0', haare: '#a6a6ae', frisur: 'dutt', hemd: '#7a5aa0', hose: '#4a3a5a', schuerze: '#ece4d4', brille: true },
    geburtstag: { jz: 'fruehling', tag: 12 },
    liebt: ['blumenkohl', 'kuerbis', 'marmelade', 'tulpe'],
    mag: ['kat:ernte', 'kat:sammel', 'brot'], magNicht: ['kat:ressource', 'kat:erz'], hasst: ['schleim', 'stiefel', 'fluegel'],
    plan: {
      normal: [[600, null], [800, 'dorf', 12, 10], [850, 'laden', 3, 3], [1700, 'dorf', 19, 13], [1900, 'gasthaus', 4, 5], [2200, null]],
      regen: [[600, null], [850, 'laden', 3, 3], [1700, 'gasthaus', 4, 5], [2200, null]],
    },
    zeilen: {
      allgemein: [
        'Frisches Saatgut gibt’s bei mir, {name}. Wer früh sät, erntet früh – sagt meine Mutter. Die hat nie etwas gesät.',
        'Du hast den Hof deiner Großmutter übernommen? Sie hat mir jedes Jahr die ersten Pastinaken gebracht.',
        'Der Laden hat von neun bis fünf offen. Danach zähle ich Knöpfe. Das beruhigt.',
        'Wenn du etwas verkaufen willst und nicht bis morgen warten magst: bring’s einfach vorbei.',
        'Bruno sagt, er braucht keine Hilfe. Bruno sagt auch, er mag keinen Kuchen. Bruno lügt.',
        'Die Versandkiste wird jede Nacht geleert. Ich weiß nicht, wer das macht. Ich frage auch nicht.',
        'Qualität lohnt sich! Ein Blumenkohl mit Goldstern bringt anderthalbmal so viel.',
      ],
      fruehling: ['Im Frühling gehen die Pastinakensamen am besten. Leicht zu ziehen, schnell geerntet.', 'Blumenkohl braucht zwölf Tage. Wer am ersten Frühlingstag sät, kann zweimal ernten.'],
      sommer: ['Melonen! Im Sommer dreht sich bei mir alles um Melonen.', 'Blaubeeren wachsen immer wieder nach. Einmal säen, den ganzen Sommer pflücken.'],
      herbst: ['Kürbisse sind das Gold des Herbstes. Glaub mir, ich habe beides im Laden.', 'Der Herbst ist kurz. Schau, dass du vor dem Winter alles abgeerntet hast.'],
      winter: ['Im Winter wächst draußen nichts. Zeit für die Mine – oder zum Sockenstricken.', 'Kalt heute, was? Ich hab extra den Ofen angeworfen.'],
      regen: ['Regen! Heute musst du nicht gießen. Ich wünschte, Regen würde auch Regale abstauben.'],
      herz: {
        2: 'Weißt du, du erinnerst mich an deine Großmutter. Sie hatte auch immer zu viel Erde unter den Fingernägeln.',
        4: 'Ich habe dir eine Tüte von meinem guten Dünger zurückgelegt. Nicht weitersagen – sonst wollen das alle.',
        6: 'Früher wollte ich ans Meer ziehen. Dann kam der Laden. Jetzt kommt das Meer eben zu mir – in Form von Lene.',
        8: 'Wenn du mal Hilfe auf dem Hof brauchst: Hacken kann ich nicht, aber ich kann ausgezeichnet zusehen.',
        10: 'Du gehörst jetzt zu Klarwasser, {name}. Ganz offiziell. Ich habe es in mein Kassenbuch geschrieben.',
      },
      geburtstag: 'Du weißt, dass ich heute Geburtstag habe? Ach, wie lieb von dir!',
      wieder: ['Bis später, {name}!', 'Ich muss die Regale sortieren.'],
    },
    antwort: {
      liebt: 'Oh! Das ist ja wunderbar! Woher wusstest du das?',
      mag: 'Wie nett von dir. Danke!',
      neutral: 'Danke, {name}.',
      magNicht: 'Hm. Na ja. Der Gedanke zählt.',
      hasst: 'Was soll ich denn damit? Bitte nimm das wieder mit.',
    },
    herzGeschenk: { 4: { id: 'duenger', n: 10 } },
  },
  bruno: {
    name: 'Bruno', voll: 'Bruno Amboss', rolle: 'Schmied',
    aussehen: { haut: '#d8a070', haare: '#3a2a20', frisur: 'kurz', hemd: '#4a6a8a', hose: '#3a3a40', schuerze: '#7a4a2a', bart: '#3a2a20' },
    geburtstag: { jz: 'sommer', tag: 3 },
    liebt: ['diamant', 'rubin', 'smaragd', 'goldbarren'],
    mag: ['kat:mineral', 'kat:barren', 'kat:erz', 'kohle', 'kaffee'], magNicht: ['kat:ernte'], hasst: ['tulpe', 'narzisse', 'krokus', 'platterbse', 'loewenzahn'],
    plan: {
      normal: [[600, null], [800, 'dorf', 7, 24], [1600, 'dorf', 34, 19], [1800, 'gasthaus', 10, 5], [2300, null]],
    },
    zeilen: {
      allgemein: [
        'Hmpf. Werkzeug stumpf? Bring Barren und Gold, dann mach ich was Ordentliches draus.',
        'Erz allein ist nichts wert. Fünf Erz, ein Stück Kohle – dann hast du einen Barren.',
        'Die alte Mine nördlich von deinem Hof ist tiefer, als die meisten glauben. Pass auf die Schleime auf.',
        'Ich rede nicht viel. Das Eisen redet genug.',
        'Eine Kupferhacke lockert drei Felder auf einmal. Halt sie gedrückt, dann merkst du’s.',
        'Ottilie bringt mir manchmal Kuchen. Ich esse ihn nicht. Meistens.',
        'Wer einen Hühnerstall will, kommt zu mir. Holz und Stein mitbringen.',
      ],
      fruehling: ['Frühling. Alle wollen Hacken. Keiner will Geduld.'],
      sommer: ['Im Sommer ist es an der Esse kaum auszuhalten. Ich halt’s trotzdem aus.'],
      herbst: ['Herbst ist gut. Kühle Luft, warmes Feuer.'],
      winter: ['Im Winter ist die Mine dein bester Freund. Da unten wächst kein Unkraut.'],
      regen: ['Regen auf dem Amboss klingt wie Musik. Nur nasser.'],
      herz: {
        2: 'Du kommst oft vorbei. Gut. Ich… hab nichts dagegen.',
        4: 'Mein Vater war auch Schmied. Er sagte: Ein Werkzeug ist ein Versprechen. Ich hab nie verstanden, an wen.',
        6: 'Ich hab mal versucht, ein Gedicht zu schreiben. Es hat sich auf „Amboss" gereimt. Das war das Problem.',
        8: 'Wenn du in der Mine nicht weiterkommst, sag Bescheid. Ich hab einen Hammer, der Felsen das Fürchten lehrt.',
        10: 'Du bist in Ordnung, {name}. Mehr als in Ordnung. Sag’s keinem.',
      },
      geburtstag: 'Geburtstag. Ja. Hmpf. Danke, dass du dran gedacht hast.',
      wieder: ['Hmpf.', 'Ich hab zu tun.'],
    },
    antwort: {
      liebt: '…Das ist großartig. Wirklich. Danke.',
      mag: 'Gutes Stück. Danke.',
      neutral: 'Hm. Danke.',
      magNicht: 'Was soll ich damit?',
      hasst: 'Hatschi! Nimm das weg! Ich bin allergisch!',
    },
    herzGeschenk: { 4: { id: 'kohle', n: 10 } },
  },
  lene: {
    name: 'Lene', voll: 'Lene Wellbrink', rolle: 'Fischerin',
    aussehen: { haut: '#e8b890', haare: '#d0602f', frisur: 'zopf', hemd: '#e8c24a', hose: '#3a5a7a', muetze: '#2f5f8f' },
    geburtstag: { jz: 'herbst', tag: 9 },
    liebt: ['wels', 'thunfisch', 'tintenfisch', 'koralle', 'kugelfisch'],
    mag: ['kat:fisch', 'fischsuppe', 'muschel', 'seeigel'], magNicht: ['kat:mineral'], hasst: ['stiefel', 'treibholz'],
    plan: {
      normal: [[600, null], [700, 'strand', 27, 10], [1700, 'strand', 24, 16], [1930, 'gasthaus', 12, 5], [2300, null]],
      regen: [[600, null], [700, 'strand', 27, 10], [1200, 'gasthaus', 12, 5], [2300, null]],
    },
    zeilen: {
      allgemein: [
        'Na, Landratte? Das Meer hat heute gute Laune. Merkt man am Geruch.',
        'Fische beißen am liebsten früh am Morgen. Oder spät. Oder wann sie wollen.',
        'Mit Köder im Rucksack beißen sie schneller. Ich verkaufe welchen, wenn du magst.',
        'Halt den grünen Balken über dem Fisch. Klingt einfach. Ist es nicht.',
        'Ich hab mal einen Thunfisch gefangen, der war größer als mein Boot. Mein Boot war allerdings sehr klein.',
        'Bei Regen kommen die Aale raus. Und die Welse im Teich. Schlechtes Wetter, gute Fische.',
        'Mats malt mich immer, wenn ich am Steg sitze. Ich sehe auf jedem Bild anders aus.',
      ],
      fruehling: ['Im Frühling ziehen die Heringe vorbei. Silbrig wie Münzen.'],
      sommer: ['Im Sommer zeigt sich manchmal der Kugelfisch. Nur bei Sonne, nur mittags. Eigensinnig.'],
      herbst: ['Herbststürme. Die besten Geschichten fangen mit einem Herbststurm an.'],
      winter: ['Tintenfische gibt’s im Winter, wenn’s dunkel wird. Bring Geduld mit. Und eine Mütze.'],
      regen: ['Regen! Mein Lieblingswetter. Die Fische denken, sie wären unsichtbar.'],
      herz: {
        2: 'Du hast eine ruhige Hand. Das merkt der Fisch, bevor du’s merkst.',
        4: 'Mein Großvater hat diese Hütte gebaut. Jedes Brett riecht nach ihm. Also nach Tang.',
        6: 'Manchmal fahre ich nachts raus, nur um die Sterne im Wasser zu sehen. Willst du mal mit?',
        8: 'Ich hab dir eine Ecke am Steg reserviert. Mit Kissen. Fast keine Möwenspuren.',
        10: 'Weißt du was, {name}? Du bist der beste Fang, den Klarwasser seit langem gemacht hat.',
      },
      geburtstag: 'Mein Geburtstag! Und du hast was mitgebracht? Ahoi!',
      wieder: ['Die Flut wartet nicht.', 'Bis später, Landratte.'],
    },
    antwort: {
      liebt: 'Bei allen Stürmen! Das ist ein Prachtstück!',
      mag: 'Nicht schlecht, nicht schlecht. Danke!',
      neutral: 'Danke dir.',
      magNicht: 'Hm. Das werf ich den Möwen hin.',
      hasst: 'Pfui! Das gehört nicht mal ins Meer.',
    },
    herzGeschenk: { 2: { id: 'koeder', n: 25 } },
  },
  frieda: {
    name: 'Frieda', voll: 'Frieda Brunnmeier', rolle: 'Bürgermeisterin',
    aussehen: { haut: '#f0c8a8', haare: '#e8cf6a', frisur: 'lang', hemd: '#2f7f62', hose: '#22403f' },
    geburtstag: { jz: 'winter', tag: 20 },
    liebt: ['blaubeere', 'melone', 'marmelade', 'narzisse'],
    mag: ['kat:ernte', 'kat:sammel', 'salat'], magNicht: ['kat:fisch'], hasst: ['schleim', 'fluegel', 'kohle'],
    plan: {
      normal: [[600, null], [800, 'dorf', 18, 9], [1000, 'dorf', 17, 13], [1300, 'dorf', 32, 10], [1600, 'dorf', 25, 18], [1900, null]],
      regen: [[600, null], [900, 'dorf', 17, 13], [1300, 'gasthaus', 3, 4], [1800, null]],
    },
    zeilen: {
      allgemein: [
        'Willkommen in Klarwasser, {name}! Ich bin die Bürgermeisterin. Ich habe immer Fragen. Äh, Antworten.',
        'Die alte Mühle am Fluss stand schon still, als ich ein Kind war. Ich träume davon, dass sie sich wieder dreht.',
        'Am Schwarzen Brett auf dem Marktplatz hängen Aufträge aus dem Dorf. Schau ruhig mal rein.',
        'Klarwasser hatte seit zweihundert Jahren keine Missernte. Sagt man jedenfalls. Ich habe nicht nachgezählt.',
        'Ein Dorf ist nur so stark wie seine Felder. Und seine Nachbarn. Und sein Gasthaus, sagt Hannes.',
        'Wer in der Mühle etwas spendet, kommt auf die Tafel. In Schönschrift.',
        'Ich habe deine Großmutter gut gekannt. Sie hat jeden Streit im Gemeinderat mit einem Kuchen beendet.',
      ],
      fruehling: ['Frühling in Klarwasser! Die Kirschbäume… äh, wir haben keine Kirschbäume. Aber die Luft!'],
      sommer: ['Im Sommer veranstalten wir eigentlich ein Fest. Eigentlich.'],
      herbst: ['Erntezeit! Die Mühle bräuchte jetzt Weizen. Wenn sie liefe.'],
      winter: ['Schnee! Das Rathaus sieht aus wie ein Lebkuchenhaus. Bitte nicht anknabbern.'],
      regen: ['Regen ist gut für die Felder und schlecht für meine Frisur.'],
      herz: {
        2: 'Du machst Klarwasser lebendiger, {name}. Das merken alle.',
        4: 'Manchmal stehe ich abends an der Mühle und höre zu. Ich bilde mir ein, das Rad knarrt.',
        6: 'Ich wollte nie Bürgermeisterin werden. Aber jemand musste die Stühle für die Versammlung aufstellen.',
        8: 'Wenn die Mühle wieder läuft, gebe ich ein Fest. Du bekommst den Ehrenplatz. Neben dem Kuchen.',
        10: 'Danke, {name}. Für alles. Klarwasser ist wieder ein Zuhause.',
      },
      geburtstag: 'Oh, an meinen Geburtstag gedacht! Das schreibe ich ins Protokoll.',
      wieder: ['Die Pflicht ruft!', 'Ich muss weiter, die Gemeindekasse zählt sich nicht von selbst.'],
    },
    antwort: {
      liebt: 'Wie wundervoll! Danke, danke, danke!',
      mag: 'Wie aufmerksam, danke!',
      neutral: 'Danke schön.',
      magNicht: 'Oh. Hm. Danke… glaube ich.',
      hasst: 'Iiih! Was ist DAS denn?',
    },
    herzGeschenk: { 4: { id: 'salat', n: 2 } },
  },
  mats: {
    name: 'Mats', voll: 'Mats Faber', rolle: 'Maler',
    aussehen: { haut: '#b97f58', haare: '#1d1a26', frisur: 'locken', hemd: '#ece6da', hose: '#5a4a8a', flecken: true },
    geburtstag: { jz: 'fruehling', tag: 24 },
    liebt: ['amethyst', 'kristallfrucht', 'nautilus', 'tulpe'],
    mag: ['kat:mineral', 'kat:sammel', 'kaffee'], magNicht: ['kat:ressource'], hasst: ['eingelegt', 'schleim'],
    plan: {
      normal: [[600, null], [900, 'strand', 8, 6], [1300, 'dorf', 40, 9], [1600, 'dorf', 24, 13], [2000, 'gasthaus', 5, 8], [2300, null]],
      regen: [[600, null], [900, 'gasthaus', 3, 3], [2300, null]],
    },
    zeilen: {
      allgemein: [
        'Siehst du das Licht? Nein, nicht das da. Das dahinter.',
        'Ich male gerade den Fluss. Er bewegt sich ständig. Sehr unkollegial.',
        'Wenn du in der Mine Amethyst findest… ich frage nur. Aus künstlerischen Gründen.',
        'Lene sagt, ich male zu viel Blau. Es gibt kein zu viel Blau.',
        'Dein Hof hat schöne Farben, {name}. Besonders wenn alles blüht.',
        'Ich war mal in der Stadt. Zu laut, zu grau. Hier hört man die Farben.',
        'Manchmal male ich den Brunnen und merke erst danach, dass ich ihn nie richtig angesehen habe.',
      ],
      fruehling: ['Frühlingsgrün ist die schwierigste Farbe. Sie ist jeden Tag eine andere.'],
      sommer: ['Sommerlicht macht alles flach. Ich male lieber morgens.'],
      herbst: ['Herbst! Endlich Orange! Ich habe drei Tuben gekauft.'],
      winter: ['Weiß auf Weiß. Der Winter ist ein Rätsel für Maler.'],
      regen: ['Regen malt die Welt neu. Ich schaue heute nur zu.'],
      herz: {
        2: 'Darf ich dich irgendwann malen? Mit Hacke. Sehr heldenhaft.',
        4: 'Ich habe ein Bild von deinem Hof angefangen. Es ist noch nicht fertig. Dein Hof auch nicht.',
        6: 'Meine Eltern wollten, dass ich Steuerberater werde. Ich habe ihnen ein Bild von einer Steuer gemalt. Es war sehr traurig.',
        8: 'Du bist der einzige Mensch, der meine Bilder anschaut, bevor er fragt, was sie kosten.',
        10: 'Das Bild von dir ist fertig, {name}. Es hängt jetzt im Gasthaus. Hannes sagt, es macht durstig.',
      },
      geburtstag: 'Mein Geburtstag? Den hab ich selbst vergessen! Danke!',
      wieder: ['Pssst, das Licht ist gerade gut.', 'Bis bald!'],
    },
    antwort: {
      liebt: 'Diese Farbe! Diese Form! Das muss ich sofort malen!',
      mag: 'Oh, schön. Danke!',
      neutral: 'Danke.',
      magNicht: 'Hm. Nicht so meine Palette.',
      hasst: 'Das ist… das Gegenteil von Kunst.',
    },
    herzGeschenk: { 4: { id: 'amethyst', n: 1 } },
  },
  hannes: {
    name: 'Hannes', voll: 'Hannes Krugmann', rolle: 'Wirt',
    aussehen: { haut: '#f0b890', haare: '#c8a070', frisur: 'glatze', hemd: '#a83a3a', hose: '#3a2a2a', schuerze: '#f2eee6', bart: '#c8a070' },
    geburtstag: { jz: 'sommer', tag: 21 },
    liebt: ['pfifferling', 'lachs', 'grossesei', 'kuerbis'],
    mag: ['kat:ernte', 'kat:fisch', 'ei'], magNicht: ['kat:mineral'], hasst: ['quarz', 'stiefel', 'schleim'],
    plan: {
      normal: [[600, null], [900, 'dorf', 20, 22], [1100, 'gasthaus', 11, 3], [2400, null]],
    },
    zeilen: {
      allgemein: [
        'Hereinspaziert! Im Gasthaus gibt’s ab elf was Warmes.',
        'Ein Kaffee macht flinke Füße. Bauernweisheit. Hab ich mir ausgedacht.',
        'Abends kommt das halbe Dorf vorbei. Die andere Hälfte schläft schon.',
        'Wer müde ist, isst. Wer nicht müde ist, isst trotzdem. So einfach ist das Leben.',
        'Bring mir mal einen Pfifferling aus dem Herbstwald. Daraus mach ich dir was Feines.',
        'Bruno sitzt jeden Abend an derselben Stelle. Wenn er mal fehlt, mach ich mir Sorgen.',
        'Die Fischsuppe ist nach Lenes Rezept. Sie sagt, das Geheimnis ist Salzwasser. Ich sage: Butter.',
      ],
      fruehling: ['Frischer Lauch, junge Pastinaken – im Frühling koche ich grün.'],
      sommer: ['Im Sommer stell ich Tische raus. Sofern die Wespen einverstanden sind.'],
      herbst: ['Kürbissuppe! Leider nur, wenn mir jemand Kürbisse bringt.'],
      winter: ['Winter ist Eintopfzeit. Komm rein und wärm dich auf.'],
      regen: ['Bei Regen ist das Gasthaus voll. Ich liebe Regen.'],
      herz: {
        2: 'Für dich gibt’s heute einen Extraklecks Sahne. Nicht weitersagen.',
        4: 'Den Laden hab ich von meinem Onkel. Er sagte immer: Ein voller Bauch hat kein Heimweh.',
        6: 'Weißt du, warum ich Wirt geworden bin? Weil hier jeder irgendwann vorbeikommt. Man ist nie allein.',
        8: 'Dein Stammplatz am Tresen ist jetzt offiziell reserviert. Ich habe ein Schild gemalt. Mats hat’s verbessert.',
        10: 'Auf dich, {name}! Klarwasser ist besser, seit du da bist.',
      },
      geburtstag: 'Geburtstag! Heute bekomm ich mal was! Danke!',
      wieder: ['Guten Appetit!', 'Ich muss in die Küche.'],
    },
    antwort: {
      liebt: 'Herrlich! Daraus koche ich was ganz Besonderes!',
      mag: 'Gute Zutat! Danke!',
      neutral: 'Danke, kann man immer brauchen.',
      magNicht: 'Hmm. Das passt in keinen Topf.',
      hasst: 'Das kommt mir nicht in die Küche!',
    },
    herzGeschenk: { 2: { id: 'brot', n: 3 } },
  },
};

export const PUNKTE_PRO_HERZ = 250;
export const MAX_HERZEN = 10;
export const GESCHENK_PUNKTE = { liebt: 80, mag: 45, neutral: 20, magNicht: -20, hasst: -40 };

// ─── Die alte Mühle ─────────────────────────────────────────────────────────

export const BUENDEL = [
  { id: 'fruehling', name: 'Frühlingsernte', items: ['pastinake', 'bohne', 'blumenkohl', 'kartoffel'], belohnung: { id: 'duenger', n: 20 } },
  { id: 'sommer', name: 'Sommerernte', items: ['tomate', 'peperoni', 'blaubeere', 'melone'], belohnung: { id: 'qsprenger', n: 1 } },
  { id: 'herbst', name: 'Herbsternte', items: ['mais', 'aubergine', 'kuerbis', 'rotebete'], belohnung: { id: 'einmachglas', n: 2 } },
  { id: 'wald', name: 'Waldfunde', items: ['meerrettich', 'narzisse', 'lauch', 'loewenzahn', 'brombeere', 'haselnuss', 'pfifferling', 'winterwurzel'], noetig: 4, belohnung: { id: 'salat', n: 5 } },
  { id: 'angler', name: 'Anglerglück', items: ['karpfen', 'sonnenbarsch', 'forelle', 'sardine', 'hering', 'hecht', 'lachs', 'wels'], noetig: 4, belohnung: { id: 'koeder', n: 50 } },
  { id: 'tiefe', name: 'Aus der Tiefe', items: ['kupferbarren', 'eisenbarren', 'goldbarren', 'quarz', 'amethyst', 'topas'], noetig: 4, belohnung: { gold: 1500 } },
  { id: 'bau', name: 'Holz und Stein', items: [{ id: 'holz', n: 99 }, { id: 'stein', n: 99 }, { id: 'hartholz', n: 10 }, { id: 'faser', n: 50 }], belohnung: { id: 'sprenger', n: 3 } },
  { id: 'hof', name: 'Vom Hühnerhof', items: ['ei', 'grossesei', 'marmelade', 'eingelegt'], noetig: 3, belohnung: { gold: 2500 } },
];

// ─── Briefe ─────────────────────────────────────────────────────────────────
// tagNr: ab diesem Tag (1 = erster Frühlingstag im ersten Jahr) · jz/tag: jedes Jahr an diesem Tag

export const BRIEFE = [
  {
    id: 'frieda_willkommen', tagNr: 1, von: 'Frieda Brunnmeier, Bürgermeisterin',
    text: 'Willkommen in Klarwasser, {name}!\n\nDie Pastinakensamen in deinem Rucksack sind ein Geschenk des Dorfes. Mit der Hacke lockerst du das Gras, dann säen, dann gießen – jeden Tag.\n\nWas du in die Versandkiste neben deinem Haus legst, wird über Nacht verkauft. Neues Saatgut gibt’s bei Ottilie im Krämerladen. Das Dorf liegt östlich deines Hofs.\n\nHerzlich,\nFrieda',
  },
  {
    id: 'lene_angel', tagNr: 2, von: 'Lene',
    text: 'Moin {name}!\n\nKomm mal an den Strand, südlich vom Dorf. Ich hab da was für dich, das Fische fängt.\n\n– Lene',
  },
  {
    id: 'frieda_muehle', tagNr: 3, von: 'Frieda Brunnmeier',
    text: 'Liebe(r) {name},\n\ndie alte Mühle am Fluss steht seit Jahrzehnten still. Wir sammeln Gaben aus Feld, Wald, Wasser und Tiefe, um sie wieder in Gang zu bringen.\n\nWenn du etwas übrig hast: Die Mühlentür steht offen. Jede Spende zählt!\n\nFrieda',
  },
  {
    id: 'bruno_mine', tagNr: 4, von: 'Bruno',
    text: 'Hab das Geröll vor der alten Mine weggeräumt. Liegt nördlich von deinem Hof.\n\nAm Eingang lehnt ein altes Schwert. Nimm’s mit. Da unten gibt’s Schleime.\n\nErz bringt Barren. Barren bringen bessere Werkzeuge. Du weißt, wo du mich findest.\n\nBruno',
  },
  {
    id: 'ottilie_tipp', tagNr: 6, von: 'Ottilie',
    text: 'Kleiner Tipp unter Nachbarn: Am 28. endet der Frühling. Was dann noch auf dem Feld steht und kein Sommergewächs ist, verwelkt über Nacht.\n\nAlso lieber rechtzeitig ernten!\n\nOttilie',
  },
  {
    id: 'sommer', jz: 'sommer', tag: 1, von: 'Ottilie',
    text: 'Der Sommer ist da! Ich habe Melonen-, Tomaten- und Blaubeersamen auf Lager. Blaubeeren tragen den ganzen Sommer über.\n\nOttilie',
  },
  {
    id: 'herbst', jz: 'herbst', tag: 1, von: 'Ottilie',
    text: 'Herbst! Kürbisse, Preiselbeeren, Rote Bete – alles frisch eingetroffen. Im Wald wachsen jetzt Pilze und Brombeeren.\n\nOttilie',
  },
  {
    id: 'winter', jz: 'winter', tag: 1, von: 'Bruno',
    text: 'Winter. Draußen wächst nichts mehr. Gute Zeit für die Mine.\n\nUnd das Meer friert nicht zu. Sagt Lene.\n\nBruno',
  },
];

export const OMA_BRIEF = 'Mein liebes {name},\n\nwenn du diesen Brief liest, bin ich nicht mehr da – aber der Hof ist es noch. Er ist verwildert, ich weiß. Unkraut, Steine, ein paar Bäume zu viel. Aber der Boden in Klarwasser ist gut. Er war immer gut zu mir.\n\nIch vermache dir den {hof}. Mach etwas Schönes daraus. Und grüß Ottilie von mir.\n\nIn Liebe,\ndeine Oma Liesel';

export const TIPPS = [
  'Gegossene Beete sind dunkler. Nur was gegossen ist, wächst über Nacht.',
  'Regen gießt alle Beete. An Regentagen beißen außerdem besondere Fische.',
  'Am letzten Tag jeder Jahreszeit welkt alles, was im neuen Wetter nicht wachsen kann.',
  'Aus Unkraut wird Faser, aus gefällten Bäumen Harz. Beides braucht man zum Basteln.',
  'Mit Dünger im Beet gelingt öfter eine Silber- oder Goldernte.',
  'Wer jemandem ein Lieblingsgeschenk macht, gewinnt schnell Herzen. Am Geburtstag zählt es achtfach.',
  'Aus fünf Erz und einer Kohle bastelst du einen Barren. Bruno verbessert damit deine Werkzeuge.',
  'In der Mine liegt die Leiter nach unten unter einem der Steine.',
  'Alle fünf Ebenen merkt sich der Förderkorb am Mineneingang deinen Fortschritt.',
  'Krähen fressen ungeschützte Pflanzen. Eine Vogelscheuche schützt alles in acht Feldern Umkreis.',
  'Essen stellt Energie wieder her. Halte etwas Essbares in der Hand und drücke F.',
  'Mit Köder im Rucksack beißen die Fische doppelt so schnell.',
];

export const HUEHNER_NAMEN = ['Henriette', 'Gackeline', 'Erna', 'Frau Pickel', 'Rosi', 'Berta', 'Klara', 'Hilde'];
