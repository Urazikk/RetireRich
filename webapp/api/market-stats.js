// Market stats API — aggregates commune-level DVF stats + carte des loyers
// + geo centroids, for the real-estate market explorer.
//
// Sources :
//   - DVF stats whole period (data.gouv.fr / Etalab) — median price €/m², nb sales
//   - Carte des Loyers 2024 (Ministère du Logement) — median rent €/m²
//   - geo.api.gouv.fr — commune centroids + population

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

const DVF_STATS_URL = 'https://object.files.data.gouv.fr/data-pipeline-open/dvf/stats_whole_period.csv';
const RENT_URL = 'https://static.data.gouv.fr/resources/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2024/20241205-153050/pred-app-mef-dhup.csv';
const RENT_MAISON_URL = 'https://static.data.gouv.fr/resources/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2024/20241205-145700/pred-mai-mef-dhup.csv';

// IRL extrapolation 2024 → 2026
const IRL = 1.045;

// Module-level cache
let DVF_CACHE = null;
let RENT_APT_CACHE = null;
let RENT_MAI_CACHE = null;

const parseFrNumber = (v) => {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const loadDvfStats = async () => {
  if (DVF_CACHE) return DVF_CACHE;
  const res = await fetch(DVF_STATS_URL);
  if (!res.ok) throw new Error(`DVF stats: ${res.status}`);
  const text = await res.text();
  const lines = text.split(/\r?\n/);
  // Header :
  // code_geo,libelle_geo,code_parent,echelle_geo,nb_ventes_whole_appartement,
  // moy_prix_m2_whole_appartement,med_prix_m2_whole_appartement,
  // nb_ventes_whole_maison,moy_prix_m2_whole_maison,med_prix_m2_whole_maison, ...
  const map = new Map();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cells = line.split(',');
    if (cells.length < 16) continue;
    const code = cells[0];
    const echelle = cells[3];
    if (echelle !== 'commune') continue;
    map.set(code, {
      libelle: cells[1],
      dept: cells[2],
      nb_apt: parseFrNumber(cells[4]) || 0,
      moy_apt: parseFrNumber(cells[5]),
      med_apt: parseFrNumber(cells[6]),
      nb_mai: parseFrNumber(cells[7]) || 0,
      moy_mai: parseFrNumber(cells[8]),
      med_mai: parseFrNumber(cells[9]),
    });
  }
  DVF_CACHE = map;
  return map;
};

const loadRent = async (kind = 'apt') => {
  const isMaison = kind === 'maison';
  if (isMaison && RENT_MAI_CACHE) return RENT_MAI_CACHE;
  if (!isMaison && RENT_APT_CACHE) return RENT_APT_CACHE;
  const url = isMaison ? RENT_MAISON_URL : RENT_URL;
  const res = await fetch(url);
  if (!res.ok) return new Map();
  const text = await res.text();
  const lines = text.split(/\r?\n/);
  const map = new Map();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cells = line.split(';').map((c) => c.replace(/^"|"$/g, ''));
    const insee = cells[1];
    const loy = parseFrNumber(cells[6]);
    if (insee && loy) map.set(insee, loy);
  }
  if (isMaison) RENT_MAI_CACHE = map;
  else RENT_APT_CACHE = map;
  return map;
};

const fetchCommunesGeo = async (dept) => {
  const url = `https://geo.api.gouv.fr/communes?codeDepartement=${encodeURIComponent(
    dept,
  )}&fields=centre,nom,code,population&format=json`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return res.json();
};

const percentile = (arr, p) => {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }
  try {
    const url = new URL(req.url, `https://${req.headers.host || 'local'}`);
    const dept = url.searchParams.get('dept');
    const type = (url.searchParams.get('type') || 'apt').toLowerCase();

    if (!dept || !/^(2A|2B|\d{2,3})$/.test(dept)) {
      res.writeHead(400, CORS);
      res.end(JSON.stringify({ error: 'dept required (e.g. 75, 69, 33)' }));
      return;
    }

    const [dvf, rent, communes] = await Promise.all([
      loadDvfStats(),
      loadRent(type),
      fetchCommunesGeo(dept),
    ]);

    const items = communes
      .map((c) => {
        const code = c.code;
        const stats = dvf.get(code) || {};
        const rentMedian = rent.get(code) || null;
        const rentExtrapolated = rentMedian ? Math.round(rentMedian * IRL * 100) / 100 : null;

        const salePrice = type === 'maison' ? stats.med_mai : stats.med_apt;
        const nbVentes = type === 'maison' ? stats.nb_mai : stats.nb_apt;

        // Rendement brut annuel = (loyer mensuel × 12) / prix au m² × 100
        const grossYield = salePrice && rentExtrapolated
          ? Math.round((rentExtrapolated * 12) / salePrice * 10000) / 100
          : null;

        return {
          insee: code,
          nom: c.nom,
          lat: c.centre?.coordinates[1],
          lng: c.centre?.coordinates[0],
          population: c.population || 0,
          dept,
          salePrice,
          nbVentes,
          rentExtrapolated,
          grossYield,
        };
      })
      .filter((c) => c.lat && c.lng);

    // Quartiles for color mapping
    const prices = items.map((i) => i.salePrice).filter(Boolean);
    const volumes = items.map((i) => i.nbVentes).filter((v) => v > 0);
    const yields = items.map((i) => i.grossYield).filter(Boolean);

    res.writeHead(200, CORS);
    res.end(
      JSON.stringify({
        dept,
        type,
        count: items.length,
        items,
        quartiles: {
          salePrice: {
            q1: percentile(prices, 25),
            q2: percentile(prices, 50),
            q3: percentile(prices, 75),
          },
          volume: {
            q1: percentile(volumes, 25),
            q2: percentile(volumes, 50),
            q3: percentile(volumes, 75),
          },
          yield: {
            q1: percentile(yields, 25),
            q2: percentile(yields, 50),
            q3: percentile(yields, 75),
          },
        },
      }),
    );
  } catch (err) {
    res.writeHead(500, CORS);
    res.end(JSON.stringify({ error: err?.message || String(err) }));
  }
}
