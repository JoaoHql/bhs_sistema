from app.core.errors import ForbiddenError, NotFoundError
from app.repositories.config_repository_protocol import ConfigRepositoryProtocol
from app.schemas.config_version import ConfigValidationResponse
from app.schemas.published_version import PublishedVersion
from app.schemas.user import User
from app.services.config_validation_service import ConfigValidationService


class VersionService:
    def __init__(
        self,
        repository: ConfigRepositoryProtocol,
        validation_service: ConfigValidationService,
    ) -> None:
        self.repository = repository
        self.validation_service = validation_service

    async def list_versions(self, client_slug: str) -> list[PublishedVersion]:
        return await self.repository.list_versions(client_slug)

    async def create_draft(self, client_slug: str, config: dict, user: User) -> PublishedVersion:
        self._ensure_internal_client_access(client_slug=client_slug, user=user)
        return await self.repository.create_draft(client_slug=client_slug, config=config)

    async def validate_version(self, client_slug: str, version: int, user: User) -> tuple[PublishedVersion, ConfigValidationResponse]:
        self._ensure_internal_client_access(client_slug=client_slug, user=user)
        item = await self.repository.get_version(client_slug=client_slug, version=version)
        if item is None:
            raise NotFoundError("Versao nao encontrada.")
        errors = await self.validation_service.validate(client_slug=client_slug, config=item.config or {})
        if errors:
            updated = await self.repository.mark_validation_failed(client_slug, version, errors)
            return updated, ConfigValidationResponse(valid=False, errors=errors)
        updated = await self.repository.mark_validated(client_slug, version, user.id, [])
        return updated, ConfigValidationResponse(valid=True, errors=[])

    async def publish_version(self, client_slug: str, version: int, user: User) -> PublishedVersion:
        self._ensure_internal_client_access(client_slug=client_slug, user=user)
        item = await self.repository.get_version(client_slug=client_slug, version=version)
        if item is None:
            raise NotFoundError("Versao nao encontrada.")
        if item.status != "validated":
            raise ForbiddenError("Somente versao validated pode ser publicada.")
        errors = await self.validation_service.validate(client_slug=client_slug, config=item.config or {})
        if errors:
            await self.repository.mark_validation_failed(client_slug, version, errors)
            raise ForbiddenError("Versao invalida nao pode ser publicada.")
        return await self.repository.publish_version(client_slug=client_slug, version=version, user_id=user.id)

    async def rollback_version(self, client_slug: str, version: int, user: User) -> PublishedVersion:
        self._ensure_internal_client_access(client_slug=client_slug, user=user)
        item = await self.repository.get_version(client_slug=client_slug, version=version)
        if item is None:
            raise NotFoundError("Versao de rollback nao encontrada.")
        errors = await self.validation_service.validate(client_slug=client_slug, config=item.config or {})
        if errors:
            raise ForbiddenError("Rollback bloqueado: versao invalida no contrato atual.")
        return await self.repository.rollback_version(client_slug=client_slug, version=version, user_id=user.id)

    async def archive_version(self, client_slug: str, version: int, user: User) -> PublishedVersion:
        self._ensure_internal_client_access(client_slug=client_slug, user=user)
        return await self.repository.archive_version(client_slug=client_slug, version=version)

    def _ensure_internal_client_access(self, client_slug: str, user: User) -> None:
        if "admin" not in user.roles:
            raise ForbiddenError("Usuario sem permissao interna.")
        _ = client_slug
