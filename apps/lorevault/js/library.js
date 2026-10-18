/* ============================================================
   LoreVault – library.js
   Startseite: Bücher aus localStorage laden & darstellen
   ============================================================ */

const STORAGE_KEY = 'lorevault_books';

/* ── Hilfsfunktionen ── */
function getBooks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveBooks(books) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

function getProgress(bookId) {
  try {
    return JSON.parse(localStorage.getItem('lv_progress_' + bookId) || '{}');
  } catch { return {}; }
}

/* ── Genre-Filter aufbauen ── */
function buildGenreFilter(books) {
  const container = document.getElementById('genreFilter');
  const genres = new Set();
  books.forEach(b => (b.genres || []).forEach(g => genres.add(g)));

  // Bestehende dynamische Tags entfernen (nicht "Alle")
  [...container.querySelectorAll('.tag:not([data-genre="all"])')].forEach(t => t.remove());

  genres.forEach(genre => {
    const btn = document.createElement('button');
    btn.className = 'tag';
    btn.dataset.genre = genre;
    btn.textContent = genre;
    btn.addEventListener('click', () => filterByGenre(genre, btn));
    container.appendChild(btn);
  });
}

let activeGenre = 'all';
let searchQuery  = '';

function filterByGenre(genre, btn) {
  activeGenre = genre;
  document.querySelectorAll('#genreFilter .tag').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderGrid();
}

/* ── Bücher rendern ── */
function renderGrid() {
  const grid = document.getElementById('bookGrid');
  const empty = document.getElementById('emptyState');
  const books = getBooks();

  // Filtern
  let filtered = books.filter(b => {
    const matchGenre = activeGenre === 'all' || (b.genres || []).includes(activeGenre);
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      (b.title || '').toLowerCase().includes(q) ||
      (b.author || '').toLowerCase().includes(q) ||
      (b.genres || []).some(g => g.toLowerCase().includes(q));
    return matchGenre && matchSearch;
  });

  // Alte Karten entfernen (nicht den empty-state)
  [...grid.querySelectorAll('.book-card')].forEach(c => c.remove());

  if (filtered.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  filtered.forEach((book, i) => {
    const card = buildCard(book, i);
    grid.appendChild(card);
  });
}

function buildCard(book, index) {
  const progress = getProgress(book.id);
  const readChapters = Object.values(progress).filter(Boolean).length;
  const totalChapters = (book.chapters || []).length;
  const lastRead = progress._lastChapter ?? null;

  const card = document.createElement('div');
  card.className = 'book-card';
  card.style.animationDelay = (index * 0.05) + 's';
  card.addEventListener('click', () => {
    window.location.href = 'book-detail.html?id=' + book.id;
  });

  // Cover
  let coverHtml;
  if (book.cover) {
    coverHtml = `<img class="book-cover" src="${book.cover}" alt="${escHtml(book.title)}" loading="lazy" />`;
  } else {
    coverHtml = `
      <div class="book-cover-placeholder">
        📖
        <span>${escHtml(book.title)}</span>
      </div>`;
  }

  // Genre Pills
  const genrePills = (book.genres || [])
    .map(g => `<span class="genre-pill">${escHtml(g)}</span>`)
    .join('');

  // Fortschritt
  const progressText = totalChapters
    ? `${readChapters}/${totalChapters} Kap.`
    : `${totalChapters || 0} Kap.`;

  card.innerHTML = `
    ${coverHtml}
    <div class="book-info">
      <div class="book-card-title">${escHtml(book.title)}</div>
      <div class="book-card-author">${escHtml(book.author || 'Unbekannt')}</div>
      <div class="book-card-meta">
        <span class="book-card-chapters"><i class="bi bi-book"></i> ${progressText}</span>
        ${lastRead !== null ? `<span title="Zuletzt gelesen"><i class="bi bi-bookmark-fill" style="color:var(--accent)"></i></span>` : ''}
      </div>
      ${genrePills ? `<div class="book-card-genres">${genrePills}</div>` : ''}
    </div>`;

  return card;
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Suche ── */
document.getElementById('searchInput').addEventListener('input', e => {
  searchQuery = e.target.value;
  renderGrid();
});

/* ── Genre-Filter: "Alle"-Button ── */
document.querySelector('[data-genre="all"]').addEventListener('click', function() {
  filterByGenre('all', this);
});

/* ── Init ── */
(function init() {
  const books = getBooks();
  buildGenreFilter(books);
  renderGrid();
})();
