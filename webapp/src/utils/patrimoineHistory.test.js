import { describe, it, expect } from 'vitest';
import { todayKey, withSnapshot } from './patrimoineHistory.js';

describe('todayKey', () => {
  it('formate une date locale en YYYY-MM-DD', () => {
    expect(todayKey(new Date(2026, 5, 11))).toBe('2026-06-11');
    expect(todayKey(new Date(2026, 0, 3))).toBe('2026-01-03');
  });
});

describe('withSnapshot', () => {
  it('ajoute un point sur un historique vide', () => {
    const next = withSnapshot([], { date: '2026-06-11', value: 1000, invested: 900 });
    expect(next).toEqual([{ date: '2026-06-11', value: 1000, invested: 900 }]);
  });

  it('ajoute un point pour un nouveau jour', () => {
    const prev = [{ date: '2026-06-10', value: 1000, invested: 900 }];
    const next = withSnapshot(prev, { date: '2026-06-11', value: 1100, invested: 900 });
    expect(next).toHaveLength(2);
    expect(next[1].value).toBe(1100);
  });

  it("met à jour le point du jour si la valeur change", () => {
    const prev = [{ date: '2026-06-11', value: 1000, invested: 900 }];
    const next = withSnapshot(prev, { date: '2026-06-11', value: 1050, invested: 900 });
    expect(next).toHaveLength(1);
    expect(next[0].value).toBe(1050);
  });

  it('retourne la même référence si rien ne change', () => {
    const prev = [{ date: '2026-06-11', value: 1000, invested: 900 }];
    const next = withSnapshot(prev, { date: '2026-06-11', value: 1000, invested: 900 });
    expect(next).toBe(prev);
  });

  it('tolère un historique non-tableau', () => {
    const next = withSnapshot(null, { date: '2026-06-11', value: 500, invested: 500 });
    expect(next).toEqual([{ date: '2026-06-11', value: 500, invested: 500 }]);
  });

  it('plafonne à 730 points', () => {
    const prev = Array.from({ length: 730 }, (_, i) => ({ date: `d${i}`, value: i, invested: i }));
    const next = withSnapshot(prev, { date: '2026-06-11', value: 1, invested: 1 });
    expect(next).toHaveLength(730);
    expect(next[0].date).toBe('d1');
    expect(next[729].date).toBe('2026-06-11');
  });
});
