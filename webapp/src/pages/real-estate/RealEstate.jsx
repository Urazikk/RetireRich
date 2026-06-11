import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, ExternalLink, Calculator, Sparkles, Map as MapIcon } from 'lucide-react';
import { useRealEstate } from '../../context/useRealEstate.js';
import { searchDvf } from '../../utils/dvfApi.js';
import { formatEUR, formatNumber } from '../../utils/format.js';
import { portfolioSummary, sortProjects } from '../../utils/realEstatePortfolio.js';
import KpiCard from '../../components/KpiCard.jsx';
import ParcelMap from '../../components/ParcelMap.jsx';
import Skeleton from '../../components/Skeleton.jsx';
import ToolCard from '../../components/ToolCard.jsx';
import ProjectCard from '../../components/ProjectCard.jsx';

const YEAR_PRESETS = [
  { id: '2024', label: '2024' },
  { id: '2023,2024', label: '2023-24' },
  { id: '2022,2023,2024', label: '3 dernières' },
  { id: '2018,2019,2020,2021,2022,2023,2024', label: 'Historique complet' },
];

const TOOLS = [
  { to: '/real-estate/explorer', icon: MapIcon, title: 'Explorer le marché', description: 'Carte de France, prix réels par département' },
  { to: '/real-estate/analyze', icon: Sparkles, title: 'Analyser une annonce', description: 'Colle un lien, obtiens un score' },
  { to: '/real-estate/simulator', icon: Calculator, title: 'Simuler un projet', description: 'Wizard de rentabilité locative' },
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

const LegendDot = ({ color, label }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
    <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
    {label}
  </span>
);

const RealEstate = () => {
  const navigate = useNavigate();
  const { projects, removeProject, saveSearch, searches } = useRealEstate();
  const [codePostal, setCodePostal] = useState(() => searches[0]?.codePostal || '');
  const [type, setType] = useState(() => searches[0]?.type || 'apt');
  const [years, setYears] = useState(() => searches[0]?.years || '2023,2024');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [sortKey, setSortKey] = useState('cashflow');

  const runSearch = async (cp, ty, yr) => {
    if (!/^\d{5}$/.test(cp)) {
      setError('Entre un code postal valide (5 chiffres).');
      return;
    }
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const result = await searchDvf({ codePostal: cp, type: ty, years: yr });
      setAnalysis(result);
      saveSearch({ codePostal: cp, type: ty, years: yr, summary: { median: result.median, count: result.count } });
    } catch (err) {
      setError(err?.message || 'Erreur de récupération DVF');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    runSearch(codePostal, type, years);
  };

  const replayRecent = (s) => {
    setCodePostal(s.codePostal);
    setType(s.type);
    setYears(s.years);
    runSearch(s.codePostal, s.type, s.years);
  };

  const summary = useMemo(() => portfolioSummary(projects), [projects]);
  const sortedProjects = useMemo(() => sortProjects(projects, sortKey), [projects, sortKey]);
  const recentSearches = searches.slice(0, 5);

  return (
    <>
      <header className="header">
        <div>
          <h1>Immobilier</h1>
          <p className="text-muted">Tes projets locatifs, le marché DVF et les outils d'analyse</p>
        </div>
      </header>

      {projects.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: 40, marginBottom: 20 }}>
          <h2 style={{ marginBottom: 8 }}>Lance ton premier investissement locatif</h2>
          <p className="text-muted" style={{ marginBottom: 20 }}>
            Simule la rentabilité d'un bien, explore les prix réels du marché, analyse une annonce.
          </p>
          <div className="stagger" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {TOOLS.map((t) => <ToolCard key={t.to} {...t} />)}
          </div>
        </div>
      ) : (
        <>
          <div className="dashboard-grid stagger">
            <div className="col-span-3"><KpiCard label="Total investi" value={formatEUR(summary.totalInvested)} /></div>
            <div className="col-span-3"><KpiCard label="Cash-flow / mois" value={formatEUR(summary.totalCashFlow)} trend={summary.totalCashFlow} /></div>
            <div className="col-span-3"><KpiCard label="Rentabilité moy." value={`${summary.avgGrossYield.toFixed(1)} %`} /></div>
            <div className="col-span-3"><KpiCard label="Projets" value={String(summary.count)} /></div>
          </div>

          <div className="stagger" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
            {TOOLS.map((t) => <ToolCard key={t.to} {...t} />)}
          </div>

          <div className="glass-panel" style={{ marginTop: 20 }}>
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Mes projets</h3>
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
                <option value="cashflow">Tri : cash-flow</option>
                <option value="yield">Tri : rentabilité</option>
                <option value="recent">Tri : récent</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {sortedProjects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onEdit={(id) => navigate(`/real-estate/simulator?edit=${id}`)}
                  onDelete={removeProject}
                />
              ))}
            </div>
          </div>
        </>
      )}

      <div className="glass-panel" style={{ marginTop: 20 }}>
        <h3 style={{ marginTop: 0 }}>Prix du marché (DVF)</h3>
        {recentSearches.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Récentes :</span>
            {recentSearches.map((s, i) => (
              <button
                key={`${s.codePostal}-${s.type}-${i}`}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                onClick={() => replayRecent(s)}
              >
                {s.codePostal} {s.type === 'maison' ? 'Maison' : 'Apt'}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={handleSearch}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 1fr auto', gap: 12, alignItems: 'end' }}>
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
                  <option key={p.id} value={p.id}>{p.label}</option>
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

      {loading && (
        <div className="dashboard-grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="col-span-3">
              <div className="glass-panel kpi-card">
                <Skeleton width="55%" height={11} />
                <Skeleton width="75%" height={28} />
              </div>
            </div>
          ))}
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
          <div className="col-span-3"><KpiCard label="Prix médian / m²" value={formatEUR(analysis.median)} /></div>
          <div className="col-span-3"><KpiCard label="10e percentile" value={formatEUR(analysis.p10)} /></div>
          <div className="col-span-3"><KpiCard label="90e percentile" value={formatEUR(analysis.p90)} /></div>
          <div className="col-span-3">
            <KpiCard label="Transactions" value={formatNumber(analysis.count)} trendLabel={`Années ${analysis.years.join(', ')}`} trend={0} />
          </div>

          <div className="col-span-12">
            <div className="glass-panel">
              <div className="flex-between" style={{ marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>Carte des transactions</h3>
                <div style={{ display: 'flex', gap: 10, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <LegendDot color="#22c55e" label="Moins cher" />
                  <LegendDot color="#84cc16" label="Q2" />
                  <LegendDot color="#f59e0b" label="Q3" />
                  <LegendDot color="#ef4444" label="Plus cher" />
                </div>
              </div>
              <ParcelMap points={analysis.mapPoints || []} center={analysis.center} type={type} />
              {analysis.mapPoints && analysis.mapPoints.length > 0 && (
                <p style={{ marginTop: 12, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {analysis.mapPoints.length} points affichés sur {formatNumber(analysis.count)} transactions totales.
                </p>
              )}
            </div>
          </div>

          <div className="col-span-12">
            <div className="glass-panel">
              <h3>Voir les biens actuellement en vente</h3>
              <p className="text-muted" style={{ marginTop: 4, fontSize: '0.88rem' }}>
                Les sites d'annonces n'ont pas d'API publique. Voici des liens pré-remplis, filtrés sur {codePostal}.
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                <a href={buildListingUrl('seloger', codePostal, type)} target="_blank" rel="noreferrer" className="btn btn-secondary">SeLoger <ExternalLink size={14} /></a>
                <a href={buildListingUrl('leboncoin', codePostal, type)} target="_blank" rel="noreferrer" className="btn btn-secondary">LeBonCoin <ExternalLink size={14} /></a>
                <a href={buildListingUrl('bienici', codePostal, type)} target="_blank" rel="noreferrer" className="btn btn-secondary">Bien'ici <ExternalLink size={14} /></a>
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
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatEUR(t.pricePerSqm)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RealEstate;
