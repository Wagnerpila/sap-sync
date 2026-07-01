import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { config } from './config.js';

/**
 * Se SAP_SESSION_STATE_B64 estiver configurado (sessao salva via
 * "npm run interactive-login"), decodifica para um arquivo temporario e
 * retorna o caminho, para ser passado como "storageState" ao criar o
 * contexto do navegador - evita repetir o login/MFA do CyberArk a cada ciclo.
 */
export function resolveStorageStatePath() {
  if (!config.sap.sessionStateB64) return undefined;

  const filePath = path.join(os.tmpdir(), 'sap-session-state.json');
  fs.writeFileSync(filePath, Buffer.from(config.sap.sessionStateB64, 'base64'));
  return filePath;
}
