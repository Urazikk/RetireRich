// French tax optimization catalog — comprehensive list of dispositifs
// for IR (Impôt sur le Revenu), patrimoine, succession.
//
// Each strategy has:
//   - id, label, category, tagline
//   - eligibility (who can use it)
//   - mechanism (how it works)
//   - reductionPct or reductionFormula
//   - ceiling (plafond annuel)
//   - duration (engagement)
//   - applicableIf (filters by profile: TMI, has_kids, owner, employee, etc.)
//   - caveat (risks / catch)
//   - moveScore (priority 1-5)

export const TAX_CATEGORIES = [
  { id: 'epargne', label: 'Épargne & retraite', color: '#22c55e', icon: '🏦' },
  { id: 'don', label: 'Dons & associatif', color: '#ec4899', icon: '💝' },
  { id: 'immo_locatif', label: 'Immobilier locatif', color: '#f97316', icon: '🏘️' },
  { id: 'pme', label: 'Investissement PME / Innovation', color: '#8b5cf6', icon: '🚀' },
  { id: 'outremer', label: 'Outre-mer & culture', color: '#06b6d4', icon: '🌴' },
  { id: 'service', label: 'Services à la personne', color: '#3b82f6', icon: '👨‍👩‍👧' },
  { id: 'energie', label: 'Travaux & énergie', color: '#10b981', icon: '🌱' },
  { id: 'succession', label: 'Patrimoine & succession', color: '#a855f7', icon: '⚖️' },
];

