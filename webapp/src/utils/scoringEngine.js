// Patrimoine scoring engine — inspired by French finance influencers
// (Mathias Baccino "FinanceMoi", Mounir Laggoune from Finary, Vincent Heron,
// "Y a pas d'arnaque", Plus Riche, etc.) and consolidated best practices.
//
// Each category produces a 0-100 score with structured recommendations.

const CASH_TYPES = ['Livret A', 'LDDS', 'LEP', 'Livret Jeune', 'Livret'];

const computeAccountValue = (account, assets) => {
  const positions = assets.filter((a) => a.accountId === account.id);
  const market = positions.reduce(
    (s, a) =>
      s +
      (Number(a.quantity) || 0) *
        (Number(a.currentPrice) || Number(a.purchasePrice) || 0),
    0,
  );
  return market + (Number(account.balance) || 0);
};

const monthsSince = (isoDate) => {
  if (!isoDate) return 0;
  const then = new Date(isoDate);
  const now = new Date();
  return (
    (now.getFullYear() - then.getFullYear()) * 12 +
    (now.getMonth() - then.getMonth())
  );
};

// ─── Category 1: Épargne de précaution ─────────────────────────────────
// Aim for 3-6 months of fixed expenses in liquid savings (Livret A, LDDS, LEP).
const scoreEmergencyFund = ({ accounts, monthlyExpenses }) => {
  const cash = accounts
    .filter((a) => CASH_TYPES.includes(a.type))
    .reduce((s, a) => s + (Number(a.balance) || 0), 0);

  const target = (monthlyExpenses || 0) * 3;
  const idealTarget = (monthlyExpenses || 0) * 6;
  const recs = [];

  let score;
  if (!monthlyExpenses) {
    // Without expense data, fall back to absolute thresholds.
    if (cash >= 15000) score = 90;
    else if (cash >= 7500) score = 70;
    else if (cash >= 3000) score = 50;
    else if (cash > 0) score = 25;
    else score = 0;
    recs.push({
      priority: 'info',
      text: "Renseigne tes dépenses mensuelles (onglet Dépenses) pour un score plus précis.",
    });
  } else if (cash >= idealTarget) {
    score = 100;
  } else if (cash >= target) {
    score = 75 + ((cash - target) / (idealTarget - target)) * 25;
  } else if (cash > 0) {
    score = (cash / target) * 75;
  } else {
    score = 0;
  }

  const hasLivretA = accounts.some((a) => a.type === 'Livret A');
  const hasLDDS = accounts.some((a) => a.type === 'LDDS');
  const hasLEP = accounts.some((a) => a.type === 'LEP');

  if (cash < target && monthlyExpenses) {
    recs.push({
      priority: 'high',
      text: `Atteins ${target.toLocaleString('fr-FR')} € d'épargne de précaution (3 mois de dépenses). Manque actuel : ${(target - cash).toLocaleString('fr-FR')} €.`,
    });
  }
  if (!hasLivretA) {
    recs.push({
      priority: 'high',
      text: "Ouvre un Livret A : 1,5 % net (2026), exonéré, retrait immédiat. Plafond 22 950 €.",
    });
  }
  if (!hasLEP && !hasLDDS) {
    recs.push({
      priority: 'medium',
      text: "Vérifie ton éligibilité au LEP (2,7 % net). Sinon, ouvre un LDDS (1,5 %, plafond 12 000 €).",
    });
  }
  if (cash >= idealTarget * 1.5) {
    recs.push({
      priority: 'medium',
      text: "Tu as plus de 6 mois en cash. L'excédent perd du pouvoir d'achat — pense à investir le surplus.",
    });
  }

  return { score: Math.round(score), recs, value: cash, target };
};

