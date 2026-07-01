import { config } from './config.js';

/**
 * Abre a pagina inicial do Fiori Launchpad (login e automatico via SSO
 * neste ambiente). Mantemos o preenchimento de usuario/senha como fallback
 * caso apareca uma tela de login (ex: sessao SSO expirada).
 *
 * Deliberadamente navegamos ate a HOME (sem #hash de app) em vez de um deep
 * link direto: testamos e o deep link cai na pagina inicial mesmo assim
 * quando aberto num navegador novo (o roteador da SPA ainda nao esta pronto
 * quando o hash e processado). Clicar no tile manualmente (proximo passo,
 * ver openSearchApp.js) e mais confiavel.
 */
export async function loginAndOpenHome(page) {
  await page.goto(config.sap.homeUrl, { waitUntil: 'domcontentloaded' });

  if (config.sap.user && config.sap.password) {
    const userField = page.locator(config.sap.userSelector);
    const hasLoginForm = await userField.first().isVisible({ timeout: 8000 }).catch(() => false);

    if (hasLoginForm) {
      console.log('[sapLogin] Formulario de login detectado, preenchendo credenciais.');
      await userField.fill(config.sap.user);
      await page.locator(config.sap.passwordSelector).fill(config.sap.password);
      await page.locator(config.sap.loginButtonSelector).click();
    }
  }

  // NAO usar waitForLoadState('networkidle') aqui: apps Fiori mantem
  // polling/websocket em segundo plano, entao "networkidle" praticamente
  // nunca acontece e o script ficaria travado ate estourar o timeout.
  // Esperamos por um indicador concreto de que a home carregou.
  await page.getByText(config.sap.tileText, { exact: false }).first().waitFor({ state: 'visible', timeout: 30000 });
}
