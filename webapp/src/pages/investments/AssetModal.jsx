import { useState } from 'react';
import { X } from 'lucide-react';
import { usePortfolio } from '../../context/usePortfolio.js';
import { fetchQuote } from '../../utils/yahooApi.js';
import AssetAutocomplete from '../../components/AssetAutocomplete.jsx';

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.35)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
  padding: 20,
};

const modalStyle = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-lg)',
  padding: 28,
  width: '100%',
  maxWidth: 520,
};

const AssetModal = ({ onClose }) => {
  const { accounts, addAsset } = usePortfolio();
  const [form, setForm] = useState({
    accountId: accounts[0]?.id || '',
    name: '',
    yahoo_ticker: '',
    quantity: '',
    purchasePrice: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
  });
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const handleFetchPrice = async () => {
    if (!form.yahoo_ticker) return;
    setFetching(true);
    setFetchError(null);
    try {
      const price = await fetchQuote(form.yahoo_ticker.trim());
      if (!price) throw new Error('Prix introuvable');
      setForm((p) => ({ ...p, purchasePrice: String(price) }));
    } catch (err) {
      setFetchError(err?.message || 'Erreur de récupération');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.accountId || !form.name || !form.quantity) return;

    let currentPrice = Number(form.purchasePrice) || null;
    if (form.yahoo_ticker) {
      try {
        const price = await fetchQuote(form.yahoo_ticker.trim());
        if (price) currentPrice = price;
      } catch {
        // Ignore — fall back to purchase price.
      }
    }

    addAsset({
      accountId: form.accountId,
      name: form.name.trim(),
      yahoo_ticker: form.yahoo_ticker.trim() || null,
      quantity: Number(form.quantity),
      purchasePrice: Number(form.purchasePrice) || 0,
      currentPrice,
      purchaseDate: form.purchaseDate,
    });
    onClose();
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div className="flex-between mb-4">
          <h2 style={{ margin: 0 }}>Ajouter une position</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 0,
              cursor: 'pointer',
              color: 'var(--text-muted)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Compte</label>
            <select
              value={form.accountId}
              onChange={(e) => setForm((p) => ({ ...p, accountId: e.target.value }))}
              required
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.type})
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label>Rechercher un actif</label>
            <AssetAutocomplete
              accountType={accounts.find((a) => a.id === form.accountId)?.type}
              value={form.name}
              onSelect={({ name, yahoo_ticker }) =>
                setForm((p) => ({ ...p, name, yahoo_ticker: yahoo_ticker || p.yahoo_ticker }))
              }
            />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Suggestions classées par enveloppe + recherche dans l'univers complet (2000+ titres).
            </span>
          </div>

          <div className="input-group">
            <label>Ticker Yahoo</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={form.yahoo_ticker}
                onChange={(e) => setForm((p) => ({ ...p, yahoo_ticker: e.target.value }))}
                placeholder="Auto-rempli depuis la recherche"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleFetchPrice}
                disabled={!form.yahoo_ticker || fetching}
              >
                {fetching ? '...' : 'Prix'}
              </button>
            </div>
            {fetchError && (
              <span style={{ fontSize: '0.78rem', color: 'var(--negative)' }}>{fetchError}</span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="input-group">
              <label>Quantité</label>
              <input
                type="number"
                step="0.0001"
                value={form.quantity}
                onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                required
              />
            </div>
            <div className="input-group">
              <label>Prix d'achat (€)</label>
              <input
                type="number"
                step="0.01"
                value={form.purchasePrice}
                onChange={(e) => setForm((p) => ({ ...p, purchasePrice: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>Date d'achat</label>
            <input
              type="date"
              value={form.purchaseDate}
              onChange={(e) => setForm((p) => ({ ...p, purchaseDate: e.target.value }))}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary">
              Ajouter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssetModal;
