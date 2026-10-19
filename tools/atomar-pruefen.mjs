/**
 * Prüft, dass Hub und Apps ohne Inline-CSS und Inline-JS auskommen und jede
 * HTML-Seite genau ein eigenes Stylesheet und ein eigenes Skript hat:
 * `seite.html` bindet `…/seite.css` und `…/seite.js` ein, sonst nichts.
 *
 *   node tools/atomar-pruefen.mjs
 *
 * Geprüft werden index.html, die Seiten unter apps/ und alle eigenen Skripte
 * (assets/, apps/ ohne vendor/). Was die Skripte zur Laufzeit an Werten setzen,
 * läuft über Klassen, das hidden-Attribut oder Custom Properties
 * (el.style.setProperty('--x', …)) – ein style- oder on…-Attribut in erzeugtem
 * HTML gilt genauso als Verstoß wie eins in der Seite selbst.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fehler = [];

function dateien(ordner, endung) {
  const liste = [];
  for (const e of readdirSync(ordner, { withFileTypes: true })) {
    const pfad = join(ordner, e.name);
    if (e.isDirectory()) {
      if (e.name !== 'vendor' && e.name !== 'node_modules') liste.push(...dateien(pfad, endung));
    } else if (e.name.endsWith(endung)) liste.push(pfad);
  }
  return liste;
}

function melden(datei, text, index, was) {
  const zeile = text.slice(0, index).split('\n').length;
  fehler.push(`${relative(root, datei)}:${zeile}  ${was}`);
}

function suchen(datei, text, muster, was) {
  for (const m of text.matchAll(muster)) melden(datei, text, m.index, was);
}

// Ein Tag mit style- oder on…-Attribut, auch über mehrere Zeilen
const STYLE_ATTR = /<[a-zA-Z][^<>]*?\sstyle\s*=/g;
const HANDLER_ATTR = /<[a-zA-Z][^<>]*?\son[a-z]+\s*=/g;

const seiten = [join(root, 'index.html'), ...dateien(join(root, 'apps'), '.html')];

for (const seite of seiten) {
  const html = readFileSync(seite, 'utf8');
  const name = basename(seite, '.html');

  suchen(seite, html, /<style\b/g, '<style>-Block');
  suchen(seite, html, STYLE_ATTR, 'style-Attribut');
  suchen(seite, html, HANDLER_ATTR, 'Event-Handler-Attribut');
  suchen(seite, html, /javascript:/g, 'javascript:-Link');
  suchen(seite, html, /<script\b(?![^>]*\ssrc=)[^>]*>/g, 'Inline-<script>');

  const css = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map(
    (m) => m[1],
  );
  const js = [...html.matchAll(/<script\b[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);
  if (css.length !== 1 || basename(css[0]) !== `${name}.css`) {
    fehler.push(
      `${relative(root, seite)}  braucht genau ein Stylesheet ${name}.css, hat: ${css.join(', ') || 'keins'}`,
    );
  }
  if (js.length !== 1 || basename(js[0]) !== `${name}.js`) {
    fehler.push(
      `${relative(root, seite)}  braucht genau ein Skript ${name}.js, hat: ${js.join(', ') || 'keins'}`,
    );
  }
}

const skripte = [...dateien(join(root, 'assets'), '.js'), ...dateien(join(root, 'apps'), '.js')];

for (const skript of skripte) {
  const code = readFileSync(skript, 'utf8');
  suchen(skript, code, STYLE_ATTR, 'style-Attribut in erzeugtem HTML');
  suchen(skript, code, HANDLER_ATTR, 'Event-Handler-Attribut in erzeugtem HTML');
  suchen(
    skript,
    code,
    /setAttribute\(\s*['"]style['"]|\.cssText\b|\.style\s*=[^=]/g,
    'style direkt gesetzt',
  );
  // Attribut-Objekte für Element-Helfer, etwa el('div', { style: `…` })
  suchen(
    skript,
    code,
    /[{,]\s*['"]?style['"]?\s*:\s*[`'"]/g,
    'style-Attribut über Attribut-Objekt',
  );
}

if (fehler.length) {
  console.error(fehler.join('\n'));
  console.error(`\n${fehler.length} Verstöße.`);
  process.exit(1);
}
console.log(`In Ordnung: ${seiten.length} Seiten, ${skripte.length} Skripte, nichts inline.`);
