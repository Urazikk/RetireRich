import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocalStorageState } from '../../utils/useLocalStorageState.js';
import { formatEUR } from '../../utils/format.js';
import KpiCard from '../../components/KpiCard.jsx';

const FRENCH_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

const startWeekday = (year, month) => {
  // 0 (Mon) - 6 (Sun)
  const d = new Date(year, month, 1).getDay();
  return (d + 6) % 7;
};

const CashCalendar = () => {
  const [recurring] = useLocalStorageState('retirerich_recurring', []);
  const [startBalance, setStartBalance] = useLocalStorageState(
    'retirerich_cash_start_balance',
    0,
  );

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const total = daysInMonth(year, month);
  const offset = startWeekday(year, month);

  const dailyBalance = useMemo(() => {
    let balance = Number(startBalance) || 0;
    const series = [];
    for (let d = 1; d <= total; d++) {
      const events = recurring.filter((r) => r.day === d);
      const dayIncome = events
        .filter((e) => e.type === 'income')
        .reduce((s, e) => s + Number(e.amount), 0);
      const dayExpense = events
        .filter((e) => e.type === 'expense')
        .reduce((s, e) => s + Number(e.amount), 0);
      balance = balance + dayIncome - dayExpense;
      series.push({
        day: d,
        balance,
        income: dayIncome,
        expense: dayExpense,
        events,
      });
    }
    return series;
  }, [recurring, startBalance, total]);

  const lowestDay = useMemo(() => {
    if (!dailyBalance.length) return null;
    return dailyBalance.reduce((min, d) => (d.balance < min.balance ? d : min), dailyBalance[0]);
  }, [dailyBalance]);

  const totalIncome = recurring
    .filter((r) => r.type === 'income')
    .reduce((s, r) => s + Number(r.amount), 0);
  const totalExpense = recurring
    .filter((r) => r.type === 'expense')
    .reduce((s, r) => s + Number(r.amount), 0);
  const endOfMonth = dailyBalance.at(-1)?.balance ?? (Number(startBalance) || 0);

  const monthLabel = new Date(year, month, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  const goPrev = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };
  const goNext = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const isToday = (d) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  return (
    <>
      <header className="header">
        <div>
          <Link
            to="/expenses"
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.82rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 8,
            }}
          >
            <ArrowLeft size={14} /> Retour
          </Link>
          <h1>Calendrier</h1>
          <p className="text-muted">Projection du solde jour par jour à partir de tes récurrences</p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={goPrev}>
            <ChevronLeft size={14} />
          </button>
          <div
            style={{
              minWidth: 160,
              textAlign: 'center',
              fontWeight: 600,
              textTransform: 'capitalize',
            }}
          >
            {monthLabel}
          </div>
          <button className="btn btn-secondary" onClick={goNext}>
            <ChevronRight size={14} />
          </button>
        </div>
      </header>

      {recurring.length === 0 && (
        <div className="glass-panel" style={{ marginBottom: 20 }}>
          <p>
            Tu n'as pas encore de récurrences déclarées.{' '}
            <Link to="/expenses/recurring">Configure-les ici</Link> pour activer le calendrier.
          </p>
        </div>
      )}

      <div className="dashboard-grid">
        <div className="col-span-3">
          <KpiCard label="Solde de départ" value={formatEUR(Number(startBalance) || 0)} />
        </div>
        <div className="col-span-3">
          <KpiCard
            label="Revenus du mois"
            value={formatEUR(totalIncome)}
          />
        </div>
        <div className="col-span-3">
          <KpiCard label="Sorties du mois" value={formatEUR(totalExpense)} />
        </div>
        <div className="col-span-3">
          <KpiCard
            label="Solde projeté fin de mois"
            value={formatEUR(endOfMonth)}
            trend={endOfMonth - (Number(startBalance) || 0)}
            trendLabel={
              endOfMonth - (Number(startBalance) || 0) >= 0 ? 'Épargne nette' : 'Cash négatif'
            }
          />
        </div>

        <div className="col-span-12">
          <div className="glass-panel">
            <div className="flex-between" style={{ marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>Solde projeté</h3>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Solde du compte au 1er :
                </span>
                <input
                  type="number"
                  value={startBalance}
                  onChange={(e) => setStartBalance(Number(e.target.value) || 0)}
                  style={{ width: 140, padding: '6px 10px' }}
                />
              </div>
            </div>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyBalance}>
                  <defs>
                    <linearGradient id="gradCash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="day" stroke="#6b6b6b" fontSize={12} />
                  <YAxis
                    stroke="#6b6b6b"
                    fontSize={12}
                    tickFormatter={(v) => formatEUR(v, { compact: true })}
                  />
                  <Tooltip
                    formatter={(v) => formatEUR(v)}
                    labelFormatter={(v) => `Jour ${v}`}
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid rgba(0,0,0,0.08)',
                      borderRadius: 8,
                    }}
                  />
                  <ReferenceLine y={0} stroke="rgba(0,0,0,0.2)" strokeDasharray="3 3" />
                  <Area
                    type="stepAfter"
                    dataKey="balance"
                    stroke="#0a0a0a"
                    strokeWidth={2}
                    fill="url(#gradCash)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {lowestDay && lowestDay.balance < 0 && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 8,
                  fontSize: '0.88rem',
                }}
              >
                ⚠️ Ton solde devient négatif au <b>jour {lowestDay.day}</b> ({formatEUR(lowestDay.balance)}
                ). Revoyez les dates ou augmentez le solde de départ.
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12">
          <div className="glass-panel">
            <h3 style={{ marginBottom: 12 }}>Vue mensuelle</h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 6,
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              {FRENCH_DAYS.map((d) => (
                <div key={d} style={{ textAlign: 'center' }}>
                  {d}
                </div>
              ))}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 6,
              }}
            >
              {Array.from({ length: offset }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {dailyBalance.map((d) => {
                const negative = d.balance < 0;
                const hasEvents = d.events.length > 0;
                return (
                  <div
                    key={d.day}
                    style={{
                      minHeight: 84,
                      padding: 8,
                      borderRadius: 8,
                      border: `1px solid ${isToday(d.day) ? 'var(--text)' : 'var(--border)'}`,
                      background: isToday(d.day) ? 'var(--bg-subtle)' : 'var(--bg)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{d.day}</span>
                      {hasEvents && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background:
                              d.income > d.expense ? 'var(--accent)' : 'var(--negative)',
                          }}
                        />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      {d.events.slice(0, 2).map((e, i) => (
                        <div
                          key={i}
                          style={{
                            fontSize: '0.7rem',
                            color: e.type === 'income' ? 'var(--accent)' : 'var(--text-muted)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {e.type === 'income' ? '+' : '−'}
                          {Number(e.amount).toFixed(0)}€ {e.label}
                        </div>
                      ))}
                      {d.events.length > 2 && (
                        <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                          +{d.events.length - 2} autres
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        color: negative ? 'var(--negative)' : 'var(--text)',
                        textAlign: 'right',
                      }}
                    >
                      {formatEUR(d.balance, { compact: true })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CashCalendar;
