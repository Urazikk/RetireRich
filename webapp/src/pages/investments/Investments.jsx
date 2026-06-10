import { useMemo, useState } from 'react';
import { Plus, Trash2, ArrowRight, Calculator, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePortfolio } from '../../context/usePortfolio.js';
import { formatEUR, formatPercent } from '../../utils/format.js';
import KpiCard from '../../components/KpiCard.jsx';
import EnvelopeBadge from '../../components/EnvelopeBadge.jsx';
import BrokerLogo from '../../components/BrokerLogo.jsx';
import AccountModal from './AccountModal.jsx';
import AssetModal from './AssetModal.jsx';

const ENVELOPE_TABS = [
  { id: 'ALL', label: 'Toutes' },
  { id: 'PEA', label: 'PEA' },
  { id: 'Assurance Vie', label: 'AV' },
  { id: 'CTO', label: 'CTO' },
  { id: 'Crypto', label: 'Crypto' },
  { id: 'CASH', label: 'Livrets' },
];

const CASH_TYPES = ['Livret A', 'LDDS', 'LEP'];

const Investments = () => {
  const { accounts, assets, totals, removeAccount, removeAsset } = usePortfolio();
  const [activeTab, setActiveTab] = useState('ALL');
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [assetModalOpen, setAssetModalOpen] = useState(false);

  const filteredAccounts = useMemo(() => {
    if (activeTab === 'ALL') return accounts;
    if (activeTab === 'CASH') return accounts.filter((a) => CASH_TYPES.includes(a.type));
    return accounts.filter((a) => a.type === activeTab);
  }, [accounts, activeTab]);

  const filteredAssets = useMemo(() => {
    const ids = new Set(filteredAccounts.map((a) => a.id));
    return assets
      .filter((a) => ids.has(a.accountId))
      .map((a) => ({
        ...a,
        currentValue: (Number(a.quantity) || 0) * (Number(a.currentPrice) || Number(a.purchasePrice) || 0),
        investedValue: (Number(a.quantity) || 0) * (Number(a.purchasePrice) || 0),
      }))
      .sort((a, b) => b.currentValue - a.currentValue);
  }, [assets, filteredAccounts]);

  const accountById = useMemo(() => {
    const map = new Map();
    accounts.forEach((a) => map.set(a.id, a));
    return map;
  }, [accounts]);

  return (
    <>
      <header className="header">
        <div>
          <h1>Mes Investissements</h1>
          <p className="text-muted">Tous tes comptes et positions, par enveloppe</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to="/investments/fees" className="btn btn-secondary">
            <Calculator size={16} /> Comparer les frais
          </Link>
          <Link to="/investments/explorer" className="btn btn-secondary">
            <Compass size={16} /> Explorer
          </Link>
          <button className="btn btn-secondary" onClick={() => setAccountModalOpen(true)}>
            <Plus size={16} /> Nouveau compte
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setAssetModalOpen(true)}
            disabled={accounts.length === 0}
          >
            <Plus size={16} /> Ajouter une position
          </button>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="col-span-4">
          <KpiCard label="Total investi" value={formatEUR(totals.totalInvested)} />
        </div>
        <div className="col-span-4">
          <KpiCard
            label="Valeur actuelle"
            value={formatEUR(totals.totalCurrent)}
            trend={totals.pnlPct}
          />
        </div>
        <div className="col-span-4">
          <KpiCard
            label="Plus/Moins-value"
            value={formatEUR(totals.pnl)}
            trend={totals.pnlPct}
            trendLabel={formatPercent(totals.pnlPct)}
          />
        </div>
      </div>

      <div className="glass-panel" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
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

        {filteredAccounts.length === 0 ? (
          <p className="text-muted">
            Aucun compte dans cette catégorie. Crée ton premier compte pour commencer.
          </p>
        ) : (
          <>
            <h3 style={{ marginBottom: 12 }}>Comptes</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Nom</th>
                    <th>Courtier</th>
                    <th style={{ textAlign: 'right' }}>Solde / Valeur</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map((acc) => {
                    const positions = filteredAssets.filter((a) => a.accountId === acc.id);
                    const value = positions.reduce((s, a) => s + a.currentValue, 0);
                    const total = value + (Number(acc.balance) || 0);
                    return (
                      <tr key={acc.id}>
                        <td><EnvelopeBadge type={acc.type} /></td>
                        <td>{acc.name}</td>
                        <td>
                          {acc.broker ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <BrokerLogo name={acc.broker} size={22} />
                              <span>{acc.broker}</span>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>{formatEUR(total)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px' }}
                            onClick={() => {
                              if (confirm(`Supprimer le compte "${acc.name}" ?`)) {
                                removeAccount(acc.id);
                              }
                            }}
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

            {filteredAssets.length > 0 && (
              <>
                <h3 style={{ marginTop: 28, marginBottom: 12 }}>Positions</h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Actif</th>
                        <th>Compte</th>
                        <th style={{ textAlign: 'right' }}>Qté</th>
                        <th style={{ textAlign: 'right' }}>PRU</th>
                        <th style={{ textAlign: 'right' }}>Prix actuel</th>
                        <th style={{ textAlign: 'right' }}>Valeur</th>
                        <th style={{ textAlign: 'right' }}>+/- Value</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssets.map((asset) => {
                        const acc = accountById.get(asset.accountId);
                        const pnl = asset.currentValue - asset.investedValue;
                        const pnlPct = asset.investedValue > 0 ? (pnl / asset.investedValue) * 100 : 0;
                        return (
                          <tr key={asset.id}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{asset.name}</div>
                              {asset.yahoo_ticker && (
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                  {asset.yahoo_ticker}
                                </div>
                              )}
                            </td>
                            <td>{acc?.name || '—'}</td>
                            <td style={{ textAlign: 'right' }}>{asset.quantity}</td>
                            <td style={{ textAlign: 'right' }}>{formatEUR(asset.purchasePrice)}</td>
                            <td style={{ textAlign: 'right' }}>
                              {formatEUR(asset.currentPrice || asset.purchasePrice)}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                              {formatEUR(asset.currentValue)}
                            </td>
                            <td
                              style={{
                                textAlign: 'right',
                                color: pnl >= 0 ? 'var(--accent)' : 'var(--negative)',
                                fontWeight: 600,
                              }}
                            >
                              {formatEUR(pnl)} ({formatPercent(pnlPct)})
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: 4 }}>
                                {asset.yahoo_ticker && (
                                  <Link
                                    to={`/investments/asset/${encodeURIComponent(asset.yahoo_ticker)}`}
                                    className="btn btn-secondary"
                                    style={{ padding: '6px 10px' }}
                                  >
                                    <ArrowRight size={14} />
                                  </Link>
                                )}
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '6px 10px' }}
                                  onClick={() => {
                                    if (confirm(`Supprimer "${asset.name}" ?`)) {
                                      removeAsset(asset.id);
                                    }
                                  }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {accountModalOpen && <AccountModal onClose={() => setAccountModalOpen(false)} />}
      {assetModalOpen && <AssetModal onClose={() => setAssetModalOpen(false)} />}
    </>
  );
};

export default Investments;
