// DVF client — calls our Vercel function `/api/dvf` (which proxies data.gouv.fr).
// The Vercel function does postal-code → INSEE resolution, CSV fetching, parsing
// and stats so the browser receives a small JSON payload.

const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

export const searchDvf = async ({ codePostal, type = 'apt' } = {}) => {
  if (!/^\d{5}$/.test(codePostal || '')) {
    throw new Error('Code postal invalide (5 chiffres requis)');
  }
  const url = `${BASE}/api/dvf?code_postal=${codePostal}&type=${type}`;
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
