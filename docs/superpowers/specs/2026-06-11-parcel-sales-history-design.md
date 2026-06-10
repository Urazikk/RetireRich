# Design — Historique des ventes par parcelle (carte)

**Date :** 2026-06-11
**Pages concernées :** `/real-estate` (résultats DVF) et `/real-estate/explorer` (MarketExplorer)
**Statut :** validé en brainstorming, en attente de relecture utilisateur

## Contexte & problème

Les ventes DVF sont affichées comme des points individuels sur la carte (`DvfMap`), un point = une transaction. On ne voit pas qu'une **même parcelle** a été vendue plusieurs fois, ni son évolution de prix. L'utilisateur veut, **sur la carte**, la parcelle comme un point où l'on lit la vente (prix au m²…) et son **historique** quand il y a plusieurs ventes — réutilisé à la fois dans les **résultats DVF** et dans l'**Explorer du marché** (drill commune).

La donnée existe : le CSV geo-dvf par commune contient `id_parcelle`, `date_mutation`, `valeur_fonciere`, `surface_reelle_bati`, `latitude`, `longitude`. Le endpoint `dvf` parse déjà tout sauf `id_parcelle`.

## Comportement cible

- Sur la carte, **un marqueur par parcelle** (et non par transaction), géolocalisé.
- Couleur du marqueur = **prix/m² de la vente la plus récente**, gradient vert→rouge par quartiles (cohérent avec la légende DVF actuelle).
- Une parcelle **vendue 2+ fois** = marqueur distinct (anneau « revente »).
- **Clic** → popup : type de bien, surface, adresse, et la **liste des ventes** (date · prix · €/m²), avec le **% d'évolution** du €/m² entre la première et la dernière vente.
- Composant **partagé**, utilisé dans les résultats DVF **et** dans l'Explorer (clic sur une commune → panneau parcelles).

## Architecture

### Backend — `webapp/api/dvf.js`
Réalité du endpoint : `transactions` renvoyé est **plafonné à 50** (récentes) ; `mapPoints` est l'array **géolocalisé** (plafond 500) construit seulement si `geo=1`, mais il **ne porte pas** `id_parcelle` ni `type` aujourd'hui. La carte parcelles consomme donc **`mapPoints`**.

1. **Exposer `id_parcelle`** : ajouter `idParcelle: r.id_parcelle` à chaque entrée de `allTransactions` ; et l'**inclure dans le mapping `mapPoints`** (ligne ~190) : `idParcelle: t.idParcelle`. (Le `type` de bien n'est pas nécessaire par point : la recherche est déjà scopée sur un seul type, transmis à part au composant.)
2. **Mode commune directe** : accepter, en alternative à `code_postal`, des paramètres `insee` + `dept`. Si les deux sont fournis, sauter la résolution `code_postal → INSEE` (`resolveInsee`) et utiliser directement `communes = [{ insee, dept }]` ; le `center` retombe alors sur le 1er point géolocalisé (`mapPoints[0]`) si présent. Cela permet à l'Explorer (qui connaît l'INSEE des communes) de récupérer les ventes d'une commune sans code postal.

### Util pur — `webapp/src/utils/parcels.js` (testé Vitest)
- `groupByParcel(points)` où `points` = entrées `mapPoints` (`{ idParcelle, lat, lng, pricePerSqm, price, surface, adresse, date, year }`). Retourne un tableau de parcelles, **uniquement celles ayant `idParcelle` + géoloc finie** :
  ```
  {
    idParcelle, lat, lng,
    adresse,                  // de la vente la plus récente
    sales: [{ date, year, price, pricePerSqm, surface }] // triées par date croissante
    saleCount,                // sales.length
    latestPricePerSqm,        // pricePerSqm de la dernière vente (couleur du marqueur)
    evolutionPct              // (dernier €/m² − premier €/m²) / premier × 100, null si 1 vente
  }
  ```
  `lat`/`lng` = ceux de la dernière vente. Trié par `saleCount` décroissant puis par date de dernière vente décroissante. Ne mute pas l'entrée.
