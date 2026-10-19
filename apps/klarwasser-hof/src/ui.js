// Oberfläche aus DOM: Anzeige, Werkzeugleiste, Gespräche, Fenster, Titel.
//
// Register für die Bereiche (src/bereiche/*/oberflaeche.js):
//   FENSTER        Name → bau(daten) → Element      (fensterArt)
//   MENUE_REITER   [{ id, name, bauen(d), reihe }]  (menueReiter)
//   HUD_ELEMENTE   [{ id, bauen(), aktualisieren(el, s), reihe }]  (hudElement)
//   WARE_BILD      Spezialware → (ware) → Element   (wareBild)
//   STATISTIK      [{ id, name, wert(s), reihe }]   (statistik)
// Dazu die Bau-Helfer (el, bild, itemIcon, slotKnopf, invGitter, portraet, fensterRahmen …).
// Kern-Fenster: menue, brief, tagEnde. Kern-Reiter: Rucksack, Basteln, Fähigkeiten, Freunde, Optionen.

import {
  ITEMS, NPCS, REZEPTE, BRIEFE, FAEHIGKEITEN, XP_STUFEN, JZ_NAME, WERKZEUG_STUFEN,
  AUFRUESTBAR, KANNE_INHALT, KATEGORIE_NAME, MAX_HERZEN, JZ,
} from './daten.js';
import * as L from './logik.js';
import * as SP from './sprites.js';
import {
  S, spielStarten, neuerMorgen, speichern, essenAus, postZeigen, zustandSichern,
} from './spiel.js';
import { E, eingabeLeeren } from './eingabe.js';
import { ton, einstellen, einstellungen, musikStimmung } from './ton.js';

export const $ = (sel) => document.querySelector(sel);
export const zahl = new Intl.NumberFormat('de-DE');
const KURZTAG = { Montag: 'Mo', Dienstag: 'Di', Mittwoch: 'Mi', Donnerstag: 'Do', Freitag: 'Fr', Samstag: 'Sa', Sonntag: 'So' };
const TASTEN = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'ß', '´'];
export { ton };

// ─── Register ───────────────────────────────────────────────────────────────

/** Name → bau(daten) → Element (meist fensterRahmen(…)). */
export const FENSTER = {};
export function fensterArt(name, bau, opt = {}) {
  if (FENSTER[name] && !opt.ersetzen) throw new Error(`Fenster „${name}" gibt es schon.`);
  FENSTER[name] = bau;
}

/** Reiter im Menü, sortiert nach `reihe` (Kern: 10 Rucksack … 40 Freunde, 90 Optionen). */
export const MENUE_REITER = [];
export function menueReiter(def) {
  if (MENUE_REITER.some((r) => r.id === def.id) && !def.ersetzen) throw new Error(`Menüreiter „${def.id}" gibt es schon.`);
  const i = MENUE_REITER.findIndex((r) => r.id === def.id);
  if (i >= 0) MENUE_REITER.splice(i, 1);
  MENUE_REITER.push({ reihe: 50, ...def });
  MENUE_REITER.sort((a, b) => a.reihe - b.reihe);
}

/** Eigene Anzeigen im HUD: bauen() → Element, aktualisieren(el, s) jedes Bild, solange gespielt wird. */
export const HUD_ELEMENTE = [];
export function hudElement(def) {
  if (HUD_ELEMENTE.some((h) => h.id === def.id)) throw new Error(`HUD-Element „${def.id}" gibt es schon.`);
  const h = { reihe: 50, ...def, el: null };
  HUD_ELEMENTE.push(h);
  HUD_ELEMENTE.sort((a, b) => a.reihe - b.reihe);
  if (typeof document !== 'undefined' && $('#hud')?.childElementCount) hudElementEinbauen(h);
}
function hudElementEinbauen(h) {
  h.el = h.bauen();
  if (h.id && !h.el.id) h.el.id = h.id;
  $('#hud').append(h.el);
}

/** Bild einer Spezialware im Laden: wareBild('kueken', (ware) => Element). */
export const WARE_BILD = {};
export function wareBild(spezial, fn) {
  if (WARE_BILD[spezial]) throw new Error(`Warenbild „${spezial}" gibt es schon.`);
  WARE_BILD[spezial] = fn;
}

