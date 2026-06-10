# Refonte de la landing « Immobilier » — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer `/real-estate` en tableau de bord projets (synthèse + cartes de projets + cartes d'outils + recherche DVF compacte + état vide), et ajouter le mode édition au `SimulatorWizard`, sans modifier `RealEstateContext.jsx`.

**Architecture:** Un module pur `utils/realEstatePortfolio.js` (testé Vitest, réutilise `realEstateMath`) calcule les métriques par projet et les agrégats. Deux composants de présentation (`ProjectCard`, `ToolCard`). `RealEstate.jsx` est réorganisé en orchestration. `SimulatorWizard.jsx` lit `?edit=<id>` pour pré-remplir et sauver via `updateProject`.

**Tech Stack:** React 19, Vite 8, React Router 7 (`useSearchParams`), Lucide-React, Vitest (déjà configuré).

---

## Référence — formes de données (existant)

```js
// project (créé par SimulatorWizard.handleSave) :
// { id, createdAt, label, city, postalCode, surface, rooms, type,
//   purchase: { price, notaryFees, works, downPayment, financingMonthlyRate, loanDuration },
//   rental:   { monthlyRent, vacancyRate, charges, propertyTax, insurance, mgmtFees } }
// search (créé par saveSearch) : { id, queriedAt, codePostal, type, years, summary:{median,count} }
```

Helpers existants : `realEstateMath` exporte `grossYield({monthlyRent,price,notaryFees,works})`, `netYield({monthlyRent,vacancyRate,propertyTax,insurance,charges,mgmtFees,price,notaryFees,works})`, `monthlyCashFlow({monthlyRent,vacancyRate,charges,propertyTax,insurance,mgmtFees,loanPrincipal,loanRate,loanYears})`. `useRealEstate()` expose `projects, searches, addProject, updateProject, removeProject, saveSearch`. `format.js` : `formatEUR, formatNumber, formatPercent`. Composants : `KpiCard`, `DvfMap`. Vitest tourne via `npm test` (include `src/**/*.test.js`).

---

## Task 1 : Module pur `realEstatePortfolio.js` (TDD)

**Files:** Create `webapp/src/utils/realEstatePortfolio.js` and `webapp/src/utils/realEstatePortfolio.test.js`

- [ ] **Step 1 : Écrire le test qui échoue.** Create `webapp/src/utils/realEstatePortfolio.test.js` with EXACTLY this content:
```js
import { describe, it, expect } from 'vitest';
import { projectMetrics, portfolioSummary, sortProjects } from './realEstatePortfolio.js';

// Projet A : prêt à 0 %, pas de charges → maths simples
const projA = {
  id: 'A', label: 'A', postalCode: '69007', type: 'apt', surface: 25, rooms: 1,
  purchase: { price: 100000, notaryFees: 0, works: 0, downPayment: 20000, financingMonthlyRate: 0, loanDuration: 20 },
  rental: { monthlyRent: 500, vacancyRate: 0, charges: 0, propertyTax: 0, insurance: 0, mgmtFees: 0 },
};
const projB = {
  id: 'B', label: 'B', postalCode: '44000', type: 'apt', surface: 42, rooms: 2,
  purchase: { price: 200000, notaryFees: 0, works: 0, downPayment: 50000, financingMonthlyRate: 0, loanDuration: 20 },
  rental: { monthlyRent: 800, vacancyRate: 0, charges: 0, propertyTax: 0, insurance: 0, mgmtFees: 0 },
};

describe('projectMetrics', () => {
  it('calcule invested (apport), rentabilités et cash-flow', () => {
    const m = projectMetrics(projA);
    expect(m.invested).toBe(20000);
    expect(m.grossYield).toBeCloseTo(6, 5); // 500*12/100000
    expect(m.netYield).toBeCloseTo(6, 5);   // pas de charges
    // cash-flow : loyer 500 - mensualité (80000/240=333.33) = 166.67
    expect(m.cashFlow).toBeCloseTo(166.67, 1);
  });
});

describe('portfolioSummary', () => {
  it('agrège investi, cash-flow et rentabilité moyenne', () => {
    const s = portfolioSummary([projA, projB]);
    expect(s.totalInvested).toBe(70000);
    expect(s.count).toBe(2);
    // gross A=6, B=4.8 → moyenne 5.4
    expect(s.avgGrossYield).toBeCloseTo(5.4, 5);
    // cash-flow A=166.67, B=175 (800-150000/240=625) → 341.67
    expect(s.totalCashFlow).toBeCloseTo(341.67, 1);
  });
  it('retourne des zéros sans projet', () => {
    expect(portfolioSummary([])).toEqual({ totalInvested: 0, totalCashFlow: 0, avgGrossYield: 0, count: 0 });
  });
});

describe('sortProjects', () => {
  it('trie par cash-flow décroissant', () => {
    expect(sortProjects([projA, projB], 'cashflow').map((p) => p.id)).toEqual(['B', 'A']);
  });
  it('trie par rentabilité décroissante', () => {
    expect(sortProjects([projA, projB], 'yield').map((p) => p.id)).toEqual(['A', 'B']);
  });
  it("conserve l'ordre d'insertion pour 'recent' et ne mute pas la source", () => {
    const src = [projA, projB];
    expect(sortProjects(src, 'recent').map((p) => p.id)).toEqual(['A', 'B']);
    expect(src.map((p) => p.id)).toEqual(['A', 'B']);
  });
});
```

