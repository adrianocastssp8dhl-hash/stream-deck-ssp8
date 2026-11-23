# Painel de atalhos DHL

Aplicação React em português para celular. A pasta docs contém a versão compilada e todos os recursos necessários.

## Publicar no GitHub Pages
1. Crie um repositório no GitHub usando a branch main.
2. Extraia o ZIP. Envie a pasta docs e os arquivos que estão ao lado dela para a raiz do repositório. Confirme que docs/index.html existe.
3. Abra Settings → Pages. Em Build and deployment, selecione Deploy from a branch, escolha main e /docs e salve.
4. Quando a publicação terminar, use Visit site e abra o endereço no celular.

## Usar no celular
No Chrome para Android, abra o menu e escolha Adicionar à tela inicial ou Instalar aplicativo. No Safari do iPhone, use Compartilhar → Adicionar à Tela de Início.

Em Cadastro, informe o nome e cole um endereço. Para fotos do aparelho, selecione Imagem e escolha o arquivo. Em Início, toque no botão para abrir. Em Cadastro também é possível editar ou excluir um item. A coleção fica no armazenamento do navegador usado e pode ser apagada ao limpar os dados do site. Os links do Google continuam sujeitos às permissões da conta que os abre.

## Alterar o projeto
Edite src.jsx ou docs/style.css. Para recompilar o React, execute npm ci e npm run build na raiz e envie as alterações, inclusive docs/app.js. Para testar, execute python -m http.server 8000 --directory docs e abra http://localhost:8000.
