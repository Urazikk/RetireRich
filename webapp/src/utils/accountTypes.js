// ─── Account type → broker category mapping ──────────────────────────────────
// Used by BrokerPicker to filter relevant brokers per account type.
export const ACCOUNT_BROKER_CATEGORY = {
  'PEA':           'market',
  'CTO':           'market',
  'Assurance Vie': 'assurance',
  'PER':           'assurance',
  'Livret A':      'savings',
  'LDDS':          'savings',
  'LEP':           'savings',
  'Crypto':        'crypto',
  'Immobilier':    'real_estate',
  'Autre':         'other',
};

// Known French broker fee presets — used to auto-fill the fee form.
// Values are indicative; user can always override.
export const BROKER_PRESETS = {
  // ── Courtiers en ligne (PEA / CTO) ──────────────────────────────────────
  'Boursorama':         { garde: 0,     courtage: 0.5,  gestion: 0,    versement: 0 },
  'Fortuneo':           { garde: 0,     courtage: 0.39, gestion: 0,    versement: 0 },
  'Saxo Bank':          { garde: 0,     courtage: 0.08, gestion: 0,    versement: 0 },
  'Bourse Direct':      { garde: 0,     courtage: 0.9,  gestion: 0,    versement: 0 },
  'BforBank':           { garde: 0,     courtage: 0.5,  gestion: 0,    versement: 0 },
  'Trade Republic':     { garde: 0,     courtage: 1,    gestion: 0,    versement: 0 },
  // ── Banques traditionnelles ──────────────────────────────────────────────
  'BNP Paribas':        { garde: 0.1,   courtage: 0.5,  gestion: 0,    versement: 0 },
  'Société Générale':   { garde: 0,     courtage: 0.6,  gestion: 0,    versement: 0 },
  'Crédit Agricole':    { garde: 0.2,   courtage: 0.7,  gestion: 0,    versement: 0 },
  'Crédit Mutuel':      { garde: 0.2,   courtage: 0.65, gestion: 0,    versement: 0 },
  'Caisse d\'Épargne':  { garde: 0.2,   courtage: 0.7,  gestion: 0,    versement: 0 },
  'La Banque Postale':  { garde: 0.25,  courtage: 0.8,  gestion: 0,    versement: 0 },
  // ── Immobilier / SCPI ───────────────────────────────────────────────────
  'Primonial REIM':     { garde: 0,     courtage: 0,    gestion: 1.2,  versement: 0 },
  'Corum':              { garde: 0,     courtage: 0,    gestion: 1.0,  versement: 12 },
  'Sofidy':             { garde: 0,     courtage: 0,    gestion: 1.0,  versement: 10 },
  // ── Assurance Vie / PER ─────────────────────────────────────────────────
  'Linxea':             { garde: 0,     courtage: 0,    gestion: 0.5,  versement: 0 },
  'Yomoni':             { garde: 0,     courtage: 0,    gestion: 1.6,  versement: 0 },
  'Nalo':               { garde: 0,     courtage: 0,    gestion: 1.65, versement: 0 },
  'Spirica':            { garde: 0,     courtage: 0,    gestion: 0.7,  versement: 0 },
  'Placement-direct':   { garde: 0,     courtage: 0,    gestion: 0.6,  versement: 0 },
};

export const BROKER_NAMES = Object.keys(BROKER_PRESETS);

