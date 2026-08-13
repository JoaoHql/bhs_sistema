from fastapi import APIRouter

from app.api.v1.endpoints import ai, auth, clients, combo_simulations, health, me, modules, query, screens, updates, users, whatsapp

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router, tags=["health"])
api_router.include_router(ai.router)
api_router.include_router(auth.router)
api_router.include_router(me.router, tags=["identity"])
api_router.include_router(modules.router, tags=["configuration"])
api_router.include_router(screens.router, tags=["configuration"])
api_router.include_router(query.router, tags=["query"])
api_router.include_router(clients.router, tags=["internal-configuration"])
api_router.include_router(clients.templates_router, tags=["internal-configuration"])
api_router.include_router(users.router)
api_router.include_router(users.tenant_router)
api_router.include_router(users.legacy_router)
api_router.include_router(whatsapp.router)
api_router.include_router(combo_simulations.router)
api_router.include_router(updates.router, tags=["tenant-updates"])