// ─── Category 2: Enveloppes fiscales ouvertes ──────────────────────────
// PEA opened ASAP (5y clock), AV ASAP (8y clock), PER if TMI ≥ 30%.
const scoreEnvelopes = ({ accounts }) => {
  const pea = accounts.find((a) => a.type === 'PEA');
  const av = accounts.find((a) => a.type === 'Assurance Vie');
  const per = accounts.find((a) => a.type === 'PER');

  const peaMonths = pea ? monthsSince(pea.openedAt || pea.createdAt) : 0;
  const avMonths = av ? monthsSince(av.openedAt || av.createdAt) : 0;

  let score = 0;
  if (pea) score += 40;
  if (av) score += 35;
  if (per) score += 15;
  if (peaMonths >= 60) score += 5;
  if (avMonths >= 96) score += 5;

  const recs = [];
  if (!pea) {
    recs.push({
      priority: 'high',
      text: "Ouvre un PEA même avec 1 € : cela lance le compteur des 5 ans pour l'exonération d'impôt sur les plus-values.",
    });
  } else if (peaMonths < 60) {
    recs.push({
      priority: 'info',
      text: `PEA ouvert depuis ${Math.floor(peaMonths / 12)} an(s) et ${peaMonths % 12} mois. Plus que ${Math.max(0, 60 - peaMonths)} mois pour l'exonération.`,
    });
  }
  if (!av) {
    recs.push({
      priority: 'high',
      text: "Ouvre une Assurance Vie (Linxea Spirit, Placement-direct…) pour lancer les 8 ans et profiter de l'abattement de 4 600 €/an.",
    });
  } else if (avMonths < 96) {
    recs.push({
      priority: 'info',
      text: `AV ouverte depuis ${Math.floor(avMonths / 12)} an(s). Plus que ${Math.max(0, 96 - avMonths)} mois pour l'avantage des 8 ans.`,
    });
  }
  if (!per) {
    recs.push({
      priority: 'medium',
      text: "Si ta TMI est à 30 % ou plus, le PER te fait économiser autant d'impôt que tes versements (plafond ~10 % du revenu).",
    });
  }

  return { score: Math.min(100, Math.round(score)), recs };
};

// ─── Category 3: Diversification ───────────────────────────────────────
// Max single position < 10%, multiple envelopes, multiple sectors / geos.
const scoreDiversification = ({ accounts, assets, totalPatrimoine }) => {
  const totals = accounts.map((acc) => ({
    type: acc.type,
    value: computeAccountValue(acc, assets),
  }));
  const envelopeTotals = totals.filter((t) => t.value > 0);
  const distinctEnvelopes = envelopeTotals.length;

  const positionValues = assets.map(
    (a) => (Number(a.quantity) || 0) * (Number(a.currentPrice) || Number(a.purchasePrice) || 0),
  );
  const maxPosition = positionValues.length ? Math.max(...positionValues) : 0;
  const maxPositionShare = totalPatrimoine > 0 ? (maxPosition / totalPatrimoine) * 100 : 0;

  const crypto = envelopeTotals.find((t) => t.type === 'Crypto')?.value || 0;
  const cryptoShare = totalPatrimoine > 0 ? (crypto / totalPatrimoine) * 100 : 0;

  let score = 0;
  // Envelope diversity (up to 40 pts)
  if (distinctEnvelopes >= 4) score += 40;
  else if (distinctEnvelopes === 3) score += 30;
  else if (distinctEnvelopes === 2) score += 18;
  else if (distinctEnvelopes === 1) score += 8;

  // Position concentration (up to 40 pts)
  if (maxPositionShare === 0) score += 0;
  else if (maxPositionShare <= 5) score += 40;
  else if (maxPositionShare <= 10) score += 32;
  else if (maxPositionShare <= 20) score += 20;
  else if (maxPositionShare <= 35) score += 10;

  // Crypto exposure (up to 20 pts)
  if (cryptoShare === 0) score += 20;
  else if (cryptoShare <= 5) score += 20;
  else if (cryptoShare <= 10) score += 15;
  else if (cryptoShare <= 20) score += 5;

  const recs = [];
  if (distinctEnvelopes < 2) {
    recs.push({
      priority: 'high',
      text: "Diversifie au-delà d'une seule enveloppe : PEA pour les actions, AV pour l'allocation longue, Livrets pour la sécurité.",
    });
  }
  if (maxPositionShare > 15 && assets.length > 0) {
    recs.push({
      priority: 'high',
      text: `Ta plus grosse ligne pèse ${maxPositionShare.toFixed(1)} % du patrimoine. Cible : aucune ligne au-dessus de 10 %.`,
    });
  }
  if (cryptoShare > 10) {
    recs.push({
      priority: 'high',
      text: `Crypto à ${cryptoShare.toFixed(1)} % — c'est au-dessus de la zone recommandée (5-10 %). Mounir Laggoune conseille de garder une exposition mesurée.`,
    });
  }
  if (assets.length > 0 && assets.length < 3) {
    recs.push({
      priority: 'medium',
      text: "Très peu de lignes en portefeuille. Un ETF Monde (CW8, EWLD, WPEA) couvre 1500+ entreprises en une seule ligne.",
    });
  }

  return { score: Math.min(100, Math.round(score)), recs, maxPositionShare, cryptoShare };
};

