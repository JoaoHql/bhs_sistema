from fastapi import APIRouter, Depends, Query, Response, status

from app.core.errors import ForbiddenError, NotFoundError
from app.dependencies.identity import get_current_user
from app.dependencies.services import get_combo_simulation_repository, get_query_repository, get_repository
from app.repositories.combo_simulation_repository import ComboSimulationRepositoryProtocol
from app.repositories.config_repository_protocol import ConfigRepositoryProtocol
from app.repositories.query_repository import QueryRepositoryProtocol
from app.schemas.combo_simulation import ComboSimulation, ComboSimulationCreate
from app.schemas.user import User
from app.services.permission_service import PermissionService

router = APIRouter(prefix="/tenant/combo-simulations", tags=["tenant-combo-simulations"])


async def _validate_screen_access(
    actor: User,
    screen_id: str,
    config_repo: ConfigRepositoryProtocol,
    query_repo: QueryRepositoryProtocol,
) -> str:
    if not actor.client_id or not actor.client_slug:
        raise NotFoundError("Tenant nao resolvido para o usuario autenticado.")
    if not PermissionService().can_read_screen(actor, screen_id):
        raise ForbiddenError("Usuario sem permissao para acessar esta tela.")
    if await config_repo.get_screen(actor.client_id, screen_id) is None:
        raise NotFoundError("Tela nao encontrada.")
    return await query_repo.get_validated_tenant_schema(actor.client_slug)


@router.get("", response_model=list[ComboSimulation])
async def list_combo_simulations(
    screen_id: str = Query(alias="screenId", min_length=1, max_length=120),
    company: str = Query(min_length=1, max_length=120),
    actor: User = Depends(get_current_user),
    config_repo: ConfigRepositoryProtocol = Depends(get_repository),
    query_repo: QueryRepositoryProtocol = Depends(get_query_repository),
    simulations: ComboSimulationRepositoryProtocol = Depends(get_combo_simulation_repository),
) -> list[ComboSimulation]:
    schema_name = await _validate_screen_access(actor, screen_id, config_repo, query_repo)
    rows = await simulations.list_for_user(
        tenant_schema=schema_name,
        client_id=actor.client_id,
        user_id=actor.id,
        company=company.strip(),
    )
    return [ComboSimulation.model_validate(row) for row in rows]


@router.post("", response_model=ComboSimulation, status_code=status.HTTP_201_CREATED)
async def create_combo_simulation(
    data: ComboSimulationCreate,
    actor: User = Depends(get_current_user),
    config_repo: ConfigRepositoryProtocol = Depends(get_repository),
    query_repo: QueryRepositoryProtocol = Depends(get_query_repository),
    simulations: ComboSimulationRepositoryProtocol = Depends(get_combo_simulation_repository),
) -> ComboSimulation:
    schema_name = await _validate_screen_access(actor, data.screen_id, config_repo, query_repo)
    saved = await simulations.create_for_user(
        tenant_schema=schema_name,
        client_id=actor.client_id,
        user_id=actor.id,
        data=data,
    )
    return ComboSimulation.model_validate(saved)


@router.delete("/{simulation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_combo_simulation(
    simulation_id: str,
    screen_id: str = Query(alias="screenId", min_length=1, max_length=120),
    company: str = Query(min_length=1, max_length=120),
    actor: User = Depends(get_current_user),
    config_repo: ConfigRepositoryProtocol = Depends(get_repository),
    query_repo: QueryRepositoryProtocol = Depends(get_query_repository),
    simulations: ComboSimulationRepositoryProtocol = Depends(get_combo_simulation_repository),
) -> Response:
    schema_name = await _validate_screen_access(actor, screen_id, config_repo, query_repo)
    await simulations.delete_for_user(
        tenant_schema=schema_name,
        client_id=actor.client_id,
        user_id=actor.id,
        company=company.strip(),
        simulation_id=simulation_id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
