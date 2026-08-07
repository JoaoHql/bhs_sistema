import asyncio

import pytest
from pydantic import ValidationError

from app.core.authorization import (
    SCREEN_ACCESS_ENDPOINTS,
    USER_MANAGEMENT_AUTHORIZATION_MATRIX,
    ScreenAccess,
    UserLevel,
)
from app.core.config import Settings
from app.core.errors import ForbiddenError, UnauthorizedError
from app.dependencies.identity import get_team_master, get_tenant_master
from app.schemas.user import (
    CreateManagedUserRequest,
    TenantMasterCreateRequest,
    TenantUserCreateRequest,
    TenantUserUpdateRequest,
    TemporaryPasswordRequest,
    User,
)


def make_user(*, is_staff: bool, roles: list[str], tenant: bool = True) -> User:
    return User(
        id="usr_test",
        email="user@example.com",
        name="User Test",
        client_id="cli_test" if tenant else None,
        client_slug="tenant-test" if tenant else None,
        roles=roles,
        allowed_screen_ids=[],
        is_staff=is_staff,
        staff_role="master" if is_staff else None,
    )


def test_three_user_levels_are_unambiguous() -> None:
    assert make_user(is_staff=True, roles=[]).level is UserLevel.TEAM
    assert make_user(is_staff=False, roles=["admin"]).level is UserLevel.TENANT_MASTER
    assert make_user(is_staff=False, roles=[]).level is UserLevel.COMMON_USER


def test_team_operator_is_rejected_by_contract() -> None:
    with pytest.raises(ValidationError):
        CreateManagedUserRequest(
            email="operator@example.com",
            name="Operator Test",
            password="Strong#Pass1",
            is_staff=True,
            staff_role="operator",
        )


@pytest.mark.parametrize("field", ["clientSlug", "client_slug", "client_id", "roles", "is_staff"])
def test_tenant_user_contract_cannot_select_tenant_or_role(field: str) -> None:
    payload = {
        "email": "common@example.com",
        "name": "Common User",
        "temporaryPassword": {"mode": "generated"},
        field: "forbidden" if field not in {"roles", "is_staff"} else [],
    }
    with pytest.raises(ValidationError):
        TenantUserCreateRequest.model_validate(payload)


def test_tenant_user_update_cannot_promote_or_move_user() -> None:
    with pytest.raises(ValidationError):
        TenantUserUpdateRequest.model_validate({"status": "active", "roles": ["admin"], "clientSlug": "other"})


def test_only_team_master_contract_selects_tenant() -> None:
    payload = TenantMasterCreateRequest.model_validate(
        {
            "email": "master@example.com",
            "name": "Tenant Master",
            "clientSlug": "tenant-test",
            "temporaryPassword": {"mode": "defined", "password": "Strong#Pass1"},
        }
    )
    assert payload.client_slug == "tenant-test"


def test_temporary_password_modes_are_exclusive() -> None:
    assert TemporaryPasswordRequest(mode="generated").password is None
    assert TemporaryPasswordRequest(mode="defined", password="Strong#Pass1").password == "Strong#Pass1"
    with pytest.raises(ValidationError):
        TemporaryPasswordRequest(mode="generated", password="Strong#Pass1")
    with pytest.raises(ValidationError):
        TemporaryPasswordRequest(mode="defined")


def test_password_policy_is_configurable_and_secure_by_default() -> None:
    settings = Settings(_env_file=None)
    assert settings.password_min_length == 10
    assert settings.password_require_uppercase
    assert settings.password_require_lowercase
    assert settings.password_require_number
    assert settings.password_require_special
    assert settings.generated_password_length >= settings.password_min_length
    assert settings.temporary_password_ttl_hours == 24


def test_authorization_dependencies_separate_team_and_tenant_master() -> None:
    team = make_user(is_staff=True, roles=[], tenant=False)
    tenant_master = make_user(is_staff=False, roles=["admin"])
    common = make_user(is_staff=False, roles=[])

    assert asyncio.run(get_team_master(current_user=team)) == team
    assert asyncio.run(get_tenant_master(current_user=tenant_master)) == tenant_master
    with pytest.raises(ForbiddenError):
        asyncio.run(get_team_master(current_user=tenant_master))
    with pytest.raises(ForbiddenError):
        asyncio.run(get_tenant_master(current_user=team))
    with pytest.raises(ForbiddenError):
        asyncio.run(get_tenant_master(current_user=common))
    with pytest.raises(UnauthorizedError):
        asyncio.run(get_tenant_master(current_user=make_user(is_staff=False, roles=["admin"], tenant=False)))


def test_authorization_matrix_covers_every_planned_operation() -> None:
    rules = {rule.operation: rule for rule in USER_MANAGEMENT_AUTHORIZATION_MATRIX}
    assert set(rules) == {
        "login",
        "list_tenant_masters",
        "create_tenant_master",
        "update_tenant_master",
        "reset_tenant_master_password",
        "delete_tenant_master",
        "list_common_users",
        "create_common_user",
        "update_common_user",
        "reset_common_user_password",
        "replace_common_user_permissions",
        "delete_common_user",
        "change_own_password",
        "read_own_identity",
    }
    assert rules["create_tenant_master"].allowed_levels == {UserLevel.TEAM}
    assert rules["create_common_user"].allowed_levels == {UserLevel.TENANT_MASTER}
    assert UserLevel.TEAM not in rules["reset_common_user_password"].allowed_levels
    assert UserLevel.TENANT_MASTER not in rules["create_tenant_master"].allowed_levels


def test_existing_screen_endpoints_have_explicit_access_mapping() -> None:
    mapped = {(rule.method, rule.path): rule.required_access for rule in SCREEN_ACCESS_ENDPOINTS}
    assert mapped == {
        ("GET", "/api/v1/modules"): ScreenAccess.READ,
        ("GET", "/api/v1/screens/{screen_id}"): ScreenAccess.READ,
        ("POST", "/api/v1/query"): ScreenAccess.READ,
        ("POST", "/api/v1/query/sales-overview"): ScreenAccess.READ,
        ("POST", "/api/v1/query/combo-simulator-products"): ScreenAccess.READ,
    }
    assert ScreenAccess.WRITE not in mapped.values()
