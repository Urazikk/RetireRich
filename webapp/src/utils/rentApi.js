// Client for our /api/rent endpoint (Carte des Loyers + IRL 2026 extrapolation).

const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

export const fetchRentEstimate = async ({ codePostal, type = 'apt', rooms = null } = {}) => {
  if (!/^\d{5}$/.test(codePostal || '')) {
    throw new Error('Code postal invalide');
  }
  const params = new URLSearchParams({ code_postal: codePostal, type });
  if (rooms) params.set('rooms', String(rooms));
  const res = await fetch(`${BASE}/api/rent?${params.toString()}`);
  if (!res.ok) {
    return null;
  }
  return res.json();
};
