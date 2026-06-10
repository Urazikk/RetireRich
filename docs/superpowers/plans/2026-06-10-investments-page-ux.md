# Refonte ergonomique de « Mes Investissements » — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer la page `/investments` (tableaux plats + modales) en une disposition hybride (bandeau de synthèse + cartes par compte repliables) avec 8 touches ergonomiques, sans modifier `PortfolioContext.jsx`.

**Architecture:** La logique de calcul (valeur compte, perf, répartition, plafond, tri/recherche) est extraite dans un module pur `utils/investmentMetrics.js`, testé en TDD avec Vitest. Deux nouveaux composants de présentation (`AllocationBar.jsx`, `AccountCard.jsx`) consomment ces fonctions. `Investments.jsx` orchestre (en-tête + refresh prix, bandeau, onglets, recherche/tri, liste de cartes, état vide, ajout en ligne).

**Tech Stack:** React 19, Vite 8, Recharts (déjà là, non requis ici), Lucide-React, Vitest (nouveau, pour la logique pure). État global inchangé via `usePortfolio`.

---

## Référence — formes de données (existant)

```js
// account : { id, type, name, broker|null, balance?, rate?, fees?, createdAt }
//   type ∈ ACCOUNT_TYPES (PEA, CTO, 'Assurance Vie', 'Livret A', LDDS, LEP, 'Livret Jeune', Crypto, Immobilier, Autre)
// asset   : { id, accountId, name, yahoo_ticker|null, quantity, purchasePrice, currentPrice, purchaseDate, createdAt }
```

Helpers existants réutilisés : `getAccountTypeDef(typeId)` → `{ id, label, type, color, maxAmount?, defaultRate? }`,
`FEE_TYPES`, `BROKER_PRESETS` (`utils/accountTypes.js`) ; `fetchQuote(ticker)` → `number|null` (`utils/yahooApi.js`) ;
`formatEUR`, `formatPercent` (`utils/format.js`) ; composants `BrokerLogo`, `BrokerPicker`, `AssetAutocomplete`, `KpiCard`, `EnvelopeBadge`.
Actions de `usePortfolio()` : `accounts, assets, totals, addAccount, updateAccount, removeAccount, addAsset, updateAsset, removeAsset`.

---

## Task 1 : Mise en place de Vitest

**Files:**
- Modify: `webapp/package.json`
- Create: `webapp/vitest.config.js`

- [ ] **Step 1 : Installer Vitest**

Run:
```bash
cd ~/Desktop/Projet/RetireRich/webapp && npm install -D vitest
```
Expected: `added N packages`, aucun vuln. (Dernière version compatible avec Vite 8 ; ne pas épingler de majeure.)

- [ ] **Step 2 : Ajouter le script de test**

Dans `webapp/package.json`, ajouter à `"scripts"` (après `"lint"`):
```json
    "test": "vitest run",
    "test:watch": "vitest",
```

- [ ] **Step 3 : Créer la config Vitest**

Create `webapp/vitest.config.js`:
```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
```

- [ ] **Step 4 : Vérifier que le runner démarre (aucun test encore)**

Run: `cd ~/Desktop/Projet/RetireRich/webapp && npm test`
Expected: sortie Vitest « No test files found » (exit 0) ou équivalent — le runner fonctionne.

- [ ] **Step 5 : Commit**

```bash
cd ~/Desktop/Projet/RetireRich
git add webapp/package.json webapp/package-lock.json webapp/vitest.config.js
git commit -m "chore: ajout de Vitest pour la logique pure"
```

---

## Task 2 : Module de calcul pur `investmentMetrics.js` (TDD)

**Files:**
- Create: `webapp/src/utils/investmentMetrics.js`
- Test: `webapp/src/utils/investmentMetrics.test.js`

- [ ] **Step 1 : Écrire les tests qui échouent**

