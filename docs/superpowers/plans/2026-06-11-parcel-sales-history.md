# Historique des ventes par parcelle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher les ventes DVF regroupées **par parcelle** sur la carte (un marqueur par parcelle, popup avec l'historique des ventes + % d'évolution), via un composant partagé utilisé dans les résultats DVF et dans l'Explorer du marché.

**Architecture:** Le endpoint `dvf` expose `id_parcelle` (sur `mapPoints`) + un mode `insee`/`dept`. Un util pur `parcels.js` (testé Vitest) regroupe les `mapPoints` par parcelle. Un composant `ParcelMap` (réutilisant la logique couleur/bounds de `DvfMap`) rend un marqueur par parcelle avec popup d'historique. Intégré dans `RealEstate.jsx` (remplace `DvfMap`) et `MarketExplorer.jsx` (clic commune → panneau).

**Tech Stack:** React 19, Vite 8, react-leaflet, Lucide-React, Vitest (configuré). Endpoint Node `webapp/api/dvf.js` (exécuté en dev par le plugin Vite `dev-api`).

---

## Référence (existant)

`mapPoints` renvoyé par `/api/dvf` (quand `geo=1`) : `{ lat, lng, pricePerSqm, price, surface, adresse, date, year }` (plafond 500, trié par date desc). Le CSV geo-dvf a la colonne `id_parcelle`. `format.js` : `formatEUR`, `formatNumber`. `MarketExplorer` : items commune `{ insee, lat, lng, nom, population, salePrice, nbVentes, grossYield, ... }`, états `dept` et `type` (`'apt'`/`'maison'`), `API_BASE` déjà défini. Vitest : `npm test`.

---

## Task 1 : Util pur `parcels.js` (TDD)

**Files:** Create `webapp/src/utils/parcels.js`, `webapp/src/utils/parcels.test.js`

- [ ] **Step 1 — Test qui échoue.** Create `webapp/src/utils/parcels.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { groupByParcel } from './parcels.js';

const points = [
  { idParcelle: 'P1', lat: 45.7, lng: 4.8, pricePerSqm: 4000, price: 100000, surface: 25, adresse: '12 rue X', date: '2019-05-01', year: '2019' },
  { idParcelle: 'P1', lat: 45.7, lng: 4.8, pricePerSqm: 5200, price: 130000, surface: 25, adresse: '12 rue X', date: '2023-06-01', year: '2023' },
  { idParcelle: 'P2', lat: 45.71, lng: 4.81, pricePerSqm: 3000, price: 90000, surface: 30, adresse: '5 rue Y', date: '2021-01-01', year: '2021' },
  { idParcelle: '', lat: 45.7, lng: 4.8, pricePerSqm: 9999, price: 1, surface: 1, adresse: 'no parcel', date: '2020-01-01', year: '2020' },
  { idParcelle: 'P3', pricePerSqm: 1000, price: 1, surface: 1, adresse: 'no geo', date: '2020-01-01', year: '2020' },
];

describe('groupByParcel', () => {
  it('regroupe par parcelle, reventes en tête', () => {
    const r = groupByParcel(points);
    expect(r.map((p) => p.idParcelle)).toEqual(['P1', 'P2']); // P3 (pas de géo) et '' ignorés
    expect(r[0].saleCount).toBe(2);
  });
  it('trie les ventes par date croissante et calcule l\'évolution €/m²', () => {
    const p1 = groupByParcel(points).find((p) => p.idParcelle === 'P1');
    expect(p1.sales.map((s) => s.year)).toEqual(['2019', '2023']);
    expect(p1.latestPricePerSqm).toBe(5200);
    expect(p1.evolutionPct).toBeCloseTo(30, 5); // (5200-4000)/4000
    expect(p1.lat).toBe(45.7);
    expect(p1.adresse).toBe('12 rue X');
  });
  it('evolutionPct = null pour une vente unique', () => {
    const p2 = groupByParcel(points).find((p) => p.idParcelle === 'P2');
    expect(p2.saleCount).toBe(1);
    expect(p2.evolutionPct).toBeNull();
  });
  it('ne mute pas la source', () => {
    const copy = JSON.parse(JSON.stringify(points));
    groupByParcel(points);
    expect(points).toEqual(copy);
  });
});
```

