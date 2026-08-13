export type RFVCluster = 'Champions' | 'Loyal' | 'At Risk' | 'About to Sleep' | 'New';

export interface Customer {
  id: string;
  name: string;
  recency: number; // days since last order
  frequency: number; // number of orders
  value: number; // total spent
  region: string; // State abbreviation (e.g. SP, RJ, MG)
  cluster: RFVCluster;
}

export interface Meta {
  id: string;
  category: string;
  branch: string; // Branch name (e.g. Filial SP, Filial RJ)
  vendedor?: string;
  empresa?: string;
  target: number; // Target monetary value
  actual: number; // Actual monetary value achieved
  period: string; // Month/Year (e.g. "Jun/2026")
}

export type UserRole = 'Admin' | 'Analista' | 'Leitor';

export interface UserPermission {
  screen: string;
  access: 'None' | 'Read' | 'Write';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: UserPermission[];
}

export interface SyncLog {
  id: string;
  timestamp: string;
  status: 'Success' | 'Failed';
  rowsProcessed: number;
  durationSeconds: number;
  initiatedBy: string;
}

export type DataMode = 'mock' | 'api';

export type DataStatus = 'ready' | 'loading' | 'fallback' | 'error';

export interface DashboardDataSnapshot {
  customers: Customer[];
  metas: Meta[];
  users: User[];
  syncLogs: SyncLog[];
  lastUpdated: string;
}

export type AdsPlatform = 'meta' | 'google-analytics';

export interface AdsKpi {
  id: string;
  label: string;
  value: string;
  delta: string;
  tone: 'blue' | 'emerald' | 'amber' | 'rose' | 'slate';
}

export interface AdsTimeSeriesPoint {
  label: string;
  investimento?: number;
  receita?: number;
  leads?: number;
  cpl?: number;
  sessoes?: number;
  usuarios?: number;
  conversoes?: number;
  engajamento?: number;
}

export interface AdsBreakdownItem {
  name: string;
  value: number;
  color: string;
}

export interface AdsRankingItem {
  name: string;
  value: number;
  secondary?: string;
}

export interface AdsPlatformSummary {
  title: string;
  spend?: number;
  revenue?: number;
  conversions?: number;
  roas?: number;
  sessions?: number;
  engagementRate?: number;
}

export interface AdsDashboard {
  platform: AdsPlatform;
  title: string;
  subtitle: string;
  kpis: AdsKpi[];
  timeline: AdsTimeSeriesPoint[];
  summaryCards: AdsPlatformSummary[];
  breakdown: AdsBreakdownItem[];
  ranking: AdsRankingItem[];
  channelPerformance: AdsRankingItem[];
}

export interface AdsDashboardSnapshot {
  meta: AdsDashboard;
  googleAnalytics: AdsDashboard;
  lastUpdated: string;
}

export type WorkspaceType = 'csv' | 'sqlite' | 'excel' | 'api' | 'sqlserver';
export type FieldDataType = 'Text' | 'Number' | 'Date' | 'Currency' | 'Boolean' | 'Category';

export interface ConnectionParams {
  url?: string;
  authType?: 'none' | 'bearer' | 'apikey' | 'basic';
  authToken?: string;
  headers?: { key: string; value: string }[];
  host?: string;
  port?: string;
  databaseName?: string;
  username?: string;
  password?: string;
  timeout?: number;
  refreshInterval?: 'manual' | 'hourly' | 'daily';
}

export interface WorkspaceField {
  name: string;
  type: FieldDataType;
  description: string;
  example: string;
}

export interface WorkspaceSource {
  id: string;
  name: string;
  type: WorkspaceType;
  fileNameOrConn: string;
  gatewayStatus: 'connected' | 'disconnected' | 'maintenance';
  lastSynced: string;
  fields: WorkspaceField[];
  isActiveForAgent: boolean;
  connectionParams?: ConnectionParams;
}

export type ChartVisualType = 'bar' | 'line' | 'pie' | 'kpi';

export interface ChartMetric {
  field: string;
  label: string;
  aggregation: 'sum' | 'count' | 'avg';
  format?: 'currency' | 'number' | 'percent';
}

export interface ChartDimension {
  field: string;
  label: string;
}

export interface ChartConfig {
  id: string;
  workspaceId: string;
  type: ChartVisualType;
  title: string;
  description: string;
  dimensions: ChartDimension[];
  metrics: ChartMetric[];
  options?: {
    color?: string;
    colors?: string[];
    showLegend?: boolean;
    goalValue?: number;
    presetType?: 'simple' | 'compare' | 'horizontal';
  };
}

