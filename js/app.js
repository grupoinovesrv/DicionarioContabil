import { loadDictionary } from './data.js';
import { normalizeText, searchTerms } from './search.js';

const elements = {
  search: document.querySelector('#search'),
  clearSearch: document.querySelector('#clear-search'),
  categoryFilters: document.querySelector('#category-filters'),
  totalTerms: document.querySelector('#total-terms'),
  totalCategories: document.querySelector('#total-categories'),
  resultCount: document.querySelector('#result-count'),
  sort: document.querySelector('#sort'),
  favoritesFilter: document.querySelector('#favorites-filter'),
  letterButtons: document.querySelector('#letter-buttons'),
  allLetters: document.querySelector('.alphabet > button'),
  resultsTitle: document.querySelector('#results-title'),
  activeContext: document.querySelector('#active-context'),
  loading: document.querySelector('#loading-state'),
  error: document.querySelector('#error-state'),
  empty: document.querySelector('#empty-state'),
  clearFilters: document.querySelector('#clear-filters'),
  cards: document.querySelector('#cards'),
  version: document.querySelector('#version'),
  reviewDate: document.querySelector('#review-date'),
  drawer: document.querySelector('#term-drawer'),
  drawerBackdrop: document.querySelector('#drawer-backdrop'),
  drawerCategory: document.querySelector('#drawer-category'),
  drawerContent: document.querySelector('#drawer-content'),
  closeDrawer: document.querySelector('#close-drawer'),
  toast: document.querySelector('#toast')
};

const state = {
  terms: [],
  categories: [],
  termById: new Map(),
  query: '',
  category: 'Todos',
  letter: '',
  sort: 'az',
  favoritesOnly: false,
  favorites: loadFavorites(),
  openTermId: null,
  previousFocus: null
};

let toastTimer;
let searchTimer;

function loadFavorites() {
  try {
    const stored = JSON.parse(localStorage.getItem('inove-dicionario-favoritos') || '[]');
    return new Set(Array.isArray(stored) ? stored : []);
  } catch {
    return new Set();
  }
}

function saveFavorites() {
  try {
    localStorage.setItem('inove-dicionario-favoritos', JSON.stringify([...state.favorites]));
  } catch {
    showToast('Não foi possível salvar os favoritos neste navegador.');
  }
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function icon(path, filled = false) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  if (filled) svg.style.fill = 'currentColor';
  const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  shape.setAttribute('d', path);
  svg.append(shape);
  return svg;
}

function categoryColor(name) {
  return state.categories.find((item) => item.nome === name)?.cor || '#4C83B6';
}

function categoryTag(name, color) {
  const tag = el('span', 'category-tag', name);
  tag.style.setProperty('--category-color', color);
  return tag;
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  toastTimer = setTimeout(() => elements.toast.classList.remove('show'), 2600);
}

function persistableCopy(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.append(area);
  area.select();
  const copied = document.execCommand('copy');
  area.remove();
  return copied ? Promise.resolve() : Promise.reject(new Error('copy failed'));
}

function renderCategories() {
  elements.categoryFilters.replaceChildren();
  const counts = new Map();
  state.terms.forEach((term) => counts.set(term.categoria, (counts.get(term.categoria) || 0) + 1));
  const options = [{ nome: 'Todos', rotulo: 'Todos', cor: '#4C83B6' }, ...state.categories];

  options.forEach((category) => {
    const button = el('button', `filter-chip${state.category === category.nome ? ' active' : ''}`);
    button.type = 'button';
    button.dataset.category = category.nome;
    button.style.setProperty('--chip-color', category.cor);
    const count = category.nome === 'Todos' ? state.terms.length : (counts.get(category.nome) || 0);
    button.textContent = `${category.rotulo} (${count})`;
    button.setAttribute('aria-pressed', String(state.category === category.nome));
    if (category.nome !== 'Todos' && count === 0) {
      button.disabled = true;
      button.title = 'Nenhum termo desta categoria foi encontrado no material de origem.';
    }
    button.addEventListener('click', () => {
      state.category = category.nome;
      state.letter = '';
      renderCategories();
      updateLetterButtons();
      renderResults();
    });
    elements.categoryFilters.append(button);
  });
}

