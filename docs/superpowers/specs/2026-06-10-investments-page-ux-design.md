# Design — Refonte ergonomique de « Mes Investissements »

**Date :** 2026-06-10
**Page concernée :** `/investments` (`webapp/src/pages/investments/Investments.jsx`)
**Statut :** validé en brainstorming, en attente de relecture utilisateur

## Contexte & problème

La page actuelle affiche les comptes et positions sous forme de **tableaux plats** avec onglets enveloppe et fenêtres modales pour l'ajout. C'est compact mais « froid » : on a perdu le confort de l'ancien menu « Mes Comptes » (cartes riches par compte, bouton de rafraîchissement des prix, ajout en ligne).

**Objectif :** retrouver la chaleur de l'ancien menu en disposition **hybride**, et y ajouter 8 touches ergonomiques, sans régression de la synthèse en un coup d'œil.

## Disposition retenue : hybride

De haut en bas :

1. **En-tête** — titre + ligne de résumé (`N comptes · Patrimoine X € (+Y%)`). À droite : heure de dernière MAJ, bouton **⟳ Rafraîchir les prix** ①, bouton **+ Compte** ⑤.
2. **Bandeau de synthèse** — 3 KPIs (Total investi / Valeur actuelle / +- value) + **barre de répartition par enveloppe** ③.
3. **Barre d'onglets enveloppe** (Toutes / PEA / AV / CTO / Livrets / Crypto) + zone **recherche & tri** ⑧.
4. **Liste de cartes par compte** ② (empilées, repliables), filtrées par l'onglet actif.
5. **État vide** ⑦ quand 0 compte.

## Composants

### `Investments.jsx` (page, orchestration)
Responsabilités : état des onglets, recherche/tri, refresh des prix, formulaire d'ajout de compte en ligne, rendu de l'en-tête + bandeau + liste de `AccountCard`. Délègue tout le détail par compte à `AccountCard`.

### `AccountCard.jsx` (nouveau)
Une carte par compte. Contenu :
- **Header** : badge type coloré (couleur depuis `getAccountTypeDef`), logo courtier (`BrokerLogo`), nom, perf compacte (€/% vert/rouge), bouton **replier/déplier** ②, action supprimer.
- **KPIs** : Valeur totale, Performance (€ + %), nb de lignes. Pour les livrets : Solde + Plafond. (logique reprise de l'ancien `AccountCard`).
- **Barre de plafond** ④ — uniquement pour les types `cash` (livrets : Livret A, LDDS, LEP, Livret Jeune) ayant un `maxAmount` : barre de progression `solde / maxAmount` + texte « il reste Z € ». Exclu pour PEA/AV/CTO car leur `maxAmount` porte sur les versements cumulés (non suivis), pas sur la valeur courante.
- **Liste des positions** (repliable avec la carte) avec leurs valeurs/perf.
- **Ajout de position en ligne** ⑤ — formulaire qui se déplie dans la carte (logique de champs reprise de `AssetModal`).
- **Édition rapide** ⑥ — solde (livrets) et frais (`FEE_TYPES`) éditables dans la carte.

### `AllocationBar.jsx` (nouveau, présentation pure)
Reçoit `accounts` + `assets`, calcule la part de chaque enveloppe (valeur courante), rend une barre segmentée + légende. Couleurs depuis `ACCOUNT_TYPES`. Aucun état.

### État vide ⑦
Rendu dans `Investments.jsx` quand `accounts.length === 0` : titre accueillant, CTA « Créer mon premier compte », et 2-3 exemples cliquables (PEA, Assurance Vie) qui pré-remplissent le formulaire d'ajout.

## Détail des features

| # | Feature | Comportement | Données / dépendances |
|---|---|---|---|
| ① | Rafraîchir les prix | Bouton dans l'en-tête. Parcourt les tickers uniques des `assets`, appelle `fetchQuote` (existant), met à jour via `updateAsset({currentPrice})`. Spinner pendant, puis `setLastUpdated(new Date())`. Heure affichée à côté. | `yahooApi.fetchQuote`, `updateAsset` (déjà exposés) — **aucune modif du contexte** |
| ② | Cartes repliables | État `collapsed` local à `AccountCard`. Replié = header + KPIs seulement ; déplié = positions + actions. | local |
| ③ | Répartition par enveloppe | `AllocationBar` : somme valeur courante par type d'enveloppe, segments proportionnels. | `ACCOUNT_TYPES` (couleurs) |
| ④ | Barre de plafond livrets | Livrets (type `cash`) uniquement : barre `min(solde/max,1)`, texte restant. Au-delà du plafond : barre pleine + alerte discrète. | `getAccountTypeDef().maxAmount` |
| ⑤ | Ajout en ligne | Remplace l'usage des modales `AccountModal`/`AssetModal` par des formulaires qui se déplient sur place. Réutilise la logique de champs existante (autocomplete actif, fetch prix). | `addAccount`, `addAsset` |
| ⑥ | Édition rapide solde & frais | Champs éditables inline dans la carte. Solde → `updateAccount({balance})`. Frais → `updateAccount({fees})` selon `FEE_TYPES`. | `updateAccount`, `FEE_TYPES` |
| ⑦ | État vide accueillant | Onboarding quand 0 compte (voir ci-dessus). | — |
| ⑧ | Tri & recherche | Champ recherche (nom de compte/position) + tri (valeur, perf). État local dans `Investments.jsx`, appliqué au filtrage des cartes/positions. | local |

## Contraintes respectées (CLAUDE.md)

- **Contexte `PortfolioContext.jsx` non modifié** : le refresh des prix se fait au niveau page via `fetchQuote` + `updateAsset` déjà exposés.
- **Variables CSS uniquement** : toute nouvelle couleur/espacement passe par `index.css` (`:root`). Réutilise `.glass-panel`, `.btn`, `.animate-spin`, `--accent`, `--negative`, etc.
- **Design minimaliste N&B + accent vert** : les couleurs d'enveloppe (badges, barre de répartition) restent discrètes ; vert/rouge réservés aux perfs.

## Ce qui change concrètement

- `Investments.jsx` : passe de tableaux plats à orchestration + cartes. La logique de filtrage par enveloppe est conservée.
- **Nouveaux fichiers** : `components/AccountCard.jsx`, `components/AllocationBar.jsx`.
- `AccountModal.jsx` / `AssetModal.jsx` : leur logique de champs est extraite/réutilisée pour les formulaires en ligne. Les modales peuvent être supprimées si plus aucun appelant.
- `accountTypes.js` : réutilisé tel quel (aucune modif nécessaire — `maxAmount`, couleurs, `FEE_TYPES` déjà présents).

## Hors périmètre (YAGNI)

- Réorganisation des comptes par glisser-déposer.
- Variation journalière des cours (nécessiterait des données intraday).
- Refonte du Dashboard ou des autres pages (la page Immobilier fera l'objet d'un chantier séparé).

## Tests / validation

- Lint + build verts.
- Vérif manuelle dans l'app (dev server) : refresh met à jour les prix et l'heure ; cartes se replient ; barre de plafond correcte pour un Livret A ; ajout compte/position en ligne fonctionne ; état vide s'affiche à 0 compte ; recherche/tri filtrent bien.
- Aucune régression du calcul `totals` (déjà dans le contexte, inchangé).
