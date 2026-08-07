from app.repositories.config_repository_protocol import ConfigRepositoryProtocol
from app.schemas.module import Module
from app.schemas.user import User


class ModuleService:
    def __init__(self, repository: ConfigRepositoryProtocol) -> None:
        self.repository = repository

    async def list_for_user(self, user: User) -> list[Module]:
        # A biblioteca da equipe e local/mockada no frontend. Nunca exponha o
        # manifesto publicado de um cliente a uma sessao interna.
        if user.is_staff:
            return []
        modules = await self.repository.list_modules(client_id=user.client_id)
        if "*" in user.allowed_screen_ids:
            return modules
        return [
            module.model_copy(
                update={
                    "screens": [
                        screen
                        for screen in module.screens
                        if screen.id in user.allowed_screen_ids
                    ]
                }
            )
            for module in modules
        ]
