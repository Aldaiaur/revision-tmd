import { describe, expect, it } from 'vitest';
import { addDays, applyReview, computeStates, dailyQueue, nextBox, streak } from '../src/srs/leitner.ts';
import type { Review } from '../src/storage/db.ts';
import { CONFIG } from '../src/model/config.ts';

const cfg = { intervallesJours: [1, 2, 4, 8, 16] };
const at = (day: string, cardId: string, note: Review['note']): Review => ({ cardId, note, mode: 'revision', date: `${day}T10:00:00` });

describe('transitions Leitner', () => {
  it('su monte, hésité reste, raté retourne en boîte 1, plafond à 5', () => {
    expect(nextBox(undefined, 'su')).toBe(2);
    expect(nextBox(undefined, 'hesite')).toBe(1);
    expect(nextBox(3, 'hesite')).toBe(3);
    expect(nextBox(4, 'rate')).toBe(1);
    expect(nextBox(5, 'su')).toBe(5);
  });
  it('échéance selon l’intervalle de la boîte', () => {
    expect(applyReview(undefined, 'su', '2026-10-01', cfg)).toMatchObject({ box: 2, due: '2026-10-03', count: 1 });
    expect(applyReview({ box: 4, due: '', lastNote: 'su', lastDay: '', count: 3 }, 'su', '2026-10-01', cfg).due).toBe('2026-10-17');
  });
  it('plafonnement par la date d’examen', () => {
    const s = applyReview({ box: 4, due: '', lastNote: 'su', lastDay: '', count: 3 }, 'su', '2026-10-01', cfg, '2026-10-10');
    expect(s.due).toBe('2026-10-10');
    // examen passé : pas de plafond
    expect(applyReview(undefined, 'su', '2026-10-01', cfg, '2026-09-01').due).toBe('2026-10-03');
  });
  it('les dates franchissent les mois et années', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('états, file du jour et série', () => {
  const reviews = [
    at('2026-10-01', 'a', 'su'),
    at('2026-10-03', 'a', 'su'),
    at('2026-10-01', 'b', 'rate'),
    at('2026-10-02', 'b', 'hesite'),
    { ...at('2026-10-02', 'c', 'rate'), mode: 'examen' as const },
  ];
  const states = computeStates(reviews, cfg);
  it('rejoue l’historique dans l’ordre chronologique, sans les réponses d’examen', () => {
    expect(states.get('a')).toMatchObject({ box: 3, due: '2026-10-07', count: 2 });
    expect(states.get('b')).toMatchObject({ box: 1, due: '2026-10-03' });
    expect(states.has('c')).toBe(false);
  });
  it('file du jour : échues puis nouvelles (limitées)', () => {
    const cards = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }));
    expect(dailyQueue(cards, states, '2026-10-03', 2).map((c) => c.id)).toEqual(['b', 'c', 'd']);
    expect(dailyQueue(cards, states, '2026-10-07', 0).map((c) => c.id)).toEqual(['b', 'a']);
  });
  it('série de jours consécutifs', () => {
    expect(streak(reviews, '2026-10-03')).toBe(3);
    expect(streak(reviews, '2026-10-04')).toBe(3);
    expect(streak(reviews, '2026-10-05')).toBe(0);
  });
  it('la configuration de l’app est valide', () => {
    expect(CONFIG.leitner.intervallesJours).toHaveLength(5);
    expect(CONFIG.examen.seuil).toBe(0.8);
  });
});
