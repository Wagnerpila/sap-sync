import { config } from './config.js';

/**
 * Clica no botao "Iniciar" da tela "Procurar nota de manutencao" para
 * disparar a pesquisa com os filtros salvos (Tipo M4, Centro 28742,
 * Status Em aberto/Em processamento, Criado Hoje).
 *
 * Isso e necessario mesmo com o link ja tendo os filtros salvos, porque o
 * filtro "Hoje" e relativo: precisa a pesquisa ser executada no momento
 * certo para trazer a data atual, e nao uma data congelada de quando o
 * link foi salvo.
 */
export async function runSearch(page) {
  const searchButton = page.getByRole('button', { name: config.sap.searchButtonText, exact: false });

  const isVisible = await searchButton.first().isVisible({ timeout: 20000 }).catch(() => false);
  if (!isVisible) {
    console.log(
      `[runSearch] Botao "${config.sap.searchButtonText}" nao encontrado - assumindo que a pesquisa ja ` +
      'rodou automaticamente ao abrir o link.'
    );
    return;
  }

  await searchButton.first().click();

  // NAO usar waitForLoadState('networkidle'): apps Fiori mantem
  // polling/websocket em segundo plano e isso quase nunca dispara,
  // travando o script ate estourar o timeout. Esperamos o cabecalho de
  // resultados ("Notas PM (N)") aparecer/atualizar como indicador concreto.
  await page.getByText(/Notas PM \(/, { exact: false }).first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
}
