// Oberfläche aus DOM: Anzeige, Werkzeugleiste, Gespräche, Fenster, Titel.

import {
  ITEMS, NPCS, LAEDEN, REZEPTE, BUENDEL, FAEHIGKEITEN, XP_STUFEN, JZ_NAME, WERKZEUG_STUFEN,
  AUFRUESTBAR, KANNE_INHALT, KATEGORIE_NAME, OMA_BRIEF, MAX_HERZEN, JZ,
} from './daten.js';
import * as L from './logik.js';
import * as SP from './sprites.js';
import {
  S, spielStarten, neuerMorgen, speichern, essenAus, aufzugFahren, postZeigen, zustandSichern,
} from './spiel.js';
import { E, eingabeLeeren } from './eingabe.js';
import { ton, einstellen, einstellungen, musikStimmung } from './ton.js';
import { MINE_TIEFE } from './mine.js';

const $ = (sel) => document.querySelector(sel);
const zahl = new Intl.NumberFormat('de-DE');
const KURZTAG = { Montag: 'Mo', Dienstag: 'Di', Mittwoch: 'Mi', Donnerstag: 'Do', Freitag: 'Fr', Samstag: 'Sa', Sonntag: 'So' };
const TASTEN = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'ß', '´'];

function el(tag, attrs = {}, ...kinder) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const kind of kinder.flat(Infinity)) {
    if (kind == null || kind === false) continue;
    e.append(kind instanceof Node ? kind : document.createTextNode(String(kind)));
  }
  return e;
}
const bild = (src, klasse = 'pixel', alt = '') => el('img', { src, class: klasse, alt, draggable: 'false' });
const itemIcon = (slot) => bild(SP.itemDatenUrl(slot, ITEMS[slot.id].kat === 'werkzeug' ? (S.s?.spieler.werkzeug[slot.id] || 0) : 0));
const portraitCache = new Map();
function portraet(id) {
  if (!portraitCache.has(id)) portraitCache.set(id, SP.portraetBild(NPCS[id].aussehen).toDataURL());
  return portraitCache.get(id);
}

// ─── Aufbau ─────────────────────────────────────────────────────────────────

let hooks;

export function uiStarten() {
  const hud = $('#hud');
  hud.append(
    el('button', { id: 'menueKnopf', class: 'rahmen knopf', type: 'button', onclick: () => menueOeffnen('rucksack'), 'aria-label': 'Menü öffnen' }, 'Menü'),
    el('div', { id: 'uhr', class: 'rahmen' },
      el('div', { id: 'datum' }),
      el('div', { class: 'uhr-zeile' }, el('img', { id: 'wetter', class: 'pixel', alt: '' }), el('span', { id: 'zeit' })),
      el('div', { class: 'uhr-zeile gold' }, bild(SP.symbolUrl('gold')), el('span', { id: 'gold' }))),
    el('div', { id: 'leisten' },
      el('div', { class: 'leiste hp', id: 'hpLeiste', title: 'Gesundheit' }, el('div', { class: 'fuellung' }), bild(SP.symbolUrl('hp'))),
      el('div', { class: 'leiste energie', id: 'energieLeiste', title: 'Energie' }, el('div', { class: 'fuellung' }), bild(SP.symbolUrl('energie')))),
    el('div', { id: 'hinweis' }),
    el('div', { id: 'hotbar', class: 'rahmen' }),
    el('div', { id: 'funde' }),
    el('div', { id: 'meldungen' }),
    el('div', { id: 'ortname' }),
    el('div', { id: 'touch' },
      el('div', { id: 'stick' }, el('div', { id: 'stickKnopf' })),
      el('div', { id: 'knoepfe' },
        el('button', { id: 'tEssen', type: 'button', class: 'tknopf klein', hidden: true }, 'Essen'),
        el('button', { id: 'tAktion', type: 'button', class: 'tknopf' }, 'Aktion'),
        el('button', { id: 'tBenutzen', type: 'button', class: 'tknopf gross' }, 'Benutzen'))),
  );
  touchStarten();
  hooks = {
    ton,
    meldung: meldungZeigen,
    funde: fundeZeigen,
    dialog: dialogZeigen,
    frage: (text, optionen) => dialogZeigen(null, [text], optionen.map(([t, fn]) => [t, fn || (() => {})])),
    fenster: fensterOeffnen,
    tagEnde: (bericht, ohnmacht) => fensterOeffnen('tagEnde', { bericht, ohnmacht }),
    stufe: stufeZeigen,
    ueberblende,
    karteGewechselt: (def) => ortZeigen(def.name),
  };
  window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') document.body.classList.add('touch'); }, { capture: true });
  if (window.matchMedia?.('(pointer: coarse)').matches) document.body.classList.add('touch');
}

function touchStarten() {
  const stick = $('#stick');
  const knopf = $('#stickKnopf');
  let id = null;
  const setzen = (e) => {
    const r = stick.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = (e.clientX - cx) / (r.width / 2);
    let dy = (e.clientY - cy) / (r.height / 2);
    const l = Math.hypot(dx, dy);
    if (l > 1) { dx /= l; dy /= l; }
    E.touch.x = Math.abs(dx) > 0.2 ? dx : 0;
    E.touch.y = Math.abs(dy) > 0.2 ? dy : 0;
    knopf.style.transform = `translate(${dx * 34}px, ${dy * 34}px)`;
  };
  stick.addEventListener('pointerdown', (e) => { id = e.pointerId; stick.setPointerCapture(id); setzen(e); e.preventDefault(); });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === id) setzen(e); });
  const los = (e) => { if (e.pointerId !== id) return; id = null; E.touch.x = 0; E.touch.y = 0; knopf.style.transform = ''; };
  stick.addEventListener('pointerup', los);
  stick.addEventListener('pointercancel', los);

  const benutzen = $('#tBenutzen');
  benutzen.addEventListener('pointerdown', (e) => { E.touch.benutzen = true; E.benutzen.gedrueckt = true; benutzen.setPointerCapture(e.pointerId); e.preventDefault(); });
  const aus = () => { E.touch.benutzen = false; };
  benutzen.addEventListener('pointerup', aus);
  benutzen.addEventListener('pointercancel', aus);
  $('#tAktion').addEventListener('pointerdown', (e) => { E.aktion.gedrueckt = true; e.preventDefault(); });
  $('#tEssen').addEventListener('click', () => { E.essen = true; });
}

// ─── Anzeige ────────────────────────────────────────────────────────────────

let hotbarSignatur = '';
let letzteAnzeige = '';

