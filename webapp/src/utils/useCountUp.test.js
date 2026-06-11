// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountUp } from './useCountUp.js';

// rAF contrôlé : chaque flush() avance d'un frame de 100 ms.
let now = 0;
let cbs = [];
const flush = (ms = 100) => {
  now += ms;
  const pending = cbs;
  cbs = [];
  act(() => pending.forEach((cb) => cb(now)));
};

beforeEach(() => {
  now = 0;
  cbs = [];
  vi.stubGlobal('requestAnimationFrame', (cb) => { cbs.push(cb); return cbs.length; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('performance', { now: () => now });
});
afterEach(() => vi.unstubAllGlobals());

describe('useCountUp', () => {
  it('démarre à 0 et atteint la cible à la fin de la durée', () => {
    const { result } = renderHook(() => useCountUp(1000, { duration: 300 }));
    expect(result.current).toBe(0);
    flush(); // 100 ms
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(1000);
    flush(); flush(); // 300 ms atteints
    expect(result.current).toBe(1000);
  });
  it("anime de l'ancienne valeur vers la nouvelle", () => {
    const { result, rerender } = renderHook(({ v }) => useCountUp(v, { duration: 300 }), {
      initialProps: { v: 100 },
    });
    flush(); flush(); flush();
    expect(result.current).toBe(100);
    rerender({ v: 200 });
    flush();
    expect(result.current).toBeGreaterThan(100);
    expect(result.current).toBeLessThan(200);
    flush(); flush();
    expect(result.current).toBe(200);
  });
  it('saute directement à la cible si prefers-reduced-motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const { result } = renderHook(() => useCountUp(500, { duration: 300 }));
    expect(result.current).toBe(500);
  });
});
