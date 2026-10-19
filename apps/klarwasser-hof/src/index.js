// Einstieg: Bereiche laden, dann Leinwand, Eingabe, Oberfläche, Spielschleife.

// Die Sammeldateien zuerst, damit alle Register gefüllt sind, bevor das Spiel startet.
import './bereiche/inhalt.js';
import './bereiche/grafik.js';
import './bereiche/oberflaeche.js';
import { S, update } from './spiel.js';
import { renderStarten, zeichnen } from './render.js';
import { E, eingabeStarten, eingabeLesen, eingabeZuruecksetzen } from './eingabe.js';
import { uiStarten, hudAktualisieren, eingabeVerarbeiten, titelZeigen, spielBeginnen, einstellungenLaden, zustandSichern, titelOffen } from './ui.js';
import { tonStarten } from './ton.js';
import * as L from './logik.js';

function start(hot = {}) {
  const canvas = document.getElementById('welt');
  renderStarten(canvas);
  eingabeStarten(canvas, tonStarten);
  window.addEventListener('pointerdown', tonStarten, { once: false, passive: true });
  einstellungenLaden();
  uiStarten();

  let fortgesetzt = false;
  if (hot?.spielstand) {
    try { spielBeginnen(L.deserialisieren(hot.spielstand), false); fortgesetzt = true; } catch { /* dann eben der Titel */ }
  }
  if (!fortgesetzt) titelZeigen();

  try {
    window.claude?.hot?.snapshot?.(() => (S.s && !S.demo && !titelOffen() ? { spielstand: L.serialisieren(zustandSichern()) } : {}));
  } catch { /* nur im Artefakt-Betrachter vorhanden */ }

  // Für Tests im Browser: Zugriff auf Laufzeit und Logik
  window.__klarwasser = { S, L };

  document.getElementById('laden')?.remove();
  let vorher = performance.now();
  function schleife(jetzt) {
    const dt = Math.min(0.05, (jetzt - vorher) / 1000);
    vorher = jetzt;
    eingabeLesen();
    eingabeVerarbeiten();
    update(dt, E);
    zeichnen();
    hudAktualisieren();
    eingabeZuruecksetzen();
    requestAnimationFrame(schleife);
  }
  requestAnimationFrame(schleife);
}

if (window.claude?.hot?.ready) window.claude.hot.ready(start);
else start(window.claude?.hot?.data ?? {});
