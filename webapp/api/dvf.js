// DVF proxy — Demandes de Valeurs Foncières (data.gouv.fr open data).
// 1. Convert code_postal → INSEE via api-adresse.data.gouv.fr
// 2. Fetch the per-commune CSV from files.data.gouv.fr (geo-dvf)
// 3. Parse, filter by property type, compute stats, return JSON

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

const YEARS_TO_TRY = ['2024', '2023', '2022'];

const TYPE_MAP = {
  apt: 'Appartement',
  maison: 'Maison',
};

const parseCSV = (text) => {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    // Naive CSV parse: DVF CSVs from geo-dvf don't contain quoted commas in our columns of interest.
    const cells = line.split(',');
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = cells[j];
    }
    rows.push(obj);
  }
  return rows;
};

const median = (arr) => {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

const percentile = (sorted, p) => {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
};

const resolveInsee = async (codePostal) => {
  const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
    codePostal,
  )}&type=municipality&limit=5`;
  const res = await fetch(url, { headers: { 'User-Agent': 'retirerich/1.0' } });
  if (!res.ok) throw new Error(`api-adresse: ${res.status}`);
  const json = await res.json();
  return (json.features || [])
    .map((f) => ({
      insee: f.properties.citycode,
      label: f.properties.label,
      dept: f.properties.depcode,
    }))
    .filter((f) => f.insee);
};

const fetchCommuneCsv = async (dept, insee) => {
  for (const year of YEARS_TO_TRY) {
    const url = `https://files.data.gouv.fr/geo-dvf/latest/csv/${year}/communes/${dept}/${insee}.csv`;
    const res = await fetch(url, { headers: { 'User-Agent': 'retirerich/1.0' } });
    if (res.ok) {
      return { csv: await res.text(), year };
    }
  }
  return null;
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  try {
    const url = new URL(req.url, `https://${req.headers.host || 'local'}`);
    const codePostal = url.searchParams.get('code_postal') || url.searchParams.get('codePostal');
    const typeParam = (url.searchParams.get('type') || 'apt').toLowerCase();
    const propertyType = TYPE_MAP[typeParam];

    if (!codePostal || !/^\d{5}$/.test(codePostal)) {
      res.writeHead(400, CORS);
      res.end(JSON.stringify({ error: 'code_postal (5 digits) is required' }));
      return;
    }
    if (!propertyType) {
      res.writeHead(400, CORS);
      res.end(JSON.stringify({ error: "type must be 'apt' or 'maison'" }));
      return;
    }

    const communes = await resolveInsee(codePostal);
    if (!communes.length) {
      res.writeHead(404, CORS);
      res.end(JSON.stringify({ error: `No commune found for ${codePostal}` }));
      return;
    }

    const allTransactions = [];
    let year = null;
    for (const c of communes) {
      const fetched = await fetchCommuneCsv(c.dept, c.insee);
      if (!fetched) continue;
      year = year || fetched.year;
      const rows = parseCSV(fetched.csv);
      for (const r of rows) {
        if (r.type_local !== propertyType) continue;
        const price = Number(r.valeur_fonciere);
        const surface = Number(r.surface_reelle_bati);
        if (!(price > 0) || !(surface > 0)) continue;
        if (r.nature_mutation !== 'Vente' && r.nature_mutation !== "Vente en l'état futur d'achèvement") continue;
        const pricePerSqm = price / surface;
        if (pricePerSqm < 100 || pricePerSqm > 50000) continue;
        allTransactions.push({
          date: r.date_mutation,
          adresse: [r.adresse_numero, r.adresse_nom_voie].filter(Boolean).join(' '),
          commune: r.nom_commune,
          codePostal: r.code_postal,
          surface,
          rooms: Number(r.nombre_pieces_principales) || null,
          price,
          pricePerSqm: Math.round(pricePerSqm),
        });
      }
    }

    if (!allTransactions.length) {
      res.writeHead(200, CORS);
      res.end(
        JSON.stringify({
          codePostal,
          type: typeParam,
          year,
          count: 0,
          median: null,
          p10: null,
          p90: null,
          transactions: [],
        }),
      );
      return;
    }

    const prices = allTransactions.map((t) => t.pricePerSqm).sort((a, b) => a - b);
    const top = allTransactions.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 50);

    res.writeHead(200, CORS);
    res.end(
      JSON.stringify({
        codePostal,
        type: typeParam,
        year,
        count: allTransactions.length,
        median: Math.round(median(prices)),
        p10: Math.round(percentile(prices, 10)),
        p90: Math.round(percentile(prices, 90)),
        transactions: top,
      }),
    );
  } catch (err) {
    res.writeHead(500, CORS);
    res.end(JSON.stringify({ error: err?.message || String(err) }));
  }
}
