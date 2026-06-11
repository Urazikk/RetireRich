import { useEffect, useRef, useState } from 'react';

const easeOutQuart = (p) => 1 - Math.pow(1 - p, 4);

const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Anime un nombre vers `target` via requestAnimationFrame (easing out).
// Première apparition : depuis 0. Changement : depuis la valeur courante.
export const useCountUp = (target, { duration = 900 } = {}) => {
  const [displayed, setDisplayed] = useState(() => (prefersReducedMotion() ? target : 0));
  const fromRef = useRef(prefersReducedMotion() ? target : 0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!Number.isFinite(target)) return undefined;
    const from = fromRef.current;
    if (from === target) return undefined;
    // Reduced motion : durée nulle → saut à la cible au premier frame,
    // le setState reste dans le callback rAF (jamais synchrone dans l'effet).
    const dur = prefersReducedMotion() ? 0 : duration;
    const start = performance.now();
    const tick = (nowTs) => {
      const p = dur === 0 ? 1 : Math.min(1, (nowTs - start) / dur);
      const value = from + (target - from) * easeOutQuart(p);
      setDisplayed(p === 1 ? target : value);
      fromRef.current = p === 1 ? target : value;
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return displayed;
};
