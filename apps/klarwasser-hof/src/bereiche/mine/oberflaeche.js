// Bereich „mine" – Fenster und Anzeigen: der Förderkorb am Mineneingang und die tiefste
// erreichte Ebene in der Statistik.

import { S } from '../../spiel.js';
import { fensterArt, fensterRahmen, fensterSchliessen, statistik, el } from '../../ui.js';
import { MINE_TIEFE, aufzugFahren } from './inhalt.js';

fensterArt('aufzug', () => {
  const s = S.s;
  const ebenen = [];
  for (let n = 5; n <= Math.min(MINE_TIEFE, s.mine.tiefste); n += 5) ebenen.push(n);
  return fensterRahmen('Förderkorb', el('div', {},
    el('p', { class: 'leise' }, `Tiefste erreichte Ebene: ${s.mine.tiefste}. Der Korb hält alle fünf Ebenen.`),
    el('div', { class: 'knopf-reihe' },
      el('button', { type: 'button', class: 'knopf', onclick: () => { fensterSchliessen(); aufzugFahren(1); } }, 'Ebene 1'),
      ebenen.map((n) => el('button', { type: 'button', class: 'knopf', onclick: () => { fensterSchliessen(); aufzugFahren(n); } }, `Ebene ${n}`)))));
});

statistik({ id: 'tiefste', name: 'Tiefste Minenebene', reihe: 60, wert: (s) => s.mine?.tiefste ?? 0 });
