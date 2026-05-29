// BrokerLogo.jsx — design-mode broker logos for RetireRich
// Drop into webapp/src/components/ and import where needed:
//   import BrokerLogo from '../components/BrokerLogo';
//   <BrokerLogo name={account.broker} size={40} />

// Each entry: { color, fg, mono } — color = tile bg, mono = 1-3 chars.
const BROKER_LOGOS = {
  // ── Courtiers en ligne ──
  'Boursorama':        { color: '#FF1464', fg: '#fff',     mono: 'b.' },
  'Fortuneo':          { color: '#0066B3', fg: '#fff',     mono: 'F' },
  'Saxo Bank':         { color: '#0F1D2D', fg: '#fff',     mono: 'SX' },
  'Bourse Direct':     { color: '#E20613', fg: '#fff',     mono: 'BD' },
  'BforBank':          { color: '#001F3F', fg: '#fff',     mono: 'Bƒ' },
  'Trade Republic':    { color: '#0a0a0a', fg: '#fff',     mono: 'TR' },
  // ── Banques traditionnelles ──
  'BNP Paribas':       { color: '#009E60', fg: '#fff',     mono: 'BNP' },
  'Société Générale':  { color: '#0a0a0a', fg: '#E60028',  mono: 'SG' },
  'Crédit Agricole':   { color: '#009247', fg: '#fff',     mono: 'CA' },
  'Crédit Mutuel':     { color: '#10377A', fg: '#fff',     mono: 'CM' },
  "Caisse d'Épargne":  { color: '#E2001A', fg: '#fff',     mono: 'CE' },
  'La Banque Postale': { color: '#FFD500', fg: '#0A2A82',  mono: 'LBP' },
  // ── Immobilier / SCPI ──
  'Primonial REIM':    { color: '#0D2C54', fg: '#fff',     mono: 'PR' },
  'Corum':             { color: '#1A1A1A', fg: '#fff',     mono: 'C' },
  'Sofidy':            { color: '#2B3A56', fg: '#fff',     mono: 'SY' },
  // ── Assurance Vie / PER ──
  'Linxea':            { color: '#003C6E', fg: '#F7941D',  mono: 'LX' },
  'Yomoni':            { color: '#FF6B35', fg: '#fff',     mono: 'Y' },
  'Nalo':              { color: '#4A90E2', fg: '#fff',     mono: 'N' },
  'Spirica':           { color: '#A30B5C', fg: '#fff',     mono: 'SP' },
  'Placement-direct':  { color: '#6B46C1', fg: '#fff',     mono: 'PD' },
  // ── Bonus : crypto ──
  'Bitpanda':          { color: '#1A1A1A', fg: '#22c55e',  mono: '₿' },
};

// Fallback : initials + couleur stable depuis le hash du nom
const fallbackFor = (name) => {
  const parts = (name || '?').split(/\s+/).filter(Boolean);
  const mono = parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : (name || '?').slice(0, 2).toUpperCase();
  const hue = [...(name || '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 0);
  return { color: `hsl(${hue} 30% 28%)`, fg: '#fff', mono };
};

/**
 * Vignette logo d'un courtier / banque.
 * @param {string} name   Nom exact tel que stocké dans accountTypes (Boursorama, BNP Paribas, …).
 * @param {number} size   Côté en px (défaut 32).
 * @param {number} radius Rayon de coin custom (sinon ≈ size * 0.235, équivalent au logo principal).
 */
const BrokerLogo = ({ name, size = 32, radius, style }) => {
  const spec = BROKER_LOGOS[name] || fallbackFor(name);
  const r = radius ?? Math.round(size * 0.235);
  const len = spec.mono.length;
  const fontSize = len === 1 ? size * 0.5 : len === 2 ? size * 0.42 : size * 0.32;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label={name}
      role="img"
      style={{ flexShrink: 0, ...style }}
    >
      <rect width={size} height={size} rx={r} fill={spec.color} />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fontFamily="Outfit, sans-serif"
        fontWeight="700"
        fontSize={fontSize}
        fill={spec.fg}
        letterSpacing={len >= 3 ? '-0.04em' : '-0.02em'}
      >
        {spec.mono}
      </text>
    </svg>
  );
};

export default BrokerLogo;
export { BROKER_LOGOS };
