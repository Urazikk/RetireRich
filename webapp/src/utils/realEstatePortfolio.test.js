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