- [ ] **Step 2 — `npm test` → FAIL** (import non résolu).

- [ ] **Step 3 — Implémentation.** Create `webapp/src/utils/parcels.js`:
```js
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
```

- [ ] **Step 4 — `npm test` → PASS** ; `npm run lint` → 0 erreur.

- [ ] **Step 5 — Commit.**
```bash
cd /Users/simon/Desktop/Projet/RetireRich
git add webapp/src/utils/parcels.js webapp/src/utils/parcels.test.js
git commit -m "feat: util pur groupByParcel (regroupement DVF par parcelle)"
```

---

## Task 2 : Backend `dvf.js` — `id_parcelle`, mode insee, center

**Files:** Modify `webapp/api/dvf.js`

- [ ] **Step 1 — Params + mode insee.** Remplacer le bloc (lecture params → résolution communes) :
```js
    const codePostal = url.searchParams.get('code_postal') || url.searchParams.get('codePostal');
    const typeParam = (url.searchParams.get('type') || 'apt').toLowerCase();
    const propertyType = TYPE_MAP[typeParam];
    const yearsParam = url.searchParams.get('years') || '2024,2023';
    const includeGeo = url.searchParams.get('geo') === '1';

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

    const requestedYears = yearsParam
      .split(',')
      .map((y) => y.trim())
      .filter((y) => ALL_YEARS.includes(y));
    if (!requestedYears.length) {
      res.writeHead(400, CORS);
      res.end(JSON.stringify({ error: 'years must be a comma-separated list of supported years' }));
      return;
    }

    const communes = await resolveInsee(codePostal);
    if (!communes.length) {
      res.writeHead(404, CORS);
      res.end(JSON.stringify({ error: `No commune found for ${codePostal}` }));
      return;
    }
```
par :
```js
    const codePostal = url.searchParams.get('code_postal') || url.searchParams.get('codePostal');
    const inseeParam = url.searchParams.get('insee');
    const deptParam = url.searchParams.get('dept');
    const typeParam = (url.searchParams.get('type') || 'apt').toLowerCase();
    const propertyType = TYPE_MAP[typeParam];
    const yearsParam = url.searchParams.get('years') || '2024,2023';
    const includeGeo = url.searchParams.get('geo') === '1';

    if (!propertyType) {
      res.writeHead(400, CORS);
      res.end(JSON.stringify({ error: "type must be 'apt' or 'maison'" }));
      return;
    }

    const requestedYears = yearsParam
      .split(',')
      .map((y) => y.trim())
      .filter((y) => ALL_YEARS.includes(y));
    if (!requestedYears.length) {
      res.writeHead(400, CORS);
      res.end(JSON.stringify({ error: 'years must be a comma-separated list of supported years' }));
      return;
    }

    // Mode commune directe (insee+dept), sinon résolution depuis le code postal.
    let communes;
    if (inseeParam && deptParam) {
      communes = [{ insee: inseeParam, dept: deptParam }];
    } else {
      if (!codePostal || !/^\d{5}$/.test(codePostal)) {
        res.writeHead(400, CORS);
        res.end(JSON.stringify({ error: 'code_postal (5 digits) or insee+dept required' }));
        return;
      }
      communes = await resolveInsee(codePostal);
      if (!communes.length) {
        res.writeHead(404, CORS);
        res.end(JSON.stringify({ error: `No commune found for ${codePostal}` }));
        return;
      }
    }
```