- [ ] **Step 2 : Lancer les tests → échec.** `cd /Users/simon/Desktop/Projet/RetireRich/webapp && npm test` → FAIL (`Failed to resolve import "./realEstatePortfolio.js"`).

- [ ] **Step 3 : Implémentation.** Create `webapp/src/utils/realEstatePortfolio.js`:
```js
import { grossYield, netYield, monthlyCashFlow } from './realEstateMath.js';

// Métriques d'un projet locatif (mêmes formules que l'ancien tableau de RealEstate).
export const projectMetrics = (project) => {
  const purchase = project?.purchase || {};
  const rental = project?.rental || {};
  const price = Number(purchase.price) || 0;
  const downPayment = Number(purchase.downPayment) || 0;
  const base = {
    monthlyRent: rental.monthlyRent,
    price,
    notaryFees: purchase.notaryFees,
    works: purchase.works,
  };
  const gross = grossYield(base);
  const net = netYield({
    ...base,
    vacancyRate: rental.vacancyRate,
    propertyTax: rental.propertyTax,
    insurance: rental.insurance,
    charges: rental.charges,
    mgmtFees: rental.mgmtFees,
  });
  const cashFlow = monthlyCashFlow({
    monthlyRent: rental.monthlyRent,
    vacancyRate: rental.vacancyRate,
    charges: rental.charges,
    propertyTax: rental.propertyTax,
    insurance: rental.insurance,
    mgmtFees: rental.mgmtFees,
    loanPrincipal: price - downPayment,
    loanRate: purchase.financingMonthlyRate,
    loanYears: purchase.loanDuration,
  });
  return { invested: downPayment, grossYield: gross, netYield: net, cashFlow };
};

// Agrégats du portefeuille immo.
export const portfolioSummary = (projects) => {
  if (!projects || projects.length === 0) {
    return { totalInvested: 0, totalCashFlow: 0, avgGrossYield: 0, count: 0 };
  }
  let totalInvested = 0;
  let totalCashFlow = 0;
  let sumGross = 0;
  for (const p of projects) {
    const m = projectMetrics(p);
    totalInvested += m.invested;
    totalCashFlow += m.cashFlow;
    sumGross += m.grossYield;
  }
  return {
    totalInvested,
    totalCashFlow,
    avgGrossYield: sumGross / projects.length,
    count: projects.length,
  };
};

// Tri sans mutation. key ∈ 'cashflow' | 'yield' | 'recent'.
export const sortProjects = (projects, key) => {
  const copy = [...projects];
  if (key === 'cashflow') return copy.sort((a, b) => projectMetrics(b).cashFlow - projectMetrics(a).cashFlow);
  if (key === 'yield') return copy.sort((a, b) => projectMetrics(b).grossYield - projectMetrics(a).grossYield);
  return copy;
};
```

