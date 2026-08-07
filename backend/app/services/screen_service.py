from app.core.errors import ForbiddenError, NotFoundError
from app.repositories.config_repository_protocol import ConfigRepositoryProtocol
from app.schemas.screen import Screen
from app.schemas.user import User
from app.services.permission_service import PermissionService


class ScreenService:
    def __init__(
        self,
        repository: ConfigRepositoryProtocol,
        permission_service: PermissionService,
    ) -> None:
        self.repository = repository
        self.permission_service = permission_service

    async def get_for_user(self, screen_id: str, user: User) -> Screen:
        if not self.permission_service.can_read_screen(user=user, screen_id=screen_id):
            raise ForbiddenError("Usuario sem permissao para acessar esta tela.")

        screen = await self.repository.get_screen(client_id=user.client_id, screen_id=screen_id)
        if screen is None:
            raise NotFoundError("Tela nao encontrada.")
        return screen
