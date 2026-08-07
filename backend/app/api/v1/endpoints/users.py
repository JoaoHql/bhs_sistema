from fastapi import APIRouter, Depends, Response, status

from app.core.errors import ConflictError
from app.dependencies.identity import get_team_master, get_tenant_master
from app.dependencies.services import get_audit_service, get_user_management_service
from app.schemas.user import (
    CreateManagedUserRequest,
    ManagedUser,
    OneTimePasswordResponse,
    ProvisionedUserResponse,
    ReplaceScreenPermissionsRequest,
    ResetPasswordRequest,
    TenantMasterCreateRequest,
    TenantMasterUpdateRequest,
    TenantUserCreateRequest,
    TenantUserUpdateRequest,
    UpdateManagedUserRequest,
    User,
)
from app.services.user_management_service import UserManagementService
from app.services.audit_service import AuditService


router = APIRouter(prefix="/internal/masters", tags=["tenant-masters"])
tenant_router = APIRouter(prefix="/tenant/users", tags=["tenant-users"])
legacy_router = APIRouter(prefix="/internal/users", tags=["internal-users"])


def no_store(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"


async def audit_user_action(
    audit: AuditService, *, actor: User, target: ManagedUser | None,
    action: str, target_id: str | None = None,
) -> None:
    await audit.log_action(
        actor_id=actor.id,
        client_id=(target.client_id if target and target.client_id else actor.client_id),
        action=action,
        resource_type="user",
        resource_id=target.id if target else target_id,
        status="success",
        metadata={"actor_level": actor.level.value, "target_level": target.level.value if target else None},
    )


@router.get("", response_model=list[ManagedUser])
async def list_tenant_masters(
    _: User = Depends(get_team_master),
    service: UserManagementService = Depends(get_user_management_service),
) -> list[ManagedUser]:
    return await service.list_tenant_masters()


@router.post("", response_model=ProvisionedUserResponse, status_code=status.HTTP_201_CREATED)
async def create_tenant_master(
    payload: TenantMasterCreateRequest,
    response: Response,
    _: User = Depends(get_team_master),
    service: UserManagementService = Depends(get_user_management_service),
    audit: AuditService = Depends(get_audit_service),
) -> ProvisionedUserResponse:
    no_store(response)
    created = await service.create_tenant_master(payload)
    await audit_user_action(audit, actor=_, target=created.user, action="user.master.created")
    return created


@router.patch("/{user_id}", response_model=ManagedUser)
async def update_tenant_master(
    user_id: str,
    payload: TenantMasterUpdateRequest,
    actor: User = Depends(get_team_master),
    service: UserManagementService = Depends(get_user_management_service),
    audit: AuditService = Depends(get_audit_service),
) -> ManagedUser:
    updated = await service.update_tenant_master(actor, user_id, payload)
    action = "user.master.status_changed" if payload.status is not None else "user.master.updated"
    await audit_user_action(audit, actor=actor, target=updated, action=action)
    return updated


@router.post("/{user_id}/reset-password", response_model=OneTimePasswordResponse)
async def reset_tenant_master_password(
    user_id: str,
    payload: ResetPasswordRequest,
    response: Response,
    actor: User = Depends(get_team_master),
    service: UserManagementService = Depends(get_user_management_service),
    audit: AuditService = Depends(get_audit_service),
) -> OneTimePasswordResponse:
    no_store(response)
    target = next((item for item in await service.list_tenant_masters() if item.id == user_id), None)
    reset = await service.reset_tenant_master_password(actor, user_id, payload)
    await audit_user_action(audit, actor=actor, target=target, target_id=user_id, action="user.master.password_reset")
    return reset


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tenant_master(
    user_id: str,
    actor: User = Depends(get_team_master),
    service: UserManagementService = Depends(get_user_management_service),
    audit: AuditService = Depends(get_audit_service),
) -> Response:
    target = next((item for item in await service.list_tenant_masters() if item.id == user_id), None)
    await service.delete_tenant_master(actor, user_id)
    await audit_user_action(audit, actor=actor, target=target, target_id=user_id, action="user.master.deleted")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@tenant_router.get("", response_model=list[ManagedUser])
async def list_common_users(
    actor: User = Depends(get_tenant_master),
    service: UserManagementService = Depends(get_user_management_service),
) -> list[ManagedUser]:
    return await service.list_common_users(actor)


@tenant_router.post("", response_model=ProvisionedUserResponse, status_code=status.HTTP_201_CREATED)
async def create_common_user(
    payload: TenantUserCreateRequest,
    response: Response,
    actor: User = Depends(get_tenant_master),
    service: UserManagementService = Depends(get_user_management_service),
    audit: AuditService = Depends(get_audit_service),
) -> ProvisionedUserResponse:
    no_store(response)
    created = await service.create_common_user(actor, payload)
    await audit_user_action(audit, actor=actor, target=created.user, action="user.common.created")
    return created


@tenant_router.patch("/{user_id}", response_model=ManagedUser)
async def update_common_user(
    user_id: str,
    payload: TenantUserUpdateRequest,
    actor: User = Depends(get_tenant_master),
    service: UserManagementService = Depends(get_user_management_service),
    audit: AuditService = Depends(get_audit_service),
) -> ManagedUser:
    updated = await service.update_common_user(actor, user_id, payload)
    action = "user.common.status_changed" if payload.status is not None else "user.common.updated"
    await audit_user_action(audit, actor=actor, target=updated, action=action)
    return updated


@tenant_router.post("/{user_id}/reset-password", response_model=OneTimePasswordResponse)
async def reset_common_user_password(
    user_id: str,
    payload: ResetPasswordRequest,
    response: Response,
    actor: User = Depends(get_tenant_master),
    service: UserManagementService = Depends(get_user_management_service),
    audit: AuditService = Depends(get_audit_service),
) -> OneTimePasswordResponse:
    no_store(response)
    reset = await service.reset_common_user_password(actor, user_id, payload)
    await audit_user_action(audit, actor=actor, target=None, target_id=user_id, action="user.common.password_reset")
    return reset


@tenant_router.put("/{user_id}/permissions", response_model=ManagedUser)
async def replace_common_user_permissions(
    user_id: str,
    payload: ReplaceScreenPermissionsRequest,
    actor: User = Depends(get_tenant_master),
    service: UserManagementService = Depends(get_user_management_service),
    audit: AuditService = Depends(get_audit_service),
) -> ManagedUser:
    updated = await service.replace_common_user_permissions(actor, user_id, payload)
    await audit_user_action(audit, actor=actor, target=updated, action="user.common.permissions_replaced")
    return updated


@tenant_router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_common_user(
    user_id: str,
    actor: User = Depends(get_tenant_master),
    service: UserManagementService = Depends(get_user_management_service),
    audit: AuditService = Depends(get_audit_service),
) -> Response:
    target = next((item for item in await service.list_common_users(actor) if item.id == user_id), None)
    await service.delete_common_user(actor, user_id)
    await audit_user_action(audit, actor=actor, target=target, target_id=user_id, action="user.common.deleted")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@legacy_router.get("", response_model=list[ManagedUser], deprecated=True)
async def legacy_list_users(
    _: User = Depends(get_team_master),
    service: UserManagementService = Depends(get_user_management_service),
) -> list[ManagedUser]:
    return await service.list_tenant_masters()


@legacy_router.post("", response_model=ManagedUser, status_code=status.HTTP_201_CREATED, deprecated=True)
async def legacy_create_master(
    payload: CreateManagedUserRequest,
    actor: User = Depends(get_team_master),
    service: UserManagementService = Depends(get_user_management_service),
) -> ManagedUser:
    if payload.is_staff or payload.roles != ["admin"] or not payload.client_slug or payload.allowed_screen_ids:
        raise ConflictError("A EQUIPE pode criar somente MASTERs de tenant.")
    created = await service.create_tenant_master(TenantMasterCreateRequest(
        email=payload.email, name=payload.name, clientSlug=payload.client_slug,
        temporaryPassword={"mode": "defined", "password": payload.password},
    ))
    return created.user


@legacy_router.patch("/{user_id}", response_model=ManagedUser, deprecated=True)
async def legacy_update_master(
    user_id: str,
    payload: UpdateManagedUserRequest,
    actor: User = Depends(get_team_master),
    service: UserManagementService = Depends(get_user_management_service),
) -> ManagedUser:
    if payload.password is not None or payload.roles is not None or payload.allowed_screen_ids is not None or payload.staff_role is not None:
        raise ConflictError("Endpoint legado permite somente nome e status de MASTER.")
    return await service.update_tenant_master(actor, user_id, TenantMasterUpdateRequest(name=payload.name, status=payload.status))
