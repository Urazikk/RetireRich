export const REVENUE_CATEGORIES = [
  'Virement LCL', 'Virements Potes', 'Paris Sportifs', 'Remboursements',
  'Salaire', 'Aides', 'Dividendes', 'Revenus locatifs', 'Note de frais', 'Autre',
];

export const EXPENSE_CATEGORIES = [
  'À classer',
  // Sorties sociales
  'Restaurant', 'Bar', 'Boîte', 'Padel', 'Sport', 'Asso',
  // Quotidien
  'Courses', 'Shopping', 'Transport',
  // Paris & jeux
  'Paris Sportifs',
  // Transferts
  'Virements Potes', 'Virement LCL',
  // Pro
  'Note de frais',
  // Fixe
  'Logement', 'Abonnements', 'Santé', 'Épargne programmée',
  // Catch-all
  'Autre fixe', 'Autre variable',
];

export const FIXED_EXPENSE_CATS = new Set([
  'Logement', 'Abonnements', 'Santé', 'Épargne programmée', 'Autre fixe',
]);

export const ALL_CATEGORIES = [...REVENUE_CATEGORIES, ...EXPENSE_CATEGORIES];

// Revenue category colors
export const REVENUE_COLORS = {
  'Virement LCL':    '#6366f1',
  'Virements Potes': '#10b981',
  'Paris Sportifs':  '#f59e0b',
  'Remboursements':  '#06b6d4',
  'Salaire':         '#8b5cf6',
  'Aides':           '#a78bfa',
  'Dividendes':      '#34d399',
  'Revenus locatifs':'#f97316',
  'Autre':           '#64748b',
};

// ── Categorization rules (order matters — first match wins) ───────────────────
const RULES = [
  // Internal / ignore
  { re: /\brevo(lut)?\b|\bwero\b/i,                               cat: 'À ignorer' },

  // Own transfers (LCL → Revolut or LCL internal)
  { re: /simon\s+gallais/i,                                        cat: 'Virement LCL' },

  // Family transfers — same last name, treated as LCL
  { re: /\bgallais\b/i,                                            cat: 'Virement LCL' },

  // Sports betting
  { re: /\bFDJ\b|\bOBGF\b|winamax|betclic|SPS.BETTING|unibet|\bPMU\b|zebet/i, cat: 'Paris Sportifs' },

  // Refunds & platform credits
  { re: /remboursement|résiliation|shotgun|uber.eats|steam\b|basic.fit/i, cat: 'Remboursements' },

  // Standard income
  { re: /salaire|paie\b/i,                                         cat: 'Salaire' },
  { re: /\bCAF\b|\bAPL\b|\bRSA\b/i,                               cat: 'Aides' },
  { re: /dividende/i,                                              cat: 'Dividendes' },
  { re: /loyer.recu|loyer reçu/i,                                  cat: 'Revenus locatifs' },

  // Physical persons → Virements Potes (must come after own-name rule)
  { re: /paiement envoy[ée] par|virement de\s*:/i,                cat: 'Virements Potes' },

  // ── Expense rules ─────────────────────────────────────────────────────────
  // Logement
  { re: /loyer|charges|copropri|syndic|\bEDF\b|\bENGIE\b/i,       cat: 'Logement' },
  // Abonnements
  { re: /BASIC.?FIT|gym|piscine/i,                                 cat: 'Abonnements' },
  { re: /netflix|spotify|amazon.prime|canal\+|\bfree\b|\bsfr\b|\borange\b|bouygues|deezer|disney|\bapple\b/i, cat: 'Abonnements' },
  // Santé
  { re: /pharmacie|medecin|docteur|hopital|mutuelle|\bsecu\b|dental|optic/i, cat: 'Santé' },
  // Assurance
  { re: /assurance/i,                                              cat: 'Autre fixe' },
  // Courses
  { re: /carrefour|monoprix|lidl|auchan|leclerc|intermarch|franprix|cozy.market|picard|naturalia|supermarche|supermarché/i, cat: 'Courses' },
  // Transport
  { re: /\bSNCF\b|\bRATP\b|\buber\b|taxi|essence|autoroute|parking|navigo|blabla|bolt\b|heetch/i, cat: 'Transport' },
  // Paris sportifs (dépenses)
  { re: /\bFDJ\b|\bOBGF\b|winamax|betclic|SPS.BETTING|unibet|\bPMU\b|zebet/i, cat: 'Paris Sportifs' },
  // Padel
  { re: /padel|paddle/i,                                           cat: 'Padel' },
  // Boîte
  { re: /boite|boîte|nightclub|discoth|rex.?club|batofar|concrete|djoon/i, cat: 'Boîte' },
  // Bar
  { re: /\bbar\b|comptoir|taverne|aulius|reae|\bmael\b/i,          cat: 'Bar' },
  // Restaurant
  { re: /restaurant|brasserie|bistro|pizz|sushi|kebab|mcdo|mcdonald|burger|relais|braseria|barons|glazig|emmenez|traiteur/i, cat: 'Restaurant' },
  // Shopping
  { re: /amazon|zara|h&m|shein|asos|uniqlo|\bfnac\b|darty|decathlon|ikea|primark|vinted/i, cat: 'Shopping' },
  // Virements potes (dépenses)
  { re: /leetchi|lydia|\bsumup\b/i,                                cat: 'Virements Potes' },
  // Divers
  { re: /cinema|theatre|musee|concert|spectacle|hello.?asso|shotgun/i, cat: 'Autre variable' },
];

const USER_RULES_KEY = 'retirerich_budget_user_rules';

export function loadUserRules() {
  try { return JSON.parse(localStorage.getItem(USER_RULES_KEY)) || {}; }
  catch { return {}; }
}

export function saveUserRule(description, category) {
  const rules = loadUserRules();
  rules[description.toLowerCase()] = category;
  localStorage.setItem(USER_RULES_KEY, JSON.stringify(rules));
}

export function autoCategory(description, amount, userRules = {}) {
  // User-defined rules take priority (exact match, case-insensitive)
  const key = description.toLowerCase();
  if (userRules[key]) return userRules[key];

  // Substring match against user rules
  for (const [pattern, cat] of Object.entries(userRules)) {
    if (key.includes(pattern) || pattern.includes(key)) return cat;
  }

  // Default rules
  for (const { re, cat } of RULES) {
    if (re.test(description)) return cat;
  }
  return amount >= 0 ? 'Autre' : 'À classer';
}

// Extract human name from Revolut/LCL description
export function extractPersonName(description) {
  let m = description.match(/paiement envoy[ée] par (?:M |MR |MME |MONSIEUR |MADAME )?(.+)/i);
  if (m) return toTitleCase(m[1].trim());
  m = description.match(/virement de\s*:\s*(.+)/i);
  if (m) return toTitleCase(m[1].trim());
  // LCL patterns like "VIR INST Wero M. DUPONT"
  m = description.match(/VIR(?:\s+INST)?\s+Wero\s+(?:M\.?\s+)?(.+)/i);
  if (m) return toTitleCase(m[1].trim());
  return description;
}

function toTitleCase(str) {
  return str.toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase());
}
