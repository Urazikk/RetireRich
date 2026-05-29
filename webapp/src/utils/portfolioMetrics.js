// Portfolio metrics — computes Sharpe Ratio, volatility, Max Drawdown,
// and a diversification score from real historical returns.
//
// Inputs:
//   - positions: [{ value, ticker, history: [{date, price}, ...] }]
//   - risk-free rate (default 3 % annual)
//
// Methodology:
//   - Resample monthly closes from raw history
//   - Weight by current position value
//   - Compute monthly portfolio returns
//   - Annualize: mean × 12, std × sqrt(12)
//   - Sharpe = (annual return - risk-free) / annual volatility

const DEFAULT_RISK_FREE = 0.03;

const monthKey = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Resample a history series to monthly closes (last price of each month).
const monthlyCloses = (history) => {
  const map = new Map();
  for (const point of history) {
    const date = point.fullDate || point.date;
    const d = date instanceof Date ? date : new Date(date);
    if (!Number.isFinite(d.getTime())) continue;
    const key = monthKey(d);
    map.set(key, point.price); // last write wins → last close of month
  }
  return [...map.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
};

// Monthly simple returns from a closes series.
const returns = (closes) => {
  const out = [];
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1][1];
    const curr = closes[i][1];
    if (prev > 0 && curr > 0) {
      out.push({ month: closes[i][0], r: (curr - prev) / prev });
    }
  }
  return out;
};

const mean = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0);

const std = (arr) => {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, x) => s + (x - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
};

// Max Drawdown from a value series (after cumulative compounding).
const maxDrawdown = (returnsArr) => {
  let cumulative = 1;
  let peak = 1;
  let mdd = 0;
  for (const r of returnsArr) {
    cumulative *= 1 + r;
    if (cumulative > peak) peak = cumulative;
    const dd = (peak - cumulative) / peak;
    if (dd > mdd) mdd = dd;
  }
  return mdd;
};

export const computePortfolioMetrics = ({ positions, riskFree = DEFAULT_RISK_FREE }) => {
  // Build monthly returns per position
  const withHistory = positions
    .filter((p) => p.history && p.history.length >= 12 && Number(p.value) > 0)
    .map((p) => {
      const closes = monthlyCloses(p.history);
      const r = returns(closes);
      return { ...p, monthlyReturns: r };
    })
    .filter((p) => p.monthlyReturns.length >= 6);

  const totalValue = withHistory.reduce((s, p) => s + Number(p.value), 0);
  if (totalValue === 0 || withHistory.length === 0) {
    return {
      ok: false,
      reason:
        'Pas assez d\'historique disponible. Les positions doivent avoir un ticker Yahoo et au moins 6 mois de données.',
    };
  }

  // Align all positions on the same months
  const monthsCovered = new Set();
  withHistory.forEach((p) => p.monthlyReturns.forEach((r) => monthsCovered.add(r.month)));
  const sortedMonths = [...monthsCovered].sort();

  // For each month, compute weighted portfolio return (positions covering that month)
  const portfolioReturns = [];
  for (const m of sortedMonths) {
    let weightedSum = 0;
    let totalWeight = 0;
    for (const p of withHistory) {
      const r = p.monthlyReturns.find((x) => x.month === m);
      if (r) {
        weightedSum += Number(p.value) * r.r;
        totalWeight += Number(p.value);
      }
    }
    if (totalWeight > 0) {
      portfolioReturns.push(weightedSum / totalWeight);
    }
  }

  if (portfolioReturns.length < 6) {
    return {
      ok: false,
      reason: 'Pas assez de mois communs entre les positions.',
    };
  }

  const monthlyMean = mean(portfolioReturns);
  const monthlyStd = std(portfolioReturns);
  const annualReturn = (1 + monthlyMean) ** 12 - 1;
  const annualVol = monthlyStd * Math.sqrt(12);
  const sharpe = annualVol > 0 ? (annualReturn - riskFree) / annualVol : 0;
  const mdd = maxDrawdown(portfolioReturns);

  // Per-position metrics for breakdown
  const perPosition = withHistory.map((p) => {
    const r = p.monthlyReturns.map((x) => x.r);
    const pMean = mean(r);
    const pStd = std(r);
    const pAnnRet = (1 + pMean) ** 12 - 1;
    const pAnnVol = pStd * Math.sqrt(12);
    return {
      ticker: p.ticker,
      name: p.name,
      value: p.value,
      weight: p.value / totalValue,
      annualReturn: pAnnRet,
      annualVol: pAnnVol,
      sharpe: pAnnVol > 0 ? (pAnnRet - riskFree) / pAnnVol : 0,
    };
  });

  return {
    ok: true,
    monthsCount: portfolioReturns.length,
    coveredValue: totalValue,
    annualReturn,
    annualVol,
    sharpe,
    maxDrawdown: mdd,
    perPosition,
    portfolioMonthlyReturns: portfolioReturns,
  };
};

