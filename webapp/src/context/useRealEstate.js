import { useContext } from 'react';
import { RealEstateContext } from './real-estate-context.js';

export const useRealEstate = () => {
  const ctx = useContext(RealEstateContext);
  if (!ctx) throw new Error('useRealEstate must be used within RealEstateProvider');
  return ctx;
};
