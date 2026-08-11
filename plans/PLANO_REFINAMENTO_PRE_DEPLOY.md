# Plano de Refinamento Pre-Deploy

Superficie: backend e configuracao de deploy; a interacao do painel IA permanece no drawer existente, sem chave informada pelo navegador.

Nao objetivos: alterar modulos, IDs, permissoes, conteudo publicado ou criar novo fluxo visual.

## Fase 1 - Seguranca e baseline de producao

- [x] Remover chave OpenAI e qualquer persistencia de chave do frontend.
- [x] Criar endpoint IA autenticado e manter chave somente no backend.
- [x] Validar configuracao insegura em producao (JWT, mock auth, CORS e token interno).
- [x] Registrar `REDIS_URL` na configuracao, sem ainda depender do Redis em runtime.
- [x] Expor health de vida e prontidao basicos, mantendo o endpoint legado.
- [x] Cobrir configuracao de producao, IA sem chave e contratos de health por testes.
- [x] Corrigir a coleta da suite pytest completa.
- [x] Executar testes backend afetados e build frontend.

Aceitacao: nenhuma chave e enviada, embutida ou salva pelo navegador; producao insegura nao inicia; o drawer continua com fallback local quando IA nao esta configurada.

## Fase 2 - Redis, rate limit e cache

- [x] Integrar cliente async Redis por `REDIS_URL`, lifecycle e fallback degradado.
- [x] Aplicar rate limit atomico e headers nos endpoints definidos.
- [x] Cachear leituras tenant-scoped com TTL e invalidacao nas escritas.
- [x] Expor readiness Redis, metricas de cache/rate limit e testes de indisponibilidade.

## Fase 3 - Consultas e frontend critico

- [x] Medir consultas Gelobel com dados representativos e criar somente indices comprovados.
- [x] Otimizar busca/catalogo/projecao e aplicar limites de concorrencia/pool.
- [x] Corrigir re-renders e erros de lint nos fluxos criticos.
- [x] Dividir o bundle por modulo/tela e medir tamanho inicial.

## Fase 4 - Confiabilidade e deploy

- [x] Tornar WhatsApp assincrono com timeout, retry seguro e protecao contra duplicidade.
- [x] Adicionar metricas operacionais, limites de processo/proxy e checklist de aquecimento.
- [x] Executar smoke Gelobel, carga controlada e documentar variaveis e rollback.
