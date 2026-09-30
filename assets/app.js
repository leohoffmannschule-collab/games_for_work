/**
 * Pausenspiele – Hub und Router.
 *
 * Alles laeuft als kleine Single-Page-App: der Hub listet die Spiele, ein
 * Klick setzt den Hash (#/2048) und laedt das passende Modul per dynamischem
 * Import. Jedes Spielmodul exportiert `createGame(ctx)`; der Router raeumt
 * beim Verlassen ueber den Kontext wieder auf.
 */

import { store, formatTime } from './store.js';

/* ---------------------------------------------------------------- Icons -- */

const icon = {
  g2048: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
    <rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2" fill="currentColor" opacity=".22"/>
    <rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor" opacity=".22"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>`,
  minen: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
    <circle cx="11" cy="14" r="6" fill="currentColor" opacity=".22"/><circle cx="11" cy="14" r="6"/>
    <path d="M15.5 9.5 19 6M17 4l3 3M14 4.5l1 1M20.5 10l-1-1"/></svg>`,
  sudoku: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
    <rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>
    <rect x="15" y="15" width="6" height="6" fill="currentColor" opacity=".22" stroke="none"/></svg>`,
  wortjagd: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
    <rect x="2.5" y="6" width="6" height="12" rx="1.8"/><rect x="9" y="6" width="6" height="12" rx="1.8" fill="currentColor" opacity=".22"/>
    <rect x="15.5" y="6" width="6" height="12" rx="1.8"/></svg>`,
  snake: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 18h6a3 3 0 0 0 0-6H8a3 3 0 0 1 0-6h7"/><circle cx="18.5" cy="6" r="2.2" fill="currentColor"/></svg>`,
  dash: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">
    <rect x="3" y="5.5" width="7" height="7" rx="1.6" transform="rotate(-18 6.5 9)" fill="currentColor" opacity=".22"/>
    <rect x="3" y="5.5" width="7" height="7" rx="1.6" transform="rotate(-18 6.5 9)"/>
    <path d="M13 19l2.6-5 2.6 5z"/><path d="M2.5 19h19" stroke-linecap="round"/></svg>`,
};

/* ------------------------------------------------------------- Register -- */

const GAMES = [
  {
    id: '2048',
    title: '2048',
    time: '5–10 Min',
    icon: icon.g2048,
    desc: 'Zahlen zusammenschieben, bis 2048 auf dem Brett steht. Lässt sich jederzeit stehen lassen.',
    load: () => import('./games/g2048.js'),
    headline: () => {
      const b = store.best('2048', 'klassisch');
      return b
        ? `Bester Punktestand <strong>${b.toLocaleString('de-DE')}</strong>`
        : 'Noch kein Punktestand';
    },
  },
  {
    id: 'minen',
    title: 'Minensucher',
    time: '3–15 Min',
    icon: icon.minen,
    desc: 'Felder aufdecken, Minen ausrechnen. Drei Größen – von der kurzen Runde bis zum Kopfzerbrechen.',
    load: () => import('./games/minen.js'),
    headline: () => {
      const b = store.best('minen', 'leicht');
      return b ? `Bestzeit leicht <strong>${formatTime(b)}</strong>` : 'Noch keine Bestzeit';
    },
  },
  {
    id: 'sudoku',
    title: 'Sudoku',
    time: '10–20 Min',
    icon: icon.sudoku,
    desc: 'Frisch erzeugte Rätsel mit garantiert eindeutiger Lösung, inklusive Notizen und Prüfung.',
    load: () => import('./games/sudoku.js'),
    headline: () => {
      const b = store.best('sudoku', 'mittel');
      return b ? `Bestzeit mittel <strong>${formatTime(b)}</strong>` : 'Noch keine Bestzeit';
    },
  },
  {
    id: 'wortjagd',
    title: 'Wortjagd',
    time: '3–8 Min',
    icon: icon.wortjagd,
    desc: 'Fünf Buchstaben, sechs Versuche. Deutsches Wörterraten für die kurze Kaffeepause.',
    load: () => import('./games/wortjagd.js'),
    headline: () => {
      const s = store.stats('wortjagd');
      return s.plays
        ? `<strong>${s.wins}</strong> von <strong>${s.plays}</strong> gelöst`
        : 'Noch nicht gespielt';
    },
  },
  {
    id: 'snake',
    title: 'Snake',
    time: '2–5 Min',
    icon: icon.snake,
    desc: 'Der Klassiker für zwischendurch: einsammeln, wachsen, bloß nicht anecken.',
    load: () => import('./games/snake.js'),
    headline: () => {
      const b = store.best('snake', 'klassisch');
      return b ? `Bester Punktestand <strong>${b}</strong>` : 'Noch kein Punktestand';
    },
  },
  {
    id: 'dash',
    title: 'Dash',
    time: '5–15 Min',
    icon: icon.dash,
    desc: 'Ein Würfel, drei Strecken, ein Knopf. Springen im Takt – und nach jedem Sturz sofort weiter.',
    load: () => import('./games/dash.js'),
    headline: () => {
      const fertig = store.get('dash:geschafft', []).length;
      if (fertig) {
        return `<strong>${fertig}</strong> ${fertig === 1 ? 'Strecke' : 'Strecken'} geschafft`;
      }
      const b = store.best('dash', 'aufwaermen');
      return b ? `Aufwärmen bis <strong>${b} %</strong>` : 'Noch nicht gelaufen';
    },
  },
];

/* ---------------------------------------------------------------- Theme -- */

const SUN = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
  <circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2M12 19.4v2M2.6 12h2M19.4 12h2M5.4 5.4l1.4 1.4M17.2 17.2l1.4 1.4M18.6 5.4l-1.4 1.4M6.8 17.2l-1.4 1.4"/></svg>`;
const MOON = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
  <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4 8.4 8.4 0 1 0 20 14.2Z"/></svg>`;

const themeBtn = document.getElementById('themeBtn');

function prefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function isDark() {
  const set = document.documentElement.getAttribute('data-theme');
  return set ? set === 'dark' : prefersDark();
}

function paintThemeButton() {
  themeBtn.innerHTML = isDark() ? SUN : MOON;
}

const savedTheme = store.get('theme');
if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
paintThemeButton();

themeBtn.addEventListener('click', () => {
  const next = isDark() ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  store.set('theme', next);
  paintThemeButton();
  window.dispatchEvent(new CustomEvent('themechange'));
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (!document.documentElement.getAttribute('data-theme')) {
    paintThemeButton();
    window.dispatchEvent(new CustomEvent('themechange'));
  }
});

/* --------------------------------------------------------------- Router -- */

const view = document.getElementById('view');
let teardown = [];

function cleanup() {
  for (const fn of teardown.splice(0)) {
    try {
      fn();
    } catch (err) {
      console.error('Aufräumen fehlgeschlagen:', err);
    }
  }
  view.innerHTML = '';
}

/** Der Kontext, den jedes Spielmodul bekommt. */
function makeContext(game) {
  const ctx = {
    game,
    store,
    formatTime,
    root: document.createElement('div'),

    /** Event-Listener, der beim Verlassen des Spiels automatisch abgeräumt wird. */
    on(target, type, handler, options) {
      target.addEventListener(type, handler, options);
      teardown.push(() => target.removeEventListener(type, handler, options));
      return handler;
    },

    /** Intervall, das beim Verlassen automatisch stoppt. */
    interval(fn, ms) {
      const id = setInterval(fn, ms);
      teardown.push(() => clearInterval(id));
      return id;
    },

    onDestroy(fn) {
      teardown.push(fn);
    },
  };
  return ctx;
}

function renderHub() {
  document.title = 'Pausenspiele';
  const cards = GAMES.map(
    (g) => `
    <a class="game-card" href="#/${g.id}">
      <div class="card-head">
        <span class="card-icon">${g.icon}</span>
        <span>
          <div class="card-title">${g.title}</div>
          <div class="card-time">${g.time}</div>
        </span>
      </div>
      <p class="card-desc">${g.desc}</p>
      <div class="card-foot">${g.headline()}</div>
    </a>`,
  ).join('');

  view.innerHTML = `
    <section class="hero">
      <h1>Sechs Spiele für die Pause</h1>
      <p>Kurz genug für den Kaffee, lang genug für den Kopf. Alles läuft im Browser,
         ohne Konto und ohne Netz – Punktestände bleiben nur auf diesem Gerät.</p>
    </section>
    <div class="card-grid">${cards}</div>
    <p class="hub-note">Tipp: <kbd>Esc</kbd> bringt dich aus jedem Spiel zurück zur Übersicht.</p>`;
}

async function renderGame(game) {
  document.title = game.title + ' · Pausenspiele';
  view.innerHTML = `
    <a class="back-link" href="#/">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
           stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>
      Übersicht
    </a>
    <div class="game-head" style="margin-top:16px"><h2>${game.title}</h2></div>
    <div id="gameRoot"></div>`;

  const ctx = makeContext(game);
  const mount = view.querySelector('#gameRoot');
  mount.appendChild(ctx.root);

  try {
    const module = await game.load();
    // Zwischenzeitlicher Routenwechsel: Ergebnis verwerfen.
    if (!ctx.root.isConnected) return;
    module.createGame(ctx);
  } catch (err) {
    console.error(err);
    ctx.root.innerHTML = `<div class="panel">Das Spiel konnte nicht geladen werden.
      <button class="btn" style="margin-left:8px" onclick="location.reload()">Neu laden</button></div>`;
  }
}

function route() {
  const id = (location.hash.match(/^#\/([\w-]+)/) || [])[1];
  const game = GAMES.find((g) => g.id === id);
  cleanup();
  window.scrollTo(0, 0);
  if (game) renderGame(game);
  else renderHub();
}

window.addEventListener('hashchange', route);

// Esc führt aus jedem Spiel zurück zur Übersicht.
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && location.hash && location.hash !== '#/') {
    location.hash = '#/';
  }
});

route();
