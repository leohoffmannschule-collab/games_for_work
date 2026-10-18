/* ============================================================
   LoreVault – book-detail.js
   Buchdetailseite: Cover, Infos, Kapitelliste, Lesefortschritt
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
  main.innerHTML = '<p style="color:var(--danger);padding:2rem;">Kein Buch angegeben.</p>';
} else {
  renderDetail();
}

function renderDetail() {
  const books    = getBooks();
  const book     = books.find(b => b.id === bookId);

  if (!book) {
    main.innerHTML = `
      <div style="padding:4rem;text-align:center;color:var(--text-muted);">
        <div style="font-size:3rem;margin-bottom:1rem;">😕</div>
        <h3 style="font-family:var(--font-display);color:var(--text-secondary);">Buch nicht gefunden</h3>
        <a href="index.html" class="btn btn-ghost" style="margin-top:1.5rem;">Zurück zur Bibliothek</a>
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
    .map(g => `<span class="genre-pill" style="font-size:.85rem;padding:.25rem .7rem;">${escHtml(g)}</span>`)
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
        <div style="margin-top:1rem;">
          <div style="display:flex;justify-content:space-between;font-size:.8rem;color:var(--text-muted);margin-bottom:.4rem;font-family:var(--font-mono);">
            <span>Lesefortschritt</span><span>${pct}%</span>
          </div>
          <div style="height:5px;background:var(--border);border-radius:3px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:var(--accent);border-radius:3px;transition:width .5s ease;"></div>
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
              ? '<p style="color:var(--text-muted);">Keine Kapitel erkannt.</p>'
              : chapters.map((ch, i) => buildChapterRow(book.id, ch, i, progress, lastChapter)).join('')}
          </div>
        </div>
      </div>
    </div>`;

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
      ${isCurrent && !isRead ? '<span style="font-size:.8rem;color:var(--accent);"><i class="bi bi-bookmark-fill"></i></span>' : ''}
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
