import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Star, TrendingUp } from 'lucide-react';
import Papa from 'papaparse';
import { POPULAR_ASSETS } from '../utils/popularAssets.js';

const RECOMMENDED_BY_TYPE = {
  PEA: 'PEA',
  CTO: 'CTO',
  'Assurance Vie': 'Assurance Vie',
  PER: 'PER',
  Crypto: 'Crypto',
};

let UNIVERSE_CACHE = null;
const loadUniverse = async () => {
  if (UNIVERSE_CACHE) return UNIVERSE_CACHE;
  try {
    const res = await fetch('/pea_universe.csv');
    const text = await res.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    UNIVERSE_CACHE = parsed.data || [];
    return UNIVERSE_CACHE;
  } catch {
    return [];
  }
};

const AssetAutocomplete = ({ accountType, value, onSelect }) => {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [universe, setUniverse] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    loadUniverse().then(setUniverse);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const recommended = useMemo(() => {
    const key = RECOMMENDED_BY_TYPE[accountType];
    return key ? POPULAR_ASSETS[key] || [] : [];
  }, [accountType]);

  const universeMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return universe
      .filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.yahoo_ticker?.toLowerCase().includes(q) ||
          u.ticker_euronext?.toLowerCase().includes(q) ||
          u.isin?.toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [universe, query]);

  const recommendedMatches = useMemo(() => {
    if (!query) return recommended;
    const q = query.toLowerCase();
    return recommended
      .map((group) => ({
        ...group,
        assets: group.assets.filter(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            a.yahoo_ticker.toLowerCase().includes(q),
        ),
      }))
      .filter((group) => group.assets.length > 0);
  }, [recommended, query]);

  const handleSelect = (asset) => {
    setQuery(asset.name);
    setOpen(false);
    onSelect({
      name: asset.name,
      yahoo_ticker: asset.yahoo_ticker,
      isin: asset.isin || null,
      kind: asset.type || asset.type_local || null,
    });
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search
          size={16}
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
          }}
        />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            onSelect({ name: e.target.value, yahoo_ticker: '' });
          }}
          onFocus={() => setOpen(true)}
          placeholder="LVMH, CW8.PA, FR0010315770…"
          style={{ paddingLeft: 36, width: '100%' }}
        />
      </div>

      {open && (recommendedMatches.length > 0 || universeMatches.length > 0) && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: 360,
            overflowY: 'auto',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: 'var(--shadow-md)',
            zIndex: 100,
          }}
        >
          {recommendedMatches.map((group) => (
            <div key={group.category}>
              <div
                style={{
                  padding: '8px 12px',
                  background: 'var(--bg-subtle)',
                  fontSize: '0.74rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Star size={11} /> {group.category}
              </div>
              {group.assets.map((a) => (
                <button
                  key={`rec-${a.yahoo_ticker}`}
                  type="button"
                  onClick={() => handleSelect(a)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 0,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{a.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {a.yahoo_ticker} · {a.type} · {a.description}
                  </div>
                </button>
              ))}
            </div>
          ))}

          {universeMatches.length > 0 && (
            <>
              <div
                style={{
                  padding: '8px 12px',
                  background: 'var(--bg-subtle)',
                  fontSize: '0.74rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <TrendingUp size={11} /> Univers complet ({universeMatches.length})
              </div>
              {universeMatches.map((u, i) => (
                <button
                  key={`uni-${u.yahoo_ticker}-${i}`}
                  type="button"
                  onClick={() => handleSelect(u)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 0,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{u.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {u.yahoo_ticker} · {u.type || 'Action'}
                    {u.eligible_pea === 'True' ? ' · PEA' : ''}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AssetAutocomplete;
