import { getAccountTypeDef } from './accountTypes.js';

const positionValue = (a) =>
  (Number(a.quantity) || 0) * (Number(a.currentPrice) || Number(a.purchasePrice) || 0);

const positionCost = (a) => (Number(a.quantity) || 0) * (Number(a.purchasePrice) || 0);

export const accountValue = (account, assets) => {
  const positions = assets.filter((a) => a.accountId === account.id);
  const positionsValue = positions.reduce((s, a) => s + positionValue(a), 0);
  return positionsValue + (Number(account.balance) || 0);
};

export const accountPerformance = (account, assets) => {
  const positions = assets.filter((a) => a.accountId === account.id);
  const invested = positions.reduce((s, a) => s + positionCost(a), 0);
  const current = positions.reduce((s, a) => s + positionValue(a), 0);
  const pnl = current - invested;
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
  return { invested, current, pnl, pnlPct };
};

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

export const computePlafond = (account) => {
  const def = getAccountTypeDef(account.type);
  if (def.type !== 'cash' || !def.maxAmount) return null;
  const used = Number(account.balance) || 0;
  const max = def.maxAmount;
  const remaining = Math.max(0, max - used);
  const pct = Math.min(100, (used / max) * 100);
  return { used, max, remaining, pct, over: used > max };
};

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

export const matchesSearch = (text, query) => {
  if (!query) return true;
  return (text || '').toLowerCase().includes(query.trim().toLowerCase());
};