- [ ] **Step 4 : Lancer les tests → succès.** `npm test` → tous verts. Puis `npm run lint` → 0 erreur.

- [ ] **Step 5 : Commit.**
```bash
cd /Users/simon/Desktop/Projet/RetireRich
git add webapp/src/utils/realEstatePortfolio.js webapp/src/utils/realEstatePortfolio.test.js
git commit -m "feat: module pur realEstatePortfolio (métriques projet + agrégats + tri)"
```

---

## Task 2 : Composant `ToolCard.jsx`

**Files:** Create `webapp/src/components/ToolCard.jsx`

- [ ] **Step 1 : Écrire le composant.** Create `webapp/src/components/ToolCard.jsx`:
```jsx
import { Link } from 'react-router-dom';

// Carte d'entrée vers un outil. icon = composant Lucide.
const ToolCard = ({ to, icon: Icon, title, description }) => (
  <Link
    to={to}
    className="glass-panel"
    style={{ display: 'block', flex: 1, minWidth: 200, textDecoration: 'none', color: 'inherit' }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
      <Icon size={20} />
      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{title}</span>
    </div>
    <p className="text-muted" style={{ margin: 0, fontSize: '0.84rem' }}>{description}</p>
  </Link>
);

export default ToolCard;
```

- [ ] **Step 2 : Lint + build.** `cd /Users/simon/Desktop/Projet/RetireRich/webapp && npm run lint && npm run build` → 0 erreur, build OK.

- [ ] **Step 3 : Commit.**
```bash
cd /Users/simon/Desktop/Projet/RetireRich
git add webapp/src/components/ToolCard.jsx
git commit -m "feat: composant ToolCard (carte d'entrée outil)"
```

---

## Task 3 : Composant `ProjectCard.jsx`

**Files:** Create `webapp/src/components/ProjectCard.jsx`

- [ ] **Step 1 : Écrire le composant.** Create `webapp/src/components/ProjectCard.jsx`:
```jsx
import { Pencil, Trash2, Building2 } from 'lucide-react';
import { projectMetrics } from '../utils/realEstatePortfolio.js';
import { formatEUR, formatPercent } from '../utils/format.js';

const ProjectCard = ({ project, onEdit, onDelete }) => {
  const m = projectMetrics(project);
  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="flex-between" style={{ alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: 'var(--text)' }}>{project.label || 'Sans nom'}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            {project.surface ? `${project.surface} m²` : '—'}
            {project.rooms ? ` · ${project.rooms} p.` : ''}
            {project.city ? <> · <Building2 size={11} /> {project.city}</> : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => onEdit(project.id)}
            title="Modifier ce projet"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => { if (window.confirm(`Supprimer le projet "${project.label || ''}" ?`)) onDelete(project.id); }}
            title="Supprimer ce projet"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Prix <strong style={{ color: 'var(--text)' }}>{formatEUR(project?.purchase?.price)}</strong>
        {' · '}Loyer <strong style={{ color: 'var(--text)' }}>{formatEUR(project?.rental?.monthlyRent)}</strong>/mois
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Rentab. <strong style={{ color: 'var(--text)' }}>{formatPercent(m.grossYield, { digits: 1 })}</strong> brute
        {' · '}<strong style={{ color: 'var(--text)' }}>{formatPercent(m.netYield, { digits: 1 })}</strong> nette
      </div>
      <div style={{ fontWeight: 700, color: m.cashFlow >= 0 ? 'var(--accent)' : 'var(--negative)' }}>
        Cash-flow {m.cashFlow >= 0 ? '+' : ''}{formatEUR(m.cashFlow)}/mois
      </div>
    </div>
  );
};

export default ProjectCard;
```

