# Socle micro-interactions — Design

**Date :** 2026-06-11
**Statut :** validé (démo interactive approuvée par Simon — `.superpowers/brainstorm/25968-1781194270/content/micro-interactions-demo.html`)
**Périmètre :** sous-projet A de la refonte UX. Le sous-projet B (palette Cmd+K + polish des recherches locales) fera l'objet d'une spec séparée et réutilisera ce socle.

## Objectif

Donner à RetireRich un langage d'animation cohérent et de qualité : zoom des icônes au survol, apparition en cascade des cartes, montants animés en compteur, toasts de confirmation, skeletons de chargement. **Stack : CSS pur + petits hooks React, zéro dépendance.**

## 1. Fondations (`webapp/src/index.css`)

Ajouts dans `:root` :

```css
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);   /* sorties, fondus */
--ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1); /* zooms, popIn */
--dur-fast: 150ms;  /* hover/press */
--dur-med:  300ms;  /* apparitions, toasts */
```

Nouveaux keyframes globaux : `slideUpIn` (translateY(14px) → 0 + fondu, 0.45 s), `popIn` (scale 0.96 + translateY(10px) → 1, easing spring), `shimmer` (balayage de dégradé pour skeletons).

Accessibilité — bloc global :

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  .stagger > * { opacity: 1; }
}
```

`CLAUDE.md` est mis à jour : la règle « animations au scroll uniquement » devient « animations via le lexique de `index.css` uniquement (variables `--ease-*`/`--dur-*`, keyframes globaux) ; `.reveal` reste réservé au scroll ».

## 2. Hover / press (CSS pur)

- **Icônes sidebar** (`Layout.jsx`) : au survol d'un item, l'icône seule passe à `scale(1.12)` avec `--ease-spring` (`--dur-med`) ; le label ne bouge pas. Le fond `--bg-subtle` apparaît en `--dur-fast`.
- **Boutons** (classes `.btn` existantes) : survol → `translateY(-1px)` + `--shadow-md` ; appui (`:active`) → `scale(0.97)` + `--shadow-sm`. Transitions en `--dur-fast` / `--ease-out-quart`.
- **Cartes cliquables** : classe commune `.interactive` (survol → `translateY(-2px)` + `--shadow-md` + bordure `--border-hover` ; appui → `scale(0.99)`). Appliquée aux cartes effectivement cliquables : `ProjectCard`, `ToolCard`, `AccountCard`. Les `KpiCard` et cartes purement informatives ne reçoivent pas `.interactive` (pas de fausse affordance). Les effets hover ad hoc existants des cartes migrées sont remplacés par `.interactive` (harmonisation).

## 3. Cascade d'apparition (`.stagger`)

Classe CSS posée sur un conteneur de grille/liste : chaque enfant direct reçoit `slideUpIn` avec un délai incrémental par `nth-child` (pas de 60 ms, plafonné au 8ᵉ enfant — au-delà, délai constant). Remplace les classes manuelles `delay-1/2/3` existantes (qui sont supprimées après migration des usages).

Appliquée aux grilles principales : KPI du Dashboard, cartes de comptes (Investissements), cartes projet + outils (Immobilier), sections Conseil.

## 4. Chiffres animés — `useCountUp`

`webapp/src/utils/useCountUp.js`, testé Vitest.

```
useCountUp(value, { duration = 900, decimals = 0 }) → displayedValue (number)
```

- Anime de la valeur précédente vers la nouvelle via `requestAnimationFrame`, easing easeOutQuart.
- Première apparition : anime de 0 vers la valeur.
- Respecte `prefers-reduced-motion` (retourne la valeur cible directement).
- Pas de re-render superflu : interne à un `useState` mis à jour par rAF, annulation propre au démontage.

Branché dans `KpiCard` et les montants principaux du Dashboard (patrimoine total, valeurs par enveloppe). Le formatage reste celui de `utils/format.js` (le hook retourne un nombre, le composant formate).

## 5. Toasts — `ToastContext` + `<Toaster/>`

`webapp/src/context/ToastContext.jsx` (nouveau contexte autonome — **ne touche ni `PortfolioContext` ni `RealEstateContext`**).

- API : `const toast = useToast()` puis `toast.success('Actif ajouté')` / `toast.error('Échec de la sauvegarde')`.
- `<Toaster/>` monté une fois dans `Layout.jsx` : pile en bas à droite, glassmorphism (`--bg-overlay` + blur 8px + `--shadow-lg`), pastille verte (`--accent`) ou rouge (`--negative`), entrée `popIn`, sortie en fondu après 3,5 s, suppression du DOM après transition.
- Branchements (appels depuis les pages, pas depuis les contexts) : ajout/suppression d'actif et de compte (Investissements), sauvegarde/édition de projet immo (wizard), export/import de données (Réglages), erreurs de refresh des prix.

## 6. Skeletons — `<Skeleton/>`

`webapp/src/components/Skeleton.jsx` : rectangle `shimmer` paramétrable (`width`, `height`, `style`). Utilisé pendant `refreshPrices` (cartes d'actifs) et les chargements DVF (`RealEstate`, panneau parcelles de l'Explorer) en remplacement ou complément des spinners actuels.

## Contraintes

- Zéro dépendance ajoutée.
- `PortfolioContext.jsx` et `RealEstateContext.jsx` non modifiés.
- Toutes les couleurs via variables CSS de `index.css` (règle CLAUDE.md).
- Les valeurs validées en démo font foi : zoom icône 1.12, boutons -1px/0.97, cascade 60 ms/0.45 s, count-up 900 ms, toast 3,5 s.

## Tests & vérification

- `useCountUp` : tests Vitest (fake timers + mock rAF) — animation vers la cible, première apparition depuis 0, reduced-motion, annulation au démontage.
- `ToastContext` : test Vitest du reducer/file d'attente (ajout, expiration, suppression).
- CSS : vérification visuelle headless (gstack) sur Dashboard, Investissements, Immobilier — cascade visible, hover OK, toast apparaît après un ajout, skeleton pendant chargement, aucune erreur console.
- `npm run lint` + `npm run build` verts à chaque tâche.

## Hors périmètre (sous-projet B)

Palette de commandes Cmd+K, suggestions de recherche globale, polish des champs de recherche existants.
