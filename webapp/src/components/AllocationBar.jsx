import { computeAllocation } from '../utils/investmentMetrics.js';
import { formatPercent } from '../utils/format.js';

// Barre segmentée de répartition par enveloppe. Présentation pure.
const AllocationBar = ({ accounts, assets }) => {
  const segments = computeAllocation(accounts, assets);
  if (segments.length === 0) {
    return <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>—</span>;
  }
  return (
    <div>
      <div
        style={{
          display: 'flex',
          height: 8,
          borderRadius: 4,
          overflow: 'hidden',
          background: 'var(--bg-subtle)',
        }}
      >
        {segments.map((s) => (
          <div
            key={s.type}
            style={{ flexGrow: s.value, background: s.color }}
            title={`${s.type} · ${formatPercent(s.pct)}`}
          />
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          marginTop: 6,
          fontSize: '0.74rem',
          color: 'var(--text-muted)',
        }}
      >
        {segments.map((s) => (
          <span key={s.type} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: 'inline-block' }}
            />
            {s.type} {s.pct.toFixed(0)}%
          </span>
        ))}
      </div>
    </div>
  );
};

export default AllocationBar;
