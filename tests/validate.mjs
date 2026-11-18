import { readFile } from 'node:fs/promises';
import { searchTerms } from '../js/search.js';
import { normalizeTerm } from '../js/data.js';

const payload = JSON.parse(await readFile(new URL('../data/termos.json', import.meta.url), 'utf8'));
const legalPayload = JSON.parse(await readFile(new URL('../data/legalizacao.json', import.meta.url), 'utf8'));
const terms = [
  ...payload.termos.map((term) => normalizeTerm(term)),
  ...legalPayload.termos.map((term) => normalizeTerm(term, { fonte: legalPayload.meta.fonte }))
];
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const ids = terms.map((term) => term.id);
assert(new Set(ids).size === ids.length, 'Existem IDs duplicados.');
assert(terms.length === 159, `Esperados 159 registros, encontrados ${terms.length}.`);

for (const term of terms) {
  assert(term.id && term.termo && term.categoria && term.resumo && term.definicao, `Campos obrigatórios ausentes em ${term.id || '(sem id)'}.`);
  for (const relatedId of term.termosRelacionados || []) {
    assert(ids.includes(relatedId), `Relação inválida: ${term.id} -> ${relatedId}.`);
  }
}

const first = (query, subset = terms) => searchTerms(subset, query)[0]?.term.id;
assert(first('DRE') === 'dre', 'A busca por DRE não priorizou DRE.');
assert(first('balanco') === 'balanco-patrimonial', 'A busca sem acento por balanco falhou.');
assert(first('CNPJ') === 'cnpj', 'A busca por CNPJ não priorizou CNPJ.');
assert(first('DBE') === 'dbe', 'A busca por DBE não priorizou DBE.');
assert(first('JUCESP') === 'jucesp', 'A busca por JUCESP não priorizou JUCESP.');
assert(searchTerms(terms, 'alteracao').some(({ term }) => ['atos-empresariais', 'cnae', 'capital-social'].includes(term.id)), 'A busca por alteracao não encontrou registros relacionados.');
assert(searchTerms(terms, 'palavra-totalmente-inexistente').length === 0, 'A busca inexistente deveria retornar zero resultados.');

const legal = terms.filter((term) => term.categoria === 'Legalização Empresarial');
assert(first('CNAE', legal) === 'cnae', 'O filtro Legalização + CNAE não priorizou CNAE.');
assert(first('CNPJ', legal) === 'cnpj', 'O filtro Legalização + CNPJ não priorizou CNPJ.');
assert(legal.every((term) => term.id !== 'legalizacao'), 'Foi encontrado um card genérico de Legalização.');

if (failures.length) {
  console.error(`Falharam ${failures.length} validações:`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const counts = Object.fromEntries(
  [...new Set(terms.map((term) => term.categoria))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    .map((category) => [category, terms.filter((term) => term.categoria === category).length])
);

console.log(`OK — ${terms.length} termos, ${Object.keys(counts).length} categorias, IDs únicos e relações válidas.`);
console.log(JSON.stringify(counts, null, 2));
