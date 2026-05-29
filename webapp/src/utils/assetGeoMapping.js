// Heuristic geographic / regional classification for assets.
// Inputs: asset (with name + yahoo_ticker) + optional cached profile.
//
// Priority:
//   1. ETF name keywords (most reliable for index funds)
//   2. Crypto detection
//   3. Yahoo profile country (for individual stocks)
//   4. Ticker suffix mapping (.PA = France, .DE = Germany, etc.)
//   5. Fallback "Autre"

export const REGIONS = {
  WORLD: { label: 'Monde', color: '#22c55e' },
  US: { label: 'États-Unis', color: '#3b82f6' },
  EUROPE: { label: 'Europe', color: '#8b5cf6' },
  FR: { label: 'France', color: '#ec4899' },
  UK: { label: 'Royaume-Uni', color: '#a855f7' },
  EMERGING: { label: 'Émergents', color: '#f59e0b' },
  ASIA: { label: 'Asie développée', color: '#06b6d4' },
  CRYPTO: { label: 'Crypto', color: '#f97316' },
  OTHER: { label: 'Autre', color: '#94a3b8' },
};

const ETF_KEYWORDS = [
  { keys: ['msci world', 'ftse all-world', 'all-world', 'global', 'monde', 'developed world'], region: 'WORLD' },
  { keys: ['msci emerging', 'ftse emerging', 'emerging markets', 'pays émergents', 'paeem'], region: 'EMERGING' },
  { keys: ['s&p 500', 'sp 500', 'sp500', 's&p500', 'nasdaq', 'russell', 'dow jones', 'us large', 'us small', 'us mid'], region: 'US' },
  { keys: ['euro stoxx', 'eurostoxx', 'stoxx 600', 'stoxx europe', 'dax', 'msci europe', 'ftse europe'], region: 'EUROPE' },
  { keys: ['ftse 100', 'msci uk', 'united kingdom'], region: 'UK' },
  { keys: ['cac 40', 'cac40', 'msci france', 'sbf 120'], region: 'FR' },
  { keys: ['msci japan', 'nikkei', 'topix', 'msci pacific', 'asia pacific'], region: 'ASIA' },
];

const TICKER_SUFFIX_TO_REGION = {
  '.PA': 'FR',
  '.DE': 'EUROPE',
  '.MI': 'EUROPE',
  '.AS': 'EUROPE',
  '.BR': 'EUROPE',
  '.MC': 'EUROPE',
  '.LS': 'EUROPE',
  '.VI': 'EUROPE',
  '.HE': 'EUROPE',
  '.SW': 'EUROPE',
  '.IR': 'EUROPE',
  '.OL': 'EUROPE',
  '.ST': 'EUROPE',
  '.CO': 'EUROPE',
  '.L': 'UK',
  '.T': 'ASIA',
  '.HK': 'EMERGING',
  '.SS': 'EMERGING',
  '.SZ': 'EMERGING',
  '.BO': 'EMERGING',
  '.NS': 'EMERGING',
  '.SA': 'EMERGING',
  '.MX': 'EMERGING',
};

const COUNTRY_TO_REGION = {
  'France': 'FR',
  'United States': 'US',
  'USA': 'US',
  'Germany': 'EUROPE',
  'Italy': 'EUROPE',
  'Spain': 'EUROPE',
  'Netherlands': 'EUROPE',
  'Belgium': 'EUROPE',
  'Switzerland': 'EUROPE',
  'Sweden': 'EUROPE',
  'Norway': 'EUROPE',
  'Denmark': 'EUROPE',
  'Finland': 'EUROPE',
  'United Kingdom': 'UK',
  'Japan': 'ASIA',
  'South Korea': 'ASIA',
  'Singapore': 'ASIA',
  'Hong Kong': 'ASIA',
  'Taiwan': 'ASIA',
  'Australia': 'ASIA',
  'China': 'EMERGING',
  'India': 'EMERGING',
  'Brazil': 'EMERGING',
  'Mexico': 'EMERGING',
  'South Africa': 'EMERGING',
  'Indonesia': 'EMERGING',
};

const isCrypto = (asset) => {
  const t = (asset.yahoo_ticker || '').toUpperCase();
  return t.endsWith('-EUR') || t.endsWith('-USD') || /\b(BTC|ETH|SOL|XRP|ADA|DOT|AVAX|MATIC)\b/.test(t);
};

const matchEtfKeyword = (asset) => {
  const name = (asset.name || '').toLowerCase();
  for (const { keys, region } of ETF_KEYWORDS) {
    if (keys.some((k) => name.includes(k))) return region;
  }
  return null;
};

const matchTickerSuffix = (asset) => {
  const t = asset.yahoo_ticker || '';
  for (const [suffix, region] of Object.entries(TICKER_SUFFIX_TO_REGION)) {
    if (t.endsWith(suffix)) return region;
  }
  // US tickers have no suffix
  if (t && /^[A-Z]{1,5}$/.test(t)) return 'US';
  return null;
};

export const getAssetRegion = (asset, profile = null) => {
  if (!asset) return 'OTHER';
  if (isCrypto(asset)) return 'CRYPTO';

  const etfMatch = matchEtfKeyword(asset);
  if (etfMatch) return etfMatch;

  if (profile?.country && COUNTRY_TO_REGION[profile.country]) {
    return COUNTRY_TO_REGION[profile.country];
  }

  const suffixMatch = matchTickerSuffix(asset);
  if (suffixMatch) return suffixMatch;

  return 'OTHER';
};

// Sector mapping from Yahoo's sectorKey
export const SECTORS = {
  technology: { label: 'Technologie', color: '#3b82f6' },
  financial_services: { label: 'Finance', color: '#22c55e' },
  consumer_cyclical: { label: 'Conso cyclique', color: '#f59e0b' },
  consumer_defensive: { label: 'Conso défensive', color: '#10b981' },
  healthcare: { label: 'Santé', color: '#06b6d4' },
  communication_services: { label: 'Communication', color: '#8b5cf6' },
  industrials: { label: 'Industrie', color: '#a855f7' },
  energy: { label: 'Énergie', color: '#ef4444' },
  basic_materials: { label: 'Matériaux', color: '#84cc16' },
  utilities: { label: 'Services publics', color: '#14b8a6' },
  realestate: { label: 'Immobilier', color: '#f97316' },
  other: { label: 'Autre', color: '#94a3b8' },
};

export const normalizeSector = (sector) => {
  if (!sector) return 'other';
  const k = String(sector).toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  return SECTORS[k] ? k : 'other';
};
