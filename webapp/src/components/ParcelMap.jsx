import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { formatEUR, formatNumber } from '../utils/format.js';
import { groupByParcel } from '../utils/parcels.js';

// Échelle de couleur par quartiles de prix/m² (repris de DvfMap).
const colorFor = (price, q1, q2, q3) => {
  if (price <= q1) return '#22c55e';
  if (price <= q2) return '#84cc16';
  if (price <= q3) return '#f59e0b';
  return '#ef4444';
};

const FitBounds = ({ parcels }) => {
  const map = useMap();
  useEffect(() => {
    if (!parcels.length) return;
    const lats = parcels.map((p) => p.lat);
    const lngs = parcels.map((p) => p.lng);
    map.fitBounds(
      [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
      { padding: [30, 30] },
    );
  }, [map, parcels]);
  return null;
};

const TYPE_LABEL = { apt: 'Appartement', maison: 'Maison' };

const ParcelMap = ({ points, center, type = 'apt' }) => {
  const parcels = useMemo(() => groupByParcel(points || []), [points]);

  const quartiles = useMemo(() => {
    if (!parcels.length) return { q1: 0, q2: 0, q3: 0 };
    const sorted = parcels.map((p) => p.latestPricePerSqm).sort((a, b) => a - b);
    return {
      q1: sorted[Math.floor(sorted.length * 0.25)],
      q2: sorted[Math.floor(sorted.length * 0.5)],
      q3: sorted[Math.floor(sorted.length * 0.75)],
    };
  }, [parcels]);

  if (!parcels.length) {
    return (
      <div
        style={{
          height: 400,
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
        }}
      >
        Aucune parcelle géolocalisée pour cette zone.
      </div>
    );
  }

  const defaultCenter = center || { lat: parcels[0].lat, lng: parcels[0].lng };

  return (
    <div style={{ height: 480, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
      <MapContainer center={[defaultCenter.lat, defaultCenter.lng]} zoom={14} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds parcels={parcels} />
        {parcels.map((p) => {
          const fill = colorFor(p.latestPricePerSqm, quartiles.q1, quartiles.q2, quartiles.q3);
          const repeat = p.saleCount > 1;
          return (
            <CircleMarker
              key={p.idParcelle}
              center={[p.lat, p.lng]}
              radius={repeat ? 9 : 6}
              pathOptions={{ color: repeat ? '#3b82f6' : fill, fillColor: fill, fillOpacity: 0.7, weight: repeat ? 3 : 1 }}
            >
              <Popup>
                <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, minWidth: 190 }}>
                  <div style={{ fontWeight: 600 }}>{p.adresse || 'Adresse inconnue'}</div>
                  <div style={{ color: '#6b6b6b' }}>
                    {TYPE_LABEL[type] || type} · {p.saleCount} vente{p.saleCount > 1 ? 's' : ''}
                  </div>
                  <div style={{ borderTop: '1px solid #eee', marginTop: 4, paddingTop: 4 }}>
                    {p.sales.map((s, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span>{s.date}</span>
                        <span>
                          {formatNumber(s.surface)} m² · <b>{formatEUR(s.pricePerSqm)}/m²</b>
                        </span>
                      </div>
                    ))}
                  </div>
                  {p.evolutionPct != null && (
                    <div style={{ marginTop: 4, fontWeight: 700, color: p.evolutionPct >= 0 ? '#22c55e' : '#ef4444' }}>
                      Évolution €/m² : {p.evolutionPct >= 0 ? '+' : ''}{p.evolutionPct.toFixed(0)} %
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default ParcelMap;
