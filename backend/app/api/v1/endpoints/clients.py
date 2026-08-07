from fastapi import APIRouter, Depends

from app.dependencies.identity import get_internal_user
from app.dependencies.redis import get_redis_service, rate_limit_admin
from app.dependencies.services import get_audit_service, get_binding_service, get_repository, get_screen_composer_service
from app.core.errors import NotFoundError
from app.repositories.config_repository_protocol import ConfigRepositoryProtocol
from app.schemas.client import Client
from app.schemas.client_visibility import ClientVisibilityResponse, VisibilityUpdateRequest
from app.schemas.data_source_field import DataSourceFieldUpsertRequest
from app.schemas.tenant_catalog import DataSourceCreateRequest, TenantCatalog
from app.schemas.published_version import PublishedVersion
from app.schemas.template_contract import (
    ScreenInstance,
    ScreenInstanceUpsertRequest,
    TenantTemplateBinding,
    TenantTemplateBindingUpsertRequest,
    VisualTemplate,
    VisualTemplateUpsertRequest,
)
from app.schemas.user import User
from app.services.binding_service import BindingService
from app.services.screen_composer_service import ScreenComposerService
from app.services.audit_service import AuditService
from app.services.redis_service import RedisService

router = APIRouter(prefix="/internal/clients", dependencies=[Depends(rate_limit_admin)])
templates_router = APIRouter(prefix="/internal/templates", dependencies=[Depends(rate_limit_admin)])


@templates_router.get("", response_model=list[VisualTemplate])
async def list_visual_templates(
    _: User = Depends(get_internal_user),
    repository: ConfigRepositoryProtocol = Depends(get_repository),
) -> list[VisualTemplate]:
    return await repository.list_visual_templates()


@templates_router.post("", response_model=VisualTemplate, status_code=201)
async def upsert_visual_template(
    payload: VisualTemplateUpsertRequest,
    _: User = Depends(get_internal_user),
    repository: ConfigRepositoryProtocol = Depends(get_repository),
) -> VisualTemplate:
    return await repository.upsert_visual_template(payload)


@router.get("", response_model=list[Client])
async def list_clients(
    _: User = Depends(get_internal_user),
    repository: ConfigRepositoryProtocol = Depends(get_repository),
) -> list[Client]:
    return await repository.list_clients()


@router.get("/{client_slug}/visibility", response_model=ClientVisibilityResponse)
async def get_client_visibility(
    client_slug: str,
    _: User = Depends(get_internal_user),
    repository: ConfigRepositoryProtocol = Depends(get_repository),
) -> ClientVisibilityResponse:
    return await repository.get_client_visibility(client_slug)


@router.put("/{client_slug}/visibility/{target_type}/{target_id}", response_model=ClientVisibilityResponse)
async def set_client_visibility(
    client_slug: str,
    target_type: str,
    target_id: str,
    payload: VisibilityUpdateRequest,
    user: User = Depends(get_internal_user),
    repository: ConfigRepositoryProtocol = Depends(get_repository),
    audit: AuditService = Depends(get_audit_service),
    redis: RedisService = Depends(get_redis_service),
) -> ClientVisibilityResponse:
    if target_type not in {"module", "screen"}:
        raise NotFoundError("Tipo de visibilidade nao encontrado.")
    result = await repository.set_client_visibility(client_slug, target_type, target_id, payload.visible, actor_id=user.id)
    await redis.invalidate_prefix(f"bhs:cache:tenant:{client_slug}:")
    await audit.log_action(
        actor_id=user.id,
        client_id=next((client.id for client in await repository.list_clients() if client.slug == client_slug), None),
        action="tenant.visibility.updated",
        resource_type=target_type,
        resource_id=target_id,
        status="success",
        metadata={"client_slug": client_slug, "visible": payload.visible},
    )
    return result


@router.get("/{client_slug}/catalog", response_model=TenantCatalog)
async def get_client_catalog(
    client_slug: str,
    _: User = Depends(get_internal_user),
    repository: ConfigRepositoryProtocol = Depends(get_repository),
) -> TenantCatalog:
    return await repository.get_tenant_catalog(client_slug=client_slug)


@router.post("/{client_slug}/data-sources", response_model=TenantCatalog, status_code=201)
async def upsert_data_source(
    client_slug: str,
    payload: DataSourceCreateRequest,
    _: User = Depends(get_internal_user),
    repository: ConfigRepositoryProtocol = Depends(get_repository),
    redis: RedisService = Depends(get_redis_service),
) -> TenantCatalog:
    result = await repository.upsert_data_source(client_slug=client_slug, payload=payload)
    await redis.invalidate_prefix(f"bhs:cache:tenant:{client_slug}:")
    return result


