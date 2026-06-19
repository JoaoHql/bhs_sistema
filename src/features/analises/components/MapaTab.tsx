import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Map, MapPin, DollarSign, BarChart3, Navigation, Layers } from 'lucide-react';

interface GeoItem {
  id: string;
  name: string;
  lat: number;
  lng: number;
  sales: number;
  revenue: number;
  level: string;
}

interface DataTree {
  state: GeoItem[];
  city: GeoItem[];
  neighborhood: GeoItem[];
  street: GeoItem[];
  [key: string]: GeoItem[];
}

interface CitySeed {
  name: string;
  lat: number;
  lng: number;
  weight: number;
}

interface FocusState {
  id: string;
  label: string;
  lat: number;
  lng: number;
  zoom: number;
}

const baseStates = [
  { id: 'SP', name: 'Sao Paulo', lat: -23.5505, lng: -46.6333, sales: 12450 },
  { id: 'RJ', name: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729, sales: 8320 },
  { id: 'MG', name: 'Minas Gerais', lat: -19.9167, lng: -43.9345, sales: 7500 },
  { id: 'BA', name: 'Bahia', lat: -12.9714, lng: -38.5014, sales: 6800 },
  { id: 'PR', name: 'Parana', lat: -25.4284, lng: -49.2733, sales: 5200 },
  { id: 'RS', name: 'Rio Grande do Sul', lat: -30.0346, lng: -51.2177, sales: 4800 },
  { id: 'PE', name: 'Pernambuco', lat: -8.0476, lng: -34.877, sales: 3900 },
  { id: 'CE', name: 'Ceara', lat: -3.7172, lng: -38.5433, sales: 3500 }
];

const stateCities: Record<string, CitySeed[]> = {
  SP: [
    { name: 'Sao Paulo', lat: -23.5505, lng: -46.6333, weight: 0.48 },
    { name: 'Campinas', lat: -22.9056, lng: -47.0608, weight: 0.22 },
    { name: 'Ribeirao Preto', lat: -21.1775, lng: -47.8103, weight: 0.16 },
    { name: 'Sorocaba', lat: -23.5015, lng: -47.4526, weight: 0.14 }
  ],
  RJ: [
    { name: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729, weight: 0.52 },
    { name: 'Niteroi', lat: -22.8832, lng: -43.1034, weight: 0.18 },
    { name: 'Duque de Caxias', lat: -22.7858, lng: -43.3049, weight: 0.16 },
    { name: 'Nova Iguacu', lat: -22.7592, lng: -43.4511, weight: 0.14 }
  ],
  MG: [
    { name: 'Belo Horizonte', lat: -19.9167, lng: -43.9345, weight: 0.45 },
    { name: 'Uberlandia', lat: -18.9146, lng: -48.2754, weight: 0.22 },
    { name: 'Contagem', lat: -19.9317, lng: -44.0536, weight: 0.18 },
    { name: 'Juiz de Fora', lat: -21.7595, lng: -43.3398, weight: 0.15 }
  ],
  BA: [
  { name: 'Salvador', lat: -12.9714, lng: -38.5014, weight: 0.7 },
  { name: 'Camacari', lat: -12.6975, lng: -38.3241, weight: 0.2 },
  { name: 'Lauro de Freitas', lat: -12.8944, lng: -38.3272, weight: 0.1 }
  ],
  PR: [
    { name: 'Curitiba', lat: -25.4284, lng: -49.2733, weight: 0.46 },
    { name: 'Londrina', lat: -23.3045, lng: -51.1696, weight: 0.2 },
    { name: 'Maringa', lat: -23.4205, lng: -51.9333, weight: 0.18 },
    { name: 'Cascavel', lat: -24.9555, lng: -53.4552, weight: 0.16 }
  ],
  RS: [
    { name: 'Porto Alegre', lat: -30.0346, lng: -51.2177, weight: 0.44 },
    { name: 'Caxias do Sul', lat: -29.1678, lng: -51.1794, weight: 0.22 },
    { name: 'Canoas', lat: -29.9187, lng: -51.1781, weight: 0.18 },
    { name: 'Santa Maria', lat: -29.6842, lng: -53.8069, weight: 0.16 }
  ],
  PE: [
    { name: 'Recife', lat: -8.0476, lng: -34.877, weight: 0.48 },
    { name: 'Olinda', lat: -8.0089, lng: -34.8553, weight: 0.19 },
    { name: 'Jaboatao dos Guararapes', lat: -8.1128, lng: -35.0145, weight: 0.18 },
    { name: 'Caruaru', lat: -8.2846, lng: -35.9699, weight: 0.15 }
  ],
  CE: [
    { name: 'Fortaleza', lat: -3.7319, lng: -38.5267, weight: 0.5 },
    { name: 'Caucaia', lat: -3.7361, lng: -38.6531, weight: 0.18 },
    { name: 'Maracanau', lat: -3.8767, lng: -38.6256, weight: 0.17 },
    { name: 'Juazeiro do Norte', lat: -7.2131, lng: -39.315, weight: 0.15 }
  ]
};

