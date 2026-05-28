export const POPULAR_ASSETS = {
  PEA: [
    {
      category: 'ETF — Indiciels',
      assets: [
        { name: 'Amundi MSCI World UCITS ETF', yahoo_ticker: 'CW8.PA',  type: 'ETF',    description: '~1 500 entreprises mondiales · TER 0.38%' },
        { name: 'BNP Easy S&P 500',            yahoo_ticker: 'ESE.PA',  type: 'ETF',    description: 'Top 500 entreprises américaines · TER 0.15%' },
        { name: 'Amundi Nasdaq-100 UCITS ETF', yahoo_ticker: 'PANX.PA', type: 'ETF',    description: 'Tech US, réplication synthétique · TER 0.22%' },
        { name: 'Lyxor CAC 40 (DR) UCITS ETF', yahoo_ticker: 'CAC.PA', type: 'ETF',    description: 'Les 40 plus grandes caps françaises' },
        { name: 'Amundi ETF CAC 40',           yahoo_ticker: 'C40.PA',  type: 'ETF',    description: 'Alternative CAC 40, physique' },
      ],
    },
    {
      category: 'Actions françaises',
      assets: [
        { name: 'LVMH Moët Hennessy',    yahoo_ticker: 'MC.PA',  type: 'Action', description: 'N°1 mondial du luxe' },
        { name: 'TotalEnergies',          yahoo_ticker: 'TTE.PA', type: 'Action', description: 'Énergie, présent dans 130 pays' },
        { name: 'Airbus SE',              yahoo_ticker: 'AIR.PA', type: 'Action', description: 'Leader mondial des avions civils' },
        { name: "L'Oréal",               yahoo_ticker: 'OR.PA',  type: 'Action', description: "N°1 mondial des cosmétiques" },
        { name: 'Hermès International',  yahoo_ticker: 'RMS.PA', type: 'Action', description: 'Maroquinerie de luxe, marges exceptionnelles' },
        { name: 'Sanofi',                yahoo_ticker: 'SAN.PA', type: 'Action', description: 'Pharma, présent dans 100+ pays' },
        { name: 'Accor SA',              yahoo_ticker: 'AC.PA',  type: 'Action', description: 'Hôtellerie mondiale, 40+ marques' },
        { name: 'BNP Paribas',           yahoo_ticker: 'BNP.PA', type: 'Action', description: 'Première banque française' },
      ],
    },
  ],

  CTO: [
    {
      category: 'Actions américaines',
      assets: [
        { name: 'Apple Inc.',         yahoo_ticker: 'AAPL',  type: 'Action', description: 'iPhone, Mac, Services — N°1 mondial de la capi' },
        { name: 'Microsoft',          yahoo_ticker: 'MSFT',  type: 'Action', description: 'Cloud Azure, Office 365, IA via OpenAI' },
        { name: 'NVIDIA',             yahoo_ticker: 'NVDA',  type: 'Action', description: 'GPU & IA, croissance explosive' },
        { name: 'Alphabet (Google)',  yahoo_ticker: 'GOOGL', type: 'Action', description: 'Search, YouTube, Cloud GCP' },
        { name: 'Amazon',             yahoo_ticker: 'AMZN',  type: 'Action', description: 'E-commerce et cloud AWS' },
        { name: 'Meta Platforms',     yahoo_ticker: 'META',  type: 'Action', description: 'Facebook, Instagram, WhatsApp' },
        { name: 'Tesla',              yahoo_ticker: 'TSLA',  type: 'Action', description: 'Véhicules électriques & énergie' },
      ],
    },
    {
      category: 'ETF & Actions européennes',
      assets: [
        { name: 'iShares Core MSCI World',    yahoo_ticker: 'IWDA.AS', type: 'ETF',    description: '1 600 entreprises pays développés · TER 0.20%' },
        { name: 'Vanguard FTSE All-World',    yahoo_ticker: 'VWCE.DE', type: 'ETF',    description: 'Développés + émergents, 3 700 titres' },
        { name: 'ASML Holding',               yahoo_ticker: 'ASML.AS', type: 'Action', description: 'Machines lithographie EUV, monopole mondial' },
        { name: 'LVMH Moët Hennessy',         yahoo_ticker: 'MC.PA',   type: 'Action', description: 'N°1 mondial du luxe' },
      ],
    },
  ],

  'Assurance Vie': [
    {
      category: 'ETF — Unités de Compte',
      assets: [
        { name: 'Amundi MSCI World UCITS ETF', yahoo_ticker: 'CW8.PA',  type: 'ETF', description: '~1 500 entreprises mondiales · TER 0.38%' },
        { name: 'BNP Easy S&P 500',            yahoo_ticker: 'ESE.PA',  type: 'ETF', description: 'Top 500 entreprises américaines · TER 0.15%' },
        { name: 'iShares Core MSCI World',     yahoo_ticker: 'IWDA.AS', type: 'ETF', description: 'Monde développé · TER 0.20%' },
        { name: 'Vanguard FTSE All-World',     yahoo_ticker: 'VWCE.DE', type: 'ETF', description: 'Développés + émergents, 3 700 titres' },
      ],
    },
  ],

  PER: [
    {
      category: 'ETF — Unités de Compte',
      assets: [
        { name: 'Amundi MSCI World UCITS ETF', yahoo_ticker: 'CW8.PA',  type: 'ETF', description: '~1 500 entreprises mondiales · TER 0.38%' },
        { name: 'BNP Easy S&P 500',            yahoo_ticker: 'ESE.PA',  type: 'ETF', description: 'Top 500 entreprises américaines · TER 0.15%' },
        { name: 'Amundi Nasdaq-100 UCITS ETF', yahoo_ticker: 'PANX.PA', type: 'ETF', description: 'Tech US · TER 0.22%' },
        { name: 'iShares Core MSCI World',     yahoo_ticker: 'IWDA.AS', type: 'ETF', description: 'Monde développé · TER 0.20%' },
      ],
    },
  ],

  Crypto: [
    {
      category: 'Cryptomonnaies',
      assets: [
        { name: 'Bitcoin',  yahoo_ticker: 'BTC-EUR', type: 'Crypto', description: 'Réserve de valeur numérique, N°1 des cryptos' },
        { name: 'Ethereum', yahoo_ticker: 'ETH-EUR', type: 'Crypto', description: 'Plateforme de smart contracts, DeFi' },
        { name: 'Solana',   yahoo_ticker: 'SOL-EUR', type: 'Crypto', description: 'Blockchain rapide, faibles frais' },
        { name: 'BNB',      yahoo_ticker: 'BNB-EUR', type: 'Crypto', description: 'Token Binance Exchange' },
        { name: 'XRP',      yahoo_ticker: 'XRP-EUR', type: 'Crypto', description: 'Paiements interbancaires internationaux' },
      ],
    },
  ],

  Immobilier: [
    {
      category: 'Foncières cotées (REIT)',
      assets: [
        { name: 'Unibail-Rodamco-Westfield', yahoo_ticker: 'URW.PA', type: 'REIT', description: 'Centres commerciaux premium en Europe' },
        { name: 'Klépierre',                 yahoo_ticker: 'LI.PA',  type: 'REIT', description: 'Centres commerciaux, 16 pays européens' },
        { name: 'Gecina',                    yahoo_ticker: 'GFC.PA', type: 'REIT', description: 'Immobilier résidentiel & bureaux Paris' },
      ],
    },
  ],
};

export const getPopularAssets = (accountType) =>
  POPULAR_ASSETS[accountType] || POPULAR_ASSETS['CTO'];
