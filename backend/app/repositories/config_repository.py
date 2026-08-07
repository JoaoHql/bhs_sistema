import asyncio
from collections.abc import Callable
from typing import Any, TypeVar

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from app.core.db import get_connection_pool, readonly_connection
from app.core.errors import ConflictError, NotFoundError, UnauthorizedError
from app.core.config import get_settings
from app.core.security import hash_password
from app.repositories.query_builder import quote_identifier
from app.schemas.client import Client
from app.schemas.client_visibility import ClientVisibilityResponse, VisibleModule, VisibleScreen
from app.schemas.data_source_field import DataSourceFieldUpsertRequest
from app.schemas.module import Module
from app.schemas.published_version import PublishedVersion
from app.schemas.screen import Screen
from app.schemas.tenant_catalog import DataSourceCreateRequest, TenantCatalog
from app.schemas.template_contract import (
    ScreenInstance,
    ScreenInstanceUpsertRequest,
    ScreenWidgetInstance,
    TenantTemplateBinding,
    TenantTemplateBindingUpsertRequest,
    VisualTemplate,
    VisualTemplateUpsertRequest,
)
from app.repositories.config_repository_protocol import CredentialState
from app.schemas.user import CreateManagedUserRequest, ManagedUser, ProfileUpdateRequest, UpdateManagedUserRequest, User

T = TypeVar("T")

AUTHENTICATE_USER_SQL = """
select id::text, email, name, password_hash, is_staff, staff_role,
       must_change_password, temporary_password_expires_at, credentials_version
from app_core.app_users
where lower(email) = lower(%s) and status = 'active'
  and (
    must_change_password = false
    or temporary_password_expires_at > now()
  )
"""

CHANGE_PASSWORD_SQL = """
update app_core.app_users
set password_hash = %s,
    must_change_password = false,
    temporary_password_expires_at = null,
    password_changed_at = now(),
    password_reset_by = null,
    credentials_version = credentials_version + 1,
    updated_at = now()
where id = %s::uuid
  and status = 'active'
  and credentials_version = %s
returning credentials_version
"""


