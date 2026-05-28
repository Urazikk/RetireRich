import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useRealEstate } from '../../context/RealEstateContext.jsx';
import { searchDvf, analyseTransactions } from '../../utils/dvfApi.js';
import { formatEUR, formatNumber } from '../../utils/format.js';
import KpiCard from '../../components/KpiCard.jsx';

const MarketSearch = () => {
  const { saveSearch } = useRealEstate();
  const [codePostal, setCodePostal] = useState('');
  const [type, setType] = useState('apt');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!/^\d{5}$/.test(codePostal)) {
      setError('Entre un code postal valide (5 chiffres).');
      return;
    }
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const transactions = await searchDvf({ codePostal });
      const result = analyseTransactions(transactions, type);
      setAnalysis({ ...result, codePostal, type });
      saveSearch({ codePostal, type, summary: { median: result.median, count: result.count } });
    } catch (err) {
      setError(err?.message || 'Erreur de récupération DVF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="header">
        <div>
          <h1>Prix du marché (DVF)</h1>
          <p className="text-muted">
            Données publiques data.gouv.fr — transactions immobilières réelles
          </p>
        </div>
      </header>

      <div className="glass-panel">
        <form onSubmit={handleSearch}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label>Code postal</label>
              <input
                value={codePostal}
                onChange={(e) => setCodePostal(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="75011"
                required
              />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label>Type de bien</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="apt">Appartement</option>
                <option value="maison">Maison</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {loading ? 'Recherche…' : 'Rechercher'}
            </button>
          </div>
          {error && (
            <p style={{ color: 'var(--negative)', marginTop: 12, fontSize: '0.88rem' }}>{error}</p>
          )}
        </form>
      </div>

      {analysis && analysis.count === 0 && (
        <div className="glass-panel" style={{ marginTop: 20 }}>
          <p className="text-muted">
            Aucune transaction trouvée pour ce code postal et ce type de bien.
          </p>
        </div>
      )}

      {analysis && analysis.count > 0 && (
        <>
          <div className="dashboard-grid">
            <div className="col-span-3">
              <KpiCard
                label="Prix médian / m²"
                value={formatEUR(analysis.median)}
              />
            </div>
            <div className="col-span-3">
              <KpiCard
                label="10e percentile"
                value={formatEUR(analysis.p10)}
              />
            </div>
            <div className="col-span-3">
              <KpiCard
                label="90e percentile"
                value={formatEUR(analysis.p90)}
              />
            </div>
            <div className="col-span-3">
              <KpiCard label="Transactions" value={formatNumber(analysis.count)} />
            </div>

            <div className="col-span-12">
              <div className="glass-panel">
                <h3>Transactions récentes ({analysis.codePostal})</h3>
                <div className="table-container" style={{ marginTop: 12 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Adresse</th>
                        <th>Commune</th>
                        <th style={{ textAlign: 'right' }}>Surface</th>
                        <th style={{ textAlign: 'right' }}>Pièces</th>
                        <th style={{ textAlign: 'right' }}>Prix</th>
                        <th style={{ textAlign: 'right' }}>€ / m²</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.transactions.map((t, i) => (
                        <tr key={`${t.date}-${i}`}>
                          <td>{t.date}</td>
                          <td>{t.adresse || '—'}</td>
                          <td>{t.commune}</td>
                          <td style={{ textAlign: 'right' }}>{formatNumber(t.surface)} m²</td>
                          <td style={{ textAlign: 'right' }}>{t.rooms ?? '—'}</td>
                          <td style={{ textAlign: 'right' }}>{formatEUR(t.price)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {formatEUR(t.pricePerSqm)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default MarketSearch;
