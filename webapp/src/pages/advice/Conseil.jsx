import { useMemo } from 'react';
import { AlertCircle, CheckCircle2, Lightbulb } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext.jsx';
import { getAccountTypeDef } from '../../utils/accountTypes.js';
import { formatEUR, formatPercent } from '../../utils/format.js';

const buildAllocation = (accounts, assets) => {
  const map = new Map();
  for (const acc of accounts) {
    const value = assets
      .filter((a) => a.accountId === acc.id)
      .reduce(
        (s, a) => s + (Number(a.quantity) || 0) * (Number(a.currentPrice) || Number(a.purchasePrice) || 0),
        0,
      );
    const cash = Number(acc.balance) || 0;
    map.set(acc.type, (map.get(acc.type) || 0) + value + cash);
  }
  const entries = [...map.entries()].filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  return { entries, total };
};

const Conseil = () => {
  const { accounts, assets, totals } = usePortfolio();

  const allocation = useMemo(() => buildAllocation(accounts, assets), [accounts, assets]);

  const alerts = useMemo(() => {
    const list = [];
    const hasLivret = accounts.some((a) => ['Livret A', 'LDDS', 'LEP'].includes(a.type));
    const cryptoValue = allocation.entries.find(([t]) => t === 'Crypto')?.[1] || 0;
    const cryptoShare = allocation.total > 0 ? (cryptoValue / allocation.total) * 100 : 0;
    const peaAccount = accounts.find((a) => a.type === 'PEA');
    const peaValue = peaAccount
      ? assets
          .filter((a) => a.accountId === peaAccount.id)
          .reduce(
            (s, a) => s + (Number(a.quantity) || 0) * (Number(a.currentPrice) || Number(a.purchasePrice) || 0),
            0,
          )
      : 0;

    if (!hasLivret) {
      list.push({
        type: 'warning',
        title: "Pas d'épargne de précaution",
        text: "Tu n'as pas de Livret A, LDDS ou LEP. Avant d'investir, vise 3 à 6 mois de dépenses fixes en épargne liquide.",
      });
    }
    if (cryptoShare > 10) {
      list.push({
        type: 'warning',
        title: 'Exposition crypto élevée',
        text: `Ton exposition crypto représente ${cryptoShare.toFixed(1)} % du patrimoine. La pratique recommandée est de rester sous 5-10 %.`,
      });
    }
    if (peaValue > 140000) {
      list.push({
        type: 'info',
        title: 'PEA proche du plafond',
        text: `Ton PEA est à ${formatEUR(peaValue)}. Le plafond est de 150 000 €.`,
      });
    }
    if (allocation.entries.length === 1) {
      list.push({
        type: 'warning',
        title: 'Patrimoine concentré',
        text: 'Tu n\'as qu\'une seule enveloppe alimentée. Diversifier sur 2-3 enveloppes (PEA + AV + Livret) répartit les risques fiscaux et de support.',
      });
    }
    if (list.length === 0 && allocation.entries.length > 0) {
      list.push({
        type: 'success',
        title: 'Allocation cohérente',
        text: 'Ton patrimoine semble équilibré et ton épargne de précaution est en place. Continue !',
      });
    }
    return list;
  }, [accounts, assets, allocation]);

  return (
    <>
      <header className="header">
        <div>
          <h1>Conseil</h1>
          <p className="text-muted">Recommandations basées sur ton allocation actuelle</p>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="col-span-6">
          <div className="glass-panel">
            <h3>Allocation actuelle</h3>
            {allocation.entries.length === 0 ? (
              <p className="text-muted mt-4">Ajoute des comptes pour voir ton allocation.</p>
            ) : (
              <ul style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {allocation.entries
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, value]) => {
                    const pct = (value / allocation.total) * 100;
                    const color = getAccountTypeDef(type).color;
                    return (
                      <li key={type}>
                        <div className="flex-between" style={{ marginBottom: 4 }}>
                          <span style={{ fontWeight: 500 }}>{type}</span>
                          <span style={{ color: 'var(--text-muted)' }}>
                            {formatEUR(value)} ({pct.toFixed(1)} %)
                          </span>
                        </div>
                        <div
                          style={{
                            height: 8,
                            background: 'var(--bg-subtle)',
                            borderRadius: 4,
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: color,
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </div>
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        </div>

        <div className="col-span-6">
          <div className="glass-panel">
            <h3>Alertes & conseils</h3>
            <ul style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {alerts.map((a, i) => {
                const Icon =
                  a.type === 'success' ? CheckCircle2 : a.type === 'warning' ? AlertCircle : Lightbulb;
                const color =
                  a.type === 'success'
                    ? 'var(--accent)'
                    : a.type === 'warning'
                      ? 'var(--negative)'
                      : 'var(--text)';
                return (
                  <li
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 12,
                      padding: 12,
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg)',
                    }}
                  >
                    <Icon size={18} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontWeight: 600 }}>{a.title}</div>
                      <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {a.text}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default Conseil;
