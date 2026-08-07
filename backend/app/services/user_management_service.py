from app.core.errors import BadRequestError
from app.repositories.user_repository import UserRepositoryProtocol
from app.schemas.user import (
    ManagedUser,
    OneTimePasswordResponse,
    ProvisionedUserResponse,
    ReplaceScreenPermissionsRequest,
    ResetPasswordRequest,
    TenantMasterCreateRequest,
    TenantMasterUpdateRequest,
    TenantUserCreateRequest,
    TenantUserUpdateRequest,
    User,
)
from app.services.credential_service import CredentialService


class UserManagementService:
    def __init__(self, repository: UserRepositoryProtocol, credentials: CredentialService) -> None:
        self.repository = repository
        self.credentials = credentials

    @staticmethod
    def _defined_password(request: ResetPasswordRequest | object) -> str | None:
        temporary = request if isinstance(request, ResetPasswordRequest) else getattr(request, "temporary_password")
        return temporary.password if temporary.mode == "defined" else None

    @staticmethod
    def _validate_permissions(payload: TenantUserCreateRequest | ReplaceScreenPermissionsRequest) -> None:
        keys = [permission.screen_id for permission in payload.permissions]
        if len(keys) != len(set(keys)):
            raise BadRequestError("Cada tela deve aparecer apenas uma vez.")

    async def list_tenant_masters(self) -> list[ManagedUser]:
        return await self.repository.list_tenant_masters()

    async def create_tenant_master(self, payload: TenantMasterCreateRequest) -> ProvisionedUserResponse:
        credential = self.credentials.issue_temporary(self._defined_password(payload))
        user = await self.repository.create_tenant_master(
            email=str(payload.email), name=payload.name, client_slug=payload.client_slug,
            password_hash=credential.password_hash, expires_at=credential.expires_at,
        )
        return ProvisionedUserResponse(user=user, temporaryPassword=credential.plaintext, expiresAt=credential.expires_at)

    async def update_tenant_master(self, actor: User, target_id: str, payload: TenantMasterUpdateRequest) -> ManagedUser:
        return await self.repository.update_tenant_master(
            actor_id=actor.id, target_user_id=target_id, name=payload.name, status=payload.status,
        )

    async def reset_tenant_master_password(self, actor: User, target_id: str, payload: ResetPasswordRequest) -> OneTimePasswordResponse:
        credential = self.credentials.issue_temporary(self._defined_password(payload))
        await self.repository.reset_tenant_master_password(
            actor_id=actor.id, target_user_id=target_id,
            password_hash=credential.password_hash, expires_at=credential.expires_at,
        )
        return OneTimePasswordResponse(temporaryPassword=credential.plaintext, expiresAt=credential.expires_at)

    async def delete_tenant_master(self, actor: User, target_id: str) -> None:
        await self.repository.delete_tenant_master(actor_id=actor.id, target_user_id=target_id)

    async def list_common_users(self, actor: User) -> list[ManagedUser]:
        return await self.repository.list_common_users(actor_id=actor.id, actor_client_id=actor.client_id or "")

    async def create_common_user(self, actor: User, payload: TenantUserCreateRequest) -> ProvisionedUserResponse:
        self._validate_permissions(payload)
        credential = self.credentials.issue_temporary(self._defined_password(payload))
        user = await self.repository.create_common_user(
            actor_id=actor.id, actor_client_id=actor.client_id or "", email=str(payload.email),
            name=payload.name, password_hash=credential.password_hash, expires_at=credential.expires_at,
            permissions=payload.permissions,
        )
        return ProvisionedUserResponse(user=user, temporaryPassword=credential.plaintext, expiresAt=credential.expires_at)

    async def update_common_user(self, actor: User, target_id: str, payload: TenantUserUpdateRequest) -> ManagedUser:
        return await self.repository.update_common_user(
            actor_id=actor.id, actor_client_id=actor.client_id or "", target_user_id=target_id,
            name=payload.name, status=payload.status,
        )

    async def reset_common_user_password(self, actor: User, target_id: str, payload: ResetPasswordRequest) -> OneTimePasswordResponse:
        credential = self.credentials.issue_temporary(self._defined_password(payload))
        await self.repository.reset_common_user_password(
            actor_id=actor.id, actor_client_id=actor.client_id or "", target_user_id=target_id,
            password_hash=credential.password_hash, expires_at=credential.expires_at,
        )
        return OneTimePasswordResponse(temporaryPassword=credential.plaintext, expiresAt=credential.expires_at)

    async def replace_common_user_permissions(self, actor: User, target_id: str, payload: ReplaceScreenPermissionsRequest) -> ManagedUser:
        self._validate_permissions(payload)
        return await self.repository.replace_common_user_permissions(
            actor_id=actor.id, actor_client_id=actor.client_id or "", target_user_id=target_id,
            permissions=payload.permissions,
        )

    async def delete_common_user(self, actor: User, target_id: str) -> None:
        await self.repository.delete_common_user(
            actor_id=actor.id, actor_client_id=actor.client_id or "", target_user_id=target_id,
        )
