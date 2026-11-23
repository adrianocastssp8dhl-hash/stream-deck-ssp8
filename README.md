# Painel de atalhos DHL

Aplicação React em português para celular. A pasta `docs` contém a versão compilada e todos os recursos necessários.

## Publicar no GitHub Pages
1. Crie um repositório no GitHub usando a branch `main`.
2. Envie a pasta `docs` e os arquivos que estão ao lado dela para a raiz do repositório. Confirme que `docs/index.html` existe.
3. Abra **Settings → Pages**. Em *Build and deployment*, selecione **Deploy from a branch**, escolha **main** e **/docs** e salve.
4. Quando a publicação terminar, use **Visit site** e abra o endereço no celular.

## Usar no celular
No Chrome para Android, abra o menu e escolha **Adicionar à tela inicial** ou **Instalar aplicativo**. No Safari do iPhone, use **Compartilhar → Adicionar à Tela de Início**.

## Configurar sincronização (Google Sheets)
Os atalhos são salvos em uma planilha Google e ficam disponíveis em qualquer dispositivo.

### 1. Criar o backend no Apps Script
1. Abra ou crie uma **planilha Google Sheets**.
2. Acesse **Extensões → Apps Script**.
3. Apague o código de exemplo e cole o conteúdo do arquivo `gas-backend.gs` deste projeto.
4. Salve (Ctrl+S).
5. Clique em **Implantar → Nova implantação**.
   - Tipo: **Aplicativo da Web**
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
6. Clique em **Implantar**, autorize as permissões e **copie o URL gerado**.

### 2. Configurar o app
1. Abra o app no celular (ou computador).
2. Na tela de **Configurações**, cole o URL copiado acima.
3. Clique em **Salvar configuração**. Os dados do banco local antigo são migrados automaticamente.

> **Observação:** Imagens enviadas diretamente do celular ficam salvas apenas naquele dispositivo (armazenamento local). Links e todos os outros tipos de atalho são sincronizados entre dispositivos via Google Sheets.

## Alterar o projeto
Edite `src.jsx` ou `docs/style.css`. Para recompilar o React, execute:

```bash
npm ci
npm run build
```

Depois envie as alterações, inclusive `docs/app.js`. Para testar localmente:

```bash
python -m http.server 8000 --directory docs
# Abra http://localhost:8000
```
