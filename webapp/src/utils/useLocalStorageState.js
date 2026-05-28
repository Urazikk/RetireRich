import { useEffect, useState } from 'react';

export const useLocalStorageState = (key, initial) => {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Quota or serialization errors: silently drop.
    }
  }, [key, value]);

  return [value, setValue];
};