const salvadorNeighborhoods = [
  { name: 'Pituba', lat: -13.0031, lng: -38.4556, weight: 0.3 },
  { name: 'Barra', lat: -13.0105, lng: -38.5323, weight: 0.25 },
  { name: 'Rio Vermelho', lat: -13.0163, lng: -38.4907, weight: 0.2 },
  { name: 'Cajazeiras', lat: -12.8833, lng: -38.4167, weight: 0.15 },
  { name: 'Pelourinho', lat: -12.9719, lng: -38.5074, weight: 0.1 }
];

const focusStates: FocusState[] = baseStates.map(state => ({
  id: state.id,
  label: `${state.name} (${state.id})`,
  lat: state.lat,
  lng: state.lng,
  zoom: 7
}));

const generateGranularData = (): DataTree => {
  const dataTree: DataTree = { state: [], city: [], neighborhood: [], street: [] };

  baseStates.forEach(state => {
    const stateRevenue = state.sales * 250;
    dataTree.state.push({ ...state, level: 'state', revenue: stateRevenue });

    const cities = stateCities[state.id] || [];

    for (let c = 0; c < cities.length; c++) {
      const cityDef = cities[c];
      const citySales = c === cities.length - 1
        ? state.sales - cities.slice(0, c).reduce((acc, city) => acc + Math.floor(state.sales * city.weight), 0)
        : Math.floor(state.sales * cityDef.weight);
      const cityName = cityDef.name;

      const cityObj: GeoItem = {
        id: `${state.id}_c${c}`,
        name: `${cityName} (${state.id})`,
        lat: cityDef.lat,
        lng: cityDef.lng,
        sales: citySales,
        revenue: citySales * 250,
        level: 'city'
      };
      dataTree.city.push(cityObj);

      let remainingCitySales = citySales;
      const isBA = state.id === 'BA';
      const numNeighborhoods = isBA && cityName === 'Salvador' ? salvadorNeighborhoods.length : 5;

      for (let n = 0; n < numNeighborhoods; n++) {
        const isSSA = isBA && cityName === 'Salvador';
        const neighDef = isSSA ? salvadorNeighborhoods[n] : null;

        const neighSales = isSSA
          ? Math.floor(citySales * neighDef!.weight)
          : (n === numNeighborhoods - 1 ? remainingCitySales : Math.floor(remainingCitySales * (Math.random() * 0.4 + 0.1)));

        remainingCitySales -= neighSales;

        const neighLat = isSSA ? neighDef!.lat : cityDef.lat + (Math.random() - 0.5) * 0.03;
        const neighLng = isSSA ? neighDef!.lng : cityDef.lng + (Math.random() - 0.5) * 0.03;
        const neighName = isSSA ? neighDef!.name : `Setor Comercial ${n + 1}`;

        const neighObj: GeoItem = {
          id: `${cityObj.id}_n${n}`,
          name: `${neighName}, ${cityName}`,
          lat: neighLat,
          lng: neighLng,
          sales: neighSales,
          revenue: neighSales * 250,
          level: 'neighborhood'
        };
        dataTree.neighborhood.push(neighObj);

        const numStreets = Math.max(3, Math.floor(neighSales / 100));
        let remainingNeighSales = neighSales;

        for (let s = 0; s < numStreets; s++) {
          const streetSales = s === numStreets - 1 ? remainingNeighSales : Math.floor(remainingNeighSales * (Math.random() * 0.3 + 0.05));
          remainingNeighSales -= streetSales;

          dataTree.street.push({
            id: `${neighObj.id}_s${s}`,
            name: `PDV ${Math.floor(Math.random() * 1000)} - ${neighName}`,
            lat: neighLat + (Math.random() - 0.5) * 0.006,
            lng: neighLng + (Math.random() - 0.5) * 0.006,
            sales: streetSales,
            revenue: streetSales * 250,
            level: 'street'
          });
        }
      }
    }
  });

  return dataTree;
};