- [ ] **Step 2 : Lint + build.** `cd /Users/simon/Desktop/Projet/RetireRich/webapp && npm run lint && npm run build` → 0 erreur, build OK.
> Note : `formatPercent` est appelé avec `{ digits: 1 }` — c'est la signature déjà utilisée ailleurs (`RealEstate.jsx` actuel l'appelle avec `{ digits: 2 }`). Si la signature réelle diffère, adapte l'appel (mais NE modifie pas `format.js`).

- [ ] **Step 3 : Commit.**
```bash
cd /Users/simon/Desktop/Projet/RetireRich
git add webapp/src/components/ProjectCard.jsx
git commit -m "feat: composant ProjectCard (carte projet immo)"
```

---

## Task 4 : Réorganisation de `RealEstate.jsx`

**Files:** Modify (réécriture complète) `webapp/src/pages/real-estate/RealEstate.jsx`

- [ ] **Step 1 : Réécrire la page.** Replace TOUT le contenu de `webapp/src/pages/real-estate/RealEstate.jsx` par :
```jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Loader2, ExternalLink, Calculator, Sparkles, Map as MapIcon } from 'lucide-react';
import { useRealEstate } from '../../context/useRealEstate.js';
import { searchDvf } from '../../utils/dvfApi.js';
import { formatEUR, formatNumber } from '../../utils/format.js';
import { portfolioSummary, sortProjects } from '../../utils/realEstatePortfolio.js';
import KpiCard from '../../components/KpiCard.jsx';
import DvfMap from '../../components/DvfMap.jsx';
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

  const summary = portfolioSummary(projects);
  const sortedProjects = sortProjects(projects, sortKey);
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
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {TOOLS.map((t) => <ToolCard key={t.to} {...t} />)}
          </div>
        </div>
      ) : (
        <>
          <div className="dashboard-grid">
            <div className="col-span-3"><KpiCard label="Total investi" value={formatEUR(summary.totalInvested)} /></div>
            <div className="col-span-3"><KpiCard label="Cash-flow / mois" value={formatEUR(summary.totalCashFlow)} trend={summary.totalCashFlow} /></div>
            <div className="col-span-3"><KpiCard label="Rentabilité moy." value={`${summary.avgGrossYield.toFixed(1)} %`} /></div>
            <div className="col-span-3"><KpiCard label="Projets" value={String(summary.count)} /></div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
            {TOOLS.map((t) => <ToolCard key={t.to} {...t} />)}
          </div>

          <div className="glass-panel" style={{ marginTop: 20 }}>
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Mes projets</h3>
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} style={{ padding: '8px 10px' }}>
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
                key={`${s.codePostal}-${i}`}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                onClick={() => replayRecent(s)}
              >
                {s.codePostal}
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
              <DvfMap points={analysis.mapPoints || []} center={analysis.center} />
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
```

- [ ] **Step 2 : Lint + build.** `cd /Users/simon/Desktop/Projet/RetireRich/webapp && npm run lint && npm run build` → 0 erreur, build OK.

- [ ] **Step 3 : Vérification manuelle.** `npm run dev` (si pas lancé) → http://localhost:5173/real-estate. Vérifier : (a) sans projet → onboarding + 3 cartes d'outils ; (b) le bloc DVF s'affiche toujours ; lancer une recherche (ex. 69007) montre KPIs + carte + transactions ; (c) une puce « récente » relance la recherche ; (d) avec ≥1 projet (en créer un via le wizard) → KPIs de synthèse + cartes projet + tri.

- [ ] **Step 4 : Commit.**
```bash
cd /Users/simon/Desktop/Projet/RetireRich
git add webapp/src/pages/real-estate/RealEstate.jsx
git commit -m "feat: landing Immobilier en tableau de bord (synthèse, cartes projet, outils, DVF compact, état vide)"
```

---

## Task 5 : Mode édition du `SimulatorWizard`

**Files:** Modify `webapp/src/pages/real-estate/SimulatorWizard.jsx`

