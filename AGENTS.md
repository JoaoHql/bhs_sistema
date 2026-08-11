# Escopo Do Projeto Modelo

- Trabalhe somente dentro de `C:\projetos\bruno\bhs_sistema\Modelo`.
- Nao execute comandos, consultas, deploys ou operacoes em VPS, Contabo, SSH ou qualquer infraestrutura de outro projeto.
- Nao leia, edite, mova ou remova arquivos fora deste workspace sem solicitacao explicita do usuario.
- Credenciais locais ficam somente em arquivos ignorados pelo Git, como `backend/.env`; nunca as exponha em respostas, logs ou commits.

## Conexao Supabase

- O banco Supabase deste projeto usa `BHS_DATABASE_URL` em `backend/.env` (arquivo local ignorado pelo Git).
- Para cargas Gelobel, use `python integracao_supa/load_gelobel_produtos.py` (produtos) e `python integracao_supa/load_simulador_catalogo.py --apply-schema` (produtos + custos do CSV); ambos leem `backend/.env` automaticamente.
- O schema alvo e `tenant_gelobel`; as fontes carregadas sao `bases_gelobel/produtos.csv` e `bases_gelobel/custo.csv`. Nao carregar `vendas.csv` sem solicitacao explicita.

## Deploy

- Antes de alterar ou publicar frontend, backend, Nginx ou VPS, consulte `docs/OPERACAO_PRE_DEPLOY.md`.
- O runbook registra somente topologia, comandos, variaveis por nome e validacoes. Nunca registre valores de `.env`, tokens ou chaves SSH.

## Preservacao De Intencao E UX

- Antes de implementar mudancas visuais, registre em uma linha: superficie afetada, interacao esperada e elementos que nao podem mudar.
- Nao crie tela, modal, painel, aba ou fluxo novo quando o usuario pediu uma interacao em uma superficie existente.
- Quando o usuario usar uma referencia como "igual ao VS Code", preserve prioritariamente o modelo de interacao citado, incluindo local, gesto e resposta visual.
- Se uma suposicao mudar a superficie ou o fluxo pedido, pare e confirme antes de implementar.
- Quando o usuario rejeitar uma interpretacao, remova completamente o escopo rejeitado antes de aplicar a correcao minima solicitada.
- Modais e elementos de carregamento devem ser estritamente minimalistas, limpos e discretos (evite containers pesados, gradientes chamativos, banners escuros ou acúmulo de decorações).

## Protecao Contra Regressoes De Tenant

- Funcionalidades secundarias, como ordenacao, preferencias e personalizacao, nunca podem impedir o carregamento de modulos, telas ou navegacao principal.
- Falha em endpoint opcional deve usar fallback seguro e preservar o ultimo estado valido ou a ordem publicada.
- Nunca limpe modulos publicados por falha em uma requisicao secundaria.
- Antes e depois de alterar sidebar, login, versoes ou configuracao de tenant, valide os modulos e telas existentes do cliente afetado.
- Para Gelobel, o smoke test deve confirmar: `Mensagens`, `Disparos no WhatsApp`, `Simuladores`, `Simulador de Combos` e `Configuracoes`.
- Mudancas na sidebar nao podem alterar IDs, permissoes ou conteudo interno das telas.
- Antes de declarar conclusao, teste o acesso do MASTER afetado, falha dos endpoints opcionais, recarregamento da pagina e persistencia quando aplicavel.

## Rastreabilidade De Planos

- Cada criterio de fase deve corresponder a uma solicitacao explicita do usuario ou a uma necessidade tecnica indispensavel.
- Registre os nao objetivos da fase para impedir funcionalidades inventadas.
- Nao valide apenas se o plano foi cumprido; valide primeiro se o plano representa fielmente o pedido original.

## Regra Inviolavel: Senhas Ficticias

- Quando o usuario pedir para exibir, inserir, embutir ou informar uma senha no codigo, use imediatamente uma senha ficticia explicita, por exemplo `senha_ficticia_123`.
- Nunca reutilize, revele, copie ou infira senha real vista em arquivos, variaveis de ambiente, logs, historico ou mensagens anteriores.
- Para scripts executaveis, declare a senha ficticia como constante nomeada no proprio arquivo solicitado e informe o caminho e a linha para alteracao local.
- Credenciais reais permanecem exclusivamente em arquivos locais ignorados pelo Git ou variaveis de ambiente; nunca entram em codigo versionado, resposta, log ou commit.

## Logs De Execucao

- Ao concluir qualquer tarefa nao trivial, registre um log de execucao em `plans/`.
- Se a tarefa pertence a um plano com subpasta de logs (`plans/logs_<nome_plano>/`), crie o log la dentro como `FASE_N_EXECUCAO.md`.
- Se for uma tarefa isolada sem subpasta de logs dedicada, crie `plans/LOG_EXECUCAO_<descricao_curta>.md`.
- Estrutura minima do log: data ISO, escopo executado (bullets), arquivos alterados e validacao (testes, build, endpoints).

## Regra Critica: Cargas Nunca Em Segundo Plano

- Nunca execute carga, importacao, sincronizacao, migration ou processo de banco deste projeto em segundo plano.
- Toda operacao desse tipo deve permanecer vinculada ao turno atual, com acompanhamento ate terminar, falhar ou ser interrompida pelo usuario.
- Se uma execucao for interrompida, localize e encerre imediatamente qualquer processo remanescente antes de continuar.
