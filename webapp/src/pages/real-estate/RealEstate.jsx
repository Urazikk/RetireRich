import { Link } from 'react-router-dom';
import { Building2, Calculator, Search, Trash2 } from 'lucide-react';
import { useRealEstate } from '../../context/RealEstateContext.jsx';
import { formatEUR, formatPercent } from '../../utils/format.js';
import {
  grossYield,
  netYield,
  monthlyCashFlow,
} from '../../utils/realEstateMath.js';

const RealEstate = () => {
  const { projects, removeProject } = useRealEstate();

  return (
    <>
      <header className="header">
        <div>
          <h1>Immobilier</h1>
          <p className="text-muted">
            Analyse de marché (DVF) et simulateurs d'investissement locatif
          </p>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="col-span-6">
          <Link to="/real-estate/market" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="glass-panel" style={{ cursor: 'pointer', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <Search size={22} />
                <h3 style={{ margin: 0 }}>Prix du marché (DVF)</h3>
              </div>
              <p style={{ marginTop: 8 }}>
                Cherche le prix moyen au m² par ville ou code postal à partir des données
                publiques DVF (Demandes de Valeurs Foncières).
              </p>
            </div>
          </Link>
        </div>
        <div className="col-span-6">
          <Link to="/real-estate/simulator" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="glass-panel" style={{ cursor: 'pointer', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <Calculator size={22} />
                <h3 style={{ margin: 0 }}>Simulateur d'investissement</h3>
              </div>
              <p style={{ marginTop: 8 }}>
                Calcule la rentabilité brute, nette et le cash flow mensuel d'un projet locatif.
                Sauvegarde tes simulations pour les comparer.
              </p>
            </div>
          </Link>
        </div>

        <div className="col-span-12">
          <div className="glass-panel">
            <h3>Mes projets enregistrés</h3>
            {projects.length === 0 ? (
              <p className="text-muted mt-4">
                Aucun projet enregistré. Lance une simulation depuis le simulateur pour en sauvegarder un.
              </p>
            ) : (
              <div className="table-container" style={{ marginTop: 12 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Bien</th>
                      <th>Ville</th>
                      <th style={{ textAlign: 'right' }}>Prix</th>
                      <th style={{ textAlign: 'right' }}>Loyer / mois</th>
                      <th style={{ textAlign: 'right' }}>Rentabilité brute</th>
                      <th style={{ textAlign: 'right' }}>Cash flow / mois</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => {
                      const gross = grossYield(p.purchase || {}).valueOf?.() ||
                        grossYield({ monthlyRent: p?.rental?.monthlyRent, ...p?.purchase });
                      const cf = monthlyCashFlow({
                        ...p.rental,
                        ...p.purchase,
                        loanPrincipal: (p?.purchase?.price || 0) - (p?.purchase?.downPayment || 0),
                        loanRate: p?.purchase?.financingMonthlyRate,
                        loanYears: p?.purchase?.loanDuration,
                      });
                      return (
                        <tr key={p.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{p.label || 'Sans nom'}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {p.surface ? `${p.surface} m²` : '—'}
                              {p.rooms ? ` · ${p.rooms} p.` : ''}
                            </div>
                          </td>
                          <td>
                            {p.city || '—'} <Building2 size={12} style={{ verticalAlign: 'middle' }} />
                          </td>
                          <td style={{ textAlign: 'right' }}>{formatEUR(p?.purchase?.price)}</td>
                          <td style={{ textAlign: 'right' }}>{formatEUR(p?.rental?.monthlyRent)}</td>
                          <td style={{ textAlign: 'right' }}>{formatPercent(gross, { digits: 2 })}</td>
                          <td
                            style={{
                              textAlign: 'right',
                              fontWeight: 600,
                              color: cf >= 0 ? 'var(--accent)' : 'var(--negative)',
                            }}
                          >
                            {formatEUR(cf)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '6px 10px' }}
                              onClick={() => {
                                if (confirm(`Supprimer le projet "${p.label}" ?`)) {
                                  removeProject(p.id);
                                }
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default RealEstate;
