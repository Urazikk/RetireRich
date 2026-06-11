# Socle micro-interactions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Doter RetireRich d'un langage d'animation cohérent : lexique CSS (easings/durées/keyframes), hover/press, cascade `.stagger`, count-up des montants, toasts, skeletons — CSS pur + petits hooks, zéro dépendance.

**Architecture:** Tout le vocabulaire vit dans `index.css` (variables `--ease-*`/`--dur-*`, keyframes `slideUpIn`/`popIn`/`shimmer`, classes `.interactive`/`.stagger`/`.skeleton`/`.toast*`). Deux modules React testés : `utils/useCountUp.js` (rAF) et `utils/toastReducer.js` (pur) consommé par `context/ToastContext.jsx` + `context/useToast.js`. Branchements ciblés dans les composants existants.

**Tech Stack:** React 19, Vite 8, Vitest (`npm test`), ESLint. Valeurs validées en démo : zoom icône 1.12, boutons -1px/0.97, cascade 60 ms / 0.45 s, count-up 900 ms, toast 3,5 s.

**Spec :** `docs/superpowers/specs/2026-06-11-micro-interactions-design.md`

---

## Référence (existant)

`index.css` : `:root` lignes 3-37 (variables), `.btn*` lignes 125-162, `.nav-item` lignes 196-219, bloc animations lignes ~355-380 (`fadeIn`, `.animate-fade-in`, `.delay-1/2/3` **inutilisés**, `spin`, `.reveal`). `Layout.jsx` : nav `NAV_ITEMS.map` avec `<Icon size={18}/>`. `KpiCard.jsx` : reçoit `value` déjà formaté (string). Dashboard : 4 `KpiCard` lignes 226-244 dans `.dashboard-grid`. `ToolCard`/`ProjectCard`/`AccountCard` : racine `className="glass-panel"`. `AccountCard.jsx` : `addAsset` ligne ~41, suppression compte ligne ~122, suppression position ligne ~217, cellule prix actuel ligne ~211. `Investments.jsx` : `addAccount` ligne ~73, `refreshing` state, `<AccountCard ...>` ligne 226. `Settings.jsx` : `handleExport`/`handleImportFile`. `RealEstate.jsx` : `loading` state, `</form>` suivi de `</div>` ligne ~199-200. `MarketExplorer.jsx` : « Chargement des ventes… » ligne ~661.

---

## Task 1 : Lexique CSS + règle CLAUDE.md

**Files:** Modify `webapp/src/index.css`, `CLAUDE.md`

- [ ] **Step 1 — Variables.** Dans `:root` de `index.css`, après la ligne `--transition:    all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);`, ajouter :
```css

  /* ── Lexique animation (spec 2026-06-11) ─────────────────────── */
  --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
  --ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1);
  --dur-fast: 150ms;
  --dur-med:  300ms;
```

- [ ] **Step 2 — Keyframes + classes globales.** Remplacer le bloc existant :
```css
@keyframes fadeIn {
```
…jusqu'à la fin de `.delay-3 { animation-delay: 0.24s; }` (garder `spin` et `.reveal` intacts) par :
```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }

@keyframes slideUpIn {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes popIn {
  from { opacity: 0; transform: translateY(10px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes shimmer {
  from { background-position: 200% 0; }
  to   { background-position: -200% 0; }
}

/* Cascade d'apparition : enfants directs en slideUpIn décalé (pas 60 ms, plafond 8). */
.stagger > * { opacity: 0; animation: slideUpIn 0.45s var(--ease-out-quart) forwards; }
.stagger > *:nth-child(1) { animation-delay: 0s; }
.stagger > *:nth-child(2) { animation-delay: 0.06s; }
.stagger > *:nth-child(3) { animation-delay: 0.12s; }
.stagger > *:nth-child(4) { animation-delay: 0.18s; }
.stagger > *:nth-child(5) { animation-delay: 0.24s; }
.stagger > *:nth-child(6) { animation-delay: 0.3s; }
.stagger > *:nth-child(7) { animation-delay: 0.36s; }
.stagger > *:nth-child(n + 8) { animation-delay: 0.42s; }

/* Carte cliquable : élévation au survol, appui au clic. */
.interactive {
  cursor: pointer;
  transition: transform var(--dur-med) var(--ease-out-quart), box-shadow var(--dur-med) var(--ease-out-quart), border-color var(--dur-med) var(--ease-out-quart);
}
.interactive:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--border-hover); }
.interactive:active { transform: translateY(0) scale(0.99); }

/* Skeleton de chargement. */
.skeleton {
  border-radius: var(--radius-sm);
  background: linear-gradient(90deg, var(--bg-subtle) 25%, rgba(0, 0, 0, 0.07) 50%, var(--bg-subtle) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}

/* Toasts. */
.toaster {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 1000;
}
.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 260px;
  max-width: 380px;
  background: var(--bg-overlay);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  font-size: 0.92rem;
  font-weight: 600;
  animation: popIn var(--dur-med) var(--ease-spring) forwards;
}
.toast.leaving { transition: opacity 0.3s ease, transform 0.3s ease; opacity: 0; transform: translateY(6px); }
.toast-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.toast-dot.ok { background: var(--accent); }
.toast-dot.err { background: var(--negative); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  .stagger > * { opacity: 1; }
}
```

