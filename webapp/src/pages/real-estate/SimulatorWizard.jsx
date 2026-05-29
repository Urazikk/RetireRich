import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Save,
  Sparkles,
} from 'lucide-react';
import { useRealEstate } from '../../context/RealEstateContext.jsx';
import { searchDvf } from '../../utils/dvfApi.js';
import { fetchRentEstimate } from '../../utils/rentApi.js';
import {
  breakEvenLoanRate,
  breakEvenRent,
  cashFlowAt,
  cashFlowByRate,
  computeListingScore,
} from '../../utils/listingAnalyzer.js';
import {
  grossYield,
  netYield,
  monthlyLoanPayment,
  totalInvestment,
} from '../../utils/realEstateMath.js';
import { formatEUR, formatPercent } from '../../utils/format.js';
import KpiCard from '../../components/KpiCard.jsx';

const STEPS = [
  { id: 'bien', label: 'Bien' },
  { id: 'financement', label: 'Financement' },
  { id: 'location', label: 'Location' },
  { id: 'results', label: 'Résultats' },
];

const SimulatorWizard = () => {
  const navigate = useNavigate();
  const { addProject } = useRealEstate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    label: '',
    city: '',
    codePostal: '',
    type: 'apt',
    surface: 50,
    rooms: 2,
    price: 200000,
    notaryFeesPct: 7.5,
    works: 0,
    downPayment: 20000,
    loanRate: 3.5,
    loanYears: 20,
    monthlyRent: 0,
    monthlyRentOverride: '',
    propertyTax: 800,
    insurance: 200,
    charges: 30,
    vacancyRate: 5,
    mgmtFees: 0,
  });
  const [dvf, setDvf] = useState(null);
  const [rentEstimate, setRentEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [marketError, setMarketError] = useState(null);

  // Fetch market data when codePostal + surface are set
  const fetchMarket = async () => {
    if (!/^\d{5}$/.test(form.codePostal)) {
      setMarketError('Code postal invalide');
      return;
    }
    setLoading(true);
    setMarketError(null);
    try {
      const [dvfRes, rentRes] = await Promise.all([
        searchDvf({ codePostal: form.codePostal, type: form.type, years: '2023,2024', geo: false }),
        fetchRentEstimate({ codePostal: form.codePostal, type: form.type, rooms: form.rooms }),
      ]);
      setDvf(dvfRes);
      setRentEstimate(rentRes);

      // Auto-fill rent estimate if available
      if (rentRes?.extrapolated?.median && form.surface > 0 && !form.monthlyRentOverride) {
        const estimated = Math.round(rentRes.extrapolated.median * form.surface);
        setForm((p) => ({ ...p, monthlyRent: estimated }));
      }
    } catch (err) {
      setMarketError(err?.message || 'Erreur de récupération');
    } finally {
      setLoading(false);
    }
  };

  const notaryFees = useMemo(
    () => Math.round((Number(form.price) * Number(form.notaryFeesPct)) / 100),
    [form.price, form.notaryFeesPct],
  );

  const effectiveRent = useMemo(() => {
    if (form.monthlyRentOverride) return Number(form.monthlyRentOverride);
    if (form.monthlyRent > 0) return form.monthlyRent;
    if (rentEstimate?.extrapolated?.median && form.surface) {
      return Math.round(rentEstimate.extrapolated.median * form.surface);
    }
    return 0;
  }, [form, rentEstimate]);

  const baseInputs = useMemo(
    () => ({
      price: Number(form.price),
      notaryFees,
      works: Number(form.works),
      downPayment: Number(form.downPayment),
      loanYears: Number(form.loanYears),
      monthlyRent: effectiveRent,
      charges: Number(form.charges),
      propertyTax: Number(form.propertyTax),
      insurance: Number(form.insurance),
      mgmtFees: Number(form.mgmtFees),
      vacancyRate: Number(form.vacancyRate),
    }),
    [form, notaryFees, effectiveRent],
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

  // Max purchase price for cash flow ≥ 0 at current loan rate + estimated rent
  const maxPrice = useMemo(() => {
    if (!effectiveRent) return null;
    let lo = 10000;
    let hi = 5000000;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      const nf = (mid * form.notaryFeesPct) / 100;
      const cf = cashFlowAt({
        ...baseInputs,
        price: mid,
        notaryFees: nf,
      });
      if (cf >= 0) lo = mid;
      else hi = mid;
    }
    return Math.round(lo);
  }, [baseInputs, effectiveRent, form.notaryFeesPct]);

  const series = useMemo(() => cashFlowByRate(baseInputs), [baseInputs]);

  const cashOnCash = useMemo(() => {
    if (!form.downPayment || form.downPayment <= 0) return 0;
    return ((cashFlow * 12) / Number(form.downPayment)) * 100;
  }, [cashFlow, form.downPayment]);

  const gross = grossYield({ ...baseInputs });
  const net = netYield({ ...baseInputs });

  const pricePerSqm = useMemo(() => {
    if (!form.surface) return null;
    return Math.round(form.price / form.surface);
  }, [form.price, form.surface]);

  const score = useMemo(
    () =>
      computeListingScore({
        askingPrice: Number(form.price),
        marketMedian: dvf?.median,
        pricePerSqm,
        marketPricePerSqm: dvf?.median,
        grossYieldEstimated: gross / 100,
        cashFlow,
      }),
    [form.price, dvf, pricePerSqm, gross, cashFlow],
  );

  const handleSave = () => {
    if (!form.label) {
      alert('Donne un nom au projet avant de sauvegarder.');
      return;
    }
    addProject({
      label: form.label,
      city: form.city || rentEstimate?.commune || dvf?.center?.city || '',
      postalCode: form.codePostal,
      surface: Number(form.surface),
      rooms: Number(form.rooms),
      type: form.type,
      purchase: {
        price: Number(form.price),
        notaryFees,
        works: Number(form.works),
        downPayment: Number(form.downPayment),
        financingMonthlyRate: Number(form.loanRate),
        loanDuration: Number(form.loanYears),
      },
      rental: {
        monthlyRent: effectiveRent,
        vacancyRate: Number(form.vacancyRate),
        charges: Number(form.charges),
        propertyTax: Number(form.propertyTax),
        insurance: Number(form.insurance),
        mgmtFees: Number(form.mgmtFees),
      },
    });
    navigate('/real-estate');
  };

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

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
          <h1>Nouveau projet locatif</h1>
          <p className="text-muted">Wizard : on construit la simulation étape par étape</p>
        </div>
      </header>

      {/* Stepper */}
      <div className="glass-panel" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flex: 1,
                opacity: i > step ? 0.4 : 1,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: i < step ? 'var(--accent)' : i === step ? 'var(--text)' : 'var(--bg-subtle)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                }}
              >
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span style={{ fontWeight: i === step ? 600 : 500, fontSize: '0.9rem' }}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    background: i < step ? 'var(--accent)' : 'var(--border)',
                    marginRight: 8,
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-grid">
        {/* STEP 1: BIEN */}
        {step === 0 && (
          <div className="col-span-12">
            <div className="glass-panel">
              <h3>Le bien</h3>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Renseigne la localisation et les caractéristiques du bien que tu envisages.
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 12,
                  marginTop: 16,
                }}
              >
                <Field label="Nom du projet">
                  <input
                    value={form.label}
                    onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                    placeholder="Ex : T2 Lyon Croix-Rousse"
                  />
                </Field>
                <Field label="Ville (optionnel)">
                  <input
                    value={form.city}
                    onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                    placeholder="Lyon"
                  />
                </Field>
                <Field label="Code postal">
                  <input
                    value={form.codePostal}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, codePostal: e.target.value.replace(/\D/g, '').slice(0, 5) }))
                    }
                    placeholder="69004"
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
                <Field label="Surface (m²)">
                  <input
                    type="number"
                    value={form.surface}
                    onChange={(e) => setForm((p) => ({ ...p, surface: Number(e.target.value) || 0 }))}
                  />
                </Field>
                <Field label="Pièces">
                  <input
                    type="number"
                    value={form.rooms}
                    onChange={(e) => setForm((p) => ({ ...p, rooms: Number(e.target.value) || 0 }))}
                  />
                </Field>
                <Field label="Prix d'achat (€)">
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm((p) => ({ ...p, price: Number(e.target.value) || 0 }))}
                  />
                </Field>
              </div>

              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={fetchMarket}
                  disabled={loading}
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Estimer le marché (DVF + Carte des Loyers)
                </button>
              </div>
              {marketError && <p style={{ color: 'var(--negative)', marginTop: 8 }}>{marketError}</p>}

              {(dvf?.median || rentEstimate?.extrapolated?.median) && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 14,
                    background: 'var(--bg-subtle)',
                    borderRadius: 8,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 12,
                  }}
                >
                  {dvf?.median && (
                    <div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Prix médian DVF
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                        {formatEUR(dvf.median)}/m²
                      </div>
                      {pricePerSqm && (
                        <div
                          style={{
                            fontSize: '0.78rem',
                            color: pricePerSqm > dvf.median ? 'var(--negative)' : 'var(--accent)',
                          }}
                        >
                          Ton bien : {formatEUR(pricePerSqm)}/m² (
                          {(((pricePerSqm - dvf.median) / dvf.median) * 100).toFixed(0)} %)
                        </div>
                      )}
                    </div>
                  )}
                  {rentEstimate?.extrapolated?.median && (
                    <div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Loyer estimé 2026 (carte des loyers + IRL)
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                        {rentEstimate.extrapolated.median.toFixed(2)} €/m²
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Soit {formatEUR(Math.round(rentEstimate.extrapolated.median * form.surface))}{' '}
                        / mois
                      </div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Rendement brut indicatif
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                      {((effectiveRent * 12) / form.price * 100).toFixed(2)} %
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: FINANCEMENT */}
        {step === 1 && (
          <div className="col-span-12">
            <div className="glass-panel">
              <h3>Le financement</h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 12,
                  marginTop: 16,
                }}
              >
                <Field label="Frais de notaire (%)">
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
                <Field label="Taux du prêt (%)">
                  <input
                    type="number"
                    step="0.05"
                    value={form.loanRate}
                    onChange={(e) => setForm((p) => ({ ...p, loanRate: Number(e.target.value) || 0 }))}
                  />
                </Field>
                <Field label="Durée (ans)">
                  <input
                    type="number"
                    value={form.loanYears}
                    onChange={(e) => setForm((p) => ({ ...p, loanYears: Number(e.target.value) || 0 }))}
                  />
                </Field>
              </div>
              <div style={{ marginTop: 16, padding: 14, background: 'var(--bg-subtle)', borderRadius: 8 }}>
                <Row label="Frais notaire" value={formatEUR(notaryFees)} />
                <Row label="Coût total" value={formatEUR(totalInvestment({ price: form.price, notaryFees, works: form.works }))} />
                <Row
                  label="Capital emprunté"
                  value={formatEUR(Math.max(0, totalInvestment({ price: form.price, notaryFees, works: form.works }) - Number(form.downPayment)))}
                />
                <Row
                  label="Mensualité du prêt"
                  value={formatEUR(
                    monthlyLoanPayment(
                      Math.max(0, totalInvestment({ price: form.price, notaryFees, works: form.works }) - Number(form.downPayment)),
                      Number(form.loanRate),
                      Number(form.loanYears),
                    ),
                  )}
                  bold
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: LOCATION */}
        {step === 2 && (
          <div className="col-span-12">
            <div className="glass-panel">
              <h3>La location</h3>
              {rentEstimate?.extrapolated?.median && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    background: 'rgba(34,197,94,0.06)',
                    border: '1px solid rgba(34,197,94,0.2)',
                    borderRadius: 8,
                    fontSize: '0.88rem',
                  }}
                >
                  ✓ Loyer estimé 2026 : <b>{rentEstimate.extrapolated.median.toFixed(2)} €/m²</b> ×{' '}
                  {form.surface} m² ={' '}
                  <b>
                    {formatEUR(Math.round(rentEstimate.extrapolated.median * form.surface))} / mois
                  </b>
                  . Override possible ci-dessous si tu as une meilleure donnée.
                </div>
              )}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 12,
                  marginTop: 16,
                }}
              >
                <Field label="Loyer (override €/mois)">
                  <input
                    type="number"
                    value={form.monthlyRentOverride}
                    onChange={(e) => setForm((p) => ({ ...p, monthlyRentOverride: e.target.value }))}
                    placeholder={String(form.monthlyRent || effectiveRent || '')}
                  />
                </Field>
                <Field label="Vacance locative (%)">
                  <input
                    type="number"
                    step="0.5"
                    value={form.vacancyRate}
                    onChange={(e) => setForm((p) => ({ ...p, vacancyRate: Number(e.target.value) || 0 }))}
                  />
                </Field>
                <Field label="Charges (€/mois)">
                  <input
                    type="number"
                    value={form.charges}
                    onChange={(e) => setForm((p) => ({ ...p, charges: Number(e.target.value) || 0 }))}
                  />
                </Field>
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
                <Field label="Gestion locative (%)">
                  <input
                    type="number"
                    step="0.5"
                    value={form.mgmtFees}
                    onChange={(e) => setForm((p) => ({ ...p, mgmtFees: Number(e.target.value) || 0 }))}
                  />
                </Field>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: RESULTS */}
        {step === 3 && (
          <>
            <div className="col-span-3">
              <KpiCard
                label="Cash flow / mois"
                value={formatEUR(cashFlow)}
                trend={cashFlow}
                trendLabel={cashFlow >= 0 ? 'Auto-financé' : 'Effort mensuel'}
              />
            </div>
            <div className="col-span-3">
              <KpiCard label="Rentabilité brute" value={formatPercent(gross, { digits: 2 })} />
            </div>
            <div className="col-span-3">
              <KpiCard label="Rentabilité nette" value={formatPercent(net, { digits: 2 })} />
            </div>
            <div className="col-span-3">
              <KpiCard label="Cash-on-Cash" value={formatPercent(cashOnCash, { digits: 2 })} />
            </div>

            <div className="col-span-6">
              <div className="glass-panel">
                <h3>Optimisation</h3>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  À tes conditions actuelles, voici les seuils pour que l'investissement soit
                  rentable.
                </p>
                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Row
                    label="Taux max pour cash flow ≥ 0"
                    value={beRate != null ? `${beRate.toFixed(2)} %` : 'Jamais positif'}
                    bold
                    color={beRate != null ? 'var(--accent)' : 'var(--negative)'}
                  />
                  <Row
                    label="Loyer min à ce taux"
                    value={`${formatEUR(beRent)} / mois`}
                  />
                  <Row
                    label="Prix max à acheter à ce taux et loyer estimé"
                    value={maxPrice ? formatEUR(maxPrice) : '—'}
                    bold
                    color={maxPrice && maxPrice >= form.price ? 'var(--accent)' : 'var(--negative)'}
                  />
                </div>
                <div
                  style={{
                    marginTop: 14,
                    padding: 12,
                    background: 'var(--bg-subtle)',
                    borderRadius: 8,
                    fontSize: '0.88rem',
                  }}
                >
                  <b>Recommandation</b> :{' '}
                  {beRate == null
                    ? "Cet investissement ne dégage jamais de cash flow positif avec ces conditions. Renforce l'apport ou trouve un bien moins cher."
                    : maxPrice && form.price > maxPrice
                      ? `Pour cash flow ≥ 0, ne paye pas plus de ${formatEUR(maxPrice)}, ou cherche un loyer ≥ ${formatEUR(beRent)}/mois.`
                      : `Avec ce loyer, tu peux monter jusqu'à ${beRate.toFixed(2)} % de taux d'emprunt. À ${form.loanRate} %, le bien tient.`}
                </div>
              </div>
            </div>

            <div className="col-span-6">
              <div className="glass-panel">
                <h3>Score de l'investissement</h3>
                <div
                  style={{
                    fontSize: '3rem',
                    fontWeight: 700,
                    color: score.score >= 65 ? 'var(--accent)' : score.score >= 40 ? '#f59e0b' : 'var(--negative)',
                    marginTop: 8,
                  }}
                >
                  {score.score}/100
                </div>
                <ul style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {score.breakdown.map((b, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem' }}>
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

            <div className="col-span-12">
              <div className="glass-panel">
                <h3>Cash flow selon le taux d'emprunt</h3>
                <div style={{ height: 280, marginTop: 16 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series}>
                      <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} />
                      <XAxis
                        dataKey="rate"
                        stroke="#6b6b6b"
                        fontSize={12}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <YAxis stroke="#6b6b6b" fontSize={12} tickFormatter={(v) => `${v}€`} />
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
                          label={{ value: `Équilibre ${beRate}%`, position: 'top', fontSize: 11 }}
                        />
                      )}
                      <ReferenceLine
                        x={Number(form.loanRate)}
                        stroke="#0a0a0a"
                        strokeWidth={1.5}
                        label={{ value: 'Taux actuel', position: 'insideTopRight', fontSize: 11 }}
                      />
                      <Line type="monotone" dataKey="cashFlow" stroke="#0a0a0a" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="glass-panel" style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-secondary" onClick={back} disabled={step === 0}>
          <ArrowLeft size={14} /> Retour
        </button>
        {step < STEPS.length - 1 ? (
          <button className="btn btn-primary" onClick={next}>
            Étape suivante <ArrowRight size={14} />
          </button>
        ) : (
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={14} /> Sauvegarder le projet
          </button>
        )}
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

export default SimulatorWizard;
