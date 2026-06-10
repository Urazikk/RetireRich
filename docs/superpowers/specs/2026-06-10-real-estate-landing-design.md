# Design — Refonte de la landing « Immobilier »

**Date :** 2026-06-10
**Page concernée :** `/real-estate` (`webapp/src/pages/real-estate/RealEstate.jsx`)
**Statut :** validé en brainstorming, en attente de relecture utilisateur

## Contexte & problème

La page actuelle mène avec un **formulaire de recherche DVF** et un placeholder « Lance une recherche… ». Les **projets enregistrés** (simulations locatives) sont relégués tout en bas, et seulement si `projects.length > 0`. Les **recherches récentes** (`searches` du contexte) ne sont pas affichées. Les outils (Explorer, Analyser, Simuler) sont de simples boutons dans l'en-tête. Résultat : à l'arrivée, la page est quasi vide et n'expose pas le contenu à valeur pour un utilisateur qui revient. On ne peut pas non plus **rouvrir/éditer** un projet — seulement le supprimer.

**Objectif :** transformer la page en **tableau de bord projets** : surfacer en premier les simulations et la synthèse du portefeuille immo, offrir des cartes d'outils claires, permettre d'éditer un projet, et soigner l'état vide — tout en conservant la recherche DVF en version compacte.

## Disposition retenue (utilisateur avec projets)

De haut en bas :

1. **Synthèse portefeuille immo** ② — bandeau KPIs : total investi (apport), cash-flow mensuel cumulé, rentabilité moyenne, nombre de projets.
2. **Outils en cartes** ③ — Explorer le marché / Analyser une annonce / Simuler un projet (icône + courte description, liens vers les routes existantes).
3. **Mes projets** — grille de cartes ① + contrôle de **tri** ⑦. Chaque carte : nom, ville, surface/pièces, prix, loyer, rentabilité brute/nette, cash-flow coloré, actions **éditer** ④ / **supprimer**.
4. **Prix du marché (DVF)** — **recherches récentes** en puces ⑤ + **recherche compacte** ⑧. Les résultats DVF existants (KPIs prix/m², carte `DvfMap`, transactions, liens annonces) restent, mais affichés sous la recherche, plus en héros.

**État vide** ⑥ (`projects.length === 0`) : onboarding « Simule ton premier investissement locatif » + présentation des 3 outils (cartes ③ réutilisées).

## Composants & fichiers

### `utils/realEstatePortfolio.js` (nouveau, pur, testé Vitest)
Fonctions sans React, réutilisant `realEstateMath` :
- `projectMetrics(project)` → `{ invested, grossYield, netYield, cashFlow }`
  - `invested` = `project.purchase.downPayment` (apport personnel — c'est « ce qu'on a mis »).
  - `grossYield` = `grossYield({ monthlyRent: rental.monthlyRent, price, notaryFees, works })`.
  - `netYield` = `netYield({ monthlyRent, vacancyRate, propertyTax, insurance, charges, mgmtFees, price, notaryFees, works })`.
  - `cashFlow` = `monthlyCashFlow({ ...rental, ...purchase, loanPrincipal: price - downPayment, loanRate: financingMonthlyRate, loanYears: loanDuration })`.
  (Mêmes formules que celles déjà utilisées dans le tableau actuel de `RealEstate.jsx`, lignes 293-304.)
- `portfolioSummary(projects)` → `{ totalInvested, totalCashFlow, avgGrossYield, count }`
  - `totalInvested` = Σ `invested`. `totalCashFlow` = Σ `cashFlow`. `avgGrossYield` = moyenne simple des `grossYield` (0 si aucun projet). `count` = `projects.length`.
