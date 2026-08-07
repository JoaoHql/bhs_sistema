from fastapi import APIRouter, Depends, Request, Response

from app.dependencies.identity import AuthenticatedIdentity, get_password_change_identity
from app.dependencies.redis import enforce_rate_limit
from app.dependencies.services import get_audit_service, get_authentication_service
from app.schemas.auth import LoginRequest, LoginResponse
from app.schemas.user import ChangePasswordRequest
from app.services.authentication_service import AuthenticationService
from app.services.audit_service import AuditService


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    http_request: Request,
    response: Response,
    service: AuthenticationService = Depends(get_authentication_service),
) -> LoginResponse:
    client_ip = http_request.client.host if http_request.client else "unknown"
    await enforce_rate_limit(
        http_request,
        response,
        scope="login",
        identity=f"{client_ip}:{request.email.lower()}",
        limit=5,
    )
    return await service.login(request)


@router.post("/change-password", response_model=LoginResponse)
async def change_password(
    request: ChangePasswordRequest,
    identity: AuthenticatedIdentity = Depends(get_password_change_identity),
    service: AuthenticationService = Depends(get_authentication_service),
    audit: AuditService = Depends(get_audit_service),
) -> LoginResponse:
    response = await service.change_password(
        identity.user,
        request,
        password_change_required=identity.password_change_required,
    )
    await audit.log_action(
        actor_id=identity.user.id,
        client_id=identity.user.client_id,
        action="user.password_changed",
        resource_type="user",
        resource_id=identity.user.id,
        status="success",
        metadata={"required_change": identity.password_change_required},
    )
    return response
