/**
 * Erzeugt `dist/index.html` fuer Umgebungen, die nur den Seiteninhalt
 * entgegennehmen (z. B. gehostete Artifacts): doctype, <html>, <head> und
 * <body> werden entfernt, der Rest bleibt unveraendert. Die Dateien unter
 * assets/ werden dabei nicht angefasst und weiterhin relativ referenziert.
 *
 *   node build.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(root, 'index.html'), 'utf8');

const title = source.match(/<title>([\s\S]*?)<\/title>/i);
const body = source.match(/<body[^>]*>([\s\S]*)<\/body>/i);

if (!title || !body) {
  console.error('index.html: <title> oder <body> nicht gefunden.');
  process.exit(1);
}

const page = [
  `<title>${title[1]}</title>`,
  '<link rel="stylesheet" href="assets/style.css">',
  body[1].trim(),
  '',
].join('\n');

mkdirSync(resolve(root, 'dist'), { recursive: true });
writeFileSync(resolve(root, 'dist/index.html'), page);
console.log(`dist/index.html geschrieben (${page.length} Zeichen).`);