- [ ] **Step 2 — `id_parcelle` sur les transactions.** Dans le `allTransactions.push({ ... })`, remplacer :
```js
          allTransactions.push({
            date: r.date_mutation,
            adresse: [r.adresse_numero, r.adresse_nom_voie].filter(Boolean).join(' '),
            commune: r.nom_commune,
            codePostal: r.code_postal,
            year,
            surface,
            rooms: Number(r.nombre_pieces_principales) || null,
            price,
            pricePerSqm: Math.round(pricePerSqm),
            ...(includeGeo && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : {}),
          });
```
par (ajout de `idParcelle`) :
```js
          allTransactions.push({
            date: r.date_mutation,
            adresse: [r.adresse_numero, r.adresse_nom_voie].filter(Boolean).join(' '),
            commune: r.nom_commune,
            codePostal: r.code_postal,
            idParcelle: r.id_parcelle,
            year,
            surface,
            rooms: Number(r.nombre_pieces_principales) || null,
            price,
            pricePerSqm: Math.round(pricePerSqm),
            ...(includeGeo && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : {}),
          });
```

- [ ] **Step 3 — `idParcelle` sur les mapPoints.** Dans le `.map((t) => ({ ... }))` des mapPoints, remplacer :
```js
        .map((t) => ({
          lat: t.lat,
          lng: t.lng,
          pricePerSqm: t.pricePerSqm,
          price: t.price,
          surface: t.surface,
          adresse: t.adresse,
          date: t.date,
          year: t.year,
        }));
```
par :
```js
        .map((t) => ({
          lat: t.lat,
          lng: t.lng,
          idParcelle: t.idParcelle,
          pricePerSqm: t.pricePerSqm,
          price: t.price,
          surface: t.surface,
          adresse: t.adresse,
          date: t.date,
          year: t.year,
        }));
```

- [ ] **Step 4 — `center` robuste (mode insee).** La ligne `center: communes[0] && { lat: communes[0].lat, lng: communes[0].lng },` apparaît **deux fois** à l'identique ; les distinguer par la ligne `mapPoints` qui précède et l'indentation.

**(a) Cas avec transactions** (précédé de `        mapPoints,`, indentation 8 espaces). Remplacer :
```js
        mapPoints,
        center: communes[0] && { lat: communes[0].lat, lng: communes[0].lng },
```
par :
```js
        mapPoints,
        center:
          communes[0] && communes[0].lat != null
            ? { lat: communes[0].lat, lng: communes[0].lng }
            : mapPoints[0]
              ? { lat: mapPoints[0].lat, lng: mapPoints[0].lng }
              : null,
```

**(b) Cas sans transaction** (précédé de `          mapPoints: [],`, indentation 10 espaces). Remplacer :
```js
          mapPoints: [],
          center: communes[0] && { lat: communes[0].lat, lng: communes[0].lng },
```
par :
```js
          mapPoints: [],
          center: communes[0] && communes[0].lat != null ? { lat: communes[0].lat, lng: communes[0].lng } : null,
```

- [ ] **Step 5 — Vérifier (le dev server exécute dvf via le plugin Vite).**
Run :
```bash
curl -s "http://localhost:5173/api/dvf?code_postal=69007&type=apt&years=2023,2024&geo=1" | head -c 400
```
Expected : JSON dont les `mapPoints` contiennent un champ `idParcelle`. Puis le mode insee :
```bash
curl -s "http://localhost:5173/api/dvf?insee=69387&dept=69&type=apt&years=2024&geo=1" | head -c 200
```
Expected : JSON (pas une erreur `code_postal required`) — 69387 = Lyon 7e. (Si l'hôte data.gouv.fr est lent, augmenter le délai ; en cas d'indisponibilité réseau, vérifier au moins que la réponse est du JSON et non un message `code_postal required`.)

- [ ] **Step 6 — Lint + commit.**
```bash
cd /Users/simon/Desktop/Projet/RetireRich/webapp && npm run lint
cd /Users/simon/Desktop/Projet/RetireRich
git add webapp/api/dvf.js
git commit -m "feat(api): dvf expose id_parcelle (mapPoints) + mode insee/dept + center robuste"
```

---

## Task 3 : Composant `ParcelMap.jsx`

**Files:** Create `webapp/src/components/ParcelMap.jsx`

- [ ] **Step 1 — Écrire le composant.** Create `webapp/src/components/ParcelMap.jsx`:
```jsx
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
```
> Les couleurs hexadécimales sont des constantes data-sémantiques (gradient prix/m², revente, vert/rouge financier) — même convention que les popups Leaflet de `DvfMap`. C'est l'exception admise par CLAUDE.md.

