import pytest

from app.repositories.mock_config_repository import MockConfigRepository


@pytest.mark.anyio
async def test_client_visibility_lists_hidden_items_and_blocks_tenant_runtime() -> None:
    repository = MockConfigRepository()

    initial = await repository.get_client_visibility("gelobel")
    assert {module.label for module in initial.modules} >= {"Mensagens", "Simuladores", "Configurações"}

    updated = await repository.set_client_visibility("gelobel", "screen", "simulador-combos", False)
    simulator = next(module for module in updated.modules if module.id == "simuladores")
    assert simulator.screens[0].visible is False

    modules = await repository.list_modules("cli_gelobel")
    assert "simulador-combos" not in {screen.id for module in modules for screen in module.screens}
    assert await repository.get_screen("cli_gelobel", "simulador-combos") is None
