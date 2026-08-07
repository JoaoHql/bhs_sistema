from dataclasses import dataclass

from fastapi import Depends, Header, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import Settings, get_settings
from app.core.errors import BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError
from app.core.security import verify_jwt_token
from app.dependencies.services import get_repository
from app.repositories.config_repository_protocol import ConfigRepositoryProtocol
from app.schemas.user import User

security_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True, slots=True)
class AuthenticatedIdentity:
    user: User
    password_change_required: bool


async def _resolve_identity(
    credentials: HTTPAuthorizationCredentials | None,
    settings: Settings,
    repository: ConfigRepositoryProtocol,
    *,
    allow_password_change_required: bool,
) -> AuthenticatedIdentity:
    email: str | None = None
    client_slug: str | None = None
    user_id: str | None = None
    is_jwt = False

    payload: dict = {}
    if not credentials:
        raise UnauthorizedError("Token de autenticacao ausente.")
    else:
        token = credentials.credentials
        # Se for local/dev, podemos aceitar formato simplificado "email:slug" para facilitar testes
        if settings.environment == "local" and settings.dev_mock_auth and ":" in token and not token.count(".") == 2:
            parts = token.split(":")
            email = parts[0]
            client_slug = parts[1]
        else:
            is_jwt = True
            payload = verify_jwt_token(
                token,
                settings.jwt_secret,
                settings.jwt_algorithm,
                issuer=settings.jwt_issuer,
                audience=settings.jwt_audience,
            )
            if not payload:
                raise UnauthorizedError("Token de autenticacao invalido ou expirado.")
            email = payload.get("email")
            client_slug = payload.get("client_slug")
            user_id = payload.get("sub")
            if not payload.get("sub"):
                raise UnauthorizedError("Token sem sujeito valido.")
            if not payload.get("is_staff") and not client_slug:
                raise UnauthorizedError("Token sem tenant valido.")

    if not email:
        raise UnauthorizedError("Dados de identificacao ausentes no token.")

    try:
        user = await repository.get_current_user(
            email=email,
            client_slug=client_slug,
            user_id=user_id,
        )
    except NotFoundError as exc:
        raise UnauthorizedError("Credencial invalida ou revogada.") from exc

    password_change_required = False
    if is_jwt:
        if payload.get("sub") != user.id:
            raise UnauthorizedError("Token nao corresponde ao usuario.")
        if bool(payload.get("is_staff")) != user.is_staff:
            raise UnauthorizedError("Token nao corresponde ao perfil.")
        if payload.get("client_slug") != user.client_slug:
            raise UnauthorizedError("Token nao corresponde ao tenant atual.")
        if payload.get("roles") != user.roles:
            raise UnauthorizedError("Token nao corresponde ao papel atual.")
        token_version = payload.get("credentials_version")
        if not isinstance(token_version, int) or token_version != user.credentials_version:
            raise UnauthorizedError("Credencial invalida ou revogada.")
        password_change_required = payload.get("password_change_required") is True
        if password_change_required != user.must_change_password:
            raise UnauthorizedError("Estado da credencial foi alterado.")

    if password_change_required and not allow_password_change_required:
        raise ForbiddenError("Troca de senha obrigatoria.")
    return AuthenticatedIdentity(user=user, password_change_required=password_change_required)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security_bearer),
    settings: Settings = Depends(get_settings),
    repository: ConfigRepositoryProtocol = Depends(get_repository),
) -> User:
    identity = await _resolve_identity(
        credentials,
        settings,
        repository,
        allow_password_change_required=False,
    )
    request.state.audit_user = identity.user
    return identity.user


async def get_password_change_identity(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security_bearer),
    settings: Settings = Depends(get_settings),
    repository: ConfigRepositoryProtocol = Depends(get_repository),
) -> AuthenticatedIdentity:
    identity = await _resolve_identity(
        credentials,
        settings,
        repository,
        allow_password_change_required=True,
    )
    request.state.audit_user = identity.user
    return identity


async def get_internal_user(
    x_internal_token: str | None = Header(default=None),
    current_user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> User:
    if settings.internal_api_token and x_internal_token != settings.internal_api_token:
        raise ForbiddenError("Token interno invalido.")
    if not settings.internal_api_token and settings.environment != "local":
        raise ForbiddenError("Token interno nao configurado.")
    if not current_user.is_staff:
        raise ForbiddenError("Usuario sem permissao interna.")
    return current_user


async def get_team_master(
    current_user: User = Depends(get_internal_user),
) -> User:
    if not current_user.is_staff or (current_user.staff_role or "master") != "master":
        raise ForbiddenError("Somente a EQUIPE pode administrar MASTERs de tenant.")
    return current_user


async def get_tenant_master(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.is_staff or "admin" not in current_user.roles:
        raise ForbiddenError("Somente o MASTER do tenant pode administrar usuarios comuns.")
    if not current_user.client_id or not current_user.client_slug:
        raise UnauthorizedError("MASTER sem tenant resolvido.")
    return current_user


# Compatibilidade temporaria com endpoints existentes ate a Fase 3.
get_master_user = get_team_master


def resolve_tenant_for_request(user: User, requested_tenant: str | None) -> str:
    if user.is_staff:
        if not requested_tenant:
            raise BadRequestError("Usuario da equipe deve informar X-Tenant-Slug para consultar dados.")
        return requested_tenant
    if not user.client_slug:
        raise UnauthorizedError("Usuario sem tenant resolvido.")
    if requested_tenant and requested_tenant != user.client_slug:
        raise ForbiddenError("Tenant solicitado nao pertence ao usuario autenticado.")
    return user.client_slug
