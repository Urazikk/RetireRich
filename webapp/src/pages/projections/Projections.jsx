import { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { usePortfolio } from '../../context/PortfolioContext.jsx';
import { formatEUR } from '../../utils/format.js';

const Projections = () => {
  const { totals } = usePortfolio();
  const [params, setParams] = useState({
    years: 20,
    monthlyContribution: 500,
    annualReturn: 6,
  });

  const data = useMemo(() => {
    const startValue = totals.patrimoine || 0;
    const r = params.annualReturn / 100 / 12;
    const m = params.monthlyContribution;
    const series = [];
    let value = startValue;
    for (let year = 0; year <= params.years; year++) {
      series.push({ year, value: Math.round(value) });
      for (let i = 0; i < 12; i++) {
        value = value * (1 + r) + m;
      }
    }
    return series;
  }, [params, totals.patrimoine]);

  const finalValue = data.at(-1)?.value || 0;
  const totalContributions = params.monthlyContribution * 12 * params.years;

  return (
    <>
      <header className="header">
        <div>
          <h1>Projections</h1>
          <p className="text-muted">Simule l'évolution de ton patrimoine sur le long terme</p>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="col-span-4">
          <div className="glass-panel">
            <h3>Hypothèses</h3>
            <div style={{ marginTop: 16 }}>
              <div className="input-group">
                <label>Horizon (années)</label>
                <input
                  type="number"
                  value={params.years}
                  onChange={(e) => setParams((p) => ({ ...p, years: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="input-group">
                <label>Versement mensuel (€)</label>
                <input
                  type="number"
                  value={params.monthlyContribution}
                  onChange={(e) => setParams((p) => ({ ...p, monthlyContribution: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="input-group">
                <label>Rendement annuel (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={params.annualReturn}
                  onChange={(e) => setParams((p) => ({ ...p, annualReturn: Number(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-subtle)', borderRadius: 8 }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Valeur finale estimée</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: 4 }}>
                {formatEUR(finalValue)}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 8 }}>
                Versements cumulés : {formatEUR(totalContributions)}
                <br />
                Capital initial : {formatEUR(totals.patrimoine)}
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-8">
          <div className="glass-panel">
            <h3>Évolution projetée</h3>
            <div style={{ height: 360, marginTop: 16 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="gradProj" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="year" stroke="#6b6b6b" fontSize={12} />
                  <YAxis
                    stroke="#6b6b6b"
                    fontSize={12}
                    tickFormatter={(v) => formatEUR(v, { compact: true })}
                  />
                  <Tooltip
                    formatter={(v) => formatEUR(v)}
                    labelFormatter={(v) => `Année ${v}`}
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid rgba(0,0,0,0.08)',
                      borderRadius: 8,
                    }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#0a0a0a" strokeWidth={2} fill="url(#gradProj)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Projections;
