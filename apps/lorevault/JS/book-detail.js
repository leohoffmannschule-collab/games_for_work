/* ============================================================
   LoreVault – book-detail.js
   Einziges Skript von book-detail.html:
   Cover, Infos, Kapitelliste, Lesefortschritt
   ============================================================ */

const STORAGE_KEY = 'lorevault_books';

function getBooks() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}
function saveBooks(books) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}
function getProgress(bookId) {
  try { return JSON.parse(localStorage.getItem('lv_progress_' + bookId) || '{}'); }
  catch { return {}; }
}
function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── URL-Parameter lesen ── */
const params = new URLSearchParams(window.location.search);
const bookId  = params.get('id');

const main = document.getElementById('bookDetailMain');

if (!bookId) {
  main.innerHTML = '<p class="detail-error">Kein Buch angegeben.</p>';
} else {
  renderDetail();
}

function renderDetail() {
  const books    = getBooks();
  const book     = books.find(b => b.id === bookId);

  if (!book) {
    main.innerHTML = `
      <div class="detail-missing">
        <div class="detail-missing-icon">😕</div>
        <h3>Buch nicht gefunden</h3>
        <a href="index.html" class="btn btn-ghost">Zurück zur Bibliothek</a>
      </div>`;
    return;
  }

  const progress = getProgress(book.id);
  const chapters  = book.chapters || [];
  const readCount = chapters.filter((_, i) => progress[i]).length;
  const lastChapter = progress._lastChapter ?? null;

  // Cover HTML
  const coverHtml = book.cover
    ? `<img src="${book.cover}" alt="${escHtml(book.title)}" />`
    : `<div class="book-detail-cover-placeholder">📖</div>`;

  // Genre Pills
  const genrePills = (book.genres || [])
    .map(g => `<span class="genre-pill">${escHtml(g)}</span>`)
    .join('');

  // Lesefortschritt-Balken
  const pct = chapters.length ? Math.round((readCount / chapters.length) * 100) : 0;

  // "Weiterlesen" vs "Lesen beginnen"
  const startChapter = lastChapter !== null ? lastChapter : 0;
  const startLabel = lastChapter !== null && lastChapter > 0
    ? `<i class="bi bi-play-fill"></i> Weiterlesen (Kap. ${lastChapter + 1})`
    : `<i class="bi bi-play-fill"></i> Lesen beginnen`;

  const addedDate = book.addedAt
    ? new Date(book.addedAt).toLocaleDateString('de-DE', { day:'2-digit', month:'long', year:'numeric' })
    : '–';

  main.innerHTML = `
    <div class="book-detail-wrap">

      <!-- LEFT: Cover -->
      <div>
        <div class="book-detail-cover">${coverHtml}</div>
        ${pct > 0 ? `
        <div class="read-progress">
          <div class="read-progress-head">
            <span>Lesefortschritt</span><span>${pct}%</span>
          </div>
          <div class="read-progress-track">
            <div class="read-progress-fill"></div>
          </div>
        </div>` : ''}
      </div>

      <!-- RIGHT: Info + Kapitel -->
      <div>
        <h1 class="book-detail-title">${escHtml(book.title)}</h1>
        <div class="book-detail-author">${escHtml(book.author || 'Unbekannter Autor')}</div>

        ${genrePills ? `<div class="book-detail-genres">${genrePills}</div>` : ''}

        ${book.description
          ? `<div class="book-detail-desc">${escHtml(book.description).replace(/\n/g,'<br>')}</div>`
          : ''}

        <div class="book-detail-stats">
          <div><strong>${chapters.length}</strong>Kapitel</div>
          <div><strong>${readCount}</strong>Gelesen</div>
          <div><strong>${addedDate}</strong>Hinzugefügt</div>
        </div>

        <div class="book-detail-actions">
          <a href="reader.html?id=${book.id}&ch=${startChapter}" class="btn btn-primary">
            ${startLabel}
          </a>
          ${readCount > 0 ? `
          <button class="btn btn-ghost" id="resetProgressBtn">
            <i class="bi bi-arrow-counterclockwise"></i> Fortschritt zurücksetzen
          </button>` : ''}
          <button class="btn btn-danger" id="deleteBookBtn">
            <i class="bi bi-trash3"></i> Buch löschen
          </button>
        </div>

        <!-- Kapitelliste -->
        <div class="chapter-list-section">
          <h3>Inhaltsverzeichnis</h3>
          <div class="chapter-list" id="chapterList">
            ${chapters.length === 0
              ? '<p class="no-chapters">Keine Kapitel erkannt.</p>'
              : chapters.map((ch, i) => buildChapterRow(book.id, ch, i, progress, lastChapter)).join('')}
          </div>
        </div>
      </div>
    </div>`;

  main.querySelector('.read-progress-fill')?.style.setProperty('--progress', pct + '%');

  // Events
  document.getElementById('deleteBookBtn')?.addEventListener('click', () => deleteBook(book.id));
  document.getElementById('resetProgressBtn')?.addEventListener('click', () => resetProgress(book.id));
}

function buildChapterRow(bookId, ch, index, progress, lastChapter) {
  const isRead    = !!progress[index];
  const isCurrent = lastChapter === index;
  let cls = 'chapter-list-item';
  if (isRead)    cls += ' read';
  if (isCurrent) cls += ' reading';

  return `
    <a href="reader.html?id=${bookId}&ch=${index}" class="${cls}">
      <div class="chapter-progress-dot"></div>
      <span class="chapter-list-num">${String(index + 1).padStart(2, '0')}</span>
      <span class="chapter-list-name">${escHtml(ch.title)}</span>
      ${isRead ? '<span class="chapter-list-read"><i class="bi bi-check-circle-fill"></i></span>' : ''}
      ${isCurrent && !isRead ? '<span class="chapter-list-current"><i class="bi bi-bookmark-fill"></i></span>' : ''}
    </a>`;
}

function deleteBook(id) {
  if (!confirm('Dieses Buch wirklich aus der Bibliothek entfernen?')) return;
  let books = getBooks().filter(b => b.id !== id);
  saveBooks(books);
  localStorage.removeItem('lv_progress_' + id);
  window.location.href = 'index.html';
}

function resetProgress(id) {
  if (!confirm('Lesefortschritt für dieses Buch zurücksetzen?')) return;
  localStorage.removeItem('lv_progress_' + id);
  renderDetail();
}
