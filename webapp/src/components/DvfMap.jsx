import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { formatEUR, formatNumber } from '../utils/format.js';

// Color scale based on quartiles of price per sqm
const colorFor = (price, q1, q2, q3) => {
  if (price <= q1) return '#22c55e'; // green — cheapest 25%
  if (price <= q2) return '#84cc16';
  if (price <= q3) return '#f59e0b';
  return '#ef4444'; // red — most expensive 25%
};

const FitBounds = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    const bounds = [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ];
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [map, points]);
  return null;
};

const DvfMap = ({ points, center }) => {
  const containerRef = useRef(null);

  const quartiles = useMemo(() => {
    if (!points.length) return { q1: 0, q2: 0, q3: 0 };
    const sorted = [...points].map((p) => p.pricePerSqm).sort((a, b) => a - b);
    return {
      q1: sorted[Math.floor(sorted.length * 0.25)],
      q2: sorted[Math.floor(sorted.length * 0.5)],
      q3: sorted[Math.floor(sorted.length * 0.75)],
    };
  }, [points]);

  if (!points.length) {
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
        Aucun point géolocalisé pour cette zone.
      </div>
    );
  }

  const defaultCenter = center || { lat: points[0].lat, lng: points[0].lng };

  return (
    <div
      ref={containerRef}
      style={{
        height: 480,
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: '1px solid var(--border)',
      }}
    >
      <MapContainer
        center={[defaultCenter.lat, defaultCenter.lng]}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {points.map((p, i) => (
          <CircleMarker
            key={`${p.lat}-${p.lng}-${i}`}
            center={[p.lat, p.lng]}
            radius={6}
            pathOptions={{
              color: colorFor(p.pricePerSqm, quartiles.q1, quartiles.q2, quartiles.q3),
              fillColor: colorFor(p.pricePerSqm, quartiles.q1, quartiles.q2, quartiles.q3),
              fillOpacity: 0.7,
              weight: 1,
            }}
          >
            <Tooltip>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12 }}>
                <div style={{ fontWeight: 600 }}>{p.adresse || 'Adresse inconnue'}</div>
                <div>{p.date}</div>
                <div>
                  {formatNumber(p.surface)} m² · {formatEUR(p.price)}
                </div>
                <div style={{ fontWeight: 700, color: '#0a0a0a' }}>
                  {formatEUR(p.pricePerSqm)} / m²
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
};

export default DvfMap;
