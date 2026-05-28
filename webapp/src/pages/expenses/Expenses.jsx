import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useLocalStorageState } from '../../utils/useLocalStorageState.js';
import { formatEUR, formatPercent } from '../../utils/format.js';
import KpiCard from '../../components/KpiCard.jsx';

const DEFAULT_CATEGORIES = [
  { id: 'logement', label: 'Logement', color: '#3b82f6' },
  { id: 'alimentation', label: 'Alimentation', color: '#22c55e' },
  { id: 'transport', label: 'Transport', color: '#f59e0b' },
  { id: 'loisirs', label: 'Loisirs', color: '#ec4899' },
  { id: 'sante', label: 'Santé', color: '#06b6d4' },
  { id: 'abonnements', label: 'Abonnements', color: '#8b5cf6' },
  { id: 'autres', label: 'Autres', color: '#94a3b8' },
];

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const Expenses = () => {
  const [transactions, setTransactions] = useLocalStorageState('retirerich_transactions', []);
  const [form, setForm] = useState({
    label: '',
    amount: '',
    category: 'logement',
    type: 'expense',
    date: new Date().toISOString().slice(0, 10),
  });

  const totals = useMemo(() => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthly = transactions.filter((t) => t.date?.startsWith(monthKey));
    const income = monthly.filter((t) => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const expense = monthly.filter((t) => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    return {
      income,
      expense,
      saving: income - expense,
      savingRate: income > 0 ? ((income - expense) / income) * 100 : 0,
    };
  }, [transactions]);

  const byCategory = useMemo(() => {
    const map = new Map();
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const cat = DEFAULT_CATEGORIES.find((c) => c.id === t.category) || DEFAULT_CATEGORIES.at(-1);
        map.set(cat.id, (map.get(cat.id) || 0) + (Number(t.amount) || 0));
      });
    return [...map.entries()].map(([id, value]) => {
      const cat = DEFAULT_CATEGORIES.find((c) => c.id === id);
      return { name: cat.label, value, color: cat.color };
    });
  }, [transactions]);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.label || !form.amount) return;
    setTransactions((prev) => [
      { id: uid(), ...form, amount: Number(form.amount) },
      ...prev,
    ]);
    setForm((p) => ({ ...p, label: '', amount: '' }));
  };

  return (
    <>
      <header className="header">
        <div>
          <h1>Mes Dépenses</h1>
          <p className="text-muted">Suivi mensuel revenus & dépenses</p>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="col-span-3">
          <KpiCard label="Revenus du mois" value={formatEUR(totals.income)} />
        </div>
        <div className="col-span-3">
          <KpiCard label="Dépenses du mois" value={formatEUR(totals.expense)} />
        </div>
        <div className="col-span-3">
          <KpiCard
            label="Épargne du mois"
            value={formatEUR(totals.saving)}
            trend={totals.saving}
            trendLabel={totals.saving >= 0 ? 'En positif' : 'En négatif'}
          />
        </div>
        <div className="col-span-3">
          <KpiCard
            label="Taux d'épargne"
            value={formatPercent(totals.savingRate, { digits: 1 })}
          />
        </div>

        <div className="col-span-7">
          <div className="glass-panel">
            <h3>Nouvelle transaction</h3>
            <form onSubmit={handleAdd} style={{ marginTop: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label>Libellé</label>
                  <input
                    value={form.label}
                    onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                    placeholder="Ex : Courses Carrefour"
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Montant (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                  >
                    <option value="expense">Dépense</option>
                    <option value="income">Revenu</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Catégorie</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  >
                    {DEFAULT_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary">
                <Plus size={16} /> Ajouter
              </button>
            </form>
          </div>
        </div>

        <div className="col-span-5">
          <div className="glass-panel">
            <h3>Répartition des dépenses</h3>
            {byCategory.length === 0 ? (
              <p className="text-muted mt-4">Aucune dépense enregistrée.</p>
            ) : (
              <div style={{ height: 240, marginTop: 16 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byCategory} innerRadius={55} outerRadius={85} dataKey="value">
                      {byCategory.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatEUR(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12">
          <div className="glass-panel">
            <h3>Historique</h3>
            {transactions.length === 0 ? (
              <p className="text-muted mt-4">Aucune transaction.</p>
            ) : (
              <div className="table-container" style={{ marginTop: 12 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Libellé</th>
                      <th>Catégorie</th>
                      <th style={{ textAlign: 'right' }}>Montant</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.slice(0, 30).map((t) => {
                      const cat = DEFAULT_CATEGORIES.find((c) => c.id === t.category);
                      const sign = t.type === 'income' ? 1 : -1;
                      return (
                        <tr key={t.id}>
                          <td>{t.date}</td>
                          <td>{t.label}</td>
                          <td>{cat?.label || '—'}</td>
                          <td
                            style={{
                              textAlign: 'right',
                              fontWeight: 600,
                              color: sign > 0 ? 'var(--accent)' : 'var(--text)',
                            }}
                          >
                            {sign > 0 ? '+' : '−'}
                            {formatEUR(t.amount)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '6px 10px' }}
                              onClick={() => setTransactions((prev) => prev.filter((x) => x.id !== t.id))}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Expenses;