Contexte : aujourd'hui le composant fait `const { addProject } = useRealEstate();` (ligne 49), initialise `form` via `useState({...})` (lignes 51-71), a `const navigate = useNavigate();` (ligne 48), importe `{ Link, useNavigate }` (ligne 2), affiche `<h1>Nouveau projet locatif</h1>`, et `handleSave` appelle `addProject({...})` puis `navigate('/real-estate')`.

- [ ] **Step 1 : Ajouter `useSearchParams` à l'import react-router.**
Remplacer la ligne :
```jsx
import { Link, useNavigate } from 'react-router-dom';
```
par :
```jsx
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
```

- [ ] **Step 2 : Ajouter le formulaire par défaut + le mapper projet→form au niveau module.**
Juste avant `const SimulatorWizard = () => {`, insérer :
```jsx
const DEFAULT_FORM = {
  label: '', city: '', codePostal: '', type: 'apt', surface: 50, rooms: 2,
  price: 200000, notaryFeesPct: 7.5, works: 0, downPayment: 20000,
  loanRate: 3.5, loanYears: 20, monthlyRent: 0, monthlyRentOverride: '',
  propertyTax: 800, insurance: 200, charges: 30, vacancyRate: 5, mgmtFees: 0,
};

// Inverse de handleSave : projet enregistré → champs du formulaire.
const projectToForm = (p) => {
  const pu = p.purchase || {};
  const re = p.rental || {};
  const price = Number(pu.price) || 0;
  return {
    label: p.label || '',
    city: p.city || '',
    codePostal: p.postalCode || '',
    type: p.type || 'apt',
    surface: Number(p.surface) || 0,
    rooms: Number(p.rooms) || 0,
    price,
    notaryFeesPct: price > 0 ? Math.round(((Number(pu.notaryFees) || 0) / price) * 1000) / 10 : 7.5,
    works: Number(pu.works) || 0,
    downPayment: Number(pu.downPayment) || 0,
    loanRate: Number(pu.financingMonthlyRate) || 0,
    loanYears: Number(pu.loanDuration) || 20,
    monthlyRent: Number(re.monthlyRent) || 0,
    monthlyRentOverride: re.monthlyRent != null ? String(re.monthlyRent) : '',
    propertyTax: Number(re.propertyTax) || 0,
    insurance: Number(re.insurance) || 0,
    charges: Number(re.charges) || 0,
    vacancyRate: Number(re.vacancyRate) || 0,
    mgmtFees: Number(re.mgmtFees) || 0,
  };
};
```

- [ ] **Step 3 : Lire le projet à éditer et initialiser le formulaire depuis lui.**
Remplacer :
```jsx
  const navigate = useNavigate();
  const { addProject } = useRealEstate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    label: '',
    city: '',
    codePostal: '',
    type: 'apt',
    surface: 50,
    rooms: 2,
    price: 200000,
    notaryFeesPct: 7.5,
    works: 0,
    downPayment: 20000,
    loanRate: 3.5,
    loanYears: 20,
    monthlyRent: 0,
    monthlyRentOverride: '',
    propertyTax: 800,
    insurance: 200,
    charges: 30,
    vacancyRate: 5,
    mgmtFees: 0,
  });
```
par :
```jsx
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addProject, updateProject, projects } = useRealEstate();
  const editId = searchParams.get('edit');
  const editProject = editId ? projects.find((p) => p.id === editId) : null;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => (editProject ? projectToForm(editProject) : DEFAULT_FORM));
```