/** Zeilen der Statistik im Reiter Fähigkeiten. */
export const STATISTIK = [];
export function statistik(def) {
  if (STATISTIK.some((z) => z.id === def.id)) throw new Error(`Statistik „${def.id}" gibt es schon.`);
  STATISTIK.push({ reihe: 50, ...def });
  STATISTIK.sort((a, b) => a.reihe - b.reihe);
}

// ─── Bau-Helfer ─────────────────────────────────────────────────────────────

/** el('div', { class, onclick, … }, ...kinder) – Kinder dürfen Listen, Texte, null sein. */
export function el(tag, attrs = {}, ...kinder) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    // Werte für das Stylesheet als Custom Properties, nie als style-Attribut
    else if (k === 'vars') for (const [name, wert] of Object.entries(v)) e.style.setProperty(name, wert);
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const kind of kinder.flat(Infinity)) {
    if (kind == null || kind === false) continue;
    e.append(kind instanceof Node ? kind : document.createTextNode(String(kind)));
  }
  return e;
}
export const bild = (src, klasse = 'pixel', alt = '') => el('img', { src, class: klasse, alt, draggable: 'false' });
/** Bild einer Leinwand aus sprites.js als <img>. */
export const leinwandBild = (c, klasse) => bild(c.toDataURL(), klasse);
export const symbol = (art, klasse) => bild(SP.symbolUrl(art), klasse);
/** Qualitätsstern: 1 Silber, 2 Gold, 3 Iridium. */
export const sternSymbol = (q) => (q >= 3 ? 'iridiumstern' : q === 2 ? 'goldstern' : 'silber');
export const itemIcon = (slot) => bild(SP.itemDatenUrl(slot, ITEMS[slot.id]?.kat === 'werkzeug' ? (S.s?.spieler.werkzeug[slot.id] || 0) : 0));
const portraitCache = new Map();
/** Porträt eines Dorfbewohners als Daten-URL. */
export function portraet(id) {
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
      el('div', { class: 'uhr-zeile gold' }, symbol('gold'), el('span', { id: 'gold' }))),
    el('div', { id: 'leisten' },
      el('div', { class: 'leiste hp', id: 'hpLeiste', title: 'Gesundheit' }, el('div', { class: 'fuellung' }), symbol('hp')),
      el('div', { class: 'leiste energie', id: 'energieLeiste', title: 'Energie' }, el('div', { class: 'fuellung' }), symbol('energie'))),
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
  for (const h of HUD_ELEMENTE) hudElementEinbauen(h);
  touchStarten();
  hooks = {
    ton,
    meldung: meldungZeigen,
    funde: fundeZeigen,
    dialog: dialogZeigen,
    frage,
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
    knopf.style.setProperty('--dx', dx);
    knopf.style.setProperty('--dy', dy);
  };
  stick.addEventListener('pointerdown', (e) => { id = e.pointerId; stick.setPointerCapture(id); setzen(e); e.preventDefault(); });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === id) setzen(e); });
  const los = (e) => { if (e.pointerId !== id) return; id = null; E.touch.x = 0; E.touch.y = 0; knopf.style.removeProperty('--dx'); knopf.style.removeProperty('--dy'); };
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
  const def = S.ort?.def;
  const en = $('#energieLeiste');
  en.querySelector('.fuellung').style.setProperty('--anteil', sp.energie / sp.maxEnergie);
  en.classList.toggle('niedrig', sp.energie < 40);
  const hp = $('#hpLeiste');
  // Gesundheit zeigen, wo gekämpft wird (Mine, Karten mit `kampf: true`) oder wenn sie fehlt
  hp.hidden = !(def?.innen === 'mine' || def?.kampf || sp.hp < sp.maxHp);
  hp.querySelector('.fuellung').style.setProperty('--anteil', sp.hp / sp.maxHp);

  const sig = `${sp.wahl}|${sp.inv.slice(0, 12).map((x) => (x ? `${x.id}:${x.n}:${x.q || 0}:${x.von || ''}` : '-')).join(',')}|${AUFRUESTBAR.map((id) => sp.werkzeug[id] || 0).join('')}`;
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

  for (const e of HUD_ELEMENTE) if (e.el && e.aktualisieren) e.aktualisieren(e.el, s);

  if (def) {
    const st = def.innen === 'mine' ? 'mine' : !def.aussen ? 'innen' : z.minute >= 1200 ? 'nacht' : JZ[z.jz];
    musikStimmung(S.pause && offen?.name === 'tagEnde' ? null : st);
  }
}

