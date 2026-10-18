/* ============================================================
   LoreVault – reader.js
   Kapitel-Leser: PDF-Text laden, Seite rendern, Navigation,
   Fortschritt, TOC, Theme, Schriftgröße
   ============================================================ */

const STORAGE_KEY = 'lorevault_books';

function getBooks() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}
function getProgress(bookId) {
  try { return JSON.parse(localStorage.getItem('lv_progress_' + bookId) || '{}'); }
  catch { return {}; }
}
function saveProgress(bookId, progress) {
  localStorage.setItem('lv_progress_' + bookId, JSON.stringify(progress));
}
function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── URL-Parameter ── */
const params = new URLSearchParams(window.location.search);
const bookId  = params.get('id');
let chapterIndex = parseInt(params.get('ch') || '0', 10);

/* ── State ── */
let book      = null;
let chapters  = [];
let pdfPages  = [];
let progress  = {};
let fontSizeStep = 1; // 0=sm 1=md 2=lg 3=xl
const fontClasses = ['reader-size-sm','reader-size-md','reader-size-lg','reader-size-xl'];
const themes = ['', 'theme-sepia', 'theme-light'];
let themeIndex = 0;

/* ── DOM-Referenzen ── */
const readerContent    = document.getElementById('readerContent');
const readerBar        = document.getElementById('readerBar');
const readerChTitle    = document.getElementById('readerChapterTitle');
const bookTitleShort   = document.getElementById('bookTitleShort');
const chapterNav       = document.getElementById('chapterNav');
const prevBtn          = document.getElementById('prevChapterBtn');
const nextBtn          = document.getElementById('nextChapterBtn');
const chapterNavInfo   = document.getElementById('chapterNavInfo');
const tocSidebar       = document.getElementById('tocSidebar');
const tocOverlay       = document.getElementById('tocOverlay');
const tocList          = document.getElementById('tocList');
const progressBar      = document.getElementById('readingProgress');

/* ── Init ── */
(async function init() {
  if (!bookId) { showError('Kein Buch angegeben.'); return; }

  const books = getBooks();
  book = books.find(b => b.id === bookId);
  if (!book) { showError('Buch nicht gefunden.'); return; }

  chapters = book.chapters || [];
  progress = getProgress(bookId);

  // Titel setzen
  document.title = `${book.title} – LoreVault`;
  bookTitleShort.textContent = book.title;
  document.getElementById('backToBook').href = 'book-detail.html?id=' + bookId;

  // Gespeicherte Einstellungen laden
  const savedTheme = localStorage.getItem('lv_theme') || '0';
  themeIndex = parseInt(savedTheme, 10);
  applyTheme();

  const savedFont = localStorage.getItem('lv_font_size') || '1';
  fontSizeStep = parseInt(savedFont, 10);
  applyFontSize();

  // TOC aufbauen
  buildToc();

  // PDF laden
  try {
    const result = await window.PdfParser.loadPdfPages(book.filename);
    pdfPages = result.pages;
  } catch (err) {
    showError(`PDF konnte nicht geladen werden: ${err.message || err}<br><small>Liegt <code>books/${escHtml(book.filename)}</code> im richtigen Ordner?</small>`);
    return;
  }

  // Kapitel anzeigen
  showChapter(chapterIndex);

  // Navbar auto-hide beim Scrollen
  setupScrollBehavior();
})();

