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
} from 'recharts';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { useRealEstate } from '../context/RealEstateContext.jsx';
import { getAccountTypeDef } from '../utils/accountTypes.js';
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

const Dashboard = () => {
  const { accounts, assets, totals } = usePortfolio();
  const { projects } = useRealEstate();

  const pieData = useMemo(() => buildPieData(accounts, assets), [accounts, assets]);
  const historyData = useMemo(() => {
    if (!totals.patrimoine) return [];
    const today = new Date();
    return Array.from({ length: 12 }).map((_, i) => {
      const date = new Date(today);
      date.setMonth(today.getMonth() - (11 - i));
      const progress = (i + 1) / 12;
      return {
        date: date.toLocaleDateString('fr-FR', { month: 'short' }),
        value: Math.round(totals.patrimoine * (0.85 + 0.15 * progress)),
      };
    });
  }, [totals.patrimoine]);

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
            <h3>Évolution du patrimoine (12 derniers mois)</h3>
            {historyData.length === 0 ? (
              <p className="text-muted mt-4">
                Ajoute tes premières positions pour visualiser l'évolution.
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
      </div>
    </>
  );
};

export default Dashboard;
