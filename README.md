# SAP -> base44: sincronização automática de notas

Robô que faz login no SAP Fiori, lê a lista de notificações de manutenção
(a mesma tela que você filtra manualmente) e grava as notas novas no seu app
base44 via API — sem precisar de print/OCR.

## Como funciona

1. Abre a home do Fiori Launchpad (login automático via SSO nesse
   ambiente) e clica no tile "Procurar nota de manutenção".
2. A tela abre com os últimos filtros salvos (Tipo M4, Centro 28742, Status
   Em aberto/Em processamento, Criado Hoje) e clica em **Iniciar** para
   disparar a pesquisa (necessário porque o filtro "Hoje" é relativo e
   precisa ser recalculado a cada execução).
3. Seleciona todas as linhas da tabela de resultados e clica em **Copiar
   para clipboard** (evita o download de planilha, que tinha uma caixa de
   confirmação instável).
4. Lê o texto copiado da área de transferência e converte em registros
   (Local de instalação, Descrição do objeto técnico, Fim da avaria, Nota,
   Ordem, Notificador).
5. Para cada nota, consulta o base44 (`base44.entities.Nota.filter`) para
   ver se o número já existe.
6. Cria no base44 apenas as notas que ainda não existem.

## Passo 1 — Instalar dependências

Num computador novo, o mais rápido é rodar o script de setup:

```powershell
cd "D:\CLIENTES E PROJETOS\Gestor de notas\sap-sync"
.\setup.ps1
```

Ele instala as dependências (`npm install`), baixa o Chromium do Playwright
e cria o `.env` a partir do `.env.example` (se ainda não existir). Depois é
só editar o `.env` com as credenciais corretas (passo 2).

Se preferir fazer manualmente:

```powershell
npm install
npm run install-browsers
copy .env.example .env
```

## Passo 2 — Configurar credenciais

Abra o `.env` e preencha:
- `SAP_HOME_URL`: a home do Fiori (sem `#hash` de app).
- `SAP_USER` / `SAP_PASSWORD`: só necessário se o login não for automático
  por SSO nesse ambiente (deixe em branco se for).
- `BASE44_APP_ID` e `BASE44_API_KEY`: veja o Passo 4.

**Importante:** o `.env` nunca deve ser commitado nem compartilhado — ele já
está no `.gitignore`. Se tiver senha preenchida, ela fica em texto puro;
mantenha o arquivo só na máquina que vai rodar a automação.

## Passo 3 — Validar a pesquisa (obrigatório na 1ª vez em cada computador)

Rode:

```powershell
npm run login-debug
```

Isso abre um Chrome visível (janela larga, necessária para o SAP não
esconder colunas da tabela), abre a home, clica no tile, dispara a
pesquisa e deixa a janela aberta por 60s. Observe:

