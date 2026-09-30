/**
 * Répétition espacée : Leitner à 5 boîtes (choix justifié dans PLAN.md §4).
 * « Je savais » → boîte suivante ; « hésité » → même boîte ; « raté » → boîte 1.
 * L'état d'une carte est recalculé à partir de l'historique des notations : aucune donnée dérivée n'est stockée.
 */
import type { Note } from '../model/filters.ts';
import type { Review } from '../storage/db.ts';

export type Box = 1 | 2 | 3 | 4 | 5;
export type CardState = { box: Box; due: string; lastNote: Note; lastDay: string; count: number };
export type LeitnerConfig = { intervallesJours: number[] };

/** Jour local au format AAAA-MM-JJ (les échéances se comptent en jours calendaires). */
export function localDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return localDay(new Date(y, m - 1, d + n));
}

export function nextBox(box: Box | undefined, note: Note): Box {
  const b = box ?? 1;
  if (note === 'rate') return 1;
  if (note === 'hesite') return b;
  return Math.min(5, b + 1) as Box;
}

/** Applique une notation. Si une date d'examen future est connue, l'échéance ne la dépasse jamais. */
export function applyReview(prev: CardState | undefined, note: Note, day: string, cfg: LeitnerConfig, examDay?: string | null): CardState {
  const box = nextBox(prev?.box, note);
  let due = addDays(day, cfg.intervallesJours[box - 1]!);
  if (examDay && examDay > day && due > examDay) due = examDay;
  return { box, due, lastNote: note, lastDay: day, count: (prev?.count ?? 0) + 1 };
}

export function computeStates(reviews: Review[], cfg: LeitnerConfig, examDay?: string | null): Map<string, CardState> {
  const states = new Map<string, CardState>();
  const sorted = reviews.filter((r) => r.mode === 'revision').sort((a, b) => a.date.localeCompare(b.date));
  for (const r of sorted) states.set(r.cardId, applyReview(states.get(r.cardId), r.note, localDay(new Date(r.date)), cfg, examDay));
  return states;
}

export function isDue(s: CardState | undefined, today: string): boolean {
  return !!s && s.due <= today;
}

/** File du jour : cartes échues (les plus en retard et les boîtes basses d'abord), puis des nouvelles dans l'ordre des fiches. */
export function dailyQueue<T extends { id: string }>(cards: T[], states: Map<string, CardState>, today: string, newLimit: number): T[] {
  const due = cards
    .filter((c) => isDue(states.get(c.id), today))
    .sort((a, b) => {
      const sa = states.get(a.id)!;
      const sb = states.get(b.id)!;
      return sa.due.localeCompare(sb.due) || sa.box - sb.box;
    });
  const fresh = cards.filter((c) => !states.has(c.id)).slice(0, newLimit);
  return [...due, ...fresh];
}

/** Nombre de jours consécutifs avec au moins une révision, jusqu'à aujourd'hui (ou hier si rien encore aujourd'hui). */
export function streak(reviews: Review[], today: string): number {
  const days = new Set(reviews.filter((r) => r.mode === 'revision').map((r) => localDay(new Date(r.date))));
  let d = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}
