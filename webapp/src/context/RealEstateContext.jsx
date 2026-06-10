import { useCallback, useMemo } from 'react';
import { useLocalStorageState } from '../utils/useLocalStorageState.js';
import { RealEstateContext } from './real-estate-context.js';

const STORAGE = {
  projects: 'retirerich_real_estate',
  searches: 'retirerich_real_estate_searches',
};

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const RealEstateProvider = ({ children }) => {
  const [projects, setProjects] = useLocalStorageState(STORAGE.projects, []);
  const [searches, setSearches] = useLocalStorageState(STORAGE.searches, []);

  const addProject = useCallback((project) => {
    const entry = { id: uid(), createdAt: new Date().toISOString(), ...project };
    setProjects((prev) => [...prev, entry]);
    return entry;
  }, [setProjects]);

  const updateProject = useCallback((id, patch) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, [setProjects]);

  const removeProject = useCallback((id) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }, [setProjects]);

  const saveSearch = useCallback((search) => {
    const entry = { id: uid(), queriedAt: new Date().toISOString(), ...search };
    setSearches((prev) => [entry, ...prev].slice(0, 20));
    return entry;
  }, [setSearches]);

  const value = useMemo(
    () => ({
      projects,
      searches,
      addProject,
      updateProject,
      removeProject,
      saveSearch,
    }),
    [projects, searches, addProject, updateProject, removeProject, saveSearch],
  );

  return <RealEstateContext.Provider value={value}>{children}</RealEstateContext.Provider>;
};
