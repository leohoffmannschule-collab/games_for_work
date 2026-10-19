// Bereich „angeln": die Angel, Fische und Köder, Lenes Fischstand am Strand und
// Lenes Geschenk am zweiten Tag.

import { item, kategorie, fisch, laden, bedingung, werkzeugArt } from '../../daten.js';
import { hatWasser } from '../../karten.js';
import { system } from '../../system.js';
import * as L from '../../logik.js';
import { S, meldung } from '../../spiel.js';
import { angelnStart } from '../../angeln.js';

kategorie('fisch', 'Fisch');
kategorie('koeder', 'Köder');

item('angel', { name: 'Bambusangel', kat: 'werkzeug', bild: { art: 'angel' }, werkzeug: 'angel', text: 'Gedrückt halten zum Auswerfen. Wenn es zuckt: sofort ziehen!' });
werkzeugArt('angel', {
  benutzen({ ort }) {
    if (!hatWasser(ort.def)) { meldung('Hier gibt es kein Wasser zum Angeln.'); return; }
    angelnStart(S);
  },
});

item('koeder', { name: 'Köder', kat: 'koeder', preis: 1, bild: { art: 'koeder' }, koeder: { biss: 0.5 }, text: 'Liegt er im Rucksack, beißen Fische doppelt so schnell.' });

// ─── Fische ─────────────────────────────────────────────────────────────────
// schwierigkeit 0–100 · verhalten ruhig|gemischt|flink|sinker · orte: Gewässerarten · zeit: [von, bis) als Uhrzeit

const ALLE = ['fruehling', 'sommer', 'herbst', 'winter'];
function f(id, name, preis, [schwierigkeit, verhalten, orte, jz, zeit, wetter], bild) {
  fisch(id, { name, preis, bild: { art: 'fisch', ...bild }, schwierigkeit, verhalten, orte, jz, zeit, wetter });
}
f('karpfen', 'Karpfen', 30, [15, 'ruhig', ['teich', 'fluss'], ALLE, [600, 2600]], { f: '#a89a5a', f2: '#e0d8a0' });
f('sonnenbarsch', 'Sonnenbarsch', 30, [30, 'gemischt', ['fluss', 'teich'], ['fruehling', 'sommer'], [600, 1900], 'sonne'], { f: '#e8b83a', f2: '#7ac0d8', form: 'hoch' });
f('wels', 'Wels', 200, [75, 'gemischt', ['fluss', 'teich'], ['fruehling', 'herbst'], [600, 2400], 'regen'], { f: '#6a6a5a', f2: '#c8c0a0', form: 'wels' });
f('doebel', 'Döbel', 50, [35, 'flink', ['fluss', 'teich'], ALLE, [600, 2600]], { f: '#8aa0a8', f2: '#e0e8e8' });
f('forelle', 'Regenbogenforelle', 65, [45, 'gemischt', ['fluss'], ['sommer'], [600, 1900], 'sonne'], { f: '#8ab06a', f2: '#e88aa0' });
f('lachs', 'Lachs', 75, [50, 'gemischt', ['fluss'], ['herbst'], [600, 1900]], { f: '#c86a5a', f2: '#f0b8a0' });
f('hecht', 'Hecht', 100, [60, 'flink', ['fluss', 'teich'], ['sommer', 'winter'], [600, 2600]], { f: '#6a8a4a', f2: '#d8e0a0', form: 'lang' });
f('zander', 'Zander', 105, [45, 'ruhig', ['fluss', 'teich'], ['herbst', 'winter'], [1200, 2600], 'regen'], { f: '#a8a070', f2: '#e8e0c0', form: 'lang' });
f('barsch', 'Flussbarsch', 55, [35, 'flink', ['fluss', 'teich'], ['winter'], [600, 2600]], { f: '#8ab04a', f2: '#e8a050', form: 'hoch' });
f('brasse', 'Brasse', 45, [35, 'ruhig', ['fluss'], ALLE, [1800, 2600]], { f: '#a8a8a0', f2: '#e0e0d8', form: 'hoch' });
f('sardine', 'Sardine', 40, [30, 'flink', ['meer'], ['fruehling', 'herbst', 'winter'], [600, 1900]], { f: '#7aa8c8', f2: '#e8f0f8', form: 'klein' });
f('hering', 'Hering', 30, [25, 'flink', ['meer'], ALLE, [600, 2600]], { f: '#6a8ab0', f2: '#d8e0f0', form: 'klein' });
f('heilbutt', 'Heilbutt', 80, [50, 'sinker', ['meer'], ['fruehling', 'sommer', 'winter'], [600, 2600]], { f: '#9a8a6a', f2: '#e8e0d0', form: 'flach' });
f('thunfisch', 'Thunfisch', 100, [70, 'gemischt', ['meer'], ['sommer', 'winter'], [600, 1900]], { f: '#3a5a8a', f2: '#c8d8e8' });
f('rotbarbe', 'Rotbarbe', 75, [55, 'ruhig', ['meer'], ['sommer', 'winter'], [600, 1900]], { f: '#e0605a', f2: '#f8d0c0' });
f('aal', 'Aal', 85, [70, 'ruhig', ['meer'], ['fruehling', 'herbst'], [1600, 2600], 'regen'], { f: '#4a5a3a', f2: '#a8b080', form: 'aal' });
f('tintenfisch', 'Tintenfisch', 80, [75, 'sinker', ['meer'], ['winter'], [1800, 2600]], { f: '#e8a0b0', f2: '#f8d8e0', form: 'tinte' });
f('kugelfisch', 'Kugelfisch', 200, [80, 'flink', ['meer'], ['sommer'], [1200, 1600], 'sonne'], { f: '#e8d06a', f2: '#f8f0d0', form: 'kugel' });

// ─── Lenes Fischstand ───────────────────────────────────────────────────────

bedingung('keineAngel', (s) => !L.hat(s, 'angel'));

laden('fischer', {
  name: 'Lenes Fischstand', npc: 'lene', ort: { karte: 'strand', punkt: 'stand' },
  kauft: ['fisch', 'muell'],
  ware: [
    { id: 'koeder', preis: 5 },
    { id: 'angel', preis: 500, bedingung: 'keineAngel' },
  ],
});

system({
  name: 'angeln',
  /** Lene schenkt ab dem zweiten Tag die alte Angel. */
  gespraech({ s, id, ort }) {
    if (id !== 'lene' || L.hat(s, 'angel') || s.flags.angelBekommen || L.tagNr(s.zeit) < 2) return undefined;
    const erg = { texte: [], items: [] };
    erg.texte.push(L.textErsetzen(s, 'Ah, du bist {name}! Hier – die alte Bambusangel meines Großvaters. Hat lange genug in der Ecke gestanden.'));
    erg.texte.push('Halt die Taste gedrückt zum Auswerfen. Wenn’s zuckt: sofort ziehen! Dann den grünen Balken über dem Fisch halten.');
    L.geben(s, ort, s.spieler.x, s.spieler.y, { id: 'angel', n: 1 }, erg);
    s.flags.angelBekommen = true;
    const st = s.npcs.lene;
    if (!st.gesprochen) { st.gesprochen = true; L.freundschaft(s, 'lene', 20); }
    return erg;
  },
});
