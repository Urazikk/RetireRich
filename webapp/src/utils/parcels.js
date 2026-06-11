// Regroupe des points DVF (forme mapPoints) par parcelle cadastrale.
// Ignore les points sans idParcelle ou sans géoloc finie.
export const groupByParcel = (points = []) => {
  const byId = new Map();
  for (const p of points) {
    if (!p || !p.idParcelle) continue;
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
    if (!byId.has(p.idParcelle)) byId.set(p.idParcelle, []);
    byId.get(p.idParcelle).push(p);
  }
  const parcels = [];
  for (const [idParcelle, pts] of byId) {
    const sorted = [...pts].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const first = sorted[0];
    const latest = sorted[sorted.length - 1];
    const sales = sorted.map((p) => ({
      date: p.date, year: p.year, price: p.price, pricePerSqm: p.pricePerSqm, surface: p.surface,
    }));
    const evolutionPct =
      sorted.length > 1 && first.pricePerSqm
        ? ((latest.pricePerSqm - first.pricePerSqm) / first.pricePerSqm) * 100
        : null;
    parcels.push({
      idParcelle,
      lat: latest.lat,
      lng: latest.lng,
      adresse: latest.adresse,
      sales,
      saleCount: sales.length,
      latestPricePerSqm: latest.pricePerSqm,
      evolutionPct,
    });
  }
  parcels.sort(
    (a, b) =>
      b.saleCount - a.saleCount ||
      (a.sales[a.sales.length - 1].date < b.sales[b.sales.length - 1].date ? 1 : -1),
  );
  return parcels;
};
