import { useEffect } from 'react';
import { usePortfolio } from '../context/usePortfolio.js';
import { todayKey, withSnapshot } from '../utils/patrimoineHistory.js';

// Enregistre un point quotidien du patrimoine dans `history` (rendu nul).
const HistoryRecorder = () => {
  const { totals, setHistory } = usePortfolio();
  const { patrimoine, totalInvested } = totals;

  useEffect(() => {
    if (!(patrimoine > 0)) return;
    setHistory((prev) =>
      withSnapshot(prev, {
        date: todayKey(),
        value: Math.round(patrimoine),
        invested: Math.round(totalInvested),
      }),
    );
  }, [patrimoine, totalInvested, setHistory]);

  return null;
};

export default HistoryRecorder;
