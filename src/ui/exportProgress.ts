import type { useStore } from '../state/store.tsx';
import { makeBackup } from '../storage/backup.ts';
import { localDay } from '../srs/leitner.ts';

/** Télécharge toute la progression du profil courant et note la date (pour le rappel de sauvegarde). */
export function exportProgress(store: ReturnType<typeof useStore>) {
  const { reviews, notes, selections, settings, exams, journal } = store;
  const blob = new Blob([JSON.stringify(makeBackup({ reviews, notes, selections, settings, exams, journal }), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `revision-tmd-progression-${localDay(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  void store.updateSettings({ rappelExport: localDay(new Date()) });
}
