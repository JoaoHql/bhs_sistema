import type {
  AppModule,
  AppScreen,
  Client,
  PublishedVersion,
  BackendUser,
  LoginResponse,
  DataSourceCreateRequest,
  DataSourceFieldUpsertRequest,
  TenantCatalog,
  VisualTemplate,
  VisualTemplateUpsertRequest,
  TenantTemplateBinding,
  TenantTemplateBindingUpsertRequest,
  ScreenInstance,
  ScreenInstanceUpsertRequest,
  ManagedUser,
  OneTimePasswordResponse,
  ProvisionedUserResponse,
  ResetPasswordRequest,
  TenantMasterCreateRequest,
  TenantMasterUpdateRequest,
  TenantUserCreateRequest,
  TenantUserUpdateRequest,
  ReplaceScreenPermissionsRequest,
  ChangePasswordRequest,
  ProfileUpdateRequest,
  UserMenuOrderResponse,
} from '../types';
import { apiClient } from './apiClient';


export interface HealthResponse {
  status: 'ok';
  service: string;
}

export interface ClientVisibilityScreen { id: string; label: string; visible: boolean; }
export interface ClientVisibilityModule { id: string; label: string; visible: boolean; screens: ClientVisibilityScreen[]; }
export interface ClientVisibilityResponse { clientSlug: string; modules: ClientVisibilityModule[]; }

export const isConfigApiEnabled = () => {
  const override = localStorage.getItem('bhs_config_api_enabled');
  if (override !== null) {
    return override === 'true';
  }
  return import.meta.env.VITE_CONFIG_API_ENABLED === 'true';
};

