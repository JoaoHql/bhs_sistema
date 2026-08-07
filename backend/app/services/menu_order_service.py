from copy import deepcopy

from app.core.errors import ConflictError, ForbiddenError, NotFoundError, UnauthorizedError
from app.repositories.config_repository_protocol import ConfigRepositoryProtocol
from app.schemas.config_version import MenuOrderResponse
from app.schemas.published_version import PublishedVersion
from app.schemas.user import User
from app.services.config_validation_service import ConfigValidationService


class MenuOrderService:
    def __init__(self, repository: ConfigRepositoryProtocol, validation_service: ConfigValidationService) -> None:
        self.repository = repository
        self.validation_service = validation_service

    async def get_for_user(self, user: User) -> MenuOrderResponse:
        version = await self._published_version(user.client_slug)
        return MenuOrderResponse(itemIds=self._normalized_order(version.config or {}))

    async def publish_for_tenant(self, user: User, item_ids: list[str]) -> PublishedVersion:
        if user.is_staff or "admin" not in user.roles or not user.client_slug:
            raise ForbiddenError("Somente o MASTER do tenant pode organizar o menu.")

        current = await self._published_version(user.client_slug)
        config = deepcopy(current.config or {})
        expected = self._normalized_order(config)
        if len(item_ids) != len(set(item_ids)) or set(item_ids) != set(expected):
            raise ConflictError("A ordem precisa conter exatamente os modulos publicados e Configuracoes.")

        positions = {item_id: index for index, item_id in enumerate(item_ids, start=1)}
        config["modules"] = sorted(config.get("modules", []), key=lambda module: positions[module["id"]])
        for module in config["modules"]:
            module["sortOrder"] = positions[module["id"]]
        config["menuOrder"] = item_ids

        draft = await self.repository.create_draft(user.client_slug, config)
        errors = await self.validation_service.validate(user.client_slug, config)
        if errors:
            await self.repository.mark_validation_failed(user.client_slug, draft.version, errors)
            raise ConflictError("A nova ordem nao passou na validacao da versao.")
        await self.repository.mark_validated(user.client_slug, draft.version, user.id, [])
        return await self.repository.publish_version(user.client_slug, draft.version, user.id)

    async def _published_version(self, client_slug: str | None) -> PublishedVersion:
        if not client_slug:
            raise UnauthorizedError("Usuario sem tenant resolvido.")
        versions = await self.repository.list_versions(client_slug)
        published = next((item for item in versions if item.status == "published"), None)
        if published is None:
            raise NotFoundError("Nenhuma versao publicada foi encontrada para este tenant.")
        return published

    @staticmethod
    def _normalized_order(config: dict) -> list[str]:
        module_ids = [module["id"] for module in config.get("modules", [])]
        expected = set(module_ids) | {"configuracoes"}
        saved = config.get("menuOrder")
        if isinstance(saved, list) and len(saved) == len(expected) and set(saved) == expected:
            return saved
        return [*module_ids, "configuracoes"]