Create `webapp/src/utils/investmentMetrics.test.js`:
```js
import { describe, it, expect } from 'vitest';
import {
  accountValue,
  accountPerformance,
  computeAllocation,
  computePlafond,
  sortPositions,
  matchesSearch,
} from './investmentMetrics.js';

const assets = [
  { id: 'a1', accountId: 'pea', name: 'CW8', quantity: 10, purchasePrice: 100, currentPrice: 120 },
  { id: 'a2', accountId: 'pea', name: 'RUS', quantity: 5, purchasePrice: 50, currentPrice: 40 },
  { id: 'a3', accountId: 'cto', name: 'AAPL', quantity: 2, purchasePrice: 100, currentPrice: 100 },
];
const pea = { id: 'pea', type: 'PEA', name: 'Bourso PEA' };
const cto = { id: 'cto', type: 'CTO', name: 'TR' };
const livretA = { id: 'la', type: 'Livret A', name: 'Livret A', balance: 18500 };

describe('accountValue', () => {
  it('somme positions (currentPrice) + balance', () => {
    expect(accountValue(pea, assets)).toBe(10 * 120 + 5 * 40); // 1400
    expect(accountValue(livretA, assets)).toBe(18500);
  });
  it('retombe sur purchasePrice si currentPrice manquant', () => {
    expect(accountValue({ id: 'x', type: 'CTO' }, [
      { accountId: 'x', quantity: 3, purchasePrice: 10 },
    ])).toBe(30);
  });
});

describe('accountPerformance', () => {
  it('calcule pnl et pnlPct sur les positions', () => {
    const r = accountPerformance(pea, assets);
    expect(r.invested).toBe(10 * 100 + 5 * 50); // 1250
    expect(r.current).toBe(1400);
    expect(r.pnl).toBe(150);
    expect(r.pnlPct).toBeCloseTo(12, 5);
  });
  it('pnlPct = 0 si rien investi', () => {
    expect(accountPerformance(livretA, assets).pnlPct).toBe(0);
  });
});

describe('computeAllocation', () => {
  it('répartit par enveloppe, trié décroissant, avec pct et couleur', () => {
    const r = computeAllocation([pea, cto, livretA], assets);
    // PEA=1400, Livret A=18500, CTO=200 ; total=20100
    expect(r[0].type).toBe('Livret A');
    expect(r.map((x) => x.type)).toEqual(['Livret A', 'PEA', 'CTO']);
    const total = 1400 + 200 + 18500;
    expect(r.find((x) => x.type === 'PEA').pct).toBeCloseTo((1400 / total) * 100, 5);
    expect(r[0].color).toBeTypeOf('string');
  });
  it('ignore les comptes à valeur nulle', () => {
    expect(computeAllocation([{ id: 'z', type: 'CTO' }], [])).toEqual([]);
  });
});

describe('computePlafond', () => {
  it('retourne la progression pour un livret', () => {
    const r = computePlafond(livretA);
    expect(r.max).toBe(22950);
    expect(r.used).toBe(18500);
    expect(r.remaining).toBe(22950 - 18500);
    expect(r.pct).toBeCloseTo((18500 / 22950) * 100, 5);
    expect(r.over).toBe(false);
  });
  it('signale le dépassement', () => {
    const r = computePlafond({ type: 'LDDS', balance: 15000 }); // max 12000
    expect(r.over).toBe(true);
    expect(r.pct).toBe(100);
    expect(r.remaining).toBe(0);
  });
  it('retourne null pour un compte non-livret', () => {
    expect(computePlafond(pea)).toBeNull();
  });
});

describe('sortPositions', () => {
  it('trie par valeur décroissante', () => {
    const r = sortPositions(assets, 'value');
    expect(r[0].id).toBe('a1'); // 1200
  });
  it('trie par performance décroissante', () => {
    const r = sortPositions(assets, 'perf');
    expect(r[0].id).toBe('a1'); // +20%
    expect(r[r.length - 1].id).toBe('a2'); // -20%
  });
  it('ne mute pas le tableau source', () => {
    const src = [...assets];
    sortPositions(src, 'value');
    expect(src).toEqual(assets);
  });
});

describe('matchesSearch', () => {
  it('insensible à la casse et aux espaces', () => {
    expect(matchesSearch('Boursorama PEA', '  bourso ')).toBe(true);
    expect(matchesSearch('CW8', 'aapl')).toBe(false);
  });
  it('vrai si requête vide', () => {
    expect(matchesSearch('quoi que ce soit', '')).toBe(true);
  });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier l'échec**

Run: `cd ~/Desktop/Projet/RetireRich/webapp && npm test`
Expected: FAIL — `Failed to resolve import "./investmentMetrics.js"`.

- [ ] **Step 3 : Écrire l'implémentation minimale**

Create `webapp/src/utils/investmentMetrics.js`:
```js
import { getAccountTypeDef } from './accountTypes.js';

