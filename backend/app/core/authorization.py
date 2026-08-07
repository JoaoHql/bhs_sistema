from dataclasses import dataclass
from enum import StrEnum


class UserLevel(StrEnum):
    TEAM = "team"
    TENANT_MASTER = "tenant_master"
    COMMON_USER = "common_user"


class ScreenAccess(StrEnum):
    NONE = "none"
    READ = "read"
    WRITE = "write"


@dataclass(frozen=True)
class AuthorizationRule:
    operation: str
    allowed_levels: frozenset[UserLevel]
    scope: str


USER_MANAGEMENT_AUTHORIZATION_MATRIX: tuple[AuthorizationRule, ...] = (
    AuthorizationRule(
        "login",
        frozenset({UserLevel.TEAM, UserLevel.TENANT_MASTER, UserLevel.COMMON_USER}),
        "public_credentials",
    ),
    AuthorizationRule("list_tenant_masters", frozenset({UserLevel.TEAM}), "all_tenants"),
    AuthorizationRule("create_tenant_master", frozenset({UserLevel.TEAM}), "selected_tenant"),
    AuthorizationRule("update_tenant_master", frozenset({UserLevel.TEAM}), "target_tenant"),
    AuthorizationRule("reset_tenant_master_password", frozenset({UserLevel.TEAM}), "target_tenant"),
    AuthorizationRule("delete_tenant_master", frozenset({UserLevel.TEAM}), "target_tenant"),
    AuthorizationRule("list_common_users", frozenset({UserLevel.TENANT_MASTER}), "actor_tenant"),
    AuthorizationRule("create_common_user", frozenset({UserLevel.TENANT_MASTER}), "actor_tenant"),
    AuthorizationRule("update_common_user", frozenset({UserLevel.TENANT_MASTER}), "actor_tenant"),
    AuthorizationRule("reset_common_user_password", frozenset({UserLevel.TENANT_MASTER}), "actor_tenant"),
    AuthorizationRule("replace_common_user_permissions", frozenset({UserLevel.TENANT_MASTER}), "actor_tenant"),
    AuthorizationRule("delete_common_user", frozenset({UserLevel.TENANT_MASTER}), "actor_tenant"),
    AuthorizationRule(
        "change_own_password",
        frozenset({UserLevel.TEAM, UserLevel.TENANT_MASTER, UserLevel.COMMON_USER}),
        "self",
    ),
    AuthorizationRule(
        "read_own_identity",
        frozenset({UserLevel.TEAM, UserLevel.TENANT_MASTER, UserLevel.COMMON_USER}),
        "self",
    ),
)


@dataclass(frozen=True)
class ScreenEndpointRule:
    method: str
    path: str
    required_access: ScreenAccess


SCREEN_ACCESS_ENDPOINTS: tuple[ScreenEndpointRule, ...] = (
    ScreenEndpointRule("GET", "/api/v1/modules", ScreenAccess.READ),
    ScreenEndpointRule("GET", "/api/v1/screens/{screen_id}", ScreenAccess.READ),
    ScreenEndpointRule("POST", "/api/v1/query", ScreenAccess.READ),
    ScreenEndpointRule("POST", "/api/v1/query/sales-overview", ScreenAccess.READ),
    ScreenEndpointRule("POST", "/api/v1/query/combo-simulator-products", ScreenAccess.READ),
)
