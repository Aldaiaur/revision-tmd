import { useSyncExternalStore } from 'react';

/**
 * Mises à jour de l'app hors ligne : la nouvelle version est téléchargée en arrière-plan,
 * puis proposée par un bandeau (jamais de rechargement imposé en pleine révision).
 */
let besoin = false;
let appliquer: ((reload?: boolean) => Promise<void>) | null = null;
const abonnes = new Set<() => void>();

export function setupPwa() {
  if (!import.meta.env.PROD) return;
  void import('virtual:pwa-register').then(({ registerSW }) => {
    appliquer = registerSW({
      immediate: true,
      onNeedRefresh() {
        besoin = true;
        abonnes.forEach((f) => f());
      },
    });
  });
}

export function useMiseAJour(): { disponible: boolean; recharger: () => void } {
  const disponible = useSyncExternalStore(
    (f) => {
      abonnes.add(f);
      return () => abonnes.delete(f);
    },
    () => besoin,
  );
  return { disponible, recharger: () => void appliquer?.(true) };
}
