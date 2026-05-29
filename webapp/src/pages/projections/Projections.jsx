import { useEffect, useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext.jsx';
import { useLocalStorageState } from '../../utils/useLocalStorageState.js';
import { fetchHistory } from '../../utils/yahooApi.js';
import {
  computePortfolioMetrics,
  diversificationVerdict,
  projectPortfolio,
} from '../../utils/portfolioMetrics.js';
import { formatEUR, formatPercent } from '../../utils/format.js';
import KpiCard from '../../components/KpiCard.jsx';

const RISK_FREE = 0.03;

const sharpeColor = (s) => {
  if (s >= 1.0) return 'var(--accent)';
  if (s >= 0.5) return '#f59e0b';
  return 'var(--negative)';
};

const sharpeLabel = (s) => {
  if (s >= 2.0) return 'Exceptionnel';
  if (s >= 1.0) return 'Excellent';
  if (s >= 0.7) return 'Bon';
  if (s >= 0.4) return 'Acceptable';
  if (s >= 0) return 'Insuffisant';
  return 'Mauvais';
};

const PRIORITY_META = {
  high: { color: 'var(--negative)', label: 'À corriger', Icon: AlertCircle },
  medium: { color: '#f59e0b', label: 'À considérer', Icon: AlertCircle },
  info: { color: 'var(--text-muted)', label: 'Info', Icon: Info },
};

const Projections = () => {
  const { accounts, assets, totals } = usePortfolio();
  const [profile] = useLocalStorageState('retirerich_profile', {});
  const [recurring] = useLocalStorageState('retirerich_recurring', []);
  const [horizon, setHorizon] = useState(20);
  const [histories, setHistories] = useState({});
  const [loading, setLoading] = useState(false);

  // Compute monthly contribution from budget (income - expenses) + fallback
  const monthlyContribution = useMemo(() => {
    const fromBudget =
      recurring
        .filter((r) => r.type === 'income')
        .reduce((s, r) => s + Number(r.amount), 0) -
      recurring
        .filter((r) => r.type === 'expense')
        .reduce((s, r) => s + Number(r.amount), 0);
    return Math.max(0, fromBudget || Number(profile.monthlyContribution) || 0);
  }, [recurring, profile]);

  const positions = useMemo(() => {
    return assets
      .filter((a) => a.yahoo_ticker)
      .map((a) => ({
        ticker: a.yahoo_ticker,
        name: a.name,
        value:
          (Number(a.quantity) || 0) *
          (Number(a.currentPrice) || Number(a.purchasePrice) || 0),
        history: histories[a.yahoo_ticker] || [],
      }));
  }, [assets, histories]);

  // Fetch histories for each unique ticker
  useEffect(() => {
    const tickers = [...new Set(assets.map((a) => a.yahoo_ticker).filter(Boolean))];
    const missing = tickers.filter((t) => !(t in histories));
    if (missing.length === 0) return;
    setLoading(true);
    Promise.all(
      missing.map(async (t) => [t, await fetchHistory(t, '5y').catch(() => [])]),
    ).then((entries) => {
      setHistories((prev) => {
        const next = { ...prev };
        for (const [t, h] of entries) next[t] = h;
        return next;
      });
      setLoading(false);
    });
  }, [assets, histories]);

  const metrics = useMemo(
    () => computePortfolioMetrics({ positions, riskFree: RISK_FREE }),
    [positions],
  );

  const verdict = useMemo(
    () => (metrics.ok ? diversificationVerdict({ sharpe: metrics.sharpe, perPosition: metrics.perPosition }) : null),
    [metrics],
  );

  const startValue = totals.patrimoine;
  const annualReturn = metrics.ok ? metrics.annualReturn : 0.06;
  const annualVol = metrics.ok ? metrics.annualVol : 0.15;

  const projection = useMemo(
    () =>
      projectPortfolio({
        startValue,
        monthlyContribution,
        annualReturn,
        annualVol,
        years: horizon,
      }),
    [startValue, monthlyContribution, annualReturn, annualVol, horizon],
  );

  const finalValue = projection.at(-1) || { median: 0, upper: 0, lower: 0 };
  const totalContributions = monthlyContribution * 12 * horizon;

  return (
    <>
      <header className="header">
        <div>
          <h1>Projections</h1>
          <p className="text-muted">
            Simulation basée sur l'historique réel de ton portefeuille (Yahoo Finance)
          </p>
        </div>
      </header>

      {!metrics.ok && (
        <div className="glass-panel" style={{ marginBottom: 20 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Loader2 className="animate-spin" size={16} /> Chargement des historiques…
            </div>
          ) : (
            <p className="text-muted">
              {metrics.reason || 'Ajoute des positions avec un ticker Yahoo pour activer le calcul.'}
              <br />
              Les projections ci-dessous utilisent les valeurs par défaut (6 % / an, vol 15 %).
            </p>
          )}
        </div>
      )}

      <div className="dashboard-grid">
        <div className="col-span-3">
          <KpiCard
            label="Patrimoine actuel"
            value={formatEUR(startValue)}
            trendLabel={`Versement ${formatEUR(monthlyContribution)}/mois`}
            trend={1}
          />
        </div>
        <div className="col-span-3">
          <KpiCard
            label="Rendement annualisé"
            value={metrics.ok ? formatPercent(annualReturn * 100, { digits: 2 }) : '—'}
            trendLabel={metrics.ok ? `Sur ${metrics.monthsCount} mois` : 'Manque historique'}
            trend={metrics.ok ? annualReturn * 100 : null}
          />
        </div>
        <div className="col-span-3">
          <KpiCard
            label="Volatilité annuelle"
            value={metrics.ok ? formatPercent(annualVol * 100, { digits: 1 }) : '—'}
            trendLabel={
              metrics.ok
                ? annualVol < 0.10
                  ? 'Faible'
                  : annualVol < 0.20
                    ? 'Modérée'
                    : 'Élevée'
                : ''
            }
            trend={0}
          />
        </div>
        <div className="col-span-3">
          <div className="glass-panel kpi-card">
            <div className="kpi-label">Sharpe Ratio</div>
            <div
              className="kpi-value"
              style={{ color: metrics.ok ? sharpeColor(metrics.sharpe) : 'var(--text-muted)' }}
            >
              {metrics.ok ? metrics.sharpe.toFixed(2) : '—'}
            </div>
            {metrics.ok && (
              <div
                style={{
                  fontSize: '0.82rem',
                  color: sharpeColor(metrics.sharpe),
                  fontWeight: 600,
                }}
              >
                {sharpeLabel(metrics.sharpe)}
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12">
          <div className="glass-panel">
            <div className="flex-between" style={{ marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Projection sur {horizon} ans</h3>
              <div style={{ display: 'flex', gap: 4 }}>
                {[5, 10, 15, 20, 30].map((h) => (
                  <button
                    key={h}
                    onClick={() => setHorizon(h)}
                    className={`btn ${horizon === h ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                  >
                    {h} ans
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <Scenario
                label="Pessimiste (−1σ)"
                value={finalValue.lower}
                color="var(--negative)"
              />
              <Scenario
                label="Scénario médian"
                value={finalValue.median}
                color="var(--text)"
                bold
              />
              <Scenario
                label="Optimiste (+1σ)"
                value={finalValue.upper}
                color="var(--accent)"
              />
            </div>

            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projection}>
                  <defs>
                    <linearGradient id="gradMedian" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0a0a0a" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#0a0a0a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis
                    dataKey="year"
                    stroke="#6b6b6b"
                    fontSize={12}
                    tickFormatter={(v) => `${v}a`}
                  />
                  <YAxis
                    stroke="#6b6b6b"
                    fontSize={12}
                    tickFormatter={(v) => formatEUR(v, { compact: true })}
                  />
                  <Tooltip
                    formatter={(v, name) => [formatEUR(v), name]}
                    labelFormatter={(v) => `Année ${v}`}
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid rgba(0,0,0,0.08)',
                      borderRadius: 8,
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="upper"
                    name="Optimiste (+1σ)"
                    stroke="#22c55e"
                    fill="rgba(34,197,94,0.08)"
                    strokeWidth={1}
                  />
                  <Area
                    type="monotone"
                    dataKey="median"
                    name="Médian"
                    stroke="#0a0a0a"
                    fill="url(#gradMedian)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="lower"
                    name="Pessimiste (−1σ)"
                    stroke="#ef4444"
                    fill="rgba(239,68,68,0.06)"
                    strokeWidth={1}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <p
              style={{
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
                marginTop: 8,
              }}
            >
              Versements cumulés : {formatEUR(totalContributions)} · Capital initial :{' '}
              {formatEUR(startValue)}. Les bandes haute/basse correspondent à ±1 écart-type de la
              volatilité historique de ton portefeuille (≈ 68 % des scénarios).
            </p>
          </div>
        </div>

        {metrics.ok && (
          <>
            <div className="col-span-7">
              <div className="glass-panel">
                <h3>Métriques de risque</h3>
                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Row label="Sharpe Ratio (taux sans risque 3 %)" value={metrics.sharpe.toFixed(2)} />
                  <Row label="Rendement annualisé" value={formatPercent(metrics.annualReturn * 100, { digits: 2 })} />
                  <Row label="Volatilité annuelle" value={formatPercent(metrics.annualVol * 100, { digits: 1 })} />
                  <Row
                    label="Max Drawdown (perte max temporaire)"
                    value={formatPercent(-metrics.maxDrawdown * 100, { digits: 1 })}
                    color="var(--negative)"
                  />
                  <Row label="Période analysée" value={`${metrics.monthsCount} mois`} />
                  <Row label="Lignes analysables" value={`${metrics.perPosition.length} / ${assets.length}`} />
                </div>
              </div>
            </div>

            <div className="col-span-5">
              <div className="glass-panel">
                <h3>Verdict diversification</h3>
                <div style={{ marginTop: 12 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '6px 14px',
                      borderRadius: 999,
                      background: `${sharpeColor(metrics.sharpe)}15`,
                      color: sharpeColor(metrics.sharpe),
                      fontWeight: 600,
                    }}
                  >
                    {verdict.level} · seuil de référence {verdict.benchmark}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: '0.86rem',
                    color: 'var(--text-muted)',
                    marginTop: 12,
                  }}
                >
                  Un ETF MSCI World seul a un Sharpe historique d'environ {verdict.benchmark}. Si
                  ton Sharpe est sous ce seuil, ton mix n'apporte pas de valeur par rapport à
                  l'indice de référence.
                </p>
                <ul
                  style={{
                    marginTop: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  {verdict.recs.map((rec, i) => {
                    const meta = PRIORITY_META[rec.priority];
                    return (
                      <li
                        key={i}
                        style={{
                          display: 'flex',
                          gap: 8,
                          fontSize: '0.88rem',
                        }}
                      >
                        <meta.Icon size={16} color={meta.color} style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>{rec.text}</span>
                      </li>
                    );
                  })}
                  {verdict.recs.length === 0 && (
                    <li style={{ display: 'flex', gap: 8, fontSize: '0.88rem' }}>
                      <CheckCircle2 size={16} color="var(--accent)" />
                      Diversification cohérente, continue ainsi.
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="col-span-12">
              <div className="glass-panel">
                <h3>Détail par position</h3>
                <div className="table-container" style={{ marginTop: 12 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Position</th>
                        <th style={{ textAlign: 'right' }}>Poids</th>
                        <th style={{ textAlign: 'right' }}>Rendement annuel</th>
                        <th style={{ textAlign: 'right' }}>Volatilité</th>
                        <th style={{ textAlign: 'right' }}>Sharpe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...metrics.perPosition]
                        .sort((a, b) => b.weight - a.weight)
                        .map((p) => (
                          <tr key={p.ticker}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{p.name}</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {p.ticker}
                              </div>
                            </td>
                            <td style={{ textAlign: 'right' }}>{(p.weight * 100).toFixed(1)} %</td>
                            <td
                              style={{
                                textAlign: 'right',
                                color: p.annualReturn >= 0 ? 'var(--accent)' : 'var(--negative)',
                              }}
                            >
                              {formatPercent(p.annualReturn * 100, { digits: 1 })}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {formatPercent(p.annualVol * 100, { digits: 1 })}
                            </td>
                            <td
                              style={{
                                textAlign: 'right',
                                fontWeight: 600,
                                color: sharpeColor(p.sharpe),
                              }}
                            >
                              {p.sharpe.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

const Scenario = ({ label, value, color, bold }) => (
  <div
    style={{
      padding: 14,
      borderRadius: 8,
      background: 'var(--bg-subtle)',
      textAlign: 'center',
    }}
  >
    <div
      style={{
        fontSize: '0.74rem',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: bold ? '1.6rem' : '1.3rem',
        fontWeight: 700,
        color: color || 'var(--text)',
        marginTop: 4,
      }}
    >
      {formatEUR(value)}
    </div>
  </div>
);

const Row = ({ label, value, color }) => (
  <div className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
    <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{label}</span>
    <span
      style={{
        fontWeight: 600,
        color: color || 'var(--text)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {value}
    </span>
  </div>
);

export default Projections;
