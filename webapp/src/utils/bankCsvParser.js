// Bank CSV parser — handles the most common French bank export formats.
// Each adapter normalises rows to { date, label, amount }.
//
// Supported (auto-detected by header signature):
// - Boursorama   : dateOp;dateVal;label;category;categoryParent;supplierFound;amount;accountNum;accountLabel;accountbalance
// - BNP Paribas  : Date;Libellé;Débit euros;Crédit euros
// - Société Gé.  : Date opération;Libellé;Détail de l'écriture;Montant
// - Crédit Agric.: Date;Libellé;Débit Euros;Crédit Euros
// - LCL          : Date;Montant;Libellé;Détail
// - Generic      : Date;Label;Amount

import Papa from 'papaparse';

const parseFrAmount = (v) => {
  if (v == null || v === '') return null;
  const s = String(v).replace(/\s/g, '').replace(',', '.').replace(/[€$]/, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const parseFrDate = (v) => {
  if (!v) return null;
  const s = String(v).trim();
  // dd/mm/yyyy
  let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // yyyy-mm-dd
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // dd-mm-yyyy
  m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
};

const ADAPTERS = [
  {
    name: 'Boursorama',
    match: (h) => h.includes('dateop') && h.includes('amount'),
    map: (r) => ({
      date: parseFrDate(r.dateOp || r.dateop),
      label: (r.label || r.libelle || '').trim(),
      amount: parseFrAmount(r.amount),
    }),
  },
  {
    name: 'BNP Paribas',
    match: (h) =>
      (h.includes('libellé') || h.includes('libelle')) &&
      h.includes('débit') &&
      h.includes('crédit'),
    map: (r) => {
      const debit = parseFrAmount(r['Débit euros'] || r['Debit euros']);
      const credit = parseFrAmount(r['Crédit euros'] || r['Credit euros']);
      const amount = credit != null ? credit : debit != null ? -Math.abs(debit) : null;
      return {
        date: parseFrDate(r['Date'] || r['date']),
        label: (r['Libellé'] || r['Libelle'] || '').trim(),
        amount,
      };
    },
  },
  {
    name: 'Crédit Agricole',
    match: (h) =>
      h.includes('libellé') && h.includes('débit') && h.includes('crédit') && !h.includes('détail'),
    map: (r) => {
      const debit = parseFrAmount(r['Débit Euros'] || r['Debit Euros']);
      const credit = parseFrAmount(r['Crédit Euros'] || r['Credit Euros']);
      const amount = credit != null ? credit : debit != null ? -Math.abs(debit) : null;
      return {
        date: parseFrDate(r['Date'] || r['date']),
        label: (r['Libellé'] || r['Libelle'] || '').trim(),
        amount,
      };
    },
  },
  {
    name: 'Société Générale',
    match: (h) => h.includes('date opération') && h.includes('montant'),
    map: (r) => ({
      date: parseFrDate(r['Date opération'] || r['Date operation']),
      label: ((r['Libellé'] || r['Libelle'] || '') + ' ' + (r['Détail de l\'écriture'] || '')).trim(),
      amount: parseFrAmount(r['Montant']),
    }),
  },
  {
    name: 'LCL',
    match: (h) => h.includes('date') && h.includes('montant') && h.includes('libellé'),
    map: (r) => ({
      date: parseFrDate(r['Date']),
      label: ((r['Libellé'] || '') + ' ' + (r['Détail'] || '')).trim(),
      amount: parseFrAmount(r['Montant']),
    }),
  },
  {
    name: 'Generic',
    match: (h) => (h.includes('date') && h.includes('amount')) || (h.includes('date') && h.includes('montant')),
    map: (r) => {
      const amountField = r.amount ?? r.Amount ?? r.montant ?? r.Montant;
      const labelField = r.label ?? r.Label ?? r.libellé ?? r.Libelle ?? r.description ?? r.Description ?? '';
      return {
        date: parseFrDate(r.date ?? r.Date),
        label: String(labelField).trim(),
        amount: parseFrAmount(amountField),
      };
    },
  },
];

const detectDelimiter = (text) => {
  const sample = text.slice(0, 2000);
  const counts = {
    ';': (sample.match(/;/g) || []).length,
    ',': (sample.match(/,/g) || []).length,
    '\t': (sample.match(/\t/g) || []).length,
  };
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
};

export const parseBankCsv = (text) => {
  const delimiter = detectDelimiter(text);
  const parsed = Papa.parse(text, {
    header: true,
    delimiter,
    skipEmptyLines: true,
  });
  if (!parsed.data?.length) return { adapter: 'Inconnu', rows: [] };

  const headersLc = (parsed.meta.fields || []).map((h) => h.toLowerCase());
  const adapter =
    ADAPTERS.find((a) => a.match(headersLc.join(' ')) && a.name !== 'Generic') ||
    ADAPTERS.find((a) => a.match(headersLc.join(' '))) ||
    ADAPTERS.at(-1);

  const rows = parsed.data
    .map((r) => adapter.map(r))
    .filter((r) => r.date && r.amount != null && r.label);

  return { adapter: adapter.name, rows };
};