function renderAlphabet() {
  elements.letterButtons.replaceChildren();
  for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    const button = el('button', '', letter);
    button.type = 'button';
    button.dataset.letter = letter;
    button.setAttribute('aria-label', `Mostrar termos iniciados por ${letter}`);
    button.addEventListener('click', () => {
      state.letter = letter;
      updateLetterButtons();
      renderResults();
    });
    elements.letterButtons.append(button);
  }
  elements.allLetters.addEventListener('click', () => {
    state.letter = '';
    updateLetterButtons();
    renderResults();
  });
  updateLetterButtons();
}

function updateLetterButtons() {
  const available = new Set(
    state.terms
      .filter((term) => state.category === 'Todos' || term.categoria === state.category)
      .map((term) => normalizeText(term.termo).charAt(0).toUpperCase())
  );
  elements.allLetters.classList.toggle('active', !state.letter);
  elements.allLetters.setAttribute('aria-pressed', String(!state.letter));
  elements.letterButtons.querySelectorAll('button').forEach((button) => {
    button.disabled = !available.has(button.dataset.letter);
    button.classList.toggle('active', state.letter === button.dataset.letter);
    button.setAttribute('aria-pressed', String(state.letter === button.dataset.letter));
  });
}

function filteredResults() {
  let terms = state.terms.filter((term) => state.category === 'Todos' || term.categoria === state.category);
  if (state.letter) terms = terms.filter((term) => normalizeText(term.termo).startsWith(state.letter.toLowerCase()));
  if (state.favoritesOnly) terms = terms.filter((term) => state.favorites.has(term.id));

  const results = searchTerms(terms, state.query);
  if (!state.query) {
    results.sort((a, b) => {
      const comparison = a.term.termo.localeCompare(b.term.termo, 'pt-BR', { sensitivity: 'base' });
      return state.sort === 'az' ? comparison : -comparison;
    });
  }
  return results;
}

function favoriteButton(term, compact = false) {
  const active = state.favorites.has(term.id);
  const button = el('button', compact ? 'drawer-action' : `favorite-button${active ? ' active' : ''}`);
  button.type = 'button';
  button.setAttribute('aria-pressed', String(active));
  button.setAttribute('aria-label', active ? `Remover ${term.termo} dos favoritos` : `Adicionar ${term.termo} aos favoritos`);
  button.append(icon('m12 3 2.8 5.8 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.7l6.2-.9L12 3Z', active));
  if (compact) button.append(document.createTextNode(active ? 'Remover favorito' : 'Favoritar'));
  button.addEventListener('click', () => {
    if (state.favorites.has(term.id)) state.favorites.delete(term.id);
    else state.favorites.add(term.id);
    saveFavorites();
    renderResults();
    if (state.openTermId === term.id) openTerm(term.id, { updateHash: false, restoreFocus: false });
    showToast(state.favorites.has(term.id) ? 'Termo salvo nos favoritos deste dispositivo.' : 'Termo removido dos favoritos.');
  });
  return button;
}

function renderCard(term) {
  const card = el('article', 'term-card');
  const color = categoryColor(term.categoria);
  card.style.setProperty('--category-color', color);

  const top = el('div', 'card-top');
  top.append(categoryTag(term.categoria, color), favoriteButton(term));
  const heading = el('h3', '', term.termo);
  const fullName = el('p', 'full-name', term.nomeCompleto && term.nomeCompleto !== term.termo ? term.nomeCompleto : '');
  const summary = el('p', 'summary', term.resumo);
  const footer = el('div', 'card-footer');
  const details = el('button', 'detail-button', 'Ver detalhes →');
  details.type = 'button';
  details.setAttribute('aria-label', `Ver detalhes de ${term.termo}`);
  details.addEventListener('click', () => openTerm(term.id));
  footer.append(details);
  if (term.revisaoTecnica === 'pendente') footer.append(el('span', 'review-flag', 'Revisão técnica pendente'));
  card.append(top, heading, fullName, summary, footer);
  return card;
}

