import { describe, it, expect } from 'vitest';
import { toastReducer, addToast, startLeaving, removeToast } from './toastReducer.js';

describe('toastReducer', () => {
  it('ajoute un toast avec id, message et kind', () => {
    const s1 = toastReducer([], addToast('Actif ajouté', 'ok'));
    expect(s1).toHaveLength(1);
    expect(s1[0]).toMatchObject({ message: 'Actif ajouté', kind: 'ok', leaving: false });
    expect(s1[0].id).toBeTruthy();
  });
  it('génère des ids uniques', () => {
    let s = toastReducer([], addToast('a', 'ok'));
    s = toastReducer(s, addToast('b', 'err'));
    expect(s[0].id).not.toBe(s[1].id);
  });
  it('marque un toast comme sortant puis le supprime', () => {
    let s = toastReducer([], addToast('a', 'ok'));
    const id = s[0].id;
    s = toastReducer(s, startLeaving(id));
    expect(s[0].leaving).toBe(true);
    s = toastReducer(s, removeToast(id));
    expect(s).toHaveLength(0);
  });
});
