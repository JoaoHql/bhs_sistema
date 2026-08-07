import pytest

from app.repositories.mock_config_repository import MockConfigRepository
from app.services.module_service import ModuleService


@pytest.mark.anyio
async def test_staff_never_receives_tenant_manifest() -> None:
    repository = MockConfigRepository()
    staff = await repository.get_current_user(email="staff@bhs.com.br")

    assert await ModuleService(repository).list_for_user(staff) == []
