import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, Loader2, TrendingUp, TrendingDown, X as XIcon, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { DEPARTMENTS } from '../../utils/departments.js';
import { formatEUR, formatNumber, formatPercent } from '../../utils/format.js';
import KpiCard from '../../components/KpiCard.jsx';

const METRICS = [
  {
    id: 'salePrice',
    label: 'Prix médian au m²',
    field: 'salePrice',
    format: (v) => (v ? formatEUR(v) : '—'),
    color: (v, q) => {
      if (!v || !q.q1) return '#94a3b8';
      if (v <= q.q1) return '#22c55e'; // bon marché
      if (v <= q.q2) return '#84cc16';
      if (v <= q.q3) return '#f59e0b';
      return '#ef4444'; // cher
    },
    legend: ['Moins cher', 'Q2', 'Q3', 'Plus cher'],
  },
  {
    id: 'volume',
    label: 'Volume de transactions',
    field: 'nbVentes',
    format: (v) => (v ? formatNumber(v) : '0'),
    color: (v, q) => {
      if (!v || !q.q1) return '#94a3b8';
      if (v >= q.q3) return '#22c55e'; // marché dynamique
      if (v >= q.q2) return '#84cc16';
      if (v >= q.q1) return '#f59e0b';
      return '#ef4444'; // marché bouché
    },
    legend: ['Bouché', 'Q2', 'Q3', 'Dynamique'],
  },
  {
    id: 'yield',
    label: 'Rendement locatif brut',
    field: 'grossYield',
    format: (v) => (v ? formatPercent(v, { digits: 2 }) : '—'),
    color: (v, q) => {
      if (!v || !q.q1) return '#94a3b8';
      if (v >= q.q3) return '#22c55e';
      if (v >= q.q2) return '#84cc16';
      if (v >= q.q1) return '#f59e0b';
      return '#ef4444';
    },
    legend: ['Faible', 'Q2', 'Q3', 'Élevé'],
  },
  {
    id: 'population',
    label: 'Population',
    field: 'population',
    format: (v) => formatNumber(v),
    color: (v) => {
      if (!v) return '#94a3b8';
      if (v >= 50000) return '#3b82f6';
      if (v >= 10000) return '#06b6d4';
      if (v >= 2000) return '#84cc16';
      return '#94a3b8';
    },
    legend: ['<2k', '2-10k', '10-50k', '50k+'],
  },
];

