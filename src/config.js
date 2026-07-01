import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variavel de ambiente ausente: ${name}. Copie .env.example para .env e preencha.`);
  }
  return value;
}

export const config = {
  sap: {
    // Home do Fiori Launchpad (sem hash de app) - deep links com #hash caem na
    // pagina inicial quando abertos direto num navegador sem sessao ainda,
    // entao navegamos ate a home e clicamos no tile em vez de usar o link direto.
    homeUrl: required('SAP_HOME_URL'),
    tileText: process.env.SAP_TILE_TEXT || 'Procurar nota de manutenção',
    // Login e automatico via SSO neste ambiente - user/password ficam como fallback opcional
    user: process.env.SAP_USER || '',
    password: process.env.SAP_PASSWORD || '',
    userSelector: process.env.SAP_USER_SELECTOR || '#USERNAME_FIELD-inner',
    passwordSelector: process.env.SAP_PASSWORD_SELECTOR || '#PASSWORD_FIELD-inner',
    loginButtonSelector: process.env.SAP_LOGIN_BUTTON_SELECTOR || '#LOGIN_LINK',
    searchButtonText: process.env.SAP_SEARCH_BUTTON_TEXT || 'Iniciar',
    exportButtonText: process.env.SAP_EXPORT_BUTTON_TEXT || 'Exportar para planilha',
    // Sessao salva (cookies) gerada por "npm run interactive-login", usada
    // para pular o login/MFA do CyberArk nos ciclos automaticos.
    sessionStateB64: process.env.SAP_SESSION_STATE_B64 || '',
  },
  base44: {
    appId: required('BASE44_APP_ID'),
    apiKey: required('BASE44_API_KEY'),
  },
  headless: (process.env.HEADLESS || 'false').toLowerCase() === 'true',
};