@router.put("/{client_slug}/data-sources/{data_source_key}/fields/{field_name}", response_model=TenantCatalog)
async def upsert_data_source_field(
    client_slug: str,
    data_source_key: str,
    field_name: str,
    payload: DataSourceFieldUpsertRequest,
    _: User = Depends(get_internal_user),
    repository: ConfigRepositoryProtocol = Depends(get_repository),
    redis: RedisService = Depends(get_redis_service),
) -> TenantCatalog:
    if payload.field_name != field_name:
        payload = payload.model_copy(update={"field_name": field_name})
    result = await repository.upsert_data_source_field(
        client_slug=client_slug,
        data_source_key=data_source_key,
        payload=payload,
    )
    await redis.invalidate_prefix(f"bhs:cache:tenant:{client_slug}:")
    return result


@router.get("/{client_slug}/template-bindings", response_model=list[TenantTemplateBinding])
async def list_template_bindings(
    client_slug: str,
    _: User = Depends(get_internal_user),
    repository: ConfigRepositoryProtocol = Depends(get_repository),
) -> list[TenantTemplateBinding]:
    return await repository.list_template_bindings(client_slug)


@router.post("/{client_slug}/template-bindings", response_model=TenantTemplateBinding, status_code=201)
async def upsert_template_binding(
    client_slug: str,
    payload: TenantTemplateBindingUpsertRequest,
    _: User = Depends(get_internal_user),
    repository: ConfigRepositoryProtocol = Depends(get_repository),
    redis: RedisService = Depends(get_redis_service),
) -> TenantTemplateBinding:
    result = await repository.upsert_template_binding(client_slug, payload)
    await redis.invalidate_prefix(f"bhs:cache:tenant:{client_slug}:")
    return result


@router.post("/{client_slug}/template-bindings/{binding_id}/validate", response_model=TenantTemplateBinding)
async def validate_template_binding(
    client_slug: str,
    binding_id: str,
    user: User = Depends(get_internal_user),
    repository: ConfigRepositoryProtocol = Depends(get_repository),
    binding_service: BindingService = Depends(get_binding_service),
    redis: RedisService = Depends(get_redis_service),
) -> TenantTemplateBinding:
    binding = await repository.get_template_binding(client_slug, binding_id)
    if binding is None:
        raise NotFoundError("Binding nao encontrado.")
    templates = {template.id: template for template in await repository.list_visual_templates()}
    template = templates.get(binding.template_id)
    if template is None:
        errors = [f"Binding {binding.id} usa template inexistente: {binding.template_id}."]
    else:
        catalog = await repository.get_validation_catalog(client_slug)
        errors = binding_service.validate_binding(template, binding, catalog, enforce_status=False)
    result = await repository.set_template_binding_validation(client_slug, binding_id, errors, user.id)
    await redis.invalidate_prefix(f"bhs:cache:tenant:{client_slug}:")
    return result


@router.get("/{client_slug}/screen-instances", response_model=list[ScreenInstance])
async def list_screen_instances(
    client_slug: str,
    _: User = Depends(get_internal_user),
    repository: ConfigRepositoryProtocol = Depends(get_repository),
) -> list[ScreenInstance]:
    return await repository.list_screen_instances(client_slug)


@router.post("/{client_slug}/screen-instances", response_model=ScreenInstance, status_code=201)
async def upsert_screen_instance(
    client_slug: str,
    payload: ScreenInstanceUpsertRequest,
    _: User = Depends(get_internal_user),
    repository: ConfigRepositoryProtocol = Depends(get_repository),
    redis: RedisService = Depends(get_redis_service),
) -> ScreenInstance:
    result = await repository.upsert_screen_instance(client_slug, payload)
    await redis.invalidate_prefix(f"bhs:cache:tenant:{client_slug}:")
    return result


@router.post("/{client_slug}/compose-draft", response_model=PublishedVersion, status_code=201)
async def compose_persisted_config_draft(
    client_slug: str,
    user: User = Depends(get_internal_user),
    repository: ConfigRepositoryProtocol = Depends(get_repository),
    composer: ScreenComposerService = Depends(get_screen_composer_service),
    redis: RedisService = Depends(get_redis_service),
) -> PublishedVersion:
    client = await repository.get_client_by_slug(client_slug)
    if client is None:
        raise NotFoundError("Cliente nao encontrado.")
    templates = {template.id: template for template in await repository.list_visual_templates()}
    bindings = {binding.id: binding for binding in await repository.list_template_bindings(client_slug)}
    screens = await repository.list_screen_instances(client_slug)
    snapshot = composer.compose_frontend_snapshot(
        client,
        version=1,
        screen_instances=screens,
        templates_by_id=templates,
        bindings_by_id=bindings,
        published_by=user.email,
    )
    result = await repository.create_draft(client_slug, snapshot)
    await redis.invalidate_prefix(f"bhs:cache:tenant:{client_slug}:")
    return result
