// Bereich „handwerk" – Fenster: die Truhe (24 Plätze, Stapel zwischen Truhe und Rucksack umlagern).

import * as L from '../../logik.js';
import { S } from '../../spiel.js';
import { fensterArt, fensterRahmen, fensterNeu, el, slotKnopf, invGitter, ton } from '../../ui.js';

/** daten: { truhe } – das Objekt aus welt.objekte. */
fensterArt('truhe', (d) => {
  const s = S.s;
  const t = d.truhe;
  return fensterRahmen('Truhe', el('div', {},
    el('p', { class: 'leise' }, 'Tippe einen Stapel an, um ihn umzulagern.'),
    el('h3', {}, 'In der Truhe'),
    el('div', { class: 'inv-gitter' }, t.inv.map((slot, i) => slotKnopf(slot, i, { klick: () => { L.umlagern(t.inv, i, s.spieler.inv); ton('menue'); fensterNeu(); } }))),
    el('h3', {}, 'Rucksack'),
    invGitter((i) => { L.umlagern(s.spieler.inv, i, t.inv); ton('menue'); fensterNeu(); })), { klasse: 'breit' });
});
