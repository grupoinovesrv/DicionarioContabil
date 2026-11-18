export function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function includesAll(haystack, tokens) {
  return tokens.every((token) => haystack.includes(token));
}

export function scoreTerm(term, rawQuery) {
  const query = normalizeText(rawQuery);
  if (!query) return 0;

  const tokens = query.split(' ').filter(Boolean);
  const title = normalizeText(term.termo);
  const acronym = normalizeText(term.sigla);
  const fullName = normalizeText(term.nomeCompleto);
  const synonyms = (term.sinonimos || []).map(normalizeText);
  const keywords = (term.palavrasChave || []).map(normalizeText);
  const category = normalizeText(`${term.categoria} ${term.subcategoria || ''}`);
  const descriptive = normalizeText(`${term.resumo} ${term.definicao} ${term.exemploPratico || ''}`);
  const combined = [title, acronym, fullName, ...synonyms, ...keywords, category, descriptive].join(' ');

  if (!includesAll(combined, tokens)) return -1;

  let score = 0;
  if (title === query) score += 1200;
  if (acronym && acronym === query) score += 1100;
  if (fullName === query) score += 950;
  if (title.startsWith(query)) score += 700;
  if (acronym.startsWith(query)) score += 650;
  if (fullName.startsWith(query)) score += 550;
  if (synonyms.some((item) => item === query)) score += 500;
  if (synonyms.some((item) => item.includes(query))) score += 360;
  if (keywords.some((item) => item === query)) score += 330;
  if (keywords.some((item) => item.includes(query))) score += 250;
  if (title.includes(query)) score += 230;
  if (fullName.includes(query)) score += 190;
  if (category.includes(query)) score += 90;
  if (descriptive.includes(query)) score += 70;
  score += tokens.reduce((total, token) => total + (title.includes(token) ? 30 : 0), 0);
  return score;
}

export function searchTerms(terms, query) {
  const normalized = normalizeText(query);
  if (!normalized) return terms.map((term) => ({ term, score: 0 }));
  return terms
    .map((term) => ({ term, score: scoreTerm(term, normalized) }))
    .filter((result) => result.score >= 0)
    .sort((a, b) => b.score - a.score || a.term.termo.localeCompare(b.term.termo, 'pt-BR'));
}