- [ ] **Step 3 — Hover icônes sidebar + press boutons.** Dans `index.css` :

**(a)** Après le bloc `.nav-item.active { ... }`, ajouter :
```css
.nav-item svg { transition: transform var(--dur-med) var(--ease-spring); flex-shrink: 0; }
.nav-item:hover svg { transform: scale(1.12); }
```

**(b)** Après le bloc `.btn-secondary:hover { ... }`, ajouter :
```css
.btn:active:not(:disabled) { transform: scale(0.97); box-shadow: var(--shadow-sm); }
.btn-secondary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: var(--shadow-md); }
```

- [ ] **Step 4 — CLAUDE.md.** Dans la section `### Animations` de `CLAUDE.md`, remplacer la ligne :
```
**Au scroll uniquement** via `IntersectionObserver` :
```
par :
```
Via le lexique de `index.css` uniquement : variables `--ease-out-quart`/`--ease-spring`/`--dur-fast`/`--dur-med`, keyframes globaux (`slideUpIn`, `popIn`, `shimmer`), classes `.stagger` (cascade), `.interactive` (cartes cliquables), `.skeleton`, `.toast`. `prefers-reduced-motion` est respecté globalement. `.reveal` reste réservé aux animations au scroll via `IntersectionObserver` :
```

- [ ] **Step 5 — Vérifier.** `cd webapp && npm run lint && npm run build` → 0 erreur.

- [ ] **Step 6 — Commit.**
```bash
cd /Users/simon/Desktop/Projet/RetireRich
git add webapp/src/index.css CLAUDE.md
git commit -m "feat(ux): lexique animation CSS (easings, stagger, interactive, skeleton, toast)"
```

---

## Task 2 : `.interactive` sur les cartes

**Files:** Modify `webapp/src/components/ToolCard.jsx`, `webapp/src/components/ProjectCard.jsx`, `webapp/src/components/AccountCard.jsx`

- [ ] **Step 1 — ToolCard.** Remplacer `className="glass-panel"` par `className="glass-panel interactive"` dans `ToolCard.jsx`.

- [ ] **Step 2 — ProjectCard.** Dans `ProjectCard.jsx`, remplacer :
```jsx
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
```
par :
```jsx
    <div className="glass-panel interactive" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
```

- [ ] **Step 3 — AccountCard.** Dans `AccountCard.jsx`, remplacer :
```jsx
    <div className="glass-panel" style={{ marginBottom: 12 }}>
```
par :
```jsx
    <div className="glass-panel interactive" style={{ marginBottom: 12 }}>
```

- [ ] **Step 4 — Vérifier + commit.** `cd webapp && npm run lint && npm run build` → OK, puis :
```bash
cd /Users/simon/Desktop/Projet/RetireRich
git add webapp/src/components/ToolCard.jsx webapp/src/components/ProjectCard.jsx webapp/src/components/AccountCard.jsx
git commit -m "feat(ux): classe .interactive sur les cartes ToolCard/ProjectCard/AccountCard"
```

---

## Task 3 : Cascade `.stagger` sur les grilles principales

**Files:** Modify `webapp/src/pages/Dashboard.jsx`, `webapp/src/pages/investments/Investments.jsx`, `webapp/src/pages/real-estate/RealEstate.jsx`