export const configApi = {
  health(): Promise<HealthResponse> {
    return apiClient.get<HealthResponse>('/api/v1/health');
  },

  me(): Promise<BackendUser> {
    return apiClient.get<BackendUser>('/api/v1/me');
  },

  updateProfile(payload: ProfileUpdateRequest): Promise<BackendUser> {
    return apiClient.patch<ProfileUpdateRequest, BackendUser>('/api/v1/me', payload);
  },

  userMenuOrder(): Promise<UserMenuOrderResponse> {
    return apiClient.get<UserMenuOrderResponse>('/api/v1/me/preferences/menu-order');
  },

  updateUserMenuOrder(itemIds: string[]): Promise<UserMenuOrderResponse> {
    return apiClient.put<{ itemIds: string[] }, UserMenuOrderResponse>('/api/v1/me/preferences/menu-order', { itemIds });
  },

  login(email: string, password: string, clientSlug?: string): Promise<LoginResponse> {
    return apiClient.post<{ email: string, password: string, clientSlug?: string }, LoginResponse>('/api/v1/auth/login', { email, password, ...(clientSlug ? { clientSlug } : {}) });
  },

  changePassword(payload: ChangePasswordRequest): Promise<LoginResponse> {
    return apiClient.post<ChangePasswordRequest, LoginResponse>('/api/v1/auth/change-password', payload);
  },

  listTenantUsers(): Promise<ManagedUser[]> {
    return apiClient.get<ManagedUser[]>('/api/v1/tenant/users');
  },

  createTenantUser(payload: TenantUserCreateRequest): Promise<ProvisionedUserResponse> {
    return apiClient.post<TenantUserCreateRequest, ProvisionedUserResponse>('/api/v1/tenant/users', payload);
  },

  updateTenantUser(userId: string, payload: TenantUserUpdateRequest): Promise<ManagedUser> {
    return apiClient.patch<TenantUserUpdateRequest, ManagedUser>(`/api/v1/tenant/users/${encodeURIComponent(userId)}`, payload);
  },

  deleteTenantUser(userId: string): Promise<void> {
    return apiClient.delete<void>(`/api/v1/tenant/users/${encodeURIComponent(userId)}`);
  },

  resetTenantUserPassword(userId: string, payload: ResetPasswordRequest): Promise<OneTimePasswordResponse> {
    return apiClient.post<ResetPasswordRequest, OneTimePasswordResponse>(`/api/v1/tenant/users/${encodeURIComponent(userId)}/reset-password`, payload);
  },

  replaceTenantUserPermissions(userId: string, payload: ReplaceScreenPermissionsRequest): Promise<ManagedUser> {
    return apiClient.put<ReplaceScreenPermissionsRequest, ManagedUser>(`/api/v1/tenant/users/${encodeURIComponent(userId)}/permissions`, payload);
  },

  listTenantMasters(): Promise<ManagedUser[]> {
    return apiClient.get<ManagedUser[]>('/api/v1/internal/masters');
  },

  createTenantMaster(payload: TenantMasterCreateRequest): Promise<ProvisionedUserResponse> {
    return apiClient.post<TenantMasterCreateRequest, ProvisionedUserResponse>('/api/v1/internal/masters', payload);
  },

  updateTenantMaster(userId: string, payload: TenantMasterUpdateRequest): Promise<ManagedUser> {
    return apiClient.patch<TenantMasterUpdateRequest, ManagedUser>(
      `/api/v1/internal/masters/${encodeURIComponent(userId)}`,
      payload,
    );
  },

  deleteTenantMaster(userId: string): Promise<void> {
    return apiClient.delete<void>(`/api/v1/internal/masters/${encodeURIComponent(userId)}`);
  },

  resetTenantMasterPassword(userId: string, payload: ResetPasswordRequest): Promise<OneTimePasswordResponse> {
    return apiClient.post<ResetPasswordRequest, OneTimePasswordResponse>(
      `/api/v1/internal/masters/${encodeURIComponent(userId)}/reset-password`,
      payload,
    );
  },

  modules(): Promise<AppModule[]> {
    return apiClient.get<AppModule[]>('/api/v1/modules');
  },

  screen(screenId: string): Promise<AppScreen> {
    return apiClient.get<AppScreen>(`/api/v1/screens/${encodeURIComponent(screenId)}`);
  },

  listClients(): Promise<Client[]> {
    return apiClient.get<Client[]>('/api/v1/internal/clients');
  },

  clientVisibility(clientSlug: string): Promise<ClientVisibilityResponse> {
    return apiClient.get<ClientVisibilityResponse>(`/api/v1/internal/clients/${encodeURIComponent(clientSlug)}/visibility`);
  },

  updateClientVisibility(clientSlug: string, targetType: 'module' | 'screen', targetId: string, visible: boolean): Promise<ClientVisibilityResponse> {
    return apiClient.put<{ visible: boolean }, ClientVisibilityResponse>(
      `/api/v1/internal/clients/${encodeURIComponent(clientSlug)}/visibility/${targetType}/${encodeURIComponent(targetId)}`,
      { visible },
    );
  },

  getClientCatalog(clientSlug: string): Promise<TenantCatalog> {
    return apiClient.get<TenantCatalog>(`/api/v1/internal/clients/${encodeURIComponent(clientSlug)}/catalog`);
  },

  listVisualTemplates(): Promise<VisualTemplate[]> {
    return apiClient.get<VisualTemplate[]>('/api/v1/internal/templates');
  },

  upsertVisualTemplate(payload: VisualTemplateUpsertRequest): Promise<VisualTemplate> {
    return apiClient.post<VisualTemplateUpsertRequest, VisualTemplate>('/api/v1/internal/templates', payload);
  },

  listTemplateBindings(clientSlug: string): Promise<TenantTemplateBinding[]> {
    return apiClient.get<TenantTemplateBinding[]>(`/api/v1/internal/clients/${encodeURIComponent(clientSlug)}/template-bindings`);
  },

  upsertTemplateBinding(clientSlug: string, payload: TenantTemplateBindingUpsertRequest): Promise<TenantTemplateBinding> {
    return apiClient.post<TenantTemplateBindingUpsertRequest, TenantTemplateBinding>(
      `/api/v1/internal/clients/${encodeURIComponent(clientSlug)}/template-bindings`,
      payload
    );
  },

  validateTemplateBinding(clientSlug: string, bindingId: string): Promise<TenantTemplateBinding> {
    return apiClient.post<{}, TenantTemplateBinding>(
      `/api/v1/internal/clients/${encodeURIComponent(clientSlug)}/template-bindings/${encodeURIComponent(bindingId)}/validate`,
      {}
    );
  },

  listScreenInstances(clientSlug: string): Promise<ScreenInstance[]> {
    return apiClient.get<ScreenInstance[]>(`/api/v1/internal/clients/${encodeURIComponent(clientSlug)}/screen-instances`);
  },

  upsertScreenInstance(clientSlug: string, payload: ScreenInstanceUpsertRequest): Promise<ScreenInstance> {
    return apiClient.post<ScreenInstanceUpsertRequest, ScreenInstance>(
      `/api/v1/internal/clients/${encodeURIComponent(clientSlug)}/screen-instances`,
      payload
    );
  },

  composeDraft(clientSlug: string): Promise<PublishedVersion> {
    return apiClient.post<{}, PublishedVersion>(`/api/v1/internal/clients/${encodeURIComponent(clientSlug)}/compose-draft`, {});
  },

  upsertDataSource(clientSlug: string, payload: DataSourceCreateRequest): Promise<TenantCatalog> {
    return apiClient.post<DataSourceCreateRequest, TenantCatalog>(
      `/api/v1/internal/clients/${encodeURIComponent(clientSlug)}/data-sources`,
      payload
    );
  },

  upsertDataSourceField(
    clientSlug: string,
    dataSourceKey: string,
    fieldName: string,
    payload: DataSourceFieldUpsertRequest
  ): Promise<TenantCatalog> {
    return apiClient.put<DataSourceFieldUpsertRequest, TenantCatalog>(
      `/api/v1/internal/clients/${encodeURIComponent(clientSlug)}/data-sources/${encodeURIComponent(dataSourceKey)}/fields/${encodeURIComponent(fieldName)}`,
      payload
    );
  },
};
