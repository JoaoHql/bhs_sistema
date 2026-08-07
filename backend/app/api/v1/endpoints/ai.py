from fastapi import APIRouter, Depends

from app.dependencies.identity import get_current_user
from app.dependencies.redis import rate_limit_ai
from app.dependencies.services import get_openai_service
from app.schemas.ai import GenerateModuleRequest, GenerateModuleResponse
from app.schemas.user import User
from app.services.openai_service import OpenAIService


router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/generate-module", response_model=GenerateModuleResponse)
async def generate_module(
    request: GenerateModuleRequest,
    _: User = Depends(get_current_user),
    __: None = Depends(rate_limit_ai),
    service: OpenAIService = Depends(get_openai_service),
) -> GenerateModuleResponse:
    module = await service.generate_module(
        prompt=request.prompt,
        calculated_fields=request.calculated_fields,
    )
    return GenerateModuleResponse(module=module)