export function hudAktualisieren() {
  if (!S.s || S.demo) return;
  const s = S.s;
  const z = s.zeit;
  const anzeige = `${z.tag}|${z.jz}|${z.minute}|${z.wetter}|${s.spieler.gold}`;
  if (anzeige !== letzteAnzeige) {
    letzteAnzeige = anzeige;
    $('#datum').textContent = `${KURZTAG[L.wochentag(z)]}. ${z.tag}. ${JZ_NAME[JZ[z.jz]]}`;
    $('#zeit').textContent = L.uhrzeit(z.minute);
    $('#wetter').src = SP.symbolUrl(z.wetter);
    $('#wetter').alt = { sonne: 'Sonnig', regen: 'Regen', sturm: 'Gewitter', schnee: 'Schnee' }[z.wetter];
    $('#gold').textContent = `${zahl.format(s.spieler.gold)} g`;
  }
  const sp = s.spieler;
  const en = $('#energieLeiste');
  en.querySelector('.fuellung').style.height = `calc((100% - 29px) * ${sp.energie / sp.maxEnergie})`;
  en.classList.toggle('niedrig', sp.energie < 40);
  const hp = $('#hpLeiste');
  hp.hidden = !(S.mineEbene || S.ort?.def.id === 'mine0' || sp.hp < sp.maxHp);
  hp.querySelector('.fuellung').style.height = `calc((100% - 29px) * ${sp.hp / sp.maxHp})`;

  const sig = `${sp.wahl}|${sp.inv.slice(0, 12).map((x) => (x ? `${x.id}:${x.n}:${x.q || 0}:${x.von || ''}` : '-')).join(',')}|${sp.werkzeug.hacke}${sp.werkzeug.giesskanne}${sp.werkzeug.axt}${sp.werkzeug.spitzhacke}`;
  if (sig !== hotbarSignatur) { hotbarSignatur = sig; hotbarZeichnen(); }

  const slot = sp.inv[sp.wahl];
  const touch = document.body.classList.contains('touch');
  let hinweis = '';
  if (S.hinweis) hinweis = touch ? S.hinweis : `E / Rechtsklick · ${S.hinweis}`;
  else if (slot) {
    hinweis = L.nameVon(slot, s);
    if (slot.id === 'giesskanne') hinweis += ` · Wasser ${sp.wasser}/${KANNE_INHALT[sp.werkzeug.giesskanne]}`;
    if (L.essbar(slot) && !touch) hinweis += ' · F zum Essen';
  }
  const h = $('#hinweis');
  if (h.textContent !== hinweis) h.textContent = hinweis;
  h.hidden = !hinweis || S.pause;
  $('#tAktion').textContent = S.hinweis || 'Aktion';
  $('#tEssen').hidden = !L.essbar(slot);

  const def = S.ort?.def;
  if (def) {
    const st = S.mineEbene || def.innen === 'mine' ? 'mine' : !def.aussen ? 'innen' : z.minute >= 1200 ? 'nacht' : JZ[z.jz];
    musikStimmung(S.pause && offen?.name === 'tagEnde' ? null : st);
  }
}

function slotKnopf(slot, i, { klick, aktiv, gedimmt, markiert, taste } = {}) {
  const k = el('button', { type: 'button', class: `slot${aktiv ? ' aktiv' : ''}${gedimmt ? ' gedimmt' : ''}${markiert ? ' markiert' : ''}`, 'data-i': i });
  if (slot) {
    k.append(itemIcon(slot));
    if (slot.n > 1) k.append(el('span', { class: 'anzahl' }, slot.n));
    if (slot.q) k.append(bild(SP.symbolUrl(slot.q === 2 ? 'goldstern' : 'silber'), 'pixel stern'));
    k.title = L.nameVon(slot, S.s);
    k.setAttribute('aria-label', `${L.nameVon(slot, S.s)}${slot.n > 1 ? `, ${slot.n} Stück` : ''}`);
  } else k.setAttribute('aria-label', 'Leerer Platz');
  if (taste) k.append(el('span', { class: 'taste' }, taste));
  if (klick) k.addEventListener('click', (e) => klick(i, e));
  return k;
}

function hotbarZeichnen() {
  const hb = $('#hotbar');
  const sp = S.s.spieler;
  hb.replaceChildren(...sp.inv.slice(0, 12).map((slot, i) => slotKnopf(slot, i, {
    aktiv: i === sp.wahl, taste: TASTEN[i],
    klick: () => { sp.wahl = i; ton('menue'); },
  })));
}

let meldungTimer = null;
const meldungsSchlange = [];
function meldungZeigen(text, art = '') {
  meldungsSchlange.push({ text, art });
  if (!meldungTimer) naechsteMeldung();
}
function naechsteMeldung() {
  const box = $('#meldungen');
  const m = meldungsSchlange.shift();
  if (!m) { box.classList.remove('sichtbar'); meldungTimer = null; return; }
  box.textContent = m.text;
  box.className = `sichtbar ${m.art}`;
  meldungTimer = setTimeout(naechsteMeldung, Math.min(4200, 1600 + m.text.length * 35));
}

const fundZeilen = new Map();
function fundeZeigen(items) {
  const box = $('#funde');
  for (const it of items) {
    const key = `${it.id}:${it.q || 0}:${it.von || ''}`;
    let z = fundZeilen.get(key);
    if (z && z.el.isConnected) {
      z.n += it.n;
      clearTimeout(z.timer);
    } else {
      z = { n: it.n, el: el('div', { class: 'fund rahmen' }) };
      fundZeilen.set(key, z);
      box.append(z.el);
      while (box.children.length > 5) box.firstChild.remove();
    }
    z.el.replaceChildren(itemIcon(it), el('span', {}, `+${z.n} ${L.nameVon(it, S.s)}`));
    if (it.q) z.el.append(bild(SP.symbolUrl(it.q === 2 ? 'goldstern' : 'silber'), 'pixel stern-klein'));
    z.timer = setTimeout(() => { z.el.classList.add('weg'); setTimeout(() => z.el.remove(), 400); fundZeilen.delete(key); }, 2600);
  }
}

function stufeZeigen({ skill, stufe }) {
  meldungZeigen(`${FAEHIGKEITEN[skill]}: Stufe ${stufe}!`, 'gut');
  for (const r of REZEPTE) if (r.stufe && r.stufe[0] === skill && r.stufe[1] === stufe) meldungZeigen(`Neues Rezept: ${ITEMS[r.id].name}`, 'gut');
}

let ortTimer = null;
function ortZeigen(name) {
  const o = $('#ortname');
  o.textContent = name;
  o.classList.add('sichtbar');
  clearTimeout(ortTimer);
  ortTimer = setTimeout(() => o.classList.remove('sichtbar'), 1800);
}

function ueberblende(fn) {
  const b = $('#blende');
  b.classList.add('an');
  setTimeout(() => { fn(); requestAnimationFrame(() => b.classList.remove('an')); }, 230);
}

// ─── Eingaben, die die Oberfläche betreffen ─────────────────────────────────