// Diversification verdict based on Sharpe + benchmark.
// MSCI World benchmark Sharpe is typically 0.7-1.0 over 5-10 year windows.
// We use 0.7 as the "well-diversified" threshold.
export const diversificationVerdict = ({ sharpe, perPosition }) => {
  const benchmark = 0.7;
  const topWeight = perPosition.length
    ? Math.max(...perPosition.map((p) => p.weight))
    : 0;
  const recs = [];

  let level;
  if (sharpe >= benchmark * 1.5) level = 'Excellente';
  else if (sharpe >= benchmark) level = 'Bonne';
  else if (sharpe >= benchmark * 0.7) level = 'Acceptable';
  else if (sharpe >= 0) level = 'Insuffisante';
  else level = 'Mauvaise';

  if (sharpe < benchmark) {
    recs.push({
      priority: 'high',
      text: `Ton Sharpe ratio ${sharpe.toFixed(2)} est sous le seuil ${benchmark} d'un ETF Monde. Le rendement par unité de risque est faible : envisage un ETF World (CW8, EWLD) comme cœur de portefeuille.`,
    });
  }
  if (topWeight > 0.4) {
    recs.push({
      priority: 'high',
      text: `Ta plus grosse position pèse ${(topWeight * 100).toFixed(0)} % de l'historique analysé. Cible : aucune ligne au-dessus de 10-20 %.`,
    });
  }
  if (perPosition.length === 1) {
    recs.push({
      priority: 'high',
      text: 'Tu n\'as qu\'une seule ligne analysable. La diversification commence à 5-10 lignes décorrélées (ou 1 ETF Monde).',
    });
  } else if (perPosition.length < 4) {
    recs.push({
      priority: 'medium',
      text: 'Moins de 4 lignes analysées. Un ETF Monde couvre 1500+ entreprises en un seul instrument.',
    });
  }

  return { level, benchmark, recs, topWeight };
};

// Project future patrimoine value with uncertainty band ±1σ
export const projectPortfolio = ({
  startValue,
  monthlyContribution,
  annualReturn,
  annualVol,
  years,
}) => {
  const months = years * 12;
  const r = (1 + annualReturn) ** (1 / 12) - 1;
  const sigma = annualVol / Math.sqrt(12);
  let median = startValue;
  let upper = startValue;
  let lower = startValue;
  const series = [{ month: 0, median, upper, lower }];
  for (let m = 1; m <= months; m++) {
    median = median * (1 + r) + monthlyContribution;
    upper = upper * (1 + r + sigma) + monthlyContribution;
    lower = lower * (1 + r - sigma) + monthlyContribution;
    if (lower < 0) lower = 0;
    if (m % 6 === 0 || m === months) {
      series.push({
        month: m,
        year: Math.round(m / 12 * 10) / 10,
        median: Math.round(median),
        upper: Math.round(upper),
        lower: Math.round(lower),
      });
    }
  }
  return series;
};
