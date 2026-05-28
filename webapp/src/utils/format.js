export const formatEUR = (value, { compact = false } = {}) => {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 0,
  }).format(n);
};

export const formatPercent = (value, { digits = 2 } = {}) => {
  const n = Number(value) || 0;
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)} %`;
};

export const formatNumber = (value, { digits = 0 } = {}) => {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(n);
};
