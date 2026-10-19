// Bereich „gemeinschaft": die alte Mühle mit ihren Bündeln, das Schwarze Brett mit Aufträgen,
// die Briefe in der Post und die Medaille für die Rettung der Mühle.

import { ITEMS, PFLANZEN, NPCS, BUENDEL, item, buendel, brief } from '../../daten.js';
import { system } from '../../system.js';
import * as L from '../../logik.js';
import { gebaeudeAktion, dekoAktion, fenster, dialog, ton } from '../../spiel.js';
import { ganz, waehle } from '../../zufall.js';

item('medaille', { name: 'Klarwasser-Medaille', kat: 'besonders', bild: { art: 'medaille' }, text: 'Für die Rettung der alten Mühle. Von ganz Klarwasser.' });

// ─── Die alte Mühle ─────────────────────────────────────────────────────────
// raum: in welchem Raum der Mühle das Bündel später hängt

buendel('fruehling', { name: 'Frühlingsernte', raum: 'speicher', items: ['pastinake', 'bohne', 'blumenkohl', 'kartoffel'], belohnung: { id: 'duenger', n: 20 } });
buendel('sommer', { name: 'Sommerernte', raum: 'speicher', items: ['tomate', 'peperoni', 'blaubeere', 'melone'], belohnung: { id: 'qsprenger', n: 1 } });
buendel('herbst', { name: 'Herbsternte', raum: 'speicher', items: ['mais', 'aubergine', 'kuerbis', 'rotebete'], belohnung: { id: 'einmachglas', n: 2 } });
buendel('wald', { name: 'Waldfunde', raum: 'werkstatt', items: ['meerrettich', 'narzisse', 'lauch', 'loewenzahn', 'brombeere', 'haselnuss', 'pfifferling', 'winterwurzel'], noetig: 4, belohnung: { id: 'salat', n: 5 } });
buendel('angler', { name: 'Anglerglück', raum: 'aquarium', items: ['karpfen', 'sonnenbarsch', 'forelle', 'sardine', 'hering', 'hecht', 'lachs', 'wels'], noetig: 4, belohnung: { id: 'koeder', n: 50 } });
buendel('tiefe', { name: 'Aus der Tiefe', raum: 'kesselraum', items: ['kupferbarren', 'eisenbarren', 'goldbarren', 'quarz', 'amethyst', 'topas'], noetig: 4, belohnung: { gold: 1500 } });
buendel('bau', { name: 'Holz und Stein', raum: 'werkstatt', items: [{ id: 'holz', n: 99 }, { id: 'stein', n: 99 }, { id: 'hartholz', n: 10 }, { id: 'faser', n: 50 }], belohnung: { id: 'sprenger', n: 3 } });
buendel('hof', { name: 'Vom Hühnerhof', raum: 'speicher', items: ['ei', 'grossesei', 'marmelade', 'eingelegt'], noetig: 3, belohnung: { gold: 2500 } });

export const buendelEintraege = (b) => b.items.map((e) => (typeof e === 'string' ? { id: e, n: 1 } : e));
export const buendelNoetig = (b) => b.noetig ?? b.items.length;
export const buendelFertig = (s, b) => (s.buendel[b.id] || []).length >= buendelNoetig(b);

/** Index des Bündel-Eintrags, den dieser Stapel erfüllen könnte, sonst -1. */
export function buendelPlatz(s, b, slot) {
  if (!slot || buendelFertig(s, b)) return -1;
  const geg = s.buendel[b.id] || [];
  return buendelEintraege(b).findIndex((e, j) => e.id === slot.id && !geg.includes(j));
}

export function spenden(s, bId, idx, ort) {
  const b = BUENDEL.find((x) => x.id === bId);
  const slot = s.spieler.inv[idx];
  const i = buendelPlatz(s, b, slot);
  if (i < 0) return null;
  const e = buendelEintraege(b)[i];
  if (L.anzahl(s, slot.id) < e.n) return { grund: `Dafür brauchst du ${e.n}× ${ITEMS[slot.id].name}.`, items: [] };
  L.entfernen(s, slot.id, e.n);
  (s.buendel[b.id] ??= []).push(i);
  const erg = { ok: true, items: [] };
  if (buendelFertig(s, b)) {
    erg.fertig = b;
    if (b.belohnung.gold) {
      s.spieler.gold += b.belohnung.gold;
      erg.gold = b.belohnung.gold;
    } else {
      L.geben(s, ort, s.spieler.x, s.spieler.y, { id: b.belohnung.id, n: b.belohnung.n }, erg);
    }
  }
  if (!s.muehle && BUENDEL.every((x) => buendelFertig(s, x))) {
    s.muehle = true;
    erg.muehle = true;
    L.geben(s, ort, s.spieler.x, s.spieler.y, { id: 'medaille', n: 1 }, erg);
    for (const id of Object.keys(s.npcs)) L.freundschaft(s, id, 250);
  }
  return erg;
}

