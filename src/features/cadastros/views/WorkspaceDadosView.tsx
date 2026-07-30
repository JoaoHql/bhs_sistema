import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Database, RefreshCw, Search, Server, Table2 } from 'lucide-react';
import { configApi } from '../../../services/configApi';
import type { Client, DataSourceFieldTechnicalType, DataSourceFieldSemanticRole, TenantCatalog, TenantCatalogDataSource, TenantCatalogObject } from '../../../types';

const normalizeKey = (value: string) => value.replace(/^vw_/, '').replace(/[^a-zA-Z0-9_]+/g, '_').toLowerCase();

const inferTechnicalType = (dataType: string): DataSourceFieldTechnicalType => {
  if (['integer', 'bigint', 'numeric', 'double precision', 'real'].includes(dataType)) return 'number';
  if (dataType === 'date') return 'date';
  if (dataType.includes('timestamp')) return 'datetime';
  if (dataType === 'boolean') return 'boolean';
  if (dataType.includes('char') || dataType === 'text') return 'category';
  return 'text';
};

const inferSemanticRole = (fieldName: string, technicalType: DataSourceFieldTechnicalType): DataSourceFieldSemanticRole => {
  if (fieldName === 'id' || fieldName.endsWith('_id')) return 'identifier';
  if (technicalType === 'date' || technicalType === 'datetime') return 'date';
  if (['number', 'currency', 'percent'].includes(technicalType)) return 'metric';
  return 'dimension';
};