- [ ] **Step 1 — Dashboard.** Remplacer `<div className="dashboard-grid">` par `<div className="dashboard-grid stagger">` (la grille des KPI + panneaux, ligne ~224 — une seule occurrence dans ce fichier).

- [ ] **Step 2 — Investissements.** Dans `Investments.jsx`, trouver le conteneur qui enveloppe `filteredAccounts.map((acc) => (` (ligne ~225). Ajouter `stagger` à la className du parent direct des `<AccountCard>`. Si le parent direct est un fragment ou n'a pas de className, envelopper les cartes :
```jsx
              <div className="stagger">
                {filteredAccounts.map((acc) => (
                  <AccountCard key={acc.id} account={acc} assets={assets} search={search} sortKey={sortKey} />
                ))}
              </div>
```

- [ ] **Step 3 — Immobilier.** Dans `RealEstate.jsx` :
**(a)** ligne ~108 (état vide, outils centrés) : `style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}` → ajouter `className="stagger"` sur ce div.
**(b)** ligne ~114 : `<div className="dashboard-grid">` (synthèse) → `<div className="dashboard-grid stagger">`.
**(c)** ligne ~121 (outils) : div `style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}` → ajouter `className="stagger"`.

- [ ] **Step 4 — Vérif visuelle rapide.** Dev server lancé (`npm run dev`), ouvrir http://localhost:5173/ : les 4 KPI et panneaux arrivent en cascade. `/investments` et `/real-estate` pareil.

- [ ] **Step 5 — Lint + commit.**
```bash
cd /Users/simon/Desktop/Projet/RetireRich/webapp && npm run lint && npm run build
cd /Users/simon/Desktop/Projet/RetireRich
git add webapp/src/pages/Dashboard.jsx webapp/src/pages/investments/Investments.jsx webapp/src/pages/real-estate/RealEstate.jsx
git commit -m "feat(ux): cascade .stagger sur Dashboard, Investissements, Immobilier"
```

---

## Task 4 : `useCountUp` (TDD) + montants animés

**Files:** Create `webapp/src/utils/useCountUp.js`, `webapp/src/utils/useCountUp.test.js` · Modify `webapp/src/components/KpiCard.jsx`, `webapp/src/pages/Dashboard.jsx`

- [ ] **Step 1 — Test qui échoue.** Create `webapp/src/utils/useCountUp.test.js` :
```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountUp } from './useCountUp.js';

// rAF contrôlé : chaque flush() avance d'un frame de 100 ms.
let now = 0;
let cbs = [];
const flush = (ms = 100) => {
  now += ms;
  const pending = cbs;
  cbs = [];
  act(() => pending.forEach((cb) => cb(now)));
};

beforeEach(() => {
  now = 0;
  cbs = [];
  vi.stubGlobal('requestAnimationFrame', (cb) => { cbs.push(cb); return cbs.length; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('performance', { now: () => now });
});
afterEach(() => vi.unstubAllGlobals());

describe('useCountUp', () => {
  it('démarre à 0 et atteint la cible à la fin de la durée', () => {
    const { result } = renderHook(() => useCountUp(1000, { duration: 300 }));
    expect(result.current).toBe(0);
    flush(); // 100 ms
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(1000);
    flush(); flush(); // 300 ms atteints
    expect(result.current).toBe(1000);
  });
  it('anime de l’ancienne valeur vers la nouvelle', () => {
    const { result, rerender } = renderHook(({ v }) => useCountUp(v, { duration: 300 }), {
      initialProps: { v: 100 },
    });
    flush(); flush(); flush();
    expect(result.current).toBe(100);
    rerender({ v: 200 });
    flush();
    expect(result.current).toBeGreaterThan(100);
    expect(result.current).toBeLessThan(200);
    flush(); flush();
    expect(result.current).toBe(200);
  });
  it('saute directement à la cible si prefers-reduced-motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const { result } = renderHook(() => useCountUp(500, { duration: 300 }));
    expect(result.current).toBe(500);
  });
});
```

- [ ] **Step 2 — Vérifier l'infra de test.** `cd webapp && npm test` → si `@testing-library/react` n'est pas installé, l'installer en dev :
```bash
npm install -D @testing-library/react
```
(Vérifier aussi que `vitest.config.js` a `environment: 'jsdom'` ; sinon installer `jsdom` en dev et configurer `test: { environment: 'jsdom' }`.) Relancer `npm test` → FAIL avec « useCountUp is not defined / cannot resolve ».

