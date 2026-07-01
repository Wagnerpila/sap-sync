import { chromium } from 'playwright';
import { config } from './config.js';
import { loginAndOpenHome } from './sapLogin.js';
import { openSearchApp } from './openSearchApp.js';
import { runSearch } from './runSearch.js';

/**
 * Uso: npm run login-debug
 * Abre o navegador visivel, loga, clica no tile de pesquisa, dispara a
 * pesquisa e tira um screenshot da tela final. Use isso para:
 *  1) Confirmar se apareceu formulario de login (e ajustar os seletores no .env)
 *  2) Confirmar que o tile e o botao "Iniciar" foram clicados e trouxeram resultados
 *  3) Ver o texto exato do botao de exportar da tabela de notas
 */
async function main() {
  // Em maquina com tela (Windows local), roda visivel por padrao para voce
  // inspecionar ao vivo. Numa VPS sem tela, defina HEADLESS=true no .env -
  // nesse caso a validacao e so pelo screenshot salvo em logs/.
  const browser = await chromium.launch({ headless: config.headless, slowMo: config.headless ? 0 : 200 });
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1920, height: 1000 } });
  const page = await context.newPage();

  await loginAndOpenHome(page);
  await openSearchApp(page);
  await runSearch(page);

  console.log('Pagina carregada. Verifique o screenshot / a tela aberta.');
  console.log('Titulo da pagina:', await page.title());
  await page.screenshot({ path: 'logs/login-debug.png', fullPage: true });
  console.log('Screenshot salvo em logs/login-debug.png');

  if (!config.headless) {
    console.log('\nO navegador vai ficar aberto por 60s para voce inspecionar (F12) os elementos.');
    await page.waitForTimeout(60000);
  }

  await browser.close();
}

main();