function verbrauchen() {
  E.benutzen.gedrueckt = false;
  E.aktion.gedrueckt = false;
  E.essen = false;
  E.inventar = false;
  E.basteln = false;
  E.esc = false;
  E.slot = null;
  E.rad = 0;
  E.tippen = null;
}

export function eingabeVerarbeiten() {
  if (!S.s || S.demo) return;
  if (dialog) {
    if (E.aktion.gedrueckt || E.benutzen.gedrueckt) dialogWeiter();
    else if (E.slot != null && dialog.optionen && dialog.i === dialog.texte.length - 1 && dialog.optionen[E.slot]) dialogWaehlen(E.slot);
    else if (E.esc) dialogSchliessen();
    verbrauchen();
    return;
  }
  if (offen) {
    const fest = offen.name === 'tagEnde';
    if (!fest && (E.esc || (E.inventar && offen.name === 'menue') || (E.basteln && offen.name === 'menue'))) fensterSchliessen();
    else if (offen?.name === 'brief' && (E.aktion.gedrueckt || E.benutzen.gedrueckt)) fensterSchliessen();
    verbrauchen();
    return;
  }
  if (S.pause) return;
  if (E.esc || E.inventar) { menueOeffnen('rucksack'); verbrauchen(); }
  else if (E.basteln) { menueOeffnen('basteln'); verbrauchen(); }
}

// ─── Gespräche ──────────────────────────────────────────────────────────────

let dialog = null;
let tippTimer = null;

export function dialogZeigen(npcId, texte, optionen = null, danach = null) {
  S.pause = true;
  eingabeLeeren();
  dialog = { npc: npcId, texte, i: 0, optionen, danach, fertig: false };
  dialogZeichnen();
}

function dialogZeichnen() {
  const box = $('#dialog');
  box.hidden = false;
  const d = dialog;
  const kopf = [];
  if (d.npc) {
    const n = NPCS[d.npc];
    const herz = L.herzen(S.s, d.npc);
    kopf.push(el('div', { class: 'portraet rahmen' }, bild(portraet(d.npc), 'pixel'), el('div', { class: 'name' }, n.name),
      el('div', { class: 'herzen', 'aria-label': `${herz} von ${MAX_HERZEN} Herzen` }, Array.from({ length: MAX_HERZEN }, (_, i) => bild(SP.symbolUrl(i < herz ? 'herz' : 'herzLeer'), 'pixel')))));
  }
  const textEl = el('p', { class: 'dialog-text' });
  const letzte = d.i === d.texte.length - 1;
  const knoepfe = el('div', { class: 'dialog-wahl' });
  if (letzte && d.optionen) {
    d.optionen.forEach(([t], i) => knoepfe.append(el('button', { type: 'button', class: 'knopf', onclick: () => dialogWaehlen(i) }, el('span', { class: 'taste' }, i + 1), t)));
  }
  const weiter = el('button', { type: 'button', class: 'weiter', 'aria-label': 'Weiter', onclick: dialogWeiter }, letzte && !d.optionen ? 'Schließen' : 'Weiter');
  box.replaceChildren(el('div', { class: `dialog-box rahmen${d.npc ? '' : ' ohne-bild'}` }, kopf, el('div', { class: 'dialog-inhalt' }, textEl, knoepfe, letzte && d.optionen ? null : weiter)));
  box.querySelector('.dialog-box').addEventListener('click', (e) => { if (e.target.closest('button')) return; dialogWeiter(); });
  // Schreibmaschine
  const voll = d.texte[d.i];
  let n = 0;
  d.fertig = false;
  clearInterval(tippTimer);
  const reduziert = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduziert) { textEl.textContent = voll; d.fertig = true; return; }
  tippTimer = setInterval(() => {
    n += 2;
    textEl.textContent = voll.slice(0, n);
    if (n >= voll.length) { clearInterval(tippTimer); d.fertig = true; }
  }, 16);
}

function dialogWeiter() {
  if (!dialog) return;
  if (!dialog.fertig) {
    clearInterval(tippTimer);
    dialog.fertig = true;
    $('#dialog .dialog-text').textContent = dialog.texte[dialog.i];
    return;
  }
  if (dialog.i < dialog.texte.length - 1) { dialog.i++; ton('menue'); dialogZeichnen(); return; }
  if (!dialog.optionen) dialogSchliessen();
}

function dialogWaehlen(i) {
  const fn = dialog.optionen[i][1];
  ton('menue');
  dialogSchliessen();
  fn?.();
}

function dialogSchliessen() {
  clearInterval(tippTimer);
  const danach = dialog?.danach;
  dialog = null;
  $('#dialog').hidden = true;
  $('#dialog').replaceChildren();
  if (!offen) S.pause = false;
  danach?.();
}

// ─── Fenster ────────────────────────────────────────────────────────────────

let offen = null;

export function fensterOeffnen(name, daten = {}) {
  S.pause = true;
  eingabeLeeren();
  offen = { name, daten };
  const root = $('#fenster');
  root.hidden = false;
  fensterNeu();
  if (name !== 'tagEnde') root.onclick = (e) => { if (e.target === root) fensterSchliessen(); };
  else root.onclick = null;
}

function fensterNeu() {
  const root = $('#fenster');
  const scroll = root.querySelector('.fenster')?.scrollTop || 0;
  root.replaceChildren(FENSTER[offen.name](offen.daten));
  const f = root.querySelector('.fenster');
  if (f) f.scrollTop = scroll;
}

export function fensterSchliessen() {
  const vorher = offen;
  offen = null;
  $('#fenster').hidden = true;
  $('#fenster').replaceChildren();
  if (!dialog) S.pause = false;
  ton('menue');
  vorher?.daten?.danach?.();
}

function fenster(titel, inhalt, { klasse = '', schliessbar = true, kopfExtra = null } = {}) {
  return el('section', { class: `fenster rahmen ${klasse}`, role: 'dialog', 'aria-label': titel },
    el('header', { class: 'fenster-kopf' }, el('h2', {}, titel), kopfExtra,
      schliessbar ? el('button', { type: 'button', class: 'zu', onclick: fensterSchliessen, 'aria-label': 'Schließen' }, '×') : null),
    inhalt);
}

function goldAnzeige() {
  return el('span', { class: 'gold-anzeige' }, bild(SP.symbolUrl('gold')), `${zahl.format(S.s.spieler.gold)} g`);
}

function invGitter(klick, { markiere, dimme, aktivIdx } = {}) {
  const sp = S.s.spieler;
  return el('div', { class: 'inv-gitter' }, sp.inv.map((slot, i) => slotKnopf(slot, i, {
    klick, aktiv: i === aktivIdx, markiert: markiere?.(slot, i), gedimmt: dimme?.(slot, i),
  })));
}