- [ ] **Step 3 — Implémentation.** Create `webapp/src/utils/useCountUp.js` :
```js
import { useEffect, useRef, useState } from 'react';

const easeOutQuart = (p) => 1 - Math.pow(1 - p, 4);

const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Anime un nombre vers `target` via requestAnimationFrame (easing out).
// Première apparition : depuis 0. Changement : depuis la valeur courante.
export const useCountUp = (target, { duration = 900 } = {}) => {
  const [displayed, setDisplayed] = useState(() => (prefersReducedMotion() ? target : 0));
  const fromRef = useRef(prefersReducedMotion() ? target : 0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!Number.isFinite(target)) return undefined;
    if (prefersReducedMotion()) {
      fromRef.current = target;
      setDisplayed(target);
      return undefined;
    }
    const from = fromRef.current;
    if (from === target) return undefined;
    const start = performance.now();
    const tick = (nowTs) => {
      const p = Math.min(1, (nowTs - start) / duration);
      const value = from + (target - from) * easeOutQuart(p);
      setDisplayed(p === 1 ? target : value);
      fromRef.current = p === 1 ? target : value;
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return displayed;
};
```

- [ ] **Step 4 — `npm test` → PASS** (tous les tests, pas seulement les nouveaux).

- [ ] **Step 5 — KpiCard animé.** Remplacer le contenu de `webapp/src/components/KpiCard.jsx` par :
```jsx
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useCountUp } from '../utils/useCountUp.js';

// `value` peut être une string déjà formatée (statique) ou un nombre.
// Si `value` est un nombre, il est animé en count-up et rendu via `format`.
const KpiCard = ({ label, value, format, trend, trendLabel }) => {
  const isNumeric = typeof value === 'number' && Number.isFinite(value);
  const animated = useCountUp(isNumeric ? value : 0);
  const display = isNumeric ? (format ? format(animated) : Math.round(animated)) : value;
  const trendNum = Number(trend);
  const positive = trendNum >= 0;
  return (
    <div className="glass-panel kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{display}</div>
      {trend !== undefined && trend !== null && !Number.isNaN(trendNum) && (
        <div className={positive ? 'trend-positive' : 'trend-negative'}>
          {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <span>{trendLabel ?? `${positive ? '+' : ''}${trendNum.toFixed(2)} %`}</span>
        </div>
      )}
    </div>
  );
};

export default KpiCard;
```

- [ ] **Step 6 — Dashboard passe des nombres.** Dans `Dashboard.jsx` lignes ~226-244, remplacer les 4 KpiCard :
```jsx
          <KpiCard
            label="Patrimoine total"
            value={formatEUR(totals.patrimoine + realEstateValue)}
            trend={totals.pnlPct}
          />
```
→
```jsx
          <KpiCard
            label="Patrimoine total"
            value={totals.patrimoine + realEstateValue}
            format={formatEUR}
            trend={totals.pnlPct}
          />
```
```jsx
          <KpiCard
            label="Investissements marché"
            value={formatEUR(totals.totalCurrent)}
            trend={totals.pnlPct}
            trendLabel={`${formatPercent(totals.pnlPct)} (${formatEUR(totals.pnl)})`}
          />
```
→
```jsx
          <KpiCard
            label="Investissements marché"
            value={totals.totalCurrent}
            format={formatEUR}
            trend={totals.pnlPct}
            trendLabel={`${formatPercent(totals.pnlPct)} (${formatEUR(totals.pnl)})`}
          />
```
```jsx
          <KpiCard label="Épargne (livrets)" value={formatEUR(totals.cashTotal)} />
```
→
```jsx
          <KpiCard label="Épargne (livrets)" value={totals.cashTotal} format={formatEUR} />
```
```jsx
          <KpiCard label="Immobilier" value={formatEUR(realEstateValue)} />
```
→
```jsx
          <KpiCard label="Immobilier" value={realEstateValue} format={formatEUR} />
```
Les autres usages de `KpiCard` (CashCalendar, RealEstate, etc.) passent des strings et restent statiques — aucun changement.

