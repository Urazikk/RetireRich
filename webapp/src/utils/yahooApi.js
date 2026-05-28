// Prix en direct — ordre de priorité :
// 1. Vercel proxy  (si VITE_YAHOO_PROXY_URL configuré — IP Vercel, jamais bloquée)
// 2. Twelve Data   (actions US + crypto, clé gratuite)
// 3. Yahoo Finance local (fallback, peut être rate-limité)

const VERCEL_PROXY = import.meta.env.VITE_YAHOO_PROXY_URL || '';

async function fetchFromVercel(ticker, mode = 'price', range = '1d') {
  if (!VERCEL_PROXY) return null;
  try {
    const url = `${VERCEL_PROXY}/api/price?ticker=${encodeURIComponent(ticker)}&mode=${mode}&range=${range}`;
    const res  = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (mode === 'price') return data.price ? parseFloat(data.price) : null;
    return data; // history: full chart JSON
  } catch { return null; }
}

async function fetchFromTwelveData(ticker) {
  try {
    const res  = await fetch(`/api/td/price/${encodeURIComponent(ticker)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return (data.price && !data.code) ? parseFloat(data.price) : null;
  } catch { return null; }
}

async function fetchFromYahooLocal(ticker) {
  try {
    const res  = await fetch(`/api/yahoo/v8/finance/chart/${ticker}?interval=1d&range=1d`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch { return null; }
}

export const fetchQuote = async (ticker) => {
  try {
    const v = await fetchFromVercel(ticker);
    if (v != null) return v;

    const td = await fetchFromTwelveData(ticker);
    if (td != null) return td;

    return await fetchFromYahooLocal(ticker);
  } catch (err) {
    console.error(`[price] ${ticker}:`, err);
    return null;
  }
};

export const fetchHistory = async (ticker, range = '1y') => {
  try {
    // Try Vercel proxy first
    if (VERCEL_PROXY) {
      const data = await fetchFromVercel(ticker, 'history', range);
      if (data?.chart?.result?.[0]) {
        return parseChartResult(data.chart.result[0]);
      }
    }

    // Fall back to local Yahoo proxy
    const interval = range === '1y' || range === '5y' ? '1mo' : '1d';
    const res  = await fetch(`/api/yahoo/v8/finance/chart/${ticker}?interval=${interval}&range=${range}`);
    if (!res.ok) return [];
    const data = await res.json();
    const result = data.chart?.result?.[0];
    return result ? parseChartResult(result) : [];
  } catch (err) {
    console.error(`[history] ${ticker}:`, err);
    return [];
  }
};

function parseChartResult(result) {
  const timestamps  = result.timestamp || [];
  const closePrices = result.indicators?.quote?.[0]?.close || [];
  return timestamps
    .map((ts, i) => ({
      date:     new Date(ts * 1000).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
      fullDate: new Date(ts * 1000),
      price:    closePrices[i],
    }))
    .filter(item => item.price != null);
}
