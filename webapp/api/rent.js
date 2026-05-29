// Rent estimation API — uses "Carte des Loyers" 2024 dataset (Ministère du Logement)
// hosted on data.gouv.fr. Applies IRL extrapolation to 2026.
//
// IRL trajectory:
//   2024 base → IRL +2.5% (2025) + ~2% (2026) ≈ +4.5%
//
// Workflow:
//   code_postal → INSEE via api-adresse → lookup in cached CSV → +IRL → return €/m²

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

const URLS = {
  apt: 'https://static.data.gouv.fr/resources/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2024/20241205-153050/pred-app-mef-dhup.csv',
  apt_small: 'https://static.data.gouv.fr/resources/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2024/20241205-153048/pred-app12-mef-dhup.csv',
  apt_large: 'https://static.data.gouv.fr/resources/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2024/20241205-145658/pred-app3-mef-dhup.csv',
  maison: 'https://static.data.gouv.fr/resources/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2024/20241205-145700/pred-mai-mef-dhup.csv',
};

// IRL extrapolation: 2024 base → 2026 (≈ +4.5% cumulative)
const IRL_EXTRAPOLATION_2024_TO_2026 = 1.045;

// Module-level cache (persists across warm Vercel invocations)
let CACHE = {};

const parseFrNumber = (v) => {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const loadCsv = async (key) => {
  if (CACHE[key]) return CACHE[key];
  const url = URLS[key];
  if (!url) throw new Error(`Unknown rent dataset: ${key}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${key}: ${res.status}`);
  const text = await res.text();
  const lines = text.split(/\r?\n/);
  const map = new Map();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    // CSV uses ; delimiter, quoted strings
    const cells = line.split(';').map((c) => c.replace(/^"|"$/g, ''));
    const insee = cells[1];
    const libgeo = cells[2];
    const dep = cells[4];
    const loy = parseFrNumber(cells[6]);
    const lwr = parseFrNumber(cells[7]);
    const upr = parseFrNumber(cells[8]);
    if (insee && loy) {
      map.set(insee, { libgeo, dep, loy, lwr, upr });
    }
  }
  CACHE[key] = map;
  return map;
};

const resolveInsee = async (codePostal) => {
  const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(codePostal)}&type=municipality&limit=5`;
  const res = await fetch(url, { headers: { 'User-Agent': 'retirerich/1.0' } });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.features || [])
    .map((f) => ({
      insee: f.properties.citycode,
      label: f.properties.label,
    }))
    .filter((f) => f.insee);
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  try {
    const url = new URL(req.url, `https://${req.headers.host || 'local'}`);
    const codePostal = url.searchParams.get('code_postal');
    const typeParam = (url.searchParams.get('type') || 'apt').toLowerCase();
    const rooms = Number(url.searchParams.get('rooms')) || null;

    if (!codePostal || !/^\d{5}$/.test(codePostal)) {
      res.writeHead(400, CORS);
      res.end(JSON.stringify({ error: 'code_postal required' }));
      return;
    }

    // Pick the right dataset
    let datasetKey = 'apt';
    if (typeParam === 'maison') datasetKey = 'maison';
    else if (rooms && rooms <= 2) datasetKey = 'apt_small';
    else if (rooms && rooms >= 3) datasetKey = 'apt_large';

    const communes = await resolveInsee(codePostal);
    if (!communes.length) {
      res.writeHead(404, CORS);
      res.end(JSON.stringify({ error: 'commune not found' }));
      return;
    }

    const map = await loadCsv(datasetKey);

    // Try each candidate commune
    let found = null;
    let commune = null;
    for (const c of communes) {
      const hit = map.get(c.insee);
      if (hit) {
        found = hit;
        commune = c;
        break;
      }
    }

    if (!found) {
      res.writeHead(404, CORS);
      res.end(
        JSON.stringify({
          error: 'no rent data for this commune',
          commune: communes[0],
        }),
      );
      return;
    }

    // Apply IRL extrapolation 2024 → 2026
    const extrapolated2026 = {
      median: Math.round(found.loy * IRL_EXTRAPOLATION_2024_TO_2026 * 100) / 100,
      lwr: found.lwr ? Math.round(found.lwr * IRL_EXTRAPOLATION_2024_TO_2026 * 100) / 100 : null,
      upr: found.upr ? Math.round(found.upr * IRL_EXTRAPOLATION_2024_TO_2026 * 100) / 100 : null,
    };

    res.writeHead(200, CORS);
    res.end(
      JSON.stringify({
        codePostal,
        insee: commune.insee,
        commune: found.libgeo,
        dept: found.dep,
        type: typeParam,
        dataset: datasetKey,
        baseYear: 2024,
        targetYear: 2026,
        irlFactor: IRL_EXTRAPOLATION_2024_TO_2026,
        base: {
          median: found.loy,
          lwr: found.lwr,
          upr: found.upr,
        },
        extrapolated: extrapolated2026,
      }),
    );
  } catch (err) {
    res.writeHead(500, CORS);
    res.end(JSON.stringify({ error: err?.message || String(err) }));
  }
}