const positionValue = (a) =>
  (Number(a.quantity) || 0) * (Number(a.currentPrice) || Number(a.purchasePrice) || 0);

const positionCost = (a) => (Number(a.quantity) || 0) * (Number(a.purchasePrice) || 0);

// Valeur courante d'un compte : positions (prix actuel) + solde cash.
export const accountValue = (account, assets) => {
  const positions = assets.filter((a) => a.accountId === account.id);
  const positionsValue = positions.reduce((s, a) => s + positionValue(a), 0);
  return positionsValue + (Number(account.balance) || 0);
};

// Performance d'un compte sur ses positions (hors solde cash).
export const accountPerformance = (account, assets) => {
  const positions = assets.filter((a) => a.accountId === account.id);
  const invested = positions.reduce((s, a) => s + positionCost(a), 0);
  const current = positions.reduce((s, a) => s + positionValue(a), 0);
  const pnl = current - invested;
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
  return { invested, current, pnl, pnlPct };
};

// Répartition par enveloppe : [{ type, value, pct, color }] triée décroissant, valeurs > 0.
export const computeAllocation = (accounts, assets) => {
  const byType = {};
  for (const acc of accounts) {
    const v = accountValue(acc, assets);
    if (v <= 0) continue;
    byType[acc.type] = (byType[acc.type] || 0) + v;
  }
  const total = Object.values(byType).reduce((s, v) => s + v, 0);
  return Object.entries(byType)
    .map(([type, value]) => ({
      type,
      value,
      pct: total > 0 ? (value / total) * 100 : 0,
      color: getAccountTypeDef(type).color,
    }))
    .sort((a, b) => b.value - a.value);
};

// Plafond d'un livret : null si non applicable, sinon { used, max, remaining, pct, over }.
export const computePlafond = (account) => {
  const def = getAccountTypeDef(account.type);
  if (def.type !== 'cash' || !def.maxAmount) return null;
  const used = Number(account.balance) || 0;
  const max = def.maxAmount;
  const remaining = Math.max(0, max - used);
  const pct = Math.min(100, (used / max) * 100);
  return { used, max, remaining, pct, over: used > max };
};

// Tri des positions sans muter la source. key ∈ 'value' | 'perf' | 'name'.
export const sortPositions = (positions, key) => {
  const perf = (a) => {
    const cost = positionCost(a);
    return cost > 0 ? (positionValue(a) - cost) / cost : 0;
  };
  const copy = [...positions];
  if (key === 'value') return copy.sort((a, b) => positionValue(b) - positionValue(a));
  if (key === 'perf') return copy.sort((a, b) => perf(b) - perf(a));
  if (key === 'name') return copy.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  return copy;
};

// Recherche insensible à la casse/espaces. Requête vide = match.
export const matchesSearch = (text, query) => {
  if (!query) return true;
  return (text || '').toLowerCase().includes(query.trim().toLowerCase());
};
```

- [ ] **Step 4 : Lancer les tests pour vérifier le succès**

Run: `cd ~/Desktop/Projet/RetireRich/webapp && npm test`
Expected: PASS — tous les tests verts.

- [ ] **Step 5 : Commit**

```bash
cd ~/Desktop/Projet/RetireRich
git add webapp/src/utils/investmentMetrics.js webapp/src/utils/investmentMetrics.test.js
git commit -m "feat: module pur investmentMetrics (valeur, perf, répartition, plafond, tri/recherche)"
```

---

## Task 3 : Composant `AllocationBar.jsx`

**Files:**
- Create: `webapp/src/components/AllocationBar.jsx`

- [ ] **Step 1 : Écrire le composant**

Create `webapp/src/components/AllocationBar.jsx`:
```jsx
import { computeAllocation } from '../utils/investmentMetrics.js';
import { formatPercent } from '../utils/format.js';

