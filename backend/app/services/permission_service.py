from app.core.security import can_access_screen
from app.schemas.user import User


class PermissionService:
    def can_read_screen(self, user: User, screen_id: str) -> bool:
        return can_access_screen(user=user, screen_id=screen_id)

