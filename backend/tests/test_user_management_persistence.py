from datetime import datetime, timezone

import pytest

from app.core.config import Settings
from app.core.security import verify_password
from app.repositories.user_repository import (
    LIST_COMMON_USERS_SQL,
    RESET_COMMON_USER_PASSWORD_SQL,
)
from app.services.credential_service import CredentialService, SPECIAL_CHARACTERS


def test_generated_password_meets_policy_and_only_hash_is_persistable() -> None:
    settings = Settings(_env_file=None, generated_password_length=24)
    credential = CredentialService(settings).issue_temporary(
        now=datetime(2026, 7, 13, tzinfo=timezone.utc)
    )

    assert len(credential.plaintext) == 24
    assert any(char.isupper() for char in credential.plaintext)
    assert any(char.islower() for char in credential.plaintext)
    assert any(char.isdigit() for char in credential.plaintext)
    assert any(char in SPECIAL_CHARACTERS for char in credential.plaintext)
    assert credential.plaintext not in credential.password_hash
    assert credential.password_hash.startswith("pbkdf2_sha256$")
    assert verify_password(credential.plaintext, credential.password_hash)
    assert credential.expires_at == datetime(2026, 7, 14, tzinfo=timezone.utc)


@pytest.mark.parametrize(
    "password",
    ["short#A1", "nouppercase#1", "NOLOWERCASE#1", "NoNumber#", "NoSpecial123"],
)
def test_defined_temporary_password_must_meet_policy(password: str) -> None:
    with pytest.raises(ValueError):
        CredentialService(Settings(_env_file=None)).issue_temporary(password)


def test_tenant_queries_bind_actor_and_tenant_in_the_database_predicate() -> None:
    normalized_list = " ".join(LIST_COMMON_USERS_SQL.split())
    normalized_reset = " ".join(RESET_COMMON_USER_PASSWORD_SQL.split())

    assert "actor_membership.user_id = %s::uuid" in normalized_list
    assert "actor_membership.client_id = %s::uuid" in normalized_list
    assert "target_membership.client_id = actor_membership.client_id" in normalized_reset
    assert "target_membership.user_id = %s::uuid" in normalized_reset
    assert "not ('admin' = any(target_membership.roles))" in normalized_reset
    assert "credentials_version = credentials_version + 1" in normalized_reset
