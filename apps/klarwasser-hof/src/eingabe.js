// Tastatur, Maus und Touch werden zu einem gemeinsamen Eingabezustand.
// Flanken (gedrückt, losgelassen) gelten genau ein Bild lang.

export const E = {
  richtung: { x: 0, y: 0 },
  benutzen: { gedrueckt: false, gehalten: false, losgelassen: false },
  aktion: { gedrueckt: false },
  essen: false,
  inventar: false,
  basteln: false,
  esc: false,
  slot: null,
  rad: 0,
  maus: { x: 0, y: 0, aktiv: false },
  tippen: null,
  touch: { x: 0, y: 0, benutzen: false },
};

const tasten = new Set();
let mausLinks = false;
let vorherGehalten = false;

const BEWEGUNG = {
  w: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1],
  a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0],
};
const BENUTZEN = new Set([' ', 'c']);

function imEingabefeld(e) {
  const t = e.target;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
}

export function eingabeStarten(canvas, beiErsterEingabe) {
  let ersteGemeldet = false;
  const erste = () => { if (!ersteGemeldet) { ersteGemeldet = true; beiErsterEingabe?.(); } else beiErsterEingabe?.(); };

  window.addEventListener('keydown', (e) => {
    if (imEingabefeld(e)) return;
    const k = e.key.toLowerCase();
    if (BEWEGUNG[k] || k === ' ' || k === 'tab') e.preventDefault();
    erste();
    if (e.repeat) return;
    tasten.add(k);
    if (BENUTZEN.has(k)) E.benutzen.gedrueckt = true;
    if (k === 'e' || k === 'x' || k === 'enter') E.aktion.gedrueckt = true;
    if (k === 'f') E.essen = true;
    if (k === 'i' || k === 'tab') E.inventar = true;
    if (k === 'k') E.basteln = true;
    if (k === 'escape') E.esc = true;
    if (k >= '1' && k <= '9') E.slot = Number(k) - 1;
    if (k === '0') E.slot = 9;
    if (k === '-' || k === 'ß') E.slot = 10;
    if (k === '=' || k === '´' || k === '+') E.slot = 11;
    if (k === 'q') E.rad -= 1;
    if (k === 'r') E.rad += 1;
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    tasten.delete(k);
  });
  window.addEventListener('blur', () => { tasten.clear(); mausLinks = false; E.touch.benutzen = false; });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    erste();
    E.maus.x = e.clientX;
    E.maus.y = e.clientY;
    if (e.pointerType === 'mouse') {
      E.maus.aktiv = true;
      if (e.button === 0) { E.benutzen.gedrueckt = true; mausLinks = true; }
      if (e.button === 2) E.aktion.gedrueckt = true;
    } else {
      E.tippen = { x: e.clientX, y: e.clientY };
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    E.maus.x = e.clientX;
    E.maus.y = e.clientY;
    E.maus.aktiv = true;
  });
  canvas.addEventListener('pointerleave', () => { E.maus.aktiv = false; });
  window.addEventListener('pointerup', (e) => { if (e.pointerType === 'mouse' && e.button === 0) mausLinks = false; });
  canvas.addEventListener('wheel', (e) => { E.rad += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
}

export function eingabeLesen() {
  let x = 0;
  let y = 0;
  for (const k of tasten) {
    const b = BEWEGUNG[k];
    if (b) { x += b[0]; y += b[1]; }
  }
  x += E.touch.x;
  y += E.touch.y;
  const l = Math.hypot(x, y);
  E.richtung.x = l > 1 ? x / l : x;
  E.richtung.y = l > 1 ? y / l : y;
  const gehalten = [...BENUTZEN].some((k) => tasten.has(k)) || mausLinks || E.touch.benutzen;
  E.benutzen.losgelassen = vorherGehalten && !gehalten;
  E.benutzen.gehalten = gehalten;
  vorherGehalten = gehalten;
}

export function eingabeZuruecksetzen() {
  E.benutzen.gedrueckt = false;
  E.benutzen.losgelassen = false;
  E.aktion.gedrueckt = false;
  E.essen = false;
  E.inventar = false;
  E.basteln = false;
  E.esc = false;
  E.slot = null;
  E.rad = 0;
  E.tippen = null;
}

/** Alle gehaltenen Tasten vergessen — wenn ein Fenster aufgeht. */
export function eingabeLeeren() {
  tasten.clear();
  mausLinks = false;
  E.touch.benutzen = false;
  E.touch.x = 0;
  E.touch.y = 0;
}
