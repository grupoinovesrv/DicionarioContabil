export function normalizeTerm(term, defaults = {}) {
  const definition = term.definicao || term.resumo || '';
  return {
    sigla: '',
    nomeCompleto: term.termo,
    resumo: definition,
    definicao: definition,
    exemploPratico: '',
    palavrasChave: [],
    sinonimos: [],
    termosRelacionados: [],
    fonte: defaults.fonte || '',
    revisaoTecnica: defaults.revisaoTecnica || 'revisada',
    ...term
  };
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Falha ao carregar ${path} (${response.status})`);
  return response.json();
}

export async function loadDictionary() {
  const [payload, legalPayload] = await Promise.all([
    fetchJson('./data/termos.json'),
    fetchJson('./data/legalizacao.json')
  ]);
  if (!payload || !Array.isArray(payload.termos) || !Array.isArray(legalPayload.termos)) {
    throw new Error('Formato de dados inválido');
  }
  const baseTerms = payload.termos.map((term) => normalizeTerm(term));
  const legalTerms = legalPayload.termos.map((term) => normalizeTerm(term, {
    fonte: legalPayload.meta.fonte,
    revisaoTecnica: 'revisada'
  }));
  return { ...payload, termos: [...baseTerms, ...legalTerms] };
}
