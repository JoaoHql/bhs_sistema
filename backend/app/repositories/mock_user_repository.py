from datetime import datetime

from app.core.authorization import ScreenAccess
from app.core.errors import BadRequestError, ConflictError, NotFoundError
from app.schemas.user import ManagedUser, ScreenPermissionInput


class MockUserRepository:
    users: dict[str, ManagedUser] = {}
    valid_screens = {"cli_bhs_demo": {"workspace-dados", "demo-vendas"}, "cli_gelobel": {"configuracoes", "simulador-combos"}}

    @classmethod
    def reset(cls) -> None:
        cls.users = {
            "usr_demo_admin": ManagedUser(id="usr_demo_admin", email="admin@bhs.demo", name="Administrador Demo", status="active", is_staff=False, client_id="cli_bhs_demo", client_slug="bhs-demo", roles=["admin"], allowed_screen_ids=["*"]),
            "usr_gelobel_admin": ManagedUser(id="usr_gelobel_admin", email="admin@gelobel.com.br", name="Administrador Gelobel", status="active", is_staff=False, client_id="cli_gelobel", client_slug="gelobel", roles=["admin"], allowed_screen_ids=["*"]),
        }

    def __init__(self) -> None:
        if not self.users:
            self.reset()

    @staticmethod
    def _client(slug: str) -> tuple[str, str] | None:
        return {"bhs-demo": ("cli_bhs_demo", "bhs-demo"), "acme-demo": ("cli_acme_demo", "acme-demo"), "gelobel": ("cli_gelobel", "gelobel")}.get(slug)

    def _email_available(self, email: str) -> None:
        if any(str(user.email).lower() == email.lower() for user in self.users.values()):
            raise ConflictError("E-mail indisponivel.")

    def _common(self, client_id: str, user_id: str) -> ManagedUser:
        user = self.users.get(user_id)
        if user is None or user.client_id != client_id or "admin" in user.roles:
            raise NotFoundError("Usuario nao encontrado no tenant do ator.")
        return user

    def _permissions(self, client_id: str, permissions: list[ScreenPermissionInput]) -> list[str]:
        keys = {item.screen_id for item in permissions}
        if not keys.issubset(self.valid_screens.get(client_id, set())):
            raise BadRequestError("Permissoes contem tela invalida para este tenant.")
        return sorted(item.screen_id for item in permissions if item.access is not ScreenAccess.NONE)

    @staticmethod
    def _effective_permissions(permissions: list[ScreenPermissionInput]) -> list[ScreenPermissionInput]:
        return sorted(
            (item for item in permissions if item.access is not ScreenAccess.NONE),
            key=lambda item: item.screen_id,
        )

    async def list_tenant_masters(self) -> list[ManagedUser]:
        return [user for user in self.users.values() if "admin" in user.roles and not user.is_staff]

    async def create_tenant_master(self, *, email: str, name: str, client_slug: str, password_hash: str, expires_at: datetime) -> ManagedUser:
        _ = password_hash, expires_at
        self._email_available(email)
        client = self._client(client_slug)
        if client is None:
            raise NotFoundError("Cliente nao encontrado ou inativo.")
        user = ManagedUser(id=f"usr_mock_{len(self.users)+1}", email=email, name=name, status="active", is_staff=False, client_id=client[0], client_slug=client[1], roles=["admin"], allowed_screen_ids=["*"], must_change_password=True)
        self.users[user.id] = user
        return user

    async def update_tenant_master(self, *, actor_id: str, target_user_id: str, name: str | None, status: str | None) -> ManagedUser:
        user = self.users.get(target_user_id)
        if user is None or "admin" not in user.roles:
            raise NotFoundError("MASTER nao encontrado.")
        if status == "inactive" and len([item for item in self.users.values() if item.client_id == user.client_id and item.status == "active" and "admin" in item.roles]) <= 1:
            raise ConflictError("O ultimo MASTER ativo do tenant nao pode ser desativado.")
        updated = user.model_copy(update={key: value for key, value in {"name": name, "status": status}.items() if value is not None})
        self.users[user.id] = updated
        return updated

    async def reset_tenant_master_password(self, *, actor_id: str, target_user_id: str, password_hash: str, expires_at: datetime) -> int:
        _ = actor_id, password_hash, expires_at
        user = self.users.get(target_user_id)
        if user is None or "admin" not in user.roles:
            raise NotFoundError("MASTER nao encontrado.")
        updated = user.model_copy(update={"must_change_password": True, "credentials_version": user.credentials_version + 1})
        self.users[user.id] = updated
        return updated.credentials_version

    async def delete_tenant_master(self, *, actor_id: str, target_user_id: str) -> None:
        if actor_id == target_user_id:
            raise ConflictError("Autoexclusao nao permitida.")
        user = self.users.get(target_user_id)
        if user is None or "admin" not in user.roles:
            raise NotFoundError("MASTER nao encontrado.")
        if len([item for item in self.users.values() if item.client_id == user.client_id and item.status == "active" and "admin" in item.roles]) <= 1:
            raise ConflictError("O ultimo MASTER ativo do tenant nao pode ser excluido.")
        del self.users[target_user_id]

    async def list_common_users(self, *, actor_id: str, actor_client_id: str) -> list[ManagedUser]:
        _ = actor_id
        return [user for user in self.users.values() if user.client_id == actor_client_id and "admin" not in user.roles]

    async def create_common_user(self, *, actor_id: str, actor_client_id: str, email: str, name: str, password_hash: str, expires_at: datetime, permissions: list[ScreenPermissionInput]) -> ManagedUser:
        _ = actor_id, password_hash, expires_at
        self._email_available(email)
        allowed = self._permissions(actor_client_id, permissions)
        slug_by_client = {"cli_bhs_demo": "bhs-demo", "cli_acme_demo": "acme-demo", "cli_gelobel": "gelobel"}
        slug = slug_by_client.get(actor_client_id)
        user = ManagedUser(id=f"usr_mock_{len(self.users)+1}", email=email, name=name, status="active", is_staff=False, client_id=actor_client_id, client_slug=slug, roles=["viewer"], allowed_screen_ids=allowed, permissions=self._effective_permissions(permissions), must_change_password=True)
        self.users[user.id] = user
        return user

    async def update_common_user(self, *, actor_id: str, actor_client_id: str, target_user_id: str, name: str | None, status: str | None) -> ManagedUser:
        _ = actor_id
        user = self._common(actor_client_id, target_user_id)
        updated = user.model_copy(update={key: value for key, value in {"name": name, "status": status}.items() if value is not None})
        self.users[user.id] = updated
        return updated

    async def reset_common_user_password(self, *, actor_id: str, actor_client_id: str, target_user_id: str, password_hash: str, expires_at: datetime) -> int:
        _ = actor_id, password_hash, expires_at
        user = self._common(actor_client_id, target_user_id)
        updated = user.model_copy(update={"must_change_password": True, "credentials_version": user.credentials_version + 1})
        self.users[user.id] = updated
        return updated.credentials_version

    async def replace_common_user_permissions(self, *, actor_id: str, actor_client_id: str, target_user_id: str, permissions: list[ScreenPermissionInput]) -> ManagedUser:
        _ = actor_id
        user = self._common(actor_client_id, target_user_id)
        updated = user.model_copy(update={"allowed_screen_ids": self._permissions(actor_client_id, permissions), "permissions": self._effective_permissions(permissions), "credentials_version": user.credentials_version + 1})
        self.users[user.id] = updated
        return updated

    async def delete_common_user(self, *, actor_id: str, actor_client_id: str, target_user_id: str) -> None:
        if actor_id == target_user_id:
            raise ConflictError("Autoexclusao nao permitida.")
        self._common(actor_client_id, target_user_id)
        del self.users[target_user_id]
