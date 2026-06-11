import { Link } from 'react-router-dom';

// Carte d'entrée vers un outil. icon = composant Lucide.
const ToolCard = ({ to, icon: Icon, title, description }) => (
  <Link
    to={to}
    className="glass-panel interactive"
    style={{ display: 'block', flex: 1, minWidth: 200, textDecoration: 'none', color: 'inherit' }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
      <Icon size={20} />
      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{title}</span>
    </div>
    <p className="text-muted" style={{ margin: 0, fontSize: '0.84rem' }}>{description}</p>
  </Link>
);

export default ToolCard;
