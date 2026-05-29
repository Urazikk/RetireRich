// Listing analyzer — analyses a property listing against DVF + rental heuristics.
// Estimates rent based on city tier (population-based gross yield assumptions),
// computes break-even loan rate, and produces an investment score.

import { monthlyLoanPayment } from './realEstateMath.js';

// Try to extract data from a listing URL.
// SeLoger / LeBonCoin URLs sometimes contain hints. We do best-effort parsing.
export const parseListingUrl = (url) => {
  if (!url) return {};
  const out = {};
  // Match a French postal code anywhere in the URL
  const cp = url.match(/\b(\d{5})\b/);
  if (cp) out.codePostal = cp[1];
  // Surface (e.g. "60m2", "60-m2", "60-metres")
  const surf = url.match(/(\d{2,3})[-_\s]?m2/i);
  if (surf) out.surface = Number(surf[1]);
  // Price (rare in URLs)
  const price = url.match(/(\d{6,7})[-_\s]?(?:euros?|eur|€)/i);
  if (price) out.price = Number(price[1]);
  // Type
  if (/maison/i.test(url)) out.type = 'maison';
  else if (/appartement|appart\b/i.test(url)) out.type = 'apt';
  // Rooms (T1, T2, T3...)
  const rooms = url.match(/\bt(\d)\b/i);
  if (rooms) out.rooms = Number(rooms[1]);
  return out;
};

// Estimated gross yield by zone type. Values are educated heuristics, calibrated
// against typical observed yields in France 2023-2025.
export const estimateGrossYield = ({ codePostal, transactionCountInZone = 0 }) => {
  if (!codePostal) return 0.045;
  const dept = codePostal.slice(0, 2);
  const cp = codePostal;
  // Paris intramuros
  if (dept === '75') return 0.034;
  // Petite couronne Paris
  if (['92', '93', '94'].includes(dept)) return 0.042;
  // Grande couronne
  if (['77', '78', '91', '95'].includes(dept)) return 0.046;
  // Lyon (69001-69009)
  if (cp.startsWith('6900') || cp === '69001') return 0.040;
  // Bordeaux, Toulouse, Marseille metro
  if (['33000', '33200', '31000', '31400', '13001', '13002', '13003', '13004', '13005'].some((c) => cp.startsWith(c.slice(0, 3)))) return 0.048;
  // Nice
  if (cp.startsWith('060')) return 0.045;
  // Heuristic by transaction density (proxy for city size)
  if (transactionCountInZone > 2000) return 0.045; // dense urban
  if (transactionCountInZone > 500) return 0.055;  // medium city
  if (transactionCountInZone > 100) return 0.065;  // small city
  return 0.075; // rural / small
};

export const estimateMonthlyRent = ({ price, codePostal, transactionCountInZone, surface }) => {
  if (!price || !surface) return null;
  const yieldRatio = estimateGrossYield({ codePostal, transactionCountInZone });
  return Math.round((price * yieldRatio) / 12);
};

// At a given loan rate, compute monthly cash flow.
const cashFlowAt = ({
  price,
  notaryFees,
  works,
  downPayment,
  loanYears,
  loanRate,
  monthlyRent,
  charges,
  propertyTax,
  insurance,
  mgmtFees,
  vacancyRate,
}) => {
  const totalCost = (price || 0) + (notaryFees || 0) + (works || 0);
  const principal = Math.max(0, totalCost - (downPayment || 0));
  const loanPayment = principal > 0 ? monthlyLoanPayment(principal, loanRate, loanYears) : 0;
  const effectiveRent = (monthlyRent || 0) * (1 - (vacancyRate || 0) / 100);
  const fees = effectiveRent * ((mgmtFees || 0) / 100);
  const monthlyTax = (propertyTax || 0) / 12;
  const monthlyInsurance = (insurance || 0) / 12;
  return (
    effectiveRent -
    fees -
    (charges || 0) -
    monthlyTax -
    monthlyInsurance -
    loanPayment
  );
};

// Find the loan rate at which cash flow = 0 (binary search between 0 and 20%).
export const breakEvenLoanRate = (inputs) => {
  let lo = 0;
  let hi = 20;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const cf = cashFlowAt({ ...inputs, loanRate: mid });
    if (cf > 0) lo = mid;
    else hi = mid;
  }
  // If even at 0% the cash flow is negative, return null
  if (cashFlowAt({ ...inputs, loanRate: 0 }) < 0) return null;
  return Math.round((lo + hi) / 2 * 100) / 100;
};

