import { useState } from 'react';
import { X } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext.jsx';
import { ACCOUNT_TYPES } from '../../utils/accountTypes.js';
import BrokerPicker from '../../components/BrokerPicker.jsx';

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
  maxWidth: 480,
};

const CASH_TYPES = ['Livret A', 'LDDS', 'LEP'];

const AccountModal = ({ onClose }) => {
  const { addAccount } = usePortfolio();
  const [form, setForm] = useState({
    type: 'PEA',
    name: '',
    broker: '',
    balance: '',
    rate: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name) return;
    const account = {
      type: form.type,
      name: form.name.trim(),
      broker: form.broker.trim() || null,
    };
    if (CASH_TYPES.includes(form.type)) {
      account.balance = Number(form.balance) || 0;
      account.rate = Number(form.rate) || null;
    }
    addAccount(account);
    onClose();
  };

  const isCash = CASH_TYPES.includes(form.type);

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div className="flex-between mb-4">
          <h2 style={{ margin: 0 }}>Nouveau compte</h2>
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
            <label>Type d'enveloppe</label>
            <select
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label>Nom du compte</label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ex : PEA Boursorama"
              required
            />
          </div>

          <div className="input-group">
            <label>Courtier / Établissement</label>
            <BrokerPicker
              accountType={form.type}
              value={form.broker}
              onChange={(b) => setForm((p) => ({ ...p, broker: b }))}
            />
          </div>

          {isCash && (
            <>
              <div className="input-group">
                <label>Solde actuel (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.balance}
                  onChange={(e) => setForm((p) => ({ ...p, balance: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="input-group">
                <label>Taux (% / an)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.rate}
                  onChange={(e) => setForm((p) => ({ ...p, rate: e.target.value }))}
                  placeholder="2.4"
                />
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary">
              Créer le compte
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountModal;