// ─── Category 4: Régularité (DCA) ──────────────────────────────────────
const scoreDCA = ({ monthlyContribution, monthlyIncome }) => {
  const recs = [];
  let score = 0;

  if (!monthlyIncome) {
    if (monthlyContribution > 0) score = 60;
    else score = 0;
    recs.push({
      priority: 'info',
      text: "Renseigne tes revenus mensuels et tes versements pour un score plus précis.",
    });
  } else {
    const rate = (monthlyContribution / monthlyIncome) * 100;
    if (rate >= 30) score = 100;
    else if (rate >= 20) score = 85;
    else if (rate >= 15) score = 70;
    else if (rate >= 10) score = 55;
    else if (rate > 0) score = 30;
    else score = 0;

    if (rate < 10) {
      recs.push({
        priority: 'high',
        text: `Taux d'épargne à ${rate.toFixed(0)} %. Le minimum vital pour construire un patrimoine est 10-15 %.`,
      });
    } else if (rate < 20) {
      recs.push({
        priority: 'medium',
        text: `Taux d'épargne à ${rate.toFixed(0)} %. La règle 50/30/20 vise 20 %+ d'épargne.`,
      });
    }
  }

  if (monthlyContribution === 0) {
    recs.push({
      priority: 'high',
      text: "Mets en place le DCA : un versement programmé chaque mois (Trade Republic, Boursorama, Linxea Spirit le supportent).",
    });
  }
  recs.push({
    priority: 'info',
    text: 'Mathias Baccino : "Le meilleur moment pour investir, c\'était il y a 10 ans. Le deuxième meilleur, c\'est maintenant."',
  });

  return { score: Math.round(score), recs };
};

// ─── Category 5: Coût des frais ────────────────────────────────────────
const LOW_FEE_BROKERS = [
  'Trade Republic',
  'Saxo Bank',
  'Fortuneo',
  'Boursorama',
  'BforBank',
  'Linxea',
  'Spirica',
  'Placement-direct',
];

const scoreFees = ({ accounts }) => {
  const marketAccounts = accounts.filter((a) =>
    ['PEA', 'CTO', 'PER', 'Assurance Vie'].includes(a.type),
  );
  if (!marketAccounts.length) {
    return {
      score: 50,
      recs: [
        {
          priority: 'info',
          text: 'Pas encore de compte titres ou AV. Compare les frais avant d\'ouvrir.',
        },
      ],
    };
  }

  const expensive = marketAccounts.filter(
    (a) => a.broker && !LOW_FEE_BROKERS.includes(a.broker),
  );
  const lowFee = marketAccounts.filter(
    (a) => a.broker && LOW_FEE_BROKERS.includes(a.broker),
  );

  let score;
  if (lowFee.length === marketAccounts.length) score = 100;
  else if (lowFee.length > expensive.length) score = 75;
  else if (lowFee.length > 0) score = 55;
  else score = 35;

  const recs = [];
  expensive.forEach((acc) => {
    recs.push({
      priority: 'medium',
      text: `Ton compte "${acc.name}" est chez ${acc.broker}. Compare avec ${acc.type === 'Assurance Vie' ? 'Linxea Spirit ou Placement-direct (0,5 %)' : 'Trade Republic ou Saxo (frais quasi-nuls)'}.`,
    });
  });
  if (recs.length === 0) {
    recs.push({
      priority: 'info',
      text: 'Tes courtiers font partie des moins chers du marché. Continue ainsi.',
    });
  }

  return { score: Math.round(score), recs };
};

