import type { Review } from '../storage/db.ts';

/** Cartes « points faibles » : au moins un « raté » ou « hésité » parmi leurs N dernières révisions. */
export function weakIds(reviews: Review[], lastN = 3): Set<string> {
  const byCard = new Map<string, Review[]>();
  for (const r of reviews) {
    if (r.mode !== 'revision') continue;
    const list = byCard.get(r.cardId) ?? [];
    list.push(r);
    byCard.set(r.cardId, list);
  }
  const out = new Set<string>();
  for (const [id, list] of byCard) {
    const recent = [...list].sort((a, b) => a.date.localeCompare(b.date)).slice(-lastN);
    if (recent.some((r) => r.note !== 'su')) out.add(id);
  }
  return out;
}
