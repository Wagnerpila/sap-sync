import { createClient } from '@base44/sdk';
import { config } from './config.js';

const base44 = createClient({
  appId: config.base44.appId,
  headers: {
    api_key: config.base44.apiKey,
  },
});

/**
 * Verifica se ja existe uma Nota no base44 com esse numero (campo "nota").
 * Checamos uma por uma (em vez de baixar todo o histórico) porque o volume
 * de notas exportadas por execucao e pequeno e isso funciona
 * independente de quantas notas ja existem no total.
 */
export async function notaJaExiste(notaNumero) {
  // Nota: base44.entities.Nota.list({ q: {...} }) NAO filtra corretamente
  // nessa versao do SDK (sempre retorna vazio) - .filter() e o metodo que
  // realmente aplica o filtro no servidor.
  const records = await base44.entities.Nota.filter({ nota: notaNumero });
  const list = Array.isArray(records) ? records : records.data || [];
  return list.length > 0;
}

export async function createNote(note) {
  return base44.entities.Nota.create(note);
}
