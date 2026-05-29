import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, CalendarRange } from 'lucide-react';
import { useLocalStorageState } from '../../utils/useLocalStorageState.js';
import { formatEUR, formatPercent } from '../../utils/format.js';

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Budget categories — opinionated structure inspired by 50/30/20 + YNAB
const CATEGORY_GROUPS = [
  {
    id: 'income',
    label: 'Revenus',
    color: '#22c55e',
    categories: ['Salaire', 'Indépendant', 'Aides', 'Revenus locatifs', 'Dividendes', 'Autre revenu'],
  },
  {
    id: 'fixed',
    label: 'Charges fixes (Besoins)',
    color: '#3b82f6',
    categories: ['Logement', 'Énergie / Eau', 'Internet / Mobile', 'Assurance', 'Mutuelle', 'Transports fixe', 'Crédits'],
  },
  {
    id: 'variable',
    label: 'Charges variables (Besoins)',
    color: '#06b6d4',
    categories: ['Alimentation', 'Transports variable', 'Santé', 'Garde enfants', 'Divers vital'],
  },
  {
    id: 'lifestyle',
    label: 'Mode de vie (Envies)',
    color: '#f59e0b',
    categories: ['Restaurant / Bar', 'Loisirs', 'Sport', 'Abonnements', 'Voyage', 'Shopping', 'Cadeaux'],
  },
  {
    id: 'savings',
    label: 'Épargne & Investissement',
    color: '#8b5cf6',
    categories: ['Épargne précaution', 'PEA', 'Assurance Vie', 'Crypto', 'PER', 'Autres versements'],
  },
];

const CATEGORY_TO_GROUP = {};
CATEGORY_GROUPS.forEach((g) => {
  g.categories.forEach((c) => {
    CATEGORY_TO_GROUP[c] = g.id;
  });
});

const SUGGESTED = [
  { label: 'Salaire', type: 'income', amount: 2500, day: 28, category: 'Salaire' },
  { label: 'Loyer', type: 'expense', amount: 800, day: 5, category: 'Logement' },
  { label: 'EDF / Engie', type: 'expense', amount: 80, day: 10, category: 'Énergie / Eau' },
  { label: 'Internet / mobile', type: 'expense', amount: 35, day: 7, category: 'Internet / Mobile' },
  { label: 'Netflix / Spotify', type: 'expense', amount: 20, day: 15, category: 'Abonnements' },
  { label: 'Salle de sport', type: 'expense', amount: 25, day: 1, category: 'Sport' },
  { label: 'Courses', type: 'expense', amount: 400, day: 10, category: 'Alimentation' },
  { label: 'Épargne PEA', type: 'expense', amount: 300, day: 2, category: 'PEA' },
  { label: 'Mutuelle santé', type: 'expense', amount: 40, day: 5, category: 'Mutuelle' },
];