export const MapaTab: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const markerStyleInjectedRef = useRef(false);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentZoomLevel, setCurrentZoomLevel] = useState('state');
  const [selectedStateId, setSelectedStateId] = useState('');
  const [visibleSales, setVisibleSales] = useState(0);
  const [visibleRevenue, setVisibleRevenue] = useState(0);
  const [visiblePoints, setVisiblePoints] = useState(0);
  const [topRegions, setTopRegions] = useState<GeoItem[]>([]);

  const mapData = useMemo(() => generateGranularData(), []);
  const selectedState = useMemo(() => focusStates.find(state => state.id === selectedStateId), [selectedStateId]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getLevelLabel = () => {
    switch (currentZoomLevel) {
      case 'state':
        return 'Visao nacional';
      case 'city':
        return 'Visao regional';
      case 'neighborhood':
        return 'Visao urbana';
      case 'street':
        return 'Visao micro';
      default:
        return '';
    }
  };

  const focusOnState = (state: FocusState) => {
    if (!mapInstanceRef.current) return;

    mapInstanceRef.current.flyTo([state.lat, state.lng], state.zoom, {
      duration: 1.7,
      easeLinearity: 0.25
    });
  };

  useEffect(() => {
    if (mapLoaded && selectedState) {
      focusOnState(selectedState);
    }
  }, [mapLoaded, selectedState]);

  useEffect(() => {
    let isMounted = true;

    const injectMarkerStyle = () => {
      if (markerStyleInjectedRef.current) return;
      const style = document.createElement('style');
      style.innerHTML = `
        @keyframes markerPop {
          0% { transform: scale(0.7); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animated-marker {
          animation: markerPop 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `;
      document.head.appendChild(style);
      markerStyleInjectedRef.current = true;
    };

    const renderMarkers = (level: string, bounds: any) => {
      const L = (window as any).L;
      if (!L || !layerGroupRef.current) return;

      const dataToRender = mapData[level];
      layerGroupRef.current.clearLayers();

      let currentVisibleSales = 0;
      let currentVisibleRevenue = 0;
      const visibleItems: GeoItem[] = [];

      const itemsInBounds = dataToRender.filter(item => bounds.contains([item.lat, item.lng]));
      const maxSalesInView = itemsInBounds.length > 0 ? Math.max(...itemsInBounds.map(d => d.sales)) : 1;

      itemsInBounds.forEach(region => {
        currentVisibleSales += region.sales;
        currentVisibleRevenue += region.revenue;
        visibleItems.push(region);

        const isStreet = level === 'street';
        const size = isStreet ? 14 + (region.sales / maxSalesInView) * 16 : Math.max(34, (region.sales / maxSalesInView) * 88);
        const palette = isStreet
          ? '#38bdf8'
          : level === 'state'
            ? '#3b82f6'
            : level === 'city'
              ? '#f97316'
              : '#10b981';
        const displayValue = isStreet ? '' : region.sales >= 1000 ? `${(region.sales / 1000).toFixed(1)}k` : `${region.sales}`;

        const icon = L.divIcon({
          className: '',
          html: `
            <div class="animated-marker" style="
              width:${size}px;
              height:${size}px;
              border-radius:9999px;
              display:flex;
              align-items:center;
              justify-content:center;
              color:#fff;
              font-size:${isStreet ? '0' : '11px'};
              font-weight:800;
              letter-spacing:0.02em;
              border:1px solid ${palette};
              background:${palette}26;
              box-shadow:0 0 0 1px ${palette}33, 0 0 18px ${palette}40;
              backdrop-filter:blur(4px);
            ">${displayValue}</div>
          `,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2]
        });

        const marker = L.marker([region.lat, region.lng], { icon }).addTo(layerGroupRef.current);
        marker.bindPopup(`
          <div style="font-family: ui-sans-serif, system-ui, sans-serif; color: #0f172a; padding: 4px; min-width: 160px;">
            <strong style="font-size: 14px; display: block; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">${region.name}</strong>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #64748b; font-size: 12px;">Nivel:</span>
              <span style="font-weight: bold; font-size: 12px; text-transform: capitalize;">${level === 'street' ? 'Ponto de venda' : level === 'neighborhood' ? 'Bairro' : level === 'city' ? 'Cidade' : 'Estado'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #64748b; font-size: 12px;">Vendas:</span>
              <span style="font-weight: bold; font-size: 12px;">${region.sales} un</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b; font-size: 12px;">Receita:</span>
              <span style="font-weight: bold; color: #10b981; font-size: 12px;">${formatCurrency(region.revenue)}</span>
            </div>
          </div>
        `);
      });

      setVisibleSales(currentVisibleSales);
      setVisibleRevenue(currentVisibleRevenue);
      setVisiblePoints(itemsInBounds.length);
      setTopRegions([...visibleItems].sort((a, b) => b.sales - a.sales).slice(0, 5));
    };

    const initMap = () => {
      const L = (window as any).L;
      if (!mapContainerRef.current || mapInstanceRef.current || !L) return;

      injectMarkerStyle();

      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        minZoom: 4,
        maxZoom: 18
      }).setView([-14.235, -51.925], 4);

      mapInstanceRef.current = map;
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd'
      }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);

      const updateMapAndDashboard = () => {
        const zoom = map.getZoom();
        const bounds = map.getBounds();

        let newLevel = 'state';
        if (zoom >= 6 && zoom < 10) newLevel = 'city';
        else if (zoom >= 10 && zoom < 14) newLevel = 'neighborhood';
        else if (zoom >= 14) newLevel = 'street';

        setCurrentZoomLevel(newLevel);
        renderMarkers(newLevel, bounds);
      };

      map.on('zoomend', updateMapAndDashboard);
      map.on('moveend', updateMapAndDashboard);

      setMapLoaded(true);
      setTimeout(updateMapAndDashboard, 100);
    };

    const L = (window as any).L;
    if (!L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        if (isMounted) initMap();
      };
      document.head.appendChild(script);
    } else {
      initMap();
    }

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapData]);

  const visibleTicket = visibleSales > 0 ? visibleRevenue / visibleSales : 0;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-4 h-[680px] rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
      <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">Analises</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Mapa de vendas</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">Distribuicao geografica de vendas por UF, cidade, bairro e ponto de venda.</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
              <Navigation className="h-3.5 w-3.5 text-orange-500" />
              Foco regional
            </div>
            <label className="mb-2 block text-xs font-semibold text-slate-700">Selecione uma UF para centralizar</label>
            <select
              value={selectedStateId}
              onChange={(e) => {
                const nextStateId = e.target.value;
                setSelectedStateId(nextStateId);
                const nextState = focusStates.find(state => state.id === nextStateId);
                if (nextState) {
                  focusOnState(nextState);
                }
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition-colors focus:border-orange-400"
            >
              <option value="">Brasil</option>
              {focusStates.map(state => (
                <option key={state.id} value={state.id}>
                  {state.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => selectedState && focusOnState(selectedState)}
              disabled={!selectedState}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <Navigation className="h-3.5 w-3.5" />
              {selectedState ? `Centralizar em ${selectedState.label}` : 'Selecione uma UF'}
            </button>
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Vendas na tela</span>
              </div>
              <div className="mt-3 text-xl font-semibold text-slate-900">
                {visibleSales.toLocaleString('pt-BR')}
              </div>
              <p className="mt-1 text-xs text-slate-500">Unidades visiveis no recorte atual.</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Faturamento</span>
              </div>
              <div className="mt-3 text-xl font-semibold text-slate-900">
                {formatCurrency(visibleRevenue)}
              </div>
              <p className="mt-1 text-xs text-slate-500">Receita estimada da area em tela.</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <MapPin className="h-4 w-4 text-orange-500" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Pontos ativos</span>
              </div>
              <div className="mt-3 text-xl font-semibold text-slate-900">
                {visiblePoints.toLocaleString('pt-BR')}
              </div>
              <p className="mt-1 text-xs text-slate-500">Marcadores dentro do enquadramento.</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <Layers className="h-4 w-4 text-sky-500" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Nivel atual</span>
              </div>
              <div className="mt-3 text-xl font-semibold text-slate-900">{getLevelLabel()}</div>
              <p className="mt-1 text-xs text-slate-500">
                Ticket medio: {visibleTicket > 0 ? formatCurrency(visibleTicket) : '---'}
              </p>
            </div>
          </section>

          <section className="flex-1 min-h-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Areas em destaque</h3>
                <p className="text-xs text-slate-500">Top 5 itens visiveis no mapa</p>
              </div>
              <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                {selectedState?.id || 'BR'}
              </div>
            </div>

            <div className="space-y-2">
              {topRegions.length > 0 ? topRegions.map((region, index) => (
                <div key={region.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${index === 0 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{region.name}</p>
                      <p className="text-xs text-slate-500">{formatCurrency(region.revenue)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{region.sales}</p>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">vendas</p>
                  </div>
                </div>
              )) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  Nenhum dado no enquadramento atual.
                </div>
              )}
            </div>
          </section>
        </div>
      </aside>

      <section className="relative min-h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm">
        {!mapLoaded && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-100">
            <div className="flex flex-col items-center gap-3 animate-pulse">
              <Map className="h-8 w-8 text-slate-400" />
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Iniciando mapa...</p>
            </div>
          </div>
        )}

        <div ref={mapContainerRef} className="absolute inset-0 cursor-crosshair" style={{ background: '#0f172a' }} />

        <div className="absolute left-4 top-4 z-10 rounded-full border border-slate-700/60 bg-slate-900/85 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-200 backdrop-blur-md">
          <span className="text-slate-400">Status:</span> {getLevelLabel()}
        </div>

        <div className="absolute bottom-4 left-4 z-10 rounded-xl border border-slate-700/60 bg-slate-900/85 px-3 py-2 text-[10px] font-semibold text-slate-300 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-orange-400" />
            Recorte: <span className="text-white">{selectedState?.label || 'Brasil'}</span>
          </div>
        </div>
      </section>
    </div>
  );
};
