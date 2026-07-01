// Em vez de "Exportar" (que abre uma caixa de dialogo instavel e um
// download de xlsx), selecionamos todas as linhas da tabela e usamos
// "Copiar para clipboard" - copia os dados como texto (TSV) direto na
// area de transferencia do SO, sem dialogo nenhum.

async function selectAllRows(page) {
  const checkboxes = page.getByRole('checkbox');
  const count = await checkboxes.count();
  if (count === 0) return 0;

  // Clicar no checkbox de "selecionar tudo" do cabecalho (index 0) nao
  // propagou a selecao para todas as linhas de forma confiavel. Clicamos
  // uma a uma nas linhas de dados (pulando o cabecalho, index 0).
  let selecionadas = 0;
  for (let i = 1; i < count; i++) {
    const checkbox = checkboxes.nth(i);
    const visible = await checkbox.isVisible().catch(() => false);
    if (!visible) continue;

    await checkbox.click().catch(() => {});
    await page.waitForTimeout(200);
    selecionadas += 1;
  }

  return selecionadas;
}

// O texto copiado NAO tem linha de cabecalho, so as linhas de dados, na
// ordem: Local de instalacao, Descricao do objeto tecnico, Fim da avaria
// (as vezes vazio), Nota, (Ordem)Descricao, Notificador (codigo e/ou nome).
// Como "Fim da avaria" pode vir vazio e isso desloca a contagem fixa de
// colunas de forma inconsistente, localizamos a coluna "Nota" pelo formato
// (e sempre um numero puro) e usamos ela como ancora, em vez de contar
// posicoes fixas.
const ORDEM_DESCRICAO_REGEX = /^\((\d+)\)\s*(.*)$/;
const NOTA_REGEX = /^\d+$/;

function parseClipboardLine(line) {
  const fields = line.split('\t');
  const localInstalacao = (fields[0] || '').trim();
  const descricaoObjetoTecnico = (fields[1] || '').trim();

  let notaIndex = -1;
  for (let i = 2; i < fields.length; i++) {
    if (NOTA_REGEX.test(fields[i].trim())) {
      notaIndex = i;
      break;
    }
  }
  if (notaIndex === -1) return null; // linha em formato inesperado, ignora

  const fimAvaria = fields.slice(2, notaIndex).join(' ').trim();
  const nota = fields[notaIndex].trim();
  const ordemDescricao = (fields[notaIndex + 1] || '').trim();
  const notificadorPartes = fields.slice(notaIndex + 2).map((s) => s.trim()).filter(Boolean);

  const match = ordemDescricao.match(ORDEM_DESCRICAO_REGEX);
  const ordem = match ? match[1] : '';
  const descricao = (match ? match[2] : ordemDescricao).trim();

  // notificadorPartes pode vir como [codigo, nome], so [codigo], ou vazio
  let notificador = '';
  if (notificadorPartes.length >= 2) {
    notificador = `${notificadorPartes[1]} (${notificadorPartes[0]})`;
  } else if (notificadorPartes.length === 1) {
    notificador = notificadorPartes[0];
  }

  return {
    local_instalacao: localInstalacao,
    descricao_objeto_tecnico: descricaoObjetoTecnico,
    fim_avaria: fimAvaria,
    nota,
    ordem,
    descricao,
    notificador,
  };
}

function parseClipboardText(text) {
  return text
    .replace(/\r/g, '')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map(parseClipboardLine)
    .filter(Boolean);
}

const COPY_BUTTON_CANDIDATES = ['Copiar para clipboard', 'Copiar', 'Copy to clipboard', 'Copy'];

async function findCopyButton(page) {
  for (const text of COPY_BUTTON_CANDIDATES) {
    const candidate = page.getByRole('button', { name: text, exact: false });
    if (await candidate.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      return candidate.first();
    }
  }

  // Fallback: se a janela estiver estreita, o botao pode estar escondido
  // dentro do menu "..." (mais acoes) da barra de ferramentas da tabela.
  const overflowButton = page.locator('button[id$="overflowButton"]');
  if (await overflowButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    await overflowButton.first().click();
    for (const text of COPY_BUTTON_CANDIDATES) {
      const candidate = page.getByText(text, { exact: false });
      if (await candidate.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        return candidate.first();
      }
    }
  }

  return null;
}

/**
 * Seleciona todas as linhas da tabela de notas, clica em "Copiar para
 * clipboard" e le o conteudo copiado (TSV sem cabecalho) direto da area de
 * transferencia, ja convertido em objetos { local_instalacao,
 * descricao_objeto_tecnico, fim_avaria, nota, ordem, descricao }.
 */
export async function exportNotesViaClipboard(page) {
  const selecionadas = await selectAllRows(page);
  if (selecionadas === 0) {
    return []; // nenhuma nota na tela
  }

  const copyButton = await findCopyButton(page);
  if (!copyButton) {
    await page.screenshot({ path: `logs/copiar-nao-encontrado_${Date.now()}.png`, fullPage: true }).catch(() => {});
    throw new Error('Botao "Copiar para clipboard" nao encontrado. Veja o screenshot em logs/.');
  }

  await copyButton.click();
  await page.waitForTimeout(500); // da tempo do SO processar a copia

  const text = await page.evaluate(() => navigator.clipboard.readText());
  if (!text || !text.trim()) {
    await page.screenshot({ path: `logs/clipboard-vazio_${Date.now()}.png`, fullPage: true }).catch(() => {});
    throw new Error('Clipboard veio vazio apos clicar em "Copiar para clipboard".');
  }

  if (process.env.DEBUG_CLIPBOARD === 'true') {
    console.log('[clipboardExport] TEXTO BRUTO:', JSON.stringify(text));
  }

  return parseClipboardText(text);
}