/* ── Kapitel rendern ── */
async function showChapter(idx) {
  if (idx < 0) idx = 0;
  if (idx >= chapters.length) idx = chapters.length - 1;
  chapterIndex = idx;

  // URL aktualisieren ohne Navigation
  const newUrl = `reader.html?id=${bookId}&ch=${chapterIndex}`;
  history.replaceState(null, '', newUrl);

  // Loading
  readerContent.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Kapitel wird geladen…</p>
    </div>`;
  chapterNav.style.display = 'none';

  const ch = chapters[chapterIndex];
  if (!ch) { showError('Kapitel nicht gefunden.'); return; }

  // Text extrahieren
  const rawText = window.PdfParser.getChapterText(pdfPages, chapterIndex, chapters);

  // Text in Absätze aufteilen
  const paragraphs = textToParagraphs(rawText);

  // HTML aufbauen
  const chapterHtml = buildChapterHtml(ch, chapterIndex, paragraphs);
  readerContent.innerHTML = chapterHtml;

  // Seite nach oben scrollen
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Navbar-Info aktualisieren
  readerChTitle.textContent = ch.title;
  document.title = `${ch.title} – ${book.title} – LoreVault`;

  // Navigation aktualisieren
  updateNavButtons();
  chapterNav.style.display = 'flex';

  // TOC-Highlight
  updateTocHighlight();

  // Fortschritt: zuletzt gelesen speichern
  progress._lastChapter = chapterIndex;
  saveProgress(bookId, progress);
}

function buildChapterHtml(ch, index, paragraphs) {
  const paras = paragraphs.map(p => `<p>${escHtml(p)}</p>`).join('');
  return `
    <h2 class="chapter-heading">
      <span class="chapter-number">Kapitel ${index + 1}</span>
      ${escHtml(ch.title)}
    </h2>
    ${paras || '<p style="color:var(--text-muted);font-style:italic;">Dieser Abschnitt enthält keinen extrahierbaren Text.</p>'}`;
}

function textToParagraphs(raw) {
  if (!raw) return [];
  // Doppelzeilenumbrüche → Absätze
  // Einzelzeilenumbrüche → Leerzeichen
  return raw
    .split(/\n{2,}/)
    .map(block => block.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim())
    .filter(p => p.length > 2);
}

/* ── Navigation ── */
function updateNavButtons() {
  prevBtn.disabled = chapterIndex === 0;
  nextBtn.disabled = chapterIndex >= chapters.length - 1;
  chapterNavInfo.textContent = `${chapterIndex + 1} / ${chapters.length}`;
}

prevBtn.addEventListener('click', () => {
  if (chapterIndex > 0) {
    markChapterRead(chapterIndex);
    showChapter(chapterIndex - 1);
  }
});

nextBtn.addEventListener('click', () => {
  if (chapterIndex < chapters.length - 1) {
    markChapterRead(chapterIndex);
    showChapter(chapterIndex + 1);
  }
});

function markChapterRead(idx) {
  progress[idx] = true;
  saveProgress(bookId, progress);
}

/* ── Scroll-Fortschritt ── */
function setupScrollBehavior() {
  let lastY = 0;
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        progressBar.style.setProperty('--progress', pct + '%');

        // Am Ende: Kapitel als gelesen markieren
        if (pct > 90) markChapterRead(chapterIndex);

        // Navbar auto-hide
        if (scrollTop > lastY + 50 && scrollTop > 200) {
          readerBar.classList.add('hidden');
        } else if (scrollTop < lastY - 10 || scrollTop < 100) {
          readerBar.classList.remove('hidden');
        }
        lastY = scrollTop;
        ticking = false;
      });
      ticking = true;
    }
  });

  // Klick auf obere Hälfte → Navbar zeigen
  document.addEventListener('click', e => {
    if (e.clientY < window.innerHeight * 0.15) {
      readerBar.classList.remove('hidden');
    }
  });
}

/* ── TOC ── */
function buildToc() {
  tocList.innerHTML = '';
  chapters.forEach((ch, i) => {
    const li = document.createElement('li');
    const a  = document.createElement('a');
    a.href = '#';
    a.innerHTML = `<span class="toc-num">${String(i+1).padStart(2,'0')}</span>${escHtml(ch.title)}`;
    a.dataset.index = i;
    if (progress[i]) a.classList.add('read');
    a.addEventListener('click', e => {
      e.preventDefault();
      markChapterRead(chapterIndex);
      showChapter(i);
      closeToc();
    });
    li.appendChild(a);
    tocList.appendChild(li);
  });
}

function updateTocHighlight() {
  tocList.querySelectorAll('a').forEach(a => {
    const i = parseInt(a.dataset.index, 10);
    a.classList.toggle('active', i === chapterIndex);
    if (progress[i]) a.classList.add('read');
  });
  // Aktiven Eintrag ins Sichtfeld scrollen
  const active = tocList.querySelector('a.active');
  if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

document.getElementById('tocBtn').addEventListener('click', () => {
  tocSidebar.classList.add('open');
  tocOverlay.classList.add('visible');
});
document.getElementById('closeToc').addEventListener('click', closeToc);
tocOverlay.addEventListener('click', closeToc);
function closeToc() {
  tocSidebar.classList.remove('open');
  tocOverlay.classList.remove('visible');
}

/* ── Theme ── */
function applyTheme() {
  const body = document.body;
  themes.forEach(t => { if (t) body.classList.remove(t); });
  if (themes[themeIndex]) body.classList.add(themes[themeIndex]);
}

document.getElementById('themeBtn').addEventListener('click', () => {
  themeIndex = (themeIndex + 1) % themes.length;
  applyTheme();
  localStorage.setItem('lv_theme', themeIndex);
});

/* ── Schriftgröße ── */
function applyFontSize() {
  const main = document.getElementById('readerMain');
  fontClasses.forEach(c => main.classList.remove(c));
  main.classList.add(fontClasses[fontSizeStep]);
}

document.getElementById('fontDecBtn').addEventListener('click', () => {
  if (fontSizeStep > 0) { fontSizeStep--; applyFontSize(); localStorage.setItem('lv_font_size', fontSizeStep); }
});
document.getElementById('fontIncBtn').addEventListener('click', () => {
  if (fontSizeStep < fontClasses.length - 1) { fontSizeStep++; applyFontSize(); localStorage.setItem('lv_font_size', fontSizeStep); }
});

/* ── Tastatur-Navigation ── */
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    if (!nextBtn.disabled) { markChapterRead(chapterIndex); showChapter(chapterIndex + 1); }
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    if (!prevBtn.disabled) { markChapterRead(chapterIndex); showChapter(chapterIndex - 1); }
  }
  if (e.key === 't' || e.key === 'T') {
    tocSidebar.classList.toggle('open');
    tocOverlay.classList.toggle('visible');
  }
});

/* ── Fehleranzeige ── */
function showError(msg) {
  readerContent.innerHTML = `
    <div style="text-align:center;padding:4rem;color:var(--danger);">
      <div style="font-size:2.5rem;margin-bottom:1rem;">⚠️</div>
      <p>${msg}</p>
      <a href="index.html" class="btn btn-ghost" style="margin-top:1.5rem;">Zurück zur Bibliothek</a>
    </div>`;
}