- Confirme que a tabela aparece com notas (se aparecer "Dados não
  encontrados", pode ser normal caso não haja notas abertas hoje).
- Se aparecer uma tela de login (SSO caiu ou é outro usuário sem SSO),
  aperte F12 → clique com o botão direito no campo de usuário → "Inspect" →
  copie o `id`/`name` do campo e ajuste no `.env`: `SAP_USER_SELECTOR`,
  `SAP_PASSWORD_SELECTOR`, `SAP_LOGIN_BUTTON_SELECTOR`.
- Confira o texto do tile ("Procurar nota de manutenção") e do botão de
  pesquisa ("Iniciar") — se algum vier em outro texto/idioma nesse
  ambiente, ajuste `SAP_TILE_TEXT` / `SAP_SEARCH_BUTTON_TEXT` no `.env`.

Repita esse passo até o `logs/login-debug.png` mostrar a lista de notas
carregada corretamente.

## Passo 4 — Configurar o base44

1. No painel do seu app base44, gere/pegue a **API key** e o **App ID**
   (seção de API/Integrações do app).
2. Preencha no `.env`: `BASE44_APP_ID` e `BASE44_API_KEY`.
3. Os campos da entidade "Nota" já estão mapeados em `src/mapRow.js`
   (`nota`, `ordem`, `descricao`, `local_instalacao`, `notificador`,
   `centro_trabalho`, `texto_longo`, `status`, `sap_sincronizado`,
   `sap_sync_date`) — só precisa ajustar se o schema da entidade mudar.

## Passo 5 — Testar manualmente

```powershell
npm run sync
```

Roda um ciclo único (abre navegador, sincroniza, fecha). Acompanhe o
console:
- Se der erro de "Botão... não encontrado" ou "Copiar para clipboard não
  encontrado", rode `npm run login-debug` de novo e confira os textos reais
  na tela desse ambiente.
- Se as notas subirem sem `notificador`/`fim_avaria`, rode com
  `DEBUG_CLIPBOARD=true npm run sync` para ver o texto bruto copiado do
  clipboard e conferir se bate com o esperado.

Quando funcionar, mude `HEADLESS=true` no `.env` para rodar invisível.

## Passo 6 — Deixar rodando continuamente

```powershell
npm run watch
```

Fica em loop verificando a cada 5 minutos (configurável via
`SAP_SYNC_INTERVAL_MINUTES` no `.env`), reabrindo o navegador do zero a
cada ciclo (evita estados travados de ciclos anteriores). Deixe essa janela
do PowerShell aberta, ou agende via Windows Task Scheduler para rodar uma
vez no logon:

```powershell
$action = New-ScheduledTaskAction -Execute "node" -Argument "src/watch.js" -WorkingDirectory "D:\CLIENTES E PROJETOS\Gestor de notas\sap-sync"
$trigger = New-ScheduledTaskTrigger -AtLogOn
Register-ScheduledTask -TaskName "SAP-Notas-Watch" -Action $action -Trigger $trigger -Description "Fica sincronizando notas do SAP com o base44 continuamente"
```

Para remover: `Unregister-ScheduledTask -TaskName "SAP-Notas-Watch"`.

## Rodando em outro computador

1. Copie a pasta `sap-sync` inteira, **exceto** `node_modules/`, `downloads/`,
   `logs/` e `.env` (specific da máquina/ambiente).
2. No novo computador, rode `.\setup.ps1` (Passo 1 acima).
3. Edite o `.env` criado com as credenciais desse ambiente.
4. Rode `npm run login-debug` para confirmar que a tela abre certo ali
   (layout, idioma e nomes de botão podem variar por política/versão do
   SAP).
5. Rode `npm run sync` uma vez para validar antes de agendar/deixar em
   `watch`.

**Atenção:** se o novo computador não tiver acesso de rede ao
`s4prd.sap.klabin.net` (VPN, domínio Windows para SSO, etc.), o login vai
falhar mesmo com as credenciais certas no `.env` — isso é uma limitação de
rede/ambiente, não do script.

## Deploy no EasyPanel (recomendado se sua VPS usa EasyPanel)

O SAP (`s4prd.sap.klabin.net`) é acessível pela internet pública com login
e senha (confirmado, inclusive por rede 4G) — não depende de VPN nem de
domínio Windows. O login do script já usa usuário/senha explícitos (não é
SSO de domínio de verdade), então funciona igual dentro de um container.

O EasyPanel builda e roda o app como container Docker a partir de um
repositório Git. O projeto já inclui `Dockerfile` (baseado na imagem
oficial do Playwright, que já vem com o Chromium e as dependências de
sistema prontas — não precisa instalar nada manualmente).

### 1. Subir o projeto para o GitHub

No PowerShell, dentro da pasta `sap-sync`:

```powershell
git init
git add .
git commit -m "sap-sync inicial"
```

Crie um repositório **privado** no GitHub (ex: `sap-sync`), depois:

```powershell
git remote add origin https://github.com/SEU_USUARIO/sap-sync.git
git branch -M main
git push -u origin main
```

**Importante:** o `.env` já está no `.gitignore`, então suas credenciais
não vão para o GitHub — você vai configurá-las direto no EasyPanel (passo
4 abaixo).

### 2. Criar o App no EasyPanel

1. No EasyPanel, abra o projeto onde quer colocar o app (ou crie um novo
   projeto, ex: "sap-sync") clicando em **Novo** na tela de Projetos.
2. Dentro do projeto, clique em **+** (adicionar serviço) e escolha
   **App**.
3. Em **Source** (origem), escolha **GitHub** e conecte sua conta (o
   EasyPanel vai pedir autorização OAuth na primeira vez).
4. Selecione o repositório `sap-sync` e a branch `main`.
5. Em **Build**, escolha o método **Dockerfile** (o EasyPanel detecta o
   `Dockerfile` da raiz do repositório automaticamente).

### 3. Configurar variáveis de ambiente

Na aba **Environment** (ou "Variáveis de ambiente") do app, adicione uma
por linha (formato `CHAVE=valor`), usando os mesmos nomes do
`.env.example`:

```
SAP_HOME_URL=https://s4prd.sap.klabin.net/sap/bc/ui2/flp?sap-client=400&sap-language=PT
SAP_USER=seu.usuario
SAP_PASSWORD=sua_senha
SAP_TILE_TEXT=Procurar nota de manutenção
SAP_SEARCH_BUTTON_TEXT=Iniciar
BASE44_APP_ID=seu_app_id
BASE44_API_KEY=sua_api_key
SAP_SYNC_INTERVAL_MINUTES=5
HEADLESS=true
```

(`HEADLESS=true` já vem fixo no `Dockerfile`, mas não custa garantir aqui
também.)

### 4. Deploy

Clique em **Deploy** (ou "Salvar" + "Deploy", dependendo da versão do
EasyPanel). Ele vai puxar o repositório, buildar a imagem Docker (primeira
vez demora mais, baixa a imagem base do Playwright) e subir o container
rodando `node src/watch.js` em loop contínuo.

- **Restart automático**: apps do EasyPanel reiniciam sozinhos se o
  container cair (equivalente a `restart: unless-stopped` do Docker) — não
  precisa configurar nada extra para isso.
- **Logs**: acompanhe pela aba **Logs** do app dentro do EasyPanel (mostra
  a saída do `console.log` do script em tempo real).
- **Atualizar o script depois**: basta commitar e dar `git push`, e clicar
  em **Deploy** de novo no EasyPanel (ou configurar deploy automático por
  webhook, se a versão do seu EasyPanel suportar).

**Se o build falhar na primeira linha do Dockerfile** (`FROM
mcr.microsoft.com/playwright:v1.61.1-noble`), pode ser que essa tag
específica não exista no momento do build — troque `-noble` por `-jammy`
no `Dockerfile` e tente de novo.

### Alternativa: instalação manual sem EasyPanel (Node direto na VPS)

Se preferir não usar Docker/EasyPanel para este app, também é possível
instalar o Node.js direto na VPS e rodar como serviço systemd — ver os
passos abaixo.

1. Envie a pasta `sap-sync` para a VPS (via `scp`, `rsync` ou `git`),
   **sem** `node_modules/`, `.env`, `downloads/`, `logs/`.

   ```bash
   rsync -avz --exclude node_modules --exclude .env --exclude downloads --exclude logs \
     "sap-sync/" usuario@SEU_IP_VPS:/home/usuario/sap-sync/
   ```

2. Na VPS, dentro da pasta `sap-sync`:

   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

   Isso instala o Node.js (se faltar), roda `npm install`, baixa o Chromium
   do Playwright **com as dependências de sistema** (`--with-deps`, precisa
   de `sudo`) e cria o `.env`.

3. Edite o `.env`:
   - Preencha `SAP_USER` e `SAP_PASSWORD` (na VPS não existe sessão SSO
     nenhuma — o login sempre vai usar essas credenciais).
   - Garanta `HEADLESS=true` (a VPS não tem tela; sem isso o Chromium não
     abre).
   - Preencha `BASE44_APP_ID` e `BASE44_API_KEY`.

4. Teste manualmente:

   ```bash
   npm run sync
   ```

   Se der erro de seletor/botão não encontrado, rode `npm run login-debug`
   (com `HEADLESS=true` ele só gera o screenshot em `logs/login-debug.png`,
   baixe esse arquivo para conferir visualmente já que a VPS não tem tela).

5. Para deixar rodando continuamente como serviço (reinicia sozinho se
   cair ou se a VPS reiniciar), use o `sap-sync.service` incluído:

   ```bash
   # edite sap-sync.service e troque "USUARIO" pelo seu usuario/caminho real
   sudo cp sap-sync.service /etc/systemd/system/sap-sync.service
   sudo systemctl daemon-reload
   sudo systemctl enable --now sap-sync
   sudo systemctl status sap-sync
   ```

   Logs ficam em `logs/watch.log` e `logs/watch-error.log` (caminho
   definido no próprio arquivo `.service`). Para parar: `sudo systemctl stop sap-sync`.

**Atenção com custo/carga:** a cada ciclo o script abre um Chromium
completo — numa VPS pequena (1 vCPU / 1GB RAM da Hostinger, por exemplo),
confirme que há memória suficiente; se a VPS também roda outras coisas
(seu app base44 não roda aqui, mas se houver outros serviços), monitore o
uso de RAM nos primeiros ciclos.

## Riscos e cuidados

- **Governança/TI**: como isso automatiza login com credenciais
  corporativas contra um sistema SAP produtivo, alinhe com o time de TI/
  segurança da Klabin antes de deixar rodando sem supervisão.
- **MFA/SSO**: se a autenticação usar MFA interativo, login 100% headless
  pode não ser possível — nesse caso, considere um usuário técnico de
  serviço (se a empresa permitir).
- **Mudança de layout**: se o Fiori mudar de versão/layout, os textos de
  botão podem mudar — o erro fica claro no log e no screenshot salvo em
  `logs/`.
- **Duplicidade**: a checagem depende do campo `nota` estar correto; o
  script já usa `base44.entities.Nota.filter({ nota })` antes de criar
  qualquer registro novo.
