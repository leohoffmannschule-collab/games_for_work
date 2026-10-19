// Bereich „gemeinschaft" – Fenster und Menüreiter: die alte Mühle mit ihren Bündeln, das
// Schwarze Brett und der Reiter „Aufgaben" (Auftrag, Mühle, gelesene Briefe).

import { ITEMS, NPCS, BUENDEL } from '../../daten.js';
import * as L from '../../logik.js';
import { S } from '../../spiel.js';
import {
  fensterArt, menueReiter, fensterRahmen, fensterNeu, fensterOeffnen, fensterSchliessen, el, itemIcon, invGitter,
  meldung, fundeZeigen, dialog, ton, zahl,
} from '../../ui.js';
import { buendelEintraege, buendelNoetig, buendelFertig, buendelPlatz, spenden, questAnnehmen } from './inhalt.js';

// ─── Mühle ──────────────────────────────────────────────────────────────────

fensterArt('muehle', () => {
  const s = S.s;
  const passend = (slot) => !!slot && BUENDEL.some((b) => buendelPlatz(s, b, slot) >= 0);
  const karten = BUENDEL.map((b) => {
    const geg = s.buendel[b.id] || [];
    const fertig = buendelFertig(s, b);
    const belohnung = b.belohnung.gold ? `${zahl.format(b.belohnung.gold)} g` : `${b.belohnung.n}× ${ITEMS[b.belohnung.id].name}`;
    return el('div', { class: `buendel rahmen-leicht${fertig ? ' fertig' : ''}` },
      el('div', { class: 'buendel-kopf' }, el('strong', {}, b.name), el('span', { class: 'chip' }, `${geg.length}/${buendelNoetig(b)}`)),
      el('div', { class: 'buendel-items' }, buendelEintraege(b).map((e, j) => {
        const da = geg.includes(j);
        return el('span', { class: `buendel-item${da ? ' da' : ''}`, title: `${e.n > 1 ? `${e.n}× ` : ''}${ITEMS[e.id].name}${da ? ' (gespendet)' : ''}` }, itemIcon({ id: e.id }), e.n > 1 ? el('span', { class: 'anzahl' }, e.n) : null);
      })),
      el('div', { class: 'leise klein' }, b.noetig ? `${b.noetig} von ${b.items.length} genügen · ` : '', `Belohnung: ${belohnung}`));
  });
  return fensterRahmen('Die alte Mühle', el('div', {},
    el('p', { class: 'leise' }, s.muehle ? 'Das Mühlrad dreht sich wieder. Ganz Klarwasser kommt vorbei, um es zu sehen.' : 'Frieda hat eine Tafel aufgestellt. Jede Gabe bringt das alte Rad ein Stück näher ans Laufen. Leuchtende Plätze im Rucksack passen in ein Bündel.'),
    el('div', { class: 'buendel-gitter' }, karten),
    el('h3', {}, 'Rucksack'),
    invGitter((i) => {
      const slot = s.spieler.inv[i];
      const b = BUENDEL.find((x) => buendelPlatz(s, x, slot) >= 0);
      if (!b) return;
      const erg = spenden(s, b.id, i, S.ort);
      if (!erg) return;
      if (erg.grund) { meldung(erg.grund, 'warn'); fensterNeu(); return; }
      ton('pop');
      if (erg.fertig) { ton('fanfare'); meldung(`Bündel „${erg.fertig.name}" vollständig!`, 'gut'); if (erg.gold) meldung(`+${zahl.format(erg.gold)} g`, 'gut'); }
      if (erg.items.length) fundeZeigen(erg.items);
      fensterNeu();
      if (erg.muehle) {
        fensterSchliessen();
        dialog('frieda', [
          `${S.s.spieler.name}! Hörst du das? Das Rad! Es dreht sich!`,
          'Ganz Klarwasser hat zusammengelegt, aber ohne dich hätten wir es nie geschafft.',
          'Diese Medaille hat meine Großmutter für den Tag aufbewahrt, an dem die Mühle wieder läuft. Sie gehört dir.',
        ]);
      }
    }, { markiere: (slot) => passend(slot), dimme: (slot) => slot && !passend(slot) })), { klasse: 'breit' });
});

