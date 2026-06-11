import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Treemap,
} from 'recharts';
import { usePortfolio } from '../context/usePortfolio.js';
import { useRealEstate } from '../context/useRealEstate.js';
import { getAccountTypeDef } from '../utils/accountTypes.js';
import { REGIONS, getAssetRegion } from '../utils/assetGeoMapping.js';
import { formatEUR, formatPercent } from '../utils/format.js';
import KpiCard from '../components/KpiCard.jsx';

const buildPieData = (accounts, assets) => {
  const byType = new Map();
  for (const acc of accounts) {
    const positions = assets.filter((a) => a.accountId === acc.id);
    const value = positions.reduce(
      (sum, a) => sum + (Number(a.quantity) || 0) * (Number(a.currentPrice) || Number(a.purchasePrice) || 0),
      0,
    );
    const cash = Number(acc.balance) || 0;
    const total = value + cash;
    if (total <= 0) continue;
    byType.set(acc.type, (byType.get(acc.type) || 0) + total);
  }
  return [...byType.entries()].map(([type, total]) => ({
    name: type,
    value: total,
    color: getAccountTypeDef(type).color,
  }));
};

const buildTreemapData = (accounts, assets) => {
  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  return assets
    .map((a) => {
      const acc = accountMap.get(a.accountId);
      const value =
        (Number(a.quantity) || 0) *
        (Number(a.currentPrice) || Number(a.purchasePrice) || 0);
      const cost = (Number(a.quantity) || 0) * (Number(a.purchasePrice) || 0);
      return {
        name: a.name,
        ticker: a.yahoo_ticker || '',
        envelope: acc?.type || '—',
        size: value,
        cost,
        pnlPct: cost > 0 ? ((value - cost) / cost) * 100 : 0,
        color: acc ? getAccountTypeDef(acc.type).color : '#94a3b8',
      };
    })
    .filter((d) => d.size > 0)
    .sort((a, b) => b.size - a.size);
};

const buildGeoData = (assets, totalValue) => {
  const map = new Map();
  for (const a of assets) {
    const value =
      (Number(a.quantity) || 0) *
      (Number(a.currentPrice) || Number(a.purchasePrice) || 0);
    if (value <= 0) continue;
    const region = getAssetRegion(a);
    map.set(region, (map.get(region) || 0) + value);
  }
  return [...map.entries()]
    .map(([region, value]) => ({
      region,
      label: REGIONS[region]?.label || 'Autre',
      color: REGIONS[region]?.color || '#94a3b8',
      value,
      pct: totalValue > 0 ? (value / totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
};

// Custom treemap cell — renders name, value and a colored background
const TreemapCell = ({ depth, x, y, width, height, payload }) => {
  if (!payload || depth === 0) {
    return <g><rect x={x} y={y} width={width} height={height} fill="transparent" /></g>;
  }
  const showLabel = width > 80 && height > 50;
  const showTicker = width > 60 && height > 30;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: payload.color,
          fillOpacity: 0.85,
          stroke: '#fff',
          strokeWidth: 2,
        }}
      />
      {showLabel && (
        <>
          <text
            x={x + 8}
            y={y + 20}
            fill="#fff"
            fontWeight={600}
            fontSize={12}
            style={{ pointerEvents: 'none' }}
          >
            {String(payload.name).slice(0, Math.floor(width / 7))}
          </text>
          <text
            x={x + 8}
            y={y + 36}
            fill="#fff"
            fontSize={10}
            opacity={0.85}
            style={{ pointerEvents: 'none' }}
          >
            {formatEUR(payload.size, { compact: true })}
          </text>
          <text
            x={x + 8}
            y={y + height - 8}
            fill="#fff"
            fontSize={10}
            opacity={0.85}
            style={{ pointerEvents: 'none' }}
          >
            {payload.pnlPct >= 0 ? '+' : ''}
            {payload.pnlPct.toFixed(1)} %
          </text>
        </>
      )}
      {!showLabel && showTicker && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 4}
          textAnchor="middle"
          fill="#fff"
          fontSize={10}
          fontWeight={600}
          style={{ pointerEvents: 'none' }}
        >
          {payload.ticker || payload.name.slice(0, 4)}
        </text>
      )}
    </g>
  );
};

const TreemapTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 8,
        padding: 12,
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{p.name}</div>
      <div style={{ fontSize: '0.82rem', color: '#6b6b6b' }}>
        {p.ticker || '—'} · {p.envelope}
      </div>
      <div style={{ marginTop: 6, fontWeight: 600 }}>
        {formatEUR(p.size)}
      </div>
      <div
        style={{
          fontSize: '0.82rem',
          color: p.pnlPct >= 0 ? '#22c55e' : '#ef4444',
          fontWeight: 600,
        }}
      >
        {p.pnlPct >= 0 ? '+' : ''}
        {p.pnlPct.toFixed(2)} %
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { accounts, assets, totals, history } = usePortfolio();
  const { projects } = useRealEstate();

  const pieData = useMemo(() => buildPieData(accounts, assets), [accounts, assets]);
  const treemapData = useMemo(() => buildTreemapData(accounts, assets), [accounts, assets]);
  const geoData = useMemo(() => buildGeoData(assets, totals.totalCurrent), [assets, totals.totalCurrent]);

  const historyData = useMemo(
    () => (Array.isArray(history) ? history : []).map((h) => ({
      date: new Date(h.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      value: h.value,
    })),
    [history],
  );

  const realEstateValue = projects.reduce(
    (sum, p) => sum + (Number(p?.purchase?.price) || 0),
    0,
  );

  return (
    <>
      <header className="header">
        <div>
          <h1>Dashboard</h1>
          <p className="text-muted">Vue d'ensemble de ton patrimoine</p>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="col-span-3">
          <KpiCard
            label="Patrimoine total"
            value={formatEUR(totals.patrimoine + realEstateValue)}
            trend={totals.pnlPct}
          />
        </div>
        <div className="col-span-3">
          <KpiCard
            label="Investissements marché"
            value={formatEUR(totals.totalCurrent)}
            trend={totals.pnlPct}
            trendLabel={`${formatPercent(totals.pnlPct)} (${formatEUR(totals.pnl)})`}
          />
        </div>
        <div className="col-span-3">
          <KpiCard label="Épargne (livrets)" value={formatEUR(totals.cashTotal)} />
        </div>
        <div className="col-span-3">
          <KpiCard label="Immobilier" value={formatEUR(realEstateValue)} />
        </div>

        <div className="col-span-8">
          <div className="glass-panel">
            <h3>Évolution du patrimoine</h3>
            {historyData.length < 2 ? (
              <p className="text-muted mt-4">
                {historyData.length === 0
                  ? "Ajoute tes premières positions pour visualiser l'évolution."
                  : "L'historique s'enregistre automatiquement à chaque visite — la courbe apparaîtra dès demain."}
              </p>
            ) : (
              <div style={{ height: 280, marginTop: 16 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historyData}>
                    <defs>
                      <linearGradient id="gradPatrimoine" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} />
                    <XAxis dataKey="date" stroke="#6b6b6b" fontSize={12} tickLine={false} />
                    <YAxis
                      stroke="#6b6b6b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => formatEUR(v, { compact: true })}
                    />
                    <Tooltip
                      formatter={(v) => formatEUR(v)}
                      contentStyle={{
                        background: '#fff',
                        border: '1px solid rgba(0,0,0,0.08)',
                        borderRadius: 8,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#0a0a0a"
                      strokeWidth={2}
                      fill="url(#gradPatrimoine)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-4">
          <div className="glass-panel">
            <h3>Répartition par enveloppe</h3>
            {pieData.length === 0 ? (
              <p className="text-muted mt-4">Aucune enveloppe alimentée pour l'instant.</p>
            ) : (
              <>
                <div style={{ height: 200, marginTop: 16 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatEUR(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {pieData.map((entry) => (
                    <li
                      key={entry.name}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 3,
                          background: entry.color,
                          display: 'inline-block',
                        }}
                      />
                      <span style={{ flex: 1 }}>{entry.name}</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' }}>
                        {formatEUR(entry.value, { compact: true })}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        {treemapData.length > 0 && (
          <div className="col-span-12">
            <div className="glass-panel">
              <div className="flex-between" style={{ marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>Volumes par position</h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Taille = valeur actuelle · couleur = enveloppe
                </span>
              </div>
              <div style={{ height: 360 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <Treemap
                    data={treemapData}
                    dataKey="size"
                    aspectRatio={4 / 3}
                    content={<TreemapCell />}
                  >
                    <Tooltip content={<TreemapTooltip />} />
                  </Treemap>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {geoData.length > 0 && (
          <div className="col-span-12">
            <div className="glass-panel">
              <div className="flex-between" style={{ marginBottom: 14 }}>
                <h3 style={{ margin: 0 }}>Exposition géographique</h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Estimée selon le ticker et le nom de l'actif
                </span>
              </div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {geoData.map((g) => (
                  <li key={g.region}>
                    <div className="flex-between" style={{ marginBottom: 4 }}>
                      <span style={{ fontWeight: 500 }}>{g.label}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {formatEUR(g.value)} ({g.pct.toFixed(1)} %)
                      </span>
                    </div>
                    <div
                      style={{
                        height: 10,
                        background: 'var(--bg-subtle)',
                        borderRadius: 5,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${g.pct}%`,
                          height: '100%',
                          background: g.color,
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Dashboard;
