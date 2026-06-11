import { Pencil, Trash2, Building2 } from 'lucide-react';
import { projectMetrics } from '../utils/realEstatePortfolio.js';
import { formatEUR, formatPercent } from '../utils/format.js';

const ProjectCard = ({ project, onEdit, onDelete }) => {
  const m = projectMetrics(project);
  return (
    <div className="glass-panel interactive" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="flex-between" style={{ alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: 'var(--text)' }}>{project.label || 'Sans nom'}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            {project.surface ? `${project.surface} m²` : '—'}
            {project.rooms ? ` · ${project.rooms} p.` : ''}
            {project.city ? <> · <Building2 size={11} /> {project.city}</> : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => onEdit(project.id)}
            title="Modifier ce projet"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => { if (window.confirm(`Supprimer le projet "${project.label || ''}" ?`)) onDelete(project.id); }}
            title="Supprimer ce projet"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Prix <strong style={{ color: 'var(--text)' }}>{formatEUR(project?.purchase?.price)}</strong>
        {' · '}Loyer <strong style={{ color: 'var(--text)' }}>{formatEUR(project?.rental?.monthlyRent)}</strong>/mois
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Rentab. <strong style={{ color: 'var(--text)' }}>{formatPercent(m.grossYield, { digits: 1 })}</strong> brute
        {' · '}<strong style={{ color: 'var(--text)' }}>{formatPercent(m.netYield, { digits: 1 })}</strong> nette
      </div>
      <div style={{ fontWeight: 700, color: m.cashFlow >= 0 ? 'var(--accent)' : 'var(--negative)' }}>
        Cash-flow {m.cashFlow >= 0 ? '+' : ''}{formatEUR(m.cashFlow)}/mois
      </div>
    </div>
  );
};

export default ProjectCard;
