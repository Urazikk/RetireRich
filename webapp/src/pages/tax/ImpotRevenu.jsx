import { useMemo, useState } from 'react';
import { useLocalStorageState } from '../../utils/useLocalStorageState.js';
import { formatEUR, formatPercent } from '../../utils/format.js';
import {
  TAX_CATEGORIES,
  TAX_STRATEGIES,
  recommendStrategies,
} from '../../utils/taxStrategies.js';
import KpiCard from '../../components/KpiCard.jsx';

const BRACKETS_2026 = [
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
  for (const b of BRACKETS_2026) {
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
  const [profile] = useLocalStorageState('retirerich_profile', {});
  const incomeDefault =
    (Number(profile.monthlyIncome) || 3500) * 12;
  const [income, setIncome] = useState(incomeDefault);
  const [parts, setParts] = useState(1);
  const [perInput, setPerInput] = useState(0);
  const [donInput, setDonInput] = useState(0);
  const [emploiInput, setEmploiInput] = useState(0);
  const [hasKids, setHasKids] = useState(false);
  const [owner, setOwner] = useState(false);
  const [hasRental, setHasRental] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const result = useMemo(() => computeIR(income, parts), [income, parts]);

  // Total reductions from active inputs
  const perReduction = useMemo(() => {
    if (perInput <= 0) return 0;
    const before = computeIR(income, parts).ir;
    const after = computeIR(Math.max(0, income - perInput), parts).ir;
    return before - after;
  }, [income, perInput, parts]);

  const donReduction = useMemo(() => {
    const first1000 = Math.min(donInput, 1000);
    const rest = Math.max(0, donInput - 1000);
    const maxBase = income * 0.20;
    const eligibleRest = Math.min(rest, Math.max(0, maxBase - 1000));
    return first1000 * 0.75 + eligibleRest * 0.66;
  }, [donInput, income]);

  const emploiReduction = useMemo(() => {
    const cap = hasKids ? 15000 : 12000;
    return Math.min(emploiInput, cap) * 0.5;
  }, [emploiInput, hasKids]);

  const totalReduction = perReduction + donReduction + emploiReduction;
  const irFinal = Math.max(0, result.ir - totalReduction);
  const effectiveTaxRate = income > 0 ? (irFinal / income) * 100 : 0;

  const recommendedStrategies = useMemo(
    () =>
      recommendStrategies({
        tmi: result.tmi * 100,
        hasKids,
        owner,
        hasRental,
      }).slice(0, 6),
    [result.tmi, hasKids, owner, hasRental],
  );

  const filteredStrategies = useMemo(() => {
    if (categoryFilter === 'all') return TAX_STRATEGIES;
    return TAX_STRATEGIES.filter((s) => s.category === categoryFilter);
  }, [categoryFilter]);

  return (
    <>
      <header className="header">
        <div>
          <h1>Impôts & Défiscalisation</h1>
          <p className="text-muted">
            Barème 2026, simulateur de réductions, catalogue des dispositifs légaux
          </p>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="col-span-3">
          <KpiCard label="Revenu imposable" value={formatEUR(income)} />
        </div>
        <div className="col-span-3">
          <KpiCard
            label="IR brut (barème)"
            value={formatEUR(result.ir)}
            trendLabel={`TMI ${formatPercent(result.tmi * 100, { digits: 0 })}`}
            trend={result.tmi * 100}
          />
        </div>
        <div className="col-span-3">
          <KpiCard
            label="Réductions activées"
            value={formatEUR(totalReduction)}
            trend={totalReduction > 0 ? 1 : 0}
            trendLabel={totalReduction > 0 ? 'Économie d\'impôt' : 'Aucune'}
          />
        </div>
        <div className="col-span-3">
          <KpiCard
            label="IR final"
            value={formatEUR(irFinal)}
            trendLabel={`Taux effectif ${effectiveTaxRate.toFixed(2)} %`}
            trend={-totalReduction}
          />
        </div>

        <div className="col-span-6">
          <div className="glass-panel">
            <h3>Profil fiscal</h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginTop: 14,
              }}
            >
              <Field label="Revenu net imposable annuel (€)">
                <input
                  type="number"
                  value={income}
                  onChange={(e) => setIncome(Number(e.target.value) || 0)}
                />
              </Field>
              <Field label="Parts fiscales">
                <input
                  type="number"
                  step="0.5"
                  value={parts}
                  onChange={(e) => setParts(Math.max(0.5, Number(e.target.value) || 1))}
                />
              </Field>
            </div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Toggle
                label="J'ai des enfants à charge"
                checked={hasKids}
                onChange={setHasKids}
              />
              <Toggle
                label="Je suis propriétaire de ma résidence"
                checked={owner}
                onChange={setOwner}
              />
              <Toggle
                label="J'ai du locatif"
                checked={hasRental}
                onChange={setHasRental}
              />
            </div>
          </div>
        </div>

        <div className="col-span-6">
          <div className="glass-panel">
            <h3>Simulateur de réductions</h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Saisis tes montants pour voir l'impact direct sur ton IR.
            </p>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <ReductionLine
                label="Versement PER (€)"
                hint={`Déduction × TMI (${formatPercent(result.tmi * 100, { digits: 0 })})`}
                value={perInput}
                onChange={setPerInput}
                economy={perReduction}
              />
              <ReductionLine
                label="Dons aux associations (€)"
                hint="75 % jusqu'à 1 000 €, puis 66 %"
                value={donInput}
                onChange={setDonInput}
                economy={donReduction}
              />
              <ReductionLine
                label="Emploi à domicile / garde enfants (€)"
                hint={`Crédit 50 % (plafond ${hasKids ? '15 000' : '12 000'} €)`}
                value={emploiInput}
                onChange={setEmploiInput}
                economy={emploiReduction}
              />
            </div>
          </div>
        </div>

        <div className="col-span-12">
          <div className="glass-panel">
            <h3>Dispositifs recommandés pour ton profil</h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Classés par pertinence selon ta TMI ({formatPercent(result.tmi * 100, { digits: 0 })}) et ta situation.
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
                marginTop: 16,
              }}
            >
              {recommendedStrategies.map((s) => {
                const cat = TAX_CATEGORIES.find((c) => c.id === s.category);
                return (
                  <StrategyCard key={s.id} strategy={s} category={cat} compact />
                );
              })}
            </div>
          </div>
        </div>

        <div className="col-span-12">
          <div className="glass-panel">
            <div className="flex-between" style={{ marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>Catalogue complet des dispositifs</h3>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ maxWidth: 280 }}
              >
                <option value="all">Toutes catégories ({TAX_STRATEGIES.length})</option>
                {TAX_CATEGORIES.map((c) => {
                  const count = TAX_STRATEGIES.filter((s) => s.category === c.id).length;
                  return (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.label} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
              }}
            >
              {filteredStrategies.map((s) => {
                const cat = TAX_CATEGORIES.find((c) => c.id === s.category);
                return <StrategyCard key={s.id} strategy={s} category={cat} />;
              })}
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

const Toggle = ({ label, checked, onChange }) => (
  <label
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      cursor: 'pointer',
      fontSize: '0.9rem',
    }}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      style={{ width: 18, height: 18 }}
    />
    {label}
  </label>
);

