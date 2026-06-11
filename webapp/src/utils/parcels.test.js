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
  it("trie les ventes par date croissante et calcule l'évolution €/m²", () => {
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