export const WorkspaceDadosView: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientSlug, setSelectedClientSlug] = useState('');
  const [catalog, setCatalog] = useState<TenantCatalog | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingEntity, setSavingEntity] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    configApi.listClients()
      .then((items) => {
        if (!active) return;
        setClients(items);
        setSelectedClientSlug((current) => current || items[0]?.slug || '');
      })
      .catch(() => {
        if (active) setError('Acesso interno necessario para listar clientes.');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedClientSlug) return;
    let active = true;
    setLoading(true);
    setError(null);
    configApi.getClientCatalog(selectedClientSlug)
      .then((payload) => {
        if (active) setCatalog(payload);
      })
      .catch(() => {
        if (active) {
          setCatalog(null);
          setError('Nao foi possivel carregar o catalogo real do tenant.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedClientSlug]);

  const filteredObjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const objects = catalog?.objects || [];
    if (!query) return objects;
    return objects.filter((item) =>
      item.name.toLowerCase().includes(query) ||
      item.columns.some((column) => column.name.toLowerCase().includes(query))
    );
  }, [catalog, searchQuery]);

  const registerDataSource = async (object: TenantCatalogObject) => {
    if (!catalog) return;
    const key = normalizeKey(object.name);
    setSavingEntity(object.name);
    setError(null);
    try {
      const updated = await configApi.upsertDataSource(catalog.client.slug, {
        key,
        entity: object.name,
        kind: object.object_type === 'view' ? 'tenant_view' : 'tenant_table',
        allowed_fields: object.columns.map((column) => column.name),
        allowed_filters: object.columns
          .filter((column) => ['text', 'date', 'timestamp without time zone', 'timestamp with time zone', 'boolean'].includes(column.data_type))
          .map((column) => column.name),
        active: true,
      });
      setCatalog(updated);
    } catch {
      setError('Falha ao cadastrar fonte. Verifique se a tabela/view ainda existe no schema.');
    } finally {
      setSavingEntity(null);
    }
  };

  const documentField = async (source: TenantCatalogDataSource, fieldName: string, dataType: string) => {
    if (!catalog) return;
    const technicalType = inferTechnicalType(dataType);
    const semanticRole = inferSemanticRole(fieldName, technicalType);
    setSavingField(`${source.key}:${fieldName}`);
    setError(null);
    try {
      const updated = await configApi.upsertDataSourceField(catalog.client.slug, source.key, fieldName, {
        field_name: fieldName,
        display_name: fieldName.replace(/_/g, ' '),
        technical_type: technicalType,
        semantic_role: semanticRole,
        business_meaning: '',
        synonyms: [],
        example_values: [],
        allowed_aggregations: semanticRole === 'metric' ? ['sum', 'avg'] : [],
        is_filterable: source.allowed_filters.includes(fieldName),
        is_groupable: semanticRole === 'dimension',
        is_sensitive: false,
        quality_notes: '',
        status: 'active',
      });
      setCatalog(updated);
    } catch {
      setError('Falha ao documentar campo. Confirme allowed_fields da fonte.');
    } finally {
      setSavingField(null);
    }
  };

  const columnTypeBySource = useMemo(() => {
    const map = new Map<string, Map<string, string>>();
    catalog?.data_sources.forEach((source) => {
      const object = catalog.objects.find((item) => item.name === source.entity);
      map.set(source.key, new Map((object?.columns || []).map((column) => [column.name, column.data_type])));
    });
    return map;
  }, [catalog]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Catalogo de Dados do Cliente</h2>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Fonte unica: Supabase/Postgres do projeto, com schema resolvido pelo backend.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={selectedClientSlug}
            onChange={(event) => setSelectedClientSlug(event.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
          >
            {clients.map((client) => (
              <option key={client.id} value={client.slug}>{client.name}</option>
            ))}
          </select>

          <div className="relative">
            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar tabela, view ou campo"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-8 w-56 rounded-lg border border-slate-200 bg-white pl-7 pr-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-slate-500">
            <Server className="h-4 w-4 text-blue-600" />
            Cliente
          </div>
          <div className="mt-3 text-sm font-bold text-slate-900">{catalog?.client.name || '-'}</div>
          <div className="mt-1 font-mono text-[11px] text-slate-500">{catalog?.client.slug || selectedClientSlug || '-'}</div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-slate-500">
            <Database className="h-4 w-4 text-emerald-600" />
            Schema Supabase
          </div>
          <div className="mt-3 font-mono text-sm font-bold text-slate-900">{catalog?.tenant_schema || '-'}</div>
          <div className="mt-1 text-[11px] text-slate-500">Resolvido no backend. O frontend nao envia schema em consultas.</div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-slate-500">
            <CheckCircle2 className="h-4 w-4 text-slate-600" />
            Fontes BI
          </div>
          <div className="mt-3 text-sm font-bold text-slate-900">{catalog?.data_sources.filter((source) => source.active).length ?? 0} ativas</div>
          <div className="mt-1 text-[11px] text-slate-500">Somente tabelas/views aprovadas aparecem para telas e graficos.</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
          <div>
            <h3 className="text-xs font-extrabold uppercase text-slate-700">Tabelas e views reais</h3>
            <p className="mt-0.5 text-[10px] text-slate-400">Planilhas, APIs e bancos externos foram removidos deste fluxo.</p>
          </div>
          {loading && <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />}
        </div>

        <div className="divide-y divide-slate-100">
          {filteredObjects.map((object) => (
            <div key={`${object.object_type}-${object.name}`} className="grid grid-cols-1 gap-3 px-4 py-3 lg:grid-cols-[1fr_2fr_auto] lg:items-center">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Table2 className="h-4 w-4 text-slate-500" />
                  <span className="truncate font-mono text-xs font-bold text-slate-900">{object.name}</span>
                  <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-slate-500">
                    {object.object_type}
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-slate-400">
                  {object.registered ? `Fonte cadastrada: ${object.data_source_key}` : 'Ainda nao liberada para BI'}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {object.columns.map((column) => (
                  <span key={column.name} className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1 font-mono text-[10px] text-slate-600">
                    {column.name}
                  </span>
                ))}
              </div>

              <button
                type="button"
                disabled={object.registered || savingEntity === object.name}
                onClick={() => registerDataSource(object)}
                className="h-8 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                {object.registered ? 'Cadastrada' : savingEntity === object.name ? 'Salvando...' : 'Liberar para BI'}
              </button>
            </div>
          ))}

          {!loading && filteredObjects.length === 0 && (
            <div className="px-4 py-10 text-center text-xs font-semibold text-slate-400">
              Nenhuma tabela/view encontrada para este schema.
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h3 className="text-xs font-extrabold uppercase text-slate-700">Catalogo semantico</h3>
          <p className="mt-0.5 text-[10px] text-slate-400">Campos ativos alimentam BI e contexto futuro de IA; ocultos/sensiveis ficam bloqueados.</p>
        </div>

        <div className="divide-y divide-slate-100">
          {(catalog?.data_sources || []).map((source) => (
            <div key={source.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-mono text-xs font-extrabold text-slate-900">{source.key}</div>
                  <div className="text-[10px] text-slate-400">{source.entity}</div>
                </div>
                <span className="rounded border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-500">
                  {source.fields.filter((field) => field.status === 'active' && !field.is_sensitive).length}/{source.allowed_fields.length} campos ativos
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
                {source.allowed_fields.map((fieldName) => {
                  const documented = source.fields.find((field) => field.field_name === fieldName);
                  const dataType = columnTypeBySource.get(source.key)?.get(fieldName) || 'text';
                  const fieldKey = `${source.key}:${fieldName}`;
                  return (
                    <div key={fieldName} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate font-mono text-[11px] font-bold text-slate-800">{fieldName}</div>
                        <div className="mt-0.5 text-[10px] text-slate-400">
                          {documented ? `${documented.semantic_role} / ${documented.technical_type}${documented.is_sensitive ? ' / sensivel' : ''}` : dataType}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => documentField(source, fieldName, dataType)}
                        disabled={savingField === fieldKey}
                        className="h-7 shrink-0 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-600 hover:border-blue-300 hover:text-blue-700 disabled:opacity-50"
                      >
                        {documented ? 'Atualizar' : savingField === fieldKey ? 'Salvando' : 'Documentar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
