import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Calculator, Compass, RefreshCw, Search } from 'lucide-react';
import { usePortfolio } from '../../context/usePortfolio.js';
import { ACCOUNT_TYPES } from '../../utils/accountTypes.js';
import { formatEUR, formatPercent } from '../../utils/format.js';
import { fetchQuote } from '../../utils/yahooApi.js';
import { matchesSearch } from '../../utils/investmentMetrics.js';
import KpiCard from '../../components/KpiCard.jsx';
import AllocationBar from '../../components/AllocationBar.jsx';
import AccountCard from '../../components/AccountCard.jsx';
import BrokerPicker from '../../components/BrokerPicker.jsx';

const ENVELOPE_TABS = [
  { id: 'ALL', label: 'Toutes' },
  { id: 'PEA', label: 'PEA' },
  { id: 'Assurance Vie', label: 'AV' },
  { id: 'CTO', label: 'CTO' },
  { id: 'Crypto', label: 'Crypto' },
  { id: 'CASH', label: 'Livrets' },
];
const CASH_TYPES = ['Livret A', 'LDDS', 'LEP', 'Livret Jeune'];
const emptyAccount = { type: 'PEA', name: '', broker: '', balance: '', rate: '' };

const Investments = () => {
  const { accounts, assets, totals, addAccount, updateAsset } = usePortfolio();
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('value');
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [failedTickers, setFailedTickers] = useState([]);
  const [addingAccount, setAddingAccount] = useState(false);
  const [accountForm, setAccountForm] = useState(emptyAccount);

  const filteredAccounts = useMemo(() => {
    let list = accounts;
    if (activeTab === 'CASH') list = accounts.filter((a) => CASH_TYPES.includes(a.type));
    else if (activeTab !== 'ALL') list = accounts.filter((a) => a.type === activeTab);
    return list.filter((a) => search === '' || matchesSearch(a.name, search)
      || assets.some((as) => as.accountId === a.id && matchesSearch(as.name, search)));
  }, [accounts, assets, activeTab, search]);

  const refreshPrices = async () => {
    setRefreshing(true);
    const tickers = [...new Set(assets.map((a) => a.yahoo_ticker).filter(Boolean))];
    const failed = [];
    for (const t of tickers) {
      const price = await fetchQuote(t);
      if (price) {
        assets.filter((a) => a.yahoo_ticker === t).forEach((a) => updateAsset(a.id, { currentPrice: price }));
      } else {
        failed.push(t);
      }
    }
    setFailedTickers(failed);
    setUpdatedAt(new Date());
    setRefreshing(false);
  };

  const submitAccount = (e) => {
    e.preventDefault();
    if (!accountForm.name) return;
    const account = {
      type: accountForm.type,
      name: accountForm.name.trim(),
      broker: accountForm.broker.trim() || null,
    };
    if (CASH_TYPES.includes(accountForm.type)) {
      account.balance = Number(accountForm.balance) || 0;
      account.rate = Number(accountForm.rate) || null;
    }
    addAccount(account);
    setAccountForm(emptyAccount);
    setAddingAccount(false);
  };

  const startWithType = (type) => {
    setAccountForm({ ...emptyAccount, type });
    setAddingAccount(true);
  };

  const isCashForm = CASH_TYPES.includes(accountForm.type);

  return (
    <>
      <header className="header">
        <div>
          <h1>Mes Investissements</h1>
          <p className="text-muted">
            {accounts.length} compte{accounts.length !== 1 ? 's' : ''} · Patrimoine {formatEUR(totals.patrimoine)}{' '}
            {totals.totalInvested > 0 && (
              <span style={{ color: totals.pnl >= 0 ? 'var(--accent)' : 'var(--negative)' }}>
                ({formatPercent(totals.pnlPct)})
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {updatedAt && !refreshing && (
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              maj {updatedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {failedTickers.length > 0 && !refreshing && (
            <span
              style={{ fontSize: '0.74rem', color: 'var(--negative)' }}
              title={failedTickers.join(', ')}
            >
              {failedTickers.length} prix indisponible{failedTickers.length !== 1 ? 's' : ''}
            </span>
          )}
          <button className="btn btn-secondary" onClick={refreshPrices} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Mise à jour…' : 'Rafraîchir les prix'}
          </button>
          <Link to="/investments/fees" className="btn btn-secondary"><Calculator size={16} /> Frais</Link>
          <Link to="/investments/explorer" className="btn btn-secondary"><Compass size={16} /> Explorer</Link>
          <button className="btn btn-primary" onClick={() => setAddingAccount((v) => !v)}>
            <Plus size={16} /> {addingAccount ? 'Annuler' : 'Nouveau compte'}
          </button>
        </div>
      </header>

      {addingAccount && (
        <div className="glass-panel" style={{ marginBottom: 20 }}>
          <form onSubmit={submitAccount}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group">
                <label>Type d'enveloppe</label>
                <select value={accountForm.type} onChange={(e) => setAccountForm((p) => ({ ...p, type: e.target.value }))}>
                  {ACCOUNT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Nom du compte</label>
                <input value={accountForm.name} onChange={(e) => setAccountForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ex : PEA Boursorama" required />
              </div>
            </div>
            <div className="input-group">
              <label>Courtier / Établissement</label>
              <BrokerPicker accountType={accountForm.type} value={accountForm.broker} onChange={(b) => setAccountForm((p) => ({ ...p, broker: b }))} />
            </div>
            {isCashForm && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label>Solde actuel (€)</label>
                  <input type="number" step="0.01" value={accountForm.balance} onChange={(e) => setAccountForm((p) => ({ ...p, balance: e.target.value }))} placeholder="0" />
                </div>
                <div className="input-group">
                  <label>Taux (% / an)</label>
                  <input type="number" step="0.01" value={accountForm.rate} onChange={(e) => setAccountForm((p) => ({ ...p, rate: e.target.value }))} placeholder="1.5" />
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setAddingAccount(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary">Créer le compte</button>
            </div>
          </form>
        </div>
      )}

      {accounts.length === 0 && !addingAccount ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: 48 }}>
          <h2 style={{ marginBottom: 8 }}>Commence ton patrimoine</h2>
          <p className="text-muted" style={{ marginBottom: 20 }}>
            Ajoute ton premier compte pour suivre tes investissements. Quelques exemples pour démarrer :
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => startWithType('PEA')}>+ PEA</button>
            <button className="btn btn-secondary" onClick={() => startWithType('Assurance Vie')}>+ Assurance Vie</button>
            <button className="btn btn-secondary" onClick={() => startWithType('Livret A')}>+ Livret A</button>
          </div>
        </div>
      ) : (
        <>
          <div className="dashboard-grid">
            <div className="col-span-3"><KpiCard label="Total investi" value={formatEUR(totals.totalInvested)} /></div>
            <div className="col-span-3"><KpiCard label="Valeur actuelle" value={formatEUR(totals.totalCurrent)} trend={totals.pnlPct} /></div>
            <div className="col-span-3"><KpiCard label="Plus/Moins-value" value={formatEUR(totals.pnl)} trend={totals.pnlPct} trendLabel={formatPercent(totals.pnlPct)} /></div>
            <div className="col-span-3">
              <div className="glass-panel" style={{ height: '100%' }}>
                <div className="kpi-label" style={{ marginBottom: 8 }}>Répartition</div>
                <AllocationBar accounts={accounts} assets={assets} />
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {ENVELOPE_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.82rem', padding: '8px 14px' }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '6px 10px' }}>
                  <Search size={14} style={{ color: 'var(--text-muted)' }} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher…"
                    style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.85rem' }}
                  />
                </div>
                <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} style={{ padding: '8px 10px' }}>
                  <option value="value">Tri : valeur</option>
                  <option value="perf">Tri : performance</option>
                  <option value="name">Tri : nom</option>
                </select>
              </div>
            </div>

            {filteredAccounts.length === 0 ? (
              <p className="text-muted">Aucun compte dans cette catégorie.</p>
            ) : (
              <div className="stagger">
                {filteredAccounts.map((acc) => (
                  <AccountCard key={acc.id} account={acc} assets={assets} search={search} sortKey={sortKey} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};

export default Investments;