// Find the minimum monthly rent that makes cash flow = 0 at given loan rate.
export const breakEvenRent = (inputs) => {
  let lo = 0;
  let hi = 50000;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const cf = cashFlowAt({ ...inputs, monthlyRent: mid });
    if (cf < 0) lo = mid;
    else hi = mid;
  }
  return Math.round((lo + hi) / 2);
};

// Build a cash flow series at a range of loan rates
export const cashFlowByRate = (inputs, { from = 1.0, to = 6.5, step = 0.25 } = {}) => {
  const series = [];
  for (let r = from; r <= to + 0.0001; r += step) {
    series.push({
      rate: Math.round(r * 100) / 100,
      cashFlow: Math.round(cashFlowAt({ ...inputs, loanRate: r })),
    });
  }
  return series;
};

export { cashFlowAt };

// ─── Investment score (0-100) ──────────────────────────────────────────
export const computeListingScore = ({
  askingPrice,
  marketMedian,
  pricePerSqm,
  marketPricePerSqm,
  grossYieldEstimated,
  cashFlow,
  cashOnCash,
}) => {
  let score = 50;
  const breakdown = [];

  // Price vs market
  if (pricePerSqm && marketPricePerSqm) {
    const ratio = (pricePerSqm - marketPricePerSqm) / marketPricePerSqm;
    if (ratio < -0.15) {
      score += 20;
      breakdown.push({ ok: true, text: `Prix au m² ${Math.abs(ratio * 100).toFixed(0)} % sous la médiane DVF` });
    } else if (ratio < -0.05) {
      score += 12;
      breakdown.push({ ok: true, text: `Prix au m² légèrement sous le marché (${(ratio * 100).toFixed(0)} %)` });
    } else if (ratio < 0.05) {
      score += 5;
      breakdown.push({ ok: true, text: `Prix au m² aligné sur le marché (${(ratio * 100).toFixed(0)} %)` });
    } else if (ratio < 0.15) {
      score -= 10;
      breakdown.push({ ok: false, text: `Prix au m² ${(ratio * 100).toFixed(0)} % au-dessus du marché` });
    } else {
      score -= 20;
      breakdown.push({ ok: false, text: `Prix au m² ${(ratio * 100).toFixed(0)} % au-dessus du marché — surévalué` });
    }
  }

  // Gross yield
  if (grossYieldEstimated > 0) {
    if (grossYieldEstimated >= 0.08) {
      score += 20;
      breakdown.push({ ok: true, text: `Rentabilité brute estimée ${(grossYieldEstimated * 100).toFixed(1)} % — excellente` });
    } else if (grossYieldEstimated >= 0.06) {
      score += 12;
      breakdown.push({ ok: true, text: `Rentabilité brute ${(grossYieldEstimated * 100).toFixed(1)} % — solide` });
    } else if (grossYieldEstimated >= 0.045) {
      score += 5;
      breakdown.push({ ok: true, text: `Rentabilité brute ${(grossYieldEstimated * 100).toFixed(1)} % — correcte` });
    } else if (grossYieldEstimated >= 0.035) {
      score -= 5;
      breakdown.push({ ok: false, text: `Rentabilité brute ${(grossYieldEstimated * 100).toFixed(1)} % — faible` });
    } else {
      score -= 15;
      breakdown.push({ ok: false, text: `Rentabilité brute ${(grossYieldEstimated * 100).toFixed(1)} % — trop faible` });
    }
  }

  // Cash flow
  if (cashFlow != null) {
    if (cashFlow >= 100) {
      score += 15;
      breakdown.push({ ok: true, text: `Cash flow positif ${cashFlow.toFixed(0)} €/mois` });
    } else if (cashFlow >= 0) {
      score += 5;
      breakdown.push({ ok: true, text: `Cash flow à l'équilibre (${cashFlow.toFixed(0)} €/mois)` });
    } else if (cashFlow >= -200) {
      score -= 5;
      breakdown.push({ ok: false, text: `Cash flow négatif léger (${cashFlow.toFixed(0)} €/mois)` });
    } else {
      score -= 15;
      breakdown.push({ ok: false, text: `Cash flow très négatif (${cashFlow.toFixed(0)} €/mois)` });
    }
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    breakdown,
  };
};