function itemInfo(slot) {
  if (!slot) return el('div', { class: 'item-info leer' }, el('p', {}, 'Wähle einen Gegenstand, um mehr zu erfahren.'));
  const it = ITEMS[slot.id];
  const zeilen = [];
  if (slot.q) zeilen.push(el('span', { class: 'chip' }, `${slot.q === 2 ? 'Gold' : 'Silber'}qualität`));
  zeilen.push(el('span', { class: 'chip' }, KATEGORIE_NAME[it.kat] || it.kat));
  const e = L.energieVon(slot);
  return el('div', { class: 'item-info' },
    el('div', { class: 'item-kopf' }, itemIcon(slot), el('div', {}, el('h3', {}, L.nameVon(slot, S.s)), el('div', { class: 'chips' }, zeilen))),
    it.text ? el('p', {}, it.text) : null,
    el('dl', { class: 'werte' },
      L.verkaufbar(slot) ? [el('dt', {}, 'Wert'), el('dd', {}, `${L.preisVon(slot)} g`)] : null,
      e ? [el('dt', {}, 'Energie'), el('dd', {}, `+${e}`)] : null,
      slot.n > 1 ? [el('dt', {}, 'Anzahl'), el('dd', {}, slot.n)] : null));
}

const FENSTER = {
  menue: (d) => menueInhalt(d),
  laden: (d) => ladenInhalt(d),
  versand: () => versandInhalt(),
  truhe: (d) => truheInhalt(d),
  muehle: () => muehleInhalt(),
  brett: () => brettInhalt(),
  aufzug: () => aufzugInhalt(),
  brief: (d) => briefInhalt(d),
  tagEnde: (d) => tagEndeInhalt(d),
};

// Menü mit Reitern

function menueOeffnen(reiter) {
  ton('menue');
  fensterOeffnen('menue', { reiter, auswahl: null, aufgenommen: null });
}

const REITER = [['rucksack', 'Rucksack'], ['basteln', 'Basteln'], ['faehigkeiten', 'Fähigkeiten'], ['freunde', 'Freunde'], ['aufgaben', 'Aufgaben'], ['optionen', 'Optionen']];

function menueInhalt(d) {
  const reiter = el('nav', { class: 'reiter', 'aria-label': 'Menü' }, REITER.map(([id, name]) => el('button', {
    type: 'button', class: d.reiter === id ? 'aktiv' : '', 'aria-pressed': d.reiter === id ? 'true' : 'false',
    onclick: () => { d.reiter = id; ton('menue'); fensterNeu(); },
  }, name)));
  const inhalt = { rucksack: rucksackReiter, basteln: bastelReiter, faehigkeiten: faehigkeitenReiter, freunde: freundeReiter, aufgaben: aufgabenReiter, optionen: optionenReiter }[d.reiter](d);
  return fenster(`${S.s.spieler.name} · ${S.s.spieler.hof}`, el('div', {}, reiter, inhalt), { klasse: 'breit', kopfExtra: goldAnzeige() });
}

function rucksackReiter(d) {
  const s = S.s;
  const sp = s.spieler;
  const klick = (i) => {
    if (d.aufgenommen != null && d.aufgenommen !== i) {
      L.tauschen(s, d.aufgenommen, i);
      d.aufgenommen = null;
      d.auswahl = i;
      ton('menue');
    } else if (d.aufgenommen === i) {
      d.aufgenommen = null;
    } else {
      d.auswahl = i;
      d.aufgenommen = sp.inv[i] ? i : null;
    }
    fensterNeu();
  };
  const slot = d.auswahl != null ? sp.inv[d.auswahl] : null;
  const aktionen = [];
  if (slot && L.essbar(slot)) aktionen.push(el('button', { type: 'button', class: 'knopf', onclick: () => { essenAus(d.auswahl); d.aufgenommen = null; fensterNeu(); } }, 'Essen'));
  if (slot && d.auswahl >= 12) {
    aktionen.push(el('button', { type: 'button', class: 'knopf', onclick: () => { L.tauschen(s, d.auswahl, sp.wahl); d.auswahl = sp.wahl; d.aufgenommen = null; fensterNeu(); } }, 'In die Hand nehmen'));
  } else if (slot && d.auswahl < 12) {
    aktionen.push(el('button', { type: 'button', class: 'knopf', onclick: () => { sp.wahl = d.auswahl; fensterSchliessen(); } }, 'In die Hand nehmen'));
  }
  const figur = SP.figurBild(sp.aussehen, 'unten', 0).toDataURL();
  return el('div', { class: 'rucksack' },
    el('div', { class: 'spalte-haupt' },
      el('p', { class: 'leise' }, d.aufgenommen != null ? 'Jetzt auf einen anderen Platz tippen, um zu tauschen.' : 'Erste Reihe = Werkzeugleiste. Tippen wählt aus, ein zweiter Tipp auf einen anderen Platz tauscht.'),
      invGitter(klick, { aktivIdx: d.aufgenommen ?? d.auswahl })),
    el('aside', { class: 'spalte-info' },
      itemInfo(slot),
      aktionen.length ? el('div', { class: 'knopf-reihe' }, aktionen) : null,
      el('div', { class: 'figur-karte' }, bild(figur, 'pixel figur-gross'),
        el('div', {}, el('strong', {}, sp.name), el('div', { class: 'leise' }, sp.hof), el('div', { class: 'leise' }, `Jahr ${s.zeit.jahr}`)))));
}

function bastelReiter() {
  const s = S.s;
  return el('div', { class: 'liste' }, REZEPTE.map((r) => {
    const frei = L.rezeptFrei(s, r);
    const kann = L.kannBasteln(s, r);
    const it = ITEMS[r.id];
    return el('div', { class: `zeile${frei ? '' : ' gesperrt'}` },
      itemIcon({ id: r.id }),
      el('div', { class: 'zeile-text' },
        el('strong', {}, `${it.name}${r.menge ? ` ×${r.menge}` : ''}`),
        el('div', { class: 'zutaten' }, frei
          ? Object.entries(r.zutaten).map(([id, n]) => {
            const hat = L.anzahl(s, id);
            return el('span', { class: `zutat${hat >= n ? ' ok' : ''}` }, itemIcon({ id }), `${Math.min(hat, n)}/${n} ${ITEMS[id].name}`);
          })
          : el('span', { class: 'leise' }, `Ab ${FAEHIGKEITEN[r.stufe[0]]} Stufe ${r.stufe[1]}`)),
        frei ? el('div', { class: 'leise klein' }, it.text) : null),
      el('button', {
        type: 'button', class: 'knopf', disabled: !kann,
        onclick: () => {
          const erg = L.basteln(s, r);
          if (erg?.grund) meldungZeigen(erg.grund);
          if (erg?.ok) { ton('pop'); fundeZeigen([erg.slot]); }
          fensterNeu();
        },
      }, 'Basteln'));
  }));
}

