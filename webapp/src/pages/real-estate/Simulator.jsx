import { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { useRealEstate } from '../../context/RealEstateContext.jsx';
import {
  grossYield,
  netYield,
  monthlyCashFlow,
  monthlyLoanPayment,
  cashOnCashReturn,
  totalInvestment,
} from '../../utils/realEstateMath.js';
import { formatEUR, formatPercent } from '../../utils/format.js';
import KpiCard from '../../components/KpiCard.jsx';

const initialState = {
  label: '',
  city: '',
  postalCode: '',
  surface: 50,
  rooms: 2,
  type: 'apt',
  // Purchase
  price: 200000,
  notaryFeesPct: 7.5,
  works: 0,
  downPayment: 20000,
  financingMonthlyRate: 3.5,
  loanDuration: 20,
  // Rental
  monthlyRent: 800,
  vacancyRate: 5,
  charges: 50,
  propertyTax: 1200,
  insurance: 200,
  mgmtFees: 0,
};

const Simulator = () => {
  const { addProject } = useRealEstate();
  const [form, setForm] = useState(initialState);

  const notaryFees = useMemo(
    () => (Number(form.price) * Number(form.notaryFeesPct)) / 100,
    [form.price, form.notaryFeesPct],
  );

  const computed = useMemo(() => {
    const purchase = {
      price: Number(form.price),
      notaryFees,
      works: Number(form.works),
    };
    const rental = {
      monthlyRent: Number(form.monthlyRent),
      vacancyRate: Number(form.vacancyRate),
      charges: Number(form.charges),
      propertyTax: Number(form.propertyTax),
      insurance: Number(form.insurance),
      mgmtFees: Number(form.mgmtFees),
    };
    const loanPrincipal = Math.max(0, Number(form.price) - Number(form.downPayment));
    const monthlyLoan = monthlyLoanPayment(
      loanPrincipal,
      Number(form.financingMonthlyRate),
      Number(form.loanDuration),
    );
    const gross = grossYield({ ...purchase, monthlyRent: rental.monthlyRent });
    const net = netYield({ ...purchase, ...rental });
    const cf = monthlyCashFlow({
      ...rental,
      loanPrincipal,
      loanRate: Number(form.financingMonthlyRate),
      loanYears: Number(form.loanDuration),
    });
    const cashOnCash = cashOnCashReturn({
      downPayment: Number(form.downPayment),
      monthlyCashFlow: cf,
    });
    const total = totalInvestment(purchase);
    return { gross, net, cf, monthlyLoan, cashOnCash, total, loanPrincipal };
  }, [form, notaryFees]);

  const handleSave = () => {
    if (!form.label) {
      alert('Donne un nom au projet avant de sauvegarder.');
      return;
    }
    addProject({
      label: form.label,
      city: form.city,
      postalCode: form.postalCode,
      surface: Number(form.surface),
      rooms: Number(form.rooms),
      type: form.type,
      purchase: {
        price: Number(form.price),
        notaryFees,
        works: Number(form.works),
        downPayment: Number(form.downPayment),
        financingMonthlyRate: Number(form.financingMonthlyRate),
        loanDuration: Number(form.loanDuration),
      },
      rental: {
        monthlyRent: Number(form.monthlyRent),
        vacancyRate: Number(form.vacancyRate),
        charges: Number(form.charges),
        propertyTax: Number(form.propertyTax),
        insurance: Number(form.insurance),
        mgmtFees: Number(form.mgmtFees),
      },
    });
    alert('Projet sauvegardé.');
  };

  const update = (key) => (e) =>
    setForm((p) => ({
      ...p,
      [key]: e.target.type === 'number' ? e.target.value : e.target.value,
    }));

  return (
    <>
      <header className="header">
        <div>
          <h1>Simulateur locatif</h1>
          <p className="text-muted">Calcule rentabilité, cash flow et effet de levier</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave}>
          <Save size={16} /> Sauvegarder le projet
        </button>
      </header>

      <div className="dashboard-grid">
        <div className="col-span-4">
          <KpiCard
            label="Rentabilité brute"
            value={formatPercent(computed.gross, { digits: 2 })}
          />
        </div>
        <div className="col-span-4">
          <KpiCard
            label="Rentabilité nette"
            value={formatPercent(computed.net, { digits: 2 })}
          />
        </div>
        <div className="col-span-4">
          <KpiCard
            label="Cash flow mensuel"
            value={formatEUR(computed.cf)}
            trend={computed.cf}
            trendLabel={computed.cf >= 0 ? 'Auto-financé' : 'Effort d\'épargne requis'}
          />
        </div>

        <div className="col-span-6">
          <div className="glass-panel">
            <h3>Le bien</h3>
            <Grid>
              <Field label="Nom du projet">
                <input value={form.label} onChange={update('label')} placeholder="Ex : T2 Lyon Croix-Rousse" />
              </Field>
              <Field label="Ville">
                <input value={form.city} onChange={update('city')} placeholder="Lyon" />
              </Field>
              <Field label="Code postal">
                <input
                  value={form.postalCode}
                  onChange={(e) => setForm((p) => ({ ...p, postalCode: e.target.value.replace(/\D/g, '').slice(0, 5) }))}
                  placeholder="69004"
                />
              </Field>
              <Field label="Type">
                <select value={form.type} onChange={update('type')}>
                  <option value="apt">Appartement</option>
                  <option value="maison">Maison</option>
                </select>
              </Field>
              <Field label="Surface (m²)">
                <input type="number" value={form.surface} onChange={update('surface')} />
              </Field>
              <Field label="Pièces">
                <input type="number" value={form.rooms} onChange={update('rooms')} />
              </Field>
            </Grid>
          </div>
        </div>

        <div className="col-span-6">
          <div className="glass-panel">
            <h3>Financement</h3>
            <Grid>
              <Field label="Prix d'achat (€)">
                <input type="number" value={form.price} onChange={update('price')} />
              </Field>
              <Field label="Frais de notaire (%)">
                <input type="number" step="0.1" value={form.notaryFeesPct} onChange={update('notaryFeesPct')} />
              </Field>
              <Field label="Travaux (€)">
                <input type="number" value={form.works} onChange={update('works')} />
              </Field>
              <Field label="Apport (€)">
                <input type="number" value={form.downPayment} onChange={update('downPayment')} />
              </Field>
              <Field label="Taux du prêt (%)">
                <input type="number" step="0.05" value={form.financingMonthlyRate} onChange={update('financingMonthlyRate')} />
              </Field>
              <Field label="Durée du prêt (années)">
                <input type="number" value={form.loanDuration} onChange={update('loanDuration')} />
              </Field>
            </Grid>
            <Summary>
              <Row label="Frais de notaire" value={formatEUR(notaryFees)} />
              <Row label="Coût total" value={formatEUR(computed.total)} />
              <Row label="Capital emprunté" value={formatEUR(computed.loanPrincipal)} />
              <Row label="Mensualité prêt" value={formatEUR(computed.monthlyLoan)} bold />
            </Summary>
          </div>
        </div>

        <div className="col-span-6">
          <div className="glass-panel">
            <h3>Location</h3>
            <Grid>
              <Field label="Loyer mensuel (€)">
                <input type="number" value={form.monthlyRent} onChange={update('monthlyRent')} />
              </Field>
              <Field label="Vacance locative (%)">
                <input type="number" step="0.5" value={form.vacancyRate} onChange={update('vacancyRate')} />
              </Field>
              <Field label="Charges mensuelles (€)">
                <input type="number" value={form.charges} onChange={update('charges')} />
              </Field>
              <Field label="Taxe foncière (€/an)">
                <input type="number" value={form.propertyTax} onChange={update('propertyTax')} />
              </Field>
              <Field label="Assurance PNO (€/an)">
                <input type="number" value={form.insurance} onChange={update('insurance')} />
              </Field>
              <Field label="Gestion locative (%)">
                <input type="number" step="0.5" value={form.mgmtFees} onChange={update('mgmtFees')} />
              </Field>
            </Grid>
          </div>
        </div>

        <div className="col-span-6">
          <div className="glass-panel">
            <h3>Synthèse</h3>
            <Summary>
              <Row label="Loyer annuel" value={formatEUR(Number(form.monthlyRent) * 12)} />
              <Row label="Rentabilité brute" value={formatPercent(computed.gross, { digits: 2 })} />
              <Row label="Rentabilité nette" value={formatPercent(computed.net, { digits: 2 })} />
              <Row label="Mensualité prêt" value={formatEUR(computed.monthlyLoan)} />
              <Row
                label="Cash flow / mois"
                value={formatEUR(computed.cf)}
                color={computed.cf >= 0 ? 'var(--accent)' : 'var(--negative)'}
                bold
              />
              <Row
                label="Cash-on-Cash (effet de levier)"
                value={formatPercent(computed.cashOnCash, { digits: 2 })}
              />
            </Summary>
          </div>
        </div>
      </div>
    </>
  );
};

const Grid = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>{children}</div>
);

const Field = ({ label, children }) => (
  <div className="input-group" style={{ marginBottom: 0 }}>
    <label>{label}</label>
    {children}
  </div>
);

const Summary = ({ children }) => (
  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
);

const Row = ({ label, value, color, bold }) => (
  <div className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
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

export default Simulator;
