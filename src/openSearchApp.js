import { config } from './config.js';

/**
 * A partir da pagina inicial do Fiori, clica no tile "Procurar nota de
 * manutencao" e espera a navegacao realmente acontecer (a transicao de tile
 * para o app pode levar alguns segundos e "networkidle" nao e confiavel
 * nesses apps Fiori, que ficam com polling/websocket em segundo plano).
 */
export async function openSearchApp(page) {
  const tile = page.getByText(config.sap.tileText, { exact: false }).first();
  await tile.waitFor({ state: 'visible', timeout: 30000 });

  for (let attempt = 1; attempt <= 3; attempt++) {
    await tile.click({ force: true }).catch(() => {});

    const navigated = await page
      .waitForFunction(
        () => !document.title.includes('inicial') && !document.title.includes('Página inicial'),
        { timeout: 15000 }
      )
      .then(() => true)
      .catch(() => false);

    if (navigated) {
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000); // deixa a tela de filtros renderizar por completo
      return;
    }

    console.log(`[openSearchApp] Tentativa ${attempt}: ainda na pagina inicial, tentando de novo.`);
  }

  throw new Error(
    `Nao foi possivel abrir o app "${config.sap.tileText}" apos 3 tentativas - a tela continua na pagina inicial.`
  );
}