- [ ] **Step 7 — Vérifier.** `npm test && npm run lint && npm run build` → OK. Sur http://localhost:5173/, les 4 montants montent en compteur (~0,9 s).

- [ ] **Step 8 — Commit.**
```bash
cd /Users/simon/Desktop/Projet/RetireRich
git add webapp/src/utils/useCountUp.js webapp/src/utils/useCountUp.test.js webapp/src/components/KpiCard.jsx webapp/src/pages/Dashboard.jsx webapp/package.json webapp/package-lock.json webapp/vitest.config.js
git commit -m "feat(ux): useCountUp (rAF, TDD) + montants animés du Dashboard"
```

---

## Task 5 : Toasts — reducer (TDD) + contexte + branchements

**Files:** Create `webapp/src/utils/toastReducer.js`, `webapp/src/utils/toastReducer.test.js`, `webapp/src/context/ToastContext.jsx`, `webapp/src/context/useToast.js` · Modify `webapp/src/components/Layout.jsx`, `webapp/src/components/AccountCard.jsx`, `webapp/src/pages/investments/Investments.jsx`, `webapp/src/pages/settings/Settings.jsx`

- [ ] **Step 1 — Test qui échoue.** Create `webapp/src/utils/toastReducer.test.js` :
```js
import { describe, it, expect } from 'vitest';
import { toastReducer, addToast, startLeaving, removeToast } from './toastReducer.js';

describe('toastReducer', () => {
  it('ajoute un toast avec id, message et kind', () => {
    const s1 = toastReducer([], addToast('Actif ajouté', 'ok'));
    expect(s1).toHaveLength(1);
    expect(s1[0]).toMatchObject({ message: 'Actif ajouté', kind: 'ok', leaving: false });
    expect(s1[0].id).toBeTruthy();
  });
  it('génère des ids uniques', () => {
    let s = toastReducer([], addToast('a', 'ok'));
    s = toastReducer(s, addToast('b', 'err'));
    expect(s[0].id).not.toBe(s[1].id);
  });
  it('marque un toast comme sortant puis le supprime', () => {
    let s = toastReducer([], addToast('a', 'ok'));
    const id = s[0].id;
    s = toastReducer(s, startLeaving(id));
    expect(s[0].leaving).toBe(true);
    s = toastReducer(s, removeToast(id));
    expect(s).toHaveLength(0);
  });
});
```

- [ ] **Step 2 — `npm test` → FAIL** (module non résolu).

- [ ] **Step 3 — Implémentation.** Create `webapp/src/utils/toastReducer.js` :
```js
// Reducer pur de la pile de toasts. kind: 'ok' | 'err'.
let nextId = 0;

export const addToast = (message, kind = 'ok') => ({ type: 'add', message, kind });
export const startLeaving = (id) => ({ type: 'leaving', id });
export const removeToast = (id) => ({ type: 'remove', id });

export const toastReducer = (state, action) => {
  switch (action.type) {
    case 'add':
      nextId += 1;
      return [...state, { id: nextId, message: action.message, kind: action.kind, leaving: false }];
    case 'leaving':
      return state.map((t) => (t.id === action.id ? { ...t, leaving: true } : t));
    case 'remove':
      return state.filter((t) => t.id !== action.id);
    default:
      return state;
  }
};
```

- [ ] **Step 4 — `npm test` → PASS.**

- [ ] **Step 5 — Contexte + Toaster.** Create `webapp/src/context/ToastContext.jsx` :
```jsx
import { createContext, useEffect, useMemo, useReducer } from 'react';
import { toastReducer, addToast, startLeaving, removeToast } from '../utils/toastReducer.js';

export const ToastContext = createContext(null);

const DISPLAY_MS = 3500;
const LEAVE_MS = 350;

// Timer one-shot attaché à la vie du composant (volontairement sans deps :
// chaque toast est monté une seule fois avec son message figé).
const useTimeout = (fn, ms) => {
  useEffect(() => {
    const id = setTimeout(fn, ms);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

const Toast = ({ toast: t, dispatch }) => {
  useTimeout(() => dispatch(startLeaving(t.id)), DISPLAY_MS);
  useTimeout(() => dispatch(removeToast(t.id)), DISPLAY_MS + LEAVE_MS);
  return (
    <div className={`toast${t.leaving ? ' leaving' : ''}`}>
      <span className={`toast-dot ${t.kind}`} />
      {t.message}
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  const toast = useMemo(
    () => ({
      success: (message) => dispatch(addToast(message, 'ok')),
      error: (message) => dispatch(addToast(message, 'err')),
    }),
    [],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toaster">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} dispatch={dispatch} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
```
> Note d'implémentation : si la règle `react-refresh/only-export-components` se plaint des exports mixtes (contexte + composants), suivre le pattern existant du projet (`usePortfolio.js` séparé) — le hook est déjà séparé dans `useToast.js` ; au besoin ajouter le commentaire de désactivation utilisé ailleurs dans le projet.

