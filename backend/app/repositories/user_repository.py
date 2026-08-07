import asyncio
from collections.abc import Callable
from datetime import datetime
from typing import Any, Protocol, TypeVar
from uuid import UUID

import psycopg
from psycopg.errors import UniqueViolation

from app.core.authorization import ScreenAccess
from app.core.db import get_connection_pool
from app.core.errors import BadRequestError, ConflictError, NotFoundError
from app.schemas.user import ManagedUser, ScreenPermissionInput


T = TypeVar("T")

LIST_COMMON_USERS_SQL = """
select target_user.id::text, target_user.email, target_user.name, target_user.status,
       false as is_staff, null::text as staff_role, client.id::text as client_id,
       client.slug as client_slug, target_membership.roles,
       target_user.must_change_password, target_user.credentials_version,
       coalesce(array_agg(screen.key order by screen.key)
         filter (where permission.access in ('read', 'write')), array[]::text[]) as allowed_screen_ids,
       coalesce(jsonb_agg(jsonb_build_object('screenId', screen.key, 'access', permission.access)
         order by screen.key) filter (where permission.access in ('read', 'write')), '[]'::jsonb) as permissions
from app_core.client_users actor_membership
join app_core.client_users target_membership on target_membership.client_id = actor_membership.client_id
join app_core.app_users target_user on target_user.id = target_membership.user_id
join app_core.clients client on client.id = actor_membership.client_id
left join app_core.client_screen_permissions permission on permission.client_user_id = target_membership.id
left join app_core.screens screen on screen.id = permission.screen_id
where actor_membership.user_id = %s::uuid
  and actor_membership.client_id = %s::uuid
  and actor_membership.status = 'active'
  and 'admin' = any(actor_membership.roles)
  and not ('admin' = any(target_membership.roles))
group by target_user.id, target_membership.roles, client.id, client.slug
order by target_user.name, target_user.email
"""

RESET_COMMON_USER_PASSWORD_SQL = """
update app_core.app_users as target_user
set password_hash = %s, must_change_password = true, temporary_password_expires_at = %s,
    password_reset_at = now(), password_reset_by = %s::uuid,
    credentials_version = credentials_version + 1, updated_at = now()
from app_core.client_users actor_membership, app_core.client_users target_membership
where actor_membership.user_id = %s::uuid
  and actor_membership.client_id = %s::uuid
  and actor_membership.status = 'active'
  and 'admin' = any(actor_membership.roles)
  and target_membership.client_id = actor_membership.client_id
  and target_membership.user_id = target_user.id
  and target_membership.user_id = %s::uuid
  and not ('admin' = any(target_membership.roles))
returning target_user.credentials_version
"""


class UserRepositoryProtocol(Protocol):
    async def list_tenant_masters(self) -> list[ManagedUser]: ...
    async def create_tenant_master(self, *, email: str, name: str, client_slug: str, password_hash: str, expires_at: datetime) -> ManagedUser: ...
    async def update_tenant_master(self, *, actor_id: str, target_user_id: str, name: str | None, status: str | None) -> ManagedUser: ...
    async def reset_tenant_master_password(self, *, actor_id: str, target_user_id: str, password_hash: str, expires_at: datetime) -> int: ...
    async def delete_tenant_master(self, *, actor_id: str, target_user_id: str) -> None: ...
    async def list_common_users(self, *, actor_id: str, actor_client_id: str) -> list[ManagedUser]: ...
    async def create_common_user(self, *, actor_id: str, actor_client_id: str, email: str, name: str, password_hash: str, expires_at: datetime, permissions: list[ScreenPermissionInput]) -> ManagedUser: ...
    async def update_common_user(self, *, actor_id: str, actor_client_id: str, target_user_id: str, name: str | None, status: str | None) -> ManagedUser: ...
    async def reset_common_user_password(self, *, actor_id: str, actor_client_id: str, target_user_id: str, password_hash: str, expires_at: datetime) -> int: ...
    async def replace_common_user_permissions(self, *, actor_id: str, actor_client_id: str, target_user_id: str, permissions: list[ScreenPermissionInput]) -> ManagedUser: ...
    async def delete_common_user(self, *, actor_id: str, actor_client_id: str, target_user_id: str) -> None: ...


