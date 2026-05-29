import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useLocalStorageState } from '../../utils/useLocalStorageState.js';
import { formatEUR } from '../../utils/format.js';

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const SUGGESTED = [
  { label: 'Salaire', type: 'income', amount: 2500, day: 28, category: 'Salaire' },
  { label: 'Loyer', type: 'expense', amount: 800, day: 5, category: 'Logement' },
  { label: 'Charges (eau, élec, gaz)', type: 'expense', amount: 80, day: 10, category: 'Logement' },
  { label: 'Internet / mobile', type: 'expense', amount: 35, day: 7, category: 'Abonnements' },
  { label: 'Netflix / Spotify', type: 'expense', amount: 20, day: 15, category: 'Abonnements' },
  { label: 'Salle de sport', type: 'expense', amount: 25, day: 1, category: 'Abonnements' },
  { label: 'Épargne programmée', type: 'expense', amount: 300, day: 2, category: 'Épargne programmée' },
  { label: 'Mutuelle santé', type: 'expense', amount: 40, day: 5, category: 'Santé' },
];

const Recurring = () => {
  const [items, setItems] = useLocalStorageState('retirerich_recurring', []);
  const [form, setForm] = useState({
    label: '',
    type: 'expense',
    amount: '',
    day: 1,
    category: '',
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
        category: form.category.trim() || (form.type === 'income' ? 'Salaire' : 'Autre fixe'),
      },
    ]);
    setForm({ label: '', type: 'expense', amount: '', day: 1, category: '' });
  };

  const addSuggested = (s) => {
    setItems((prev) => [...prev, { id: uid(), ...s }]);
  };

  const totalIncome = items
    .filter((i) => i.type === 'income')
    .reduce((s, i) => s + Number(i.amount), 0);
  const totalExpense = items
    .filter((i) => i.type === 'expense')
    .reduce((s, i) => s + Number(i.amount), 0);

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
          <h1>Récurrences</h1>
          <p className="text-muted">
            Déclare tes entrées et sorties récurrentes pour projeter ton solde mois par mois
          </p>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="col-span-7">
          <div className="glass-panel">
            <h3>Mes récurrences</h3>
            {items.length === 0 ? (
              <p className="text-muted mt-4">
                Aucune récurrence pour l'instant. Utilise le formulaire à droite ou les modèles
                ci-dessous.
              </p>
            ) : (
              <>
                <div className="table-container" style={{ marginTop: 12 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Jour</th>
                        <th>Libellé</th>
                        <th>Catégorie</th>
                        <th style={{ textAlign: 'right' }}>Montant</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...items]
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
                <div
                  style={{
                    marginTop: 18,
                    padding: 14,
                    borderRadius: 8,
                    background: 'var(--bg-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Solde net récurrent / mois
                    </div>
                    <div
                      style={{
                        fontSize: '1.4rem',
                        fontWeight: 700,
                        color: totalIncome - totalExpense >= 0 ? 'var(--accent)' : 'var(--negative)',
                      }}
                    >
                      {formatEUR(totalIncome - totalExpense)}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                    {formatEUR(totalIncome)} entrées · {formatEUR(totalExpense)} sorties
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="col-span-5">
          <div className="glass-panel">
            <h3>Ajouter une récurrence</h3>
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
                  <input
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    placeholder="Logement"
                  />
                </Field>
              </div>
              <button type="submit" className="btn btn-primary">
                <Plus size={16} /> Ajouter
              </button>
            </form>
          </div>

          <div className="glass-panel" style={{ marginTop: 20 }}>
            <h3>Modèles courants</h3>
            <p
              style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: 4 }}
            >
              Clique pour ajouter avec des valeurs par défaut (à ajuster ensuite).
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