- [ ] **Step 2 — Lint + build.** `cd /Users/simon/Desktop/Projet/RetireRich/webapp && npm run lint && npm run build` → 0 erreur, build OK.

- [ ] **Step 3 — Commit.**
```bash
cd /Users/simon/Desktop/Projet/RetireRich
git add webapp/src/components/ParcelMap.jsx
git commit -m "feat: composant ParcelMap (marqueur par parcelle + popup historique)"
```

---

## Task 4 : Intégration dans les résultats DVF (`RealEstate.jsx`)

**Files:** Modify `webapp/src/pages/real-estate/RealEstate.jsx`

- [ ] **Step 1 — Remplacer l'import `DvfMap` par `ParcelMap`.** Remplacer :
```jsx
import DvfMap from '../../components/DvfMap.jsx';
```
par :
```jsx
import ParcelMap from '../../components/ParcelMap.jsx';
```

- [ ] **Step 2 — Remplacer l'usage dans le bloc carte.** Remplacer :
```jsx
              <DvfMap points={analysis.mapPoints || []} center={analysis.center} />
```
par :
```jsx
              <ParcelMap points={analysis.mapPoints || []} center={analysis.center} type={type} />
```

- [ ] **Step 3 — Lint + build.** `cd /Users/simon/Desktop/Projet/RetireRich/webapp && npm run lint && npm run build` → 0 erreur, build OK.

- [ ] **Step 4 — Vérif manuelle.** http://localhost:5173/real-estate → recherche DVF (ex. 69007, période « 3 dernières ») : la carte montre des marqueurs ; un clic ouvre la popup ; une parcelle vendue plusieurs fois a l'anneau bleu + l'évolution €/m².

- [ ] **Step 5 — Commit.**
```bash
cd /Users/simon/Desktop/Projet/RetireRich
git add webapp/src/pages/real-estate/RealEstate.jsx
git commit -m "feat: résultats DVF utilisent ParcelMap (historique par parcelle)"
```

---

## Task 5 : Intégration dans l'Explorer (`MarketExplorer.jsx`)

**Files:** Modify `webapp/src/pages/real-estate/MarketExplorer.jsx`

Contexte : la carte rend un `CircleMarker` par commune (clé `c.insee`, centre `[c.lat, c.lng]`). `API_BASE`, `Loader2`, `X as XIcon` sont déjà importés. États `dept` et `type` existent.

- [ ] **Step 1 — Importer ParcelMap.** Après la ligne `import { DEPARTMENTS } from '../../utils/departments.js';`, ajouter :
```jsx
import ParcelMap from '../../components/ParcelMap.jsx';
```

- [ ] **Step 2 — Ajouter l'état + le chargement.** Juste après la ligne `const [filtersOpen, setFiltersOpen] = useState(false);`, ajouter :
```jsx
  const [selectedCommune, setSelectedCommune] = useState(null);
  const [parcelData, setParcelData] = useState(null);
  const [parcelLoading, setParcelLoading] = useState(false);
  const [parcelError, setParcelError] = useState(null);

  const openCommune = async (c) => {
    setSelectedCommune(c);
    setParcelData(null);
    setParcelError(null);
    setParcelLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/dvf?insee=${c.insee}&dept=${dept}&type=${type}&years=2019,2020,2021,2022,2023,2024&geo=1`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || 'Erreur');
      }
      setParcelData(await res.json());
    } catch (err) {
      setParcelError(err?.message || 'Erreur de récupération');
    } finally {
      setParcelLoading(false);
    }
  };
```

- [ ] **Step 3 — Rendre la commune cliquable.** Sur le `CircleMarker` de commune, remplacer :
```jsx
                      <CircleMarker
                        key={c.insee}
                        center={[c.lat, c.lng]}
                        radius={radius}
                        pathOptions={{
                          color,
                          fillColor: color,
                          fillOpacity: 0.65,
                          weight: 1,
                        }}
                      >
