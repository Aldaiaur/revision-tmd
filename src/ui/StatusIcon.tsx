import type { Statut } from '../model/card.ts';
import { useStore } from '../state/store.tsx';

/**
 * Pictogramme de statut codé par la forme (lisible en noir et blanc) :
 * disque plein = stable · triangle avec « ! » = à vérifier · carré barré = obsolète.
 */
export function StatusIcon({ statut, size = 16, title }: { statut: Statut; size?: number; title?: string }) {
  const common = { width: size, height: size, viewBox: '0 0 16 16', className: `status-icon status-${statut}`, role: 'img' as const };
  return (
    <svg {...common} aria-label={title ?? statut}>
      {title && <title>{title}</title>}
      {statut === 'stable' && <circle cx="8" cy="8" r="6.5" fill="currentColor" />}
      {statut === 'a_relire' && (
        <>
          <path d="M8 1.2 15.2 14.5H.8Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M8 6v4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="8" cy="12.3" r="1" fill="currentColor" />
        </>
      )}
      {statut === 'obsolete' && (
        <>
          <rect x="1.5" y="1.5" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export function StatusBadge({ statut }: { statut: Statut }) {
  const { t } = useStore();
  return (
    <span className={`badge badge-${statut}`} title={t.statutLong[statut]}>
      <StatusIcon statut={statut} size={13} title={t.statutLong[statut]} />
      {t.statut[statut]}
    </span>
  );
}
