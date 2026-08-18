from datetime import datetime, timedelta, timezone

from app.core.config import Settings
from app.core.errors import BadRequestError, UnauthorizedError
from app.core.security import create_jwt_token, hash_password, verify_password
from app.repositories.config_repository_protocol import ConfigRepositoryProtocol
from app.schemas.auth import LoginRequest, LoginResponse
from app.schemas.user import ChangePasswordRequest, User
from app.services.credential_service import CredentialService


class AuthenticationService:
    def __init__(
        self,
        repository: ConfigRepositoryProtocol,
        credentials: CredentialService,
        settings: Settings,
    ) -> None:
        self.repository = repository
        self.credentials = credentials
        self.settings = settings

    def _response(self, user: User, *, restricted_until: datetime | None = None) -> LoginResponse:
        restricted = user.must_change_password
        expires_delta = timedelta(minutes=self.settings.jwt_access_token_minutes)
        if restricted:
            now = datetime.now(timezone.utc)
            if restricted_until is None or restricted_until <= now:
                raise UnauthorizedError("Senha temporaria expirada.")
            expires_delta = min(expires_delta, restricted_until - now)

        token_data = {
            "sub": user.id,
            "email": user.email,
            "is_staff": user.is_staff,
            "roles": user.roles,
            "credentials_version": user.credentials_version,
            "password_change_required": restricted,
        }
        if user.client_slug:
            token_data["client_slug"] = user.client_slug
        token = create_jwt_token(
            data=token_data,
            secret_key=self.settings.jwt_secret,
            algorithm=self.settings.jwt_algorithm,
            expires_delta=expires_delta,
            issuer=self.settings.jwt_issuer,
            audience=self.settings.jwt_audience,
        )
        return LoginResponse(
            access_token=token,
            password_change_required=restricted,
            user=user,
        )

    async def login(self, request: LoginRequest) -> LoginResponse:
        user = await self.repository.authenticate_user(
            email=str(request.email),
            password=request.password,
            client_slug=request.client_slug,
        )
        if user is None:
            raise UnauthorizedError("E-mail ou senha incorretos.")
        state = await self.repository.get_credential_state(user.id)
        return self._response(user, restricted_until=state.temporary_password_expires_at)

    async def refresh(self, user: User) -> LoginResponse:
        state = await self.repository.get_credential_state(user.id)
        if state.credentials_version != user.credentials_version:
            raise UnauthorizedError("Credencial invalida ou revogada.")
        if state.must_change_password != user.must_change_password:
            raise UnauthorizedError("Estado da credencial foi alterado.")
        return self._response(user, restricted_until=state.temporary_password_expires_at)

    async def change_password(
        self,
        user: User,
        payload: ChangePasswordRequest,
        *,
        password_change_required: bool,
    ) -> LoginResponse:
        try:
            self.credentials.validate_password(payload.new_password)
        except ValueError as exc:
            raise BadRequestError(str(exc)) from exc

        state = await self.repository.get_credential_state(user.id)
        if state.credentials_version != user.credentials_version:
            raise UnauthorizedError("Credencial invalida ou revogada.")
        if state.must_change_password != password_change_required:
            raise UnauthorizedError("Estado da credencial foi alterado.")
        if verify_password(payload.new_password, state.password_hash):
            raise BadRequestError("A nova senha deve ser diferente da senha atual.")

        if not password_change_required:
            if not payload.current_password:
                raise BadRequestError("currentPassword e obrigatoria para alteracao voluntaria.")
            if not verify_password(payload.current_password, state.password_hash):
                raise UnauthorizedError("Senha atual incorreta.")

        await self.repository.change_password(
            user.id,
            state.credentials_version,
            hash_password(payload.new_password),
        )
        updated = await self.repository.get_current_user(
            email=str(user.email),
            client_slug=user.client_slug,
            user_id=user.id,
        )
        return self._response(updated)
