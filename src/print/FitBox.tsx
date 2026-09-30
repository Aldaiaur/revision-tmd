import { useLayoutEffect, useRef, type ReactNode } from 'react';

/**
 * Réduit la taille du texte (en pt) jusqu'à ce que le contenu tienne dans la boîte.
 * La mesure ne dépend pas de l'échelle d'aperçu (transform), donc l'impression reprend exactement la même taille.
 * En dessous de `min`, la boîte est marquée `data-overflow` : la carte affiche alors un renvoi vers l'app.
 */
export function FitBox({ children, max, min, className, depKey }: { children: ReactNode; max: number; min: number; className?: string; depKey: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fits = (pt: number) => {
      el.style.fontSize = `${pt}pt`;
      return el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1;
    };
    el.removeAttribute('data-overflow');
    if (fits(max)) return;
    let lo = min;
    let hi = max;
    if (!fits(lo)) {
      el.setAttribute('data-overflow', 'true');
      return;
    }
    for (let k = 0; k < 7; k++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) lo = mid;
      else hi = mid;
    }
    fits(Math.floor(lo * 4) / 4);
  }, [depKey, max, min]);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
