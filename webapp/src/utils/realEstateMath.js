// Mensualité de prêt amortissable.
// principal: montant emprunté, annualRate: taux annuel en %, years: durée
export const monthlyLoanPayment = (principal, annualRate, years) => {
  const n = years * 12;
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
};

export const totalInvestment = ({ price, notaryFees, works }) =>
  (Number(price) || 0) + (Number(notaryFees) || 0) + (Number(works) || 0);

// Rentabilité brute = (loyers annuels) / prix total × 100
export const grossYield = ({ monthlyRent, price, notaryFees, works }) => {
  const cost = totalInvestment({ price, notaryFees, works });
  if (cost <= 0) return 0;
  return ((Number(monthlyRent) || 0) * 12 * 100) / cost;
};

// Rentabilité nette = (loyers - charges récurrentes) / prix total × 100
export const netYield = ({
  monthlyRent,
  vacancyRate = 0,
  propertyTax = 0,
  insurance = 0,
  charges = 0,
  mgmtFees = 0,
  price,
  notaryFees,
  works,
}) => {
  const cost = totalInvestment({ price, notaryFees, works });
  if (cost <= 0) return 0;
  const grossAnnualRent = (Number(monthlyRent) || 0) * 12;
  const effectiveRent = grossAnnualRent * (1 - (Number(vacancyRate) || 0) / 100);
  const fees = effectiveRent * ((Number(mgmtFees) || 0) / 100);
  const recurring =
    (Number(propertyTax) || 0) +
    (Number(insurance) || 0) +
    (Number(charges) || 0) * 12 +
    fees;
  return ((effectiveRent - recurring) * 100) / cost;
};

// Cash flow mensuel = loyer effectif - mensualité - charges récurrentes mensualisées
export const monthlyCashFlow = ({
  monthlyRent,
  vacancyRate = 0,
  charges = 0,
  propertyTax = 0,
  insurance = 0,
  mgmtFees = 0,
  loanPrincipal,
  loanRate,
  loanYears,
}) => {
  const effectiveRent = (Number(monthlyRent) || 0) * (1 - (Number(vacancyRate) || 0) / 100);
  const fees = effectiveRent * ((Number(mgmtFees) || 0) / 100);
  const monthlyTax = (Number(propertyTax) || 0) / 12;
  const monthlyInsurance = (Number(insurance) || 0) / 12;
  const loanPayment = loanPrincipal > 0
    ? monthlyLoanPayment(loanPrincipal, Number(loanRate) || 0, Number(loanYears) || 1)
    : 0;
  return effectiveRent - fees - (Number(charges) || 0) - monthlyTax - monthlyInsurance - loanPayment;
};

// Effet de levier (Cash-on-Cash) sur l'apport
export const cashOnCashReturn = ({ downPayment, monthlyCashFlow: cf }) => {
  const dp = Number(downPayment) || 0;
  if (dp <= 0) return 0;
  return ((cf * 12) / dp) * 100;
};
