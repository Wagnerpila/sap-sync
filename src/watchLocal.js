import { chromium } from 'playwright';
import { config } from './config.js';
import { loginAndOpenHome } from './sapLogin.js';
import { openSearchApp } from './openSearchApp.js';
import { runSearch } from './runSearch.js';
import { exportNotesViaClipboard } from './clipboardExport.js';
import { notaJaExiste, createNote } from './base44Client.js';
import { mapSapRowToBase44Note } from './mapRow.js';
import { resolveStorageStatePath } from './sessionState.js';

const INTERVAL_MINUTES = Number(process.env.SAP_SYNC_INTERVAL_MINUTES || 5);
const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function syncCycle(page) {
  await runSearch(page);
  const rows = await exportNotesViaClipboard(page);
  console.log(`[watch-local] ${rows.length} nota(s) na pesquisa atual.`);

  let created = 0;
  for (const row of rows) {
    const note = mapSapRowToBase44Note(row);
    if (!note.nota) continue;
    if (await notaJaExiste(note.nota)) continue;

    await createNote(note);
    created += 1;
    console.log(`[watch-local] Nota nova gravada no base44: ${note.nota}`);
  }

  if (created === 0) {
    console.log('[watch-local] Nenhuma nota nova.');
  }
}

/**
 * Uso: npm run watch-local
 * Abre UMA janela do navegador (visivel) e a mantem aberta o tempo todo,
 * clicando em "Iniciar" a cada ciclo para verificar notas novas - em vez de
 * abrir/fechar um navegador do zero a cada execucao (como o watch.js faz,
 * pensado para rodar sem interface numa VPS). Bom para rodar no seu PC,
 * onde voce pode acompanhar a tela e nao ha o problema de MFA/CyberArk.
 */
async function main() {
  console.log(`[watch-local] Iniciando modo continuo (verifica a cada ${INTERVAL_MINUTES} min). Feche a janela do navegador ou Ctrl+C para parar.`);

  const browser = await chromium.launch({ headless: config.headless });
  const storageState = resolveStorageStatePath();
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1920, height: 1000 },
    ...(storageState ? { storageState } : {}),
  });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await context.newPage();

  await loginAndOpenHome(page);
  await openSearchApp(page);
  console.log('[watch-local] Login e tela de pesquisa abertos. Deixe esta janela aberta.');

  for (;;) {
    try {
      await syncCycle(page);
    } catch (err) {
      console.error(`[watch-local] Erro no ciclo: ${err.message}`);
      await page.screenshot({ path: `logs/erro-watch-local_${Date.now()}.png` }).catch(() => {});

      console.log('[watch-local] Tentando recuperar: voltando para a home e reabrindo a pesquisa.');
      try {
        await loginAndOpenHome(page);
        await openSearchApp(page);
      } catch (recoverErr) {
        console.error('[watch-local] Falha ao recuperar sessao:', recoverErr.message);
      }
    }

    console.log(`[watch-local] Proxima verificacao em ${INTERVAL_MINUTES} min (${new Date(Date.now() + INTERVAL_MS).toLocaleTimeString('pt-BR')}).`);
    await sleep(INTERVAL_MS);
  }
}

main();
