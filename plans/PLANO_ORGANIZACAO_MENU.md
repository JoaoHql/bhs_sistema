# Plano — Organização do Menu

## Fase 1 — Arrastar módulos diretamente na sidebar

- [x] Manter a organização diretamente na sidebar do MASTER, sem tela adicional.
- [x] Permitir clicar, arrastar e soltar módulos acima ou abaixo de Configurações.
- [x] Manter Configurações fixa: ela recebe o módulo antes/depois, mas não pode ser arrastada.
- [x] Aplicar transições suaves de 200 ms e respeitar redução de movimento.
- [x] Não alterar telas internas, permissões ou conteúdo dos módulos.
- [x] Validar build e interação visual.

## Fase 2 — Persistência e publicação

- [x] Salvar automaticamente a ordem por tenant ao soltar e incorporá-la à versão publicada.
- [x] Aplicar ordem ao login de todos os usuários do tenant.
- [x] Validar permissões, isolamento entre tenants e rollback.