const FitBounds = ({ items }) => {
  const map = useMap();
  useEffect(() => {
    if (!items.length) return;
    const lats = items.map((i) => i.lat);
    const lngs = items.map((i) => i.lng);
    const bounds = [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ];
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [map, items]);
  return null;
};

const DEFAULT_FILTERS = {
  search: '',
  priceMin: '',
  priceMax: '',
  popMin: '',
  popMax: '',
  ventesMin: '',
  yieldMin: '',
  yieldMax: '',
  rentMax: '',
  onlyWithRent: false,
  onlyWithDvf: false,
};

const MarketExplorer = () => {
  const [dept, setDept] = useState('69');
  const [type, setType] = useState('apt');
  const [metricId, setMetricId] = useState('salePrice');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const metric = METRICS.find((m) => m.id === metricId) || METRICS[0];

  const setF = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const num = (v) => (v === '' || v == null ? null : Number(v));

  const fetchData = async (deptCode, typ) => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/market-stats?dept=${deptCode}&type=${typ}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || 'Erreur');
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Legit data-fetching effect: fetchData sets a loading flag before awaiting.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData(dept, type);
  }, [dept, type]);

  const filtered = useMemo(() => {
    if (!data?.items) return [];
    const q = filters.search.trim().toLowerCase();
    const priceMin = num(filters.priceMin);
    const priceMax = num(filters.priceMax);
    const popMin = num(filters.popMin);
    const popMax = num(filters.popMax);
    const ventesMin = num(filters.ventesMin);
    const yieldMin = num(filters.yieldMin);
    const yieldMax = num(filters.yieldMax);
    const rentMax = num(filters.rentMax);

    return data.items.filter((c) => {
      if (q && !c.nom.toLowerCase().includes(q)) return false;
      if (filters.onlyWithDvf && !c.salePrice) return false;
      if (filters.onlyWithRent && !c.rentExtrapolated) return false;
      if (priceMin != null && (c.salePrice == null || c.salePrice < priceMin)) return false;
      if (priceMax != null && (c.salePrice == null || c.salePrice > priceMax)) return false;
      if (popMin != null && c.population < popMin) return false;
      if (popMax != null && c.population > popMax) return false;
      if (ventesMin != null && (c.nbVentes || 0) < ventesMin) return false;
      if (yieldMin != null && (c.grossYield == null || c.grossYield < yieldMin)) return false;
      if (yieldMax != null && (c.grossYield == null || c.grossYield > yieldMax)) return false;
      if (rentMax != null && (c.rentExtrapolated == null || c.rentExtrapolated > rentMax)) return false;
      return true;
    });
  }, [data, filters]);

  const sorted = useMemo(() => {
    return [...filtered]
      .filter((c) => c[metric.field] != null)
      .sort((a, b) => (b[metric.field] || 0) - (a[metric.field] || 0));
  }, [filtered, metric]);

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (filters.search) chips.push({ key: 'search', label: `Nom : "${filters.search}"` });
    if (filters.priceMin) chips.push({ key: 'priceMin', label: `Prix ≥ ${filters.priceMin} €/m²` });
    if (filters.priceMax) chips.push({ key: 'priceMax', label: `Prix ≤ ${filters.priceMax} €/m²` });
    if (filters.popMin) chips.push({ key: 'popMin', label: `Pop ≥ ${filters.popMin}` });
    if (filters.popMax) chips.push({ key: 'popMax', label: `Pop ≤ ${filters.popMax}` });
    if (filters.ventesMin) chips.push({ key: 'ventesMin', label: `Ventes ≥ ${filters.ventesMin}` });
    if (filters.yieldMin) chips.push({ key: 'yieldMin', label: `Rendement ≥ ${filters.yieldMin} %` });
    if (filters.yieldMax) chips.push({ key: 'yieldMax', label: `Rendement ≤ ${filters.yieldMax} %` });
    if (filters.rentMax) chips.push({ key: 'rentMax', label: `Loyer ≤ ${filters.rentMax} €/m²` });
    if (filters.onlyWithDvf) chips.push({ key: 'onlyWithDvf', label: 'DVF connu' });
    if (filters.onlyWithRent) chips.push({ key: 'onlyWithRent', label: 'Loyer connu' });
    return chips;
  }, [filters]);

  const hasActiveFilters = activeFilterChips.length > 0;

  const stats = useMemo(() => {
    if (!sorted.length) return null;
    const vals = sorted.map((c) => c[metric.field]).filter(Boolean);
    if (!vals.length) return null;
    return {
      max: Math.max(...vals),
      min: Math.min(...vals),
      mean: vals.reduce((s, v) => s + v, 0) / vals.length,
      median: vals[Math.floor(vals.length / 2)],
    };
  }, [sorted, metric]);

  return (
    <>
      <header className="header">
        <div>
          <Link
            to="/real-estate"
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.82rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 8,
            }}
          >
            <ArrowLeft size={14} /> Retour
          </Link>
          <h1>Explorer le marché</h1>
          <p className="text-muted">
            Carte interactive par département pour repérer les marchés dynamiques, les rendements élevés ou les zones bouchées
          </p>
        </div>
      </header>

      <div className="glass-panel">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
            alignItems: 'end',
          }}
        >
          <Field label="Département">
            <select value={dept} onChange={(e) => setDept(e.target.value)}>
              {DEPARTMENTS.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code} — {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type de bien">
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="apt">Appartements</option>
              <option value="maison">Maisons</option>
            </select>
          </Field>
          <Field label="Métrique colorée">
            <select value={metricId} onChange={(e) => setMetricId(e.target.value)}>
              {METRICS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className={`btn ${filtersOpen ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFiltersOpen((o) => !o)}
              style={{ flex: 1 }}
            >
              <SlidersHorizontal size={14} /> Filtres
              {hasActiveFilters && (
                <span
                  style={{
                    marginLeft: 4,
                    padding: '2px 6px',
                    background: filtersOpen ? '#fff' : 'var(--accent)',
                    color: filtersOpen ? 'var(--text)' : '#fff',
                    borderRadius: 10,
                    fontSize: '0.72rem',
                  }}
                >
                  {activeFilterChips.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {hasActiveFilters && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}>
            {activeFilterChips.map((chip) => (
              <span
                key={chip.key}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  background: 'var(--bg-subtle)',
                  borderRadius: 999,
                  fontSize: '0.78rem',
                  fontWeight: 500,
                }}
              >
                {chip.label}
                <button
                  onClick={() =>
                    setF(
                      chip.key,
                      typeof DEFAULT_FILTERS[chip.key] === 'boolean' ? false : '',
                    )
                  }
                  style={{
                    background: 'transparent',
                    border: 0,
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    padding: 0,
                  }}
                >
                  <XIcon size={12} />
                </button>
              </span>
            ))}
            <button
              onClick={resetFilters}
              style={{
                background: 'transparent',
                border: 0,
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: '0.78rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                marginLeft: 4,
              }}
            >
              <RotateCcw size={11} /> Réinitialiser
            </button>
          </div>
        )}

        {filtersOpen && (
          <div
            style={{
              marginTop: 16,
              padding: 16,
              background: 'var(--bg-subtle)',
              borderRadius: 8,
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <Field label="Recherche commune">
                <input
                  value={filters.search}
                  onChange={(e) => setF('search', e.target.value)}
                  placeholder="Lyon, Bron..."
                />
              </Field>
              <RangeField
                label="Prix €/m²"
                minValue={filters.priceMin}
                maxValue={filters.priceMax}
                onMin={(v) => setF('priceMin', v)}
                onMax={(v) => setF('priceMax', v)}
                placeholder={['1000', '5000']}
              />
              <RangeField
                label="Population"
                minValue={filters.popMin}
                maxValue={filters.popMax}
                onMin={(v) => setF('popMin', v)}
                onMax={(v) => setF('popMax', v)}
                placeholder={['1000', '500000']}
              />
              <Field label="Ventes ≥">
                <input
                  type="number"
                  value={filters.ventesMin}
                  onChange={(e) => setF('ventesMin', e.target.value)}
                  placeholder="50"
                />
              </Field>
              <RangeField
                label="Rendement %"
                minValue={filters.yieldMin}
                maxValue={filters.yieldMax}
                onMin={(v) => setF('yieldMin', v)}
                onMax={(v) => setF('yieldMax', v)}
                placeholder={['3', '8']}
                step={0.1}
              />
              <Field label="Loyer max €/m²">
                <input
                  type="number"
                  step="0.1"
                  value={filters.rentMax}
                  onChange={(e) => setF('rentMax', e.target.value)}
                  placeholder="20"
                />
              </Field>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 8 }}>
                <Toggle
                  label="Uniquement avec données DVF"
                  checked={filters.onlyWithDvf}
                  onChange={(v) => setF('onlyWithDvf', v)}
                />
                <Toggle
                  label="Uniquement avec loyer connu"
                  checked={filters.onlyWithRent}
                  onChange={(v) => setF('onlyWithRent', v)}
                />
              </div>
            </div>
            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {filtered.length} / {data?.count || 0} communes affichées
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn btn-secondary"
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      yieldMin: '5',
                      ventesMin: '30',
                    }))
                  }
                  style={{ fontSize: '0.78rem', padding: '6px 10px' }}
                >
                  💎 Bons rendements
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      priceMax: '3000',
                      ventesMin: '20',
                      popMin: '5000',
                    }))
                  }
                  style={{ fontSize: '0.78rem', padding: '6px 10px' }}
                >
                  💰 Accessible & dynamique
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      popMin: '10000',
                      ventesMin: '100',
                    }))
                  }
                  style={{ fontSize: '0.78rem', padding: '6px 10px' }}
                >
                  🏙 Villes moyennes+
                </button>
              </div>
            </div>
          </div>
        )}

        {error && <p style={{ color: 'var(--negative)', marginTop: 12 }}>{error}</p>}
      </div>

      {loading && (
        <div className="glass-panel" style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Loader2 className="animate-spin" size={16} />
            Chargement des données… (première requête : ~10s, le cache met ensuite la suite à
            chaud)
          </div>
        </div>
      )}

      {data && data.count === 0 && (
        <div className="glass-panel" style={{ marginTop: 20 }}>
          <p className="text-muted">Aucune donnée pour ce département.</p>
        </div>
      )}

      {data && data.count > 0 && (
        <div className="dashboard-grid">
          <div className="col-span-3">
            <KpiCard
              label="Communes affichées"
              value={`${formatNumber(filtered.length)} / ${formatNumber(data.count)}`}
              trendLabel={`Département ${dept}`}
              trend={hasActiveFilters ? -1 : 1}
            />
          </div>
          <div className="col-span-3">
            <KpiCard
              label={`Médiane ${metric.label.toLowerCase()}`}
              value={stats ? metric.format(stats.median) : '—'}
            />
          </div>
          <div className="col-span-3">
            <KpiCard
              label="Plus bas"
              value={stats ? metric.format(stats.min) : '—'}
            />
          </div>
          <div className="col-span-3">
            <KpiCard
              label="Plus haut"
              value={stats ? metric.format(stats.max) : '—'}
            />
          </div>

          <div className="col-span-12">
            <div className="glass-panel">
              <div className="flex-between" style={{ marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>Carte — {metric.label}</h3>
                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  {metric.legend.map((lbl, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: ['#22c55e', '#84cc16', '#f59e0b', '#ef4444'][i],
                        }}
                      />
                      {lbl}
                    </span>
                  ))}
                </div>
              </div>
              <div
                style={{
                  height: 540,
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                }}
              >
                <MapContainer
                  center={[46.6, 2.4]}
                  zoom={6}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <FitBounds items={filtered} />
                  {filtered.map((c) => {
                    const v = c[metric.field];
                    const color = metric.color(v, data.quartiles[metricId] || {});
                    const radius = Math.min(
                      18,
                      Math.max(5, Math.log2((c.population || 1) + 1) * 1.3),
                    );
                    return (
                      <CircleMarker
                        key={c.insee}
                        center={[c.lat, c.lng]}
                        radius={radius}
                        pathOptions={{
                          color,
                          fillColor: color,
                          fillOpacity: 0.65,
                          weight: 1,
                        }}
                      >
                        <Tooltip>
                          <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12 }}>
                            <div style={{ fontWeight: 700 }}>{c.nom}</div>
                            <div>
                              {formatNumber(c.population)} hab. · INSEE {c.insee}
                            </div>
                            <div style={{ marginTop: 4 }}>
                              <b>Prix médian</b> : {c.salePrice ? formatEUR(c.salePrice) + '/m²' : '—'}
                            </div>
                            <div>
                              <b>Transactions</b> : {formatNumber(c.nbVentes)}
                            </div>
                            {c.rentExtrapolated && (
                              <div>
                                <b>Loyer 2026</b> : {c.rentExtrapolated.toFixed(2)} €/m²
                              </div>
                            )}
                            {c.grossYield != null && (
                              <div>
                                <b>Rendement</b> : {formatPercent(c.grossYield, { digits: 2 })}
                              </div>
                            )}
                          </div>
                        </Tooltip>
                      </CircleMarker>
                    );
                  })}
                </MapContainer>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 8 }}>
                Taille du point ∝ population. Couleur ∝ métrique sélectionnée. Sources :
                Statistiques DVF (Etalab) + Carte des Loyers 2024 (Ministère du Logement).
              </p>
            </div>
          </div>

          <div className="col-span-6">
            <div className="glass-panel">
              <h3>
                Top 15 — {metric.label}{' '}
                <TrendingUp size={14} style={{ verticalAlign: 'middle', color: 'var(--accent)' }} />
              </h3>
              <RankList items={sorted.slice(0, 15)} metric={metric} />
            </div>
          </div>
          <div className="col-span-6">
            <div className="glass-panel">
              <h3>
                Bottom 15 — {metric.label}{' '}
                <TrendingDown
                  size={14}
                  style={{ verticalAlign: 'middle', color: 'var(--negative)' }}
                />
              </h3>
              <RankList items={[...sorted].reverse().slice(0, 15)} metric={metric} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const RankList = ({ items, metric }) => {
  if (!items.length) return <p className="text-muted mt-4">Aucune donnée.</p>;
  return (
    <div className="table-container" style={{ marginTop: 12 }}>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Commune</th>
            <th style={{ textAlign: 'right' }}>Population</th>
            <th style={{ textAlign: 'right' }}>Valeur</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c, i) => (
            <tr key={c.insee}>
              <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
              <td>
                <div style={{ fontWeight: 600 }}>{c.nom}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  INSEE {c.insee}
                </div>
              </td>
              <td style={{ textAlign: 'right' }}>{formatNumber(c.population)}</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>
                {metric.format(c[metric.field])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Field = ({ label, children }) => (
  <div className="input-group" style={{ marginBottom: 0 }}>
    <label>{label}</label>
    {children}
  </div>
);

const RangeField = ({ label, minValue, maxValue, onMin, onMax, placeholder = ['', ''], step }) => (
  <div className="input-group" style={{ marginBottom: 0 }}>
    <label>{label}</label>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
      <input
        type="number"
        step={step}
        value={minValue}
        onChange={(e) => onMin(e.target.value)}
        placeholder={placeholder[0]}
      />
      <input
        type="number"
        step={step}
        value={maxValue}
        onChange={(e) => onMax(e.target.value)}
        placeholder={placeholder[1]}
      />
    </div>
  </div>
);

const Toggle = ({ label, checked, onChange }) => (
  <label
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      cursor: 'pointer',
      fontSize: '0.82rem',
    }}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      style={{ width: 16, height: 16 }}
    />
    {label}
  </label>
);

export default MarketExplorer;
