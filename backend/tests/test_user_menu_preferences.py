import pytest

from app.repositories.mock_config_repository import MockConfigRepository


@pytest.mark.anyio
async def test_menu_preferences_are_individual_and_do_not_change_versions() -> None:
    repository = MockConfigRepository()
    staff = await repository.get_current_user(email="staff@bhs.com.br")
    tenant = await repository.get_current_user(email="admin@bhs.demo", client_slug="bhs-demo")
    before_versions = await repository.list_versions("bhs-demo")

    await repository.update_current_user_menu_order(staff, ["mod-a", "configuracoes"])
    await repository.update_current_user_menu_order(tenant, ["configuracoes", "mod-a"])

    assert await repository.get_current_user_menu_order(staff) == ["mod-a", "configuracoes"]
    assert await repository.get_current_user_menu_order(tenant) == ["configuracoes", "mod-a"]
    assert await repository.list_versions("bhs-demo") == before_versions
