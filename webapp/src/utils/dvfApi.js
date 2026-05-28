// DVF client — calls our Vercel function `/api/dvf` (which proxies data.gouv.fr).
// The Vercel function does postal-code → INSEE resolution, CSV fetching, parsing
// and stats so the browser receives a small JSON payload.

const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

export const searchDvf = async ({ codePostal, type = 'apt', years = '2024,2023', geo = true } = {}) => {
  if (!/^\d{5}$/.test(codePostal || '')) {
    throw new Error('Code postal invalide (5 chiffres requis)');
  }
  const params = new URLSearchParams({ code_postal: codePostal, type, years });
  if (geo) params.set('geo', '1');
  const url = `${BASE}/api/dvf?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    let detail = '';
    try {
      const j = await res.json();
      detail = j?.error ? ` (${j.error})` : '';
    } catch {
      // ignore
    }
    throw new Error(`DVF: HTTP ${res.status}${detail}`);
  }
  return res.json();
};