// `supports` restricts which account categories show this broker.
// 'market'    → PEA, CTO
// 'assurance' → Assurance Vie, PER
// 'savings'   → Livret A, LDDS, LEP
export const BROKER_INFO = {
  'Boursorama':        { tagline: 'Banque en ligne — PEA, CTO, AV, Livrets',         category: 'courtier',  tag: 'Populaire', supports: ['market', 'assurance', 'savings'] },
  'Fortuneo':          { tagline: 'Courtier en ligne — PEA, CTO, Livrets',            category: 'courtier',  tag: '',          supports: ['market', 'savings'] },
  'Saxo Bank':         { tagline: 'Frais de courtage ultra-bas, profil avancé',       category: 'courtier',  tag: 'Pro',       supports: ['market'] },
  'Trade Republic':    { tagline: '1 € / ordre, interface mobile — PEA & CTO uniquement', category: 'courtier', tag: '',        supports: ['market'] },
  'Bourse Direct':     { tagline: 'Tarifs fixes, interface simple et rapide',         category: 'courtier',  tag: '',          supports: ['market'] },
  'BforBank':          { tagline: 'Filiale Crédit Agricole, 100 % en ligne',          category: 'courtier',  tag: '',          supports: ['market'] },
  'BNP Paribas':       { tagline: 'Grande banque française — PEA, CTO, AV, Livrets', category: 'banque',    tag: '',          supports: ['market', 'assurance', 'savings'] },
  'Société Générale':  { tagline: 'Banque de réseau — PEA, CTO, AV, Livrets',        category: 'banque',    tag: '',          supports: ['market', 'assurance', 'savings'] },
  'Crédit Agricole':   { tagline: 'Première banque de détail — PEA, CTO, AV, Livrets', category: 'banque',  tag: '',          supports: ['market', 'assurance', 'savings'] },
  'Crédit Mutuel':     { tagline: 'Banque coopérative — PEA, CTO, AV, Livrets',      category: 'banque',    tag: '',          supports: ['market', 'assurance', 'savings'] },
  "Caisse d'Épargne":  { tagline: 'Réseau BPCE — PEA, CTO, AV, Livrets',             category: 'banque',    tag: '',          supports: ['market', 'assurance', 'savings'] },
  'La Banque Postale': { tagline: 'Accessible partout — Livrets, AV',                category: 'banque',    tag: '',          supports: ['assurance', 'savings'] },
  'Primonial REIM':    { tagline: 'Gestionnaire de SCPI (Patrimmo, Primopierre…)',     category: 'immo',      tag: 'SCPI',      supports: ['real_estate'] },
  'Corum':             { tagline: 'SCPI Corum Origin / Corum XL — rendement élevé',  category: 'immo',      tag: 'SCPI',      supports: ['real_estate'] },
  'Sofidy':            { tagline: 'SCPI Immorente / Sofidy Europe Invest',            category: 'immo',      tag: 'SCPI',      supports: ['real_estate'] },
  'Linxea':            { tagline: 'AV / PER en ligne, frais de gestion très bas',    category: 'assurance', tag: 'Populaire', supports: ['assurance'] },
  'Yomoni':            { tagline: 'Robo-advisor, gestion 100 % pilotée par algo',    category: 'assurance', tag: 'Robo',      supports: ['assurance'] },
  'Nalo':              { tagline: 'Gestion personnalisée assistée par IA',             category: 'assurance', tag: 'Robo',      supports: ['assurance'] },
  'Spirica':           { tagline: 'Large gamme d\'UC, gestion libre ou pilotée',     category: 'assurance', tag: '',          supports: ['assurance'] },
  'Placement-direct':  { tagline: 'AV en ligne, gestion libre, frais modérés',       category: 'assurance', tag: '',          supports: ['assurance'] },
};

// Fees that can apply to an account.
// `applies` lists the account type ids where this fee is most common (shown first in the form).
export const FEE_TYPES = [
  {
    id: 'gestion',
    label: 'Frais de gestion annuels',
    description: 'Prélevés chaque année sur l\'encours total',
    unit: '% / an',
    applies: ['Assurance Vie', 'PER', 'Crypto'],
  },
  {
    id: 'garde',
    label: 'Frais de garde',
    description: 'Conservation des titres, facturés annuellement',
    unit: '% / an',
    applies: ['PEA', 'CTO'],
  },
  {
    id: 'courtage',
    label: 'Frais de courtage',
    description: 'Prélevés à chaque ordre d\'achat / vente',
    unit: '% / ordre',
    applies: ['PEA', 'CTO', 'Crypto'],
  },
  {
    id: 'versement',
    label: 'Frais sur versements',
    description: 'Prélevés sur chaque nouveau dépôt',
    unit: '%',
    applies: ['Assurance Vie', 'PER'],
  },
];

// Annual recurring cost as a fraction of total value (gestion + garde only)
export const annualFeeCost = (fees = {}, totalValue = 0) =>
  totalValue * ((parseFloat(fees.gestion) || 0) + (parseFloat(fees.garde) || 0)) / 100;

