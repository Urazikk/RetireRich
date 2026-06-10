import { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2, Plus, Settings2 } from 'lucide-react';
import { usePortfolio } from '../context/usePortfolio.js';
import { getAccountTypeDef, FEE_TYPES } from '../utils/accountTypes.js';
import { accountValue, accountPerformance, computePlafond, sortPositions, matchesSearch } from '../utils/investmentMetrics.js';
import { formatEUR, formatPercent } from '../utils/format.js';
import { fetchQuote } from '../utils/yahooApi.js';
import BrokerLogo from './BrokerLogo.jsx';
import AssetAutocomplete from './AssetAutocomplete.jsx';

const emptyAsset = { name: '', yahoo_ticker: '', quantity: '', purchasePrice: '' };

const AccountCard = ({ account, assets, search = '', sortKey = 'value' }) => {
  const { updateAccount, removeAccount, addAsset, removeAsset } = usePortfolio();
  const [collapsed, setCollapsed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [assetForm, setAssetForm] = useState(emptyAsset);
  const [balance, setBalance] = useState(account.balance ?? '');
  const [fees, setFees] = useState(account.fees ?? {});

  const def = getAccountTypeDef(account.type);
  const isCash = def.type === 'cash';
  const positions = sortPositions(
    assets.filter((a) => a.accountId === account.id && matchesSearch(a.name, search)),
    sortKey,
  );
  const lineCount = assets.filter((a) => a.accountId === account.id).length;
  const value = accountValue(account, assets);
  const perf = accountPerformance(account, assets);
  const plafond = computePlafond(account);

  const submitAsset = async (e) => {
    e.preventDefault();
    if (!assetForm.name || !assetForm.quantity) return;
    let currentPrice = Number(assetForm.purchasePrice) || null;
    if (assetForm.yahoo_ticker) {
      const p = await fetchQuote(assetForm.yahoo_ticker.trim());
      if (p) currentPrice = p;
    }
    addAsset({
      accountId: account.id,
      name: assetForm.name.trim(),
      yahoo_ticker: assetForm.yahoo_ticker.trim() || null,
      quantity: Number(assetForm.quantity),
      purchasePrice: Number(assetForm.purchasePrice) || 0,
      currentPrice,
    });
    setAssetForm(emptyAsset);
    setAdding(false);
  };

  const saveEdits = () => {
    const patch = {};
    if (isCash) patch.balance = Number(balance) || 0;
    patch.fees = fees;
    updateAccount(account.id, patch);
    setEditing(false);
  };

  return (
    <div className="glass-panel" style={{ marginBottom: 12 }}>
      {/* Header */}
      <div className="flex-between" style={{ alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 20,
              background: `${def.color}22`,
              border: `1px solid ${def.color}55`,
              color: def.color,
              fontWeight: 700,
              fontSize: '0.8rem',
              whiteSpace: 'nowrap',
            }}
          >
            {account.type}
          </span>
          {account.broker && <BrokerLogo name={account.broker} size={28} />}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {account.name}
            </div>
            {!isCash && (
              <div
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: perf.pnl >= 0 ? 'var(--accent)' : 'var(--negative)',
                }}
              >
                {perf.pnl >= 0 ? '+' : ''}
                {formatEUR(perf.pnl)} ({formatPercent(perf.pnlPct)})
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatEUR(value)}</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              {isCash ? 'Solde' : `${lineCount} ligne${lineCount !== 1 ? 's' : ''}`}
            </div>
          </div>
          <button
            onClick={() => {
              if (editing) {
                setEditing(false);
              } else {
                setBalance(account.balance ?? '');
                setFees(account.fees ?? {});
                setEditing(true);
              }
            }}
            title="Éditer"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <Settings2 size={16} />
          </button>
          <button
            onClick={() => { if (window.confirm(`Supprimer le compte "${account.name}" ?`)) removeAccount(account.id); }}
            title="Supprimer ce compte"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? 'Déplier' : 'Replier'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </div>

      {/* Barre de plafond (livrets) */}
      {plafond && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', height: 7, borderRadius: 4, overflow: 'hidden', background: 'var(--bg-subtle)' }}>
            <div
              style={{
                width: `${plafond.pct}%`,
                background: plafond.over ? 'var(--negative)' : 'var(--text)',
              }}
            />
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Plafond : {formatEUR(plafond.used)} / {formatEUR(plafond.max)}
            {plafond.over ? ' — dépassé' : ` — il reste ${formatEUR(plafond.remaining)}`}
          </div>
        </div>
      )}

      {/* Édition rapide solde & frais */}
      {editing && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          {isCash && (
            <div className="input-group">
              <label>Solde (€)</label>
              <input type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} />
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {FEE_TYPES.filter((f) => f.applies.includes(account.type)).map((f) => (
              <div className="input-group" key={f.id}>
                <label>{f.label} ({f.unit})</label>
                <input
                  type="number"
                  step="0.01"
                  value={fees[f.id] ?? ''}
                  onChange={(e) => setFees((p) => ({ ...p, [f.id]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setEditing(false)}>Annuler</button>
            <button className="btn btn-primary" onClick={saveEdits}>Enregistrer</button>
          </div>
        </div>
      )}

      {/* Corps repliable : positions + ajout */}
      {!collapsed && !isCash && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          {positions.length === 0 ? (
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>Aucune position.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Actif</th>
                    <th style={{ textAlign: 'right' }}>Qté</th>
                    <th style={{ textAlign: 'right' }}>PRU</th>
                    <th style={{ textAlign: 'right' }}>Prix actuel</th>
                    <th style={{ textAlign: 'right' }}>Valeur</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((a) => {
                    const v = (Number(a.quantity) || 0) * (Number(a.currentPrice) || Number(a.purchasePrice) || 0);
                    return (
                      <tr key={a.id}>
                        <td>{a.name}</td>
                        <td style={{ textAlign: 'right' }}>{a.quantity}</td>
                        <td style={{ textAlign: 'right' }}>{formatEUR(a.purchasePrice)}</td>
                        <td style={{ textAlign: 'right' }}>{formatEUR(a.currentPrice || a.purchasePrice)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatEUR(v)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px' }}
                            onClick={() => { if (window.confirm(`Supprimer la position "${a.name}" ?`)) removeAsset(a.id); }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {adding ? (
            <form onSubmit={submitAsset} style={{ marginTop: 10 }}>
              <div className="input-group">
                <label>Rechercher un actif</label>
                <AssetAutocomplete
                  accountType={account.type}
                  value={assetForm.name}
                  onSelect={({ name, yahoo_ticker }) =>
                    setAssetForm((p) => ({ ...p, name, yahoo_ticker: yahoo_ticker || p.yahoo_ticker }))
                  }
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div className="input-group">
                  <label>Ticker Yahoo</label>
                  <input
                    value={assetForm.yahoo_ticker}
                    onChange={(e) => setAssetForm((p) => ({ ...p, yahoo_ticker: e.target.value }))}
                  />
                </div>
                <div className="input-group">
                  <label>Quantité</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={assetForm.quantity}
                    onChange={(e) => setAssetForm((p) => ({ ...p, quantity: e.target.value }))}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Prix d'achat (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={assetForm.purchasePrice}
                    onChange={(e) => setAssetForm((p) => ({ ...p, purchasePrice: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setAdding(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Ajouter</button>
              </div>
            </form>
          ) : (
            <button
              className="btn btn-secondary"
              style={{ marginTop: 10, fontSize: '0.85rem' }}
              onClick={() => setAdding(true)}
            >
              <Plus size={15} /> Ajouter une position
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AccountCard;
