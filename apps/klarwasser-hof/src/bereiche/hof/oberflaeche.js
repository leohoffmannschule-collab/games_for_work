// Bereich „hof" – Fenster: die Versandkiste neben dem Haus.

import * as L from '../../logik.js';
import { S } from '../../spiel.js';
import { fensterArt, fensterRahmen, fensterNeu, el, itemIcon, invGitter, ton, zahl } from '../../ui.js';

fensterArt('versand', () => {
  const s = S.s;
  const liste = s.versand.map((slot) => el('div', { class: 'versand-zeile' }, itemIcon(slot), el('span', {}, `${slot.n}× ${L.nameVon(slot, s)}`), el('span', { class: 'preis' }, `${zahl.format(L.preisVon(slot, s) * slot.n)} g`)));
  return fensterRahmen('Versandkiste', el('div', { class: 'zweispaltig' },
    el('div', {},
      el('p', { class: 'leise' }, 'Tippe einen Stapel an, um ihn in die Kiste zu legen. Über Nacht wird alles verkauft.'),
      invGitter((i) => {
        const slot = L.versenden(s, i);
        if (slot) { ton('pop'); fensterNeu(); }
      }, { dimme: (slot) => slot && !L.verkaufbar(slot) })),
    el('aside', { class: 'versand-liste rahmen-leicht' },
      el('h3', {}, 'Heute in der Kiste'),
      liste.length ? liste : el('p', { class: 'leise' }, 'Noch leer.'),
      el('div', { class: 'summe' }, 'Erlös morgen früh: ', el('strong', {}, `${zahl.format(L.versandWert(s))} g`)),
      s.versandLetztes ? el('button', { type: 'button', class: 'knopf klein', onclick: () => { L.versandZurueck(s); ton('pop'); fensterNeu(); } }, 'Zuletzt Eingelegtes zurücknehmen') : null)), { klasse: 'breit' });
});
