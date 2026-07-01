import { chromium } from 'playwright';
import { config } from './config.js';
import { loginAndOpenHome } from './sapLogin.js';
import { openSearchApp } from './openSearchApp.js';
import { runSearch } from './runSearch.js';
import { exportNotesViaClipboard } from './clipboardExport.js';
import { notaJaExiste, createNote } from './base44Client.js';
import { mapSapRowToBase44Note } from './mapRow.js';

async function main() {
  console.log(`[sync] Iniciando em ${new Date().toISOString()}`);
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
    console.log(`[sync] ${rows.length} linhas na pesquisa do SAP.`);

    let created = 0;

    for (const row of rows) {
      const note = mapSapRowToBase44Note(row);
      if (!note.nota) continue;
      if (await notaJaExiste(note.nota)) continue;

      await createNote(note);
      created += 1;
      console.log(`[sync] Nota criada: ${note.nota}`);
    }

    console.log(`[sync] Concluido. ${created} nota(s) nova(s) gravada(s) no base44.`);
  } catch (err) {
    console.error('[sync] Erro:', err.message);
    await page.screenshot({ path: `logs/erro_${Date.now()}.png` }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