```
par :
```jsx
                      <CircleMarker
                        key={c.insee}
                        center={[c.lat, c.lng]}
                        radius={radius}
                        eventHandlers={{ click: () => openCommune(c) }}
                        pathOptions={{
                          color,
                          fillColor: color,
                          fillOpacity: 0.65,
                          weight: 1,
                        }}
                      >
```

- [ ] **Step 4 — Afficher le panneau parcelles.** Juste après le `</MapContainer>` suivi de `</div>` qui ferme le conteneur de carte, insérer ce bloc (sous la carte) :
```jsx
      {selectedCommune && (
        <div className="glass-panel" style={{ marginTop: 16 }}>
          <div className="flex-between" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Ventes par parcelle — {selectedCommune.nom}</h3>
            <button
              className="btn btn-secondary"
              style={{ padding: '6px 10px' }}
              onClick={() => setSelectedCommune(null)}
            >
              <XIcon size={14} /> Fermer
            </button>
          </div>
          {parcelLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
              <Loader2 size={16} className="animate-spin" /> Chargement des ventes…
            </div>
          )}
          {parcelError && <p style={{ color: 'var(--negative)' }}>{parcelError}</p>}
          {!parcelLoading && !parcelError && parcelData && (
            <ParcelMap points={parcelData.mapPoints || []} center={parcelData.center} type={type} />
          )}
        </div>
      )}
```
> Si l'ancre exacte (`</MapContainer>` puis `</div>`) diffère, placer ce bloc immédiatement après le `</div>` qui ferme le conteneur de la carte, comme frère suivant. Ne pas l'imbriquer dans la carte.

- [ ] **Step 5 — Lint + build.** `cd /Users/simon/Desktop/Projet/RetireRich/webapp && npm run lint && npm run build` → 0 erreur, build OK.

- [ ] **Step 6 — Vérif manuelle.** http://localhost:5173/real-estate/explorer → choisir un département, cliquer une commune sur la carte → le panneau s'ouvre, charge les ventes, et affiche la carte des parcelles (popup historique au clic). Bouton « Fermer » referme.

- [ ] **Step 7 — Commit.**
```bash
cd /Users/simon/Desktop/Projet/RetireRich
git add webapp/src/pages/real-estate/MarketExplorer.jsx
git commit -m "feat: Explorer — clic commune ouvre les ventes par parcelle"
```

---

## Task 6 : Nettoyage `DvfMap` + vérification finale

**Files:** possible delete `webapp/src/components/DvfMap.jsx`

- [ ] **Step 1 — Vérifier que `DvfMap` n'est plus importé.**
```bash
cd /Users/simon/Desktop/Projet/RetireRich/webapp && grep -rn "DvfMap" src --include="*.jsx" | grep import
```
Expected : aucune ligne. Si une ligne subsiste, NE PAS supprimer et signaler.

- [ ] **Step 2 — Supprimer le composant orphelin.**
```bash
cd /Users/simon/Desktop/Projet/RetireRich/webapp && rm src/components/DvfMap.jsx
```

- [ ] **Step 3 — Suite complète.** `cd /Users/simon/Desktop/Projet/RetireRich/webapp && npm run lint && npm test && npm run build`
Expected : lint 0, tests verts (investmentMetrics + realEstatePortfolio + parcels), build OK.

- [ ] **Step 4 — Commit.**
```bash
cd /Users/simon/Desktop/Projet/RetireRich
git add -A
git commit -m "chore: suppression de DvfMap (remplacé par ParcelMap)"
```

---

## Récap de couverture (spec → tâches)

| Élément spec | Tâche |
|---|---|
| Backend `id_parcelle` sur mapPoints | 2 |
| Backend mode insee/dept + center | 2 |
| `groupByParcel` testé Vitest | 1 |
| `ParcelMap` (marqueur/parcelle, anneau revente, popup historique, évolution) | 3 |
| Intégration résultats DVF (remplace DvfMap) | 4 |
| Intégration Explorer (clic commune → panneau) | 5 |
| Nettoyage DvfMap | 6 |
| Contexte non modifié | toutes |
