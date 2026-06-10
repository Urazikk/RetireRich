# RetireRich — CLAUDE.md

## Projet

Application web de finance personnelle pour un particulier français : gestion du patrimoine financier (PEA, AV, CTO, Crypto, Livrets) **et** analyse d'investissement immobilier (données publiques DVF). Stack : React 19 + Vite 8, proxy Vercel, état local (Context + localStorage).

Repo : https://github.com/Urazikk/RetireRich.git

## Structure

```
RetireRich/
├── webapp/                  # Frontend React + Vite — TOUT le travail UI est ici
│   ├── src/
│   │   ├── pages/           # Pages groupées par domaine (un dossier = un module)
│   │   ├── components/      # Composants réutilisables
│   │   ├── context/         # PortfolioContext + RealEstateContext — cœur de l'état
│   │   ├── utils/           # Helpers purs (pas de state, pas de JSX)
│   │   └── index.css        # Unique source de vérité CSS (variables + classes globales)
│   └── public/
├── proxy/                   # Fonctions Vercel (price.js, dvf) — ne pas toucher sans raison
└── scripts/                 # Scripts Python (univers PEA, DVF)
```

**Secrets non versionnés** (gitignorés) : `webapp/.env.local` (`TWELVE_DATA_KEY`, `VITE_YAHOO_PROXY_URL`) et `webapp/.yahoo-cookies.txt`.

## Règles strictes

**Ne jamais lire ni modifier :** `node_modules/`, `dist/`, `.git/`, `venv/`

**Ne jamais modifier `PortfolioContext.jsx` ni `RealEstateContext.jsx` sans accord explicite.** Ce sont les cœurs de l'état global — toutes les pages en dépendent.

**Toujours utiliser les variables CSS de `index.css`.** Jamais de couleur hardcodée. Si une nouvelle variable est nécessaire, l'ajouter dans `:root` dans `index.css`.

**Réponses courtes et directes.** Pas d'explication inutile, aller droit au but.

## Design System

### Philosophie
Minimaliste noir et blanc épuré. Pas de couleurs vives sauf l'accent vert. Rien qui ressemble à un template générique. Chaque composant doit avoir un niveau de finition élevé.

### Palette (variables CSS — `index.css :root`)
```css
--bg:           #ffffff       /* fond principal */
--bg-subtle:    #f7f7f7       /* fond de carte / section */
--bg-overlay:   rgba(255,255,255,0.7) /* glassmorphism */
--text:         #0a0a0a       /* texte principal */
--text-muted:   #6b6b6b       /* texte secondaire */
--border:       rgba(0,0,0,0.08)     /* bordures fines */
--border-hover: rgba(0,0,0,0.14)
--hairline:     rgba(0,0,0,0.06)
--accent:       #22c55e       /* UNIQUEMENT chiffres positifs */
--negative:     #ef4444       /* chiffres négatifs */
--shadow-sm / --shadow-md / --shadow-lg
--radius-sm: 8px  --radius-md: 12px  --radius-lg: 20px
--transition:   all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)
```

### Typographie
- Police : `Outfit` (déjà importée)
- Titres : `font-weight: 600`, `letter-spacing: -0.02em`, couleur `--text`
- Corps : `font-weight: 400`, couleur `--text-muted`
- Valeurs financières : `font-weight: 700`, `font-variant-numeric: tabular-nums`

### Navigation (sidebar — `components/Layout.jsx`)
- Logo SVG uniquement en haut à gauche — pas de nom de l'app
- Icônes Lucide + label texte (`NAV_ITEMS`)
- Item actif (`NavLink`) : `border-left: 2px solid var(--text)`, fond `--bg-subtle`
- Sidebar fond `--bg`, border-right `--border`

### Glassmorphism
Usage **discret** uniquement sur cartes/modals sur fond blanc :
```css
background: var(--bg-overlay);
backdrop-filter: blur(8px);
-webkit-backdrop-filter: blur(8px);
border: 1px solid var(--border);
box-shadow: var(--shadow-md);
```

### Animations
**Au scroll uniquement** via `IntersectionObserver` :
```js
useEffect(() => {
  const observer = new IntersectionObserver(
    entries => entries.forEach(e => e.target.classList.toggle('visible', e.isIntersecting)),
    { threshold: 0.1 }
  );
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  return () => observer.disconnect();
}, []);
```
```css
.reveal { opacity: 0; transform: translateY(20px); transition: opacity 0.5s ease, transform 0.5s ease; }
.reveal.visible { opacity: 1; transform: translateY(0); }
```

### Boutons
```css
/* Primaire */   background: var(--text); color: var(--bg); border: none;
                 padding: 10px 20px; border-radius: var(--radius-sm); font-weight: 600;
/* Secondaire */ background: transparent; color: var(--text); border: 1px solid var(--border);
```

### Chiffres financiers
- Positif : `var(--accent)` (vert) · Négatif : `var(--negative)` (rouge) · Neutre : `var(--text)`
- Toujours `font-variant-numeric: tabular-nums` sur les montants

## Routes & pages (`src/App.jsx`)

| Route | Fichier | Rôle |
|---|---|---|
| `/` | `pages/Dashboard.jsx` | Vue patrimoine (treemap, expo géo) |
| `/investments` | `pages/investments/Investments.jsx` | Comptes & actifs par enveloppe |
| `/investments/fees` | `investments/FeeComparator.jsx` | Comparateur de frais |
| `/investments/explorer` | `investments/Explorer.jsx` | Explorer d'actifs |
| `/investments/asset/:ticker` | `investments/AssetDetail.jsx` | Détail d'un actif |
| `/expenses` | `pages/expenses/Expenses.jsx` | Budget par catégorie |
| `/expenses/recurring` | `expenses/Recurring.jsx` | Flux récurrents |
| `/expenses/calendar` | `expenses/CashCalendar.jsx` | Calendrier cash |
| `/advice` | `pages/advice/Conseil.jsx` | Scoring patrimonial 7 catégories |
| `/projections` | `pages/projections/Projections.jsx` | Projections + Sharpe Ratio |
| `/real-estate` | `pages/real-estate/RealEstate.jsx` | Hub immobilier |
| `/real-estate/simulator` | `real-estate/SimulatorWizard.jsx` | Simulateur locatif (wizard) |
| `/real-estate/simulator-advanced` | `real-estate/Simulator.jsx` | Simulateur avancé |
| `/real-estate/analyze` | `real-estate/ListingAnalyzer.jsx` | Analyse d'annonce |
| `/real-estate/explorer` | `real-estate/MarketExplorer.jsx` | Carte France par dépt + filtres |
| `/tax` | `pages/tax/ImpotRevenu.jsx` | Impôt revenu + 20+ dispositifs |

## État & données

- `context/PortfolioContext.jsx` — comptes, actifs, history, cashFlows, refreshPrices
- `context/RealEstateContext.jsx` — biens / simulations immo
- `utils/` — helpers purs : `scoringEngine`, `taxStrategies`, `realEstateMath`, `portfolioMetrics`, `dvfApi`, `rentApi`, `yahooApi`, `bankCsvParser`, `departments`, `useLocalStorageState`
- Prix marché : proxy Vercel → Yahoo Finance + Twelve Data (fallback)
- Données immo : API DVF (data.gouv.fr via api.cquest.org)

## Lancer le projet

```bash
cd webapp
npm install
npm run dev       # http://localhost:5173
npm run build     # build prod
npm run lint      # eslint
```
