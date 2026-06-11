import { describe, it, expect } from 'vitest';
import { buildBackup, parseBackup } from './backup.js';

describe('buildBackup', () => {
  it('inclut uniquement les clés retirerich et parse le JSON', () => {
    const backup = buildBackup({
      retirerich_accounts: '[{"id":"1"}]',
      retirerich_assets: '[]',
      other_key: '[1,2]',
    });
    expect(backup.app).toBe('RetireRich');
    expect(backup.version).toBe(1);
    expect(backup.data).toEqual({
      retirerich_accounts: [{ id: '1' }],
      retirerich_assets: [],
    });
  });

  it('conserve les valeurs non-JSON telles quelles', () => {
    const backup = buildBackup({ retirerich_raw: 'pas du json' });
    expect(backup.data.retirerich_raw).toBe('pas du json');
  });
});

describe('parseBackup', () => {
  it('restaure les entrées sous forme de chaînes localStorage', () => {
    const text = JSON.stringify({
      app: 'RetireRich',
      version: 1,
      data: { retirerich_accounts: [{ id: '1' }], ignored: [1] },
    });
    expect(parseBackup(text)).toEqual({
      retirerich_accounts: '[{"id":"1"}]',
    });
  });

  it('aller-retour avec buildBackup', () => {
    const entries = { retirerich_assets: '[{"id":"a","quantity":2}]' };
    const restored = parseBackup(JSON.stringify(buildBackup(entries)));
    expect(restored).toEqual(entries);
  });

  it('rejette un JSON invalide', () => {
    expect(() => parseBackup('{oops')).toThrow('Fichier JSON invalide.');
  });

  it('rejette un fichier étranger', () => {
    expect(() => parseBackup('{"data":{}}')).toThrow("n'est pas une sauvegarde RetireRich");
  });

  it('rejette une sauvegarde vide', () => {
    const text = JSON.stringify({ app: 'RetireRich', data: { foo: 1 } });
    expect(() => parseBackup(text)).toThrow('aucune donnée');
  });
});
