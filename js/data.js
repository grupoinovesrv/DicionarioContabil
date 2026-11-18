export async function loadDictionary() {
  const response = await fetch('./data/termos.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Falha ao carregar os dados (${response.status})`);
  const payload = await response.json();
  if (!payload || !Array.isArray(payload.termos)) throw new Error('Formato de dados inválido');
  return payload;
}