class ConfigRepository:
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url
        self.pool = get_connection_pool(database_url)

    async def _run(self, operation: Callable[[], T]) -> T:
        return await asyncio.to_thread(operation)

    def _connect(self) -> psycopg.Connection:
        return self.pool.connection()

    def _read_connection(self):
        return readonly_connection(self.pool)

    async def get_current_user(self, email: str | None = None, client_slug: str | None = None, user_id: str | None = None) -> User:
        if not email and not user_id:
            raise NotFoundError("Usuario atual nao definido.")

        def operation() -> dict[str, Any] | None:
            with self._read_connection() as conn:
                # 1. Verificar se e usuario de equipe (is_staff = true)
                staff_user = conn.execute(
                    """
                    select id::text, email, name, is_staff, staff_role,
                           must_change_password, credentials_version
                    from app_core.app_users
                    where status = 'active'
                      and is_staff = true
                      and coalesce(staff_role, 'master') = 'master'
                      and (%s::uuid is null or id = %s::uuid)
                      and (%s::text is null or email = %s::text)
                    """,
                    (user_id, user_id, email, email),
                ).fetchone()
                
                if staff_user and staff_user["is_staff"]:
                    return {
                        "id": staff_user["id"],
                        "email": staff_user["email"],
                        "name": staff_user["name"],
                        "client_id": None,
                        "roles": ["admin"],
                        "allowed_screen_ids": ["*"],
                        "is_staff": True,
                        "staff_role": staff_user["staff_role"] or "master",
                        "must_change_password": staff_user["must_change_password"],
                        "credentials_version": staff_user["credentials_version"],
                    }

                if not client_slug:
                    return None

                # 2. Consultar como usuario de cliente regular
                row = conn.execute(
                    """
                    select
                      u.id::text,
                      u.email,
                      u.name,
                      c.id::text as client_id,
                      cu.roles,
                      cu.whatsapp_phone_e164,
                      coalesce(array_agg(s.key order by s.key) filter (where csp.access in ('read', 'write')), array[]::text[]) as allowed_screen_ids,
                      u.is_staff,
                      u.must_change_password
                      , u.credentials_version
                    from app_core.app_users u
                    join app_core.client_users cu on cu.user_id = u.id and cu.status = 'active'
                    join app_core.clients c on c.id = cu.client_id and c.status = 'active'
                    left join app_core.client_screen_permissions csp on csp.client_user_id = cu.id
                    left join app_core.screens s on s.id = csp.screen_id
                    where (%s::uuid is null or u.id = %s::uuid)
                      and (%s::text is null or u.email = %s::text)
                      and u.status = 'active'
                      and c.slug = %s
                    group by u.id, u.email, u.name, c.id, cu.roles, u.is_staff, cu.whatsapp_phone_e164,
                             u.must_change_password, u.credentials_version
                    """,
                    (user_id, user_id, email, email, client_slug),
                ).fetchone()
                return row

        row = await self._run(operation)
        if row is None:
            raise NotFoundError("Usuario nao encontrado para os dados informados.")
        if "admin" in row["roles"]:
            row["allowed_screen_ids"] = ["*"]
        row["client_slug"] = client_slug
        return User.model_validate(row)

    async def update_current_user_profile(self, actor: User, payload: ProfileUpdateRequest) -> User:
        def operation() -> None:
            with self._connect() as conn, conn.transaction():
                updated = conn.execute(
                    "update app_core.app_users set name = %s, updated_at = now() where id = %s::uuid and status = 'active' returning id",
                    (payload.name.strip(), actor.id),
                ).fetchone()
                if updated is None:
                    raise NotFoundError("Usuario nao encontrado.")
                if actor.client_id:
                    membership = conn.execute(
                        """update app_core.client_users
                           set whatsapp_phone_e164 = %s
                           where user_id = %s::uuid and client_id = %s::uuid and status = 'active'
                           returning id""",
                        (payload.whatsapp_phone_e164, actor.id, actor.client_id),
                    ).fetchone()
                    if membership is None:
                        raise NotFoundError("Vinculo do usuario nao encontrado.")

        await self._run(operation)
        return await self.get_current_user(user_id=actor.id, client_slug=actor.client_slug)

    async def get_current_user_menu_order(self, actor: User) -> list[str]:
        scope_key = actor.client_slug or "__staff__"

        def operation() -> list[str]:
            with self._read_connection() as conn:
                row = conn.execute(
                    """select item_ids
                       from app_core.user_menu_preferences
                       where user_id = %s::uuid and scope_key = %s""",
                    (actor.id, scope_key),
                ).fetchone()
                return list(row["item_ids"]) if row and isinstance(row["item_ids"], list) else []

        return await self._run(operation)

    async def update_current_user_menu_order(self, actor: User, item_ids: list[str]) -> list[str]:
        scope_key = actor.client_slug or "__staff__"

        def operation() -> None:
            with self._connect() as conn, conn.transaction():
                conn.execute(
                    """insert into app_core.user_menu_preferences (user_id, scope_key, item_ids)
                       values (%s::uuid, %s, %s)
                       on conflict (user_id, scope_key) do update
                         set item_ids = excluded.item_ids, updated_at = now()""",
                    (actor.id, scope_key, Jsonb(item_ids)),
                )

        await self._run(operation)
        return item_ids

    async def authenticate_user(self, email: str, password: str, client_slug: str | None = None) -> User | None:
        def operation() -> dict[str, Any] | None:
            with self._read_connection() as conn:
                user = conn.execute(AUTHENTICATE_USER_SQL, (email,)).fetchone()
                return user

        row = await self._run(operation)
        if row is None:
            return None

        from app.core.security import verify_password
        if not verify_password(password, row.get("password_hash") or ""):
            return None

        if row["is_staff"]:
            if (row["staff_role"] or "master") != "master":
                return None
            return User(
                id=row["id"],
                email=row["email"],
                name=row["name"],
                client_id=None,
                roles=["admin"],
                allowed_screen_ids=["*"],
                is_staff=True,
                staff_role=row["staff_role"] or "master",
                must_change_password=row["must_change_password"],
                credentials_version=row["credentials_version"],
            )

        def client_operation() -> dict[str, Any] | None:
            with self._read_connection() as conn:
                return conn.execute(
                    """
                    select
                      c.id::text as client_id,
                      c.slug,
                      cu.roles,
                      cu.whatsapp_phone_e164,
                      coalesce(array_agg(s.key order by s.key) filter (where csp.access in ('read', 'write')), array[]::text[]) as allowed_screen_ids
                    from app_core.client_users cu
                    join app_core.clients c on c.id = cu.client_id and c.status = 'active'
                    left join app_core.client_screen_permissions csp on csp.client_user_id = cu.id
                    left join app_core.screens s on s.id = csp.screen_id
                    where cu.user_id = %s::uuid and cu.status = 'active'
                      and (%s::text is null or c.slug = %s::text)
                    group by c.id, c.slug, cu.roles, cu.whatsapp_phone_e164
                    order by c.slug
                    limit 2
                    """,
                    (row["id"], client_slug, client_slug),
                ).fetchall()

        client_rows = await self._run(client_operation)
        if len(client_rows) != 1:
            return None
        client_row = client_rows[0]

        if "admin" in client_row["roles"]:
            client_row["allowed_screen_ids"] = ["*"]

        return User(
            id=row["id"],
            email=row["email"],
            name=row["name"],
            client_id=client_row["client_id"],
            roles=client_row["roles"],
            allowed_screen_ids=client_row["allowed_screen_ids"],
            is_staff=False,
            client_slug=client_row["slug"],
            must_change_password=row["must_change_password"],
            credentials_version=row["credentials_version"],
            whatsapp_phone_e164=client_row["whatsapp_phone_e164"],
        )

    async def get_credential_state(self, user_id: str) -> CredentialState:
        def operation() -> dict[str, Any] | None:
            with self._read_connection() as conn:
                return conn.execute(
                    """
                    select password_hash, must_change_password,
                           temporary_password_expires_at, credentials_version
                    from app_core.app_users
                    where id = %s::uuid and status = 'active'
                    """,
                    (user_id,),
                ).fetchone()

        row = await self._run(operation)
        if row is None:
            raise UnauthorizedError("Credencial invalida ou revogada.")
        return CredentialState(**row)

    async def change_password(self, user_id: str, expected_version: int, password_hash: str) -> int:
        def operation() -> int | None:
            with self._connect() as conn:
                row = conn.execute(
                    CHANGE_PASSWORD_SQL,
                    (password_hash, user_id, expected_version),
                ).fetchone()
                return None if row is None else row["credentials_version"]

        version = await self._run(operation)
        if version is None:
            raise UnauthorizedError("Credencial invalida ou revogada.")
        return version


    async def _published_config(self, client_id: str) -> dict[str, Any] | None:
        def operation() -> dict[str, Any] | None:
            with self._read_connection() as conn:
                row = conn.execute(
                    """
                    select config
                    from app_core.published_versions
                    where client_id = %s::uuid
                      and status = 'published'
                    order by version desc
                    limit 1
                    """,
                    (client_id,),
                ).fetchone()
            return None if row is None else row["config"]

        return await self._run(operation)

    async def list_modules(self, client_id: str) -> list[Module]:
        config = await self._published_config(client_id)
        if config is None:
            return []
        visibility = await self._visibility_overrides(client_id, config)
        return [
            module.model_copy(update={"screens": [screen for screen in module.screens if visibility.get(("screen", screen.id), True)]})
            for module in (Module.model_validate(raw) for raw in config.get("modules", []))
            if visibility.get(("module", module.id), True)
        ]

    async def get_screen(self, client_id: str, screen_id: str) -> Screen | None:
        config = await self._published_config(client_id)
        if config is None:
            return None
        visibility = await self._visibility_overrides(client_id, config)
        if not visibility.get(("screen", screen_id), True):
            return None
        for screen in config.get("screens", []):
            if screen.get("id") == screen_id:
                parsed = Screen.model_validate(screen)
                if not visibility.get(("module", parsed.module_id), True):
                    return None
                return parsed
        return None

    async def get_client_by_slug(self, client_slug: str) -> Client | None:
        def operation() -> dict[str, Any] | None:
            with self._read_connection() as conn:
                return conn.execute(
                    "select id::text, name, slug, status from app_core.clients where slug = %s",
                    (client_slug,),
                ).fetchone()

        row = await self._run(operation)
        return None if row is None else Client.model_validate(row)

    async def get_tenant_catalog(self, client_slug: str) -> TenantCatalog:
        def operation() -> dict[str, Any] | None:
            with self._connect() as conn:
                client = conn.execute(
                    "select id::text, name, slug, status, tenant_schema::text from app_core.clients where slug = %s",
                    (client_slug,),
                ).fetchone()
                if client is None:
                    return None

                tenant_schema = client["tenant_schema"]
                quote_identifier(tenant_schema, tenant_schema=True)

                sources = conn.execute(
                    """
                    select id::text, key, kind, entity, allowed_fields, allowed_filters, active
                    from app_core.data_sources
                    where client_id = %s::uuid
                    order by key
                    """,
                    (client["id"],),
                ).fetchall()
                source_by_entity = {row["entity"]: row for row in sources}
                fields = conn.execute(
                    """
                    select
                      ds.key as data_source_key,
                      dsf.id::text,
                      dsf.data_source_id::text,
                      dsf.field_name,
                      dsf.display_name,
                      dsf.technical_type,
                      dsf.semantic_role,
                      dsf.business_meaning,
                      dsf.synonyms,
                      dsf.example_values,
                      dsf.allowed_aggregations,
                      dsf.is_filterable,
                      dsf.is_groupable,
                      dsf.is_sensitive,
                      dsf.quality_notes,
                      dsf.status
                    from app_core.data_source_fields dsf
                    join app_core.data_sources ds on ds.id = dsf.data_source_id
                    where ds.client_id = %s::uuid
                    order by ds.key, dsf.field_name
                    """,
                    (client["id"],),
                ).fetchall()

                objects = conn.execute(
                    """
                    select table_name as name, 'table' as object_type
                    from information_schema.tables
                    where table_schema = %s and table_type = 'BASE TABLE'
                    union all
                    select table_name as name, 'view' as object_type
                    from information_schema.views
                    where table_schema = %s
                    order by name
                    """,
                    (tenant_schema, tenant_schema),
                ).fetchall()

                columns = conn.execute(
                    """
                    select table_name, column_name, data_type, is_nullable
                    from information_schema.columns
                    where table_schema = %s
                    order by table_name, ordinal_position
                    """,
                    (tenant_schema,),
                ).fetchall()

            columns_by_object: dict[str, list[dict[str, Any]]] = {}
            for column in columns:
                columns_by_object.setdefault(column["table_name"], []).append(
                    {
                        "name": column["column_name"],
                        "data_type": column["data_type"],
                        "is_nullable": column["is_nullable"] == "YES",
                    }
                )

            return {
                "client": {key: client[key] for key in ("id", "name", "slug", "status")},
                "tenant_schema": tenant_schema,
                "objects": [
                    {
                        "name": row["name"],
                        "object_type": row["object_type"],
                        "columns": columns_by_object.get(row["name"], []),
                        "registered": row["name"] in source_by_entity,
                        "data_source_key": source_by_entity.get(row["name"], {}).get("key"),
                    }
                    for row in objects
                ],
                "data_sources": [
                    {
                        **source,
                        "fields": [
                            {key: value for key, value in field.items() if key != "data_source_key"}
                            for field in fields
                            if field["data_source_key"] == source["key"]
                        ],
                    }
                    for source in sources
                ],
            }

        row = await self._run(operation)
        if row is None:
            raise NotFoundError("Cliente nao encontrado.")
        return TenantCatalog.model_validate(row)

    async def upsert_data_source(self, client_slug: str, payload: DataSourceCreateRequest) -> TenantCatalog:
        def operation() -> None:
            with self._connect() as conn:
                client = conn.execute(
                    "select id, tenant_schema::text from app_core.clients where slug = %s and status = 'active'",
                    (client_slug,),
                ).fetchone()
                if client is None:
                    raise NotFoundError("Cliente nao encontrado.")

                tenant_schema = client["tenant_schema"]
                quote_identifier(tenant_schema, tenant_schema=True)

                object_type = "BASE TABLE" if payload.kind == "tenant_table" else "VIEW"
                exists = conn.execute(
                    """
                    select 1
                    from information_schema.tables
                    where table_schema = %s and table_name = %s and table_type = %s
                    union all
                    select 1
                    from information_schema.views
                    where table_schema = %s and table_name = %s and %s = 'VIEW'
                    limit 1
                    """,
                    (tenant_schema, payload.entity, object_type, tenant_schema, payload.entity, object_type),
                ).fetchone()
                if exists is None:
                    raise NotFoundError("Tabela/view nao encontrada no schema do cliente.")

                columns = conn.execute(
                    """
                    select column_name
                    from information_schema.columns
                    where table_schema = %s and table_name = %s
                    """,
                    (tenant_schema, payload.entity),
                ).fetchall()
                available_fields = {row["column_name"] for row in columns}
                requested_fields = set(payload.allowed_fields)
                requested_filters = set(payload.allowed_filters)
                invalid = sorted((requested_fields | requested_filters) - available_fields)
                if invalid:
                    raise NotFoundError(f"Campos inexistentes no objeto do tenant: {', '.join(invalid)}")

                conn.execute(
                    """
                    insert into app_core.data_sources (client_id, key, kind, entity, allowed_fields, allowed_filters, active)
                    values (%s, %s, %s, %s, %s::text[], %s::text[], %s)
                    on conflict (client_id, key) do update
                    set kind = excluded.kind,
                        entity = excluded.entity,
                        allowed_fields = excluded.allowed_fields,
                        allowed_filters = excluded.allowed_filters,
                        active = excluded.active
                    """,
                    (
                        client["id"],
                        payload.key,
                        payload.kind,
                        payload.entity,
                        payload.allowed_fields,
                        payload.allowed_filters,
                        payload.active,
                    ),
                )

        await self._run(operation)
        return await self.get_tenant_catalog(client_slug)

    async def upsert_data_source_field(
        self,
        client_slug: str,
        data_source_key: str,
        payload: DataSourceFieldUpsertRequest,
    ) -> TenantCatalog:
        def operation() -> None:
            with self._connect() as conn:
                source = conn.execute(
                    """
                    select ds.id, ds.allowed_fields
                    from app_core.data_sources ds
                    join app_core.clients c on c.id = ds.client_id
                    where c.slug = %s and c.status = 'active' and ds.key = %s
                    """,
                    (client_slug, data_source_key),
                ).fetchone()
                if source is None:
                    raise NotFoundError("Fonte de dados nao encontrada.")
                if payload.field_name not in source["allowed_fields"]:
                    raise NotFoundError("Campo nao pertence aos allowed_fields da fonte.")

                conn.execute(
                    """
                    insert into app_core.data_source_fields (
                      data_source_id,
                      field_name,
                      display_name,
                      technical_type,
                      semantic_role,
                      business_meaning,
                      synonyms,
                      example_values,
                      allowed_aggregations,
                      is_filterable,
                      is_groupable,
                      is_sensitive,
                      quality_notes,
                      status
                    )
                    values (%s, %s, %s, %s, %s, %s, %s::text[], %s::jsonb, %s::text[], %s, %s, %s, %s, %s)
                    on conflict (data_source_id, field_name) do update
                    set display_name = excluded.display_name,
                        technical_type = excluded.technical_type,
                        semantic_role = excluded.semantic_role,
                        business_meaning = excluded.business_meaning,
                        synonyms = excluded.synonyms,
                        example_values = excluded.example_values,
                        allowed_aggregations = excluded.allowed_aggregations,
                        is_filterable = excluded.is_filterable,
                        is_groupable = excluded.is_groupable,
                        is_sensitive = excluded.is_sensitive,
                        quality_notes = excluded.quality_notes,
                        status = excluded.status,
                        updated_at = now()
                    """,
                    (
                        source["id"],
                        payload.field_name,
                        payload.display_name,
                        payload.technical_type,
                        payload.semantic_role,
                        payload.business_meaning,
                        payload.synonyms,
                        Jsonb(payload.example_values),
                        payload.allowed_aggregations,
                        payload.is_filterable,
                        payload.is_groupable,
                        payload.is_sensitive,
                        payload.quality_notes,
                        payload.status,
                    ),
                )

        await self._run(operation)
        return await self.get_tenant_catalog(client_slug)

    async def list_versions(self, client_slug: str) -> list[PublishedVersion]:
        def operation() -> list[dict[str, Any]]:
            with self._connect() as conn:
                return conn.execute(
                    """
                    select pv.id::text, pv.client_id::text, pv.version, pv.status, pv.config,
                           pv.validation_errors, pv.validated_by::text as validated_by,
                           pv.validated_at, pv.published_by::text as published_by,
                           pv.published_at, pv.archived_at
                    from app_core.published_versions pv
                    join app_core.clients c on c.id = pv.client_id
                    where c.slug = %s
                    order by pv.version desc
                    """,
                    (client_slug,),
                ).fetchall()

        rows = await self._run(operation)
        return [PublishedVersion.model_validate(row) for row in rows]

    async def get_version(self, client_slug: str, version: int) -> PublishedVersion | None:
        versions = await self.list_versions(client_slug)
        return next((item for item in versions if item.version == version), None)

    async def create_draft(self, client_slug: str, config: dict[str, Any]) -> PublishedVersion:
        def operation() -> dict[str, Any] | None:
            with self._connect() as conn:
                return conn.execute(
                    """
                    with target_client as (
                      select id from app_core.clients where slug = %s and status = 'active'
                    ),
                    next_version as (
                      select coalesce(max(pv.version), 0) + 1 as version
                      from app_core.published_versions pv
                      join target_client tc on tc.id = pv.client_id
                    )
                    insert into app_core.published_versions (client_id, version, status, config)
                    select tc.id, nv.version, 'draft', %s::jsonb
                    from target_client tc cross join next_version nv
                    returning id::text, client_id::text, version, status, config,
                              validation_errors, validated_by::text, validated_at,
                              published_by::text, published_at, archived_at
                    """,
                    (client_slug, Jsonb(config)),
                ).fetchone()

        row = await self._run(operation)
        if row is None:
            raise NotFoundError("Cliente nao encontrado para criar draft.")
        return PublishedVersion.model_validate(row)

    async def mark_validated(self, client_slug: str, version: int, user_id: str, errors: list[str]) -> PublishedVersion:
        return await self._update_version_status(client_slug, version, "validated", errors, user_id)

    async def mark_validation_failed(self, client_slug: str, version: int, errors: list[str]) -> PublishedVersion:
        return await self._update_version_status(client_slug, version, "draft", errors, None)

    async def _update_version_status(
        self,
        client_slug: str,
        version: int,
        status: str,
        errors: list[str],
        user_id: str | None,
    ) -> PublishedVersion:
        def operation() -> dict[str, Any] | None:
            with self._connect() as conn:
                return conn.execute(
                    """
                    update app_core.published_versions pv
                    set status = %s,
                        validation_errors = %s::jsonb,
                        validated_by = case when %s::uuid is null then validated_by else %s::uuid end,
                        validated_at = case when %s = 'validated' then now() else validated_at end
                    from app_core.clients c
                    where c.id = pv.client_id
                      and c.slug = %s
                      and pv.version = %s
                    returning pv.id::text, pv.client_id::text, pv.version, pv.status, pv.config,
                              pv.validation_errors, pv.validated_by::text, pv.validated_at,
                              pv.published_by::text, pv.published_at, pv.archived_at
                    """,
                    (status, Jsonb(errors), user_id, user_id, status, client_slug, version),
                ).fetchone()

        row = await self._run(operation)
        if row is None:
            raise NotFoundError("Versao nao encontrada.")
        return PublishedVersion.model_validate(row)

    async def publish_version(self, client_slug: str, version: int, user_id: str) -> PublishedVersion:
        def operation() -> dict[str, Any] | None:
            with self._connect() as conn:
                with conn.transaction():
                    current = conn.execute(
                        """
                        select pv.id
                        from app_core.published_versions pv
                        join app_core.clients c on c.id = pv.client_id
                        where c.slug = %s and pv.version = %s and pv.status = 'validated'
                        for update
                        """,
                        (client_slug, version),
                    ).fetchone()
                    if current is None:
                        return None
                    conn.execute(
                        """
                        update app_core.published_versions pv
                        set status = 'archived', archived_at = now()
                        from app_core.clients c
                        where c.id = pv.client_id
                          and c.slug = %s
                          and pv.status = 'published'
                        """,
                        (client_slug,),
                    )
                    return conn.execute(
                        """
                        update app_core.published_versions pv
                        set status = 'published',
                            published_by = %s::uuid,
                            published_at = now(),
                            archived_at = null
                        from app_core.clients c
                        where c.id = pv.client_id
                          and c.slug = %s
                          and pv.version = %s
                        returning pv.id::text, pv.client_id::text, pv.version, pv.status, pv.config,
                                  pv.validation_errors, pv.validated_by::text, pv.validated_at,
                                  pv.published_by::text, pv.published_at, pv.archived_at
                        """,
                        (user_id, client_slug, version),
                    ).fetchone()

        row = await self._run(operation)
        if row is None:
            raise NotFoundError("Somente versao validated pode ser publicada.")
        return PublishedVersion.model_validate(row)

    async def rollback_version(self, client_slug: str, version: int, user_id: str) -> PublishedVersion:
        def operation() -> dict[str, Any] | None:
            with self._connect() as conn:
                with conn.transaction():
                    target = conn.execute(
                        """
                        select pv.id
                        from app_core.published_versions pv
                        join app_core.clients c on c.id = pv.client_id
                        where c.slug = %s
                          and pv.version = %s
                          and pv.status in ('archived', 'validated')
                        for update
                        """,
                        (client_slug, version),
                    ).fetchone()
                    if target is None:
                        return None
                    conn.execute(
                        """
                        update app_core.published_versions pv
                        set status = 'archived', archived_at = now()
                        from app_core.clients c
                        where c.id = pv.client_id
                          and c.slug = %s
                          and pv.status = 'published'
                        """,
                        (client_slug,),
                    )
                    return conn.execute(
                        """
                        update app_core.published_versions pv
                        set status = 'published',
                            published_by = %s::uuid,
                            published_at = now(),
                            archived_at = null
                        from app_core.clients c
                        where c.id = pv.client_id
                          and c.slug = %s
                          and pv.version = %s
                        returning pv.id::text, pv.client_id::text, pv.version, pv.status, pv.config,
                                  pv.validation_errors, pv.validated_by::text, pv.validated_at,
                                  pv.published_by::text, pv.published_at, pv.archived_at
                        """,
                        (user_id, client_slug, version),
                    ).fetchone()

        row = await self._run(operation)
        if row is None:
            raise NotFoundError("Versao de rollback nao encontrada ou invalida.")
        return PublishedVersion.model_validate(row)

    async def archive_version(self, client_slug: str, version: int) -> PublishedVersion:
        return await self._update_version_status(client_slug, version, "archived", [], None)

    async def get_validation_catalog(self, client_slug: str) -> dict[str, Any]:
        def operation() -> dict[str, Any]:
            with self._connect() as conn:
                modules = conn.execute("select key from app_core.modules").fetchall()
                screens = conn.execute(
                    """
                    select s.key, m.key as module_key
                    from app_core.screens s
                    join app_core.modules m on m.id = s.module_id
                    """
                ).fetchall()
                sources = conn.execute(
                    """
                    select ds.id::text, ds.key, ds.allowed_fields, ds.allowed_filters
                    from app_core.data_sources ds
                    join app_core.clients c on c.id = ds.client_id
                    where c.slug = %s and ds.active = true
                    """,
                    (client_slug,),
                ).fetchall()
                bindings = conn.execute(
                    """
                    select
                        b.id::text,
                        b.client_id::text,
                        b.status,
                        ds.id::text as data_source_id,
                        ds.key as data_source_key,
                        t.key as template_key
                    from app_core.tenant_template_bindings b
                    join app_core.clients c on c.id = b.client_id
                    join app_core.data_sources ds on ds.id = b.data_source_id
                    join app_core.visual_templates t on t.id = b.template_id
                    where c.slug = %s
                    """,
                    (client_slug,),
                ).fetchall()
            return {
                "modules": {row["key"] for row in modules},
                "screens": {row["key"]: row["module_key"] for row in screens},
                "data_sources": {
                    row["key"]: {
                        "allowed_fields": set(row["allowed_fields"]),
                        "allowed_filters": set(row["allowed_filters"]),
                    }
                    for row in sources
                }
                | {
                    row["id"]: {
                        "allowed_fields": set(row["allowed_fields"]),
                        "allowed_filters": set(row["allowed_filters"]),
                    }
                    for row in sources
                },
                "template_bindings": {
                    row["id"]: {
                        "client_id": row["client_id"],
                        "status": row["status"],
                        "data_source_id": row["data_source_id"],
                        "data_source_key": row["data_source_key"],
                        "template_key": row["template_key"],
                    }
                    for row in bindings
                },
            }

        return await self._run(operation)

    async def list_visual_templates(self) -> list[VisualTemplate]:
        def operation() -> list[dict[str, Any]]:
            with self._connect() as conn:
                return conn.execute(
                    """
                    select
                        id::text,
                        key,
                        name,
                        description,
                        template_type,
                        visual_type,
                        semantic_requirements,
                        default_options,
                        status
                    from app_core.visual_templates
                    order by name
                    """
                ).fetchall()

        rows = await self._run(operation)
        return [VisualTemplate.model_validate(row) for row in rows]

    async def upsert_visual_template(self, payload: VisualTemplateUpsertRequest) -> VisualTemplate:
        def operation() -> dict[str, Any]:
            with self._connect() as conn:
                row = conn.execute(
                    """
                    insert into app_core.visual_templates (
                        key,
                        name,
                        description,
                        template_type,
                        visual_type,
                        semantic_requirements,
                        default_options,
                        status
                    )
                    values (%s, %s, %s, %s, %s, %s, %s, %s)
                    on conflict (key) do update set
                        name = excluded.name,
                        description = excluded.description,
                        template_type = excluded.template_type,
                        visual_type = excluded.visual_type,
                        semantic_requirements = excluded.semantic_requirements,
                        default_options = excluded.default_options,
                        status = excluded.status,
                        updated_at = now()
                    returning
                        id::text,
                        key,
                        name,
                        description,
                        template_type,
                        visual_type,
                        semantic_requirements,
                        default_options,
                        status
                    """,
                    (
                        payload.key,
                        payload.name,
                        payload.description,
                        payload.template_type,
                        payload.visual_type,
                        Jsonb(payload.semantic_requirements.model_dump()),
                        Jsonb(payload.default_options),
                        payload.status,
                    ),
                ).fetchone()
                conn.commit()
                return row

        row = await self._run(operation)
        return VisualTemplate.model_validate(row)

    async def list_template_bindings(self, client_slug: str) -> list[TenantTemplateBinding]:
        def operation() -> list[dict[str, Any]]:
            with self._connect() as conn:
                return conn.execute(
                    """
                    select
                        b.id::text,
                        b.client_id::text,
                        b.template_id::text,
                        b.data_source_id::text,
                        b.field_mapping,
                        b.default_title,
                        b.default_description,
                        b.status,
                        b.validation_errors
                    from app_core.tenant_template_bindings b
                    join app_core.clients c on c.id = b.client_id
                    where c.slug = %s
                    order by b.created_at desc
                    """,
                    (client_slug,),
                ).fetchall()

        rows = await self._run(operation)
        return [TenantTemplateBinding.model_validate(row) for row in rows]

    async def get_template_binding(self, client_slug: str, binding_id: str) -> TenantTemplateBinding | None:
        bindings = await self.list_template_bindings(client_slug)
        return next((binding for binding in bindings if binding.id == binding_id), None)

    async def upsert_template_binding(
        self,
        client_slug: str,
        payload: TenantTemplateBindingUpsertRequest,
    ) -> TenantTemplateBinding:
        def operation() -> dict[str, Any]:
            with self._connect() as conn:
                row = conn.execute(
                    """
                    with target_client as (
                        select id from app_core.clients where slug = %s
                    )
                    insert into app_core.tenant_template_bindings (
                        client_id,
                        template_id,
                        data_source_id,
                        field_mapping,
                        default_title,
                        default_description,
                        status,
                        validation_errors
                    )
                    select
                        target_client.id,
                        %s::uuid,
                        %s::uuid,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s
                    from target_client
                    on conflict (client_id, template_id, data_source_id) do update set
                        field_mapping = excluded.field_mapping,
                        default_title = excluded.default_title,
                        default_description = excluded.default_description,
                        status = excluded.status,
                        validation_errors = excluded.validation_errors,
                        updated_at = now()
                    returning
                        id::text,
                        client_id::text,
                        template_id::text,
                        data_source_id::text,
                        field_mapping,
                        default_title,
                        default_description,
                        status,
                        validation_errors
                    """,
                    (
                        client_slug,
                        payload.template_id,
                        payload.data_source_id,
                        Jsonb(payload.field_mapping.model_dump()),
                        payload.default_title,
                        payload.default_description,
                        payload.status,
                        Jsonb(payload.validation_errors),
                    ),
                ).fetchone()
                conn.commit()
                return row

        row = await self._run(operation)
        if row is None:
            raise NotFoundError("Cliente nao encontrado.")
        return TenantTemplateBinding.model_validate(row)

    async def set_template_binding_validation(
        self,
        client_slug: str,
        binding_id: str,
        errors: list[str],
        user_id: str,
    ) -> TenantTemplateBinding:
        status = "draft" if errors else "active"

        def operation() -> dict[str, Any] | None:
            with self._connect() as conn:
                row = conn.execute(
                    """
                    update app_core.tenant_template_bindings b
                    set
                        status = %s,
                        validation_errors = %s,
                        validated_by = %s::uuid,
                        validated_at = now(),
                        updated_at = now()
                    from app_core.clients c
                    where b.client_id = c.id
                      and c.slug = %s
                      and b.id = %s::uuid
                    returning
                        b.id::text,
                        b.client_id::text,
                        b.template_id::text,
                        b.data_source_id::text,
                        b.field_mapping,
                        b.default_title,
                        b.default_description,
                        b.status,
                        b.validation_errors
                    """,
                    (status, Jsonb(errors), user_id, client_slug, binding_id),
                ).fetchone()
                conn.commit()
                return row

        row = await self._run(operation)
        if row is None:
            raise NotFoundError("Binding nao encontrado.")
        return TenantTemplateBinding.model_validate(row)

    async def list_screen_instances(self, client_slug: str) -> list[ScreenInstance]:
        def operation() -> list[dict[str, Any]]:
            with self._connect() as conn:
                screens = conn.execute(
                    """
                    select
                        s.id::text,
                        s.client_id::text,
                        s.module_key,
                        s.screen_key,
                        s.label,
                        s.layout,
                        s.status
                    from app_core.screen_instances s
                    join app_core.clients c on c.id = s.client_id
                    where c.slug = %s
                    order by s.screen_key
                    """,
                    (client_slug,),
                ).fetchall()
                widgets = conn.execute(
                    """
                    select
                        w.id::text,
                        w.screen_instance_id::text,
                        w.binding_id::text,
                        w.widget_key,
                        w.title_override,
                        w.description_override,
                        w.grid_span,
                        w.sort_order,
                        w.options_override
                    from app_core.screen_widget_instances w
                    join app_core.screen_instances s on s.id = w.screen_instance_id
                    join app_core.clients c on c.id = s.client_id
                    where c.slug = %s
                    order by w.sort_order, w.widget_key
                    """,
                    (client_slug,),
                ).fetchall()
            widgets_by_screen: dict[str, list[dict[str, Any]]] = {}
            for widget in widgets:
                widgets_by_screen.setdefault(widget["screen_instance_id"], []).append(widget)
            return [
                {**screen, "widgets": widgets_by_screen.get(screen["id"], [])}
                for screen in screens
            ]

        rows = await self._run(operation)
        return [ScreenInstance.model_validate(row) for row in rows]

    async def upsert_screen_instance(self, client_slug: str, payload: ScreenInstanceUpsertRequest) -> ScreenInstance:
        def operation() -> dict[str, Any] | None:
            with self._connect() as conn:
                screen = conn.execute(
                    """
                    with target_client as (
                        select id from app_core.clients where slug = %s
                    )
                    insert into app_core.screen_instances (
                        client_id,
                        module_key,
                        screen_key,
                        label,
                        layout,
                        status
                    )
                    select target_client.id, %s, %s, %s, %s, %s
                    from target_client
                    on conflict (client_id, screen_key) do update set
                        module_key = excluded.module_key,
                        label = excluded.label,
                        layout = excluded.layout,
                        status = excluded.status,
                        updated_at = now()
                    returning id::text, client_id::text, module_key, screen_key, label, layout, status
                    """,
                    (
                        client_slug,
                        payload.module_key,
                        payload.screen_key,
                        payload.label,
                        Jsonb(payload.layout),
                        payload.status,
                    ),
                ).fetchone()
                if screen is None:
                    conn.commit()
                    return None
                conn.execute(
                    "delete from app_core.screen_widget_instances where screen_instance_id = %s::uuid",
                    (screen["id"],),
                )
                for widget in payload.widgets:
                    conn.execute(
                        """
                        insert into app_core.screen_widget_instances (
                            screen_instance_id,
                            binding_id,
                            widget_key,
                            title_override,
                            description_override,
                            grid_span,
                            sort_order,
                            options_override
                        )
                        values (%s::uuid, %s::uuid, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            screen["id"],
                            widget.binding_id,
                            widget.widget_key,
                            widget.title_override,
                            widget.description_override,
                            widget.grid_span,
                            widget.sort_order,
                            Jsonb(widget.options_override),
                        ),
                    )
                conn.commit()
                screen["widgets"] = [
                    widget.model_copy(update={"screen_instance_id": screen["id"]}).model_dump()
                    for widget in payload.widgets
                ]
                return screen

        row = await self._run(operation)
        if row is None:
            raise NotFoundError("Cliente nao encontrado.")
        return ScreenInstance.model_validate(row)

    async def list_clients(self) -> list[Client]:
        def operation() -> list[dict[str, Any]]:
            with self._connect() as conn:
                return conn.execute(
                    "select id::text, name, slug, status from app_core.clients"
                ).fetchall()

        rows = await self._run(operation)
        return [Client.model_validate(row) for row in rows]

    async def _visibility_overrides(self, client_id: str, config: dict[str, Any]) -> dict[tuple[str, str], bool]:
        legacy = config.get("visibility", {})
        values = {("module", key): False for key in legacy.get("hiddenModuleIds", [])}
        values.update({("screen", key): False for key in legacy.get("hiddenScreenIds", [])})

        def operation() -> list[dict[str, Any]]:
            with self._read_connection() as conn:
                return conn.execute(
                    "select target_type, target_key, visible from app_core.tenant_view_visibility where client_id = %s::uuid",
                    (client_id,),
                ).fetchall()

        rows = await self._run(operation)
        values.update({(row["target_type"], row["target_key"]): row["visible"] for row in rows})
        return values

    async def get_client_visibility(self, client_slug: str) -> ClientVisibilityResponse:
        client = await self.get_client_by_slug(client_slug)
        if client is None:
            raise NotFoundError("Cliente nao encontrado.")
        config = await self._published_config(client.id) or {}
        visibility = await self._visibility_overrides(client.id, config)
        modules = [
            VisibleModule(
                id=raw["id"], label=raw["label"], visible=visibility.get(("module", raw["id"]), True),
                screens=[VisibleScreen(id=screen["id"], label=screen["label"], visible=visibility.get(("screen", screen["id"]), True)) for screen in raw.get("screens", [])],
            )
            for raw in config.get("modules", [])
        ]
        return ClientVisibilityResponse(clientSlug=client_slug, modules=modules)

    async def set_client_visibility(self, client_slug: str, target_type: str, target_id: str, visible: bool, actor_id: str | None = None) -> ClientVisibilityResponse:
        client = await self.get_client_by_slug(client_slug)
        if client is None:
            raise NotFoundError("Cliente nao encontrado.")
        config = await self._published_config(client.id)
        if config is None:
            raise NotFoundError("Configuracao publicada nao encontrada.")
        valid_ids = {raw["id"] for raw in config.get("modules", [])} if target_type == "module" else {screen["id"] for raw in config.get("modules", []) for screen in raw.get("screens", [])}
        if target_id not in valid_ids:
            raise NotFoundError("Modulo ou tela nao encontrado.")
        def operation() -> None:
            with self._connect() as conn:
                conn.execute(
                    """
                    insert into app_core.tenant_view_visibility (client_id, target_type, target_key, visible, updated_by)
                    values (%s::uuid, %s, %s, %s, case when %s::uuid is null then null else %s::uuid end)
                    on conflict (client_id, target_type, target_key) do update
                    set visible = excluded.visible, updated_by = excluded.updated_by, updated_at = now()
                    """,
                    (client.id, target_type, target_id, visible, actor_id, actor_id),
                )

        await self._run(operation)
        return await self.get_client_visibility(client_slug)

    async def list_managed_users(self, client_slug: str | None = None) -> list[ManagedUser]:
        def operation() -> list[dict[str, Any]]:
            with self._connect() as conn:
                return conn.execute(
                    """
                    select
                      u.id::text,
                      u.email,
                      u.name,
                      u.status,
                      u.is_staff,
                      u.staff_role,
                      u.must_change_password,
                      u.credentials_version,
                      c.id::text as client_id,
                      c.slug as client_slug,
                      coalesce(cu.roles, array[]::text[]) as roles,
                      coalesce(
                        array_agg(s.key order by s.key) filter (where csp.access in ('read', 'write')),
                        array[]::text[]
                      ) as allowed_screen_ids
                    from app_core.app_users u
                    left join app_core.client_users cu on cu.user_id = u.id and cu.status = 'active'
                    left join app_core.clients c on c.id = cu.client_id and c.status = 'active'
                    left join app_core.client_screen_permissions csp on csp.client_user_id = cu.id
                    left join app_core.screens s on s.id = csp.screen_id
                    where (%s::text is null or c.slug = %s::text)
                      and not (u.is_staff = true and u.staff_role = 'operator')
                    group by u.id, u.email, u.name, u.status, u.is_staff, u.staff_role,
                             u.must_change_password, u.credentials_version,
                             c.id, c.slug, cu.roles
                    order by u.name, u.email
                    """,
                    (client_slug, client_slug),
                ).fetchall()

        rows = await self._run(operation)
        return [ManagedUser.model_validate(row) for row in rows]

    async def create_managed_user(self, payload: CreateManagedUserRequest) -> ManagedUser:
        if payload.is_staff and payload.client_slug:
            raise ConflictError("Usuario da equipe nao pode ser vinculado a um tenant.")
        if not payload.is_staff and not payload.client_slug:
            raise ConflictError("Usuario de cliente exige clientSlug.")
        if payload.is_staff and payload.roles:
            raise ConflictError("Usuario da equipe usa staffRole, nao roles de tenant.")
        if not payload.is_staff and payload.staff_role:
            raise ConflictError("Usuario de cliente nao pode possuir staffRole.")

        def operation() -> str:
            settings = get_settings()
            with self._connect() as conn:
                with conn.transaction():
                    existing = conn.execute(
                        "select 1 from app_core.app_users where lower(email) = lower(%s)",
                        (str(payload.email),),
                    ).fetchone()
                    if existing:
                        raise ConflictError("Ja existe um usuario com este e-mail.")

                    client_id = None
                    if payload.client_slug:
                        client = conn.execute(
                            "select id from app_core.clients where slug = %s and status = 'active'",
                            (payload.client_slug,),
                        ).fetchone()
                        if client is None:
                            raise NotFoundError("Tenant nao encontrado ou inativo.")
                        client_id = client["id"]

                    row = conn.execute(
                        """
                        insert into app_core.app_users (
                            email, name, password_hash, is_staff, staff_role,
                            must_change_password, temporary_password_expires_at
                        )
                        values (%s, %s, %s, %s, %s, true, now() + make_interval(hours => %s))
                        returning id::text
                        """,
                        (
                            str(payload.email).lower(),
                            payload.name.strip(),
                            hash_password(payload.password),
                            payload.is_staff,
                            payload.staff_role if payload.is_staff else None,
                            settings.temporary_password_ttl_hours,
                        ),
                    ).fetchone()
                    if row is None:
                        raise ConflictError("Nao foi possivel criar o usuario.")

                    if client_id is not None:
                        membership = conn.execute(
                            """
                            insert into app_core.client_users (client_id, user_id, roles)
                            values (%s, %s::uuid, %s::text[])
                            returning id::text
                            """,
                            (client_id, row["id"], list(payload.roles or ["viewer"])),
                        ).fetchone()
                        if membership and payload.allowed_screen_ids:
                            screen_rows = conn.execute(
                                "select id::text from app_core.screens where key = any(%s::text[])",
                                (payload.allowed_screen_ids,),
                            ).fetchall()
                            for screen in screen_rows:
                                conn.execute(
                                    """
                                    insert into app_core.client_screen_permissions (client_user_id, screen_id, access)
                                    values (%s::uuid, %s::uuid, 'read')
                                    on conflict (client_user_id, screen_id) do update set access = excluded.access
                                    """,
                                    (membership["id"], screen["id"]),
                                )
                    return row["id"]

        user_id = await self._run(operation)
        users = await self.list_managed_users()
        user = next((item for item in users if item.id == user_id), None)
        if user is None:
            raise NotFoundError("Usuario criado nao encontrado.")
        return user

    async def update_managed_user(self, user_id: str, payload: UpdateManagedUserRequest) -> ManagedUser:
        def operation() -> None:
            settings = get_settings()
            with self._connect() as conn:
                with conn.transaction():
                    target = conn.execute(
                        """
                        select u.id::text, u.is_staff, cu.id::text as client_user_id
                        from app_core.app_users u
                        left join app_core.client_users cu on cu.user_id = u.id and cu.status = 'active'
                        where u.id = %s::uuid
                        limit 1
                        """,
                        (user_id,),
                    ).fetchone()
                    if target is None:
                        raise NotFoundError("Usuario nao encontrado.")

                    updates: list[str] = []
                    params: list[Any] = []
                    if payload.name is not None:
                        updates.append("name = %s")
                        params.append(payload.name.strip())
                    if payload.password is not None:
                        updates.extend(
                            [
                                "password_hash = %s",
                                "must_change_password = true",
                                "temporary_password_expires_at = now() + make_interval(hours => %s)",
                                "password_reset_at = now()",
                                "credentials_version = credentials_version + 1",
                            ]
                        )
                        params.extend(
                            [hash_password(payload.password), settings.temporary_password_ttl_hours]
                        )
                    if payload.status is not None:
                        updates.append("status = %s")
                        params.append(payload.status)
                    if payload.staff_role is not None:
                        if not target["is_staff"]:
                            raise ConflictError("staffRole so pode ser alterado para usuario da equipe.")
                        updates.append("staff_role = %s")
                        params.append(payload.staff_role)
                    if updates:
                        params.append(user_id)
                        conn.execute(
                            f"update app_core.app_users set {', '.join(updates)} where id = %s::uuid",
                            params,
                        )

                    if target["client_user_id"]:
                        if payload.roles is not None:
                            conn.execute(
                                "update app_core.client_users set roles = %s::text[] where id = %s::uuid",
                                (list(payload.roles), target["client_user_id"]),
                            )
                        if payload.allowed_screen_ids is not None:
                            conn.execute(
                                "delete from app_core.client_screen_permissions where client_user_id = %s::uuid",
                                (target["client_user_id"],),
                            )
                            screen_rows = conn.execute(
                                "select id::text from app_core.screens where key = any(%s::text[])",
                                (payload.allowed_screen_ids,),
                            ).fetchall()
                            for screen in screen_rows:
                                conn.execute(
                                    """
                                    insert into app_core.client_screen_permissions (client_user_id, screen_id, access)
                                    values (%s::uuid, %s::uuid, 'read')
                                    on conflict (client_user_id, screen_id) do update set access = excluded.access
                                    """,
                                    (target["client_user_id"], screen["id"]),
                                )

        await self._run(operation)
        users = await self.list_managed_users()
        user = next((item for item in users if item.id == user_id), None)
        if user is None:
            raise NotFoundError("Usuario atualizado nao encontrado.")
        return user