export type QueryFilterValue = string | number | boolean | Array<string | number | boolean>;

export interface QueryRequest {
  screenId: string;
  widgetId: string;
  filters: Record<string, QueryFilterValue>;
  limit?: number;
}

export interface QueryResponse {
  screenId: string;
  widgetId: string;
  dataSourceId: string;
  kind: 'chart' | 'kpi_card' | 'table';
  rows: Record<string, unknown>[];
  metadata: {
    clientSlug: string;
    rowCount: number;
    appliedFilters: string[];
  };
}

export interface TenantSalesOrderRow {
  order_date: string;
  channel: string;
  branch: string;
  customer_name: string;
  revenue: number;
  orders_count: number;
}

export interface SalesOverviewResponse {
  screenId: string;
  clientSlug: string;
  rows: TenantSalesOrderRow[];
}

export interface TenantComboProductRow {
  product_id: number;
  company: string;
  code: string;
  description: string;
  unit: string | null;
  unit_cost: number | null;
  unit_price: number | null;
}

export interface ComboSimulatorProductsResponse {
  screenId: string;
  clientSlug: string;
  companies: string[];
  rows: TenantComboProductRow[];
}

export interface SavedComboSimulationProduct {
  id: string;
  name: string;
  qty: number;
  cost: number;
  price: number;
  markup: number;
  simulatedCost?: number | null;
  simulatedPrice?: number | null;
}

export interface SavedComboSimulation {
  id: string;
  name: string;
  createdAt: string;
  products: SavedComboSimulationProduct[];
}

export interface SalesProjectionRow {
    sales_date: string;
    quantity_sold: number;
    quantity_projected: number | null;
    quantity_completion_pct: number | null;
    revenue: number;
    revenue_projected: number | null;
  revenue_completion_pct: number | null;
  goal: number | null;
  goal_completion_pct: number | null;
}

export interface SalesProjectionResponse {
  screenId: string;
  clientSlug: string;
  month: string | null;
  months: string[];
  companies: string[];
  rows: SalesProjectionRow[];
}

export interface SalesProjectionAggregateRow {
  id: number;
  company: string;
  label: string;
  total: number;
}

export interface SalesProjectionMonthlySeriesPoint {
  month: string;
  total: number;
  goal: number | null;
}

export interface SalesProjectionWeeklyRow {
  week: number;
  quantity_sold: number;
  quantity_projected: number | null;
  quantity_completion_pct: number | null;
  revenue: number;
  revenue_projected: number | null;
  revenue_completion_pct: number | null;
  goal: number | null;
  goal_completion_pct: number | null;
}

export interface SalesProjectionWeeklyResponse extends SalesProjectionResponse {
  year: number | null;
  years: number[];
  groupTotals: SalesProjectionAggregateRow[];
  productTotals: SalesProjectionAggregateRow[];
  attendantTotals: SalesProjectionAggregateRow[];
  monthlySeries: SalesProjectionMonthlySeriesPoint[];
  weeklyRows: SalesProjectionWeeklyRow[];
}

export interface ScreenFilterOption {
  value: string;
  label: string;
}

export interface ScreenFilterConfig {
  period?: {
    label: string;
    allLabel?: string;
    options: ScreenFilterOption[];
  };
  branch?: {
    label: string;
    allLabel?: string;
    allowAll?: boolean;
    options: ScreenFilterOption[];
  };
}

export interface AppWidget {
  id?: string;
  type: 'chart' | 'kpi_card' | 'table';
  title?: string;
  gridSpan?: 1 | 2 | 3 | 4; // 1 = 25% (col-span-3), 2 = 50% (col-span-6), 3 = 75% (col-span-8), 4 = 100% (col-span-12)
  presentation?: WidgetPresentation;
  dataSourceId?: string;
  tablePreset?: 'simple' | 'enriched' | 'progressbar';

  isEnriched?: boolean;
  enrichmentOptions?: {
    showSearch?: boolean;
    showSort?: boolean;
    cellProgressBarField?: string;
    goalValue?: number;
  };
  chartConfig?: ChartConfig;
  kpiConfig?: {
    workspaceId: string;
    field: string;
    aggregation: 'sum' | 'count' | 'avg';
    label: string;
    format?: 'currency' | 'number';
  };
  tableConfig?: {
    workspaceId: string;
    title: string;
  };
}

