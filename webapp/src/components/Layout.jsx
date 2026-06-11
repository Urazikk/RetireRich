import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ToastProvider } from '../context/ToastContext.jsx';
import {
  LayoutDashboard,
  Briefcase,
  Wallet,
  Lightbulb,
  TrendingUp,
  Building2,
  Receipt,
  Settings,
  Loader2,
} from 'lucide-react';

const PageLoader = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      color: 'var(--text-muted)',
    }}
  >
    <Loader2 size={24} className="animate-spin" />
  </div>
);

const Logo = () => (
  <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="RetireRich">
    <rect width="34" height="34" rx="8" fill="#0a0a0a" />
    <path
      d="M8 23 L13 18 L17 21 L22 13 L26 16"
      stroke="#ffffff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <circle cx="26" cy="16" r="2.2" fill="#22c55e" />
  </svg>
);

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/investments', label: 'Mes Investissements', icon: Briefcase },
  { to: '/expenses', label: 'Mes Dépenses', icon: Wallet },
  { to: '/advice', label: 'Conseil', icon: Lightbulb },
  { to: '/projections', label: 'Projections', icon: TrendingUp },
  { to: '/real-estate', label: 'Immobilier', icon: Building2 },
  { to: '/tax', label: 'Impôts', icon: Receipt },
  { to: '/settings', label: 'Réglages', icon: Settings },
];

const Layout = () => (
  <ToastProvider>
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Logo />
        </div>
        <nav className="nav-links">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  </ToastProvider>
);

export default Layout;
