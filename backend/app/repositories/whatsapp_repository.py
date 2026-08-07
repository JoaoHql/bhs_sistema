import asyncio
from typing import Any, Protocol
from uuid import UUID

from app.core.db import get_connection_pool, readonly_connection
from app.core.errors import BadRequestError, NotFoundError
from app.repositories.query_builder import quote_identifier
from app.schemas.whatsapp import (
    WhatsAppAutomation,
    WhatsAppAutomationWrite,
    WhatsAppBootstrapResponse,
    WhatsAppExecutionLog,
    WhatsAppTestDelivery,
    WhatsAppRecipient,
    WhatsAppVariable,
    WhatsAppVariableGroup,
)
from app.services.whatsapp_metrics import REFERENCE_FIELD, normalize_metricas, render_whatsapp_template


SOURCE_DEFINITIONS = {
    "whatsapp_metricas_diarias": ("daily", "Dados diarios"),
    "whatsapp_metricas_mensais": ("monthly", "Dados mensais"),
    "whatsapp_metricas_anuais": ("yearly", "Dados anuais"),
}


class WhatsAppRepositoryProtocol(Protocol):
    async def get_bootstrap(self, *, actor_id: str, client_id: str, tenant_schema: str) -> WhatsAppBootstrapResponse: ...
    async def list_automations(self, *, actor_id: str, client_id: str, tenant_schema: str) -> list[WhatsAppAutomation]: ...
    async def get_automation(self, *, actor_id: str, client_id: str, tenant_schema: str, automation_id: str) -> WhatsAppAutomation: ...
    async def create_automation(self, *, actor_id: str, client_id: str, tenant_schema: str, data: WhatsAppAutomationWrite) -> WhatsAppAutomation: ...
    async def replace_automation(self, *, actor_id: str, client_id: str, tenant_schema: str, automation_id: str, data: WhatsAppAutomationWrite) -> WhatsAppAutomation: ...
    async def delete_automation(self, *, actor_id: str, client_id: str, tenant_schema: str, automation_id: str) -> None: ...
    async def delete_execution_log(self, *, actor_id: str, client_id: str, tenant_schema: str, automation_id: str, delivery_id: str) -> None: ...
    async def list_execution_logs(self, *, actor_id: str, client_id: str, tenant_schema: str, automation_id: str) -> list[WhatsAppExecutionLog]: ...
    async def create_test_delivery(self, *, actor_id: str, client_id: str, tenant_schema: str, automation_id: str, message_template: str, idempotency_key: str) -> WhatsAppTestDelivery: ...
    async def finalize_test_delivery(self, *, client_id: str, tenant_schema: str, execution_id: str, delivery_id: str, succeeded: bool, provider_message_id: str | None, error: str | None) -> None: ...


