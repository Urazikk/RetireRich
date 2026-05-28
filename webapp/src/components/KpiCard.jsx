import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

const KpiCard = ({ label, value, trend, trendLabel }) => {
  const trendNum = Number(trend);
  const positive = trendNum >= 0;
  return (
    <div className="glass-panel kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
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