gebaeudeAktion('muehle', () => fenster('muehle'), 'Die alte Mühle');

// ─── Aufträge am Schwarzen Brett ────────────────────────────────────────────

const AUFTRAG_TEXT = {
  ernte: ['Ich koche heute für die halbe Straße und mir fehlen {n}× {item}. Wer hilft?', 'Gesucht: {n}× {item}, frisch vom Feld. Gute Bezahlung!'],
  sammel: ['Für ein altes Familienrezept suche ich {n}× {item}.', 'Wer findet mir {n}× {item}? Ich habe keine Zeit zum Suchen.'],
  fisch: ['Ich hätte so gern {n}× {item}. Frisch, wenn’s geht!', 'Mein Abendessen schwimmt noch. Bringt mir jemand {n}× {item}?'],
  erz: ['Für ein kleines Projekt bräuchte ich {n}× {item}.'],
  mineral: ['Für ein kleines Projekt bräuchte ich {n}× {item}.'],
  ressource: ['Für ein kleines Projekt bräuchte ich {n}× {item}.'],
};

export function questErzeugen(s, r = Math.random) {
  const jz = L.jahreszeit(s);
  const kand = [];
  for (const p of Object.values(PFLANZEN)) if (p.jz.includes(jz)) kand.push(p.ernte);
  for (const it of Object.values(ITEMS)) {
    if (it.kat === 'sammel' && !it.strand && it.jz?.includes(jz)) kand.push(it.id);
    if (it.kat === 'fisch' && it.fisch.jz.includes(jz) && it.fisch.schwierigkeit <= 60) kand.push(it.id);
  }
  for (const id of ['kupfererz', 'quarz', 'kohle']) if (ITEMS[id]) kand.push(id);
  if (s.mine?.tiefste >= 10 && ITEMS.eisenerz) kand.push('eisenerz');
  const id = waehle(r, kand);
  const it = ITEMS[id];
  const n = it.preis < 50 ? ganz(r, 3, 5) : it.preis < 120 ? ganz(r, 1, 3) : 1;
  const npc = waehle(r, Object.keys(NPCS));
  const belohnung = Math.max(100, Math.round((it.preis * n * 3) / 10) * 10);
  const text = waehle(r, AUFTRAG_TEXT[it.kat] || AUFTRAG_TEXT.ernte).replace('{n}', n).replace('{item}', it.name);
  return { npc, id, n, belohnung, text, bis: L.tagNr(s.zeit) + 2 };
}

export function questAnnehmen(s) {
  if (!s.brett) return;
  s.quest = { ...s.brett, frist: L.tagNr(s.zeit) + 3 };
  s.brett = null;
}

export function questAbgeben(s, npcId) {
  const q = s.quest;
  if (!q || q.npc !== npcId || L.anzahl(s, q.id) < q.n) return null;
  L.entfernen(s, q.id, q.n);
  s.spieler.gold += q.belohnung;
  L.freundschaft(s, npcId, 150);
  s.quest = null;
  s.stats.auftraege++;
  return { belohnung: q.belohnung, text: 'Danke! Genau das hab ich gebraucht. Hier, für deine Mühe.' };
}

dekoAktion('brett', () => fenster('brett'), 'Schwarzes Brett lesen');

// ─── Briefe ─────────────────────────────────────────────────────────────────
// tagNr: ab diesem Tag (1 = erster Frühlingstag im ersten Jahr) · jz/tag: jedes Jahr an diesem Tag