Create `webapp/src/context/useToast.js` :
```js
import { useContext } from 'react';
import { ToastContext } from './ToastContext.jsx';

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
```

- [ ] **Step 6 — Monter dans Layout.** Dans `Layout.jsx`, ajouter l'import :
```jsx
import { ToastProvider } from '../context/ToastContext.jsx';
```
et envelopper le rendu :
```jsx
const Layout = () => (
  <ToastProvider>
    <div className="app-container">
      ...(inchangé)...
    </div>
  </ToastProvider>
);
```

- [ ] **Step 7 — Branchements.**

**(a) `AccountCard.jsx`** — import + hook :
```jsx
import { useToast } from '../context/useToast.js';
```
dans le composant : `const toast = useToast();`
- après `addAsset({ ... }); setAssetForm(emptyAsset); setAdding(false);` → ajouter `toast.success('Position ajoutée');`
- suppression de compte (ligne ~122) : `if (window.confirm(...)) removeAccount(account.id);` → `if (window.confirm(...)) { removeAccount(account.id); toast.success('Compte supprimé'); }`
- suppression de position (ligne ~217) : idem → `{ removeAsset(a.id); toast.success('Position supprimée'); }`

**(b) `Investments.jsx`** — import `useToast`, `const toast = useToast();`
- après `addAccount(account);` (ligne ~73) → `toast.success('Compte ajouté');`
- à la fin de `refreshPrices` (après la boucle, où `failed` est connu) :
```jsx
    if (failed.length > 0) toast.error(`${failed.length} prix non récupéré${failed.length > 1 ? 's' : ''}`);
    else toast.success('Prix mis à jour');
```

**(c) `Settings.jsx`** — import `useToast`, `const toast = useToast();`
- fin de `handleExport` (après `URL.revokeObjectURL(url);`) → `toast.success('Sauvegarde exportée');`
- dans le `catch` de `handleImportFile` (après `setError(err.message);`) → `toast.error('Import échoué');`

- [ ] **Step 8 — Vérifier.** `npm test && npm run lint && npm run build` → OK. Sur http://localhost:5173/investments : ajouter un compte → toast vert en bas à droite, disparaît après ~3,5 s.

- [ ] **Step 9 — Commit.**
```bash
cd /Users/simon/Desktop/Projet/RetireRich
git add webapp/src/utils/toastReducer.js webapp/src/utils/toastReducer.test.js webapp/src/context/ToastContext.jsx webapp/src/context/useToast.js webapp/src/components/Layout.jsx webapp/src/components/AccountCard.jsx webapp/src/pages/investments/Investments.jsx webapp/src/pages/settings/Settings.jsx
git commit -m "feat(ux): système de toasts (reducer TDD, ToastContext, branchements actions)"
```

---

## Task 6 : Skeletons de chargement

**Files:** Create `webapp/src/components/Skeleton.jsx` · Modify `webapp/src/pages/real-estate/RealEstate.jsx`, `webapp/src/pages/real-estate/MarketExplorer.jsx`, `webapp/src/components/AccountCard.jsx`, `webapp/src/pages/investments/Investments.jsx`

- [ ] **Step 1 — Composant.** Create `webapp/src/components/Skeleton.jsx` :
```jsx
// Rectangle de chargement shimmer. width/height : nombre (px) ou string CSS.
const Skeleton = ({ width = '100%', height = 16, style }) => (
  <div className="skeleton" style={{ width, height, ...style }} aria-hidden="true" />
);

export default Skeleton;
```

