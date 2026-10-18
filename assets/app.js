/**
 * Pausenspiele – Hub und Router.
 *
 * Alles laeuft als kleine Single-Page-App: der Hub listet die Spiele, ein
 * Klick setzt den Hash (#/2048) und laedt das passende Modul per dynamischem
 * Import. Jedes Spielmodul exportiert `createGame(ctx)`; der Router raeumt
 * beim Verlassen ueber den Kontext wieder auf.
 *
 * Daneben stehen die groesseren Projekte (APPS): eigenstaendige Seiten unter
 * apps/, die der Hub in einem Rahmen zeigt, oder Adressen, die sich in einem
 * neuen Tab oeffnen.
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
  hof: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 12.5C12 8.9 9.7 6.5 5.5 6.5c0 3.6 2.3 6 6.5 6z" fill="currentColor" opacity=".22"/>
    <path d="M12 12.5C12 8.9 9.7 6.5 5.5 6.5c0 3.6 2.3 6 6.5 6zM12 10.5c0-3.3 2.1-5.5 6-5.5 0 3.3-2.1 5.5-6 5.5zM12 20v-9.5M3.5 20h17"/></svg>`,
  lorevault: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">
    <path d="M12 6.5C10.2 5 7.6 4.5 3.5 4.5v13c4.1 0 6.7.5 8.5 2z" fill="currentColor" opacity=".22" stroke="none"/>
    <path d="M12 6.5C10.2 5 7.6 4.5 3.5 4.5v13c4.1 0 6.7.5 8.5 2 1.8-1.5 4.4-2 8.5-2v-13c-4.1 0-6.7.5-8.5 2zM12 6.5v13"/></svg>`,
  almanach: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">
    <path d="M12 7.6l4.2 7.2H7.8z" fill="currentColor" opacity=".22"/>
    <path d="M12 2.8l8 4.6v9.2l-8 4.6-8-4.6V7.4zM12 7.6l4.2 7.2H7.8zM12 2.8v4.8M4 7.4l3.8 7.4M20 7.4l-3.8 7.4M4 16.6l3.8-1.8M20 16.6l-3.8-1.8M12 21.2v0"/></svg>`,
};

const EXTERN = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
  stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>`;

function escapeHtml(text) {
  return String(text).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}

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

/**
 * Die groesseren Projekte. Mit `src` liegt die App unter apps/ (siehe
 * tools/apps-holen.mjs) und laeuft im Hub in einem Rahmen; mit `url` ist es
 * eine eigene Adresse, die sich in einem neuen Tab oeffnet.
 */
const APPS = [
  {
    id: 'klarwasser-hof',
    title: 'Klarwasser-Hof',
    time: 'Hofspiel · für länger',
    icon: icon.hof,
    desc: 'Hofspiel nach Art von Stardew Valley: Felder bestellen, angeln, in der Mine graben und das Dorf Klarwasser kennenlernen.',
    src: 'apps/klarwasser-hof/index.html',
    headline: () => {
      const s = store.peek('klarwasser-hof-v1');
      if (!s?.zeit) return 'Noch kein Spielstand';
      const jz = ['Frühling', 'Sommer', 'Herbst', 'Winter'][s.zeit.jz] ?? '';
      const hof = s.spieler?.hof ? `${escapeHtml(s.spieler.hof)} · ` : '';
      return `${hof}<strong>${jz} ${s.zeit.tag}, Jahr ${s.zeit.jahr}</strong>`;
    },
  },
  {
    id: 'lorevault',
    title: 'LoreVault',
    time: 'Website · Bücherregal',
    icon: icon.lorevault,
    desc: 'Die eigene PDF-Bibliothek: Bücher einpflegen, Kapitel erkennen lassen und dort weiterlesen, wo du aufgehört hast.',
    src: 'apps/lorevault/index.html',
    headline: () => {
      const books = store.peek('lorevault_books');
      const n = Array.isArray(books) ? books.length : 0;
      return n
        ? `<strong>${n}</strong> ${n === 1 ? 'Buch' : 'Bücher'} in der Bibliothek`
        : 'Noch keine Bücher';
    },
  },
  {
    id: 'almanach',
    title: 'Abenteuer-Almanach',
    time: 'Website · D&D-Runde',
    icon: icon.almanach,
    desc: 'Charakterblätter, Spieltisch und Spielleitung für die Pen-&-Paper-Runde. Läuft auf dem eigenen Rechner oder Raspberry Pi.',
    url: 'https://www.deinemudda.fun',
    headline: () => `Öffnet <strong>www.deinemudda.fun</strong> ${EXTERN}`,
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

function card(item) {
  const href = item.url ?? '#/' + item.id;
  const target = item.url ? ' target="_blank" rel="noopener"' : '';
  return `
    <a class="game-card" href="${href}"${target}>
      <div class="card-head">
        <span class="card-icon">${item.icon}</span>
        <span>
          <div class="card-title">${item.title}</div>
          <div class="card-time">${item.time}</div>
        </span>
      </div>
      <p class="card-desc">${item.desc}</p>
      <div class="card-foot">${item.headline()}</div>
    </a>`;
}

function renderHub() {
  document.title = 'Pausenspiele';
  view.innerHTML = `
    <section class="hero">
      <h1>Spiele für die Pause – und für danach</h1>
      <p>Sechs kurze Spiele für den Kaffee, dazu ein ganzes Hofspiel und die eigenen Websites.
         Alles ohne Konto – Spielstände bleiben nur auf diesem Gerät.</p>
    </section>
    <section class="hub-section">
      <div class="section-head">
        <h2>Pausenspiele</h2>
        <span>5 bis 20 Minuten, laufen ganz ohne Netz</span>
      </div>
      <div class="card-grid">${GAMES.map(card).join('')}</div>
    </section>
    <section class="hub-section">
      <div class="section-head">
        <h2>Spiele &amp; Websites</h2>
        <span>Die größeren Projekte</span>
      </div>
      <div class="card-grid">${APPS.map(card).join('')}</div>
    </section>
    <p class="hub-note">Tipp: <kbd>Esc</kbd> bringt dich aus jedem Pausenspiel zurück zur Übersicht.</p>`;
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

/** Eine App aus apps/ im Rahmen, mit schmaler Leiste statt der Kopfzeile. */
function renderApp(app) {
  document.title = app.title + ' · Pausenspiele';
  document.body.classList.add('app-mode');
  teardown.push(() => document.body.classList.remove('app-mode'));

  view.innerHTML = `
    <div class="app-bar">
      <a class="back-link" href="#/">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
             stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>
        Übersicht
      </a>
      <h2>${app.title}</h2>
      <a class="back-link app-tab" href="${app.src}" target="_blank" rel="noopener"
         title="${app.title} im eigenen Tab öffnen">${EXTERN}<span>Eigener Tab</span></a>
    </div>
    <iframe class="app-frame" src="${app.src}" title="${app.title}"
            allow="fullscreen; autoplay" allowfullscreen></iframe>`;

  // Tastatur gleich an die App geben, sonst muss man erst hineinklicken.
  const frame = view.querySelector('.app-frame');
  frame.addEventListener('load', () => frame.contentWindow?.focus());
}

function route() {
  const id = (location.hash.match(/^#\/([\w-]+)/) || [])[1];
  const game = GAMES.find((g) => g.id === id);
  const app = APPS.find((a) => a.id === id && a.src);
  cleanup();
  window.scrollTo(0, 0);
  if (game) renderGame(game);
  else if (app) renderApp(app);
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
