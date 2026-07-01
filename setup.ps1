# Setup do sap-sync num computador novo.
# Uso: abra o PowerShell nesta pasta e rode:  .\setup.ps1

$ErrorActionPreference = "Stop"

Write-Host "== 1/4: Verificando Node.js ==" -ForegroundColor Cyan
try {
    $nodeVersion = node -v
    Write-Host "Node.js encontrado: $nodeVersion"
} catch {
    Write-Host "Node.js NAO encontrado. Instale antes de continuar: https://nodejs.org (versao 18 ou superior)." -ForegroundColor Red
    exit 1
}

Write-Host "`n== 2/4: Instalando dependencias (npm install) ==" -ForegroundColor Cyan
npm install

Write-Host "`n== 3/4: Baixando o navegador do Playwright (Chromium) ==" -ForegroundColor Cyan
npm run install-browsers

Write-Host "`n== 4/4: Configurando .env ==" -ForegroundColor Cyan
if (Test-Path ".env") {
    Write-Host ".env ja existe, nao foi sobrescrito." -ForegroundColor Yellow
} else {
    Copy-Item ".env.example" ".env"
    Write-Host "Criado .env a partir do .env.example." -ForegroundColor Green
    Write-Host "IMPORTANTE: abra o arquivo .env e preencha as credenciais (SAP_USER/SAP_PASSWORD se necessario, BASE44_APP_ID, BASE44_API_KEY) antes de rodar." -ForegroundColor Yellow
}

Write-Host "`nSetup concluido." -ForegroundColor Green
Write-Host "Proximos passos:"
Write-Host "  1. Edite o arquivo .env com as credenciais corretas deste ambiente."
Write-Host "  2. Rode 'npm run login-debug' para validar que a tela do SAP abre certo aqui."
Write-Host "  3. Rode 'npm run sync' para um teste completo manual."
Write-Host "  4. Se der tudo certo, configure o agendamento (ver README.md, secao Task Scheduler / npm run watch)."
