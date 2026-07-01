import { chromium } from 'playwright';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import fs from 'node:fs';
import { config } from './config.js';

const rl = readline.createInterface({ input, output });

async function diag(page, label) {
  const url = page.url();
  const title = await page.title().catch(() => '?');
  console.log(`\n[interactiveLogin] ${label}`);
  console.log('  URL:', url);
  console.log('  Titulo:', title);
}

/**
 * Uso: node src/interactiveLogin.js
 * Roda UMA VEZ, interativamente (precisa de um terminal de verdade - ex: o
 * Console do EasyPanel), para passar pelo login CyberArk com MFA (voce
 * digita o codigo OTP quando pedido) e salvar a sessao resultante.
 *
 * IMPORTANTE: rode isso de dentro do MESMO ambiente (mesmo IP/container) que
 * vai rodar o watch.js depois - a sessao/cookie de confianca pode estar
 * atrelada ao IP de origem.
 */
async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1000 } });
  const page = await context.newPage();

  console.log('[interactiveLogin] Abrindo SAP...');
  await page.goto(config.sap.homeUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await diag(page, 'Apos abrir a home');

  // Passo 1: usuario (tela CyberArk)
  const userField = page.locator('input[type="text"], input[type="email"]').first();
  const hasUserField = await userField.isVisible({ timeout: 20000 }).catch(() => false);
  if (hasUserField) {
    await userField.fill(config.sap.user);
    const nextBtn1 = page.getByRole('button', { name: /next|entrar|continuar|sign in/i }).first();
    await nextBtn1.click().catch(() => page.keyboard.press('Enter'));
    await page.waitForTimeout(2000);
  }
  await diag(page, 'Apos usuario');

  // Passo 2: senha
  const passField = page.locator('input[type="password"]').first();
  const hasPassField = await passField.isVisible({ timeout: 20000 }).catch(() => false);
  if (hasPassField) {
    await passField.fill(config.sap.password);
    const nextBtn2 = page.getByRole('button', { name: /next|entrar|continuar|sign in/i }).first();
    await nextBtn2.click().catch(() => page.keyboard.press('Enter'));
    await page.waitForTimeout(2000);
  }
  await diag(page, 'Apos senha');

  // Passo 3: OTP (codigo digitado)
  const otpField = page.locator('input[type="text"], input[type="tel"], input[type="number"]').first();
  const hasOtp = await otpField.isVisible({ timeout: 15000 }).catch(() => false);
  if (hasOtp) {
    await diag(page, 'Tela de OTP detectada');
    const codigo = await rl.question('\n>>> Digite o codigo OTP que voce recebeu e aperte Enter: ');
    await otpField.fill(codigo.trim());
    const verifyBtn = page.getByRole('button', { name: /verify|confirm|sign in|entrar|continuar/i }).first();
    await verifyBtn.click().catch(() => page.keyboard.press('Enter'));
  } else {
    console.log('[interactiveLogin] Campo de OTP nao apareceu - talvez o login ja tenha passado direto.');
  }

  console.log('\n[interactiveLogin] Aguardando chegar na home do SAP (ate 90s)...');
  try {
    await page.getByText(config.sap.tileText, { exact: false }).first().waitFor({ state: 'visible', timeout: 90000 });
  } catch (err) {
    await diag(page, 'FALHOU - nao chegou na home');
    console.error('[interactiveLogin] Nao foi possivel confirmar o login. Veja o diagnostico acima.');
    await browser.close();
    rl.close();
    process.exit(1);
  }

  console.log('[interactiveLogin] Login concluido! Salvando sessao...');

  fs.mkdirSync('logs', { recursive: true });
  const statePath = 'logs/sap-session.json';
  await context.storageState({ path: statePath });

  const base64 = fs.readFileSync(statePath).toString('base64');
  console.log('\n=== COPIE TUDO ENTRE AS LINHAS ABAIXO E COLE NA VARIAVEL DE AMBIENTE SAP_SESSION_STATE_B64 (no EasyPanel) ===');
  console.log(base64);
  console.log('=== FIM - nao inclua essas linhas de "===" ao colar ===\n');

  await browser.close();
  rl.close();
}

main().catch((err) => {
  console.error('[interactiveLogin] Erro:', err.message);
  process.exit(1);
});
