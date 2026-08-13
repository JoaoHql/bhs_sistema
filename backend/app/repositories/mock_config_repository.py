from datetime import datetime, timedelta, timezone

from app.schemas.client import Client
from app.schemas.client_visibility import ClientVisibilityResponse, VisibleModule, VisibleScreen
from app.schemas.data_source import DataSource
from app.schemas.data_source_field import DataSourceFieldUpsertRequest
from app.schemas.module import Module
from app.schemas.published_version import PublishedVersion
from app.schemas.screen import Screen
from app.schemas.tenant_catalog import DataSourceCreateRequest, TenantCatalog
from app.schemas.template_contract import (
    FieldMapping,
    ScreenInstance,
    ScreenInstanceUpsertRequest,
    ScreenWidgetInstance,
    TenantTemplateBinding,
    TenantTemplateBindingUpsertRequest,
    VisualTemplate,
    VisualTemplateUpsertRequest,
)
from app.schemas.user import User
from app.schemas.user import CreateManagedUserRequest, ManagedUser, ProfileUpdateRequest, UpdateManagedUserRequest
from app.core.errors import ConflictError, NotFoundError
from app.core.errors import UnauthorizedError
from app.core.security import hash_password, verify_password
from app.repositories.config_repository_protocol import CredentialState
from app.schemas.widget import ChartConfig, ChartDimension, ChartMetric, Widget