function faehigkeitenReiter() {
  const s = S.s;
  const sp = s.spieler;
  const vorteile = {
    landwirtschaft: 'Bessere Erntequalität, weniger Mühe mit Hacke und Kanne. Schaltet Sprenger und Einmachglas frei.',
    angeln: 'Breiterer Fangbalken und bessere Fische. Ab Stufe 2: Köder basteln.',
    sammeln: 'Weniger Mühe mit der Axt, bessere Funde.',
    bergbau: 'Weniger Mühe mit der Spitzhacke, mehr Erz.',
    kampf: 'Mehr Gesundheit und kräftigere Schwerthiebe.',
  };
  return el('div', { class: 'faehigkeiten' },
    el('div', { class: 'liste' }, Object.entries(FAEHIGKEITEN).map(([id, name]) => {
      const lvl = L.stufe(s, id);
      const xp = sp.xp[id];
      const von = lvl ? XP_STUFEN[lvl - 1] : 0;
      const bis = XP_STUFEN[lvl] ?? XP_STUFEN[9];
      const anteil = lvl >= 10 ? 1 : (xp - von) / (bis - von);
      return el('div', { class: 'zeile' },
        el('div', { class: 'stufe-zahl', 'aria-label': `Stufe ${lvl}` }, lvl),
        el('div', { class: 'zeile-text' }, el('strong', {}, name),
          el('div', { class: 'balken', role: 'progressbar', 'aria-valuenow': Math.round(anteil * 100), 'aria-valuemin': 0, 'aria-valuemax': 100 }, el('div', { style: `width:${anteil * 100}%` })),
          el('div', { class: 'leise klein' }, lvl >= 10 ? 'Meisterstufe' : `${xp - von} / ${bis - von} Erfahrung bis Stufe ${lvl + 1}`),
          el('div', { class: 'leise klein' }, vorteile[id])));
    })),
    el('h3', {}, 'Werkzeuge'),
    el('div', { class: 'werkzeug-reihe' }, AUFRUESTBAR.map((id) => el('div', { class: 'werkzeug-karte' }, itemIcon({ id }), el('span', {}, L.werkzeugName(id, sp.werkzeug[id])), el('span', { class: 'leise klein' }, WERKZEUG_STUFEN[sp.werkzeug[id]].name)))),
    el('h3', {}, 'Bisher'),
    el('dl', { class: 'statistik' },
      el('dt', {}, 'Tage auf dem Hof'), el('dd', {}, s.stats.tage),
      el('dt', {}, 'Verdient'), el('dd', {}, `${zahl.format(s.stats.verdient)} g`),
      el('dt', {}, 'Geerntet'), el('dd', {}, s.stats.geerntet),
      el('dt', {}, 'Fische gefangen'), el('dd', {}, s.stats.gefangen),
      el('dt', {}, 'Bäume gefällt'), el('dd', {}, s.stats.baeume),
      el('dt', {}, 'Tiefste Minenebene'), el('dd', {}, s.mine.tiefste),
      el('dt', {}, 'Aufträge erledigt'), el('dd', {}, s.stats.auftraege)));
}

function freundeReiter() {
  const s = S.s;
  return el('div', { class: 'freunde' }, Object.entries(NPCS).map(([id, n]) => {
    const st = s.npcs[id];
    const herz = L.herzen(s, id);
    return el('div', { class: 'freund rahmen-leicht' },
      bild(portraet(id), 'pixel portraet-klein'),
      el('div', { class: 'zeile-text' },
        el('strong', {}, n.voll), el('div', { class: 'leise klein' }, `${n.rolle} · Geburtstag ${n.geburtstag.tag}. ${JZ_NAME[n.geburtstag.jz]}`),
        el('div', { class: 'herzen', 'aria-label': `${herz} von ${MAX_HERZEN} Herzen` }, Array.from({ length: MAX_HERZEN }, (_, i) => bild(SP.symbolUrl(i < herz ? 'herz' : 'herzLeer'), 'pixel'))),
        el('div', { class: 'chips' },
          el('span', { class: `chip${st.gesprochen ? ' ok' : ''}` }, st.gesprochen ? 'Gesprochen' : 'Gespräch offen'),
          el('span', { class: `chip${st.beschenkt ? ' ok' : ''}` }, st.beschenkt ? 'Beschenkt' : 'Geschenk offen'))));
  }));
}

function aufgabenReiter() {
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
  const fertig = BUENDEL.filter((b) => L.buendelFertig(s, b)).length;
  teile.push(el('p', { class: 'leise' }, s.muehle ? 'Die Mühle dreht sich wieder. Klarwasser feiert dich.' : `${fertig} von ${BUENDEL.length} Bündeln vollständig. Spenden nimmt die Mühle am Fluss entgegen.`));
  teile.push(el('div', { class: 'buendel-mini' }, BUENDEL.map((b) => el('span', { class: `chip${L.buendelFertig(s, b) ? ' ok' : ''}` }, `${b.name} ${(s.buendel[b.id] || []).length}/${L.buendelNoetig(b)}`))));
  teile.push(el('h3', {}, 'Briefe'));
  const gelesen = s.briefe.filter((id) => L.briefVon(id));
  teile.push(gelesen.length
    ? el('div', { class: 'knopf-reihe' }, gelesen.map((id) => el('button', { type: 'button', class: 'knopf klein', onclick: () => fensterOeffnen('brief', { id, archiv: true }) }, L.briefVon(id).von.split(',')[0])))
    : el('p', { class: 'leise' }, 'Noch keine Briefe.'));
  return el('div', { class: 'aufgaben' }, teile);
}