function renderResults() {
  const results = filteredResults();
  elements.cards.replaceChildren(...results.map(({ term }) => renderCard(term)));
  elements.cards.hidden = results.length === 0;
  elements.empty.hidden = results.length !== 0;
  elements.resultCount.textContent = String(results.length);
  elements.clearSearch.hidden = !state.query;

  const titleParts = [];
  if (state.favoritesOnly) titleParts.push('Favoritos');
  if (state.category !== 'Todos') titleParts.push(state.category);
  if (state.letter) titleParts.push(`Letra ${state.letter}`);
  elements.resultsTitle.textContent = titleParts.length ? titleParts.join(' · ') : 'Todos os termos';
  elements.activeContext.textContent = state.query
    ? `Resultados por relevância para “${state.query}”`
    : `Ordenados de ${state.sort === 'az' ? 'A a Z' : 'Z a A'}`;
}

function addDrawerSection(title, contentNode) {
  const section = el('section', 'drawer-section');
  section.append(el('h3', '', title), contentNode);
  elements.drawerContent.append(section);
}

function openTerm(id, options = {}) {
  const { updateHash = true, restoreFocus = true } = options;
  const term = state.termById.get(id);
  if (!term) return;
  if (restoreFocus && state.openTermId !== id) state.previousFocus = document.activeElement;
  state.openTermId = id;
  elements.drawerContent.replaceChildren();
  elements.drawerCategory.replaceChildren();
  const color = categoryColor(term.categoria);
  elements.drawerCategory.append(categoryTag(term.categoria, color));
  if (term.subcategoria) elements.drawerCategory.append(categoryTag(term.subcategoria, color));

  const title = el('h2', '', term.termo);
  title.id = 'drawer-title';
  elements.drawerContent.append(title);
  if (term.nomeCompleto && term.nomeCompleto !== term.termo) elements.drawerContent.append(el('p', 'drawer-full-name', term.nomeCompleto));

  const actions = el('div', 'drawer-actions');
  const copyDefinition = el('button', 'drawer-action');
  copyDefinition.type = 'button';
  copyDefinition.append(icon('M8 8h11v11H8zM5 16H4V5h11v1'), document.createTextNode('Copiar definição'));
  copyDefinition.addEventListener('click', async () => {
    try { await persistableCopy(`${term.termo}: ${term.definicao}`); showToast('Definição copiada.'); }
    catch { showToast('Não foi possível copiar a definição.'); }
  });
  const share = el('button', 'drawer-action');
  share.type = 'button';
  share.append(icon('M8 12h8m-3-3 3 3-3 3M5 5h14v14H5z'), document.createTextNode('Copiar link'));
  share.addEventListener('click', async () => {
    const url = new URL(window.location.href);
    url.hash = `/termo/${term.id}`;
    try { await persistableCopy(url.href); showToast('Link do termo copiado.'); }
    catch { showToast('Não foi possível copiar o link.'); }
  });
  actions.append(favoriteButton(term, true), copyDefinition, share);
  elements.drawerContent.append(actions);

  addDrawerSection('Definição', el('p', '', term.definicao));
  if (term.exemploPratico) addDrawerSection('Na prática', el('p', '', term.exemploPratico));

  if (term.termosRelacionados?.length) {
    const related = el('div', 'related-list');
    term.termosRelacionados.forEach((relatedId) => {
      const relatedTerm = state.termById.get(relatedId);
      if (!relatedTerm) return;
      const button = el('button', 'related-button', relatedTerm.termo);
      button.type = 'button';
      button.addEventListener('click', () => openTerm(relatedId));
      related.append(button);
    });
    if (related.children.length) addDrawerSection('Termos relacionados', related);
  }

  const keywords = [...new Set([...(term.palavrasChave || []), ...(term.sinonimos || [])])];
  if (keywords.length) {
    const list = el('div', 'keyword-list');
    keywords.forEach((keyword) => list.append(el('span', 'keyword', keyword)));
    addDrawerSection('Palavras-chave', list);
  }
  if (term.fonte) addDrawerSection('Fonte ou referência', el('p', 'source-note', term.fonte));
  if (term.revisaoTecnica === 'pendente') {
    elements.drawerContent.append(el('p', 'technical-note', 'Este registro contém regra, prazo, limite ou tema em transição. Valide a aplicação e a vigência com a equipe técnica antes de orientar clientes.'));
  }

  elements.drawer.hidden = false;
  elements.drawerBackdrop.hidden = false;
  requestAnimationFrame(() => {
    elements.drawer.classList.add('open');
    elements.drawerBackdrop.classList.add('open');
  });
  elements.drawer.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  if (updateHash) history.replaceState(null, '', `#/termo/${term.id}`);
  elements.closeDrawer.focus();
}

