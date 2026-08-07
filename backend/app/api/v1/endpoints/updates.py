from fastapi import APIRouter, Depends, Query, Response, status

from app.dependencies.identity import get_current_user, get_tenant_master
from app.dependencies.redis import rate_limit_updates
from app.dependencies.services import get_update_service
from app.schemas.update import AreaUpdateStatus, RefreshRequest, RefreshResponse, UpdateRun
from app.schemas.user import User
from app.services.update_service import UpdateService

router = APIRouter(
    prefix="/tenant/updates",
    tags=["tenant-updates"],
    dependencies=[Depends(rate_limit_updates)],
)


@router.get("", response_model=list[AreaUpdateStatus])
async def get_updates_status(
    actor: User = Depends(get_current_user),
    service: UpdateService = Depends(get_update_service),
) -> list[AreaUpdateStatus]:
    return await service.get_updates_status(actor)


@router.get("/runs", response_model=list[UpdateRun])
async def list_update_runs(
    limit: int = Query(default=50, ge=1, le=200),
    actor: User = Depends(get_current_user),
    service: UpdateService = Depends(get_update_service),
) -> list[UpdateRun]:
    return await service.list_runs(actor, limit)


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_data(
    body: RefreshRequest,
    actor: User = Depends(get_current_user),
    service: UpdateService = Depends(get_update_service),
) -> RefreshResponse:
    return await service.refresh_data(actor, body.area)


@router.delete("/runs/{run_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_update_run(
    run_id: str,
    actor: User = Depends(get_tenant_master),
    service: UpdateService = Depends(get_update_service),
) -> Response:
    await service.delete_run(actor, run_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
