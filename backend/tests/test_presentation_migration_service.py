from copy import deepcopy

import pytest

from app.services.config_validation_service import ConfigValidationService
from app.services.presentation_migration_service import inventory_published_widget_presentations, normalize_snapshot_presentation
from app.services.version_service import VersionService
from tests.test_template_binding_services import BindingValidationRepository, make_config


def test_normalization_is_idempotent_and_preserves_snapshot_contract() -> None:
    repository = BindingValidationRepository()
    legacy = make_config(repository.client, "bind_ok")
    original = deepcopy(legacy)
    normalized = normalize_snapshot_presentation(legacy)

    assert legacy == original
    assert normalize_snapshot_presentation(normalized) == normalized
    assert normalized["permissions"] == original["permissions"]
    assert normalized["screens"][0]["filters"] == original["screens"][0]["filters"]
    assert normalized["screens"][0]["components"][0]["id"] == original["screens"][0]["components"][0]["id"]
    assert normalized["screens"][0]["components"][0]["dataSourceId"] == original["screens"][0]["components"][0]["dataSourceId"]
    assert normalized["screens"][0]["components"][0]["presentation"] == {
        "layoutPreset": "chart.simple", "labelPolicy": "adaptive", "valueFormat": "currency.compact"
    }


@pytest.mark.anyio
async def test_inventory_draft_publish_reload_and_rollback_keep_legacy_version() -> None:
    repository = BindingValidationRepository()
    service = VersionService(repository, ConfigValidationService(repository))
    user = await repository.get_current_user(client_slug="bhs-demo")
    legacy_published = deepcopy(repository.versions[0].config)

    inventory = await inventory_published_widget_presentations(repository, "bhs-demo")
    assert inventory[0]["hasPresentation"] is False
    assert inventory[0]["recommendedPresentation"]["layoutPreset"] == "chart.simple"

    draft = await service.create_draft("bhs-demo", normalize_snapshot_presentation(legacy_published), user)
    validated, validation = await service.validate_version("bhs-demo", draft.version, user)
    assert validation.valid is True
    published = await service.publish_version("bhs-demo", validated.version, user)
    reloaded = await service.list_versions("bhs-demo")
    rolled_back = await service.rollback_version("bhs-demo", 1, user)

    assert published.status == "published"
    assert next(item for item in reloaded if item.version == draft.version).config == draft.config
    assert repository.versions[0].config == legacy_published
    assert "presentation" not in rolled_back.config["screens"][0]["components"][0]


@pytest.mark.anyio
async def test_gelobel_smoke_preserves_required_modules_and_screens(config_repository) -> None:
    modules = await config_repository.list_modules("cli_gelobel")
    labels = {module.label for module in modules}
    screen_labels = {screen.label for module in modules for screen in module.screens}

    assert {"Mensagens", "Simuladores", "Configurações"} <= labels
    assert {"Disparos no WhatsApp", "Simulador de Combos"} <= screen_labels
