import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { ArrowLeft, Loader2, Search, Sparkles } from 'lucide-react';
import { searchDvf } from '../../utils/dvfApi.js';
import {
  breakEvenLoanRate,
  breakEvenRent,
  cashFlowAt,
  cashFlowByRate,
  computeListingScore,
  estimateGrossYield,
  estimateMonthlyRent,
  parseListingUrl,
} from '../../utils/listingAnalyzer.js';
import { formatEUR, formatPercent } from '../../utils/format.js';
import KpiCard from '../../components/KpiCard.jsx';

const scoreColor = (score) => {
  if (score >= 75) return 'var(--accent)';
  if (score >= 55) return '#f59e0b';
  return 'var(--negative)';
};

const scoreLabel = (score) => {
  if (score >= 80) return 'Très bonne affaire';
  if (score >= 65) return 'Affaire correcte';
  if (score >= 50) return 'À négocier';
  if (score >= 35) return 'Discutable';
  return 'Mauvaise affaire';
};

const ListingAnalyzer = () => {
  const [url, setUrl] = useState('');
  const [form, setForm] = useState({
    codePostal: '',
    type: 'apt',
    price: 200000,
    surface: 50,
    rooms: 2,
    monthlyRentManual: '',
    notaryFeesPct: 7.5,
    works: 0,
    downPayment: 20000,
    loanRate: 3.5,
    loanYears: 20,
    propertyTax: 800,
    insurance: 200,
    charges: 30,
    mgmtFees: 0,
    vacancyRate: 5,
  });
  const [dvf, setDvf] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleParseUrl = () => {
    if (!url) return;
    const parsed = parseListingUrl(url);
    setForm((p) => ({ ...p, ...parsed }));
  };

  const handleFetchMarket = async () => {
    if (!/^\d{5}$/.test(form.codePostal)) {
      setError('Code postal invalide');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await searchDvf({
        codePostal: form.codePostal,
        type: form.type,
        years: '2023,2024',
        geo: false,
      });
      setDvf(result);
    } catch (err) {
      setError(err?.message || 'Erreur DVF');
    } finally {
      setLoading(false);
    }
  };

  const notaryFees = useMemo(
    () => Math.round((Number(form.price) * Number(form.notaryFeesPct)) / 100),
    [form.price, form.notaryFeesPct],
  );

  const pricePerSqm = useMemo(() => {
    if (!form.surface) return null;
    return Math.round(Number(form.price) / Number(form.surface));
  }, [form.price, form.surface]);

  const estimatedRent = useMemo(() => {
    if (form.monthlyRentManual) return Number(form.monthlyRentManual);
    return (
      estimateMonthlyRent({
        price: Number(form.price),
        codePostal: form.codePostal,
        transactionCountInZone: dvf?.count || 0,
        surface: Number(form.surface),
      }) || 0
    );
  }, [form, dvf]);

  const yieldEstimate = useMemo(
    () =>
      estimateGrossYield({
        codePostal: form.codePostal,
        transactionCountInZone: dvf?.count || 0,
      }),
    [form.codePostal, dvf],
  );

  const baseInputs = useMemo(
    () => ({
      price: Number(form.price),
      notaryFees,
      works: Number(form.works),
      downPayment: Number(form.downPayment),
      loanYears: Number(form.loanYears),
      monthlyRent: estimatedRent,
      charges: Number(form.charges),
      propertyTax: Number(form.propertyTax),
      insurance: Number(form.insurance),
      mgmtFees: Number(form.mgmtFees),
      vacancyRate: Number(form.vacancyRate),
    }),
    [form, notaryFees, estimatedRent],
  );

  const cashFlow = useMemo(
    () => cashFlowAt({ ...baseInputs, loanRate: Number(form.loanRate) }),
    [baseInputs, form.loanRate],
  );

  const beRate = useMemo(() => breakEvenLoanRate(baseInputs), [baseInputs]);
  const beRent = useMemo(
    () => breakEvenRent({ ...baseInputs, loanRate: Number(form.loanRate) }),
    [baseInputs, form.loanRate],
  );

  const cashFlowSeries = useMemo(() => cashFlowByRate(baseInputs), [baseInputs]);

  const scoreResult = useMemo(
    () =>
      computeListingScore({
        askingPrice: Number(form.price),
        marketMedian: dvf?.median,
        pricePerSqm,
        marketPricePerSqm: dvf?.median,
        grossYieldEstimated: estimatedRent > 0 ? (estimatedRent * 12) / Number(form.price) : 0,
        cashFlow,
      }),
    [form.price, dvf, pricePerSqm, estimatedRent, cashFlow],
  );

  const priceDeltaPct = useMemo(() => {
    if (!pricePerSqm || !dvf?.median) return null;
    return ((pricePerSqm - dvf.median) / dvf.median) * 100;
  }, [pricePerSqm, dvf]);

  return (
    <>
      <header className="header">
        <div>
          <Link
            to="/real-estate"
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
          <h1>Analyser une annonce</h1>
          <p className="text-muted">
            Colle l'URL ou remplis les champs — on compare au marché DVF, on estime le loyer et on
            calcule le break-even du taux d'emprunt
          </p>
        </div>
      </header>

      <div className="glass-panel">
        <div className="input-group" style={{ marginBottom: 12 }}>
          <label>URL de l'annonce (SeLoger, LeBonCoin, Bien'ici…)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.seloger.com/annonces/achat/..."
              style={{ flex: 1 }}
            />
            <button type="button" className="btn btn-secondary" onClick={handleParseUrl}>
              <Sparkles size={14} /> Extraire
            </button>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            On extrait ce qui est visible dans l'URL (code postal, type, surface, T1/T2). Le reste
            est à remplir manuellement.
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
            marginTop: 12,
          }}
        >
          <Field label="Code postal">
            <input
              value={form.codePostal}
              onChange={(e) =>
                setForm((p) => ({ ...p, codePostal: e.target.value.replace(/\D/g, '').slice(0, 5) }))
              }
              placeholder="75011"
            />
          </Field>
          <Field label="Type">
            <select
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
            >
              <option value="apt">Appartement</option>
              <option value="maison">Maison</option>
            </select>
          </Field>
          <Field label="Prix demandé (€)">
            <input
              type="number"
              value={form.price}
              onChange={(e) => setForm((p) => ({ ...p, price: Number(e.target.value) || 0 }))}
            />
          </Field>
          <Field label="Surface (m²)">
            <input
              type="number"
              value={form.surface}
              onChange={(e) => setForm((p) => ({ ...p, surface: Number(e.target.value) || 0 }))}
            />
          </Field>
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-primary" onClick={handleFetchMarket} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Comparer au marché DVF
          </button>
        </div>
        {error && <p style={{ marginTop: 12, color: 'var(--negative)' }}>{error}</p>}
      </div>

      <div className="dashboard-grid">
        <div className="col-span-3">
          <KpiCard
            label="Score d'investissement"
            value={`${scoreResult.score}/100`}
            trendLabel={scoreLabel(scoreResult.score)}
            trend={scoreResult.score - 50}
          />
        </div>
        <div className="col-span-3">
          <KpiCard label="Prix / m²" value={pricePerSqm ? formatEUR(pricePerSqm) : '—'} />
        </div>
        <div className="col-span-3">
          <KpiCard
            label={dvf ? `Médiane DVF (${form.codePostal})` : 'Médiane DVF'}
            value={dvf?.median ? formatEUR(dvf.median) : '—'}
            trend={priceDeltaPct}
            trendLabel={priceDeltaPct != null ? formatPercent(priceDeltaPct, { digits: 1 }) : ''}
          />
        </div>
        <div className="col-span-3">
          <KpiCard
            label="Loyer estimé"
            value={estimatedRent ? `${formatEUR(estimatedRent)}/mois` : '—'}
            trendLabel={`Rendement ${(yieldEstimate * 100).toFixed(1)} % brut`}
            trend={1}
          />
        </div>

        {scoreResult.breakdown.length > 0 && (
          <div className="col-span-12">
            <div className="glass-panel">
              <div className="flex-between">
                <h3 style={{ margin: 0 }}>Analyse de l'investissement</h3>
                <div
                  style={{
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    padding: '4px 12px',
                    borderRadius: 999,
                    background: `${scoreColor(scoreResult.score)}15`,
                    color: scoreColor(scoreResult.score),
                  }}
                >
                  {scoreLabel(scoreResult.score)}
                </div>
              </div>
              <ul
                style={{
                  marginTop: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {scoreResult.breakdown.map((b, i) => (
                  <li
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontSize: '0.92rem',
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: b.ok ? 'var(--accent)' : 'var(--negative)',
                      }}
                    />
                    {b.text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="col-span-6">
          <div className="glass-panel">
            <h3>Hypothèses de financement</h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginTop: 12,
              }}
            >
              <Field label="Frais notaire (%)">
                <input
                  type="number"
                  step="0.1"
                  value={form.notaryFeesPct}
                  onChange={(e) => setForm((p) => ({ ...p, notaryFeesPct: Number(e.target.value) || 0 }))}
                />
              </Field>
              <Field label="Travaux (€)">
                <input
                  type="number"
                  value={form.works}
                  onChange={(e) => setForm((p) => ({ ...p, works: Number(e.target.value) || 0 }))}
                />
              </Field>
              <Field label="Apport (€)">
                <input
                  type="number"
                  value={form.downPayment}
                  onChange={(e) => setForm((p) => ({ ...p, downPayment: Number(e.target.value) || 0 }))}
                />
              </Field>
              <Field label="Durée prêt (ans)">
                <input
                  type="number"
                  value={form.loanYears}
                  onChange={(e) => setForm((p) => ({ ...p, loanYears: Number(e.target.value) || 0 }))}
                />
              </Field>
              <Field label="Taux du prêt (%)">
                <input
                  type="number"
                  step="0.05"
                  value={form.loanRate}
                  onChange={(e) => setForm((p) => ({ ...p, loanRate: Number(e.target.value) || 0 }))}
                />
              </Field>
              <Field label="Loyer (override €)">
                <input
                  type="number"
                  value={form.monthlyRentManual}
                  onChange={(e) => setForm((p) => ({ ...p, monthlyRentManual: e.target.value }))}
                  placeholder={String(estimatedRent || '')}
                />
              </Field>
            </div>
            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 8,
                background: 'var(--bg-subtle)',
              }}
            >
              <Row label="Frais notaire" value={formatEUR(notaryFees)} />
              <Row label="Loyer pris en compte" value={`${formatEUR(estimatedRent)} / mois`} />
              <Row
                label={`Cash flow à ${form.loanRate} %`}
                value={`${formatEUR(cashFlow)} / mois`}
                color={cashFlow >= 0 ? 'var(--accent)' : 'var(--negative)'}
                bold
              />
            </div>
          </div>
        </div>

        <div className="col-span-6">
          <div className="glass-panel">
            <h3>Charges locatives</h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginTop: 12,
              }}
            >
              <Field label="Taxe foncière (€/an)">
                <input
                  type="number"
                  value={form.propertyTax}
                  onChange={(e) => setForm((p) => ({ ...p, propertyTax: Number(e.target.value) || 0 }))}
                />
              </Field>
              <Field label="Assurance PNO (€/an)">
                <input
                  type="number"
                  value={form.insurance}
                  onChange={(e) => setForm((p) => ({ ...p, insurance: Number(e.target.value) || 0 }))}
                />
              </Field>
              <Field label="Charges (€/mois)">
                <input
                  type="number"
                  value={form.charges}
                  onChange={(e) => setForm((p) => ({ ...p, charges: Number(e.target.value) || 0 }))}
                />
              </Field>
              <Field label="Vacance locative (%)">
                <input
                  type="number"
                  value={form.vacancyRate}
                  onChange={(e) => setForm((p) => ({ ...p, vacancyRate: Number(e.target.value) || 0 }))}
                />
              </Field>
              <Field label="Gestion locative (%)">
                <input
                  type="number"
                  value={form.mgmtFees}
                  onChange={(e) => setForm((p) => ({ ...p, mgmtFees: Number(e.target.value) || 0 }))}
                />
              </Field>
            </div>
            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 8,
                background: 'var(--bg-subtle)',
              }}
            >
              <Row
                label="Taux max pour cash flow ≥ 0"
                value={beRate != null ? `${beRate.toFixed(2)} %` : 'Jamais positif'}
                bold
                color={beRate != null ? 'var(--accent)' : 'var(--negative)'}
              />
              <Row
                label={`Loyer min à ${form.loanRate} %`}
                value={`${formatEUR(beRent)} / mois`}
              />
            </div>
          </div>
        </div>

        <div className="col-span-12">
          <div className="glass-panel">
            <h3>Cash flow en fonction du taux d'emprunt</h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Le graphe croise zéro au <b>taux d'équilibre</b>. Au-dessus, tu mets de l'argent
              chaque mois ; en dessous, le bien s'autofinance.
            </p>
            <div style={{ height: 320, marginTop: 16 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cashFlowSeries}>
                  <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis
                    dataKey="rate"
                    stroke="#6b6b6b"
                    fontSize={12}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    stroke="#6b6b6b"
                    fontSize={12}
                    tickFormatter={(v) => `${v}€`}
                  />
                  <Tooltip
                    formatter={(v) => `${v} €/mois`}
                    labelFormatter={(v) => `Taux ${v}%`}
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid rgba(0,0,0,0.08)',
                      borderRadius: 8,
                    }}
                  />
                  <ReferenceLine y={0} stroke="rgba(0,0,0,0.2)" strokeDasharray="3 3" />
                  {beRate != null && (
                    <ReferenceLine
                      x={beRate}
                      stroke="var(--accent)"
                      strokeDasharray="4 4"
                      label={{ value: `Équilibre: ${beRate}%`, position: 'top', fontSize: 11 }}
                    />
                  )}
                  <ReferenceLine
                    x={Number(form.loanRate)}
                    stroke="#0a0a0a"
                    strokeWidth={1.5}
                    label={{ value: 'Taux actuel', position: 'insideTopRight', fontSize: 11 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cashFlow"
                    stroke="#0a0a0a"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="col-span-12">
          <div className="glass-panel" style={{ background: 'var(--bg-subtle)' }}>
            <h3 style={{ margin: 0 }}>Méthode d'estimation du loyer</h3>
            <p style={{ marginTop: 8, fontSize: '0.9rem' }}>
              L'estimation du loyer utilise des rendements bruts moyens par zone, calibrés sur les
              observations 2023-2025 (sources : Notaires de France, MeilleursAgents, Clameur).
              Paris 75 ≈ 3,4 %, petite couronne ≈ 4,2 %, métropoles régionales ≈ 4,5-5 %, villes
              moyennes ≈ 6 %, rural ≈ 7-8 %. Ajuste manuellement la case <b>Loyer (override)</b> si
              tu as une meilleure donnée.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

const Field = ({ label, children }) => (
  <div className="input-group" style={{ marginBottom: 0 }}>
    <label>{label}</label>
    {children}
  </div>
);

const Row = ({ label, value, color, bold }) => (
  <div className="flex-between" style={{ padding: '6px 0' }}>
    <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{label}</span>
    <span
      style={{
        fontWeight: bold ? 700 : 500,
        color: color || 'var(--text)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {value}
    </span>
  </div>
);

export default ListingAnalyzer;