- [ ] **Step 4 : Sauver via `updateProject` en mode édition.**
Dans `handleSave`, remplacer l'appel :
```jsx
    addProject({
```
… jusqu'à sa parenthèse fermante `});` — c'est-à-dire le bloc :
```jsx
    addProject({
      label: form.label,
      city: form.city || rentEstimate?.commune || dvf?.center?.city || '',
      postalCode: form.codePostal,
      surface: Number(form.surface),
      rooms: Number(form.rooms),
      type: form.type,
      purchase: {
        price: Number(form.price),
        notaryFees,
        works: Number(form.works),
        downPayment: Number(form.downPayment),
        financingMonthlyRate: Number(form.loanRate),
        loanDuration: Number(form.loanYears),
      },
      rental: {
        monthlyRent: effectiveRent,
        vacancyRate: Number(form.vacancyRate),
        charges: Number(form.charges),
        propertyTax: Number(form.propertyTax),
        insurance: Number(form.insurance),
        mgmtFees: Number(form.mgmtFees),
      },
    });
```
par :
```jsx
    const payload = {
      label: form.label,
      city: form.city || rentEstimate?.commune || dvf?.center?.city || '',
      postalCode: form.codePostal,
      surface: Number(form.surface),
      rooms: Number(form.rooms),
      type: form.type,
      purchase: {
        price: Number(form.price),
        notaryFees,
        works: Number(form.works),
        downPayment: Number(form.downPayment),
        financingMonthlyRate: Number(form.loanRate),
        loanDuration: Number(form.loanYears),
      },
      rental: {
        monthlyRent: effectiveRent,
        vacancyRate: Number(form.vacancyRate),
        charges: Number(form.charges),
        propertyTax: Number(form.propertyTax),
        insurance: Number(form.insurance),
        mgmtFees: Number(form.mgmtFees),
      },
    };
    if (editProject) updateProject(editProject.id, payload);
    else addProject(payload);
```

- [ ] **Step 5 : Adapter le titre en mode édition.**
Remplacer :
```jsx
          <h1>Nouveau projet locatif</h1>
```
par :
```jsx
          <h1>{editProject ? 'Modifier le projet' : 'Nouveau projet locatif'}</h1>
```

- [ ] **Step 6 : Lint + build.** `cd /Users/simon/Desktop/Projet/RetireRich/webapp && npm run lint && npm run build` → 0 erreur, build OK.

- [ ] **Step 7 : Vérification manuelle.** Depuis `/real-estate`, cliquer le crayon d'un projet → le wizard s'ouvre titré « Modifier le projet », champs pré-remplis ; modifier le loyer, aller jusqu'à « Enregistrer » → retour à `/real-estate`, le projet est **mis à jour** (pas de doublon).

- [ ] **Step 8 : Commit.**
```bash
cd /Users/simon/Desktop/Projet/RetireRich
git add webapp/src/pages/real-estate/SimulatorWizard.jsx
git commit -m "feat: mode édition du SimulatorWizard (?edit=id → updateProject)"
```

---

## Task 6 : Vérification finale

- [ ] **Step 1 : Suite complète.** `cd /Users/simon/Desktop/Projet/RetireRich/webapp && npm run lint && npm test && npm run build`
Expected : lint 0 erreur, tous les tests verts (les 14 d'investissements + les nouveaux de realEstatePortfolio), build OK.

- [ ] **Step 2 : Commit (si quoi que ce soit reste à committer).**
```bash
cd /Users/simon/Desktop/Projet/RetireRich
git status --porcelain
# si non vide :
git add -A && git commit -m "chore: vérification finale landing immobilier"
```

---

## Récap de couverture (spec → tâches)

| Élément spec | Tâche |
|---|---|
| ① Projets en cartes | 3 (ProjectCard) + 4 (grille) |
| ② Synthèse portefeuille | 1 (portfolioSummary) + 4 (KPIs) |
| ③ Outils en cartes | 2 (ToolCard) + 4 (rangée + état vide) |
| ④ Rouvrir / éditer un projet | 4 (bouton → navigate) + 5 (wizard edit) |
| ⑤ Recherches récentes | 4 (puces replayRecent) |
| ⑥ État vide accueillant | 4 |
| ⑦ Tri des projets | 1 (sortProjects) + 4 (select) |
| ⑧ Recherche DVF compacte | 4 (bloc DVF déplacé sous les projets) |
| `realEstatePortfolio.js` testé Vitest | 1 |
| Contexte non modifié | toutes (refresh/édition via API existante) |