brief('frieda_willkommen', {
  tagNr: 1, von: 'Frieda Brunnmeier, Bürgermeisterin',
  text: 'Willkommen in Klarwasser, {name}!\n\nDie Pastinakensamen in deinem Rucksack sind ein Geschenk des Dorfes. Mit der Hacke lockerst du das Gras, dann säen, dann gießen – jeden Tag.\n\nWas du in die Versandkiste neben deinem Haus legst, wird über Nacht verkauft. Neues Saatgut gibt’s bei Ottilie im Krämerladen. Das Dorf liegt östlich deines Hofs.\n\nHerzlich,\nFrieda',
});
brief('lene_angel', {
  tagNr: 2, von: 'Lene',
  text: 'Moin {name}!\n\nKomm mal an den Strand, südlich vom Dorf. Ich hab da was für dich, das Fische fängt.\n\n– Lene',
});
brief('frieda_muehle', {
  tagNr: 3, von: 'Frieda Brunnmeier',
  text: 'Liebe(r) {name},\n\ndie alte Mühle am Fluss steht seit Jahrzehnten still. Wir sammeln Gaben aus Feld, Wald, Wasser und Tiefe, um sie wieder in Gang zu bringen.\n\nWenn du etwas übrig hast: Die Mühlentür steht offen. Jede Spende zählt!\n\nFrieda',
});
brief('bruno_mine', {
  tagNr: 4, von: 'Bruno',
  text: 'Hab das Geröll vor der alten Mine weggeräumt. Sie liegt am Berg, nördlich von deinem Hof.\n\nAm Eingang lehnt ein altes Schwert. Nimm’s mit. Da unten gibt’s Schleime.\n\nErz bringt Barren. Barren bringen bessere Werkzeuge. Du weißt, wo du mich findest.\n\nBruno',
});
brief('ottilie_tipp', {
  tagNr: 6, von: 'Ottilie',
  text: 'Kleiner Tipp unter Nachbarn: Am 28. endet der Frühling. Was dann noch auf dem Feld steht und kein Sommergewächs ist, verwelkt über Nacht.\n\nAlso lieber rechtzeitig ernten!\n\nOttilie',
});
brief('sommer', {
  jz: 'sommer', tag: 1, von: 'Ottilie',
  text: 'Der Sommer ist da! Ich habe Melonen-, Tomaten- und Blaubeersamen auf Lager. Blaubeeren tragen den ganzen Sommer über.\n\nOttilie',
});
brief('herbst', {
  jz: 'herbst', tag: 1, von: 'Ottilie',
  text: 'Herbst! Kürbisse, Preiselbeeren, Rote Bete – alles frisch eingetroffen. Im Wald wachsen jetzt Pilze und Brombeeren.\n\nOttilie',
});
brief('winter', {
  jz: 'winter', tag: 1, von: 'Bruno',
  text: 'Winter. Draußen wächst nichts mehr. Gute Zeit für die Mine.\n\nUnd das Meer friert nicht zu. Sagt Lene.\n\nBruno',
});

brief('oma', {
  start: true, von: 'Oma Liesel',
  text: 'Mein liebes {name},\n\nwenn du diesen Brief liest, bin ich nicht mehr da – aber der Hof ist es noch. Er ist verwildert, ich weiß. Unkraut, Steine, ein paar Bäume zu viel. Aber der Boden in Klarwasser ist gut. Er war immer gut zu mir.\n\nIch vermache dir den {hof}. Mach etwas Schönes daraus. Und grüß Ottilie von mir.\n\nIn Liebe,\ndeine Oma Liesel',
});

// ─── Zustand und Hooks ──────────────────────────────────────────────────────

system({
  name: 'gemeinschaft',
  ergaenzen(s) {
    s.quest ??= null;
    s.brett ??= null;
    s.buendel ??= {};
    s.muehle ??= false;
  },
  neuesSpiel(s, r) {
    s.brett = questErzeugen(s, r);
  },
  tagEnde(s, bericht, r) {
    const heute = L.tagNr(s.zeit);
    if (s.quest && heute > s.quest.frist) {
      bericht.meldungen.push(`Der Auftrag von ${NPCS[s.quest.npc].name} ist abgelaufen.`);
      s.quest = null;
    }
    if (s.brett && heute > s.brett.bis) s.brett = null;
    if (!s.brett && !s.quest && r() < 0.6) s.brett = questErzeugen(s, r);
  },
  /** Mit der gesuchten Ware in der Hand ansprechen: Auftrag abgeben. */
  npcAnsprechen(n, { s, slot }) {
    const q = s.quest;
    if (!q || q.npc !== n.id || slot?.id !== q.id || L.anzahl(s, q.id) < q.n) return undefined;
    const erg = questAbgeben(s, n.id);
    ton('geld');
    dialog(n.id, [erg.text, `Du bekommst ${erg.belohnung} g.`]);
    return true;
  },
  hinweis({ s, npc, slot }) {
    const q = s.quest;
    if (npc && q && q.npc === npc.id && slot?.id === q.id) return `Auftrag abgeben an ${NPCS[npc.id].name}`;
    return undefined;
  },
});