class UserRepository:
    """Persistencia com autorizacao tenant aplicada nos predicados SQL."""

    def __init__(self, database_url: str) -> None:
        self.pool = get_connection_pool(database_url)

    async def _run(self, operation: Callable[[], T]) -> T:
        try:
            return await asyncio.to_thread(operation)
        except UniqueViolation as exc:
            raise ConflictError("E-mail indisponivel.") from exc

    def _connect(self) -> Any:
        return self.pool.connection()

    @staticmethod
    def _require_uuid(value: str, message: str) -> None:
        try:
            UUID(value)
        except ValueError as exc:
            raise NotFoundError(message) from exc

    @staticmethod
    def _master_select(where: str) -> str:
        return f"""
        select u.id::text, u.email, u.name, u.status, false as is_staff,
               null::text as staff_role, c.id::text as client_id, c.slug as client_slug,
               cu.roles, array[]::text[] as allowed_screen_ids,
               u.must_change_password, u.credentials_version
        from app_core.app_users u
        join app_core.client_users cu on cu.user_id = u.id
        join app_core.clients c on c.id = cu.client_id
        where not u.is_staff and 'admin' = any(cu.roles) and {where}
        """

    def _get_master(self, conn: psycopg.Connection, user_id: str) -> ManagedUser:
        row = conn.execute(self._master_select("u.id = %s::uuid"), (user_id,)).fetchone()
        if row is None:
            raise NotFoundError("MASTER nao encontrado.")
        return ManagedUser.model_validate(row)

    def _get_common(self, conn: psycopg.Connection, actor_id: str, client_id: str, user_id: str) -> ManagedUser:
        rows = conn.execute(LIST_COMMON_USERS_SQL, (actor_id, client_id)).fetchall()
        row = next((item for item in rows if item["id"] == user_id), None)
        if row is None:
            raise NotFoundError("Usuario nao encontrado no tenant do ator.")
        return ManagedUser.model_validate(row)

    @staticmethod
    def _actor_membership(conn: psycopg.Connection, actor_id: str, client_id: str) -> dict[str, Any]:
        row = conn.execute(
            """select cu.id::text, cu.client_id::text from app_core.client_users cu
               join app_core.app_users u on u.id = cu.user_id and u.status = 'active'
               join app_core.clients c on c.id = cu.client_id and c.status = 'active'
               where cu.user_id = %s::uuid and cu.client_id = %s::uuid
                 and cu.status = 'active' and 'admin' = any(cu.roles) for update""",
            (actor_id, client_id),
        ).fetchone()
        if row is None:
            raise NotFoundError("Recurso nao encontrado no escopo do ator.")
        return row

    @staticmethod
    def _target_common(conn: psycopg.Connection, client_id: str, user_id: str) -> dict[str, Any]:
        row = conn.execute(
            """select cu.id::text from app_core.client_users cu
               where cu.client_id = %s::uuid and cu.user_id = %s::uuid
                 and not ('admin' = any(cu.roles)) for update""",
            (client_id, user_id),
        ).fetchone()
        if row is None:
            raise NotFoundError("Usuario nao encontrado no tenant do ator.")
        return row

    @staticmethod
    def _clear_user_references(conn: psycopg.Connection, user_id: str) -> None:
        """Preserva registros operacionais/análise e remove apenas a identidade excluída."""
        conn.execute("update app_core.published_versions set published_by = null, validated_by = null where published_by = %s::uuid or validated_by = %s::uuid", (user_id, user_id))
        conn.execute("update app_core.visual_templates set created_by = null where created_by = %s::uuid", (user_id,))
        conn.execute("update app_core.tenant_template_bindings set created_by = null, validated_by = null where created_by = %s::uuid or validated_by = %s::uuid", (user_id, user_id))
        conn.execute("update app_core.screen_instances set created_by = null where created_by = %s::uuid", (user_id,))

    @staticmethod
    def _replace_permissions(conn: psycopg.Connection, membership_id: str, client_id: str, permissions: list[ScreenPermissionInput]) -> None:
        keys = [item.screen_id for item in permissions]
        if keys:
            rows = conn.execute(
                """select s.id::text, s.key from app_core.screens s
                   where s.key = any(%s::text[]) and (
                     exists (select 1 from app_core.screen_instances si
                             where si.client_id = %s::uuid and si.status = 'published' and si.screen_key = s.key)
                     or exists (select 1 from app_core.published_versions pv,
                                jsonb_array_elements(coalesce(pv.config->'screens', '[]'::jsonb)) published_screen
                                where pv.client_id = %s::uuid and pv.status = 'published'
                                  and published_screen->>'id' = s.key))""",
                (keys, client_id, client_id),
            ).fetchall()
            screen_ids = {row["key"]: row["id"] for row in rows}
            if set(keys) != set(screen_ids):
                raise BadRequestError("Permissoes contem tela invalida para este tenant.")
        else:
            screen_ids = {}
        conn.execute("delete from app_core.client_screen_permissions where client_user_id = %s::uuid", (membership_id,))
        for item in permissions:
            if item.access is ScreenAccess.NONE:
                continue
            conn.execute(
                """insert into app_core.client_screen_permissions (client_user_id, screen_id, access)
                   values (%s::uuid, %s::uuid, %s)""",
                (membership_id, screen_ids[item.screen_id], item.access.value),
            )

    async def list_tenant_masters(self) -> list[ManagedUser]:
        def operation() -> list[ManagedUser]:
            with self._connect() as conn:
                rows = conn.execute(self._master_select("true") + " order by c.slug, u.name").fetchall()
                return [ManagedUser.model_validate(row) for row in rows]
        return await self._run(operation)

    async def create_tenant_master(self, *, email: str, name: str, client_slug: str, password_hash: str, expires_at: datetime) -> ManagedUser:
        def operation() -> ManagedUser:
            with self._connect() as conn, conn.transaction():
                if conn.execute("select 1 from app_core.app_users where lower(email) = lower(%s)", (email,)).fetchone():
                    raise ConflictError("E-mail indisponivel.")
                client = conn.execute("select id from app_core.clients where slug = %s and status = 'active' for update", (client_slug,)).fetchone()
                if client is None:
                    raise NotFoundError("Cliente nao encontrado ou inativo.")
                user = conn.execute(
                    """insert into app_core.app_users
                       (email, name, password_hash, is_staff, must_change_password, temporary_password_expires_at)
                       values (lower(%s), %s, %s, false, true, %s) returning id::text""",
                    (email, name.strip(), password_hash, expires_at),
                ).fetchone()
                conn.execute("insert into app_core.client_users (client_id, user_id, roles) values (%s, %s::uuid, array['admin']::text[])", (client["id"], user["id"]))
                return self._get_master(conn, user["id"])
        return await self._run(operation)

    async def update_tenant_master(self, *, actor_id: str, target_user_id: str, name: str | None, status: str | None) -> ManagedUser:
        self._require_uuid(target_user_id, "MASTER nao encontrado.")
        if actor_id == target_user_id and status == "inactive":
            raise ConflictError("Autodesativacao nao permitida.")
        def operation() -> ManagedUser:
            with self._connect() as conn, conn.transaction():
                target = conn.execute(self._master_select("u.id = %s::uuid") + " for update of u, cu", (target_user_id,)).fetchone()
                if target is None:
                    raise NotFoundError("MASTER nao encontrado.")
                if status == "inactive":
                    active = conn.execute(
                        """select u.id from app_core.client_users cu join app_core.app_users u on u.id = cu.user_id
                           where cu.client_id = %s::uuid and cu.status = 'active' and u.status = 'active'
                             and 'admin' = any(cu.roles) for update""", (target["client_id"],)
                    ).fetchall()
                    if len(active) <= 1:
                        raise ConflictError("O ultimo MASTER ativo do tenant nao pode ser desativado.")
                conn.execute(
                    """update app_core.app_users set name = coalesce(%s, name), status = coalesce(%s, status),
                       credentials_version = credentials_version + case when %s = 'inactive' then 1 else 0 end,
                       updated_at = now() where id = %s::uuid""",
                    (name.strip() if name else None, status, status, target_user_id),
                )
                return self._get_master(conn, target_user_id)
        return await self._run(operation)

    async def reset_tenant_master_password(self, *, actor_id: str, target_user_id: str, password_hash: str, expires_at: datetime) -> int:
        self._require_uuid(target_user_id, "MASTER nao encontrado.")
        def operation() -> int:
            with self._connect() as conn, conn.transaction():
                row = conn.execute(
                    """update app_core.app_users u set password_hash=%s, must_change_password=true,
                       temporary_password_expires_at=%s, password_reset_at=now(), password_reset_by=%s::uuid,
                       credentials_version=credentials_version+1, updated_at=now()
                       where u.id=%s::uuid and not u.is_staff and exists
                         (select 1 from app_core.client_users cu where cu.user_id=u.id and 'admin'=any(cu.roles))
                       returning credentials_version""", (password_hash, expires_at, actor_id, target_user_id)
                ).fetchone()
                if row is None:
                    raise NotFoundError("MASTER nao encontrado.")
                return row["credentials_version"]
        return await self._run(operation)

    async def delete_tenant_master(self, *, actor_id: str, target_user_id: str) -> None:
        self._require_uuid(target_user_id, "MASTER nao encontrado.")
        if actor_id == target_user_id:
            raise ConflictError("Autoexclusao nao permitida.")
        def operation() -> None:
            with self._connect() as conn, conn.transaction():
                target = conn.execute(self._master_select("u.id = %s::uuid") + " for update of u, cu", (target_user_id,)).fetchone()
                if target is None:
                    raise NotFoundError("MASTER nao encontrado.")
                active = conn.execute(
                    """select u.id from app_core.client_users cu join app_core.app_users u on u.id = cu.user_id
                       where cu.client_id = %s::uuid and cu.status = 'active' and u.status = 'active'
                         and 'admin' = any(cu.roles) for update""", (target["client_id"],)
                ).fetchall()
                if len(active) <= 1:
                    raise ConflictError("O ultimo MASTER ativo do tenant nao pode ser excluido.")
                self._clear_user_references(conn, target_user_id)
                deleted = conn.execute("delete from app_core.app_users where id = %s::uuid returning id", (target_user_id,)).fetchone()
                if deleted is None:
                    raise NotFoundError("MASTER nao encontrado.")
        await self._run(operation)

    async def list_common_users(self, *, actor_id: str, actor_client_id: str) -> list[ManagedUser]:
        def operation() -> list[ManagedUser]:
            with self._connect() as conn:
                return [ManagedUser.model_validate(row) for row in conn.execute(LIST_COMMON_USERS_SQL, (actor_id, actor_client_id)).fetchall()]
        return await self._run(operation)

    async def create_common_user(self, *, actor_id: str, actor_client_id: str, email: str, name: str, password_hash: str, expires_at: datetime, permissions: list[ScreenPermissionInput]) -> ManagedUser:
        def operation() -> ManagedUser:
            with self._connect() as conn, conn.transaction():
                self._actor_membership(conn, actor_id, actor_client_id)
                if conn.execute("select 1 from app_core.app_users where lower(email)=lower(%s)", (email,)).fetchone():
                    raise ConflictError("E-mail indisponivel.")
                user = conn.execute(
                    """insert into app_core.app_users
                       (email,name,password_hash,is_staff,must_change_password,temporary_password_expires_at)
                       values(lower(%s),%s,%s,false,true,%s) returning id::text""",
                    (email, name.strip(), password_hash, expires_at),
                ).fetchone()
                membership = conn.execute(
                    """insert into app_core.client_users(client_id,user_id,roles)
                       values(%s::uuid,%s::uuid,array['viewer']::text[]) returning id::text""",
                    (actor_client_id, user["id"]),
                ).fetchone()
                self._replace_permissions(conn, membership["id"], actor_client_id, permissions)
                return self._get_common(conn, actor_id, actor_client_id, user["id"])
        return await self._run(operation)

    async def update_common_user(self, *, actor_id: str, actor_client_id: str, target_user_id: str, name: str | None, status: str | None) -> ManagedUser:
        self._require_uuid(target_user_id, "Usuario nao encontrado no tenant do ator.")
        if actor_id == target_user_id and status == "inactive":
            raise ConflictError("Autodesativacao nao permitida.")
        def operation() -> ManagedUser:
            with self._connect() as conn, conn.transaction():
                self._actor_membership(conn, actor_id, actor_client_id)
                membership = self._target_common(conn, actor_client_id, target_user_id)
                conn.execute("update app_core.client_users set status=coalesce(%s,status) where id=%s::uuid", (status, membership["id"]))
                conn.execute(
                    """update app_core.app_users set name=coalesce(%s,name), status=coalesce(%s,status),
                       credentials_version=credentials_version+case when %s='inactive' then 1 else 0 end,
                       updated_at=now() where id=%s::uuid""",
                    (name.strip() if name else None, status, status, target_user_id),
                )
                return self._get_common(conn, actor_id, actor_client_id, target_user_id)
        return await self._run(operation)

    async def reset_common_user_password(self, *, actor_id: str, actor_client_id: str, target_user_id: str, password_hash: str, expires_at: datetime) -> int:
        self._require_uuid(target_user_id, "Usuario nao encontrado no tenant do ator.")
        def operation() -> int:
            with self._connect() as conn, conn.transaction():
                row = conn.execute(RESET_COMMON_USER_PASSWORD_SQL, (password_hash, expires_at, actor_id, actor_id, actor_client_id, target_user_id)).fetchone()
                if row is None:
                    raise NotFoundError("Usuario nao encontrado no tenant do ator.")
                return row["credentials_version"]
        return await self._run(operation)

    async def replace_common_user_permissions(self, *, actor_id: str, actor_client_id: str, target_user_id: str, permissions: list[ScreenPermissionInput]) -> ManagedUser:
        self._require_uuid(target_user_id, "Usuario nao encontrado no tenant do ator.")
        def operation() -> ManagedUser:
            with self._connect() as conn, conn.transaction():
                self._actor_membership(conn, actor_id, actor_client_id)
                target = self._target_common(conn, actor_client_id, target_user_id)
                self._replace_permissions(conn, target["id"], actor_client_id, permissions)
                conn.execute("update app_core.app_users set credentials_version=credentials_version+1, updated_at=now() where id=%s::uuid", (target_user_id,))
                return self._get_common(conn, actor_id, actor_client_id, target_user_id)
        return await self._run(operation)

    async def delete_common_user(self, *, actor_id: str, actor_client_id: str, target_user_id: str) -> None:
        self._require_uuid(target_user_id, "Usuario nao encontrado no tenant do ator.")
        if actor_id == target_user_id:
            raise ConflictError("Autoexclusao nao permitida.")
        def operation() -> None:
            with self._connect() as conn, conn.transaction():
                self._actor_membership(conn, actor_id, actor_client_id)
                self._target_common(conn, actor_client_id, target_user_id)
                self._clear_user_references(conn, target_user_id)
                deleted = conn.execute("delete from app_core.app_users where id = %s::uuid returning id", (target_user_id,)).fetchone()
                if deleted is None:
                    raise NotFoundError("Usuario nao encontrado no tenant do ator.")
        await self._run(operation)
