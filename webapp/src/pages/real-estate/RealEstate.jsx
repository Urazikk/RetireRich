import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Loader2, ExternalLink, Calculator, Trash2, Building2, Sparkles } from 'lucide-react';
import { useRealEstate } from '../../context/RealEstateContext.jsx';
import { searchDvf } from '../../utils/dvfApi.js';
import { formatEUR, formatNumber, formatPercent } from '../../utils/format.js';
import {
  grossYield,
  monthlyCashFlow,
} from '../../utils/realEstateMath.js';
import KpiCard from '../../components/KpiCard.jsx';
import DvfMap from '../../components/DvfMap.jsx';

const YEAR_PRESETS = [
  { id: '2024', label: '2024' },
  { id: '2023,2024', label: '2023-24' },
  { id: '2022,2023,2024', label: '3 dernières' },
  { id: '2018,2019,2020,2021,2022,2023,2024', label: 'Historique complet' },
];

const buildListingUrl = (site, codePostal, type) => {
  const propType = type === 'maison' ? 'maisons' : 'appartements';
  if (site === 'seloger') {
    return `https://www.seloger.com/list.htm?projects=2&types=${type === 'maison' ? '2' : '1'}&places=[{cp:${codePostal}}]&enterprise=0&qsVersion=1.0`;
  }
  if (site === 'leboncoin') {
    return `https://www.leboncoin.fr/recherche?category=9&locations=${codePostal}&real_estate_type=${type === 'maison' ? '2' : '1'}`;
  }
  if (site === 'bienici') {
    return `https://www.bienici.com/recherche/achat/${propType}/${codePostal}`;
  }
  return '#';
};