- `sortProjects(projects, key)` → copie triée sans mutation. `key ∈ 'cashflow' | 'yield' | 'recent'` (recent = ordre d'ajout conservé).

### `components/ProjectCard.jsx` (nouveau)
Carte d'un projet. Props : `project`, `onEdit(id)`, `onDelete(id)`. Affiche les métriques via `projectMetrics`. Cash-flow et rentabilité colorés (vert/rouge). Boutons éditer/supprimer (suppression avec `window.confirm`).

### `components/ToolCard.jsx` (nouveau)
Carte d'entrée d'outil réutilisable. Props : `to` (route), `icon`, `title`, `description`. Rendu via `Link` (react-router).

### `pages/real-estate/RealEstate.jsx` (réorganisé)
Orchestration : synthèse (`portfolioSummary`) + rangée de `ToolCard` + grille de `ProjectCard` triée + bloc DVF (recherches récentes + recherche compacte + résultats existants) + état vide. La logique DVF existante (`handleSearch`, `searchDvf`, rendu KPIs/carte/transactions/liens) est conservée, juste déplacée dans le bloc « Prix du marché » sous la recherche.

### `pages/real-estate/SimulatorWizard.jsx` (mode édition ④)
- Lire `?edit=<id>` (via `useSearchParams`). Si présent et le projet existe : pré-remplir le formulaire depuis le projet et basculer en mode édition.
- `handleSave` : si en mode édition, appeler `updateProject(id, payload)` au lieu de `addProject(payload)`.
- **Mapping projet → formulaire** (inverse de `handleSave`) :
  - `label, city, type` ← directs ; `codePostal` ← `postalCode` ; `surface, rooms` ← directs.
  - `price` ← `purchase.price` ; `notaryFeesPct` ← `purchase.price ? round(purchase.notaryFees / purchase.price * 100, 1) : 7.5` ; `works` ← `purchase.works` ; `downPayment` ← `purchase.downPayment` ; `loanRate` ← `purchase.financingMonthlyRate` ; `loanYears` ← `purchase.loanDuration`.
  - `monthlyRent` ← `rental.monthlyRent` ; `monthlyRentOverride` ← `String(rental.monthlyRent)` (force la valeur enregistrée) ; `propertyTax, insurance, charges, vacancyRate, mgmtFees` ← `rental.*`.
- Le titre passe à « Modifier le projet » quand on édite.

## Détail des features

| # | Feature | Comportement | Dépendances |
|---|---|---|---|
| ① | Projets en cartes | Grille de `ProjectCard` en haut, remplace le tableau du bas. | `projectMetrics` |
| ② | Synthèse portefeuille | Bandeau KPIs via `portfolioSummary`. | `portfolioSummary`, `KpiCard` |
| ③ | Outils en cartes | 3 `ToolCard` vers `/real-estate/explorer`, `/analyze`, `/simulator`. | `Link` |
| ④ | Rouvrir / éditer | Carte → `navigate('/real-estate/simulator?edit=' + id)` ; wizard pré-rempli, sauve via `updateProject`. | `updateProject`, `useSearchParams` |
| ⑤ | Recherches récentes | Puces depuis `searches` (codes postaux) → relance `handleSearch`. | `searches` (contexte) |
| ⑥ | État vide accueillant | `projects.length === 0` → onboarding + cartes outils. | — |
| ⑦ | Tri des projets | Select (cash-flow / rentabilité / récent) → `sortProjects`. | `sortProjects` |
| ⑧ | Recherche DVF compacte | Form DVF conservé mais compact, sous les projets ; résultats inchangés. | `searchDvf`, `DvfMap` |

## Contraintes respectées (CLAUDE.md)

- **`RealEstateContext.jsx` non modifié** : il expose déjà `projects, searches, addProject, updateProject, removeProject, saveSearch`.
- **Variables CSS uniquement** ; design minimaliste N&B ; vert/rouge réservés aux montants financiers (cash-flow, rentabilité).
- Réutilise `realEstateMath` (aucune duplication de formule) et `KpiCard`, `DvfMap`, `BrokerLogo` existants.

## Hors périmètre (YAGNI)

- Comparaison côte à côte de projets.
- Édition inline d'un projet directement dans la carte (on rouvre le wizard, plus simple et cohérent).
- Refonte des pages Explorer / Analyzer / Simulator (seul le wizard gagne le mode édition).
- Données marché agrégées au-delà de la recherche DVF existante.

## Tests / validation

- **Vitest** sur `realEstatePortfolio.js` : `projectMetrics` (rentabilités/cash-flow attendus), `portfolioSummary` (agrégats, cas 0 projet), `sortProjects` (ordre + non-mutation).
- Lint + build verts.
- Vérif manuelle (dev server) : à 0 projet → onboarding ; avec projets → cartes + synthèse correctes ; clic sur une carte ouvre le wizard pré-rempli et « Enregistrer » met à jour le projet existant (pas de doublon) ; tri fonctionne ; puces de recherche récente relancent une recherche ; recherche DVF + carte + transactions fonctionnent comme avant.