const ReductionLine = ({ label, hint, value, onChange, economy }) => (
  <div>
    <div className="flex-between" style={{ marginBottom: 4 }}>
      <label style={{ fontSize: '0.86rem', fontWeight: 500 }}>{label}</label>
      {economy > 0 && (
        <span
          style={{
            fontSize: '0.82rem',
            fontWeight: 700,
            color: 'var(--accent)',
          }}
        >
          −{formatEUR(economy)} d'impôt
        </span>
      )}
    </div>
    <input
      type="number"
      value={value || ''}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      placeholder="0"
    />
    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{hint}</span>
  </div>
);

const StrategyCard = ({ strategy: s, category, compact = false }) => {
  const stars = '★'.repeat(s.moveScore) + '☆'.repeat(5 - s.moveScore);
  return (
    <div
      style={{
        padding: 16,
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--bg)',
        borderLeft: `4px solid ${category?.color || 'var(--border)'}`,
      }}
    >
      <div className="flex-between" style={{ marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '1.2rem' }}>{category?.icon || '•'}</span>
          <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{s.label}</span>
        </div>
        <span style={{ fontSize: '0.74rem', color: '#f59e0b' }} title={`${s.moveScore}/5`}>
          {stars}
        </span>
      </div>
      <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: 4 }}>
        {s.tagline}
      </p>
      {!compact && (
        <>
          <Detail label="Mécanisme" text={s.mechanism} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            {s.reductionFormula && <Detail label="Économie" text={s.reductionFormula} small />}
            {s.ceiling && <Detail label="Plafond" text={s.ceiling} small />}
            {s.duration && <Detail label="Engagement" text={s.duration} small />}
            {s.bestIf && <Detail label="Pour qui" text={s.bestIf} small color="var(--accent)" />}
          </div>
          {s.caveat && (
            <div
              style={{
                marginTop: 10,
                padding: 8,
                background: 'rgba(239,68,68,0.05)',
                borderRadius: 6,
                fontSize: '0.82rem',
                color: 'var(--negative)',
              }}
            >
              ⚠ {s.caveat}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const Detail = ({ label, text, small, color }) => (
  <div style={{ marginTop: small ? 0 : 10 }}>
    <div
      style={{
        fontSize: small ? '0.70rem' : '0.74rem',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        fontWeight: 600,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: small ? '0.82rem' : '0.86rem',
        marginTop: 2,
        lineHeight: 1.5,
        color: color || 'var(--text)',
      }}
    >
      {text}
    </div>
  </div>
);

export default ImpotRevenu;
