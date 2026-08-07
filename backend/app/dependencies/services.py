from fastapi import Depends, Request

from app.core.config import Settings, get_settings
from app.repositories.config_repository import ConfigRepository
from app.repositories.config_repository_protocol import ConfigRepositoryProtocol
from app.repositories.mock_config_repository import MockConfigRepository
from app.repositories.mock_query_repository import MockQueryRepository
from app.repositories.query_repository import QueryRepository, QueryRepositoryProtocol
from app.repositories.mock_user_repository import MockUserRepository
from app.repositories.user_repository import UserRepository, UserRepositoryProtocol
from app.repositories.whatsapp_repository import WhatsAppRepository, WhatsAppRepositoryProtocol
from app.services.config_validation_service import ConfigValidationService
from app.services.module_service import ModuleService
from app.services.permission_service import PermissionService
from app.services.query_service import QueryService
from app.services.screen_service import ScreenService
from app.services.version_service import VersionService
from app.services.audit_service import AuditService
from app.services.binding_service import BindingService
from app.services.screen_composer_service import ScreenComposerService
from app.services.template_service import TemplateService
from app.services.credential_service import CredentialService
from app.services.user_management_service import UserManagementService
from app.services.authentication_service import AuthenticationService
from app.services.menu_order_service import MenuOrderService
from app.services.whatsapp_service import WhatsAppService
from app.services.whatsapp_provider import WhatsAppProvider
from app.services.openai_service import OpenAIService
from app.services.materialization_service import MaterializationService
from app.services.update_service import UpdateService
from app.repositories.materialization_repository import MaterializationRepository
from app.repositories.update_repository import UpdateRepository


def get_repository(settings: Settings = Depends(get_settings)) -> ConfigRepositoryProtocol:
    if settings.database_url:
        return ConfigRepository(database_url=settings.database_url)
    return MockConfigRepository()


def get_permission_service() -> PermissionService:
    return PermissionService()


def get_user_repository(settings: Settings = Depends(get_settings)) -> UserRepositoryProtocol:
    if settings.database_url:
        return UserRepository(settings.database_url)
    return MockUserRepository()


def get_user_management_service(
    repository: UserRepositoryProtocol = Depends(get_user_repository),
    settings: Settings = Depends(get_settings),
) -> UserManagementService:
    return UserManagementService(repository, CredentialService(settings))


def get_whatsapp_repository(settings: Settings = Depends(get_settings)) -> WhatsAppRepositoryProtocol:
    if not settings.database_url:
        raise RuntimeError("Banco de dados obrigatorio para a configuracao WhatsApp.")
    return WhatsAppRepository(settings.database_url)


def get_whatsapp_service(
    repository: WhatsAppRepositoryProtocol = Depends(get_whatsapp_repository),
    settings: Settings = Depends(get_settings),
) -> WhatsAppService:
    return WhatsAppService(repository, WhatsAppProvider(settings))


def get_authentication_service(
    repository: ConfigRepositoryProtocol = Depends(get_repository),
    settings: Settings = Depends(get_settings),
) -> AuthenticationService:
    return AuthenticationService(repository, CredentialService(settings), settings)


def get_query_repository(settings: Settings = Depends(get_settings)) -> QueryRepositoryProtocol:
    if settings.database_url:
        return QueryRepository(database_url=settings.database_url)
    return MockQueryRepository()


def get_module_service(
    repository: ConfigRepositoryProtocol = Depends(get_repository),
) -> ModuleService:
    return ModuleService(repository=repository)


def get_screen_service(
    repository: ConfigRepositoryProtocol = Depends(get_repository),
) -> ScreenService:
    return ScreenService(
        repository=repository,
        permission_service=get_permission_service(),
    )


def get_config_validation_service(
    repository: ConfigRepositoryProtocol = Depends(get_repository),
) -> ConfigValidationService:
    return ConfigValidationService(repository=repository)


def get_template_service() -> TemplateService:
    return TemplateService()


def get_binding_service(
    template_service: TemplateService = Depends(get_template_service),
) -> BindingService:
    return BindingService(template_service=template_service)


def get_screen_composer_service(
    binding_service: BindingService = Depends(get_binding_service),
) -> ScreenComposerService:
    return ScreenComposerService(binding_service=binding_service)


def get_version_service(
    repository: ConfigRepositoryProtocol = Depends(get_repository),
    validation_service: ConfigValidationService = Depends(get_config_validation_service),
) -> VersionService:
    return VersionService(repository=repository, validation_service=validation_service)


def get_menu_order_service(
    repository: ConfigRepositoryProtocol = Depends(get_repository),
    validation_service: ConfigValidationService = Depends(get_config_validation_service),
) -> MenuOrderService:
    return MenuOrderService(repository=repository, validation_service=validation_service)


def get_query_service(
    config_repository: ConfigRepositoryProtocol = Depends(get_repository),
    query_repository: QueryRepositoryProtocol = Depends(get_query_repository),
) -> QueryService:
    return QueryService(
        config_repository=config_repository,
        query_repository=query_repository,
        permission_service=get_permission_service(),
    )


def get_audit_service(settings: Settings = Depends(get_settings)) -> AuditService:
    # Se database_url não existir (e.g. mock nos testes de unidade simples), aponta para um endereço dummy
    db_url = settings.database_url or "postgresql://dummy@localhost:5432/dummy"
    return AuditService(database_url=db_url)


def get_openai_service(settings: Settings = Depends(get_settings)) -> OpenAIService:
    return OpenAIService(settings)


def get_materialization_repository(settings: Settings = Depends(get_settings)) -> MaterializationRepository:
    if not settings.database_url:
        raise RuntimeError("Banco de dados obrigatorio para materializacao de views.")
    return MaterializationRepository(settings.database_url)


def get_materialization_service(
    repository: MaterializationRepository = Depends(get_materialization_repository),
) -> MaterializationService:
    return MaterializationService(repository)


def get_update_repository(settings: Settings = Depends(get_settings)) -> UpdateRepository:
    if not settings.database_url:
        raise RuntimeError("Banco de dados obrigatorio para historico de atualizacao.")
    return UpdateRepository(settings.database_url)


def get_update_service(
    request: Request,
    repository: UpdateRepository = Depends(get_update_repository),
    query_repo: QueryRepositoryProtocol = Depends(get_query_repository),
    materialization: MaterializationService = Depends(get_materialization_service),
    audit: AuditService = Depends(get_audit_service),
) -> UpdateService:
    redis_service = request.app.state.redis_service
    return UpdateService(repository, query_repo, redis_service, materialization, audit)
