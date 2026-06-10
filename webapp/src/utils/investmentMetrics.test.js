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
    const r = computePlafond({ type: 'LDDS', balance: 15000 });
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
    expect(r[0].id).toBe('a1');
  });
  it('trie par performance décroissante', () => {
    const r = sortPositions(assets, 'perf');
    expect(r[0].id).toBe('a1');
    expect(r[r.length - 1].id).toBe('a2');
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
