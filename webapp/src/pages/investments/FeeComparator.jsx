import { useMemo, useState } from 'react';
import { ArrowLeft, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BROKER_PRESETS, BROKER_INFO } from '../../utils/accountTypes.js';
import { formatEUR } from '../../utils/format.js';

const ENVELOPES = [
  { id: 'PEA', label: 'PEA / PEA-PME', category: 'market', defaults: { value: 50000, ordersPerYear: 12, avgOrder: 1000, monthlyContribution: 500 } },
  { id: 'CTO', label: 'Compte-Titres Ordinaire', category: 'market', defaults: { value: 20000, ordersPerYear: 24, avgOrder: 500, monthlyContribution: 200 } },
  { id: 'Assurance Vie', label: 'Assurance Vie', category: 'assurance', defaults: { value: 30000, ordersPerYear: 0, avgOrder: 0, monthlyContribution: 300 } },
  { id: 'PER', label: 'PER', category: 'assurance', defaults: { value: 15000, ordersPerYear: 0, avgOrder: 0, monthlyContribution: 200 } },
  { id: 'SCPI', label: 'SCPI (Immobilier papier)', category: 'real_estate', defaults: { value: 30000, ordersPerYear: 0, avgOrder: 0, monthlyContribution: 0 } },
];

const computeAnnualCost = (preset, params) => {
  const { value, ordersPerYear, avgOrder, monthlyContribution } = params;
  const annualContribution = monthlyContribution * 12;
  const gardeCost = ((preset.garde || 0) / 100) * value;
  const gestionCost = ((preset.gestion || 0) / 100) * value;
  const courtageCost = ((preset.courtage || 0) / 100) * ordersPerYear * avgOrder;
  const versementCost = ((preset.versement || 0) / 100) * annualContribution;
  return {
    garde: gardeCost,
    gestion: gestionCost,
    courtage: courtageCost,
    versement: versementCost,
    total: gardeCost + gestionCost + courtageCost + versementCost,
  };
};

const FeeComparator = () => {
  const [envelopeId, setEnvelopeId] = useState('PEA');
  const envelope = ENVELOPES.find((e) => e.id === envelopeId) || ENVELOPES[0];
  const [params, setParams] = useState(envelope.defaults);

  const setEnvelope = (id) => {
    setEnvelopeId(id);
    const e = ENVELOPES.find((x) => x.id === id);
    if (e) setParams(e.defaults);
  };

  const results = useMemo(() => {
    return Object.entries(BROKER_PRESETS)
      .filter(([name]) => {
        const info = BROKER_INFO[name];
        return info && info.supports?.includes(envelope.category);
      })
      .map(([name, preset]) => ({
        name,
        info: BROKER_INFO[name],
        preset,
        cost: computeAnnualCost(preset, params),
      }))
      .sort((a, b) => a.cost.total - b.cost.total);
  }, [envelope.category, params]);

  const minCost = results[0]?.cost.total || 0;
  const maxCost = results.at(-1)?.cost.total || 1;

  return (
    <>
      <header className="header">
        <div>
          <Link to="/investments" style={{ color: 'var(--text-muted)', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <ArrowLeft size={14} /> Retour aux investissements
          </Link>
          <h1>Comparateur de frais</h1>
          <p className="text-muted">Compare le coût annuel total selon ton profil et ton enveloppe</p>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="col-span-12">
          <div className="glass-panel">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {ENVELOPES.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setEnvelope(e.id)}
                  className={`btn ${envelopeId === e.id ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.85rem' }}
                >
                  {e.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <Field label="Encours moyen (€)">
                <input
                  type="number"
                  value={params.value}
                  onChange={(e) => setParams((p) => ({ ...p, value: Number(e.target.value) || 0 }))}
                />
              </Field>
              <Field label="Ordres / an">
                <input
                  type="number"
                  value={params.ordersPerYear}
                  onChange={(e) => setParams((p) => ({ ...p, ordersPerYear: Number(e.target.value) || 0 }))}
                  disabled={envelope.category !== 'market'}
                />
              </Field>
              <Field label="Montant moyen / ordre (€)">
                <input
                  type="number"
                  value={params.avgOrder}
                  onChange={(e) => setParams((p) => ({ ...p, avgOrder: Number(e.target.value) || 0 }))}
                  disabled={envelope.category !== 'market'}
                />
              </Field>
              <Field label="Versement mensuel (€)">
                <input
                  type="number"
                  value={params.monthlyContribution}
                  onChange={(e) => setParams((p) => ({ ...p, monthlyContribution: Number(e.target.value) || 0 }))}
                />
              </Field>
            </div>
          </div>
        </div>

        <div className="col-span-12">
          <div className="glass-panel">
            <div className="flex-between" style={{ marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Classement par coût annuel</h3>
              <span className="text-muted" style={{ fontSize: '0.82rem' }}>
                {results.length} courtiers éligibles
              </span>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Courtier</th>
                    <th style={{ textAlign: 'right' }}>Garde</th>
                    <th style={{ textAlign: 'right' }}>Gestion</th>
                    <th style={{ textAlign: 'right' }}>Courtage</th>
                    <th style={{ textAlign: 'right' }}>Versement</th>
                    <th style={{ textAlign: 'right' }}>Total / an</th>
                    <th style={{ width: 120 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => {
                    const ratio = maxCost > minCost ? (r.cost.total - minCost) / (maxCost - minCost) : 0;
                    const bestSavings = r.cost.total - minCost;
                    return (
                      <tr key={r.name}>
                        <td style={{ color: i === 0 ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 700 }}>
                          {i + 1}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.name}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {r.info?.tagline}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>{formatEUR(r.cost.garde)}</td>
                        <td style={{ textAlign: 'right' }}>{formatEUR(r.cost.gestion)}</td>
                        <td style={{ textAlign: 'right' }}>{formatEUR(r.cost.courtage)}</td>
                        <td style={{ textAlign: 'right' }}>{formatEUR(r.cost.versement)}</td>
                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: 700,
                            color: i === 0 ? 'var(--accent)' : 'var(--text)',
                          }}
                        >
                          {formatEUR(r.cost.total)}
                          {i > 0 && (
                            <div style={{ fontSize: '0.74rem', color: 'var(--negative)', fontWeight: 500 }}>
                              +{formatEUR(bestSavings)} vs #1
                            </div>
                          )}
                        </td>
                        <td>
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
                                width: `${Math.max(2, ratio * 100)}%`,
                                height: '100%',
                                background:
                                  ratio < 0.33 ? 'var(--accent)' : ratio < 0.66 ? '#f59e0b' : 'var(--negative)',
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {results.length > 1 && (
              <div
                style={{
                  marginTop: 16,
                  padding: 14,
                  background: 'rgba(34,197,94,0.06)',
                  border: '1px solid rgba(34,197,94,0.20)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <TrendingDown size={20} color="var(--accent)" />
                <div>
                  <div style={{ fontWeight: 600 }}>
                    Économie potentielle : {formatEUR(results.at(-1).cost.total - minCost)} / an
                  </div>
                  <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                    En passant du courtier le plus cher ({results.at(-1).name}) au moins cher ({results[0].name}).
                  </div>
                </div>
              </div>
            )}
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

export default FeeComparator;
