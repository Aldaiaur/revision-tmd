/**
 * Examen blanc : tirage pondéré, chronomètre, score. Fonctions pures.
 * Paramètres (durée, seuil, nombre de questions, poids) : data/app-config.json, jamais en dur.
 */
import type { Card } from '../model/card.ts';
import type { AppConfig } from '../model/config.ts';
import type { CardState } from '../srs/leitner.ts';
import type { ExamRun, JournalEntry } from '../storage/db.ts';

/** Générateur pseudo-aléatoire reproductible (mulberry32), pour les tests. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function weightOf(card: Card, states: Map<string, CardState>, cfg: AppConfig['examen'], faibles: number[]): number {
  const base = cfg.poidsModules[card.module] ?? 1;
  const box = states.get(card.id)?.box;
  return base * (box !== undefined && faibles.includes(box) ? cfg.bonusBoitesFaibles : 1);
}

/**
 * Tirage pondéré sans remise (méthode d'Efraimidis-Spirakis : clé = u^(1/w), on garde les n plus grandes).
 * Les cartes obsolètes et celles de poids nul sont exclues.
 */
export function drawExam(
  cards: Card[],
  states: Map<string, CardState>,
  cfg: AppConfig['examen'],
  faibles: number[],
  n: number,
  rnd: () => number = Math.random,
): string[] {
  return cards
    .filter((c) => c.statut !== 'obsolete')
    .map((c) => ({ id: c.id, w: weightOf(c, states, cfg, faibles) }))
    .filter((x) => x.w > 0)
    .map((x) => ({ id: x.id, key: Math.pow(rnd() || Number.MIN_VALUE, 1 / x.w) }))
    .sort((a, b) => b.key - a.key)
    .slice(0, n)
    .map((x) => x.id);
}

export function remainingMs(run: Pick<ExamRun, 'debut' | 'dureeMin'>, now: number): number {
  return Math.max(0, Date.parse(run.debut) + run.dureeMin * 60_000 - now);
}

export function formatDuration(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${Math.floor(s / 3600)}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

/** Verdict automatique des QCM ; `undefined` pour les questions à auto-évaluer. */
export function autoVerdict(card: Card, answer: string | undefined): boolean | undefined {
  if (!card.choix || !card.bonne_lettre) return undefined;
  return answer === card.bonne_lettre;
}

export function score(ids: string[], verdicts: Record<string, boolean>): { justes: number; total: number; ratio: number; complet: boolean } {
  const justes = ids.filter((id) => verdicts[id] === true).length;
  const complet = ids.every((id) => id in verdicts);
  return { justes, total: ids.length, ratio: ids.length ? justes / ids.length : 0, complet };
}

export function passed(ratio: number, seuil: number): boolean {
  return ratio >= seuil - 1e-9;
}

export const CAUSES = ['colonne', 'section', 'variation', 'vocabulaire', 'calcul', 'lecture', 'autre'] as const;

/** Export CSV du journal d'erreurs (séparateur « ; », BOM UTF-8 pour Excel en français). */
export function journalCsv(entries: JournalEntry[]): string {
  const esc = (v: string) => `"${v.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
  const head = ['Date', 'Carte', 'Question', 'Ma réponse', 'Bonne réponse', 'Cause', 'Règle à retenir'];
  const rows = entries.map((e) => [e.date.slice(0, 10), e.cardId, e.question, e.maReponse, e.bonneReponse, e.cause, e.regle].map(esc).join(';'));
  return '﻿' + [head.map(esc).join(';'), ...rows].join('\r\n') + '\r\n';
}