/** Platz im Rucksack als Knopf: Bild, Anzahl, Qualitätsstern, Taste. */
export function slotKnopf(slot, i, { klick, aktiv, gedimmt, markiert, taste } = {}) {
  const k = el('button', { type: 'button', class: `slot${aktiv ? ' aktiv' : ''}${gedimmt ? ' gedimmt' : ''}${markiert ? ' markiert' : ''}`, 'data-i': i });
  if (slot) {
    k.append(itemIcon(slot));
    if (slot.n > 1) k.append(el('span', { class: 'anzahl' }, slot.n));
    if (slot.q) k.append(symbol(sternSymbol(slot.q), 'pixel stern'));
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
/** Kurze Meldung oben; art: '' | 'gut' | 'warn'. */
export function meldungZeigen(text, art = '') {
  meldungsSchlange.push({ text, art });
  if (!meldungTimer) naechsteMeldung();
}
export const meldung = meldungZeigen;
function naechsteMeldung() {
  const box = $('#meldungen');
  const m = meldungsSchlange.shift();
  if (!m) { box.classList.remove('sichtbar'); meldungTimer = null; return; }
  box.textContent = m.text;
  box.className = `sichtbar ${m.art}`;
  meldungTimer = setTimeout(naechsteMeldung, Math.min(4200, 1600 + m.text.length * 35));
}

const fundZeilen = new Map();
/** Gefundene Gegenstände am Rand einblenden. */
export function fundeZeigen(items) {
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
    if (it.q) z.el.append(symbol(sternSymbol(it.q), 'pixel stern-klein'));
    z.timer = setTimeout(() => { z.el.classList.add('weg'); setTimeout(() => z.el.remove(), 400); fundZeilen.delete(key); }, 2600);
  }
}

const rezeptName = (r) => ITEMS[r.ergebnis ?? r.id]?.name ?? r.id;

function stufeZeigen({ skill, stufe }) {
  meldungZeigen(`${FAEHIGKEITEN[skill]}: Stufe ${stufe}!`, 'gut');
  for (const r of REZEPTE) if (r.stufe && r.stufe[0] === skill && r.stufe[1] === stufe) meldungZeigen(`Neues Rezept: ${rezeptName(r)}`, 'gut');
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
  if (dialogStand) {
    if (E.aktion.gedrueckt || E.benutzen.gedrueckt) dialogWeiter();
    else if (E.slot != null && dialogStand.optionen && dialogStand.i === dialogStand.texte.length - 1 && dialogStand.optionen[E.slot]) dialogWaehlen(E.slot);
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

let dialogStand = null;
let tippTimer = null;

/** Gespräch: npcId (oder null), Texte nacheinander, am Ende optional Auswahl [[text, fn]…]. */
export function dialogZeigen(npcId, texte, optionen = null, danach = null) {
  S.pause = true;
  eingabeLeeren();
  dialogStand = { npc: npcId, texte, i: 0, optionen, danach, fertig: false };
  dialogZeichnen();
}
export const dialog = dialogZeigen;
/** Frage mit Antworten [[text, fn | null]…]. */
export const frage = (text, optionen) => dialogZeigen(null, [text], optionen.map(([t, fn]) => [t, fn || (() => {})]));

function herzenAnzeige(id) {
  const herz = L.herzen(S.s, id);
  return el('div', { class: 'herzen', 'aria-label': `${herz} von ${MAX_HERZEN} Herzen` }, Array.from({ length: MAX_HERZEN }, (_, i) => symbol(i < herz ? 'herz' : 'herzLeer', 'pixel')));
}

function dialogZeichnen() {
  const box = $('#dialog');
  box.hidden = false;
  const d = dialogStand;
  const kopf = [];
  if (d.npc) {
    const n = NPCS[d.npc];
    kopf.push(el('div', { class: 'portraet rahmen' }, bild(portraet(d.npc), 'pixel'), el('div', { class: 'name' }, n.name), herzenAnzeige(d.npc)));
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
  if (!dialogStand) return;
  if (!dialogStand.fertig) {
    clearInterval(tippTimer);
    dialogStand.fertig = true;
    $('#dialog .dialog-text').textContent = dialogStand.texte[dialogStand.i];
    return;
  }
  if (dialogStand.i < dialogStand.texte.length - 1) { dialogStand.i++; ton('menue'); dialogZeichnen(); return; }
  if (!dialogStand.optionen) dialogSchliessen();
}

function dialogWaehlen(i) {
  const fn = dialogStand.optionen[i][1];
  ton('menue');
  dialogSchliessen();
  fn?.();
}

function dialogSchliessen() {
  clearInterval(tippTimer);
  const danach = dialogStand?.danach;
  dialogStand = null;
  $('#dialog').hidden = true;
  $('#dialog').replaceChildren();
  if (!offen) S.pause = false;
  danach?.();
}

// ─── Fenster ────────────────────────────────────────────────────────────────

let offen = null;
/** Das offene Fenster { name, daten } oder null. */
export const offenesFenster = () => offen;

/** Fenster öffnen; `daten.danach` läuft beim Schließen. */
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

/** Offenes Fenster neu bauen (nach einer Änderung); die Bildlaufposition bleibt. */
export function fensterNeu() {
  const root = $('#fenster');
  const scroll = root.querySelector('.fenster')?.scrollTop || 0;
  const bau = FENSTER[offen.name];
  root.replaceChildren(bau ? bau(offen.daten) : fensterRahmen('Fehlt', el('p', { class: 'warn' }, `Das Fenster „${offen.name}" gibt es nicht.`)));
  const f = root.querySelector('.fenster');
  if (f) f.scrollTop = scroll;
}

export function fensterSchliessen() {
  const vorher = offen;
  offen = null;
  $('#fenster').hidden = true;
  $('#fenster').replaceChildren();
  if (!dialogStand) S.pause = false;
  ton('menue');
  vorher?.daten?.danach?.();
}

/** Rahmen eines Fensters mit Titel und Schließen-Knopf; klasse 'breit' für große Fenster. */
export function fensterRahmen(titel, inhalt, { klasse = '', schliessbar = true, kopfExtra = null } = {}) {
  return el('section', { class: `fenster rahmen ${klasse}`, role: 'dialog', 'aria-label': titel },
    el('header', { class: 'fenster-kopf' }, el('h2', {}, titel), kopfExtra,
      schliessbar ? el('button', { type: 'button', class: 'zu', onclick: fensterSchliessen, 'aria-label': 'Schließen' }, '×') : null),
    inhalt);
}

export function goldAnzeige() {
  return el('span', { class: 'gold-anzeige' }, symbol('gold'), `${zahl.format(S.s.spieler.gold)} g`);
}

/** Rucksack als Gitter; klick(i, e), markiere/dimme(slot, i) → bool, aktivIdx. */
export function invGitter(klick, { markiere, dimme, aktivIdx } = {}) {
  const sp = S.s.spieler;
  return el('div', { class: 'inv-gitter' }, sp.inv.map((slot, i) => slotKnopf(slot, i, {
    klick, aktiv: i === aktivIdx, markiert: markiere?.(slot, i), gedimmt: dimme?.(slot, i),
  })));
}

export function itemInfo(slot) {
  if (!slot) return el('div', { class: 'item-info leer' }, el('p', {}, 'Wähle einen Gegenstand, um mehr zu erfahren.'));
  const it = ITEMS[slot.id];
  const zeilen = [];
  if (slot.q) zeilen.push(el('span', { class: 'chip' }, `${['', 'Silber', 'Gold', 'Iridium'][slot.q] || 'Gold'}qualität`));
  zeilen.push(el('span', { class: 'chip' }, KATEGORIE_NAME[it.kat] || it.kat));
  const e = L.energieVon(slot);
  return el('div', { class: 'item-info' },
    el('div', { class: 'item-kopf' }, itemIcon(slot), el('div', {}, el('h3', {}, L.nameVon(slot, S.s)), el('div', { class: 'chips' }, zeilen))),
    it.text ? el('p', {}, it.text) : null,
    el('dl', { class: 'werte' },
      L.verkaufbar(slot) ? [el('dt', {}, 'Wert'), el('dd', {}, `${L.preisVon(slot, S.s)} g`)] : null,
      e ? [el('dt', {}, 'Energie'), el('dd', {}, `+${e}`)] : null,
      slot.n > 1 ? [el('dt', {}, 'Anzahl'), el('dd', {}, slot.n)] : null));
}

// ─── Menü mit Reitern ───────────────────────────────────────────────────────

export function menueOeffnen(reiter) {
  ton('menue');
  fensterOeffnen('menue', { reiter, auswahl: null, aufgenommen: null });
}

fensterArt('menue', (d) => {
  const aktiv = MENUE_REITER.find((r) => r.id === d.reiter) || MENUE_REITER[0];
  d.reiter = aktiv.id;
  const reiter = el('nav', { class: 'reiter', 'aria-label': 'Menü' }, MENUE_REITER.map(({ id, name }) => el('button', {
    type: 'button', class: d.reiter === id ? 'aktiv' : '', 'aria-pressed': d.reiter === id ? 'true' : 'false',
    onclick: () => { d.reiter = id; ton('menue'); fensterNeu(); },
  }, name)));
  return fensterRahmen(`${S.s.spieler.name} · ${S.s.spieler.hof}`, el('div', {}, reiter, aktiv.bauen(d)), { klasse: 'breit', kopfExtra: goldAnzeige() });
});

menueReiter({ id: 'rucksack', name: 'Rucksack', reihe: 10, bauen: rucksackReiter });
menueReiter({ id: 'basteln', name: 'Basteln', reihe: 20, bauen: bastelReiter });
menueReiter({ id: 'faehigkeiten', name: 'Fähigkeiten', reihe: 30, bauen: faehigkeitenReiter });
menueReiter({ id: 'freunde', name: 'Freunde', reihe: 40, bauen: freundeReiter });
menueReiter({ id: 'optionen', name: 'Optionen', reihe: 90, bauen: optionenReiter });

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

/** Bastelrezepte (art 'basteln'); Kochrezepte zeigt der Bereich, der die Küche baut. */
function bastelReiter() {
  const s = S.s;
  return el('div', { class: 'liste' }, REZEPTE.filter((r) => (r.art ?? 'basteln') === 'basteln').map((r) => {
    const frei = L.rezeptFrei(s, r);
    const kann = L.kannBasteln(s, r);
    const id = r.ergebnis ?? r.id;
    const it = ITEMS[id];
    return el('div', { class: `zeile${frei ? '' : ' gesperrt'}` },
      itemIcon({ id }),
      el('div', { class: 'zeile-text' },
        el('strong', {}, `${it.name}${r.menge ? ` ×${r.menge}` : ''}`),
        el('div', { class: 'zutaten' }, frei
          ? Object.entries(r.zutaten).map(([zid, n]) => {
            const hat = L.anzahl(s, zid);
            return el('span', { class: `zutat${hat >= n ? ' ok' : ''}` }, itemIcon({ id: zid }), `${Math.min(hat, n)}/${n} ${ITEMS[zid].name}`);
          })
          : el('span', { class: 'leise' }, r.stufe ? `Ab ${FAEHIGKEITEN[r.stufe[0]]} Stufe ${r.stufe[1]}` : 'Noch nicht gelernt')),
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

statistik({ id: 'tage', name: 'Tage auf dem Hof', reihe: 10, wert: (s) => s.stats.tage });
statistik({ id: 'verdient', name: 'Verdient', reihe: 20, wert: (s) => `${zahl.format(s.stats.verdient)} g` });
statistik({ id: 'geerntet', name: 'Geerntet', reihe: 30, wert: (s) => s.stats.geerntet });
statistik({ id: 'gefangen', name: 'Fische gefangen', reihe: 40, wert: (s) => s.stats.gefangen });
statistik({ id: 'baeume', name: 'Bäume gefällt', reihe: 50, wert: (s) => s.stats.baeume });
statistik({ id: 'auftraege', name: 'Aufträge erledigt', reihe: 70, wert: (s) => s.stats.auftraege });

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
          el('div', { class: 'balken', role: 'progressbar', 'aria-valuenow': Math.round(anteil * 100), 'aria-valuemin': 0, 'aria-valuemax': 100 }, el('div', { vars: { '--anteil': anteil } })),
          el('div', { class: 'leise klein' }, lvl >= 10 ? 'Meisterstufe' : `${xp - von} / ${bis - von} Erfahrung bis Stufe ${lvl + 1}`),
          el('div', { class: 'leise klein' }, vorteile[id])));
    })),
    el('h3', {}, 'Werkzeuge'),
    el('div', { class: 'werkzeug-reihe' }, AUFRUESTBAR.map((id) => el('div', { class: 'werkzeug-karte' }, itemIcon({ id }), el('span', {}, L.werkzeugName(id, sp.werkzeug[id])), el('span', { class: 'leise klein' }, WERKZEUG_STUFEN[sp.werkzeug[id]].name)))),
    el('h3', {}, 'Bisher'),
    el('dl', { class: 'statistik' }, STATISTIK.map((z) => [el('dt', {}, z.name), el('dd', {}, z.wert(s))])));
}

function freundeReiter() {
  const s = S.s;
  return el('div', { class: 'freunde' }, Object.entries(NPCS).map(([id, n]) => {
    const st = s.npcs[id];
    return el('div', { class: 'freund rahmen-leicht' },
      bild(portraet(id), 'pixel portraet-klein'),
      el('div', { class: 'zeile-text' },
        el('strong', {}, n.voll), el('div', { class: 'leise klein' }, `${n.rolle} · Geburtstag ${n.geburtstag.tag}. ${JZ_NAME[n.geburtstag.jz]}`),
        herzenAnzeige(id),
        el('div', { class: 'chips' },
          el('span', { class: `chip${st.gesprochen ? ' ok' : ''}` }, st.gesprochen ? 'Gesprochen' : 'Gespräch offen'),
          el('span', { class: `chip${st.beschenkt ? ' ok' : ''}` }, st.beschenkt ? 'Beschenkt' : 'Geschenk offen'))));
  }));
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

// ─── Briefe ─────────────────────────────────────────────────────────────────

fensterArt('brief', (d) => {
  const s = S.s;
  let von;
  let text;
  if (d.text) { von = d.von; text = d.text; }
  else { const b = L.briefVon(d.id); von = b.von; text = b.text; }
  const ersetzt = text.replaceAll('{name}', s.spieler.name).replaceAll('{hof}', s.spieler.hof);
  if (!d.archiv && d.id) d.danach = () => { L.briefGelesen(s, d.id); if (d.weiter) postZeigen(false); };
  return fensterRahmen('Post', el('div', { class: 'papier brief' }, ersetzt.split('\n\n').map((abs) => el('p', {}, abs.split('\n').flatMap((z, i) => (i ? [el('br'), z] : [z])))),
    el('p', { class: 'unterschrift' }, von),
    el('button', { type: 'button', class: 'knopf', onclick: fensterSchliessen }, 'Weiter')));
});

// ─── Tagesende ──────────────────────────────────────────────────────────────

fensterArt('tagEnde', (d) => {
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
      const rezepte = REZEPTE.filter((r) => r.stufe && r.stufe[0] === st.skill && r.stufe[1] === st.stufe).map(rezeptName);
      teile.push(el('p', {}, `${FAEHIGKEITEN[st.skill]}: Stufe ${st.stufe}${rezepte.length ? ` · Neues Rezept: ${rezepte.join(', ')}` : ''}`));
    }
  }
  for (const m of b.meldungen) teile.push(el('p', {}, m));
  const wetter = { sonne: 'Sonnig', regen: 'Regen', sturm: 'Gewitter', schnee: 'Schnee' }[z.wetter];
  teile.push(el('p', { class: 'morgen' }, symbol(z.wetter), `${L.wochentag(z)}, ${z.tag}. ${JZ_NAME[JZ[z.jz]]}, Jahr ${z.jahr} · ${wetter}`));
  return fensterRahmen('Gute Nacht', el('div', { class: 'tag-ende' }, teile,
    el('button', { type: 'button', class: 'knopf gross', autofocus: true, onclick: () => { offen = null; $('#fenster').hidden = true; $('#fenster').replaceChildren(); neuerMorgen(); } }, 'Guten Morgen!')), { schliessbar: false });
});

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
  dialogStand = null;
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
  const farbwahl = (feld, titel) => el('fieldset', { class: 'farbwahl' }, el('legend', {}, titel), AUSWAHL[feld].map((f, i) => el('label', { class: 'farbe', vars: { '--f': f } },
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
    const start = BRIEFE.find((b) => b.start);
    const danach = () => { postZeigen(false); meldungZeigen(steuerung); };
    if (start) fensterOeffnen('brief', { text: start.text, von: start.von, danach });
    else danach();
  } else if (s.post.length) postZeigen(false);
}

export const titelOffen = () => titelAktiv;
export { zustandSichern };
