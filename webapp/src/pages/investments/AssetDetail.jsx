import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ArrowLeft, ExternalLink, Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import { fetchHistory, fetchProfile, fetchQuote } from '../../utils/yahooApi.js';
import { formatEUR, formatPercent } from '../../utils/format.js';
import KpiCard from '../../components/KpiCard.jsx';

const RANGES = [
  { id: '1mo', label: '1M' },
  { id: '3mo', label: '3M' },
  { id: '6mo', label: '6M' },
  { id: '1y', label: '1A' },
  { id: '2y', label: '2A' },
  { id: '5y', label: '5A' },
  { id: 'max', label: 'Max' },
];

const SECTOR_LABELS = {
  realestate: 'Immobilier',
  consumer_cyclical: 'Conso cyclique',
  basic_materials: 'Matériaux',
  consumer_defensive: 'Conso défensive',
  technology: 'Technologie',
  communication_services: 'Communication',
  financial_services: 'Finance',
  utilities: 'Services publics',
  industrials: 'Industrie',
  energy: 'Énergie',
  healthcare: 'Santé',
};

const SECTOR_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6',
  '#06b6d4', '#ef4444', '#10b981', '#f97316', '#a855f7', '#14b8a6',
];

const AssetDetail = () => {
  const { ticker } = useParams();
  const [range, setRange] = useState('1y');
  const [history, setHistory] = useState([]);
  const [profile, setProfile] = useState(null);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [h, p, q] = await Promise.all([
        fetchHistory(ticker, range),
        fetchProfile(ticker),
        fetchQuote(ticker),
      ]);
      if (cancelled) return;
      setHistory(h);
      setProfile(p);
      setQuote(q);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [ticker, range]);

  const perf = useMemo(() => {
    if (history.length < 2) return null;
    const first = history[0].price;
    const last = history.at(-1).price;
    return {
      first,
      last,
      diff: last - first,
      pct: ((last - first) / first) * 100,
    };
  }, [history]);

  const sectorData = useMemo(() => {
    if (!profile?.sectorWeightings) return [];
    return profile.sectorWeightings
      .flatMap((entry) => Object.entries(entry))
      .filter(([, v]) => typeof v === 'object' && v?.raw > 0)
      .map(([key, v], i) => ({
        name: SECTOR_LABELS[key] || key,
        value: (v.raw || 0) * 100,
        color: SECTOR_COLORS[i % SECTOR_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [profile]);

  return (
    <>
      <header className="header">
        <div>
          <Link
            to="/investments"
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
          <h1>{profile?.name || ticker}</h1>
          <p className="text-muted">
            {ticker}
            {profile?.exchange && ` · ${profile.exchange}`}
            {profile?.kind && ` · ${profile.kind}`}
          </p>
        </div>
        {profile?.website && (
          <a
            href={profile.website}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
          >
            Site officiel <ExternalLink size={14} />
          </a>
        )}
      </header>

      <div className="dashboard-grid">
        <div className="col-span-3">
          <KpiCard label="Cours actuel" value={quote ? formatEUR(quote) : '—'} />
        </div>
        <div className="col-span-3">
          <KpiCard
            label={`Performance ${range.toUpperCase()}`}
            value={perf ? formatPercent(perf.pct, { digits: 2 }) : '—'}
            trend={perf?.pct}
          />
        </div>
        <div className="col-span-3">
          <KpiCard
            label="Secteur"
            value={profile?.sector || profile?.categoryName || '—'}
          />
        </div>
        <div className="col-span-3">
          <KpiCard label="Pays / Famille" value={profile?.country || profile?.family || '—'} />
        </div>

        <div className="col-span-12">
          <div className="glass-panel">
            <div className="flex-between" style={{ marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Historique du cours</h3>
              <div style={{ display: 'flex', gap: 4 }}>
                {RANGES.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRange(r.id)}
                    className={`btn ${range === r.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ height: 360 }}>
              {loading ? (
                <div className="flex-center" style={{ height: '100%' }}>
                  <Loader2 className="animate-spin" />
                </div>
              ) : history.length === 0 ? (
                <p className="text-muted">Aucune donnée historique disponible pour ce ticker.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="gradAsset" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor={perf && perf.pct >= 0 ? '#22c55e' : '#ef4444'}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor={perf && perf.pct >= 0 ? '#22c55e' : '#ef4444'}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} />
                    <XAxis dataKey="date" stroke="#6b6b6b" fontSize={12} tickLine={false} />
                    <YAxis
                      stroke="#6b6b6b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={(v) => v.toFixed(0)}
                    />
                    <Tooltip
                      formatter={(v) => `${Number(v).toFixed(2)} ${profile?.currency || 'EUR'}`}
                      contentStyle={{
                        background: '#fff',
                        border: '1px solid rgba(0,0,0,0.08)',
                        borderRadius: 8,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke={perf && perf.pct >= 0 ? '#22c55e' : '#ef4444'}
                      strokeWidth={2}
                      fill="url(#gradAsset)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {sectorData.length > 0 && (
          <div className="col-span-6">
            <div className="glass-panel">
              <h3>Exposition sectorielle (ETF)</h3>
              <ul style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sectorData.map((entry) => (
                  <li key={entry.name}>
                    <div className="flex-between" style={{ marginBottom: 4 }}>
                      <span style={{ fontWeight: 500 }}>{entry.name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{entry.value.toFixed(1)} %</span>
                    </div>
                    <div
                      style={{
                        height: 8,
                        background: 'var(--bg-subtle)',
                        borderRadius: 4,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${entry.value}%`,
                          height: '100%',
                          background: entry.color,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {profile?.topHoldings?.length > 0 && (
          <div className={sectorData.length > 0 ? 'col-span-6' : 'col-span-12'}>
            <div className="glass-panel">
              <h3>Principales lignes</h3>
              <div className="table-container" style={{ marginTop: 12 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Société</th>
                      <th>Symbole</th>
                      <th style={{ textAlign: 'right' }}>Poids</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.topHoldings.slice(0, 10).map((h, i) => (
                      <tr key={`${h.symbol}-${i}`}>
                        <td style={{ fontWeight: 500 }}>{h.holdingName || '—'}</td>
                        <td>{h.symbol || '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {h.holdingPercent?.raw ? `${(h.holdingPercent.raw * 100).toFixed(2)} %` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {profile?.summary && (
          <div className="col-span-12">
            <div className="glass-panel">
              <h3>À propos</h3>
              <p style={{ marginTop: 12, fontSize: '0.92rem', lineHeight: 1.6 }}>
                {profile.summary}
              </p>
              <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.86rem' }}>
                {profile.industry && (
                  <span>
                    <span style={{ color: 'var(--text-muted)' }}>Industrie : </span>
                    {profile.industry}
                  </span>
                )}
                {profile.country && (
                  <span>
                    <span style={{ color: 'var(--text-muted)' }}>Pays : </span>
                    {profile.country}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AssetDetail;
