import { grossYield, netYield, monthlyCashFlow } from './realEstateMath.js';

// Métriques d'un projet locatif (mêmes formules que l'ancien tableau de RealEstate).
export const projectMetrics = (project) => {
  const purchase = project?.purchase || {};
  const rental = project?.rental || {};
  const price = Number(purchase.price) || 0;
  const downPayment = Number(purchase.downPayment) || 0;
  const base = {
    monthlyRent: rental.monthlyRent,
    price,
    notaryFees: purchase.notaryFees,
    works: purchase.works,
  };
  const gross = grossYield(base);
  const net = netYield({
    ...base,
    vacancyRate: rental.vacancyRate,
    propertyTax: rental.propertyTax,
    insurance: rental.insurance,
    charges: rental.charges,
    mgmtFees: rental.mgmtFees,
  });
  const cashFlow = monthlyCashFlow({
    monthlyRent: rental.monthlyRent,
    vacancyRate: rental.vacancyRate,
    charges: rental.charges,
    propertyTax: rental.propertyTax,
    insurance: rental.insurance,
    mgmtFees: rental.mgmtFees,
    loanPrincipal: price - downPayment,
    loanRate: purchase.financingMonthlyRate,
    loanYears: purchase.loanDuration,
  });
  return { invested: downPayment, grossYield: gross, netYield: net, cashFlow };
};

// Agrégats du portefeuille immo.
export const portfolioSummary = (projects) => {
  if (!projects || projects.length === 0) {
    return { totalInvested: 0, totalCashFlow: 0, avgGrossYield: 0, count: 0 };
  }
  let totalInvested = 0;
  let totalCashFlow = 0;
  let sumGross = 0;
  for (const p of projects) {
    const m = projectMetrics(p);
    totalInvested += m.invested;
    totalCashFlow += m.cashFlow;
    sumGross += m.grossYield;
  }
  return {
    totalInvested,
    totalCashFlow,
    avgGrossYield: sumGross / projects.length,
    count: projects.length,
  };
};

// Tri sans mutation. key ∈ 'cashflow' | 'yield' | 'recent'.
export const sortProjects = (projects, key) => {
  const copy = [...projects];
  if (key === 'cashflow') return copy.sort((a, b) => projectMetrics(b).cashFlow - projectMetrics(a).cashFlow);
  if (key === 'yield') return copy.sort((a, b) => projectMetrics(b).grossYield - projectMetrics(a).grossYield);
  return copy;
};