export type LayoutPreset =
  | 'kpi.compact'
  | 'chart.simple'
  | 'chart.comparison'
  | 'chart.detailed'
  | 'table.compact'
  | 'table.wide';

export type LabelPolicy = 'adaptive' | 'all' | 'hidden';

export type ValueFormat =
  | 'auto'
  | 'number.compact'
  | 'number.full'
  | 'currency.compact'
  | 'currency.full'
  | 'percent';

export interface WidgetPresentation {
  layoutPreset: LayoutPreset;
  labelPolicy?: LabelPolicy;
  valueFormat?: ValueFormat;
}

export interface AppScreen {
  id: string;
  label: string;
  layout: 'dashboard' | 'canvas';
  components: AppWidget[];
}

export interface AppModule {
  id: string;
  label: string;
  icon: string;
  screens: AppScreen[];
  newCalculatedFields?: CalculatedField[]; // Optional formula registry payload returned from IA
}

export interface CalculatedField {
  id: string;
  workspaceId: string;
  label: string;
  formulaType: 'expression' | 'moving_average' | 'growth_multiplier';
  sourceField: string;
  expression: string;
  windowSize?: number;
}

export interface Client {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive' | 'suspended';
}

export interface TenantCatalogColumn {
  name: string;
  data_type: string;
  is_nullable: boolean;
}

export interface TenantCatalogObject {
  name: string;
  object_type: 'table' | 'view';
  columns: TenantCatalogColumn[];
  registered: boolean;
  data_source_key?: string | null;
}

export interface TenantCatalogDataSource {
  id: string;
  key: string;
  kind: 'tenant_table' | 'tenant_view' | 'internal_metric';
  entity: string;
  allowed_fields: string[];
  allowed_filters: string[];
  active: boolean;
  fields: DataSourceField[];
}

export interface TenantCatalog {
  client: Client;
  tenant_schema: string;
  objects: TenantCatalogObject[];
  data_sources: TenantCatalogDataSource[];
}

export interface DataSourceCreateRequest {
  key: string;
  entity: string;
  kind: 'tenant_table' | 'tenant_view';
  allowed_fields: string[];
  allowed_filters: string[];
  active: boolean;
}

export type DataSourceFieldTechnicalType = 'text' | 'number' | 'currency' | 'percent' | 'date' | 'datetime' | 'boolean' | 'category' | 'id';
export type DataSourceFieldSemanticRole = 'dimension' | 'metric' | 'date' | 'filter' | 'identifier' | 'description';
export type DataSourceFieldStatus = 'active' | 'hidden' | 'deprecated';

export interface DataSourceField {
  id: string;
  data_source_id: string;
  field_name: string;
  display_name: string;
  technical_type: DataSourceFieldTechnicalType;
  semantic_role: DataSourceFieldSemanticRole;
  business_meaning: string;
  synonyms: string[];
  example_values: unknown[];
  allowed_aggregations: string[];
  is_filterable: boolean;
  is_groupable: boolean;
  is_sensitive: boolean;
  quality_notes: string;
  status: DataSourceFieldStatus;
}

export type DataSourceFieldUpsertRequest = Omit<DataSourceField, 'id' | 'data_source_id'>;

export interface TemplateRequirement {
  key: string;
  label: string;
  types: string[];
  required: boolean;
  aggregations: string[];
  format?: string | null;
}

export interface TemplateSemanticRequirements {
  dimensions: TemplateRequirement[];
  metrics: TemplateRequirement[];
  filters: TemplateRequirement[];
}

export interface VisualTemplate {
  id: string;
  key: string;
  name: string;
  description: string;
  template_type: 'chart' | 'kpi_card' | 'table';
  visual_type: 'bar' | 'line' | 'pie' | 'area' | 'composed' | 'number' | 'table';
  semantic_requirements: TemplateSemanticRequirements;
  default_options: Record<string, unknown>;
  status: 'draft' | 'active' | 'deprecated';
}

export interface TenantTemplateBinding {
  id: string;
  client_id: string;
  template_id: string;
  data_source_id: string;
  field_mapping: { fields: Record<string, string>; filters: Record<string, string> };
  default_title: string;
  default_description: string;
  status: 'draft' | 'validated' | 'active' | 'disabled';
  validation_errors: string[];
}

export type VisualTemplateUpsertRequest = Omit<VisualTemplate, 'id'>;
export type TenantTemplateBindingUpsertRequest = Omit<TenantTemplateBinding, 'id' | 'client_id'>;

