import { useContext } from 'react';
import { PortfolioContext } from './portfolio-context.js';

export const usePortfolio = () => {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error('usePortfolio must be used within PortfolioProvider');
  return ctx;
};