// Barre segmentée de répartition par enveloppe. Présentation pure.
const AllocationBar = ({ accounts, assets }) => {
  const segments = computeAllocation(accounts, assets);
  if (segments.length === 0) {
    return <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>—</span>;
  }
  return (
    <div>
      <div
        style={{
          display: 'flex',
          height: 8,
          borderRadius: 4,
          overflow: 'hidden',
          background: 'var(--bg-subtle)',
        }}
      >
        {segments.map((s) => (
          <div
            key={s.type}
            style={{ flexGrow: s.value, background: s.color }}
            title={`${s.type} · ${formatPercent(s.pct)}`}
          />
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          marginTop: 6,
          fontSize: '0.74rem',
          color: 'var(--text-muted)',
        }}
      >
        {segments.map((s) => (
          <span key={s.type} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: 'inline-block' }}
            />
            {s.type} {s.pct.toFixed(0)}%
          </span>
        ))}
      </div>
    </div>
  );
};

export default AllocationBar;
```

- [ ] **Step 2 : Vérifier lint + build**

Run: `cd ~/Desktop/Projet/RetireRich/webapp && npm run lint && npm run build`
Expected: 0 erreur lint, build OK.

- [ ] **Step 3 : Commit**

```bash
cd ~/Desktop/Projet/RetireRich
git add webapp/src/components/AllocationBar.jsx
git commit -m "feat: composant AllocationBar (répartition par enveloppe)"
```

---

## Task 4 : Composant `AccountCard.jsx`

Carte par compte : header (badge type, courtier, nom, perf, replier ②, supprimer), KPIs, barre de plafond ④ (livrets), liste des positions, ajout de position en ligne ⑤, édition rapide solde & frais ⑥.

**Files:**
- Create: `webapp/src/components/AccountCard.jsx`

- [ ] **Step 1 : Écrire le composant**

Create `webapp/src/components/AccountCard.jsx`:
```jsx
import { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2, Plus, Settings2 } from 'lucide-react';
import { usePortfolio } from '../context/usePortfolio.js';
import { getAccountTypeDef, FEE_TYPES } from '../utils/accountTypes.js';
import { accountValue, accountPerformance, computePlafond, sortPositions, matchesSearch } from '../utils/investmentMetrics.js';
import { formatEUR, formatPercent } from '../utils/format.js';
import { fetchQuote } from '../utils/yahooApi.js';
import BrokerLogo from './BrokerLogo.jsx';
import AssetAutocomplete from './AssetAutocomplete.jsx';

const CASH_TYPES = ['Livret A', 'LDDS', 'LEP', 'Livret Jeune'];
const emptyAsset = { name: '', yahoo_ticker: '', quantity: '', purchasePrice: '' };

