import { useCallback, useMemo } from 'react';
import { useLocalStorageState } from '../utils/useLocalStorageState.js';
import { PortfolioContext } from './portfolio-context.js';

const STORAGE = {
  accounts: 'retirerich_accounts',
  assets: 'retirerich_assets',
  history: 'retirerich_history',
  cashFlows: 'retirerich_cashflows',
};

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const PortfolioProvider = ({ children }) => {
  const [accounts, setAccounts] = useLocalStorageState(STORAGE.accounts, []);
  const [assets, setAssets] = useLocalStorageState(STORAGE.assets, []);
  const [history, setHistory] = useLocalStorageState(STORAGE.history, []);
  const [cashFlows, setCashFlows] = useLocalStorageState(STORAGE.cashFlows, []);

  const addAccount = useCallback((account) => {
    const entry = { id: uid(), createdAt: new Date().toISOString(), ...account };
    setAccounts((prev) => [...prev, entry]);
    return entry;
  }, [setAccounts]);

  const updateAccount = useCallback((id, patch) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }, [setAccounts]);

  const removeAccount = useCallback((id) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    setAssets((prev) => prev.filter((a) => a.accountId !== id));
  }, [setAccounts, setAssets]);

  const addAsset = useCallback((asset) => {
    const entry = { id: uid(), createdAt: new Date().toISOString(), ...asset };
    setAssets((prev) => [...prev, entry]);
    return entry;
  }, [setAssets]);

  const updateAsset = useCallback((id, patch) => {
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }, [setAssets]);

  const removeAsset = useCallback((id) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }, [setAssets]);

  const totals = useMemo(() => {
    const totalInvested = assets.reduce(
      (sum, a) => sum + (Number(a.quantity) || 0) * (Number(a.purchasePrice) || 0),
      0,
    );
    const totalCurrent = assets.reduce(
      (sum, a) => sum + (Number(a.quantity) || 0) * (Number(a.currentPrice) || Number(a.purchasePrice) || 0),
      0,
    );
    const cashTotal = accounts
      .filter((a) => ['Livret A', 'LDDS', 'LEP'].includes(a.type))
      .reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
    return {
      totalInvested,
      totalCurrent,
      cashTotal,
      patrimoine: totalCurrent + cashTotal,
      pnl: totalCurrent - totalInvested,
      pnlPct: totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0,
    };
  }, [accounts, assets]);

  const value = useMemo(
    () => ({
      accounts,
      assets,
      history,
      cashFlows,
      totals,
      addAccount,
      updateAccount,
      removeAccount,
      addAsset,
      updateAsset,
      removeAsset,
      setHistory,
      setCashFlows,
    }),
    [
      accounts,
      assets,
      history,
      cashFlows,
      totals,
      addAccount,
      updateAccount,
      removeAccount,
      addAsset,
      updateAsset,
      removeAsset,
      setHistory,
      setCashFlows,
    ],
  );

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
};
