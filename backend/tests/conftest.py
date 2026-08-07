from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.dependencies.services import get_query_repository, get_repository, get_user_repository
from app.main import app
from app.repositories.mock_config_repository import MockConfigRepository
from app.repositories.mock_query_repository import MockQueryRepository
from app.repositories.mock_user_repository import MockUserRepository


@pytest.fixture()
def config_repository() -> MockConfigRepository:
    return MockConfigRepository()


@pytest.fixture()
def client(config_repository: MockConfigRepository) -> Generator[TestClient, None, None]:
    repository = config_repository
    query_repository = MockQueryRepository()
    MockConfigRepository._shared_managed_users = {}
    MockConfigRepository._shared_visibility = {}
    MockUserRepository.reset()
    app.dependency_overrides[get_repository] = lambda: repository
    app.dependency_overrides[get_query_repository] = lambda: query_repository
    app.dependency_overrides[get_user_repository] = lambda: MockUserRepository()
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(get_repository, None)
        app.dependency_overrides.pop(get_query_repository, None)
        app.dependency_overrides.pop(get_user_repository, None)