function optionenReiter() {
  const e = einstellungen();
  const umschalter = (label, an, fn) => el('label', { class: 'umschalter' }, el('input', { type: 'checkbox', checked: an, onchange: (ev) => fn(ev.target.checked) }), label);
  const gespeichert = el('span', { class: 'leise', role: 'status' });
  return el('div', { class: 'optionen' },
    el('div', { class: 'knopf-reihe' },
      umschalter('Geräusche', e.ton, (v) => { einstellen({ ton: v }); merken(); }),
      umschalter('Musik', e.musik, (v) => { einstellen({ musik: v }); merken(); })),
    el('h3', {}, 'Steuerung'),
    el('dl', { class: 'steuerung' },
      el('dt', {}, 'Bewegen'), el('dd', {}, 'WASD oder Pfeiltasten · Touch: Stick links'),
      el('dt', {}, 'Werkzeug benutzen'), el('dd', {}, 'Linksklick, Leertaste oder C · gedrückt halten wiederholt oder lädt auf'),
      el('dt', {}, 'Reden, ernten, öffnen'), el('dd', {}, 'Rechtsklick, E oder X · Touch: „Aktion" oder aufs Nachbarfeld tippen'),
      el('dt', {}, 'Werkzeug wählen'), el('dd', {}, '1–0, ß, ´ · Mausrad · Q und R'),
      el('dt', {}, 'Essen'), el('dd', {}, 'F, oder im Rucksack'),
      el('dt', {}, 'Rucksack · Basteln'), el('dd', {}, 'I oder Tab · K · Esc schließt')),
    el('h3', {}, 'Spielstand'),
    el('p', { class: 'leise' }, 'Jeden Morgen wird automatisch gespeichert. Der Spielstand liegt nur in diesem Browser.'),
    el('div', { class: 'knopf-reihe' },
      el('button', { type: 'button', class: 'knopf', onclick: () => { gespeichert.textContent = speichern() ? 'Gespeichert.' : 'Speichern ist hier nicht möglich.'; } }, 'Jetzt speichern'),
      el('button', { type: 'button', class: 'knopf', onclick: () => { speichern(); offen = null; $('#fenster').hidden = true; titelZeigen(); } }, 'Speichern und zum Titel'),
      gespeichert));
}

function merken() {
  try { localStorage.setItem('klarwasser-hof-einstellungen', JSON.stringify(einstellungen())); } catch { /* egal */ }
}
export function einstellungenLaden() {
  try { const e = JSON.parse(localStorage.getItem('klarwasser-hof-einstellungen')); if (e) einstellen(e); } catch { /* egal */ }
}

// Laden

function wareIcon(w) {
  if (w.id) return itemIcon({ id: w.id });
  if (w.spezial === 'upgrade') return bild(SP.itemDatenUrl({ id: w.werkzeug }, w.stufe));
  if (w.spezial === 'kueken' || w.spezial === 'stall') return bild(SP.huhnBild(0, true).toDataURL());
  if (w.spezial === 'rucksack') return bild(SP.symbolUrl('rucksack'));
  return itemIcon({ id: 'truhe' });
}

function ladenInhalt(d) {
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
            if (erg.grund) { meldungZeigen(erg.grund, 'warn'); ton('dumpf'); }
            else {
              ton('geld');
              if (w.spezial === 'upgrade') meldungZeigen(`Fertig! Deine ${name} fühlt sich gleich ganz anders an.`, 'gut');
              else if (w.spezial === 'stall') meldungZeigen('Bruno baut deinen Hühnerstall heute Nacht.', 'gut');
              else if (w.spezial === 'kueken') meldungZeigen('Ein Küken ist in deinen Stall gezogen.', 'gut');
              else if (w.spezial === 'rucksack') meldungZeigen('Dein Rucksack hat jetzt 36 Plätze.', 'gut');
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
        if (erg) { ton('geld'); meldungZeigen(`+${erg.gold} g`); }
        fensterNeu();
      }, { dimme: (slot) => slot && !L.kauftLaden(d.laden, slot), markiere: (slot) => L.kauftLaden(d.laden, slot) }));
  }
  return fenster(l.name, el('div', {}, kopf, reiter, inhalt), { klasse: 'breit', kopfExtra: goldAnzeige() });
}

// Versandkiste

