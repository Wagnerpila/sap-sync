#!/usr/bin/env bash
# Setup do sap-sync numa VPS Linux (Ubuntu/Debian).
# Uso: chmod +x setup.sh && ./setup.sh
set -euo pipefail

echo "== 1/5: Verificando Node.js =="
if ! command -v node >/dev/null 2>&1; then
    echo "Node.js nao encontrado. Instalando Node.js 20 LTS via NodeSource (precisa de sudo)..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "Node.js encontrado: $(node -v)"
fi

echo
echo "== 2/5: Instalando dependencias do projeto (npm install) =="
npm install

echo
echo "== 3/5: Baixando o Chromium do Playwright + dependencias do sistema =="
echo "(precisa de sudo para instalar bibliotecas do sistema operacional)"
sudo npx playwright install --with-deps chromium

echo
echo "== 4/5: Configurando .env =="
if [ -f .env ]; then
    echo ".env ja existe, nao foi sobrescrito."
else
    cp .env.example .env
    echo "Criado .env a partir do .env.example."
    echo "IMPORTANTE: edite o .env com as credenciais (SAP_USER, SAP_PASSWORD, BASE44_APP_ID, BASE44_API_KEY)"
    echo "e garanta HEADLESS=true (a VPS nao tem tela)."
fi

echo
echo "== 5/5: Setup concluido =="
echo "Proximos passos:"
echo "  1. Edite o .env com as credenciais corretas e HEADLESS=true."
echo "  2. Rode 'npm run sync' para um teste manual completo."
echo "  3. Se der certo, instale o servico continuo (ver README.md, secao 'Deploy em VPS Linux')."