// ─── Category 6: Allocation par âge ────────────────────────────────────
const scoreAllocation = ({ age, accounts, assets, totalPatrimoine }) => {
  if (!age || totalPatrimoine === 0) {
    return {
      score: 50,
      recs: [
        {
          priority: 'info',
          text: 'Renseigne ton âge dans les paramètres pour évaluer ton allocation.',
        },
      ],
    };
  }

  const cashValue = accounts
    .filter((a) => CASH_TYPES.includes(a.type))
    .reduce((s, a) => s + (Number(a.balance) || 0), 0);

  const equityValue = totalPatrimoine - cashValue;
  const equityShare = (equityValue / totalPatrimoine) * 100;

  // Heuristic: target equity = 110 - age (capped 30-90)
  const targetEquity = Math.max(30, Math.min(90, 110 - age));
  const diff = Math.abs(equityShare - targetEquity);

  let score;
  if (diff < 5) score = 100;
  else if (diff < 10) score = 85;
  else if (diff < 20) score = 65;
  else if (diff < 30) score = 45;
  else score = 25;

  const recs = [];
  if (equityShare < targetEquity - 10) {
    recs.push({
      priority: 'medium',
      text: `Tu es à ${equityShare.toFixed(0)} % actions, la cible pour ${age} ans serait ~${targetEquity.toFixed(0)} %. Manque d'exposition au rendement long terme.`,
    });
  } else if (equityShare > targetEquity + 10) {
    recs.push({
      priority: 'medium',
      text: `Tu es à ${equityShare.toFixed(0)} % actions, la cible serait ~${targetEquity.toFixed(0)} %. Risque de volatilité élevé pour ton horizon.`,
    });
  } else {
    recs.push({
      priority: 'info',
      text: `Allocation équilibrée pour ton âge (${equityShare.toFixed(0)} % actions / cible ${targetEquity.toFixed(0)} %).`,
    });
  }

  return { score: Math.round(score), recs, equityShare, targetEquity };
};

// ─── Category 7: Optimisation fiscale ──────────────────────────────────
const scoreTaxOptim = ({ accounts, assets }) => {
  const cashByType = (type) => {
    const acc = accounts.find((a) => a.type === type);
    return acc ? Number(acc.balance) || 0 : 0;
  };

  const livretA = cashByType('Livret A');
  const ldds = cashByType('LDDS');
  const lep = cashByType('LEP');

  const peaAccount = accounts.find((a) => a.type === 'PEA');
  const peaValue = peaAccount ? computeAccountValue(peaAccount, assets) : 0;

  let score = 50;
  const recs = [];

  // Livret A
  if (livretA > 0 && livretA < 22950) {
    recs.push({
      priority: 'info',
      text: `Livret A à ${livretA.toLocaleString('fr-FR')} € / 22 950 €. Tu peux encore y placer ${(22950 - livretA).toLocaleString('fr-FR')} € défiscalisé.`,
    });
    score += 10;
  } else if (livretA >= 22950) {
    score += 15;
  }
  // LDDS
  if (ldds > 0 && ldds < 12000) {
    recs.push({
      priority: 'info',
      text: `LDDS à ${ldds.toLocaleString('fr-FR')} € / 12 000 €. Encore ${(12000 - ldds).toLocaleString('fr-FR')} € possibles.`,
    });
    score += 10;
  } else if (ldds >= 12000) {
    score += 15;
  }
  // LEP (priority if eligible)
  if (lep > 0) score += 10;

  // PEA usage
  if (peaValue > 140000) {
    recs.push({
      priority: 'medium',
      text: `PEA à ${peaValue.toLocaleString('fr-FR')} € — proche du plafond 150 k€. Bascule les nouveaux versements actions vers CTO ou Assurance Vie.`,
    });
    score += 5;
  } else if (peaAccount) {
    score += 10;
  }

  if (!recs.length) {
    recs.push({
      priority: 'info',
      text: "Pense à remplir tes livrets défiscalisés en priorité avant les versements imposables.",
    });
  }

  return { score: Math.min(100, Math.round(score)), recs };
};

// ─── Aggregate ─────────────────────────────────────────────────────────
const WEIGHTS = {
  emergencyFund: 0.20,
  envelopes: 0.18,
  diversification: 0.15,
  dca: 0.15,
  fees: 0.10,
  allocation: 0.12,
  taxOptim: 0.10,
};

