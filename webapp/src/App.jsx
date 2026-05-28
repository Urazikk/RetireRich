import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { PortfolioProvider } from './context/PortfolioContext.jsx';
import { RealEstateProvider } from './context/RealEstateContext.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Investments from './pages/investments/Investments.jsx';
import FeeComparator from './pages/investments/FeeComparator.jsx';
import Explorer from './pages/investments/Explorer.jsx';
import AssetDetail from './pages/investments/AssetDetail.jsx';
import Expenses from './pages/expenses/Expenses.jsx';
import Conseil from './pages/advice/Conseil.jsx';
import Projections from './pages/projections/Projections.jsx';
import ImpotRevenu from './pages/tax/ImpotRevenu.jsx';
import RealEstate from './pages/real-estate/RealEstate.jsx';
import MarketSearch from './pages/real-estate/MarketSearch.jsx';
import Simulator from './pages/real-estate/Simulator.jsx';

const App = () => (
  <PortfolioProvider>
    <RealEstateProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="investments" element={<Investments />} />
          <Route path="investments/fees" element={<FeeComparator />} />
          <Route path="investments/explorer" element={<Explorer />} />
          <Route path="investments/asset/:ticker" element={<AssetDetail />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="advice" element={<Conseil />} />
          <Route path="projections" element={<Projections />} />
          <Route path="real-estate" element={<RealEstate />} />
          <Route path="real-estate/market" element={<MarketSearch />} />
          <Route path="real-estate/simulator" element={<Simulator />} />
          <Route path="tax" element={<ImpotRevenu />} />
        </Route>
      </Routes>
    </RealEstateProvider>
  </PortfolioProvider>
);

export default App;
