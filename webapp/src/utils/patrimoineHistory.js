// Historique quotidien du patrimoine — un point par jour, mis à jour si la valeur change.

const MAX_POINTS = 730; // ~2 ans de points quotidiens

export const todayKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Retourne le même tableau (référence identique) si rien ne change,
// pour que setState puisse court-circuiter le re-render.
export function withSnapshot(history, { date, value, invested }) {
  const list = Array.isArray(history) ? history : [];
  const last = list[list.length - 1];
  if (last?.date === date) {
    if (last.value === value && last.invested === invested) return history;
    return [...list.slice(0, -1), { ...last, value, invested }];
  }
  const next = [...list, { date, value, invested }];
  return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next;
}