export const computeScore = ({
  accounts = [],
  assets = [],
  totalPatrimoine = 0,
  monthlyIncome = 0,
  monthlyExpenses = 0,
  monthlyContribution = 0,
  age = null,
}) => {
  const emergencyFund = scoreEmergencyFund({ accounts, monthlyExpenses });
  const envelopes = scoreEnvelopes({ accounts });
  const diversification = scoreDiversification({ accounts, assets, totalPatrimoine });
  const dca = scoreDCA({ monthlyContribution, monthlyIncome });
  const fees = scoreFees({ accounts });
  const allocation = scoreAllocation({ age, accounts, assets, totalPatrimoine });
  const taxOptim = scoreTaxOptim({ accounts, assets });

  const categories = [
    { id: 'emergencyFund', label: 'Épargne de précaution', icon: '🛡️', weight: WEIGHTS.emergencyFund, ...emergencyFund },
    { id: 'envelopes', label: 'Enveloppes fiscales', icon: '📂', weight: WEIGHTS.envelopes, ...envelopes },
    { id: 'diversification', label: 'Diversification', icon: '🌍', weight: WEIGHTS.diversification, ...diversification },
    { id: 'dca', label: 'Régularité (DCA)', icon: '🔁', weight: WEIGHTS.dca, ...dca },
    { id: 'fees', label: 'Coût des frais', icon: '💸', weight: WEIGHTS.fees, ...fees },
    { id: 'allocation', label: 'Allocation par âge', icon: '⚖️', weight: WEIGHTS.allocation, ...allocation },
    { id: 'taxOptim', label: 'Optimisation fiscale', icon: '🇫🇷', weight: WEIGHTS.taxOptim, ...taxOptim },
  ];

  const global = Math.round(categories.reduce((s, c) => s + c.score * c.weight, 0));

  return { global, categories };
};

// ─── Strategy templates ─────────────────────────────────────────────────
export const STRATEGIES = [
  {
    id: 'prudente',
    label: 'Prudente',
    profile: 'Horizon court (< 5 ans) ou aversion forte au risque',
    allocation: [
      { name: 'Fonds €', value: 50, color: '#3b82f6' },
      { name: 'ETF Obligations', value: 25, color: '#06b6d4' },
      { name: 'ETF Monde', value: 20, color: '#22c55e' },
      { name: 'Crypto', value: 0, color: '#f59e0b' },
      { name: 'Cash', value: 5, color: '#94a3b8' },
    ],
    description:
      'Protège le capital. Fonds euro en AV pour la sécurité, exposition limitée aux actions.',
    keyMoves: [
      'Privilégier les AV avec fonds euro performants (Spirica, Suravenir Opportunités)',
      'Quelques ETF World (CW8) pour conserver du rendement long terme',
      "Pas d'exposition crypto",
    ],
  },
  {
    id: 'equilibree',
    label: 'Équilibrée',
    profile: 'Horizon moyen (5-15 ans), profil mixte',
    allocation: [
      { name: 'ETF Monde', value: 50, color: '#22c55e' },
      { name: 'Fonds €', value: 25, color: '#3b82f6' },
      { name: 'SCPI / Immo papier', value: 15, color: '#f97316' },
      { name: 'Crypto', value: 5, color: '#f59e0b' },
      { name: 'Cash', value: 5, color: '#94a3b8' },
    ],
    description:
      "Cœur de portefeuille ETF Monde + SCPI pour la régularité du rendement immobilier.",
    keyMoves: [
      'PEA Trade Republic ou Fortuneo avec ETF MSCI World (CW8, EWLD)',
      'SCPI en AV (Corum Origin, Sofidy Europe Invest) pour la fiscalité',
      'Petite poche crypto BTC/ETH (5 % max)',
    ],
  },
  {
    id: 'dynamique',
    label: 'Dynamique',
    profile: 'Horizon long (> 15 ans), tolérance au risque élevée',
    allocation: [
      { name: 'ETF Monde', value: 60, color: '#22c55e' },
      { name: 'ETF Émergents', value: 15, color: '#84cc16' },
      { name: 'Stock picking', value: 10, color: '#8b5cf6' },
      { name: 'Crypto', value: 10, color: '#f59e0b' },
      { name: 'Cash', value: 5, color: '#94a3b8' },
    ],
    description:
      "Optimise pour la performance long terme. Forte exposition actions, biais croissance.",
    keyMoves: [
      "ETF World 60 % en PEA, complété d'ETF émergents (PAEEM)",
      'Stock picking limité à 10 % (max 5 lignes, conviction forte)',
      'Crypto BTC + ETH en pondération équilibrée, DCA hebdomadaire',
    ],
  },
];
