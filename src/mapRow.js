/**
 * Converte uma linha ja parseada do clipboard do SAP (ver clipboardExport.js)
 * no formato da entidade "Nota" do base44.
 */
export function mapSapRowToBase44Note(row) {
  const textoLongoPartes = [
    row.descricao_objeto_tecnico && `OBJETO TÉCNICO: ${row.descricao_objeto_tecnico}`,
    row.fim_avaria && `FIM NECESSÁRIO DA AVARIA: ${row.fim_avaria}`,
  ].filter(Boolean);

  return {
    nota: row.nota,
    ordem: row.ordem,
    descricao: row.descricao,
    local_instalacao: row.local_instalacao,
    notificador: row.notificador,
    centro_trabalho: '09INST',
    texto_longo: textoLongoPartes.join('\n'),
    status: 'pendente',
    sap_sincronizado: true,
    sap_sync_date: new Date().toISOString(),
  };
}