export const ACCOUNT_TYPES = [
  { id: 'PEA',           label: "Plan d'Épargne en Actions",     type: 'market',      color: '#6366f1', maxAmount: 150000 },
  { id: 'PER',           label: "Plan d'Épargne Retraite",        type: 'market',      color: '#8b5cf6' },
  { id: 'Assurance Vie', label: 'Assurance Vie',                  type: 'market',      color: '#ec4899' },
  { id: 'CTO',           label: 'Compte Titres Ordinaire',        type: 'market',      color: '#3b82f6' },
  { id: 'Livret A',      label: 'Livret A',                       type: 'cash',        color: '#10b981', maxAmount: 22950 },
  { id: 'LDDS',          label: 'LDDS',                           type: 'cash',        color: '#14b8a6', maxAmount: 12000 },
  { id: 'LEP',           label: "Livret d'Épargne Populaire",     type: 'cash',        color: '#06b6d4', maxAmount: 10000 },
  { id: 'Crypto',        label: 'Crypto-monnaies',                type: 'market',      color: '#f59e0b' },
  { id: 'Immobilier',    label: 'Immobilier',                     type: 'real_estate', color: '#f97316' },
  { id: 'Autre',         label: 'Autre',                          type: 'other',       color: '#94a3b8' },
];

export const getAccountTypeDef = (typeId) =>
  ACCOUNT_TYPES.find(t => t.id === typeId) ?? ACCOUNT_TYPES[ACCOUNT_TYPES.length - 1];

