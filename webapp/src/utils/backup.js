// Export / import de toutes les données locales (clés localStorage `retirerich*`).

export const BACKUP_PREFIX = 'retirerich';

// entries : { clé: chaîne brute localStorage }
export function buildBackup(entries) {
  const data = {};
  for (const [key, raw] of Object.entries(entries)) {
    if (!key.startsWith(BACKUP_PREFIX) || raw == null) continue;
    try {
      data[key] = JSON.parse(raw);
    } catch {
      data[key] = raw;
    }
  }
  return {
    app: 'RetireRich',
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
}

// Retourne { clé: chaîne brute à écrire dans localStorage } ou lève une Error lisible.
export function parseBackup(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Fichier JSON invalide.');
  }
  if (parsed?.app !== 'RetireRich' || typeof parsed.data !== 'object' || parsed.data === null) {
    throw new Error("Ce fichier n'est pas une sauvegarde RetireRich.");
  }
  const entries = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (!key.startsWith(BACKUP_PREFIX)) continue;
    entries[key] = typeof value === 'string' ? value : JSON.stringify(value);
  }
  if (Object.keys(entries).length === 0) {
    throw new Error('La sauvegarde ne contient aucune donnée.');
  }
  return entries;
}
