// Bereich „dorf" – Fenster: der Laden (Kaufen und Verkaufen) für alle Händler im Spiel,
// dazu die Bilder der Spezialwaren aus dem Dorf (Rucksack, Werkzeug-Upgrade).
// Spezialwaren anderer Bereiche bringen ihr Bild über wareBild mit.

import { ITEMS, NPCS, LAEDEN, KATEGORIE_NAME } from '../../daten.js';
import * as L from '../../logik.js';
import { S } from '../../spiel.js';
import { itemDatenUrl } from '../../sprites.js';
import {
  fensterArt, wareBild, WARE_BILD, fensterRahmen, fensterNeu, el, bild, symbol, itemIcon, portraet, invGitter, goldAnzeige,
  meldung, ton, zahl,
} from '../../ui.js';

wareBild('upgrade', (w) => bild(itemDatenUrl({ id: w.werkzeug }, w.stufe)));
wareBild('rucksack', () => symbol('rucksack'));

function wareIcon(w) {
  if (w.id) return itemIcon({ id: w.id });
  const fn = WARE_BILD[w.spezial];
  return fn ? fn(w) : itemIcon({ id: 'truhe' });
}

/** Laden: daten { laden: LAEDEN-ID, reiter: 'kaufen' | 'verkaufen' }. */
fensterArt('laden', (d) => {
  const s = S.s;
  const l = LAEDEN[d.laden];
  d.reiter ??= 'kaufen';
  d.menge ??= {};
  const kopf = el('div', { class: 'laden-kopf' }, bild(portraet(l.npc), 'pixel portraet-klein'),
    el('div', {}, el('strong', {}, NPCS[l.npc].voll), el('div', { class: 'leise klein' }, l.name)));
  const reiter = el('nav', { class: 'reiter' }, [['kaufen', 'Kaufen'], ['verkaufen', 'Verkaufen']].map(([id, name]) => el('button', {
    type: 'button', class: d.reiter === id ? 'aktiv' : '', onclick: () => { d.reiter = id; fensterNeu(); },
  }, name)));
  let inhalt;
  if (d.reiter === 'kaufen') {
    const ware = L.ladenWare(s, d.laden);
    inhalt = el('div', { class: 'liste' }, ware.length ? ware.map((w, i) => {
      const name = w.name || ITEMS[w.id].name;
      const text = w.text || (w.id ? ITEMS[w.id].text : '');
      const stapel = !!w.id && w.id !== 'angel';
      const n = stapel ? (d.menge[i] || 1) : 1;
      const zutaten = w.zutaten ? Object.entries(w.zutaten).map(([id, m]) => el('span', { class: `zutat${L.anzahl(s, id) >= m ? ' ok' : ''}` }, itemIcon({ id }), `${m}× ${ITEMS[id].name}`)) : null;
      return el('div', { class: 'zeile' },
        wareIcon(w),
        el('div', { class: 'zeile-text' }, el('strong', {}, name), text ? el('div', { class: 'leise klein' }, text) : null, zutaten ? el('div', { class: 'zutaten' }, zutaten) : null),
        el('div', { class: 'preis' }, `${zahl.format(w.preis * n)} g`),
        stapel ? el('div', { class: 'menge' },
          el('button', { type: 'button', class: 'knopf klein', 'aria-label': 'Weniger', onclick: () => { d.menge[i] = Math.max(1, n - (n > 5 ? 5 : 1)); fensterNeu(); } }, '−'),
          el('span', { 'aria-live': 'polite' }, n),
          el('button', { type: 'button', class: 'knopf klein', 'aria-label': 'Mehr', onclick: () => { d.menge[i] = Math.min(99, n + (n >= 5 ? 5 : 1)); fensterNeu(); } }, '+')) : el('div', { class: 'menge' }),
        el('button', {
          type: 'button', class: 'knopf',
          disabled: s.spieler.gold < w.preis * n || Object.entries(w.zutaten || {}).some(([id, m]) => L.anzahl(s, id) < m * n),
          onclick: () => {
            const erg = L.kaufen(s, w, n);
            if (erg.grund) { meldung(erg.grund, 'warn'); ton('dumpf'); }
            else {
              ton('geld');
              if (erg.text) meldung(erg.text, 'gut');
            }
            fensterNeu();
          },
        }, 'Kaufen'));
    }) : el('p', { class: 'leise' }, 'Gerade gibt es hier nichts zu kaufen.'));
  } else {
    d.ganz ??= false;
    inhalt = el('div', {},
      el('p', { class: 'leise' }, `${l.name} kauft: ${l.kauft.map((k) => KATEGORIE_NAME[k]).join(', ')}.`),
      el('label', { class: 'umschalter' }, el('input', { type: 'checkbox', checked: d.ganz, onchange: (e) => { d.ganz = e.target.checked; } }), 'Ganzen Stapel verkaufen'),
      invGitter((i, e) => {
        const slot = s.spieler.inv[i];
        if (!L.kauftLaden(d.laden, slot)) return;
        const erg = L.verkaufen(s, d.laden, i, d.ganz || e.shiftKey ? slot.n : 1);
        if (erg) { ton('geld'); meldung(`+${erg.gold} g`); }
        fensterNeu();
      }, { dimme: (slot) => slot && !L.kauftLaden(d.laden, slot), markiere: (slot) => L.kauftLaden(d.laden, slot) }));
  }
  return fensterRahmen(l.name, el('div', {}, kopf, reiter, inhalt), { klasse: 'breit', kopfExtra: goldAnzeige() });
});