class WhatsAppRepository:
    def __init__(self, database_url: str) -> None:
        self.pool = get_connection_pool(database_url)

    async def get_bootstrap(self, *, actor_id: str, client_id: str, tenant_schema: str) -> WhatsAppBootstrapResponse:
        return await asyncio.to_thread(self._get_bootstrap, actor_id, client_id, tenant_schema)

    async def list_automations(self, *, actor_id: str, client_id: str, tenant_schema: str) -> list[WhatsAppAutomation]:
        return await asyncio.to_thread(self._list_automations, actor_id, client_id, tenant_schema)

    async def get_automation(self, *, actor_id: str, client_id: str, tenant_schema: str, automation_id: str) -> WhatsAppAutomation:
        return await asyncio.to_thread(self._get_automation, actor_id, client_id, tenant_schema, automation_id)

    async def create_automation(self, *, actor_id: str, client_id: str, tenant_schema: str, data: WhatsAppAutomationWrite) -> WhatsAppAutomation:
        return await asyncio.to_thread(self._save_automation, actor_id, client_id, tenant_schema, None, data)

    async def replace_automation(self, *, actor_id: str, client_id: str, tenant_schema: str, automation_id: str, data: WhatsAppAutomationWrite) -> WhatsAppAutomation:
        return await asyncio.to_thread(self._save_automation, actor_id, client_id, tenant_schema, automation_id, data)

    async def delete_automation(self, *, actor_id: str, client_id: str, tenant_schema: str, automation_id: str) -> None:
        await asyncio.to_thread(self._delete_automation, actor_id, client_id, tenant_schema, automation_id)

    async def delete_execution_log(self, *, actor_id: str, client_id: str, tenant_schema: str, automation_id: str, delivery_id: str) -> None:
        await asyncio.to_thread(self._delete_execution_log, actor_id, client_id, tenant_schema, automation_id, delivery_id)

    async def list_execution_logs(self, *, actor_id: str, client_id: str, tenant_schema: str, automation_id: str) -> list[WhatsAppExecutionLog]:
        return await asyncio.to_thread(self._list_execution_logs, actor_id, client_id, tenant_schema, automation_id)

    async def create_test_delivery(self, *, actor_id: str, client_id: str, tenant_schema: str, automation_id: str, message_template: str, idempotency_key: str) -> WhatsAppTestDelivery:
        return await asyncio.to_thread(self._create_test_delivery, actor_id, client_id, tenant_schema, automation_id, message_template, idempotency_key)

    async def finalize_test_delivery(self, *, client_id: str, tenant_schema: str, execution_id: str, delivery_id: str, succeeded: bool, provider_message_id: str | None, error: str | None) -> None:
        await asyncio.to_thread(self._finalize_test_delivery, client_id, tenant_schema, execution_id, delivery_id, succeeded, provider_message_id, error)

    def _get_bootstrap(self, actor_id: str, client_id: str, tenant_schema: str) -> WhatsAppBootstrapResponse:
        with readonly_connection(self.pool) as conn:
            tenant = conn.execute(
                """
                select client.timezone
                from app_core.client_users membership
                join app_core.app_users actor on actor.id = membership.user_id
                join app_core.clients client on client.id = membership.client_id
                where membership.user_id = %s::uuid
                  and membership.client_id = %s::uuid
                  and membership.status = 'active'
                  and actor.status = 'active'
                  and client.status = 'active'
                  and 'admin' = any(membership.roles)
                """,
                (actor_id, client_id),
            ).fetchone()
            if tenant is None:
                raise NotFoundError("Configuracao WhatsApp indisponivel para este tenant.")

            fields = conn.execute(
                """
                select source.key as source_key, field.field_name, field.display_name,
                       field.technical_type, field.semantic_role, field.business_meaning,
                       coalesce(context.grain, '') as grain
                from app_core.data_sources source
                join app_core.data_source_fields field on field.data_source_id = source.id
                left join app_core.ai_dataset_contexts context on context.data_source_id = source.id
                where source.client_id = %s::uuid
                  and source.active = true
                  and source.key = any(%s::text[])
                  and field.status = 'active'
                  and field.field_name = any(source.allowed_fields)
                order by array_position(%s::text[], source.key),
                         array_position(source.allowed_fields, field.field_name)
                """,
                (client_id, list(SOURCE_DEFINITIONS), list(SOURCE_DEFINITIONS)),
            ).fetchall()
            recipients = conn.execute(
                """
                select membership.id::text as membership_id, app_user.id::text as user_id,
                       app_user.name, app_user.email, membership.whatsapp_phone_e164 as phone_e164,
                       ('admin' = any(membership.roles)) as is_master
                from app_core.client_users membership
                join app_core.app_users app_user on app_user.id = membership.user_id
                where membership.client_id = %s::uuid
                  and membership.status = 'active'
                  and app_user.status = 'active'
                order by ('admin' = any(membership.roles)) desc, app_user.name, app_user.email
                """,
                (client_id,),
            ).fetchall()

        return WhatsAppBootstrapResponse(
            timezone=tenant["timezone"],
            variable_groups=self._build_groups(fields),
            recipients=[WhatsAppRecipient.model_validate(row) for row in recipients],
        )

    @staticmethod
    def _assert_master(conn: Any, actor_id: str, client_id: str) -> None:
        row = conn.execute(
            """
            select 1 from app_core.client_users membership
            join app_core.app_users actor on actor.id = membership.user_id
            join app_core.clients client on client.id = membership.client_id
            where membership.user_id = %s::uuid and membership.client_id = %s::uuid
              and membership.status = 'active' and actor.status = 'active'
              and client.status = 'active'
              and 'admin' = any(membership.roles)
            """,
            (actor_id, client_id),
        ).fetchone()
        if row is None:
            raise NotFoundError("Configuracao WhatsApp indisponivel para este tenant.")

    @staticmethod
    def _select_automations(conn: Any, client_id: str, tenant_schema: str, automation_id: str | None = None) -> list[WhatsAppAutomation]:
        quoted = quote_identifier(tenant_schema, tenant_schema=True)
        rows = conn.execute(
            f"""
            select automation.id::text, automation.nome as name,
                   automation.mensagem_modelo as message_template, automation.status,
                   automation.created_at, automation.updated_at,
                   coalesce(array_agg(distinct schedule.horario_local order by schedule.horario_local)
                     filter (where schedule.id is not null), array[]::time[]) as local_times,
                   coalesce(array_agg(distinct recipient.client_user_id::text order by recipient.client_user_id::text)
                     filter (where recipient.id is not null), array[]::text[]) as recipient_membership_ids
            from {quoted}.whatsapp_automacoes automation
            left join {quoted}.whatsapp_automacao_horarios schedule
              on schedule.automacao_id = automation.id and schedule.ativo = true
            left join {quoted}.whatsapp_automacao_destinatarios recipient
              on recipient.automacao_id = automation.id
            where automation.client_id = %s::uuid
              and (%s::uuid is null or automation.id = %s::uuid)
            group by automation.id
            order by automation.updated_at desc, automation.id
            """,
            (client_id, automation_id, automation_id),
        ).fetchall()
        return [WhatsAppAutomation.model_validate(row) for row in rows]

    def _list_automations(self, actor_id: str, client_id: str, tenant_schema: str) -> list[WhatsAppAutomation]:
        with readonly_connection(self.pool) as conn:
            self._assert_master(conn, actor_id, client_id)
            return self._select_automations(conn, client_id, tenant_schema)

    def _get_automation(self, actor_id: str, client_id: str, tenant_schema: str, automation_id: str) -> WhatsAppAutomation:
        with readonly_connection(self.pool) as conn:
            self._assert_master(conn, actor_id, client_id)
            rows = self._select_automations(conn, client_id, tenant_schema, automation_id)
        if not rows:
            raise NotFoundError("Automacao WhatsApp nao encontrada.")
        return rows[0]

    @staticmethod
    def _validate_recipients(conn: Any, client_id: str, membership_ids: list[UUID]) -> None:
        count = conn.execute(
            """
            select count(*) as total from app_core.client_users membership
            join app_core.app_users app_user on app_user.id = membership.user_id
            where membership.client_id = %s::uuid and membership.id = any(%s::uuid[])
              and membership.status = 'active' and app_user.status = 'active'
            """,
            (client_id, membership_ids),
        ).fetchone()["total"]
        if count != len(membership_ids):
            raise NotFoundError("Um ou mais destinatarios nao pertencem ao tenant ou estao inativos.")

    def _save_automation(self, actor_id: str, client_id: str, tenant_schema: str, automation_id: str | None, data: WhatsAppAutomationWrite) -> WhatsAppAutomation:
        quoted = quote_identifier(tenant_schema, tenant_schema=True)
        with self.pool.connection() as conn, conn.transaction():
            self._assert_master(conn, actor_id, client_id)
            self._validate_recipients(conn, client_id, data.recipient_membership_ids)
            if automation_id is None:
                row = conn.execute(
                    f"""insert into {quoted}.whatsapp_automacoes
                       (client_id, nome, mensagem_modelo, status, criado_por_client_user_id, atualizado_por_client_user_id)
                       select %s::uuid, %s, %s, %s, membership.id, membership.id
                       from app_core.client_users membership
                       where membership.client_id = %s::uuid and membership.user_id = %s::uuid
                       returning id::text""",
                    (client_id, data.name, data.message_template, data.status, client_id, actor_id),
                ).fetchone()
            else:
                row = conn.execute(
                    f"""update {quoted}.whatsapp_automacoes automation
                       set nome = %s, mensagem_modelo = %s, status = %s,
                           atualizado_por_client_user_id = membership.id
                       from app_core.client_users membership
                       where automation.id = %s::uuid and automation.client_id = %s::uuid
                         and membership.client_id = automation.client_id and membership.user_id = %s::uuid
                       returning automation.id::text""",
                    (data.name, data.message_template, data.status, automation_id, client_id, actor_id),
                ).fetchone()
            if row is None:
                raise NotFoundError("Automacao WhatsApp nao encontrada.")
            saved_id = row["id"]
            conn.execute(f"delete from {quoted}.whatsapp_automacao_horarios where automacao_id = %s::uuid", (saved_id,))
            conn.execute(f"delete from {quoted}.whatsapp_automacao_destinatarios where automacao_id = %s::uuid", (saved_id,))
            with conn.cursor() as cursor:
                cursor.executemany(
                    f"insert into {quoted}.whatsapp_automacao_horarios (automacao_id, horario_local) values (%s::uuid, %s)",
                    [(saved_id, value) for value in data.local_times],
                )
                cursor.executemany(
                    f"""insert into {quoted}.whatsapp_automacao_destinatarios
                       (automacao_id, client_id, client_user_id) values (%s::uuid, %s::uuid, %s::uuid)""",
                    [(saved_id, client_id, value) for value in data.recipient_membership_ids],
                )
            return self._select_automations(conn, client_id, tenant_schema, saved_id)[0]

    def _delete_automation(self, actor_id: str, client_id: str, tenant_schema: str, automation_id: str) -> None:
        quoted = quote_identifier(tenant_schema, tenant_schema=True)
        with self.pool.connection() as conn, conn.transaction():
            self._assert_master(conn, actor_id, client_id)
            conn.execute(
                f"delete from {quoted}.whatsapp_execucoes where automacao_id = %s::uuid and client_id = %s::uuid",
                (automation_id, client_id),
            )
            row = conn.execute(
                f"delete from {quoted}.whatsapp_automacoes where id = %s::uuid and client_id = %s::uuid returning id",
                (automation_id, client_id),
            ).fetchone()
            if row is None:
                raise NotFoundError("Automacao WhatsApp nao encontrada.")

    def _delete_execution_log(self, actor_id: str, client_id: str, tenant_schema: str, automation_id: str, delivery_id: str) -> None:
        quoted = quote_identifier(tenant_schema, tenant_schema=True)
        with self.pool.connection() as conn, conn.transaction():
            self._assert_master(conn, actor_id, client_id)
            delivery = conn.execute(
                f"""
                delete from {quoted}.whatsapp_entregas delivery
                using {quoted}.whatsapp_execucoes execution
                where delivery.id = %s::uuid and delivery.client_id = %s::uuid
                  and delivery.execucao_id = execution.id and execution.automacao_id = %s::uuid
                  and execution.client_id = %s::uuid
                returning execution.id::text as execution_id
                """,
                (delivery_id, client_id, automation_id, client_id),
            ).fetchone()
            if delivery is None:
                raise NotFoundError("Registro de disparo nao encontrado.")
            conn.execute(
                f"""
                delete from {quoted}.whatsapp_execucoes execution
                where execution.id = %s::uuid and execution.client_id = %s::uuid
                  and not exists (select 1 from {quoted}.whatsapp_entregas where execucao_id = execution.id)
                """,
                (delivery["execution_id"], client_id),
            )

    def _list_execution_logs(self, actor_id: str, client_id: str, tenant_schema: str, automation_id: str) -> list[WhatsAppExecutionLog]:
        quoted = quote_identifier(tenant_schema, tenant_schema=True)
        with readonly_connection(self.pool) as conn:
            self._assert_master(conn, actor_id, client_id)
            rows = conn.execute(
                f"""
                select delivery.id::text as id,
                       execution.id::text as execution_id,
                       execution.automacao_id::text as dispatch_id,
                       delivery.destinatario_nome_snapshot as recipient,
                       coalesce(delivery.enviado_em, delivery.updated_at, execution.created_at) as sent_at,
                       case
                         when execution.tipo = 'test' then 'test'
                         when delivery.status = 'sent' then 'sent'
                         when delivery.status = 'failed' then 'failed'
                         else 'pending'
                       end as status,
                       automation.nome as summary,
                       execution.mensagem_renderizada as message,
                       delivery.erro as error
                from {quoted}.whatsapp_execucoes execution
                join {quoted}.whatsapp_automacoes automation
                  on automation.id = execution.automacao_id and automation.client_id = execution.client_id
                join {quoted}.whatsapp_entregas delivery
                  on delivery.execucao_id = execution.id and delivery.client_id = execution.client_id
                where execution.client_id = %s::uuid and execution.automacao_id = %s::uuid
                order by coalesce(delivery.enviado_em, delivery.updated_at, execution.created_at) desc, delivery.id desc
                """,
                (client_id, automation_id),
            ).fetchall()
        return [WhatsAppExecutionLog.model_validate(row) for row in rows]

    def _create_test_delivery(self, actor_id: str, client_id: str, tenant_schema: str, automation_id: str, message_template: str, idempotency_key: str) -> WhatsAppTestDelivery:
        quoted = quote_identifier(tenant_schema, tenant_schema=True)
        with self.pool.connection() as conn, conn.transaction():
            self._assert_master(conn, actor_id, client_id)
            automation = conn.execute(
                f"select id from {quoted}.whatsapp_automacoes where id = %s::uuid and client_id = %s::uuid",
                (automation_id, client_id),
            ).fetchone()
            if automation is None:
                raise NotFoundError("Automação WhatsApp não encontrada.")
            recipient = conn.execute(
                """
                select membership.id::text as membership_id, app_user.name, membership.whatsapp_phone_e164 as phone_e164
                from app_core.client_users membership
                join app_core.app_users app_user on app_user.id = membership.user_id
                where membership.user_id = %s::uuid and membership.client_id = %s::uuid
                  and membership.status = 'active' and app_user.status = 'active'
                  and 'admin' = any(membership.roles)
                """,
                (actor_id, client_id),
            ).fetchone()
            if recipient is None or not recipient["phone_e164"]:
                raise BadRequestError("Cadastre o telefone do MASTER em Minha conta antes de enviar o teste.")
            message = render_whatsapp_template(message_template, self._latest_metric_snapshots(conn, tenant_schema))
            execution = conn.execute(
                f"""
                insert into {quoted}.whatsapp_execucoes
                  (automacao_id, client_id, tipo, status, agendado_para, iniciado_em, mensagem_modelo_snapshot, mensagem_renderizada, idempotency_key)
                values (%s::uuid, %s::uuid, 'test', 'running', now(), now(), %s, %s, %s)
                on conflict (client_id, idempotency_key) where tipo = 'test' and idempotency_key is not null do nothing
                returning id::text
                """,
                (automation_id, client_id, message_template, message, idempotency_key),
            ).fetchone()
            if execution is None:
                saved = conn.execute(
                    f"""
                    select execution.id::text as execution_id, delivery.id::text as delivery_id,
                           delivery.status, delivery.provider_message_id, delivery.erro as error,
                           delivery.telefone_e164_snapshot as phone_e164, delivery.mensagem_snapshot as message,
                           delivery.destinatario_nome_snapshot as recipient
                    from {quoted}.whatsapp_execucoes execution
                    join {quoted}.whatsapp_entregas delivery
                      on delivery.execucao_id = execution.id and delivery.client_id = execution.client_id
                    where execution.client_id = %s::uuid and execution.automacao_id = %s::uuid
                      and execution.idempotency_key = %s
                    """,
                    (client_id, automation_id, idempotency_key),
                ).fetchone()
                if saved is None:
                    raise BadRequestError("Nao foi possivel recuperar o envio idempotente.")
                return WhatsAppTestDelivery(
                    execution_id=saved["execution_id"], delivery_id=saved["delivery_id"], recipient=saved["recipient"],
                    phone_e164=saved["phone_e164"], message=saved["message"], status=saved["status"],
                    provider_message_id=saved["provider_message_id"], error=saved["error"], should_send=False,
                )
            delivery = conn.execute(
                f"""
                insert into {quoted}.whatsapp_entregas
                  (execucao_id, client_id, destinatario_client_user_id, destinatario_nome_snapshot, telefone_e164_snapshot, mensagem_snapshot, status)
                values (%s::uuid, %s::uuid, %s::uuid, %s, %s, %s, 'pending')
                returning id::text
                """,
                (execution["id"], client_id, recipient["membership_id"], recipient["name"], recipient["phone_e164"], message),
            ).fetchone()
        return WhatsAppTestDelivery(
            execution_id=execution["id"], delivery_id=delivery["id"], recipient=recipient["name"],
            phone_e164=recipient["phone_e164"], message=message,
        )

    @staticmethod
    def _latest_metric_snapshots(conn: Any, tenant_schema: str) -> dict[str, dict[str, Any]]:
        quoted = quote_identifier(tenant_schema, tenant_schema=True)
        tables = {
            "daily": "metricas_whatsapp_diarias",
            "monthly": "metricas_whatsapp_mensais",
            "yearly": "metricas_whatsapp_anuais",
        }
        snapshots: dict[str, dict[str, Any]] = {}
        for period, table in tables.items():
            row = conn.execute(
                f"select periodo_inicio, metricas from {quoted}.{table} order by periodo_inicio desc limit 1"
            ).fetchone()
            if row is not None:
                snapshots[period] = {
                    REFERENCE_FIELD: row["periodo_inicio"],
                    "metricas": normalize_metricas(row["metricas"]),
                }
        return snapshots

    def _finalize_test_delivery(self, client_id: str, tenant_schema: str, execution_id: str, delivery_id: str, succeeded: bool, provider_message_id: str | None, error: str | None) -> None:
        quoted = quote_identifier(tenant_schema, tenant_schema=True)
        with self.pool.connection() as conn, conn.transaction():
            now_status = "sent" if succeeded else "failed"
            conn.execute(
                f"""
                update {quoted}.whatsapp_entregas
                set status = %s, tentativas = tentativas + 1, provider_message_id = %s, erro = %s,
                    enviado_em = case when %s then now() else null end
                where id = %s::uuid and client_id = %s::uuid
                """,
                (now_status, provider_message_id, error, succeeded, delivery_id, client_id),
            )
            conn.execute(
                f"""
                update {quoted}.whatsapp_execucoes
                set status = %s, finalizado_em = now(), erro = %s
                where id = %s::uuid and client_id = %s::uuid
                """,
                ("succeeded" if succeeded else "failed", error, execution_id, client_id),
            )

    @staticmethod
    def _build_groups(rows: list[dict[str, Any]]) -> list[WhatsAppVariableGroup]:
        grouped: dict[str, list[dict[str, Any]]] = {key: [] for key in SOURCE_DEFINITIONS}
        for row in rows:
            grouped[row["source_key"]].append(row)

        result: list[WhatsAppVariableGroup] = []
        for source_key, (period, label) in SOURCE_DEFINITIONS.items():
            source_rows = grouped[source_key]
            if not source_rows:
                continue
            result.append(WhatsAppVariableGroup(
                period=period,
                label=label,
                source_key=source_key,
                grain=source_rows[0]["grain"] if source_rows else "",
                variables=[WhatsAppVariable(
                    key=f"{period}.{row['field_name']}",
                    field_name=row["field_name"],
                    display_name=row["display_name"],
                    value_type=row["technical_type"],
                    semantic_role=row["semantic_role"],
                    description=row["business_meaning"],
                ) for row in source_rows],
            ))
        return result