export const TAX_STRATEGIES = [
  // ── Épargne ────────────────────────────────────────────────────────
  {
    id: 'per',
    category: 'epargne',
    label: 'PER (Plan Épargne Retraite)',
    tagline: 'Déduction du revenu imposable, à hauteur de ta TMI',
    mechanism: 'Les versements sur PER se déduisent du revenu imposable. Pour 1 000 € versés à TMI 30 % : 300 € d\'économie d\'impôt. Argent bloqué jusqu\'à la retraite (sauf cas exceptionnels).',
    reductionFormula: 'Versement × TMI',
    ceiling: '10 % des revenus pro de N-1, max ~37 094 € (2026)',
    duration: 'Bloqué jusqu\'à la retraite',
    bestIf: 'TMI ≥ 30 %',
    avoidIf: 'TMI ≤ 11 % (gain fiscal faible)',
    moveScore: 5,
  },
  {
    id: 'av',
    category: 'epargne',
    label: 'Assurance Vie (>8 ans)',
    tagline: '4 600 € / 9 200 € de gains exonérés par an après 8 ans',
    mechanism: 'Après 8 ans d\'ouverture, les retraits bénéficient d\'un abattement annuel de 4 600 € (célibataire) / 9 200 € (couple) sur la part de gains. Au-delà : flat tax 7,5 % (au lieu de 12,8 %) jusqu\'à 150 k€ versés.',
    reductionFormula: 'Jusqu\'à 4 600 € de gains/an exonérés (célib)',
    ceiling: 'Pas de plafond de versement, mais abattement à 150 k€ versés',
    duration: 'Optimal après 8 ans',
    bestIf: 'Tous profils — ouvre tôt même avec 1 €',
    moveScore: 5,
  },

  // ── Dons ──────────────────────────────────────────────────────────
  {
    id: 'don_assos',
    category: 'don',
    label: "Don à association (66 %)",
    tagline: 'Réduction d\'impôt 66 % du montant donné',
    mechanism: 'Don à une association d\'intérêt général ou reconnue d\'utilité publique. 66 % de réduction d\'impôt dans la limite de 20 % du revenu imposable.',
    reductionFormula: 'Don × 66 %',
    ceiling: '20 % du revenu imposable / an',
    bestIf: 'Tu paies déjà de l\'IR — sinon la réduction est perdue',
    moveScore: 3,
  },
  {
    id: 'don_coluche',
    category: 'don',
    label: 'Don "Coluche" (75 %)',
    tagline: 'Réduction 75 % pour aide aux personnes en difficulté',
    mechanism: 'Don aux organismes d\'aide alimentaire ou de soins (Restos du Cœur, Secours Populaire, Croix-Rouge…). 75 % de réduction d\'impôt jusqu\'à 1 000 € donnés, puis 66 % au-delà.',
    reductionFormula: 'Don × 75 % (jusqu\'à 1 000 €) puis × 66 %',
    ceiling: '1 000 € à 75 %, surplus jusqu\'à 20 % du revenu à 66 %',
    bestIf: 'Tu paies de l\'IR',
    moveScore: 3,
  },

  // ── Immobilier locatif ────────────────────────────────────────────
  {
    id: 'lmnp_reel',
    category: 'immo_locatif',
    label: 'LMNP au régime réel',
    tagline: 'Amortir le bien neutralise des années de revenus locatifs',
    mechanism: 'Location meublée non professionnelle au régime réel : amortissement comptable du bien et du mobilier. Réduit drastiquement (souvent à zéro) le revenu locatif imposable pendant 20-25 ans.',
    reductionFormula: 'Loyers - amortissements ≈ 0 à imposer',
    ceiling: 'Recettes < 23 000 € / an ou < 50 % des revenus du foyer',
    duration: 'Tant que tu loues en meublé',
    bestIf: 'Tu achètes un meublé en locatif (étudiant, court terme, résidence services)',
    caveat: 'Le déficit reportable est limité aux loyers — pas d\'imputation sur le revenu global',
    moveScore: 5,
  },
  {
    id: 'deficit_foncier',
    category: 'immo_locatif',
    label: 'Déficit foncier',
    tagline: 'Travaux locatifs imputables jusqu\'à 10 700 €/an sur le revenu global',
    mechanism: 'Pour un bien loué en nu, les travaux d\'entretien et de réparation créent un déficit foncier imputable sur le revenu global à hauteur de 10 700 €/an (21 400 € pour rénovations énergétiques jusqu\'en 2025).',
    reductionFormula: 'Déficit × TMI + PS 17,2 %',
    ceiling: '10 700 €/an sur revenu global (excédent reportable 10 ans)',
    bestIf: 'Tu possèdes du locatif nu à rénover',
    moveScore: 4,
  },
  {
    id: 'loc_avantages',
    category: 'immo_locatif',
    label: 'Loc\'Avantages',
    tagline: '15 à 65 % de réduction selon loyer pratiqué',
    mechanism: 'Convention avec l\'Anah : tu loues à un loyer inférieur au marché en échange d\'une réduction d\'impôt. Niveau Loc1 = -15 % marché → réduc 15 %, Loc2 = -30 % → réduc 35 %, Loc3 social = -45 % → réduc 65 %.',
    reductionFormula: 'Loyers perçus × 15-65 %',
    ceiling: 'Plafond global 10 000 €/an (niches fiscales)',
    duration: '6 ans minimum',
    bestIf: 'Tu peux louer en dessous du marché et veux du bénéfice fiscal',
    caveat: 'Encadrement strict, loyer plafonné',
    moveScore: 3,
  },
  {
    id: 'denormandie',
    category: 'immo_locatif',
    label: 'Denormandie',
    tagline: 'Pinel ancien avec travaux dans des villes éligibles',
    mechanism: 'Acheter un bien ancien à rénover dans une ville du programme (~245 villes moyennes). Réduction de 12, 18 ou 21 % du prix sur 6, 9 ou 12 ans.',
    reductionFormula: 'Prix d\'achat × 12-21 % réparti sur la durée',
    ceiling: '300 000 € d\'investissement / 5 500 €/m²',
    duration: '6, 9 ou 12 ans (engagement de location)',
    bestIf: 'Tu cibles une ville éligible (Limoges, Béziers, Bourges, etc.)',
    caveat: 'Travaux doivent représenter ≥ 25 % du coût total',
    moveScore: 3,
  },
  {
    id: 'malraux',
    category: 'immo_locatif',
    label: 'Malraux',
    tagline: '22 à 30 % des travaux sur des immeubles classés',
    mechanism: 'Restauration complète d\'immeubles classés ou en secteur sauvegardé. Réduction de 22 % (zone protégée) ou 30 % (PSMV) du montant des travaux.',
    reductionFormula: 'Travaux × 22-30 %',
    ceiling: '400 000 € de travaux sur 4 ans',
    duration: '9 ans de location nue',
    bestIf: 'Très haut revenu, TMI 41-45 %, goût du patrimoine',
    caveat: 'Tickets d\'entrée élevés (300 k€+), risque opérationnel',
    moveScore: 2,
  },
  {
    id: 'monuments_historiques',
    category: 'immo_locatif',
    label: 'Monuments Historiques',
    tagline: '100 % des travaux déductibles du revenu global',
    mechanism: 'Pour un immeuble classé ou inscrit MH : 100 % des charges et travaux sont déductibles du revenu global, sans plafond. Régime atypique non soumis aux niches fiscales.',
    reductionFormula: 'Travaux × TMI (déduction directe)',
    ceiling: 'Aucun plafond',
    duration: '15 ans de conservation',
    bestIf: 'TMI 45 %, gros revenu à effacer',
    caveat: 'Engagement long, biens très spécifiques',
    moveScore: 2,
  },

  // ── PME ───────────────────────────────────────────────────────────
  {
    id: 'fcpi',
    category: 'pme',
    label: 'FCPI / FIP',
    tagline: '18 à 25 % de réduction d\'impôt pour soutenir l\'innovation',
    mechanism: 'Souscription à un fonds d\'investissement dans des PME innovantes (FCPI) ou de proximité (FIP). Réduction de 18 % du montant investi (25 % pour FIP Corse / Outre-mer).',
    reductionFormula: 'Versement × 18-25 %',
    ceiling: '12 000 € (célib) / 24 000 € (couple) par an',
    duration: 'Parts bloquées 5 ans minimum',
    bestIf: 'TMI 30 %+, prêt à immobiliser le capital',
    caveat: 'Frais de gestion 3-4 %/an, performance souvent décevante',
    moveScore: 2,
  },
  {
    id: 'ir_pme',
    category: 'pme',
    label: 'IR-PME (Madelin) "directe"',
    tagline: '18 à 25 % en investissant directement dans une PME',
    mechanism: 'Souscription au capital d\'une PME éligible (au moment de la création ou augmentation de capital). Réduction de 18 % (porté à 25 % temporairement par dispositif).',
    reductionFormula: 'Versement × 18-25 %',
    ceiling: '50 000 € (célib) / 100 000 € (couple) — niche globale 10 000 €',
    duration: 'Parts détenues 5 ans minimum',
    bestIf: 'Tu veux soutenir une startup en direct',
    caveat: 'Risque de perte totale, illiquidité',
    moveScore: 2,
  },

  // ── Outre-mer & culture ──────────────────────────────────────────
  {
    id: 'girardin_industriel',
    category: 'outremer',
    label: 'Girardin Industriel',
    tagline: '~10-13 % de rendement fiscal one-shot en année N+1',
    mechanism: 'Souscription dans un montage industriel outre-mer (matériel loué à une entreprise locale). Tu verses X € en N, tu récupères X × 1.10-1.13 en réduction d\'impôt en N+1. C\'est du one-shot.',
    reductionFormula: '~110-113 % du versement en réduction',
    ceiling: 'Plafond global niches outre-mer 18 000 €',
    duration: '5 ans (mais cash sorti une fois)',
    bestIf: 'IR ≥ 5 000 €, tu veux convertir de l\'impôt en cash sec',
    caveat: 'Risque de redressement si montage défaillant — choisir opérateur sérieux',
    moveScore: 4,
  },
  {
    id: 'sofica',
    category: 'outremer',
    label: 'SOFICA (cinéma)',
    tagline: 'Réduction 30 à 48 % pour investir dans le cinéma français',
    mechanism: 'Souscription à une SOFICA, société qui finance la production cinéma. Réduction de 30 % du versement (jusqu\'à 36 ou 48 % avec engagements supplémentaires).',
    reductionFormula: 'Versement × 30-48 %',
    ceiling: '18 000 € (et 25 % du revenu net global)',
    duration: '5 à 10 ans',
    bestIf: 'TMI 41 %+, intérêt pour le secteur',
    caveat: 'Rendement de sortie souvent inférieur au capital (-20 à -40 %)',
    moveScore: 2,
  },

  // ── Services à la personne ───────────────────────────────────────
  {
    id: 'emploi_domicile',
    category: 'service',
    label: 'Emploi à domicile (CESU)',
    tagline: 'Crédit d\'impôt 50 % des sommes versées',
    mechanism: 'Garde d\'enfants, ménage, jardinage, soutien scolaire chez toi. 50 % de crédit d\'impôt (donc même si tu ne paies pas d\'IR, l\'État rembourse). Avance immédiate disponible via Urssaf.',
    reductionFormula: 'Dépense × 50 %',
    ceiling: '12 000 € + 1 500 €/enfant ou senior à charge (max 15 000 €)',
    bestIf: 'Tu emploies quelqu\'un à domicile',
    moveScore: 4,
  },
  {
    id: 'garde_enfant',
    category: 'service',
    label: 'Frais de garde enfants < 6 ans',
    tagline: 'Crédit d\'impôt 50 % (crèche, assmat, halte-garderie)',
    mechanism: 'Crédit d\'impôt de 50 % des sommes versées pour la garde d\'un enfant de moins de 6 ans hors du domicile (crèche, assistante maternelle agréée).',
    reductionFormula: 'Dépense × 50 %',
    ceiling: '3 500 € / enfant / an',
    bestIf: 'Tu as un enfant en bas âge',
    moveScore: 4,
  },

  // ── Travaux & énergie ────────────────────────────────────────────
  {
    id: 'maprimerenov',
    category: 'energie',
    label: "MaPrimeRénov'",
    tagline: 'Prime versée pour travaux d\'isolation et chauffage',
    mechanism: 'Aide directe versée (non fiscale) pour travaux énergétiques sur résidence principale. Montant variable selon revenus et travaux.',
    reductionFormula: 'Prime directe (varie 2 000 - 20 000 €)',
    ceiling: 'Plafond annuel par type de travaux',
    bestIf: 'Tu rénoves ta résidence principale',
    caveat: 'Ce n\'est pas une réduction d\'IR mais une prime',
    moveScore: 3,
  },
  {
    id: 'borne_recharge',
    category: 'energie',
    label: 'Borne de recharge VE',
    tagline: 'Crédit d\'impôt 75 % du coût (plafond 500 €)',
    mechanism: 'Installation d\'un système de charge pour véhicule électrique dans la résidence principale ou secondaire : crédit d\'impôt de 75 % du coût TTC dans la limite de 500 € par borne.',
    reductionFormula: 'Coût × 75 %',
    ceiling: '500 € par borne',
    bestIf: 'Tu installes une borne chez toi',
    moveScore: 3,
  },

  // ── Patrimoine & succession ──────────────────────────────────────
  {
    id: 'av_succession',
    category: 'succession',
    label: 'Assurance Vie (succession)',
    tagline: '152 500 € exonérés par bénéficiaire avant 70 ans',
    mechanism: 'Versements avant 70 ans : abattement de 152 500 € par bénéficiaire (hors succession). Au-delà : taxation 20 % puis 31,25 %. Versements après 70 ans : abattement global 30 500 € seulement.',
    reductionFormula: '152 500 € × nb bénéficiaires hors succession',
    bestIf: 'Optimiser la transmission à plusieurs bénéficiaires',
    moveScore: 5,
  },
  {
    id: 'donation_nue_propriete',
    category: 'succession',
    label: 'Donation de nue-propriété',
    tagline: 'Tu donnes la nue-propriété, tu gardes l\'usufruit',
    mechanism: 'Donner la nue-propriété d\'un bien (immo, valeurs mobilières) à tes enfants tout en gardant l\'usufruit (loyers, dividendes). Au décès, ils récupèrent la pleine propriété sans droits supplémentaires. L\'abattement s\'applique sur une valeur réduite (table fiscale).',
    reductionFormula: 'Abattement 100 000 €/parent/enfant tous les 15 ans',
    bestIf: 'Tu as un patrimoine ≥ 200 k€ à transmettre',
    moveScore: 4,
  },
  {
    id: 'pacte_dutreil',
    category: 'succession',
    label: 'Pacte Dutreil (entreprise)',
    tagline: '75 % d\'abattement pour la transmission d\'entreprise',
    mechanism: 'Engagement collectif de conservation des titres : 75 % d\'abattement sur les droits de succession ou donation, transmissible à plusieurs personnes physiques.',
    reductionFormula: 'Droits × 25 % (au lieu de 100 %)',
    duration: 'Engagement 2+4 ans (collectif puis individuel)',
    bestIf: 'Tu transmets une entreprise familiale',
    moveScore: 3,
  },
];

// Estimate French marginal tax bracket from yearly income
export const estimateTMI = (annualIncome, parts = 1) => {
  const perPart = annualIncome / parts;
  if (perPart <= 11497) return 0;
  if (perPart <= 29315) return 11;
  if (perPart <= 83823) return 30;
  if (perPart <= 180294) return 41;
  return 45;
};

// Recommend top strategies based on profile
export const recommendStrategies = ({ tmi, hasKids, owner, hasRental }) => {
  const scored = TAX_STRATEGIES.map((s) => {
    let bonus = 0;
    if (s.bestIf?.includes('TMI 30') && tmi >= 30) bonus += 2;
    if (s.bestIf?.includes('TMI 41') && tmi >= 41) bonus += 3;
    if (s.bestIf?.includes('emploies quelqu\'un') && true) bonus += 0;
    if (s.bestIf?.includes('enfant') && hasKids) bonus += 2;
    if (s.bestIf?.includes('locatif') && hasRental) bonus += 2;
    if (s.bestIf?.includes('résidence principale') && owner) bonus += 1;
    return { ...s, totalScore: s.moveScore + bonus };
  });
  return scored.sort((a, b) => b.totalScore - a.totalScore);
};
