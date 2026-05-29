import { useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Upload, CalendarRange, Repeat } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useLocalStorageState } from '../../utils/useLocalStorageState.js';
import { formatEUR, formatPercent } from '../../utils/format.js';
import { parseBankCsv } from '../../utils/bankCsvParser.js';
import {
  EXPENSE_CATEGORIES,
  REVENUE_CATEGORIES,
  autoCategory,
  loadUserRules,
  saveUserRule,
} from '../../utils/budgetCategories.js';
import KpiCard from '../../components/KpiCard.jsx';

const CATEGORY_COLORS = {
  Logement: '#3b82f6',
  Courses: '#22c55e',
  Restaurant: '#ec4899',
  Transport: '#f59e0b',
  Abonnements: '#8b5cf6',
  Santé: '#06b6d4',
  Shopping: '#a855f7',
  Bar: '#ef4444',
  Boîte: '#f97316',
  'Paris Sportifs': '#ca8a04',
  'Virement LCL': '#6366f1',
  Salaire: '#10b981',
  'Épargne programmée': '#14b8a6',
  'Autre fixe': '#64748b',
  'Autre variable': '#94a3b8',
  Autre: '#94a3b8',
  'À classer': '#9ca3af',
};

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const Expenses = () => {
  const [transactions, setTransactions] = useLocalStorageState('retirerich_transactions', []);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [importInfo, setImportInfo] = useState(null);
  const fileRef = useRef(null);

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const { adapter, rows } = parseBankCsv(text);
    if (!rows.length) {
      setImportInfo({ adapter, count: 0, error: 'Aucune transaction extraite du fichier.' });
      return;
    }
    const userRules = loadUserRules();
    const seen = new Set(
      transactions.map((t) => `${t.date}|${t.label}|${t.amount}`.toLowerCase()),
    );
    const newRows = rows
      .filter((r) => !seen.has(`${r.date}|${r.label}|${r.amount}`.toLowerCase()))
      .map((r) => ({
        id: uid(),
        date: r.date,
        label: r.label,
        amount: r.amount,
        type: r.amount >= 0 ? 'income' : 'expense',
        category: autoCategory(r.label, r.amount, userRules),
      }));
    setTransactions((prev) => [...newRows, ...prev]);
    setImportInfo({ adapter, count: newRows.length, total: rows.length });
    if (fileRef.current) fileRef.current.value = '';
  };

  const months = useMemo(() => {
    const set = new Set(transactions.map((t) => t.date?.slice(0, 7)).filter(Boolean));
    return [...set].sort().reverse();
  }, [transactions]);

  const monthly = useMemo(
    () => transactions.filter((t) => t.date?.startsWith(filterMonth)),
    [transactions, filterMonth],
  );

  const stats = useMemo(() => {
    const income = monthly
      .filter((t) => t.amount > 0)
      .reduce((s, t) => s + t.amount, 0);
    const expense = monthly
      .filter((t) => t.amount < 0)
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    return {
      income,
      expense,
      saving: income - expense,
      savingRate: income > 0 ? ((income - expense) / income) * 100 : 0,
    };
  }, [monthly]);

  const byCategory = useMemo(() => {
    const map = new Map();
    monthly
      .filter((t) => t.amount < 0)
      .forEach((t) => {
        map.set(t.category, (map.get(t.category) || 0) + Math.abs(t.amount));
      });
    return [...map.entries()]
      .map(([name, value]) => ({
        name,
        value,
        color: CATEGORY_COLORS[name] || '#94a3b8',
      }))
      .sort((a, b) => b.value - a.value);
  }, [monthly]);

  const updateCategory = (tx, category) => {
    setTransactions((prev) => prev.map((t) => (t.id === tx.id ? { ...t, category } : t)));
    saveUserRule(tx.label, category);
  };

  return (
    <>
      <header className="header">
        <div>
          <h1>Mes Dépenses</h1>
          <p className="text-muted">Import CSV, catégorisation et analyse mensuelle</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/expenses/recurring" className="btn btn-secondary">
            <Repeat size={16} /> Récurrences
          </Link>
          <Link to="/expenses/calendar" className="btn btn-secondary">
            <CalendarRange size={16} /> Calendrier
          </Link>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
          <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> Importer CSV
          </button>
        </div>
      </header>

      {importInfo && (
        <div
          className="glass-panel"
          style={{
            marginBottom: 20,
            borderColor: importInfo.error ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)',
          }}
        >
          <div className="flex-between">
            <div>
              <div style={{ fontWeight: 600 }}>
                Format détecté : <span style={{ color: 'var(--accent)' }}>{importInfo.adapter}</span>
              </div>
              <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                {importInfo.error
                  ? importInfo.error
                  : `${importInfo.count} nouvelles transactions importées / ${importInfo.total} lues (doublons ignorés).`}
              </div>
            </div>
            <button
              className="btn btn-secondary"
              style={{ padding: '6px 10px' }}
              onClick={() => setImportInfo(null)}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        <div className="col-span-3">
          <KpiCard label={`Revenus ${filterMonth}`} value={formatEUR(stats.income)} />
        </div>
        <div className="col-span-3">
          <KpiCard label="Dépenses" value={formatEUR(stats.expense)} />
        </div>
        <div className="col-span-3">
          <KpiCard
            label="Épargne"
            value={formatEUR(stats.saving)}
            trend={stats.saving}
            trendLabel={stats.saving >= 0 ? 'En positif' : 'En négatif'}
          />
        </div>
        <div className="col-span-3">
          <KpiCard
            label="Taux d'épargne"
            value={formatPercent(stats.savingRate, { digits: 1 })}
          />
        </div>

        <div className="col-span-7">
          <div className="glass-panel">
            <div className="flex-between" style={{ marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Historique</h3>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                style={{ maxWidth: 200 }}
              >
                {months.length === 0 ? (
                  <option value={filterMonth}>{filterMonth}</option>
                ) : (
                  months.map((m) => <option key={m} value={m}>{m}</option>)
                )}
              </select>
            </div>
            {monthly.length === 0 ? (
              <p className="text-muted">
                Aucune transaction pour {filterMonth}. Importe ton relevé bancaire pour démarrer.
              </p>
            ) : (
              <div className="table-container">
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
                    {monthly.slice(0, 100).map((t) => (
                      <tr key={t.id}>
                        <td>{t.date}</td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{t.label}</div>
                        </td>
                        <td>
                          <select
                            value={t.category}
                            onChange={(e) => updateCategory(t, e.target.value)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '0.82rem',
                              border: '1px solid var(--border)',
                              borderRadius: 6,
                              background: 'var(--bg)',
                            }}
                          >
                            <optgroup label="Revenus">
                              {REVENUE_CATEGORIES.map((c) => (
                                <option key={c}>{c}</option>
                              ))}
                            </optgroup>
                            <optgroup label="Dépenses">
                              {EXPENSE_CATEGORIES.map((c) => (
                                <option key={c}>{c}</option>
                              ))}
                            </optgroup>
                          </select>
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: 600,
                            color: t.amount >= 0 ? 'var(--accent)' : 'var(--text)',
                          }}
                        >
                          {t.amount >= 0 ? '+' : '−'}
                          {formatEUR(Math.abs(t.amount))}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px' }}
                            onClick={() =>
                              setTransactions((prev) => prev.filter((x) => x.id !== t.id))
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
            )}
          </div>
        </div>

        <div className="col-span-5">
          <div className="glass-panel">
            <h3>Répartition des dépenses</h3>
            {byCategory.length === 0 ? (
              <p className="text-muted mt-4">Aucune dépense ce mois-ci.</p>
            ) : (
              <>
                <div style={{ height: 240, marginTop: 12 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byCategory} innerRadius={55} outerRadius={90} dataKey="value">
                        {byCategory.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatEUR(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {byCategory.slice(0, 8).map((c) => (
                    <li
                      key={c.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: '0.86rem',
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 3,
                          background: c.color,
                        }}
                      />
                      <span style={{ flex: 1 }}>{c.name}</span>
                      <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatEUR(c.value)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        <div className="col-span-12">
          <div className="glass-panel" style={{ background: 'var(--bg-subtle)' }}>
            <h3 style={{ margin: 0 }}>Comment exporter mes opérations bancaires ?</h3>
            <ul style={{ marginTop: 12, paddingLeft: 20, fontSize: '0.9rem', lineHeight: 1.7 }}>
              <li>
                <b>Boursorama</b> : Mon compte → Mes opérations → bouton "Exporter" → format CSV
              </li>
              <li>
                <b>BNP Paribas</b> : Mes comptes → Détail du compte → "Télécharger" → CSV
              </li>
              <li>
                <b>Société Générale</b> : Comptes → Détail → "Télécharger les opérations" → CSV
              </li>
              <li>
                <b>Crédit Agricole</b> : Compte → Opérations → "Exporter" → CSV
              </li>
              <li>
                <b>LCL</b> : Compte → Opérations → "Exporter" → CSV (UTF-8 si possible)
              </li>
            </ul>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 8 }}>
              Tout est traité en local dans ton navigateur. Aucune donnée bancaire n'est envoyée à
              un serveur.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Expenses;
