/**
 * Holt die eingebundenen Apps aus ihren eigenen Repositorys nach apps/.
 *
 * Der Hub zeigt Klarwasser-Hof und LoreVault in einem Rahmen an. Damit das
 * ohne zweiten Server und auch auf jedem statischen Webspace klappt, liegen
 * ihre Dateien als Kopie unter apps/ und werden mit eingecheckt. Dieses Skript
 * erneuert die Kopie aus dem jeweiligen Repository; welcher Stand gerade
 * drinliegt, steht danach in apps/quellen.json.
 *
 *   node tools/apps-holen.mjs              alle Apps
 *   node tools/apps-holen.mjs lorevault    nur eine
 *
 * Ersetzt werden nur die Dateien und Ordner aus `nehmen` – was sonst im
 * Zielordner liegt (etwa die PDFs unter apps/lorevault/books/), bleibt stehen.
 */

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const APPS = [
  {
    ziel: 'klarwasser-hof',
    repo: 'https://github.com/leohoffmannschule-collab/the_price_of_clearwater.git',
    zweig: 'claude/busy-lovelace-s50ri5',
    ordner: '.',
    nehmen: ['index.html', 'favicon.svg', 'src'],
  },
  {
    ziel: 'lorevault',
    repo: 'https://github.com/leohoffmannschule-collab/LoreVault.git',
    zweig: 'claude/seiten-atomar',
    ordner: 'LoreVault_testsystem',
    nehmen: [
      'index.html',
      'add-book.html',
      'book-detail.html',
      'reader.html',
      'setup.html',
      'CSS',
      'JS',
      'vendor',
    ],
  },
];

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appsDir = join(root, 'apps');
const quellenDatei = join(appsDir, 'quellen.json');

const gewuenscht = process.argv.slice(2);
const auswahl = gewuenscht.length ? APPS.filter((a) => gewuenscht.includes(a.ziel)) : APPS;
if (!auswahl.length) {
  console.error(`Unbekannte App. Vorhanden: ${APPS.map((a) => a.ziel).join(', ')}`);
  process.exit(1);
}

const quellen = existsSync(quellenDatei) ? JSON.parse(readFileSync(quellenDatei, 'utf8')) : {};

// Fehlermeldungen von git landen ohnehin auf stderr.
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });

for (const app of auswahl) {
  const tmp = mkdtempSync(join(tmpdir(), 'apps-holen-'));
  try {
    console.log(`${app.ziel}: hole ${app.zweig} …`);
    git('clone', '--quiet', '--depth', '1', '--branch', app.zweig, app.repo, tmp);
    const commit = git('-C', tmp, 'rev-parse', 'HEAD').trim();

    for (const name of app.nehmen) {
      const von = join(tmp, app.ordner, name);
      const nach = join(appsDir, app.ziel, name);
      if (!existsSync(von)) throw new Error(`${app.ordner}/${name} fehlt im Repository.`);
      rmSync(nach, { recursive: true, force: true });
      cpSync(von, nach, { recursive: true });
    }

    quellen[app.ziel] = { repo: app.repo, zweig: app.zweig, commit };
    console.log(`${app.ziel}: Stand ${commit.slice(0, 7)} liegt unter apps/${app.ziel}/`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

writeFileSync(quellenDatei, JSON.stringify(quellen, null, 2) + '\n');