function versandInhalt() {
  const s = S.s;
  const liste = s.versand.map((slot) => el('div', { class: 'versand-zeile' }, itemIcon(slot), el('span', {}, `${slot.n}× ${L.nameVon(slot, s)}`), el('span', { class: 'preis' }, `${zahl.format(L.preisVon(slot) * slot.n)} g`)));
  return fenster('Versandkiste', el('div', { class: 'zweispaltig' },
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
}

// Truhe

function truheInhalt(d) {
  const s = S.s;
  const t = d.truhe;
  return fenster('Truhe', el('div', {},
    el('p', { class: 'leise' }, 'Tippe einen Stapel an, um ihn umzulagern.'),
    el('h3', {}, 'In der Truhe'),
    el('div', { class: 'inv-gitter' }, t.inv.map((slot, i) => slotKnopf(slot, i, { klick: () => { L.umlagern(t.inv, i, s.spieler.inv); ton('menue'); fensterNeu(); } }))),
    el('h3', {}, 'Rucksack'),
    invGitter((i) => { L.umlagern(s.spieler.inv, i, t.inv); ton('menue'); fensterNeu(); })), { klasse: 'breit' });
}

// Mühle

function muehleInhalt() {
  const s = S.s;
  const passend = (slot) => !!slot && BUENDEL.some((b) => L.buendelPlatz(s, b, slot) >= 0);
  const karten = BUENDEL.map((b) => {
    const geg = s.buendel[b.id] || [];
    const fertig = L.buendelFertig(s, b);
    const belohnung = b.belohnung.gold ? `${zahl.format(b.belohnung.gold)} g` : `${b.belohnung.n}× ${ITEMS[b.belohnung.id].name}`;
    return el('div', { class: `buendel rahmen-leicht${fertig ? ' fertig' : ''}` },
      el('div', { class: 'buendel-kopf' }, el('strong', {}, b.name), el('span', { class: 'chip' }, `${geg.length}/${L.buendelNoetig(b)}`)),
      el('div', { class: 'buendel-items' }, L.buendelEintraege(b).map((e, j) => {
        const da = geg.includes(j);
        return el('span', { class: `buendel-item${da ? ' da' : ''}`, title: `${e.n > 1 ? `${e.n}× ` : ''}${ITEMS[e.id].name}${da ? ' (gespendet)' : ''}` }, itemIcon({ id: e.id }), e.n > 1 ? el('span', { class: 'anzahl' }, e.n) : null);
      })),
      el('div', { class: 'leise klein' }, b.noetig ? `${b.noetig} von ${b.items.length} genügen · ` : '', `Belohnung: ${belohnung}`));
  });
  return fenster('Die alte Mühle', el('div', {},
    el('p', { class: 'leise' }, s.muehle ? 'Das Mühlrad dreht sich wieder. Ganz Klarwasser kommt vorbei, um es zu sehen.' : 'Frieda hat eine Tafel aufgestellt. Jede Gabe bringt das alte Rad ein Stück näher ans Laufen. Leuchtende Plätze im Rucksack passen in ein Bündel.'),
    el('div', { class: 'buendel-gitter' }, karten),
    el('h3', {}, 'Rucksack'),
    invGitter((i) => {
      const slot = s.spieler.inv[i];
      const b = BUENDEL.find((x) => L.buendelPlatz(s, x, slot) >= 0);
      if (!b) return;
      const erg = L.spenden(s, b.id, i, S.ort);
      if (!erg) return;
      if (erg.grund) { meldungZeigen(erg.grund, 'warn'); fensterNeu(); return; }
      ton('pop');
      if (erg.fertig) { ton('fanfare'); meldungZeigen(`Bündel „${erg.fertig.name}" vollständig!`, 'gut'); if (erg.gold) meldungZeigen(`+${zahl.format(erg.gold)} g`, 'gut'); }
      if (erg.items.length) fundeZeigen(erg.items);
      fensterNeu();
      if (erg.muehle) {
        fensterSchliessen();
        dialogZeigen('frieda', [
          `${S.s.spieler.name}! Hörst du das? Das Rad! Es dreht sich!`,
          'Ganz Klarwasser hat zusammengelegt, aber ohne dich hätten wir es nie geschafft.',
          'Diese Medaille hat meine Großmutter für den Tag aufbewahrt, an dem die Mühle wieder läuft. Sie gehört dir.',
        ]);
      }
    }, { markiere: (slot) => passend(slot), dimme: (slot) => slot && !passend(slot) })), { klasse: 'breit' });
}

// Schwarzes Brett

function brettInhalt() {
  const s = S.s;
  let inhalt;
  if (s.brett) {
    const b = s.brett;
    inhalt = el('div', { class: 'papier' },
      el('p', {}, b.text), el('p', { class: 'unterschrift' }, `– ${NPCS[b.npc].name}`),
      el('p', { class: 'klein' }, `Belohnung: ${b.belohnung} g · Drei Tage Zeit`),
      el('button', { type: 'button', class: 'knopf', onclick: () => { L.questAnnehmen(s); ton('pop'); meldungZeigen('Auftrag angenommen.', 'gut'); fensterNeu(); } }, 'Auftrag annehmen'));
  } else if (s.quest) {
    const q = s.quest;
    inhalt = el('div', { class: 'papier' },
      el('p', {}, `Angenommen: ${q.n}× ${ITEMS[q.id].name} für ${NPCS[q.npc].name}.`),
      el('p', { class: 'klein' }, `Belohnung: ${q.belohnung} g · noch ${Math.max(0, q.frist - L.tagNr(s.zeit))} Tage`),
      el('p', { class: 'klein' }, 'Halte die Ware in der Hand und sprich die Person an.'));
  } else {
    inhalt = el('div', { class: 'papier' }, el('p', {}, 'Heute hängt nichts Neues am Brett. Schau morgen wieder vorbei.'));
  }
  return fenster('Schwarzes Brett', inhalt);
}

// Förderkorb

function aufzugInhalt() {
  const s = S.s;
  const ebenen = [];
  for (let n = 5; n <= Math.min(MINE_TIEFE, s.mine.tiefste); n += 5) ebenen.push(n);
  return fenster('Förderkorb', el('div', {},
    el('p', { class: 'leise' }, `Tiefste erreichte Ebene: ${s.mine.tiefste}. Der Korb hält alle fünf Ebenen.`),
    el('div', { class: 'knopf-reihe' },
      el('button', { type: 'button', class: 'knopf', onclick: () => { fensterSchliessen(); aufzugFahren(1); } }, 'Ebene 1'),
      ebenen.map((n) => el('button', { type: 'button', class: 'knopf', onclick: () => { fensterSchliessen(); aufzugFahren(n); } }, `Ebene ${n}`)))));
}

// Briefe

function briefInhalt(d) {
  const s = S.s;
  let von;
  let text;
  if (d.text) { von = d.von; text = d.text; }
  else { const b = L.briefVon(d.id); von = b.von; text = b.text; }
  const ersetzt = text.replaceAll('{name}', s.spieler.name).replaceAll('{hof}', s.spieler.hof);
  if (!d.archiv && d.id) d.danach = () => { L.briefGelesen(s, d.id); if (d.weiter) postZeigen(false); };
  return fenster('Post', el('div', { class: 'papier brief' }, ersetzt.split('\n\n').map((abs) => el('p', {}, abs.split('\n').flatMap((z, i) => (i ? [el('br'), z] : [z])))),
    el('p', { class: 'unterschrift' }, von),
    el('button', { type: 'button', class: 'knopf', onclick: fensterSchliessen }, 'Weiter')));
}

// Tagesende

function tagEndeInhalt(d) {
  const s = S.s;
  const b = d.bericht;
  const z = s.zeit;
  const teile = [];
  if (d.ohnmacht && b.ohnmacht != null) teile.push(el('p', { class: 'warn' }, `Du bist erschöpft zusammengebrochen. Jemand hat dich nach Hause gebracht. ${b.ohnmacht ? `Dabei sind ${zahl.format(b.ohnmacht)} g verloren gegangen.` : ''}`));
  if (b.verkauf.length) {
    teile.push(el('h3', {}, 'Verkauft'));
    teile.push(el('div', { class: 'verkauf-liste' }, b.verkauf.map(({ slot, preis }) => el('div', { class: 'versand-zeile' }, itemIcon(slot), el('span', {}, `${slot.n}× ${L.nameVon(slot, s)}`), el('span', { class: 'preis' }, `${zahl.format(preis)} g`)))));
    teile.push(el('div', { class: 'summe' }, 'Zusammen: ', el('strong', {}, `${zahl.format(b.summe)} g`)));
  } else teile.push(el('p', { class: 'leise' }, 'Die Versandkiste war leer.'));
  if (b.stufen.length) {
    teile.push(el('h3', {}, 'Gelernt'));
    for (const st of b.stufen) {
      const rezepte = REZEPTE.filter((r) => r.stufe && r.stufe[0] === st.skill && r.stufe[1] === st.stufe).map((r) => ITEMS[r.id].name);
      teile.push(el('p', {}, `${FAEHIGKEITEN[st.skill]}: Stufe ${st.stufe}${rezepte.length ? ` · Neues Rezept: ${rezepte.join(', ')}` : ''}`));
    }
  }
  for (const m of b.meldungen) teile.push(el('p', {}, m));
  const wetter = { sonne: 'Sonnig', regen: 'Regen', sturm: 'Gewitter', schnee: 'Schnee' }[z.wetter];
  teile.push(el('p', { class: 'morgen' }, bild(SP.symbolUrl(z.wetter)), `${L.wochentag(z)}, ${z.tag}. ${JZ_NAME[JZ[z.jz]]}, Jahr ${z.jahr} · ${wetter}`));
  return fenster('Gute Nacht', el('div', { class: 'tag-ende' }, teile,
    el('button', { type: 'button', class: 'knopf gross', autofocus: true, onclick: () => { offen = null; $('#fenster').hidden = true; $('#fenster').replaceChildren(); neuerMorgen(); } }, 'Guten Morgen!')), { schliessbar: false });
}

// ─── Titel und neues Spiel ──────────────────────────────────────────────────

let titelAktiv = false;

function gespeichert() {
  try {
    const t = localStorage.getItem(L.SPEICHER_SCHLUESSEL);
    return t ? L.deserialisieren(t) : null;
  } catch {
    return null;
  }
}

export function titelZeigen() {
  titelAktiv = true;
  dialog = null;
  $('#dialog').hidden = true;
  $('#fenster').hidden = true;
  $('#hud').hidden = true;
  const demo = L.neuesSpiel({ seed: 20261017 });
  demo.spieler.karte = 'hof';
  demo.spieler.x = 20;
  demo.spieler.y = 12;
  demo.zeit.minute = 600;
  spielStarten(demo, hooks, { demo: true });
  musikStimmung('fruehling');
  const stand = gespeichert();
  const t = $('#titel');
  t.hidden = false;
  t.replaceChildren(el('div', { class: 'titel-inhalt' },
    el('h1', { class: 'logo' }, 'Klarwasser-Hof'),
    el('p', { class: 'untertitel' }, 'Ein verwilderter Hof, ein kleines Dorf am Fluss und vier Jahreszeiten, um etwas daraus zu machen.'),
    el('div', { class: 'titel-knoepfe' },
      stand ? el('button', { type: 'button', class: 'knopf gross', onclick: () => spielBeginnen(stand, false) },
        'Weiterspielen', el('span', { class: 'klein' }, `${stand.spieler.hof} · ${stand.zeit.tag}. ${JZ_NAME[JZ[stand.zeit.jz]]}, Jahr ${stand.zeit.jahr}`)) : null,
      el('button', { type: 'button', class: `knopf${stand ? '' : ' gross'}`, onclick: neuesSpielFormular }, 'Neues Spiel')),
    el('p', { class: 'titel-fuss' }, 'Musik und Geräusche starten mit der ersten Taste. Gespeichert wird in diesem Browser.')));
}

const AUSWAHL = {
  frisur: [['kurz', 'Kurz'], ['lang', 'Lang'], ['zopf', 'Zopf'], ['locken', 'Locken'], ['dutt', 'Dutt']],
  haare: ['#6b4428', '#2a1d18', '#d8b04a', '#c8562e', '#8a8a96', '#4a6aa8'],
  haut: ['#f6d2b0', '#f0c8a0', '#d8a070', '#b97f58', '#8a5a3a'],
  hemd: ['#c8553d', '#3f7ab8', '#4f9a5a', '#e8c24a', '#8a5aa8', '#e8e0d0'],
  hose: ['#3b4a6b', '#4a3a2a', '#2a2a30', '#6a7a4a'],
};

function neuesSpielFormular() {
  const t = $('#titel');
  const a = { frisur: 'kurz', haare: AUSWAHL.haare[0], haut: AUSWAHL.haut[1], hemd: AUSWAHL.hemd[0], hose: AUSWAHL.hose[0] };
  const vorschau = el('canvas', { width: 16, height: 24, class: 'pixel vorschau', 'aria-label': 'Vorschau deiner Figur' });
  let richtung = 0;
  const zeichneVorschau = () => {
    const g = vorschau.getContext('2d');
    g.clearRect(0, 0, 16, 24);
    g.drawImage(SP.figurBild(a, ['unten', 'rechts', 'oben', 'links'][richtung], 0), 0, 0);
  };
  const farbwahl = (feld, titel) => el('fieldset', { class: 'farbwahl' }, el('legend', {}, titel), AUSWAHL[feld].map((f, i) => el('label', { class: 'farbe', style: `--f:${f}` },
    el('input', { type: 'radio', name: feld, value: f, checked: a[feld] === f, onchange: () => { a[feld] = f; zeichneVorschau(); } }), el('span', { class: 'sr' }, `${titel} ${i + 1}`))));
  const name = el('input', { id: 'neuName', type: 'text', maxlength: 14, value: 'Liesel', autocomplete: 'off' });
  const hof = el('input', { id: 'neuHof', type: 'text', maxlength: 18, value: 'Sonnenhof', autocomplete: 'off' });
  const fehler = el('p', { class: 'warn', role: 'alert' });
  const form = el('form', { class: 'neu rahmen', onsubmit: (e) => {
    e.preventDefault();
    const n = name.value.trim();
    const h = hof.value.trim();
    if (!n || !h) { fehler.textContent = 'Bitte gib dir und deinem Hof einen Namen.'; return; }
    const s = L.neuesSpiel({ name: n, hof: h, aussehen: { ...a } });
    spielBeginnen(s, true);
  } },
    el('h2', {}, 'Wer übernimmt den Hof?'),
    el('div', { class: 'neu-raster' },
      el('div', { class: 'neu-felder' },
        el('label', { for: 'neuName' }, 'Dein Name'), name,
        el('label', { for: 'neuHof' }, 'Name des Hofs'), hof,
        el('fieldset', { class: 'frisurwahl' }, el('legend', {}, 'Frisur'), AUSWAHL.frisur.map(([id, label]) => el('label', { class: 'chip-wahl' },
          el('input', { type: 'radio', name: 'frisur', value: id, checked: a.frisur === id, onchange: () => { a.frisur = id; zeichneVorschau(); } }), el('span', {}, label)))),
        farbwahl('haare', 'Haarfarbe'), farbwahl('haut', 'Hautton'), farbwahl('hemd', 'Hemd'), farbwahl('hose', 'Hose')),
      el('div', { class: 'neu-vorschau' }, vorschau,
        el('button', { type: 'button', class: 'knopf klein', onclick: () => { richtung = (richtung + 1) % 4; zeichneVorschau(); } }, 'Drehen'))),
    fehler,
    el('div', { class: 'knopf-reihe' },
      el('button', { type: 'button', class: 'knopf', onclick: titelZeigen }, 'Zurück'),
      el('button', { type: 'submit', class: 'knopf gross' }, 'Auf zum Hof')));
  t.replaceChildren(el('div', { class: 'titel-inhalt' }, form));
  zeichneVorschau();
  name.focus();
}

export function spielBeginnen(s, neu) {
  titelAktiv = false;
  $('#titel').hidden = true;
  $('#hud').hidden = false;
  hotbarSignatur = '';
  letzteAnzeige = '';
  spielStarten(s, hooks);
  if (neu) {
    speichern();
    const touch = document.body.classList.contains('touch');
    const steuerung = touch
      ? 'Stick: laufen · Benutzen: Werkzeug · Aktion: reden, ernten, öffnen · Menü: Rucksack und mehr'
      : 'WASD: laufen · Leertaste oder Linksklick: Werkzeug · E oder Rechtsklick: reden, ernten, öffnen · I: Rucksack';
    fensterOeffnen('brief', { text: OMA_BRIEF, von: 'Oma Liesel', danach: () => { postZeigen(false); meldungZeigen(steuerung); } });
  } else if (s.post.length) postZeigen(false);
}

export const titelOffen = () => titelAktiv;
export { zustandSichern };