const Recurring = () => {
  const [items, setItems] = useLocalStorageState('retirerich_recurring', []);
  const [form, setForm] = useState({
    label: '',
    type: 'expense',
    amount: '',
    day: 1,
    category: 'Logement',
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.label || !form.amount) return;
    setItems((prev) => [
      ...prev,
      {
        id: uid(),
        label: form.label.trim(),
        type: form.type,
        amount: Number(form.amount),
        day: Math.max(1, Math.min(31, Number(form.day) || 1)),
        category: form.category.trim() || (form.type === 'income' ? 'Salaire' : 'Divers vital'),
      },
    ]);
    setForm({ label: '', type: 'expense', amount: '', day: 1, category: 'Logement' });
  };

  const addSuggested = (s) => {
    setItems((prev) => [...prev, { id: uid(), ...s }]);
  };

  const totals = useMemo(() => {
    const groups = {};
    for (const g of CATEGORY_GROUPS) {
      groups[g.id] = { total: 0, items: [] };
    }
    let income = 0;
    let expense = 0;
    for (const i of items) {
      const groupId = CATEGORY_TO_GROUP[i.category] || (i.type === 'income' ? 'income' : 'variable');
      groups[groupId].items.push(i);
      groups[groupId].total += Number(i.amount);
      if (i.type === 'income') income += Number(i.amount);
      else expense += Number(i.amount);
    }
    return { groups, income, expense, balance: income - expense };
  }, [items]);

  const expenseRatios = useMemo(() => {
    if (totals.expense === 0) return [];
    return CATEGORY_GROUPS.filter((g) => g.id !== 'income')
      .map((g) => ({
        ...g,
        total: totals.groups[g.id].total,
        pct: (totals.groups[g.id].total / totals.expense) * 100,
      }))
      .filter((g) => g.total > 0);
  }, [totals]);

  const incomeRatio = totals.income > 0 ? (totals.expense / totals.income) * 100 : 0;
  const savingsRate = totals.income > 0 ? (totals.balance / totals.income) * 100 : 0;

  return (
    <>
      <header className="header">
        <div>
          <Link
            to="/expenses"
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
          <h1>Budget mensuel</h1>
          <p className="text-muted">
            Déclare tes entrées / sorties récurrentes par catégorie pour piloter ton cash flow
          </p>
        </div>
        <Link to="/expenses/calendar" className="btn btn-primary">
          <CalendarRange size={16} /> Voir le calendrier
        </Link>
      </header>

      <div className="dashboard-grid">
        <div className="col-span-3">
          <div className="glass-panel kpi-card">
            <div className="kpi-label">Revenus / mois</div>
            <div className="kpi-value" style={{ color: 'var(--accent)' }}>
              {formatEUR(totals.income)}
            </div>
          </div>
        </div>
        <div className="col-span-3">
          <div className="glass-panel kpi-card">
            <div className="kpi-label">Dépenses / mois</div>
            <div className="kpi-value">{formatEUR(totals.expense)}</div>
            {totals.income > 0 && (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {incomeRatio.toFixed(0)} % du revenu
              </div>
            )}
          </div>
        </div>
        <div className="col-span-3">
          <div className="glass-panel kpi-card">
            <div className="kpi-label">Reste à investir</div>
            <div
              className="kpi-value"
              style={{
                color: totals.balance >= 0 ? 'var(--accent)' : 'var(--negative)',
              }}
            >
              {formatEUR(totals.balance)}
            </div>
          </div>
        </div>
        <div className="col-span-3">
          <div className="glass-panel kpi-card">
            <div className="kpi-label">Taux d'épargne</div>
            <div className="kpi-value">{formatPercent(savingsRate, { digits: 0 })}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Cible 20 %+ (règle 50/30/20)
            </div>
          </div>
        </div>

        {expenseRatios.length > 0 && (
          <div className="col-span-12">
            <div className="glass-panel">
              <h3>Allocation du budget</h3>
              <p
                style={{
                  fontSize: '0.86rem',
                  color: 'var(--text-muted)',
                  marginTop: 4,
                }}
              >
                Répartition des sorties par groupe — règle 50/30/20 : 50 % besoins, 30 % envies, 20 % épargne.
              </p>
              <div style={{ marginTop: 16, display: 'flex', height: 28, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                {expenseRatios.map((g) => (
                  <div
                    key={g.id}
                    style={{
                      width: `${g.pct}%`,
                      background: g.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      transition: 'width 0.4s ease',
                    }}
                    title={`${g.label}: ${formatEUR(g.total)} (${g.pct.toFixed(1)} %)`}
                  >
                    {g.pct > 8 && `${g.pct.toFixed(0)}%`}
                  </div>
                ))}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: 12,
                  marginTop: 16,
                }}
              >
                {expenseRatios.map((g) => (
                  <div key={g.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          background: g.color,
                          borderRadius: 2,
                          display: 'inline-block',
                        }}
                      />
                      <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>{g.label}</span>
                    </div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 600, marginTop: 2 }}>
                      {formatEUR(g.total)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="col-span-7">
          {CATEGORY_GROUPS.map((g) => {
            const groupItems = totals.groups[g.id].items;
            if (groupItems.length === 0) return null;
            return (
              <div className="glass-panel" key={g.id} style={{ marginBottom: 16 }}>
                <div className="flex-between" style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        background: g.color,
                        borderRadius: 3,
                        display: 'inline-block',
                      }}
                    />
                    <h3 style={{ margin: 0 }}>{g.label}</h3>
                  </div>
                  <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {formatEUR(totals.groups[g.id].total)} / mois
                  </span>
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 50 }}>Jour</th>
                        <th>Libellé</th>
                        <th>Catégorie</th>
                        <th style={{ textAlign: 'right' }}>Montant</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...groupItems]
                        .sort((a, b) => a.day - b.day)
                        .map((i) => (
                          <tr key={i.id}>
                            <td style={{ fontWeight: 600 }}>{i.day}</td>
                            <td>{i.label}</td>
                            <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                              {i.category}
                            </td>
                            <td
                              style={{
                                textAlign: 'right',
                                fontWeight: 600,
                                color: i.type === 'income' ? 'var(--accent)' : 'var(--text)',
                              }}
                            >
                              {i.type === 'income' ? '+' : '−'}
                              {formatEUR(i.amount)}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '6px 10px' }}
                                onClick={() =>
                                  setItems((prev) => prev.filter((x) => x.id !== i.id))
                                }
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {items.length === 0 && (
            <div className="glass-panel">
              <p className="text-muted">
                Aucun élément budgété pour l'instant. Utilise les modèles courants à droite ou
                ajoute manuellement.
              </p>
            </div>
          )}
        </div>

        <div className="col-span-5">
          <div className="glass-panel">
            <h3>Ajouter une ligne</h3>
            <form onSubmit={handleAdd} style={{ marginTop: 12 }}>
              <Field label="Libellé">
                <input
                  value={form.label}
                  onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                  placeholder="Ex : Loyer"
                  required
                />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Type">
                  <select
                    value={form.type}
                    onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                  >
                    <option value="expense">Sortie</option>
                    <option value="income">Entrée</option>
                  </select>
                </Field>
                <Field label="Jour du mois">
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={form.day}
                    onChange={(e) => setForm((p) => ({ ...p, day: e.target.value }))}
                  />
                </Field>
                <Field label="Montant (€)">
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                    required
                  />
                </Field>
                <Field label="Catégorie">
                  <select
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  >
                    {CATEGORY_GROUPS.map((g) => (
                      <optgroup key={g.id} label={g.label}>
                        {g.categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </Field>
              </div>
              <button type="submit" className="btn btn-primary">
                <Plus size={16} /> Ajouter au budget
              </button>
            </form>
          </div>

          <div className="glass-panel" style={{ marginTop: 16 }}>
            <h3>Modèles courants</h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Clique pour ajouter, ajuste ensuite la valeur dans le tableau.
            </p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                marginTop: 12,
              }}
            >
              {SUGGESTED.map((s, i) => (
                <button
                  key={i}
                  className="btn btn-secondary"
                  style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                  onClick={() => addSuggested(s)}
                >
                  + {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const Field = ({ label, children }) => (
  <div className="input-group">
    <label>{label}</label>
    {children}
  </div>
);

export default Recurring;
