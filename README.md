# RetireRich

Dashboard patrimonial multi-projets : suivi des investissements financiers (PEA, AV, CTO, Crypto, Livrets) et analyse d'investissements immobiliers via les données publiques DVF.

## Stack

- React 19 + Vite 8 + React Router 7
- Recharts (visualisations) — lucide-react (icônes) — papaparse (CSV)
- État local : Context API + LocalStorage
- Données marché : Yahoo Finance (via proxy Vercel) + Twelve Data (fallback)
- Données immo : API DVF (data.gouv.fr) via api.cquest.org

## Démarrage

```bash
cd webapp
npm install
npm run dev
```

L'app s'ouvre sur `http://localhost:5173`.

## Structure

```
webapp/        — Application React (Vite)
proxy/         — Edge function Vercel pour proxy Yahoo Finance
scripts/       — Scripts Python (univers PEA, DVF)
```

## Modules

- **Dashboard** : vue consolidée du patrimoine
- **Mes Investissements** : PEA / AV / CTO / Crypto / Livrets, positions par enveloppe
- **Mes Dépenses** : suivi mensuel revenus & dépenses
- **Conseil** : alertes diversification, plafonds, épargne de précaution
- **Projections** : simulation long terme (intérêts composés)
- **Immobilier** : recherche prix DVF + simulateur d'investissement locatif
- **Impôts** : simulation IR + gain PER
