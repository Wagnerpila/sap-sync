import { chromium } from 'playwright';
import { config } from './config.js';
import { loginAndOpenHome } from './sapLogin.js';
import { openSearchApp } from './openSearchApp.js';
import { runSearch } from './runSearch.js';
import { exportNotesViaClipboard } from './clipboardExport.js';
import { notaJaExiste, createNote } from './base44Client.js';
import { mapSapRowToBase44Note } from './mapRow.js';

const INTERVAL_MINUTES = Number(process.env.SAP_SYNC_INTERVAL_MINUTES || 5);
const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Cada ciclo abre um navegador do zero, faz login, pesquisa, le a tabela
 * via clipboard e fecha. Reiniciar o navegador a cada ciclo custa poucos
 * segundos e evita estados sujos (overlays travados) de ciclos anteriores.
 */
async function syncOnce() {
  const browser = await chromium.launch({ headless: config.headless });
  // Viewport largo e necessario: numa janela estreita o SAP esconde colunas
  // (ex: "Fim da avaria", "Notificador") da tabela responsiva, e o "Copiar
  // para clipboard" so copia o que esta realmente visivel.
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1920, height: 1000 } });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await context.newPage();

  try {
    await loginAndOpenHome(page);
    await openSearchApp(page);
    await runSearch(page);
    const rows = await exportNotesViaClipboard(page);
    console.log(`[watch] ${rows.length} nota(s) na pesquisa atual.`);

    let created = 0;
    for (const row of rows) {
      const note = mapSapRowToBase44Note(row);
      if (!note.nota) continue;
      if (await notaJaExiste(note.nota)) continue;

      await createNote(note);
      created += 1;
      console.log(`[watch] Nota nova gravada no base44: ${note.nota}`);
    }

    if (created === 0) {
      console.log('[watch] Nenhuma nota nova.');
    }
  } catch (err) {
    console.error(`[watch] Erro no ciclo: ${err.message}`);
    await page.screenshot({ path: `logs/erro-watch_${Date.now()}.png` }).catch(() => {});
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log(`[watch] Iniciando modo continuo (verifica a cada ${INTERVAL_MINUTES} min). Ctrl+C para parar.`);

  for (;;) {
    await syncOnce();
    console.log(`[watch] Proxima verificacao em ${INTERVAL_MINUTES} min (${new Date(Date.now() + INTERVAL_MS).toLocaleTimeString('pt-BR')}).`);
    await sleep(INTERVAL_MS);
  }
}

main();
