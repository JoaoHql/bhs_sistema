from fastapi import APIRouter, Depends

from app.dependencies.identity import get_internal_user
from app.dependencies.redis import get_redis_service, rate_limit_admin
from app.dependencies.services import get_version_service, get_audit_service
from app.schemas.config_version import (
    ConfigDraftRequest,
    ConfigVersionActionResponse,
    ConfigVersionListResponse,
)
from app.schemas.user import User
from app.services.version_service import VersionService
from app.services.audit_service import AuditService
from app.services.redis_service import RedisService
from app.core.errors import ApiError

router = APIRouter(prefix="/internal/clients/{client_slug}/versions", dependencies=[Depends(rate_limit_admin)])


@router.get("", response_model=ConfigVersionListResponse)
async def list_versions(
    client_slug: str,
    _: User = Depends(get_internal_user),
    service: VersionService = Depends(get_version_service),
) -> ConfigVersionListResponse:
    return ConfigVersionListResponse(versions=await service.list_versions(client_slug))


@router.post("/draft", response_model=ConfigVersionActionResponse, status_code=201)
async def create_draft(
    client_slug: str,
    payload: ConfigDraftRequest,
    user: User = Depends(get_internal_user),
    service: VersionService = Depends(get_version_service),
    audit: AuditService = Depends(get_audit_service),
    redis: RedisService = Depends(get_redis_service),
) -> ConfigVersionActionResponse:
    try:
        version = await service.create_draft(client_slug=client_slug, config=payload.config, user=user)
        await redis.invalidate_prefix(f"bhs:cache:tenant:{client_slug}:")
        await audit.log_action(
            actor_id=user.id,
            client_id=user.client_id,
            action="create_draft",
            resource_type="version",
            resource_id=version.id,
            status="success",
            metadata={"client_slug": client_slug, "version_num": version.version},
        )
        return ConfigVersionActionResponse(version=version)
    except ApiError as exc:
        await audit.log_action(
            actor_id=user.id,
            client_id=user.client_id,
            action="create_draft",
            resource_type="version",
            status="failed",
            metadata={"client_slug": client_slug, "error": exc.message},
        )
        raise exc


@router.post("/{version}/validate", response_model=ConfigVersionActionResponse)
async def validate_version(
    client_slug: str,
    version: int,
    user: User = Depends(get_internal_user),
    service: VersionService = Depends(get_version_service),
    audit: AuditService = Depends(get_audit_service),
    redis: RedisService = Depends(get_redis_service),
) -> ConfigVersionActionResponse:
    try:
        item, validation = await service.validate_version(client_slug=client_slug, version=version, user=user)
        await audit.log_action(
            actor_id=user.id,
            client_id=user.client_id,
            action="validate",
            resource_type="version",
            resource_id=item.id,
            status="success" if not validation.errors else "failed",
            metadata={"client_slug": client_slug, "version_num": version, "errors": validation.errors},
        )
        return ConfigVersionActionResponse(version=item, validation=validation)
    except ApiError as exc:
        await audit.log_action(
            actor_id=user.id,
            client_id=user.client_id,
            action="validate",
            resource_type="version",
            status="failed",
            metadata={"client_slug": client_slug, "version_num": version, "error": exc.message},
        )
        raise exc


@router.post("/{version}/publish", response_model=ConfigVersionActionResponse)
async def publish_version(
    client_slug: str,
    version: int,
    user: User = Depends(get_internal_user),
    service: VersionService = Depends(get_version_service),
    audit: AuditService = Depends(get_audit_service),
    redis: RedisService = Depends(get_redis_service),
) -> ConfigVersionActionResponse:
    try:
        item = await service.publish_version(client_slug=client_slug, version=version, user=user)
        await redis.invalidate_prefix(f"bhs:cache:tenant:{client_slug}:")
        await audit.log_action(
            actor_id=user.id,
            client_id=user.client_id,
            action="publish",
            resource_type="version",
            resource_id=item.id,
            status="success",
            metadata={"client_slug": client_slug, "version_num": version},
        )
        return ConfigVersionActionResponse(version=item)
    except ApiError as exc:
        await audit.log_action(
            actor_id=user.id,
            client_id=user.client_id,
            action="publish",
            resource_type="version",
            status="failed",
            metadata={"client_slug": client_slug, "version_num": version, "error": exc.message},
        )
        raise exc


@router.post("/{version}/rollback", response_model=ConfigVersionActionResponse)
async def rollback_version(
    client_slug: str,
    version: int,
    user: User = Depends(get_internal_user),
    service: VersionService = Depends(get_version_service),
    audit: AuditService = Depends(get_audit_service),
    redis: RedisService = Depends(get_redis_service),
) -> ConfigVersionActionResponse:
    try:
        item = await service.rollback_version(client_slug=client_slug, version=version, user=user)
        await redis.invalidate_prefix(f"bhs:cache:tenant:{client_slug}:")
        await audit.log_action(
            actor_id=user.id,
            client_id=user.client_id,
            action="rollback",
            resource_type="version",
            resource_id=item.id,
            status="success",
            metadata={"client_slug": client_slug, "version_num": version},
        )
        return ConfigVersionActionResponse(version=item)
    except ApiError as exc:
        await audit.log_action(
            actor_id=user.id,
            client_id=user.client_id,
            action="rollback",
            resource_type="version",
            status="failed",
            metadata={"client_slug": client_slug, "version_num": version, "error": exc.message},
        )
        raise exc


@router.post("/{version}/archive", response_model=ConfigVersionActionResponse)
async def archive_version(
    client_slug: str,
    version: int,
    user: User = Depends(get_internal_user),
    service: VersionService = Depends(get_version_service),
    audit: AuditService = Depends(get_audit_service),
    redis: RedisService = Depends(get_redis_service),
) -> ConfigVersionActionResponse:
    try:
        item = await service.archive_version(client_slug=client_slug, version=version, user=user)
        await redis.invalidate_prefix(f"bhs:cache:tenant:{client_slug}:")
        await audit.log_action(
            actor_id=user.id,
            client_id=user.client_id,
            action="archive",
            resource_type="version",
            resource_id=item.id,
            status="success",
            metadata={"client_slug": client_slug, "version_num": version},
        )
        return ConfigVersionActionResponse(version=item)
    except ApiError as exc:
        await audit.log_action(
            actor_id=user.id,
            client_id=user.client_id,
            action="archive",
            resource_type="version",
            status="failed",
            metadata={"client_slug": client_slug, "version_num": version, "error": exc.message},
        )
        raise exc
