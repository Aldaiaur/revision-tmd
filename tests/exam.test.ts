import { describe, expect, it } from 'vitest';
import { autoVerdict, drawExam, formatDuration, journalCsv, passed, remainingMs, score, seeded } from '../src/exam/exam.ts';
import { ALL_CARDS, CARD_BY_ID } from '../src/data/cards.ts';
import { CONFIG } from '../src/model/config.ts';
import type { CardState } from '../src/srs/leitner.ts';

const noStates = new Map<string, CardState>();

describe('tirage', () => {
  it('exclut les cartes obsolètes et respecte le nombre demandé', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const ids = drawExam(ALL_CARDS, noStates, CONFIG.examen, [1, 2], 40, seeded(seed));
      expect(ids).toHaveLength(40);
      expect(new Set(ids).size).toBe(40);
      expect(ids.some((id) => CARD_BY_ID.get(id)!.statut === 'obsolete')).toBe(false);
    }
  });
  it('reproductible avec une graine', () => {
    const a = drawExam(ALL_CARDS, noStates, CONFIG.examen, [1, 2], 10, seeded(42));
    const b = drawExam(ALL_CARDS, noStates, CONFIG.examen, [1, 2], 10, seeded(42));
    expect(a).toEqual(b);
  });
  it('un module de poids nul n’est jamais tiré', () => {
    const cfg = { ...CONFIG.examen, poidsModules: { ...CONFIG.examen.poidsModules, 'Classe 7': 0 } };
    const ids = drawExam(ALL_CARDS, noStates, cfg, [1, 2], 200, seeded(7));
    expect(ids.some((id) => CARD_BY_ID.get(id)!.module === 'Classe 7')).toBe(false);
  });
  it('les boîtes faibles sont sur-représentées', () => {
    const pool = ALL_CARDS.filter((c) => c.statut !== 'obsolete');
    const weak = new Set(pool.filter((_, i) => i % 2 === 0).map((c) => c.id));
    const states = new Map<string, CardState>([...weak].map((id) => [id, { box: 1, due: '', lastNote: 'rate', lastDay: '', count: 1 }]));
    const cfg = { ...CONFIG.examen, bonusBoitesFaibles: 4 };
    let hits = 0;
    for (let seed = 1; seed <= 30; seed++) hits += drawExam(pool, states, cfg, [1, 2], 40, seeded(seed)).filter((id) => weak.has(id)).length;
    expect(hits / (30 * 40)).toBeGreaterThan(0.7);
  });
});

describe('chrono et score', () => {
  it('temps restant, jamais négatif', () => {
    const run = { debut: '2026-10-01T08:00:00Z', dureeMin: 180 };
    expect(remainingMs(run, Date.parse('2026-10-01T10:30:00Z'))).toBe(30 * 60_000);
    expect(remainingMs(run, Date.parse('2026-10-01T12:00:00Z'))).toBe(0);
    expect(formatDuration(3 * 3600_000)).toBe('3:00:00');
    expect(formatDuration(61_500)).toBe('0:01:02');
  });
  it('correction automatique des QCM seulement', () => {
    const qcm = ALL_CARDS.find((c) => c.type === 'qcm' && c.bonne_lettre)!;
    expect(autoVerdict(qcm, qcm.bonne_lettre)).toBe(true);
    expect(autoVerdict(qcm, 'Z')).toBe(false);
    expect(autoVerdict(ALL_CARDS.find((c) => !c.choix)!, 'x')).toBeUndefined();
  });
  it('score et seuil de 80 %', () => {
    const ids = Array.from({ length: 10 }, (_, i) => `c${i}`);
    const v = Object.fromEntries(ids.map((id, i) => [id, i < 8]));
    expect(score(ids, v)).toEqual({ justes: 8, total: 10, ratio: 0.8, complet: true });
    expect(passed(0.8, CONFIG.examen.seuil)).toBe(true);
    expect(passed(0.79, CONFIG.examen.seuil)).toBe(false);
    expect(score(ids, { c0: true }).complet).toBe(false);
  });
});

describe('journal d’erreurs', () => {
  it('CSV échappé, séparateur point-virgule', () => {
    const csv = journalCsv([
      { date: '2026-10-01T10:00:00Z', cardId: 'F1.A.Q1', question: 'Q "citée"; ok', maReponse: 'a\nb', bonneReponse: 'c', cause: 'colonne', regle: 'r' },
    ]);
    expect(csv.startsWith('﻿"Date";')).toBe(true);
    expect(csv).toContain('"Q ""citée""; ok";"a b"');
  });
});
