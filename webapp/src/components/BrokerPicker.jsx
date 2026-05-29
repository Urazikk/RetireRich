import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { BROKER_INFO, BROKER_NAMES } from '../utils/accountTypes.js';
import BrokerLogo from './BrokerLogo.jsx';

// Map account types to broker categories
const TYPE_TO_CATEGORY = {
  PEA: 'market',
  CTO: 'market',
  PER: 'assurance',
  'Assurance Vie': 'assurance',
  'Livret A': 'savings',
  LDDS: 'savings',
  LEP: 'savings',
  'Livret Jeune': 'savings',
  Crypto: 'crypto',
  Immobilier: 'real_estate',
};

const BrokerPicker = ({ value, onChange, accountType }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);
  const category = TYPE_TO_CATEGORY[accountType];

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const options = useMemo(() => {
    let list = BROKER_NAMES.map((name) => ({ name, info: BROKER_INFO[name] || {} }));
    // Filter by account type category if known
    if (category) {
      list = list.filter((o) => o.info.supports?.includes(category) || !o.info.supports);
    }
    // Filter by query
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (o) => o.name.toLowerCase().includes(q) || (o.info.tagline || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [category, query]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          padding: '10px 14px',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.9rem',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
        }}
      >
        {value ? (
          <>
            <BrokerLogo name={value} size={22} />
            <span style={{ flex: 1 }}>{value}</span>
          </>
        ) : (
          <span style={{ flex: 1, color: 'var(--text-muted)' }}>Choisir un courtier…</span>
        )}
        <ChevronDown size={14} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: 320,
            overflowY: 'auto',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: 'var(--shadow-md)',
            zIndex: 100,
          }}
        >
          <div style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher…"
                style={{ paddingLeft: 30, width: '100%', fontSize: '0.85rem' }}
                autoFocus
              />
            </div>
          </div>
          {options.length === 0 ? (
            <div style={{ padding: 16, fontSize: '0.86rem', color: 'var(--text-muted)' }}>
              Aucun courtier ne correspond.
            </div>
          ) : (
            options.map((o) => (
              <button
                key={o.name}
                type="button"
                onClick={() => {
                  onChange(o.name);
                  setOpen(false);
                  setQuery('');
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: o.name === value ? 'var(--bg-subtle)' : 'transparent',
                  border: 0,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  borderBottom: '1px solid var(--border)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = o.name === value ? 'var(--bg-subtle)' : 'transparent')
                }
              >
                <BrokerLogo name={o.name} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{o.name}</div>
                  <div
                    style={{
                      fontSize: '0.74rem',
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {o.info.tagline}
                  </div>
                </div>
                {o.info.tag && (
                  <span
                    style={{
                      fontSize: '0.66rem',
                      padding: '2px 6px',
                      background: 'var(--bg-subtle)',
                      borderRadius: 4,
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    {o.info.tag}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default BrokerPicker;