- [ ] **Step 2 — Résultats DVF (`RealEstate.jsx`).** Import :
```jsx
import Skeleton from '../../components/Skeleton.jsx';
```
Après le `</div>` qui suit `</form>` (fermeture du panneau de recherche, ligne ~200), insérer :
```jsx
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
```

- [ ] **Step 3 — Panneau parcelles (`MarketExplorer.jsx`).** Import :
```jsx
import Skeleton from '../../components/Skeleton.jsx';
```
Remplacer le bloc de chargement (ligne ~659-663) :
```jsx
          {parcelLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
              <Loader2 size={16} className="animate-spin" /> Chargement des ventes…
            </div>
          )}
```
par :
```jsx
          {parcelLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
                <Loader2 size={16} className="animate-spin" /> Chargement des ventes…
              </div>
              <Skeleton height={480} style={{ borderRadius: 'var(--radius-md)' }} />
            </div>
          )}
```

- [ ] **Step 4 — Prix en cours de refresh (`AccountCard.jsx` + `Investments.jsx`).**
Dans `Investments.jsx` ligne ~226, passer la prop :
```jsx
                <AccountCard key={acc.id} account={acc} assets={assets} search={search} sortKey={sortKey} refreshing={refreshing} />
```
Dans `AccountCard.jsx` : ajouter `refreshing` aux props du composant, importer Skeleton :
```jsx
import Skeleton from './Skeleton.jsx';
```
et remplacer la cellule prix actuel (ligne ~211) :
```jsx
                        <td style={{ textAlign: 'right' }}>{formatEUR(a.currentPrice || a.purchasePrice)}</td>
```
par :
```jsx
                        <td style={{ textAlign: 'right' }}>
                          {refreshing && a.yahoo_ticker
                            ? <Skeleton width={64} height={14} style={{ marginLeft: 'auto' }} />
                            : formatEUR(a.currentPrice || a.purchasePrice)}
                        </td>
```

- [ ] **Step 5 — Vérifier.** `npm test && npm run lint && npm run build` → OK. http://localhost:5173/real-estate : lancer une recherche → 4 cartes skeleton pendant le chargement. `/investments` : « Rafraîchir les prix » → les prix des actifs avec ticker passent en shimmer.

- [ ] **Step 6 — Commit.**
```bash
cd /Users/simon/Desktop/Projet/RetireRich
git add webapp/src/components/Skeleton.jsx webapp/src/pages/real-estate/RealEstate.jsx webapp/src/pages/real-estate/MarketExplorer.jsx webapp/src/components/AccountCard.jsx webapp/src/pages/investments/Investments.jsx
git commit -m "feat(ux): skeletons de chargement (DVF, panneau parcelles, refresh des prix)"
```

---

## Task 7 : Vérification finale

- [ ] **Step 1 — Suite complète.** `cd webapp && npm test && npm run lint && npm run build` → tests verts, lint 0, build OK.

- [ ] **Step 2 — Vérif visuelle headless (gstack browse).** Sur http://localhost:5173 :
  - `/` : cascade des KPI visible + montants en count-up, hover sidebar (icône zoome), aucune erreur console
  - `/investments` : ajout d'un compte → toast vert ; hover des cartes → élévation
  - `/real-estate` : recherche DVF → skeletons puis résultats
  - Screenshot de chaque page pour trace.

- [ ] **Step 3 — Commit final éventuel** (si des correctifs sont sortis de la vérif) :
```bash
cd /Users/simon/Desktop/Projet/RetireRich
git add -A && git commit -m "fix(ux): correctifs issus de la vérification visuelle"
```

---

## Récap de couverture (spec → tâches)

| Élément spec | Tâche |
|---|---|
| Variables easing/durée + keyframes + reduced-motion | 1 |
| Règle CLAUDE.md mise à jour | 1 |
| Hover icônes sidebar + press boutons | 1 (CSS pur) |
| `.interactive` sur cartes cliquables | 1 (CSS) + 2 (application) |
| `.stagger` + suppression `delay-1/2/3` | 1 (CSS) + 3 (application) |
| `useCountUp` testé + KpiCard/Dashboard | 4 |
| `ToastContext` + `<Toaster/>` + branchements | 5 |
| `<Skeleton/>` + intégrations | 6 |
| Contexts Portfolio/RealEstate non modifiés | toutes |
| Vérification gstack + lint/build | 7 |