const AccountCard = ({ account, assets, search = '', sortKey = 'value' }) => {
  const { updateAccount, removeAccount, addAsset, removeAsset } = usePortfolio();
  const [collapsed, setCollapsed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [assetForm, setAssetForm] = useState(emptyAsset);
  const [balance, setBalance] = useState(account.balance ?? '');
  const [fees, setFees] = useState(account.fees ?? {});

  const def = getAccountTypeDef(account.type);
  const isCash = def.type === 'cash';
  const positions = sortPositions(
    assets.filter((a) => a.accountId === account.id && matchesSearch(a.name, search)),
    sortKey,
  );
  const value = accountValue(account, assets);
  const perf = accountPerformance(account, assets);
  const plafond = computePlafond(account);

  const submitAsset = async (e) => {
    e.preventDefault();
    if (!assetForm.name || !assetForm.quantity) return;
    let currentPrice = Number(assetForm.purchasePrice) || null;
    if (assetForm.yahoo_ticker) {
      const p = await fetchQuote(assetForm.yahoo_ticker.trim());
      if (p) currentPrice = p;
    }
    addAsset({
      accountId: account.id,
      name: assetForm.name.trim(),
      yahoo_ticker: assetForm.yahoo_ticker.trim() || null,
      quantity: Number(assetForm.quantity),
      purchasePrice: Number(assetForm.purchasePrice) || 0,
      currentPrice,
    });
    setAssetForm(emptyAsset);
    setAdding(false);
  };

  const saveEdits = () => {
    const patch = {};
    if (isCash) patch.balance = Number(balance) || 0;
    patch.fees = fees;
    updateAccount(account.id, patch);
    setEditing(false);
  };

  return (
    <div className="glass-panel" style={{ marginBottom: 12 }}>
      {/* Header */}
      <div className="flex-between" style={{ alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 20,
              background: `${def.color}22`,
              border: `1px solid ${def.color}55`,
              color: def.color,
              fontWeight: 700,
              fontSize: '0.8rem',
              whiteSpace: 'nowrap',
            }}
          >
            {account.type}
          </span>
          {account.broker && <BrokerLogo name={account.broker} size={28} />}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {account.name}
            </div>
            {!isCash && (
              <div
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: perf.pnl >= 0 ? 'var(--accent)' : 'var(--negative)',
                }}
              >
                {perf.pnl >= 0 ? '+' : ''}
                {formatEUR(perf.pnl)} ({formatPercent(perf.pnlPct)})
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatEUR(value)}</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              {isCash ? 'Solde' : `${positions.length} ligne${positions.length !== 1 ? 's' : ''}`}
            </div>
          </div>
          <button
            onClick={() => setEditing((v) => !v)}
            title="Éditer"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <Settings2 size={16} />
          </button>
          <button
            onClick={() => removeAccount(account.id)}
            title="Supprimer ce compte"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? 'Déplier' : 'Replier'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </div>

      {/* Barre de plafond (livrets) */}
      {plafond && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', height: 7, borderRadius: 4, overflow: 'hidden', background: 'var(--bg-subtle)' }}>
            <div
              style={{
                width: `${plafond.pct}%`,
                background: plafond.over ? 'var(--negative)' : 'var(--text)',
              }}
            />
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Plafond : {formatEUR(plafond.used)} / {formatEUR(plafond.max)}
            {plafond.over ? ' — dépassé' : ` — il reste ${formatEUR(plafond.remaining)}`}
          </div>
        </div>
      )}

      {/* Édition rapide solde & frais */}
      {editing && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          {isCash && (
            <div className="input-group">
              <label>Solde (€)</label>
              <input type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} />
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {FEE_TYPES.filter((f) => f.applies.includes(account.type)).map((f) => (
              <div className="input-group" key={f.id}>
                <label>{f.label} ({f.unit})</label>
                <input
                  type="number"
                  step="0.01"
                  value={fees[f.id] ?? ''}
                  onChange={(e) => setFees((p) => ({ ...p, [f.id]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setEditing(false)}>Annuler</button>
            <button className="btn btn-primary" onClick={saveEdits}>Enregistrer</button>
          </div>
        </div>
      )}

      {/* Corps repliable : positions + ajout */}
      {!collapsed && !isCash && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          {positions.length === 0 ? (
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>Aucune position.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Actif</th>
                    <th style={{ textAlign: 'right' }}>Qté</th>
                    <th style={{ textAlign: 'right' }}>PRU</th>
                    <th style={{ textAlign: 'right' }}>Prix actuel</th>
                    <th style={{ textAlign: 'right' }}>Valeur</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((a) => {
                    const v = (Number(a.quantity) || 0) * (Number(a.currentPrice) || Number(a.purchasePrice) || 0);
                    return (
                      <tr key={a.id}>
                        <td>{a.name}</td>
                        <td style={{ textAlign: 'right' }}>{a.quantity}</td>
                        <td style={{ textAlign: 'right' }}>{formatEUR(a.purchasePrice)}</td>
                        <td style={{ textAlign: 'right' }}>{formatEUR(a.currentPrice || a.purchasePrice)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatEUR(v)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px' }}
                            onClick={() => removeAsset(a.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {adding ? (
            <form onSubmit={submitAsset} style={{ marginTop: 10 }}>
              <div className="input-group">
                <label>Rechercher un actif</label>
                <AssetAutocomplete
                  accountType={account.type}
                  value={assetForm.name}
                  onSelect={({ name, yahoo_ticker }) =>
                    setAssetForm((p) => ({ ...p, name, yahoo_ticker: yahoo_ticker || p.yahoo_ticker }))
                  }
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div className="input-group">
                  <label>Ticker Yahoo</label>
                  <input
                    value={assetForm.yahoo_ticker}
                    onChange={(e) => setAssetForm((p) => ({ ...p, yahoo_ticker: e.target.value }))}
                  />
                </div>
                <div className="input-group">
                  <label>Quantité</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={assetForm.quantity}
                    onChange={(e) => setAssetForm((p) => ({ ...p, quantity: e.target.value }))}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Prix d'achat (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={assetForm.purchasePrice}
                    onChange={(e) => setAssetForm((p) => ({ ...p, purchasePrice: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setAdding(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Ajouter</button>
              </div>
            </form>
          ) : (
            <button
              className="btn btn-secondary"
              style={{ marginTop: 10, fontSize: '0.85rem' }}
              onClick={() => setAdding(true)}
            >
              <Plus size={15} /> Ajouter une position
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AccountCard;
```

- [ ] **Step 2 : Vérifier lint + build**

Run: `cd ~/Desktop/Projet/RetireRich/webapp && npm run lint && npm run build`
Expected: 0 erreur lint, build OK. (Tous les imports lucide-react listés sont utilisés : ChevronDown/Up ②, Trash2, Plus ⑤, Settings2 ⑥.)

- [ ] **Step 3 : Commit**

```bash
cd ~/Desktop/Projet/RetireRich
git add webapp/src/components/AccountCard.jsx
git commit -m "feat: composant AccountCard (carte compte repliable, plafond, ajout/édition en ligne)"
```

---

## Task 5 : Refonte de `Investments.jsx` (orchestration)

En-tête (résumé + ⟳ refresh ① + heure MAJ + bouton compte en ligne ⑤), bandeau (3 KPIs + AllocationBar ③), onglets enveloppe + recherche/tri ⑧, liste de `AccountCard`, état vide ⑦.

**Files:**
- Modify (réécriture complète): `webapp/src/pages/investments/Investments.jsx`

- [ ] **Step 1 : Réécrire la page**

Replace tout le contenu de `webapp/src/pages/investments/Investments.jsx` par :
```jsx
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Calculator, Compass, RefreshCw, Search } from 'lucide-react';
import { usePortfolio } from '../../context/usePortfolio.js';
import { ACCOUNT_TYPES } from '../../utils/accountTypes.js';
import { formatEUR, formatPercent } from '../../utils/format.js';
import { fetchQuote } from '../../utils/yahooApi.js';
import { matchesSearch } from '../../utils/investmentMetrics.js';
import KpiCard from '../../components/KpiCard.jsx';
import AllocationBar from '../../components/AllocationBar.jsx';
import AccountCard from '../../components/AccountCard.jsx';
import BrokerPicker from '../../components/BrokerPicker.jsx';

const ENVELOPE_TABS = [
  { id: 'ALL', label: 'Toutes' },
  { id: 'PEA', label: 'PEA' },
  { id: 'Assurance Vie', label: 'AV' },
  { id: 'CTO', label: 'CTO' },
  { id: 'Crypto', label: 'Crypto' },
  { id: 'CASH', label: 'Livrets' },
];
const CASH_TYPES = ['Livret A', 'LDDS', 'LEP', 'Livret Jeune'];
const emptyAccount = { type: 'PEA', name: '', broker: '', balance: '', rate: '' };

const Investments = () => {
  const { accounts, assets, totals, addAccount, updateAsset } = usePortfolio();
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('value');
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [addingAccount, setAddingAccount] = useState(false);
  const [accountForm, setAccountForm] = useState(emptyAccount);

  const filteredAccounts = useMemo(() => {
    let list = accounts;
    if (activeTab === 'CASH') list = accounts.filter((a) => CASH_TYPES.includes(a.type));
    else if (activeTab !== 'ALL') list = accounts.filter((a) => a.type === activeTab);
    return list.filter((a) => search === '' || matchesSearch(a.name, search)
      || assets.some((as) => as.accountId === a.id && matchesSearch(as.name, search)));
  }, [accounts, assets, activeTab, search]);

  const refreshPrices = async () => {
    setRefreshing(true);
    const tickers = [...new Set(assets.map((a) => a.yahoo_ticker).filter(Boolean))];
    for (const t of tickers) {
      const price = await fetchQuote(t);
      if (price) {
        assets.filter((a) => a.yahoo_ticker === t).forEach((a) => updateAsset(a.id, { currentPrice: price }));
      }
    }
    setUpdatedAt(new Date());
    setRefreshing(false);
  };

  const submitAccount = (e) => {
    e.preventDefault();
    if (!accountForm.name) return;
    const account = {
      type: accountForm.type,
      name: accountForm.name.trim(),
      broker: accountForm.broker.trim() || null,
    };
    if (CASH_TYPES.includes(accountForm.type)) {
      account.balance = Number(accountForm.balance) || 0;
      account.rate = Number(accountForm.rate) || null;
    }
    addAccount(account);
    setAccountForm(emptyAccount);
    setAddingAccount(false);
  };

  const startWithType = (type) => {
    setAccountForm({ ...emptyAccount, type });
    setAddingAccount(true);
  };

  const isCashForm = CASH_TYPES.includes(accountForm.type);

  return (
    <>
      <header className="header">
        <div>
          <h1>Mes Investissements</h1>
          <p className="text-muted">
            {accounts.length} compte{accounts.length !== 1 ? 's' : ''} · Patrimoine {formatEUR(totals.patrimoine)}{' '}
            {totals.totalInvested > 0 && (
              <span style={{ color: totals.pnl >= 0 ? 'var(--accent)' : 'var(--negative)' }}>
                ({formatPercent(totals.pnlPct)})
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {updatedAt && !refreshing && (
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              maj {updatedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button className="btn btn-secondary" onClick={refreshPrices} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Mise à jour…' : 'Rafraîchir les prix'}
          </button>
          <Link to="/investments/fees" className="btn btn-secondary"><Calculator size={16} /> Frais</Link>
          <Link to="/investments/explorer" className="btn btn-secondary"><Compass size={16} /> Explorer</Link>
          <button className="btn btn-primary" onClick={() => setAddingAccount((v) => !v)}>
            <Plus size={16} /> {addingAccount ? 'Annuler' : 'Nouveau compte'}
          </button>
        </div>
      </header>

      {/* Formulaire ajout compte en ligne */}
      {addingAccount && (
        <div className="glass-panel" style={{ marginBottom: 20 }}>
          <form onSubmit={submitAccount}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group">
                <label>Type d'enveloppe</label>
                <select value={accountForm.type} onChange={(e) => setAccountForm((p) => ({ ...p, type: e.target.value }))}>
                  {ACCOUNT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Nom du compte</label>
                <input value={accountForm.name} onChange={(e) => setAccountForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ex : PEA Boursorama" required />
              </div>
            </div>
            <div className="input-group">
              <label>Courtier / Établissement</label>
              <BrokerPicker accountType={accountForm.type} value={accountForm.broker} onChange={(b) => setAccountForm((p) => ({ ...p, broker: b }))} />
            </div>
            {isCashForm && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label>Solde actuel (€)</label>
                  <input type="number" step="0.01" value={accountForm.balance} onChange={(e) => setAccountForm((p) => ({ ...p, balance: e.target.value }))} placeholder="0" />
                </div>
                <div className="input-group">
                  <label>Taux (% / an)</label>
                  <input type="number" step="0.01" value={accountForm.rate} onChange={(e) => setAccountForm((p) => ({ ...p, rate: e.target.value }))} placeholder="1.5" />
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setAddingAccount(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary">Créer le compte</button>
            </div>
          </form>
        </div>
      )}

      {accounts.length === 0 ? (
        /* État vide accueillant */
        <div className="glass-panel" style={{ textAlign: 'center', padding: 48 }}>
          <h2 style={{ marginBottom: 8 }}>Commence ton patrimoine</h2>
          <p className="text-muted" style={{ marginBottom: 20 }}>
            Ajoute ton premier compte pour suivre tes investissements. Quelques exemples pour démarrer :
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => startWithType('PEA')}>+ PEA</button>
            <button className="btn btn-secondary" onClick={() => startWithType('Assurance Vie')}>+ Assurance Vie</button>
            <button className="btn btn-secondary" onClick={() => startWithType('Livret A')}>+ Livret A</button>
          </div>
        </div>
      ) : (
        <>
          {/* Bandeau synthèse */}
          <div className="dashboard-grid">
            <div className="col-span-3"><KpiCard label="Total investi" value={formatEUR(totals.totalInvested)} /></div>
            <div className="col-span-3"><KpiCard label="Valeur actuelle" value={formatEUR(totals.totalCurrent)} trend={totals.pnlPct} /></div>
            <div className="col-span-3"><KpiCard label="Plus/Moins-value" value={formatEUR(totals.pnl)} trend={totals.pnlPct} trendLabel={formatPercent(totals.pnlPct)} /></div>
            <div className="col-span-3">
              <div className="glass-panel" style={{ height: '100%' }}>
                <div className="label" style={{ marginBottom: 8 }}>Répartition</div>
                <AllocationBar accounts={accounts} assets={assets} />
              </div>
            </div>
          </div>

          {/* Onglets + recherche/tri */}
          <div className="glass-panel" style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {ENVELOPE_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.82rem', padding: '8px 14px' }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '6px 10px' }}>
                  <Search size={14} style={{ color: 'var(--text-muted)' }} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher…"
                    style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.85rem' }}
                  />
                </div>
                <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} style={{ padding: '8px 10px' }}>
                  <option value="value">Tri : valeur</option>
                  <option value="perf">Tri : performance</option>
                  <option value="name">Tri : nom</option>
                </select>
              </div>
            </div>

            {filteredAccounts.length === 0 ? (
              <p className="text-muted">Aucun compte dans cette catégorie.</p>
            ) : (
              filteredAccounts.map((acc) => (
                <AccountCard key={acc.id} account={acc} assets={assets} search={search} sortKey={sortKey} />
              ))
            )}
          </div>
        </>
      )}
    </>
  );
};

export default Investments;
```

- [ ] **Step 2 : Vérifier lint + build**

Run: `cd ~/Desktop/Projet/RetireRich/webapp && npm run lint && npm run build`
Expected: 0 erreur lint, build OK.

- [ ] **Step 3 : Vérification manuelle dans l'app**

Run: `cd ~/Desktop/Projet/RetireRich/webapp && npm run dev` (si pas déjà lancé) → ouvrir http://localhost:5173/investments
Vérifier : (a) à 0 compte → l'état vide avec les 3 boutons exemple ; cliquer « + PEA » ouvre le formulaire pré-typé. (b) Créer un compte → carte affichée. (c) Ajouter une position en ligne dans la carte. (d) Replier/déplier la carte. (e) Pour un Livret A avec solde, la barre de plafond s'affiche. (f) Onglets filtrent ; recherche et tri agissent. (g) « Rafraîchir les prix » montre le spinner puis l'heure de MAJ.

- [ ] **Step 4 : Commit**

```bash
cd ~/Desktop/Projet/RetireRich
git add webapp/src/pages/investments/Investments.jsx
git commit -m "feat: refonte hybride de Mes Investissements (cartes, refresh, répartition, recherche/tri, état vide)"
```

---

## Task 6 : Nettoyage des modales orphelines + vérification finale

**Files:**
- Delete (si plus aucun import): `webapp/src/pages/investments/AccountModal.jsx`, `webapp/src/pages/investments/AssetModal.jsx`

- [ ] **Step 1 : Vérifier que les modales ne sont plus importées**

Run:
```bash
cd ~/Desktop/Projet/RetireRich/webapp && grep -rn "AccountModal\|AssetModal" src --include="*.jsx" | grep import
```
Expected: aucune ligne (les seuls usages étaient dans l'ancien `Investments.jsx`).

- [ ] **Step 2 : Supprimer les fichiers orphelins**

Run:
```bash
cd ~/Desktop/Projet/RetireRich/webapp && rm src/pages/investments/AccountModal.jsx src/pages/investments/AssetModal.jsx
```

- [ ] **Step 3 : Vérification globale lint + build + tests**

Run: `cd ~/Desktop/Projet/RetireRich/webapp && npm run lint && npm test && npm run build`
Expected: lint 0 erreur, tests verts, build OK.

- [ ] **Step 4 : Commit**

```bash
cd ~/Desktop/Projet/RetireRich
git add -A
git commit -m "chore: suppression des modales remplacées par les formulaires en ligne"
```

---

## Récap de couverture (spec → tâches)

| Feature spec | Tâche |
|---|---|
| Disposition hybride (en-tête, bandeau, onglets, cartes, état vide) | 5 |
| ① Rafraîchir prix + heure MAJ | 5 (page-level, contexte intact) |
| ② Cartes repliables | 4 |
| ③ Répartition par enveloppe | 2 (calcul) + 3 (UI) |
| ④ Plafond livrets | 2 (calcul) + 4 (UI) |
| ⑤ Ajout en ligne (compte + position) | 4 (position) + 5 (compte) |
| ⑥ Édition rapide solde & frais | 4 |
| ⑦ État vide accueillant | 5 |
| ⑧ Tri & recherche | 2 (calcul) + 4 + 5 (UI) |
