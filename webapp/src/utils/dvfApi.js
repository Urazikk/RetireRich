// DVF (Demandes de Valeurs Foncières) API client.
// Uses Christian Quest's public DVF proxy: https://api.cquest.org/dvf
// Returns French property transactions from data.gouv.fr's open dataset.

const BASE_URL = 'https://api.cquest.org/dvf';

const PROPERTY_TYPES = {
  apt: 'Appartement',
  maison: 'Maison',
};

export const searchDvf = async ({ codePostal, codeCommune, limit = 500 } = {}) => {
  if (!codePostal && !codeCommune) {
    throw new Error('codePostal or codeCommune is required');
  }
  const params = new URLSearchParams();
  if (codePostal) params.set('code_postal', codePostal);
  if (codeCommune) params.set('code_commune', codeCommune);
  if (limit) params.set('limit', String(limit));

  const res = await fetch(`${BASE_URL}?${params.toString()}`);
  if (!res.ok) throw new Error(`DVF API error: ${res.status}`);
  const json = await res.json();
  return Array.isArray(json.resultats) ? json.resultats : [];
};

const median = (sorted) => {
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

const percentile = (sorted, p) => {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
};

export const analyseTransactions = (transactions, type = 'apt') => {
  const wanted = PROPERTY_TYPES[type];
  const filtered = transactions
    .filter((t) => t.type_local === wanted)
    .filter((t) => Number(t.valeur_fonciere) > 0 && Number(t.surface_relle_bati) > 0)
    .map((t) => ({
      price: Number(t.valeur_fonciere),
      surface: Number(t.surface_relle_bati),
      rooms: Number(t.nombre_pieces_principales) || null,
      date: t.date_mutation,
      commune: t.nom_commune,
      adresse: [t.numero_voie, t.type_voie, t.voie].filter(Boolean).join(' '),
      pricePerSqm: Number(t.valeur_fonciere) / Number(t.surface_relle_bati),
    }))
    .filter((t) => t.pricePerSqm > 100 && t.pricePerSqm < 50000);

  if (!filtered.length) {
    return { count: 0, median: null, p10: null, p90: null, transactions: [] };
  }
  const sorted = filtered.map((t) => t.pricePerSqm).sort((a, b) => a - b);
  return {
    count: filtered.length,
    median: median(sorted),
    p10: percentile(sorted, 10),
    p90: percentile(sorted, 90),
    transactions: filtered.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 50),
  };
};
