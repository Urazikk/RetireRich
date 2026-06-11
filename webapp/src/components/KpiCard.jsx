import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useCountUp } from '../utils/useCountUp.js';

// `value` peut être une string déjà formatée (statique) ou un nombre.
// Si `value` est un nombre, il est animé en count-up et rendu via `format`.
const KpiCard = ({ label, value, format, trend, trendLabel }) => {
  const isNumeric = typeof value === 'number' && Number.isFinite(value);
  const animated = useCountUp(isNumeric ? value : 0);
  const display = isNumeric ? (format ? format(animated) : Math.round(animated)) : value;
  const trendNum = Number(trend);
  const positive = trendNum >= 0;
  return (
    <div className="glass-panel kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{display}</div>
      {trend !== undefined && trend !== null && !Number.isNaN(trendNum) && (
        <div className={positive ? 'trend-positive' : 'trend-negative'}>
          {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <span>{trendLabel ?? `${positive ? '+' : ''}${trendNum.toFixed(2)} %`}</span>
        </div>
      )}
    </div>
  );
};

export default KpiCard;
