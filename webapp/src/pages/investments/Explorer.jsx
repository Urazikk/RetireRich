import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowRight, ArrowLeft } from 'lucide-react';
import Papa from 'papaparse';

const PAGE_SIZE = 50;

const Explorer = () => {
  const [universe, setUniverse] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [peaOnly, setPeaOnly] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetch('/pea_universe.csv')
      .then((r) => r.text())
      .then((text) => {
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        setUniverse(parsed.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const types = useMemo(() => {
    const set = new Set();
    universe.forEach((u) => u.type && set.add(u.type));
    return ['ALL', ...[...set].sort()];
  }, [universe]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return universe.filter((u) => {
      if (typeFilter !== 'ALL' && u.type !== typeFilter) return false;
      if (peaOnly && u.eligible_pea !== 'True') return false;
      if (!q) return true;
      return (
        u.name?.toLowerCase().includes(q) ||
        u.yahoo_ticker?.toLowerCase().includes(q) ||
        u.ticker_euronext?.toLowerCase().includes(q) ||
        u.isin?.toLowerCase().includes(q)
      );
    });
  }, [universe, query, typeFilter, peaOnly]);

  useEffect(() => {
    setPage(0);
  }, [query, typeFilter, peaOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <>
      <header className="header">
        <div>
          <Link
            to="/investments"
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.82rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 8,
            }}
          >
            <ArrowLeft size={14} /> Retour
          </Link>
          <h1>Explorer</h1>
          <p className="text-muted">
            Univers PEA : {loading ? '…' : universe.length.toLocaleString('fr-FR')} actifs disponibles
          </p>
        </div>
      </header>

      <div className="glass-panel">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px auto', gap: 12, alignItems: 'end' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Recherche (nom, ticker, ISIN)</label>
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="LVMH, MC.PA, FR0000121014..."
                style={{ paddingLeft: 36, width: '100%' }}
              />
            </div>
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Type d'actif</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t === 'ALL' ? 'Tous les types' : t}
                </option>
              ))}
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', whiteSpace: 'nowrap' }}>
            <input
              type="checkbox"
              checked={peaOnly}
              onChange={(e) => setPeaOnly(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            PEA éligible uniquement
          </label>
        </div>
      </div>

      <div className="glass-panel" style={{ marginTop: 20 }}>
        <div className="flex-between" style={{ marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>
            {filtered.length.toLocaleString('fr-FR')} résultats
          </h3>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              className="btn btn-secondary"
              style={{ padding: '6px 10px' }}
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ArrowLeft size={14} />
            </button>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {page + 1} / {totalPages}
            </span>
            <button
              className="btn btn-secondary"
              style={{ padding: '6px 10px' }}
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-muted">Chargement de l'univers PEA…</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Ticker</th>
                  <th>ISIN</th>
                  <th>Type</th>
                  <th>Marché</th>
                  <th>PEA</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, i) => (
                  <tr key={`${row.yahoo_ticker}-${i}`}>
                    <td style={{ fontWeight: 500 }}>{row.name}</td>
                    <td>{row.yahoo_ticker}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{row.isin || '—'}</td>
                    <td style={{ fontSize: '0.82rem' }}>{row.type || '—'}</td>
                    <td style={{ fontSize: '0.82rem' }}>{row.market || '—'}</td>
                    <td>
                      {row.eligible_pea === 'True' ? (
                        <span className="badge badge-pea">PEA</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to={`/investments/asset/${encodeURIComponent(row.yahoo_ticker)}`}
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px' }}
                      >
                        Détail <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default Explorer;
