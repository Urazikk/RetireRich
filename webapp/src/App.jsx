import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import HistoryRecorder from './components/HistoryRecorder.jsx';
import { PortfolioProvider } from './context/PortfolioContext.jsx';
import { RealEstateProvider } from './context/RealEstateContext.jsx';

// Lazy-loaded routes — splits Recharts/Leaflet out of the initial bundle
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Investments = lazy(() => import('./pages/investments/Investments.jsx'));
const FeeComparator = lazy(() => import('./pages/investments/FeeComparator.jsx'));
const Explorer = lazy(() => import('./pages/investments/Explorer.jsx'));
const AssetDetail = lazy(() => import('./pages/investments/AssetDetail.jsx'));
const Expenses = lazy(() => import('./pages/expenses/Expenses.jsx'));
const Recurring = lazy(() => import('./pages/expenses/Recurring.jsx'));
const CashCalendar = lazy(() => import('./pages/expenses/CashCalendar.jsx'));
const Conseil = lazy(() => import('./pages/advice/Conseil.jsx'));
const Projections = lazy(() => import('./pages/projections/Projections.jsx'));
const ImpotRevenu = lazy(() => import('./pages/tax/ImpotRevenu.jsx'));
const RealEstate = lazy(() => import('./pages/real-estate/RealEstate.jsx'));
const Simulator = lazy(() => import('./pages/real-estate/Simulator.jsx'));
const SimulatorWizard = lazy(() => import('./pages/real-estate/SimulatorWizard.jsx'));
const ListingAnalyzer = lazy(() => import('./pages/real-estate/ListingAnalyzer.jsx'));
const MarketExplorer = lazy(() => import('./pages/real-estate/MarketExplorer.jsx'));
const Settings = lazy(() => import('./pages/settings/Settings.jsx'));

const App = () => (
  <PortfolioProvider>
    <RealEstateProvider>
      <HistoryRecorder />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="investments" element={<Investments />} />
          <Route path="investments/fees" element={<FeeComparator />} />
          <Route path="investments/explorer" element={<Explorer />} />
          <Route path="investments/asset/:ticker" element={<AssetDetail />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="expenses/recurring" element={<Recurring />} />
          <Route path="expenses/calendar" element={<CashCalendar />} />
          <Route path="advice" element={<Conseil />} />
          <Route path="projections" element={<Projections />} />
          <Route path="real-estate" element={<RealEstate />} />
          <Route path="real-estate/market" element={<RealEstate />} />
          <Route path="real-estate/simulator" element={<SimulatorWizard />} />
          <Route path="real-estate/simulator-advanced" element={<Simulator />} />
          <Route path="real-estate/analyze" element={<ListingAnalyzer />} />
          <Route path="real-estate/explorer" element={<MarketExplorer />} />
          <Route path="tax" element={<ImpotRevenu />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </RealEstateProvider>
  </PortfolioProvider>
);

export default App;