export interface ScreenWidgetInstance {
  id: string;
  screen_instance_id: string;
  binding_id: string;
  widget_key: string;
  title_override?: string | null;
  description_override?: string | null;
  grid_span: number;
  sort_order: number;
  options_override: Record<string, unknown>;
}

export interface ScreenInstance {
  id: string;
  client_id: string;
  module_key: string;
  screen_key: string;
  label: string;
  layout: Record<string, unknown>;
  status: 'draft' | 'published' | 'archived';
  widgets: ScreenWidgetInstance[];
}

export type ScreenInstanceUpsertRequest = Omit<ScreenInstance, 'id' | 'client_id'>;

export interface BackendUser {
  id: string;
  email: string;
  name: string;
  client_id: string | null;
  roles: string[];
  allowed_screen_ids: string[];
  is_staff?: boolean;
  staff_role?: 'master' | null;
  client_slug?: string | null;
  must_change_password?: boolean;
  credentials_version?: number;
  whatsapp_phone_e164?: string | null;
  level: UserLevel;
}

export interface ProfileUpdateRequest {
  name: string;
  whatsapp_phone_e164: string | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: 'bearer';
  password_change_required: boolean;
  user: BackendUser;
}

export interface ManagedUser {
  id: string;
  email: string;
  name: string;
  status: 'active' | 'inactive';
  is_staff: boolean;
  staff_role?: 'master' | null;
  client_id?: string | null;
  client_slug?: string | null;
  roles: string[];
  allowed_screen_ids: string[];
  permissions?: ScreenPermissionInput[];
  must_change_password?: boolean;
  credentials_version?: number;
  level: UserLevel;
}

export interface CreateManagedUserRequest {
  email: string;
  name: string;
  password: string;
  is_staff: boolean;
  staff_role?: 'master' | null;
  clientSlug?: string | null;
  roles: string[];
  allowedScreenIds: string[];
}

export type UserLevel = 'team' | 'tenant_master' | 'common_user';
export type ScreenAccess = 'none' | 'read' | 'write';
export type PasswordMode = 'generated' | 'defined';

export interface TemporaryPasswordRequest {
  mode: PasswordMode;
  password?: string;
}

export type ResetPasswordRequest = TemporaryPasswordRequest;

export interface ScreenPermissionInput {
  screenId: string;
  access: ScreenAccess;
}

export interface TenantMasterCreateRequest {
  email: string;
  name: string;
  clientSlug: string;
  temporaryPassword: TemporaryPasswordRequest;
}

export interface TenantMasterUpdateRequest {
  name?: string;
  status?: 'active' | 'inactive';
}

export interface TenantUserCreateRequest {
  email: string;
  name: string;
  temporaryPassword: TemporaryPasswordRequest;
  permissions: ScreenPermissionInput[];
}

export interface TenantUserUpdateRequest {
  name?: string;
  status?: 'active' | 'inactive';
}

export interface ReplaceScreenPermissionsRequest {
  permissions: ScreenPermissionInput[];
}

export interface ChangePasswordRequest {
  currentPassword?: string;
  newPassword: string;
}

export interface OneTimePasswordResponse {
  temporaryPassword: string;
  expiresAt: string;
}

export interface ProvisionedUserResponse extends OneTimePasswordResponse {
  user: ManagedUser;
}

export interface PublishedVersion {
  id: string;
  client_id: string;
  version: number;
  status: 'draft' | 'validated' | 'published' | 'archived';
  config?: any;
  validationErrors?: string[];
  validatedBy?: string | null;
  validatedAt?: string | null;
  published_by?: string | null;
  published_at?: string | null;
  archivedAt?: string | null;
}

export interface ConfigValidationResponse {
  valid: boolean;
  errors: string[];
}

export interface MenuOrderResponse {
  itemIds: string[];
}

export interface UserMenuOrderResponse {
  itemIds: string[];
}

export interface AreaUpdateStatus {
  area: string;
  label: string;
  lastUpdatedAt: string | null;
  rowsCount: number | null;
  status: 'ok' | 'stale' | 'error';
}

export interface UpdateRun {
  id: string;
  area: string;
  status: string;
  trigger: string;
  rowsAffected: number | null;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface RefreshRequest {
  area?: string | null;
}

export interface RefreshResponse {
  run: UpdateRun;
  areas: AreaUpdateStatus[];
}
