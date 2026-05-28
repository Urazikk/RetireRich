import { useMemo, useState } from 'react';
import { formatEUR, formatPercent } from '../../utils/format.js';

const BRACKETS_2025 = [
  { upTo: 11497, rate: 0 },
  { upTo: 29315, rate: 0.11 },
  { upTo: 83823, rate: 0.30 },
  { upTo: 180294, rate: 0.41 },
  { upTo: Infinity, rate: 0.45 },
];

const computeIR = (taxableIncome, parts = 1) => {
  if (taxableIncome <= 0) return { ir: 0, tmi: 0, parts };
  const perPart = taxableIncome / parts;
  let ir = 0;
  let prev = 0;
  let tmi = 0;
  for (const b of BRACKETS_2025) {
    if (perPart > b.upTo) {
      ir += (b.upTo - prev) * b.rate;
      prev = b.upTo;
      tmi = b.rate;
    } else {
      ir += (perPart - prev) * b.rate;
      tmi = b.rate;
      break;
    }
  }
  return { ir: ir * parts, tmi, parts };
};

const ImpotRevenu = () => {
  const [income, setIncome] = useState(45000);
  const [parts, setParts] = useState(1);
  const [perInput, setPerInput] = useState(0);

  const result = useMemo(() => computeIR(income, parts), [income, parts]);
  const resultAfterPer = useMemo(() => computeIR(Math.max(0, income - perInput), parts), [income, perInput, parts]);
  const savings = result.ir - resultAfterPer.ir;

  return (
    <>
      <header className="header">
        <div>
          <h1>Impôt sur le Revenu</h1>
          <p className="text-muted">Simulation IR (barème 2025) et gain PER</p>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="col-span-6">
          <div className="glass-panel">
            <h3>Tes paramètres</h3>
            <div style={{ marginTop: 16 }}>
              <div className="input-group">
                <label>Revenu net imposable annuel (€)</label>
                <input
                  type="number"
                  value={income}
                  onChange={(e) => setIncome(Number(e.target.value) || 0)}
                />
              </div>
              <div className="input-group">
                <label>Nombre de parts fiscales</label>
                <input
                  type="number"
                  step="0.5"
                  value={parts}
                  onChange={(e) => setParts(Math.max(0.5, Number(e.target.value) || 1))}
                />
              </div>
              <div className="input-group">
                <label>Versement PER (€)</label>
                <input
                  type="number"
                  value={perInput}
                  onChange={(e) => setPerInput(Number(e.target.value) || 0)}
                  placeholder="Simule un versement déductible"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-6">
          <div className="glass-panel">
            <h3>Résultats</h3>
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Row label="Impôt sur le Revenu" value={formatEUR(result.ir)} />
              <Row label="TMI (tranche marginale)" value={formatPercent(result.tmi * 100, { digits: 0 })} />
              <Row
                label="Impôt après versement PER"
                value={formatEUR(resultAfterPer.ir)}
              />
              <div
                style={{
                  marginTop: 4,
                  padding: 14,
                  borderRadius: 8,
                  background: savings > 0 ? 'rgba(34,197,94,0.08)' : 'var(--bg-subtle)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Économie d'impôt potentielle
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent)' }}>
                  {formatEUR(Math.max(0, savings))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const Row = ({ label, value }) => (
  <div className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
    <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
  </div>
);

export default ImpotRevenu;
