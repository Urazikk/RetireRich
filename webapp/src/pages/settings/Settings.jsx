import { useRef, useState } from 'react';
import { Download, Upload, Database } from 'lucide-react';
import { BACKUP_PREFIX, buildBackup, parseBackup } from '../../utils/backup.js';
import { useToast } from '../../context/useToast.js';
import { todayKey } from '../../utils/patrimoineHistory.js';

const KEY_LABELS = {
  retirerich_accounts: 'Comptes',
  retirerich_assets: 'Actifs',
  retirerich_history: 'Historique patrimoine',
  retirerich_cashflows: 'Flux de trésorerie',
  retirerich_real_estate: 'Projets immobiliers',
  retirerich_real_estate_searches: 'Recherches DVF',
};

const readEntries = () =>
  Object.fromEntries(
    Object.keys(window.localStorage)
      .filter((k) => k.startsWith(BACKUP_PREFIX))
      .map((k) => [k, window.localStorage.getItem(k)]),
  );

const describeValue = (raw) => {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return `${parsed.length} élément${parsed.length !== 1 ? 's' : ''}`;
    if (parsed && typeof parsed === 'object') return `${Object.keys(parsed).length} champs`;
  } catch { /* valeur brute */ }
  return '—';
};

const Settings = () => {
  const fileRef = useRef(null);
  const toast = useToast();
  const [error, setError] = useState(null);
  const [entries, setEntries] = useState(readEntries);

  const handleExport = () => {
    const backup = buildBackup(readEntries());
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retirerich-backup-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Sauvegarde exportée');
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    try {
      const restored = parseBackup(await file.text());
      const count = Object.keys(restored).length;
      if (!window.confirm(`Remplacer les données actuelles par cette sauvegarde (${count} jeu${count !== 1 ? 'x' : ''} de données) ? Cette action est irréversible.`)) return;
      Object.entries(restored).forEach(([k, v]) => window.localStorage.setItem(k, v));
      window.location.reload();
    } catch (err) {
      setError(err.message);
      setEntries(readEntries());
      toast.error('Import échoué');
    }
  };

  const keys = Object.keys(entries).sort();

  return (
    <>
      <header className="header">
        <div>
          <h1>Réglages</h1>
          <p className="text-muted">Sauvegarde et restauration de tes données</p>
        </div>
      </header>

      <div className="glass-panel" style={{ marginBottom: 20 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Database size={18} /> Données locales
        </h3>
        <p className="text-muted" style={{ marginBottom: 16 }}>
          Toutes tes données vivent dans ce navigateur (localStorage). Exporte régulièrement une
          sauvegarde : un vidage du cache ou un changement d'appareil les effacerait.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={handleExport} disabled={keys.length === 0}>
            <Download size={16} /> Exporter la sauvegarde
          </button>
          <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> Importer une sauvegarde
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            style={{ display: 'none' }}
          />
        </div>
        {error && (
          <p style={{ color: 'var(--negative)', marginTop: 12, fontSize: '0.85rem' }}>{error}</p>
        )}
      </div>

      <div className="glass-panel">
        <h3 style={{ marginBottom: 12 }}>Contenu actuel</h3>
        {keys.length === 0 ? (
          <p className="text-muted">Aucune donnée enregistrée pour le moment.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {keys.map((key) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  padding: '10px 0',
                  borderBottom: '1px solid var(--hairline)',
                }}
              >
                <span>{KEY_LABELS[key] || key}</span>
                <span className="text-muted" style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.85rem' }}>
                  {describeValue(entries[key])}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Settings;