class MockConfigRepository:
    _shared_templates: dict[str, VisualTemplate] | None = None
    _shared_bindings: dict[str, TenantTemplateBinding] | None = None
    _shared_screens: dict[str, ScreenInstance] | None = None
    _shared_versions: dict[str, list[PublishedVersion]] = {}
    _shared_managed_users: dict[str, ManagedUser] = {}
    _shared_menu_preferences: dict[tuple[str, str], list[str]] = {}
    _shared_visibility: dict[str, dict[str, set[str]]] = {}

    def __init__(self) -> None:
        self._profile_overrides: dict[str, ProfileUpdateRequest] = {}
        self._credential_states = {
            "usr_staff": CredentialState(hash_password("bhs123", iterations=1), False, None, 1),
            "usr_demo_admin": CredentialState(hash_password("bhs123", iterations=1), False, None, 1),
            "usr_gelobel_admin": CredentialState(hash_password("Gelo#X7v!Q2mL9pR4", iterations=1), False, None, 1),
        }
        if MockConfigRepository._shared_templates is None:
            MockConfigRepository._shared_templates = {
                "tpl_sales_channel": VisualTemplate.model_validate(
                    {
                        "id": "tpl_sales_channel",
                        "key": "receita_por_canal",
                        "name": "Receita por canal",
                        "description": "Grafico reutilizavel para receita agrupada por canal.",
                        "template_type": "chart",
                        "visual_type": "bar",
                        "semantic_requirements": {
                            "dimensions": [{"key": "channel", "label": "Canal", "types": ["text"], "required": True}],
                            "metrics": [
                                {
                                    "key": "revenue",
                                    "label": "Receita",
                                    "types": ["number"],
                                    "required": True,
                                    "aggregations": ["sum"],
                                    "format": "currency",
                                }
                            ],
                            "filters": [],
                        },
                        "default_options": {"color": "#f97316", "showLegend": False},
                        "status": "active",
                    }
                ),
                "tpl_orders_channel": VisualTemplate.model_validate(
                    {
                        "id": "tpl_orders_channel",
                        "key": "pedidos_por_canal",
                        "name": "Pedidos por canal",
                        "description": "Grafico reutilizavel para pedidos agrupados por canal.",
                        "template_type": "chart",
                        "visual_type": "line",
                        "semantic_requirements": {
                            "dimensions": [{"key": "channel", "label": "Canal", "types": ["text"], "required": True}],
                            "metrics": [
                                {
                                    "key": "orders_count",
                                    "label": "Pedidos",
                                    "types": ["number"],
                                    "required": True,
                                    "aggregations": ["sum"],
                                    "format": "number",
                                }
                            ],
                            "filters": [],
                        },
                        "default_options": {"color": "#059669", "showLegend": False},
                        "status": "active",
                    }
                ),
            }
        if MockConfigRepository._shared_bindings is None:
            MockConfigRepository._shared_bindings = {
                "bind-receita-canal": TenantTemplateBinding(
                    id="bind-receita-canal",
                    client_id="cli_bhs_demo",
                    template_id="tpl_sales_channel",
                    data_source_id="ds_vendas",
                    field_mapping=FieldMapping(fields={"channel": "channel", "revenue": "revenue"}, filters={}),
                    default_title="Receita por canal",
                    default_description="Binding mock validado.",
                    status="active",
                    validation_errors=[],
                ),
                "bind-pedidos-canal": TenantTemplateBinding(
                    id="bind-pedidos-canal",
                    client_id="cli_bhs_demo",
                    template_id="tpl_orders_channel",
                    data_source_id="ds_vendas",
                    field_mapping=FieldMapping(fields={"channel": "channel", "orders_count": "orders_count"}, filters={}),
                    default_title="Pedidos por canal",
                    default_description="Binding mock validado.",
                    status="active",
                    validation_errors=[],
                )
            }
        if MockConfigRepository._shared_screens is None:
            MockConfigRepository._shared_screens = {
                "sales-overview": ScreenInstance(
                    id="scr_sales_overview",
                    client_id="cli_bhs_demo",
                    module_key="mod-demo-vendas",
                    screen_key="sales-overview",
                    label="Vendas",
                    layout={"type": "dashboard"},
                    status="published",
                    widgets=[
                        ScreenWidgetInstance(
                            id="swi_sales_channel",
                            screen_instance_id="scr_sales_overview",
                            binding_id="bind-receita-canal",
                            widget_key="receita-canal",
                            grid_span=2,
                            sort_order=1,
                        ),
                        ScreenWidgetInstance(
                            id="swi_orders_channel",
                            screen_instance_id="scr_sales_overview",
                            binding_id="bind-pedidos-canal",
                            widget_key="pedidos-canal",
                            grid_span=2,
                            sort_order=2,
                        )
                    ],
                )
            }
        self._templates = MockConfigRepository._shared_templates
        self._bindings = MockConfigRepository._shared_bindings
        self._screens = MockConfigRepository._shared_screens
        self._versions = MockConfigRepository._shared_versions

    def get_client(self) -> Client:
        return Client(id="cli_bhs_demo", name="BHS Demo", slug="bhs-demo", status="active")

    def get_gelobel_client(self) -> Client:
        return Client(id="cli_gelobel", name="Gelobel", slug="gelobel", status="active")

    async def get_current_user(self, email: str | None = None, client_slug: str | None = None, user_id: str | None = None) -> User:
        if email == "staff@bhs.com.br":
            if user_id and user_id != "usr_staff":
                raise NotFoundError("Usuario nao encontrado.")
            credential = self._credential_states["usr_staff"]
            user = User(
                id="usr_staff",
                email="staff@bhs.com.br",
                name="Equipe BHS",
                client_id=None,
                roles=["admin"],
                allowed_screen_ids=["*"],
                is_staff=True,
                staff_role="master",
                must_change_password=credential.must_change_password,
                credentials_version=credential.credentials_version,
            )
            override = self._profile_overrides.get(user.id)
            return user.model_copy(update=override.model_dump() if override else {})
        if email == "admin@gelobel.com.br":
            if user_id and user_id != "usr_gelobel_admin":
                raise NotFoundError("Usuario nao encontrado.")
            if client_slug and client_slug != "gelobel":
                raise NotFoundError("Usuario nao encontrado para o tenant informado.")
            client = self.get_gelobel_client()
            credential = self._credential_states["usr_gelobel_admin"]
            user = User(
                id="usr_gelobel_admin",
                email="admin@gelobel.com.br",
                name="Administrador Gelobel",
                client_id=client.id,
                roles=["admin"],
                allowed_screen_ids=["*"],
                is_staff=False,
                client_slug=client.slug,
                must_change_password=credential.must_change_password,
                credentials_version=credential.credentials_version,
            )
            override = self._profile_overrides.get(user.id)
            return user.model_copy(update=override.model_dump() if override else {})
        if client_slug and client_slug != "bhs-demo":
            raise NotFoundError("Usuario nao encontrado para o tenant informado.")
        client = self.get_client()
        if user_id and user_id != "usr_demo_admin":
            raise NotFoundError("Usuario nao encontrado.")
        credential = self._credential_states["usr_demo_admin"]
        user = User(
            id="usr_demo_admin",
            email=email or "admin@bhs.demo",
            name="Administrador Demo",
            client_id=client.id,
            roles=["admin"],
            allowed_screen_ids=["workspace-dados", "demo-vendas"],
            is_staff=False,
            client_slug=client.slug,
            must_change_password=credential.must_change_password,
            credentials_version=credential.credentials_version,
        )
        override = self._profile_overrides.get(user.id)
        return user.model_copy(update=override.model_dump() if override else {})

    async def update_current_user_profile(self, actor: User, payload: ProfileUpdateRequest) -> User:
        self._profile_overrides[actor.id] = payload
        return actor.model_copy(update=payload.model_dump())

    async def get_current_user_menu_order(self, actor: User) -> list[str]:
        return list(self._shared_menu_preferences.get((actor.id, actor.client_slug or "__staff__"), []))

    async def update_current_user_menu_order(self, actor: User, item_ids: list[str]) -> list[str]:
        self._shared_menu_preferences[(actor.id, actor.client_slug or "__staff__")] = list(item_ids)
        return list(item_ids)

    async def authenticate_user(self, email: str, password: str, client_slug: str | None = None) -> User | None:
        user_ids = {
            "staff@bhs.com.br": "usr_staff",
            "admin@bhs.demo": "usr_demo_admin",
            "admin@gelobel.com.br": "usr_gelobel_admin",
        }
        user_id = user_ids.get(email.lower())
        if user_id is None:
            return None
        credential = self._credential_states[user_id]
        if credential.must_change_password and (
            credential.temporary_password_expires_at is None
            or credential.temporary_password_expires_at <= datetime.now(timezone.utc)
        ):
            return None
        if not verify_password(password, credential.password_hash):
            return None
        return await self.get_current_user(email=email.lower(), client_slug=client_slug, user_id=user_id)

    async def get_credential_state(self, user_id: str) -> CredentialState:
        state = self._credential_states.get(user_id)
        if state is None:
            raise UnauthorizedError("Credencial invalida ou revogada.")
        return state

    async def change_password(self, user_id: str, expected_version: int, password_hash: str) -> int:
        state = await self.get_credential_state(user_id)
        if state.credentials_version != expected_version:
            raise UnauthorizedError("Credencial invalida ou revogada.")
        version = expected_version + 1
        self._credential_states[user_id] = CredentialState(password_hash, False, None, version)
        return version

    def set_temporary_credential(
        self,
        user_id: str,
        password: str,
        *,
        expires_at: datetime | None = None,
    ) -> None:
        current = self._credential_states[user_id]
        self._credential_states[user_id] = CredentialState(
            hash_password(password, iterations=1),
            True,
            expires_at or datetime.now(timezone.utc) + timedelta(hours=24),
            current.credentials_version + 1,
        )

    async def list_managed_users(self, client_slug: str | None = None) -> list[ManagedUser]:
        users = [
            ManagedUser(
                id="usr_staff",
                email="staff@bhs.com.br",
                name="Equipe BHS",
                status="active",
                is_staff=True,
                staff_role="master",
                roles=[],
                allowed_screen_ids=["*"],
            ),
            ManagedUser(
                id="usr_demo_admin",
                email="admin@bhs.demo",
                name="Administrador Demo",
                status="active",
                is_staff=False,
                client_id="cli_bhs_demo",
                client_slug="bhs-demo",
                roles=["admin"],
                allowed_screen_ids=["*"],
            ),
            *self._shared_managed_users.values(),
        ]
        if client_slug:
            users = [item for item in users if item.client_slug == client_slug]
        return users

    async def create_managed_user(self, payload: CreateManagedUserRequest) -> ManagedUser:
        if payload.is_staff and payload.client_slug:
            raise ConflictError("Usuario da equipe nao pode ser vinculado a um tenant.")
        if not payload.is_staff and not payload.client_slug:
            raise ConflictError("Usuario de cliente exige clientSlug.")
        if any(item.email == payload.email for item in await self.list_managed_users()):
            raise ConflictError("Ja existe um usuario com este e-mail.")
        index = len(self._shared_managed_users) + 1
        client = None
        if payload.client_slug == "bhs-demo":
            client = self.get_client()
        elif payload.client_slug == "acme-demo":
            client = Client(id="cli_acme_demo", name="ACME Demo", slug="acme-demo", status="active")
        if not payload.is_staff and client is None:
            raise NotFoundError("Tenant nao encontrado ou inativo.")
        item = ManagedUser(
            id=f"usr_managed_{index}",
            email=payload.email,
            name=payload.name,
            status="active",
            is_staff=payload.is_staff,
            staff_role=payload.staff_role,
            client_id=client.id if client else None,
            client_slug=client.slug if client else None,
            roles=list(payload.roles or (["viewer"] if not payload.is_staff else [])),
            allowed_screen_ids=list(payload.allowed_screen_ids),
        )
        self._shared_managed_users[item.id] = item
        return item

    async def update_managed_user(self, user_id: str, payload: UpdateManagedUserRequest) -> ManagedUser:
        item = self._shared_managed_users.get(user_id)
        if item is None:
            raise NotFoundError("Usuario nao encontrado.")
        updates = payload.model_dump(exclude_unset=True, by_alias=False)
        self._shared_managed_users[user_id] = item.model_copy(update=updates)
        return self._shared_managed_users[user_id]

    def list_data_sources(self) -> list[DataSource]:
        return [
            DataSource(
                id="ws-vendas-demo",
                kind="tenant_table",
                entity="vendas",
                allowed_fields=["mes", "receita", "pedidos", "canal"],
                allowed_filters=["mes", "canal"],
            )
        ]

    async def list_modules(self, client_id: str) -> list[Module]:
        if client_id == "cli_gelobel":
            return self._apply_visibility(client_id, [
                Module(
                    id="mensagens",
                    label="Mensagens",
                    icon="MessageCircle",
                    order=2,
                    screens=[
                        Screen(
                            id="mensagens-disparos-whatsapp",
                            module_id="mensagens",
                            label="Disparos no WhatsApp",
                            layout="canvas",
                            filters=[],
                            components=[],
                        )
                    ],
                ),
                Module(
                    id="simuladores",
                    label="Simuladores",
                    icon="Sliders",
                    order=3,
                    screens=[
                        Screen(
                            id="simulador-combos",
                            module_id="simuladores",
                            label="Simulador de Combos",
                            layout="canvas",
                            filters=[],
                            components=[],
                        )
                    ],
                ),
                Module(
                    id="configuracoes",
                    label="Configurações",
                    icon="Settings",
                    order=1,
                    screens=[
                        Screen(
                            id="configuracoes",
                            module_id="configuracoes",
                            label="Configurações",
                            layout="canvas",
                            filters=[],
                            components=[],
                        )
                    ],
                )
            ])
        demo_screen = await self.get_screen(client_id, "demo-vendas")
        return self._apply_visibility(client_id, [
            Module(
                id="mod-base-dados",
                label="Base de Dados",
                icon="Database",
                order=1,
                screens=[
                    Screen(
                        id="workspace-dados",
                        module_id="mod-base-dados",
                        label="Workspace de Dados",
                        layout="canvas",
                        filters=[],
                        components=[],
                    )
                ],
            ),
            Module(
                id="mod-demo-vendas",
                label="Demo Vendas",
                icon="BarChart3",
                order=2,
                screens=[demo_screen] if demo_screen else [],
            ),
        ])

    def _apply_visibility(self, client_id: str, modules: list[Module]) -> list[Module]:
        visibility = self._shared_visibility.get(client_id, {})
        hidden_modules = visibility.get("modules", set())
        hidden_screens = visibility.get("screens", set())
        return [
            module.model_copy(update={"screens": [screen for screen in module.screens if screen.id not in hidden_screens]})
            for module in modules
            if module.id not in hidden_modules
        ]

    async def get_screen(self, client_id: str, screen_id: str) -> Screen | None:
        visibility = self._shared_visibility.get(client_id, {})
        hidden_modules = visibility.get("modules", set())
        hidden_screens = visibility.get("screens", set())
        screen_modules = {
            "mensagens-disparos-whatsapp": "mensagens",
            "simulador-combos": "simuladores",
            "configuracoes": "configuracoes",
            "projecao-semanal": "gestao-bi",
            "demo-vendas": "mod-demo-vendas",
        }
        if screen_id in hidden_screens or screen_modules.get(screen_id) in hidden_modules:
            return None
        if client_id == "cli_gelobel" and screen_id == "mensagens-disparos-whatsapp":
            return Screen(
                id="mensagens-disparos-whatsapp",
                module_id="mensagens",
                label="Disparos no WhatsApp",
                layout="canvas",
                filters=[],
                components=[],
            )
        if client_id == "cli_gelobel" and screen_id == "simulador-combos":
            return Screen(
                id="simulador-combos",
                module_id="simuladores",
                label="Simulador de Combos",
                layout="canvas",
                filters=[],
                components=[],
            )
        if client_id == "cli_gelobel" and screen_id == "configuracoes":
            return Screen(
                id="configuracoes",
                module_id="configuracoes",
                label="Configurações",
                layout="canvas",
                filters=[],
                components=[],
            )
        if client_id == "cli_gelobel" and screen_id == "projecao-semanal":
            return Screen(
                id="projecao-semanal",
                module_id="gestao-bi",
                label="Projeção Semanal",
                layout="canvas",
                filters=[],
                components=[],
            )
        if screen_id != "demo-vendas":
            return None

        return Screen(
            id="demo-vendas",
            module_id="mod-demo-vendas",
            label="Visao de Vendas",
            layout="dashboard",
            filters=[],
            components=[
                Widget(
                    id="wid-receita-canal",
                    type="chart",
                    title="Receita por canal",
                    grid_span=2,
                    data_source_id="ws-vendas-demo",
                    template_key="receita_por_canal",
                    binding_id="bind-receita-canal",
                    chart_config=ChartConfig(
                        id="chart-receita-canal",
                        workspace_id="ws-vendas-demo",
                        type="bar",
                        title="Receita por canal",
                        description="Mock contratual para validar renderizacao dinamica.",
                        dimensions=[ChartDimension(field="canal", label="Canal")],
                        metrics=[
                            ChartMetric(
                                field="receita",
                                label="Receita",
                                aggregation="sum",
                                format="currency",
                            )
                        ],
                        options={"color": "#2563eb", "showLegend": False},
                    ),
                )
            ],
        )

    async def get_client_by_slug(self, client_slug: str) -> Client | None:
        if client_slug == "gelobel":
            return self.get_gelobel_client()
        client = self.get_client()
        return client if client.slug == client_slug else None

    async def get_validation_catalog(self, client_slug: str) -> dict:
        _ = client_slug
        return {
            "modules": {"mod-base-dados", "mod-demo-vendas"},
            "screens": {"workspace-dados": "mod-base-dados", "demo-vendas": "mod-demo-vendas"},
            "data_sources": {
                "ds_vendas": {
                    "allowed_fields": {"channel", "revenue", "orders_count"},
                    "allowed_filters": {"channel"},
                },
                "ws-vendas-demo": {
                    "allowed_fields": {"canal", "receita", "pedidos"},
                    "allowed_filters": {"canal"},
                }
            },
            "template_bindings": {
                "bind-receita-canal": {
                    "client_id": "cli_bhs_demo",
                    "status": "active",
                    "data_source_id": "ws-vendas-demo",
                    "data_source_key": "ws-vendas-demo",
                    "template_key": "receita_por_canal",
                },
                "bind-pedidos-canal": {
                    "client_id": "cli_bhs_demo",
                    "status": "active",
                    "data_source_id": "ds_vendas",
                    "data_source_key": "ds_vendas",
                    "template_key": "pedidos_por_canal",
                }
            },
        }

    async def list_clients(self) -> list[Client]:
        return [
            Client(id="cli_bhs_demo", name="BHS Demo", slug="bhs-demo", status="active"),
            Client(id="cli_acme_demo", name="ACME Demo", slug="acme-demo", status="active"),
            self.get_gelobel_client(),
        ]

    async def get_client_visibility(self, client_slug: str) -> ClientVisibilityResponse:
        client = await self.get_client_by_slug(client_slug)
        if client is None:
            raise NotFoundError("Cliente nao encontrado.")
        saved = self._shared_visibility.pop(client.id, None)
        try:
            modules = await self.list_modules(client.id)
        finally:
            if saved is not None:
                self._shared_visibility[client.id] = saved
        visibility = self._shared_visibility.get(client.id, {})
        hidden_modules = visibility.get("modules", set())
        hidden_screens = visibility.get("screens", set())
        return ClientVisibilityResponse(
            clientSlug=client_slug,
            modules=[
                VisibleModule(
                    id=module.id, label=module.label, visible=module.id not in hidden_modules,
                    screens=[VisibleScreen(id=screen.id, label=screen.label, visible=screen.id not in hidden_screens) for screen in module.screens],
                )
                for module in modules
            ],
        )

    async def set_client_visibility(self, client_slug: str, target_type: str, target_id: str, visible: bool, actor_id: str | None = None) -> ClientVisibilityResponse:
        _ = actor_id
        client = await self.get_client_by_slug(client_slug)
        if client is None:
            raise NotFoundError("Cliente nao encontrado.")
        manifest = await self.get_client_visibility(client_slug)
        valid_ids = {module.id for module in manifest.modules} if target_type == "module" else {screen.id for module in manifest.modules for screen in module.screens}
        if target_id not in valid_ids:
            raise NotFoundError("Modulo ou tela nao encontrado.")
        visibility = self._shared_visibility.setdefault(client.id, {"modules": set(), "screens": set()})
        hidden = visibility["modules" if target_type == "module" else "screens"]
        hidden.discard(target_id) if visible else hidden.add(target_id)
        return await self.get_client_visibility(client_slug)

    async def get_tenant_catalog(self, client_slug: str) -> TenantCatalog:
        _ = client_slug
        return TenantCatalog.model_validate(
            {
                "client": {"id": "cli_bhs_demo", "name": "BHS Demo", "slug": "bhs-demo", "status": "active"},
                "tenant_schema": "tenant_bhs_demo",
                "objects": [
                    {
                        "name": "vw_sales_summary",
                        "object_type": "view",
                        "registered": True,
                        "data_source_key": "vendas",
                        "columns": [
                            {"name": "channel", "data_type": "text", "is_nullable": False},
                            {"name": "revenue", "data_type": "numeric", "is_nullable": True},
                            {"name": "orders_count", "data_type": "bigint", "is_nullable": True},
                        ],
                    },
                    {
                        "name": "sales_orders",
                        "object_type": "table",
                        "registered": False,
                        "data_source_key": None,
                        "columns": [
                            {"name": "order_date", "data_type": "date", "is_nullable": False},
                            {"name": "channel", "data_type": "text", "is_nullable": False},
                            {"name": "revenue", "data_type": "numeric", "is_nullable": False},
                        ],
                    },
                ],
                "data_sources": [
                    {
                        "id": "ds_vendas",
                        "key": "vendas",
                        "kind": "tenant_view",
                        "entity": "vw_sales_summary",
                        "allowed_fields": ["channel", "revenue", "orders_count"],
                        "allowed_filters": ["channel"],
                        "active": True,
                        "fields": [
                            {
                                "id": "dsf_channel",
                                "data_source_id": "ds_vendas",
                                "field_name": "channel",
                                "display_name": "Canal",
                                "technical_type": "category",
                                "semantic_role": "dimension",
                                "business_meaning": "Canal de venda do pedido.",
                                "synonyms": ["canal", "origem"],
                                "example_values": ["Online", "Loja"],
                                "allowed_aggregations": [],
                                "is_filterable": True,
                                "is_groupable": True,
                                "is_sensitive": False,
                                "quality_notes": "",
                                "status": "active",
                            },
                            {
                                "id": "dsf_revenue",
                                "data_source_id": "ds_vendas",
                                "field_name": "revenue",
                                "display_name": "Receita",
                                "technical_type": "currency",
                                "semantic_role": "metric",
                                "business_meaning": "Valor total vendido no periodo.",
                                "synonyms": ["faturamento", "venda"],
                                "example_values": [1200.5],
                                "allowed_aggregations": ["sum", "avg"],
                                "is_filterable": False,
                                "is_groupable": False,
                                "is_sensitive": False,
                                "quality_notes": "",
                                "status": "active",
                            },
                        ],
                    }
                ],
            }
        )

    async def upsert_data_source(self, client_slug: str, payload: DataSourceCreateRequest) -> TenantCatalog:
        _ = (client_slug, payload)
        return await self.get_tenant_catalog(client_slug)

    async def upsert_data_source_field(
        self,
        client_slug: str,
        data_source_key: str,
        payload: DataSourceFieldUpsertRequest,
    ) -> TenantCatalog:
        _ = (client_slug, data_source_key, payload)
        return await self.get_tenant_catalog(client_slug)

    async def list_versions(self, client_slug: str) -> list[PublishedVersion]:
        return list(self._versions.get(client_slug, []))

    async def get_version(self, client_slug: str, version: int) -> PublishedVersion | None:
        return next((item for item in self._versions.get(client_slug, []) if item.version == version), None)

    async def create_draft(self, client_slug: str, config: dict) -> PublishedVersion:
        client = await self.get_client_by_slug(client_slug)
        client_id = client.id if client else "cli_bhs_demo"
        versions = self._versions.setdefault(client_slug, [])
        next_version = max((item.version for item in versions), default=0) + 1
        draft = PublishedVersion(
            id=f"ver_{client_slug}_{next_version}",
            client_id=client_id,
            version=next_version,
            status="draft",
            config=config,
            validationErrors=[],
        )
        versions.insert(0, draft)
        return draft

    async def mark_validated(
        self,
        client_slug: str,
        version: int,
        user_id: str,
        errors: list[str],
    ) -> PublishedVersion:
        item = await self.get_version(client_slug, version)
        if item is None:
            raise KeyError(version)
        updated = item.model_copy(
            update={
                "status": "validated",
                "validation_errors": errors,
                "validated_by": user_id,
                "validated_at": datetime.now(timezone.utc),
            }
        )
        self._versions[client_slug] = [updated if old.version == version else old for old in self._versions[client_slug]]
        return updated

    async def mark_validation_failed(self, client_slug: str, version: int, errors: list[str]) -> PublishedVersion:
        item = await self.get_version(client_slug, version)
        if item is None:
            raise KeyError(version)
        updated = item.model_copy(update={"validation_errors": errors})
        self._versions[client_slug] = [updated if old.version == version else old for old in self._versions[client_slug]]
        return updated

    async def publish_version(self, client_slug: str, version: int, user_id: str) -> PublishedVersion:
        item = await self.get_version(client_slug, version)
        if item is None:
            raise KeyError(version)
        updated = item.model_copy(update={"status": "published", "published_by": user_id, "published_at": datetime.now(timezone.utc)})
        self._versions[client_slug] = [updated if old.version == version else old for old in self._versions[client_slug]]
        return updated

    async def rollback_version(self, client_slug: str, version: int, user_id: str) -> PublishedVersion:
        _ = user_id
        return await self.publish_version(client_slug, version, user_id)

    async def archive_version(self, client_slug: str, version: int) -> PublishedVersion:
        item = await self.get_version(client_slug, version)
        if item is None:
            raise KeyError(version)
        updated = item.model_copy(update={"status": "archived", "archived_at": datetime.now(timezone.utc)})
        self._versions[client_slug] = [updated if old.version == version else old for old in self._versions[client_slug]]
        return updated

    async def list_visual_templates(self) -> list[VisualTemplate]:
        return list(self._templates.values())

    async def upsert_visual_template(self, payload: VisualTemplateUpsertRequest) -> VisualTemplate:
        existing = next((item for item in self._templates.values() if item.key == payload.key), None)
        template_id = existing.id if existing else f"tpl_{payload.key}"
        template = VisualTemplate(id=template_id, **payload.model_dump())
        self._templates[template.id] = template
        return template

    async def list_template_bindings(self, client_slug: str) -> list[TenantTemplateBinding]:
        client = await self.get_client_by_slug(client_slug)
        if client is None:
            return []
        return [binding for binding in self._bindings.values() if binding.client_id == client.id]

    async def get_template_binding(self, client_slug: str, binding_id: str) -> TenantTemplateBinding | None:
        bindings = await self.list_template_bindings(client_slug)
        return next((binding for binding in bindings if binding.id == binding_id), None)

    async def upsert_template_binding(
        self,
        client_slug: str,
        payload: TenantTemplateBindingUpsertRequest,
    ) -> TenantTemplateBinding:
        client = await self.get_client_by_slug(client_slug)
        client_id = client.id if client else "cli_bhs_demo"
        binding_id = f"bind_{client_slug.replace('-', '_')}_{len(self._bindings) + 1}"
        binding = TenantTemplateBinding(id=binding_id, client_id=client_id, **payload.model_dump())
        self._bindings[binding.id] = binding
        return binding

    async def set_template_binding_validation(
        self,
        client_slug: str,
        binding_id: str,
        errors: list[str],
        user_id: str,
    ) -> TenantTemplateBinding:
        _ = user_id
        binding = await self.get_template_binding(client_slug, binding_id)
        if binding is None:
            raise KeyError(binding_id)
        status = "draft" if errors else "active"
        updated = binding.model_copy(update={"status": status, "validation_errors": errors})
        self._bindings[binding_id] = updated
        return updated

    async def list_screen_instances(self, client_slug: str) -> list[ScreenInstance]:
        client = await self.get_client_by_slug(client_slug)
        if client is None:
            return []
        return [screen for screen in self._screens.values() if screen.client_id == client.id]

    async def upsert_screen_instance(self, client_slug: str, payload: ScreenInstanceUpsertRequest) -> ScreenInstance:
        client = await self.get_client_by_slug(client_slug)
        client_id = client.id if client else "cli_bhs_demo"
        existing = next(
            (item for item in self._screens.values() if item.client_id == client_id and item.screen_key == payload.screen_key),
            None,
        )
        screen_id = existing.id if existing else f"scr_{payload.screen_key.replace('-', '_')}"
        widgets = [
            widget.model_copy(update={"screen_instance_id": screen_id})
            for widget in payload.widgets
        ]
        screen = ScreenInstance(id=screen_id, client_id=client_id, **payload.model_dump(exclude={"widgets"}), widgets=widgets)
        self._screens[screen.screen_key] = screen
        return screen