// Info cards displayed in the envelope tooltip/popup
export const ACCOUNT_TYPE_INFO = {
  'PEA': {
    shortDesc: 'Enveloppe fiscalement avantageuse après 5 ans',
    details: [
      { label: 'Avantage fiscal', text: 'Après 5 ans : exonération d\'impôt sur les plus-values (hors prélèvements sociaux 17,2 %)' },
      { label: 'Plafond de versement', text: '150 000 €' },
      { label: 'Univers', text: 'Actions et ETF européens + ETF monde via réplication synthétique (MSCI World, S&P 500…)' },
      { label: 'Retrait', text: 'Libre après 5 ans sans clôture. Avant 5 ans : clôture automatique du plan' },
      { label: 'Conseil clé', text: 'Ouvrir dès maintenant même avec 1 € pour faire courir le délai de 5 ans' },
    ],
  },
  'CTO': {
    shortDesc: 'Accès à tous les actifs mondiaux, sans plafond ni contrainte',
    details: [
      { label: 'Liberté totale', text: 'Actions, ETF, obligations, matières premières — monde entier, aucun plafond de versement' },
      { label: 'Fiscalité', text: 'Flat Tax 30 % (PFU) sur les plus-values et dividendes. Barème IR possible si plus avantageux' },
      { label: 'Retrait', text: 'Totalement libre à tout moment, sans frais ni pénalité' },
      { label: 'Conseil clé', text: 'Idéal pour les actifs non éligibles au PEA : marchés émergents, US en direct, REITs…' },
    ],
  },
  'Assurance Vie': {
    shortDesc: 'Couteau suisse patrimonial, très avantageux après 8 ans',
    details: [
      { label: 'Avantage fiscal 8 ans', text: 'Abattement annuel de 4 600 € (célibataire) / 9 200 € (couple) sur les gains retirés' },
      { label: 'Avant 8 ans', text: 'Plus-values taxées à 12,8 % + 17,2 % PS — mais les gains restent protégés dans l\'enveloppe' },
      { label: 'Succession', text: 'Transmission jusqu\'à 152 500 € par bénéficiaire hors droits de succession' },
      { label: 'Univers', text: 'Fonds euro (capital garanti) + unités de compte : ETF, SCPI, fonds actifs' },
      { label: 'Conseil clé', text: 'Ouvrir tôt pour lancer les 8 ans. Mixer fonds euro (sécurité) + ETF monde (performance)' },
    ],
  },
  'PER': {
    shortDesc: 'Déduction fiscale immédiate, capital bloqué jusqu\'à la retraite',
    details: [
      { label: 'Avantage fiscal', text: 'Versements déductibles du revenu imposable (plafond : 10 % des revenus, max ~35 000 €/an)' },
      { label: 'Blocage', text: 'Capital indisponible jusqu\'à la retraite sauf cas exceptionnels (invalidité, achat résidence principale…)' },
      { label: 'Sortie', text: 'En rente ou en capital à la retraite. Capital imposé au barème IR, gains à la flat tax' },
      { label: 'Conseil clé', text: 'Très avantageux si TMI ≥ 30 %. Peu pertinent en TMI 11 % (économie fiscale faible)' },
    ],
  },
  'Livret A': {
    shortDesc: 'Épargne de précaution sécurisée, garantie par l\'État',
    details: [
      { label: 'Taux', text: '2,4 % / an net (taux 2025 — révisé 2× / an par la Banque de France)' },
      { label: 'Plafond', text: '22 950 € de versements (hors intérêts capitalisés)' },
      { label: 'Disponibilité', text: 'Retrait immédiat et sans frais, 24h/24' },
      { label: 'Fiscalité', text: 'Intérêts totalement exonérés d\'impôt et de prélèvements sociaux' },
      { label: 'Conseil clé', text: 'Réservé à l\'épargne de précaution : 3 à 6 mois de charges fixes' },
    ],
  },
  'LDDS': {
    shortDesc: 'Similaire au Livret A, finance l\'économie solidaire',
    details: [
      { label: 'Taux', text: '2,4 % / an net (même taux que le Livret A)' },
      { label: 'Plafond', text: '12 000 € de versements' },
      { label: 'Disponibilité', text: 'Retrait immédiat et sans frais' },
      { label: 'Fiscalité', text: 'Intérêts exonérés d\'impôt et de prélèvements sociaux' },
      { label: 'Conseil clé', text: 'Complémentaire au Livret A une fois celui-ci plein. Même logique d\'épargne de précaution' },
    ],
  },
  'LEP': {
    shortDesc: 'Meilleur taux garanti du marché, sous conditions de ressources',
    details: [
      { label: 'Taux', text: '3,5 % / an net (2025) — toujours supérieur au Livret A par décret' },
      { label: 'Plafond', text: '10 000 € de versements' },
      { label: 'Conditions', text: 'Soumis à conditions de ressources (RFR ≤ 21 393 € pour 1 part fiscale en 2025)' },
      { label: 'Fiscalité', text: 'Intérêts exonérés d\'impôt et de prélèvements sociaux' },
      { label: 'Conseil clé', text: 'Si vous y êtes éligible : à remplir en priorité avant même le Livret A' },
    ],
  },
  'Crypto': {
    shortDesc: 'Actifs numériques — haute volatilité, pas d\'avantage fiscal',
    details: [
      { label: 'Fiscalité', text: 'Flat Tax 30 % sur les plus-values à chaque cession contre monnaie fiat' },
      { label: 'Déclaration', text: 'Obligation de déclarer les comptes d\'actifs numériques à l\'étranger (formulaire 3916-bis)' },
      { label: 'Risque', text: 'Très haute volatilité et absence de sous-jacent réel pour beaucoup d\'actifs' },
      { label: 'Conseil clé', text: 'Limiter à 5-10 % max du patrimoine. BTC et ETH restent les actifs les plus solides du secteur' },
    ],
  },
  'Immobilier': {
    shortDesc: 'Pierre physique ou papier (SCPI, SIIC)',
    details: [
      { label: 'Types', text: 'Résidence principale, locatif direct, SCPI, SIIC cotées en CTO ou AV' },
      { label: 'Fiscalité locatif', text: 'Revenus fonciers au barème IR. Micro-foncier (30 % abattement) si loyers < 15 000 €/an' },
      { label: 'Plus-value', text: 'Exonération totale après 22 ans (IR) et 30 ans (prélèvements sociaux)' },
      { label: 'Conseil clé', text: 'SCPI en Assurance Vie pour une meilleure fiscalité. Attention à la liquidité et à l\'effet de levier' },
    ],
  },
  'Autre': {
    shortDesc: 'Compte personnalisé pour tout actif non listé',
    details: [
      { label: 'Usage', text: 'Or physique, œuvres d\'art, private equity, prêts entre particuliers…' },
    ],
  },
};
