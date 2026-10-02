import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { loadAll, openStore } from '../src/storage/db.ts';
import { makeBackup, parseBackup, restoreBackup } from '../src/storage/backup.ts';

describe('export / import de la progression', () => {
  it('export puis import sur un profil vierge = même état', async () => {
    const src = await openStore(`src-${Date.now()}`);
    await src.add('reviews', { cardId: 'F1.A.Q5', date: '2026-10-01T10:00:00Z', note: 'su', mode: 'revision' });
    await src.add('reviews', { cardId: 'F1.A.Q5', date: '2026-10-03T10:00:00Z', note: 'rate', mode: 'revision' });
    await src.put('notes', { id: 'F2.B2.Q5', valeur_relue: 'PI 364', edition: '67', date: '2026-10-01T10:00:00Z' });
    await src.put('selections', { nom: 'Sélection courante', ids: ['F1.A.Q5'] });
    await src.put('settings', { theme: 'dark', langue: 'fr', dateExamen: '2026-11-20', dateExamenAdr: null, formatImpression: '2x5', modeImpression: 'duplex', decalageVersoMm: { x: 1.5, y: -0.5 }, melanger: true, rappelExport: '2026-10-01', nouveauteVue: null }, 'settings');
    await src.add('exams', { debut: '2026-10-02T08:00:00Z', fin: '2026-10-02T10:00:00Z', dureeMin: 180, ids: ['a'], reponses: { a: 'x' }, verdicts: { a: true }, score: 1 });
    await src.add('journal', { date: '2026-10-02', cardId: 'a', question: 'q', maReponse: 'x', bonneReponse: 'y', cause: 'calcul', regle: 'r' });
    const before = await loadAll(src);

    const text = JSON.stringify(makeBackup(before));
    const dst = await openStore(`dst-${Date.now()}`);
    await dst.put('notes', { id: 'à-effacer', valeur_relue: '', edition: '', date: '' });
    const after = await restoreBackup(dst, parseBackup(text));

    expect(after).toEqual(before);
  });

  it('refuse un fichier invalide sans rien écrire', async () => {
    expect(() => parseBackup('pas du json')).toThrow(/JSON/);
    expect(() => parseBackup(JSON.stringify({ schema_version: 2, app: 'iata-dgr' }))).toThrow(/non reconnu/);
  });
});