const RealEstate = () => {
  const { projects, removeProject, saveSearch, searches } = useRealEstate();
  const [codePostal, setCodePostal] = useState('');
  const [type, setType] = useState('apt');
  const [years, setYears] = useState('2023,2024');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  // Pre-fill from last search
  useEffect(() => {
    if (searches.length > 0 && !codePostal) {
      const last = searches[0];
      setCodePostal(last.codePostal || '');
      if (last.type) setType(last.type);
      if (last.years) setYears(last.years);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const result = await searchDvf({ codePostal, type, years });
      setAnalysis(result);
      saveSearch({
        codePostal,
        type,
        years,
        summary: { median: result.median, count: result.count },
      });
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
          <h1>Immobilier</h1>
          <p className="text-muted">
            Prix réels DVF, carte interactive, simulateur de rentabilité
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/real-estate/analyze" className="btn btn-secondary">
            <Sparkles size={16} /> Analyser une annonce
          </Link>
          <Link to="/real-estate/simulator" className="btn btn-primary">
            <Calculator size={16} /> Nouvelle simulation
          </Link>
        </div>
      </header>

      <div className="glass-panel">
        <form onSubmit={handleSearch}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 160px 1fr auto',
              gap: 12,
              alignItems: 'end',
            }}
          >
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
              <label>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="apt">Appartement</option>
                <option value="maison">Maison</option>
              </select>
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label>Période</label>
              <select value={years} onChange={(e) => setYears(e.target.value)}>
                {YEAR_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
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

      {!analysis && !loading && (
        <div className="glass-panel" style={{ marginTop: 20 }}>
          <p className="text-muted">
            Lance une recherche avec un code postal pour voir le prix moyen au m², la carte des
            transactions et les liens vers les annonces actives.
          </p>
        </div>
      )}

      {analysis && analysis.count === 0 && (
        <div className="glass-panel" style={{ marginTop: 20 }}>
          <p className="text-muted">
            Aucune transaction trouvée pour ce code postal et ce type de bien sur cette période.
          </p>
        </div>
      )}

      {analysis && analysis.count > 0 && (
        <div className="dashboard-grid">
          <div className="col-span-3">
            <KpiCard label="Prix médian / m²" value={formatEUR(analysis.median)} />
          </div>
          <div className="col-span-3">
            <KpiCard label="10e percentile" value={formatEUR(analysis.p10)} />
          </div>
          <div className="col-span-3">
            <KpiCard label="90e percentile" value={formatEUR(analysis.p90)} />
          </div>
          <div className="col-span-3">
            <KpiCard
              label="Transactions"
              value={formatNumber(analysis.count)}
              trendLabel={`Années ${analysis.years.join(', ')}`}
              trend={0}
            />
          </div>

          <div className="col-span-12">
            <div className="glass-panel">
              <div className="flex-between" style={{ marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>Carte des transactions</h3>
                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <LegendDot color="#22c55e" label="Moins cher" />
                  <LegendDot color="#84cc16" label="Q2" />
                  <LegendDot color="#f59e0b" label="Q3" />
                  <LegendDot color="#ef4444" label="Plus cher" />
                </div>
              </div>
              <DvfMap points={analysis.mapPoints || []} center={analysis.center} />
              {analysis.mapPoints && analysis.mapPoints.length > 0 && (
                <p style={{ marginTop: 12, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {analysis.mapPoints.length} points affichés sur {formatNumber(analysis.count)}{' '}
                  transactions totales.
                </p>
              )}
            </div>
          </div>

          <div className="col-span-12">
            <div className="glass-panel">
              <h3>Voir les biens actuellement en vente</h3>
              <p className="text-muted" style={{ marginTop: 4, fontSize: '0.88rem' }}>
                Les sites d'annonces n'ont pas d'API publique. Voici des liens pré-remplis,
                filtrés sur {codePostal}.
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                <a
                  href={buildListingUrl('seloger', codePostal, type)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                >
                  SeLoger <ExternalLink size={14} />
                </a>
                <a
                  href={buildListingUrl('leboncoin', codePostal, type)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                >
                  LeBonCoin <ExternalLink size={14} />
                </a>
                <a
                  href={buildListingUrl('bienici', codePostal, type)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                >
                  Bien'ici <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>

          <div className="col-span-12">
            <div className="glass-panel">
              <h3>Transactions récentes ({codePostal})</h3>
              <div className="table-container" style={{ marginTop: 12 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Adresse</th>
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
      )}

      {projects.length > 0 && (
        <div className="glass-panel" style={{ marginTop: 20 }}>
          <h3>Mes projets enregistrés</h3>
          <div className="table-container" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Bien</th>
                  <th>Ville</th>
                  <th style={{ textAlign: 'right' }}>Prix</th>
                  <th style={{ textAlign: 'right' }}>Loyer / mois</th>
                  <th style={{ textAlign: 'right' }}>Rentabilité</th>
                  <th style={{ textAlign: 'right' }}>Cash flow / mois</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const gross = grossYield({
                    monthlyRent: p?.rental?.monthlyRent,
                    ...p?.purchase,
                  });
                  const cf = monthlyCashFlow({
                    ...p.rental,
                    ...p.purchase,
                    loanPrincipal: (p?.purchase?.price || 0) - (p?.purchase?.downPayment || 0),
                    loanRate: p?.purchase?.financingMonthlyRate,
                    loanYears: p?.purchase?.loanDuration,
                  });
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.label || 'Sans nom'}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {p.surface ? `${p.surface} m²` : '—'}
                          {p.rooms ? ` · ${p.rooms} p.` : ''}
                        </div>
                      </td>
                      <td>
                        {p.city || '—'} <Building2 size={12} style={{ verticalAlign: 'middle' }} />
                      </td>
                      <td style={{ textAlign: 'right' }}>{formatEUR(p?.purchase?.price)}</td>
                      <td style={{ textAlign: 'right' }}>{formatEUR(p?.rental?.monthlyRent)}</td>
                      <td style={{ textAlign: 'right' }}>{formatPercent(gross, { digits: 2 })}</td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 600,
                          color: cf >= 0 ? 'var(--accent)' : 'var(--negative)',
                        }}
                      >
                        {formatEUR(cf)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px' }}
                          onClick={() => {
                            if (confirm(`Supprimer le projet "${p.label}" ?`)) {
                              removeProject(p.id);
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
        </div>
      )}
    </>
  );
};

const LegendDot = ({ color, label }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: color,
        display: 'inline-block',
      }}
    />
    {label}
  </span>
);

export default RealEstate;
