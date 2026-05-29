import { useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { AlertCircle, CheckCircle2, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext.jsx';
import { useLocalStorageState } from '../../utils/useLocalStorageState.js';
import { computeScore, STRATEGIES } from '../../utils/scoringEngine.js';
import { formatPercent } from '../../utils/format.js';

const scoreColor = (score) => {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#84cc16';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
};

const scoreLabel = (score) => {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Solide';
  if (score >= 50) return 'Acceptable';
  if (score >= 30) return 'À renforcer';
  return 'Critique';
};

const PRIORITY_META = {
  high: { color: 'var(--negative)', label: 'Action prioritaire', Icon: AlertCircle },
  medium: { color: '#f59e0b', label: 'À considérer', Icon: AlertCircle },
  info: { color: 'var(--text-muted)', label: 'Info', Icon: Info },
};

const Conseil = () => {
  const { accounts, assets, totals } = usePortfolio();
  const [profile, setProfile] = useLocalStorageState('retirerich_profile', {
    age: '',
    monthlyIncome: '',
    monthlyExpenses: '',
    monthlyContribution: '',
  });
  const [openCategory, setOpenCategory] = useState(null);
  const [strategyId, setStrategyId] = useState('equilibree');

  const result = useMemo(
    () =>
      computeScore({
        accounts,
        assets,
        totalPatrimoine: totals.patrimoine,
        monthlyIncome: Number(profile.monthlyIncome) || 0,
        monthlyExpenses: Number(profile.monthlyExpenses) || 0,
        monthlyContribution: Number(profile.monthlyContribution) || 0,
        age: Number(profile.age) || null,
      }),
    [accounts, assets, totals.patrimoine, profile],
  );

  const strategy = STRATEGIES.find((s) => s.id === strategyId) || STRATEGIES[1];

  return (
    <>
      <header className="header">
        <div>
          <h1>Conseil</h1>
          <p className="text-muted">
            Évaluation patrimoniale selon les meilleures pratiques (Finary, Mathias Baccino…)
          </p>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="col-span-4">
          <div className="glass-panel" style={{ textAlign: 'center' }}>
            <div className="kpi-label">Score global</div>
            <div
              style={{
                fontSize: '4rem',
                fontWeight: 700,
                color: scoreColor(result.global),
                lineHeight: 1,
                marginTop: 8,
              }}
            >
              {result.global}
              <span style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>/100</span>
            </div>
            <div
              style={{
                marginTop: 8,
                fontWeight: 600,
                color: scoreColor(result.global),
              }}
            >
              {scoreLabel(result.global)}
            </div>
            <p
              style={{
                fontSize: '0.86rem',
                marginTop: 14,
                color: 'var(--text-muted)',
              }}
            >
              Moyenne pondérée des 7 catégories ci-dessous. Améliore les zones rouges pour faire
              monter ton score.
            </p>
          </div>
        </div>

        <div className="col-span-8">
          <div className="glass-panel">
            <h3>Ton profil</h3>
            <p
              style={{ fontSize: '0.86rem', marginTop: 4, color: 'var(--text-muted)' }}
            >
              Renseigne ces infos pour des conseils précis. Elles restent en local.
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 12,
                marginTop: 16,
              }}
            >
              <Field label="Âge">
                <input
                  type="number"
                  value={profile.age}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, age: e.target.value }))
                  }
                  placeholder="32"
                />
              </Field>
              <Field label="Revenus / mois (€)">
                <input
                  type="number"
                  value={profile.monthlyIncome}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, monthlyIncome: e.target.value }))
                  }
                  placeholder="3500"
                />
              </Field>
              <Field label="Dépenses fixes / mois (€)">
                <input
                  type="number"
                  value={profile.monthlyExpenses}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, monthlyExpenses: e.target.value }))
                  }
                  placeholder="2200"
                />
              </Field>
              <Field label="Versement épargne / mois (€)">
                <input
                  type="number"
                  value={profile.monthlyContribution}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, monthlyContribution: e.target.value }))
                  }
                  placeholder="500"
                />
              </Field>
            </div>
          </div>
        </div>

        <div className="col-span-12">
          <div className="glass-panel">
            <h3>Détail par catégorie</h3>
            <ul style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {result.categories.map((cat) => {
                const isOpen = openCategory === cat.id;
                return (
                  <li
                    key={cat.id}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      background: 'var(--bg)',
                    }}
                  >
                    <button
                      onClick={() => setOpenCategory(isOpen ? null : cat.id)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 0,
                        padding: '14px 16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                      }}
                    >
                      <span style={{ fontSize: '1.4rem' }}>{cat.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div className="flex-between" style={{ marginBottom: 6 }}>
                          <span style={{ fontWeight: 600 }}>{cat.label}</span>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            Poids {Math.round(cat.weight * 100)} %
                          </span>
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
                              width: `${cat.score}%`,
                              height: '100%',
                              background: scoreColor(cat.score),
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: '1.4rem',
                          fontWeight: 700,
                          color: scoreColor(cat.score),
                          minWidth: 70,
                          textAlign: 'right',
                        }}
                      >
                        {cat.score}
                      </div>
                      {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    {isOpen && cat.recs.length > 0 && (
                      <div
                        style={{
                          padding: '6px 16px 14px 60px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                        }}
                      >
                        {cat.recs.map((rec, i) => {
                          const meta = PRIORITY_META[rec.priority] || PRIORITY_META.info;
                          return (
                            <div
                              key={i}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 10,
                                fontSize: '0.92rem',
                              }}
                            >
                              <meta.Icon size={16} color={meta.color} style={{ flexShrink: 0, marginTop: 2 }} />
                              <div>
                                <div
                                  style={{
                                    fontSize: '0.72rem',
                                    color: meta.color,
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                  }}
                                >
                                  {meta.label}
                                </div>
                                <div>{rec.text}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="col-span-12">
          <div className="glass-panel">
            <h3>Stratégies d'allocation modèles</h3>
            <p
              style={{ fontSize: '0.86rem', marginTop: 4, color: 'var(--text-muted)' }}
            >
              Trois cibles types selon ton horizon et ta tolérance au risque. À adapter à ta situation.
            </p>

            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              {STRATEGIES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStrategyId(s.id)}
                  className={`btn ${strategyId === s.id ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1.5fr',
                gap: 24,
                marginTop: 20,
              }}
            >
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={strategy.allocation}
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {strategy.allocation.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `${v} %`} />
                  </PieChart>
                </ResponsiveContainer>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    fontSize: '0.78rem',
                    justifyContent: 'center',
                  }}
                >
                  {strategy.allocation
                    .filter((a) => a.value > 0)
                    .map((a) => (
                      <span
                        key={a.name}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <span
                          style={{
                            width: 9,
                            height: 9,
                            borderRadius: 2,
                            background: a.color,
                            display: 'inline-block',
                          }}
                        />
                        {a.name} {a.value}%
                      </span>
                    ))}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Profil cible
                </div>
                <div style={{ marginTop: 4, fontWeight: 600 }}>{strategy.profile}</div>
                <p style={{ marginTop: 12, fontSize: '0.92rem' }}>
                  {strategy.description}
                </p>
                <div
                  style={{
                    marginTop: 14,
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Étapes clés
                </div>
                <ul style={{ marginTop: 6, paddingLeft: 18, listStyle: 'disc' }}>
                  {strategy.keyMoves.map((m, i) => (
                    <li key={i} style={{ fontSize: '0.92rem', marginTop: 4 }}>
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const Field = ({ label, children }) => (
  <div className="input-group" style={{ marginBottom: 0 }}>
    <label>{label}</label>
    {children}
  </div>
);

export default Conseil;