// ─── Schwarzes Brett ────────────────────────────────────────────────────────

fensterArt('brett', () => {
  const s = S.s;
  let inhalt;
  if (s.brett) {
    const b = s.brett;
    inhalt = el('div', { class: 'papier' },
      el('p', {}, b.text), el('p', { class: 'unterschrift' }, `– ${NPCS[b.npc].name}`),
      el('p', { class: 'klein' }, `Belohnung: ${b.belohnung} g · Drei Tage Zeit`),
      el('button', { type: 'button', class: 'knopf', onclick: () => { questAnnehmen(s); ton('pop'); meldung('Auftrag angenommen.', 'gut'); fensterNeu(); } }, 'Auftrag annehmen'));
  } else if (s.quest) {
    const q = s.quest;
    inhalt = el('div', { class: 'papier' },
      el('p', {}, `Angenommen: ${q.n}× ${ITEMS[q.id].name} für ${NPCS[q.npc].name}.`),
      el('p', { class: 'klein' }, `Belohnung: ${q.belohnung} g · noch ${Math.max(0, q.frist - L.tagNr(s.zeit))} Tage`),
      el('p', { class: 'klein' }, 'Halte die Ware in der Hand und sprich die Person an.'));
  } else {
    inhalt = el('div', { class: 'papier' }, el('p', {}, 'Heute hängt nichts Neues am Brett. Schau morgen wieder vorbei.'));
  }
  return fensterRahmen('Schwarzes Brett', inhalt);
});

// ─── Menüreiter „Aufgaben" ──────────────────────────────────────────────────

menueReiter({
  id: 'aufgaben', name: 'Aufgaben', reihe: 50,
  bauen() {
    const s = S.s;
    const q = s.quest;
    const teile = [el('h3', {}, 'Auftrag')];
    if (q) {
      teile.push(el('div', { class: 'auftrag rahmen-leicht' }, itemIcon({ id: q.id }),
        el('div', { class: 'zeile-text' },
          el('strong', {}, `${q.n}× ${ITEMS[q.id].name} für ${NPCS[q.npc].name}`),
          el('div', { class: 'leise klein' }, `Belohnung ${q.belohnung} g · noch ${Math.max(0, q.frist - L.tagNr(s.zeit))} Tage · Im Rucksack: ${L.anzahl(s, q.id)}`),
          el('div', { class: 'leise klein' }, 'Halte die Ware in der Hand und sprich die Person an.'))));
    } else {
      teile.push(el('p', { class: 'leise' }, 'Kein Auftrag angenommen. Aufträge hängen am Schwarzen Brett auf dem Marktplatz.'));
    }
    teile.push(el('h3', {}, 'Die alte Mühle'));
    const fertig = BUENDEL.filter((b) => buendelFertig(s, b)).length;
    teile.push(el('p', { class: 'leise' }, s.muehle ? 'Die Mühle dreht sich wieder. Klarwasser feiert dich.' : `${fertig} von ${BUENDEL.length} Bündeln vollständig. Spenden nimmt die Mühle am Fluss entgegen.`));
    teile.push(el('div', { class: 'buendel-mini' }, BUENDEL.map((b) => el('span', { class: `chip${buendelFertig(s, b) ? ' ok' : ''}` }, `${b.name} ${(s.buendel[b.id] || []).length}/${buendelNoetig(b)}`))));
    teile.push(el('h3', {}, 'Briefe'));
    const gelesen = s.briefe.filter((id) => L.briefVon(id));
    teile.push(gelesen.length
      ? el('div', { class: 'knopf-reihe' }, gelesen.map((id) => el('button', { type: 'button', class: 'knopf klein', onclick: () => fensterOeffnen('brief', { id, archiv: true }) }, L.briefVon(id).von.split(',')[0])))
      : el('p', { class: 'leise' }, 'Noch keine Briefe.'));
    return el('div', { class: 'aufgaben' }, teile);
  },
});