function closeDrawer({ updateHash = true } = {}) {
  if (!state.openTermId) return;
  state.openTermId = null;
  elements.drawer.classList.remove('open');
  elements.drawerBackdrop.classList.remove('open');
  elements.drawer.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (updateHash) history.replaceState(null, '', `${location.pathname}${location.search}`);
  setTimeout(() => {
    elements.drawer.hidden = true;
    elements.drawerBackdrop.hidden = true;
  }, 230);
  if (state.previousFocus instanceof HTMLElement) state.previousFocus.focus();
}

function termIdFromHash() {
  const match = location.hash.match(/^#\/termo\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function resetFilters() {
  state.query = '';
  state.category = 'Todos';
  state.letter = '';
  state.favoritesOnly = false;
  elements.search.value = '';
  elements.favoritesFilter.setAttribute('aria-pressed', 'false');
  renderCategories();
  updateLetterButtons();
  renderResults();
  elements.search.focus();
}

function bindEvents() {
  elements.search.addEventListener('input', (event) => {
    clearTimeout(searchTimer);
    const value = event.target.value;
    elements.clearSearch.hidden = !value;
    searchTimer = setTimeout(() => {
      state.query = value.trim();
      state.letter = '';
      updateLetterButtons();
      renderResults();
    }, 120);
  });
  elements.clearSearch.addEventListener('click', () => {
    state.query = '';
    elements.search.value = '';
    renderResults();
    elements.search.focus();
  });
  elements.sort.addEventListener('change', () => {
    state.sort = elements.sort.value;
    renderResults();
  });
  elements.favoritesFilter.addEventListener('click', () => {
    state.favoritesOnly = !state.favoritesOnly;
    elements.favoritesFilter.setAttribute('aria-pressed', String(state.favoritesOnly));
    renderResults();
  });
  elements.clearFilters.addEventListener('click', resetFilters);
  elements.closeDrawer.addEventListener('click', () => closeDrawer());
  elements.drawerBackdrop.addEventListener('click', () => closeDrawer());
  window.addEventListener('hashchange', () => {
    const id = termIdFromHash();
    if (id && state.termById.has(id)) openTerm(id, { updateHash: false });
    else if (!id) closeDrawer({ updateHash: false });
  });
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      elements.search.focus();
      elements.search.select();
    }
    if (event.key === 'Escape' && state.openTermId) closeDrawer();
    if (event.key === 'Tab' && state.openTermId) {
      const focusable = [...elements.drawer.querySelectorAll('button, [href], input, select, [tabindex]:not([tabindex="-1"])')].filter((item) => !item.disabled);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
}

function formatDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(year, month - 1, day));
}

async function init() {
  bindEvents();
  try {
    const dictionary = await loadDictionary();
    state.terms = dictionary.termos;
    state.categories = dictionary.categorias;
    state.termById = new Map(state.terms.map((term) => [term.id, term]));
    state.favorites = new Set([...state.favorites].filter((id) => state.termById.has(id)));
    saveFavorites();

    const representedCategories = new Set(state.terms.map((term) => term.categoria));
    elements.totalTerms.textContent = String(state.terms.length);
    elements.totalCategories.textContent = String(representedCategories.size);
    elements.version.textContent = dictionary.meta.versao;
    elements.reviewDate.textContent = formatDate(dictionary.meta.ultimaRevisao);
    elements.reviewDate.dateTime = dictionary.meta.ultimaRevisao;
    elements.loading.hidden = true;
    renderCategories();
    renderAlphabet();
    renderResults();

    const initialId = termIdFromHash();
    if (initialId && state.termById.has(initialId)) openTerm(initialId, { updateHash: false });
  } catch (error) {
    console.error(error);
    elements.loading.hidden = true;
    elements.error.hidden = false;
  }
}

init();
