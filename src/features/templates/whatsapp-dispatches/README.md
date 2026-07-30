# Template: Disparos no WhatsApp

Origem visual: módulo mockado `Mensagens`.

Contrato: catálogo semântico de métricas, automações, destinatários, agenda e histórico de execução.

Adapters atuais: `mockWhatsAppDispatchesAdapter.ts` para a equipe e `gelobelWhatsAppDispatchesAdapter.ts` para o tenant.

Produção atual: o acesso Gelobel carrega catálogo e automações reais; Pausar/Ativar persiste pela API sem alterar o template visual. Os demais controles permanecem fora desta etapa.

Evolução: o adapter tenant deverá fornecer somente métricas/filtros autorizados; o template não conhece tabelas nem campos físicos.