- Robustesse : points sans `idParcelle` ou sans géoloc sont ignorés (pas de marqueur possible).

### Composant — `webapp/src/components/ParcelMap.jsx` (nouveau, remplace l'usage de `DvfMap` dans les résultats DVF)
- Props : `points` (array `mapPoints`), `center`, `type` (`'apt'`/`'maison'`, pour l'en-tête de popup).
- Calcule `parcels = groupByParcel(points)` (mémoïsé).
- Quartiles de `latestPricePerSqm` sur l'ensemble des parcelles → couleur (réutilise la logique `colorFor` de `DvfMap`).
- Un `CircleMarker` par parcelle : couleur = quartile du `latestPricePerSqm` ; les reventes (`saleCount > 1`) ont un anneau distinct (`weight` plus épais + rayon légèrement plus grand).
- `Popup` (clic) : en-tête (adresse, libellé type, badge « N ventes »), puis la liste des ventes (date · surface · prix · €/m²), et si revente le `evolutionPct` coloré vert/rouge.
- `FitBounds` et `colorFor` repris de `DvfMap` (extraits dans le composant ou un petit util partagé). État vide identique (« Aucun point géolocalisé »).
- `DvfMap` est conservé tant qu'il a d'autres usages ; sinon supprimé en fin de chantier s'il n'est plus importé.

### Intégrations
- **Résultats DVF** (`RealEstate.jsx`) : remplacer `<DvfMap points={analysis.mapPoints} center={analysis.center} />` par `<ParcelMap points={analysis.mapPoints} center={analysis.center} type={type} />`. La recherche utilise déjà `searchDvf({...})` dont `geo` vaut `true` par défaut → `mapPoints` (avec `idParcelle` après le changement backend) est présent. Aucun autre changement de flux.
- **Explorer** (`MarketExplorer.jsx`) : ajouter `eventHandlers={{ click: ... }}` sur le `CircleMarker` de commune → état `selectedCommune` → charge les ventes via `fetch(\`${API_BASE}/api/dvf?insee=${code}&dept=${dept}&type=${type}&years=2019,2020,2021,2022,2023,2024&geo=1\`)` → affiche un panneau/drawer contenant `<ParcelMap points={data.mapPoints} type={type} />`. Réutilise `API_BASE` (déjà présent). Spinner pendant le chargement, message d'erreur sinon. Le code commune INSEE et le `dept` proviennent des données déjà chargées : chaque item commune porte `c.insee` (et `c.lat`/`c.lng`), et `dept` = l'état `dept` courant de l'Explorer (= `data.dept`). Le `type` (`'apt'`/`'maison'`) est dérivé de l'état `type` de l'Explorer (`'apt'` ↔ appartement).

## Contraintes respectées (CLAUDE.md)

- Aucun contexte global modifié.
- Variables CSS pour l'UI ; les couleurs des marqueurs (gradient €/m²) sont des constantes data-sémantiques déjà utilisées par `DvfMap` (`#22c55e/#84cc16/#f59e0b/#ef4444`) — exception légitime.
- Réutilise `realEstateMath`/format existants ; pas de duplication de la logique de couleur (extraite/partagée avec `DvfMap`).

## Hors périmètre (YAGNI)

- Plan cadastral / polygones de parcelle (on reste sur un point lat/lng par parcelle).
- Filtres avancés sur les parcelles (par nb de ventes, par évolution) — éventuel suivi.
- Historique inter-communes ou national.
- Estimation/prédiction de prix.

## Tests / validation

- **Vitest** sur `parcels.js` : `groupByParcel` regroupe par `idParcelle`, trie les ventes par date, calcule `saleCount` et `evolutionPct` (ex. 2 ventes 4000 → 5200 €/m² ⇒ +30 %), ignore les transactions sans géoloc/parcelle, ne mute pas la source.
- Lint + build verts.
- Vérif manuelle (dev server, `dvf` fonctionne en local) : sur une recherche DVF multi-années, les marqueurs sont par parcelle ; une parcelle vendue plusieurs fois affiche son historique + % au clic ; dans l'Explorer, cliquer une commune ouvre le panneau avec ses parcelles.
