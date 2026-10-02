import { describe, expect, it } from 'vitest';
import { ADR_CARDS, ADR_FILES, ALL_CARDS, DECKS, deckOf } from '../src/data/cards.ts';
import { ADR_MODULES, CardSchema } from '../src/model/card.ts';

describe('cartes ADR', () => {
  it('respectent le schéma commun des cartes', () => {
    for (const c of ADR_CARDS) expect(() => CardSchema.parse(c), c.id).not.toThrow();
  });

  it('ont des identifiants uniques, distincts des cartes IATA', () => {
    const ids = ADR_CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => deckOf(id) === 'adr')).toBe(true);
    expect(ALL_CARDS.every((c) => deckOf(c.id) === 'iata')).toBe(true);
  });

  it('couvrent tous les modules ADR', () => {
    for (const m of ADR_MODULES) expect(ADR_CARDS.some((c) => c.module === m), m).toBe(true);
    expect(DECKS.adr.fiches).toEqual(ADR_FILES.map((f) => f.fiche));
  });

  it('QCM : la bonne lettre fait partie des choix', () => {
    for (const c of ADR_CARDS.filter((x) => x.type === 'qcm')) {
      expect(c.choix?.some((x) => x.lettre === c.bonne_lettre), c.id).toBe(true);
      expect(c.reponse_courte, c.id).toBeTruthy();
    }
  });

  it('une carte à vérifier explique pourquoi', () => {
    for (const c of ADR_CARDS.filter((x) => x.statut === 'a_relire')) expect(c.statut_source, c.id).not.toBe('À vérifier');
  });
});

describe('séparation IATA / ADR', () => {
  it('l\'examen blanc ADR a ses propres réglages', async () => {
    const { CONFIG } = await import('../src/model/config.ts');
    expect(CONFIG.examenAdr.nbQuestions).toBeLessThan(CONFIG.examen.nbQuestions);
    expect(CONFIG.examenAdr.dureeMin).toBeLessThan(CONFIG.examen.dureeMin);
  });

  it('aucune carte ne cite les guides formateur (documents internes)', () => {
    for (const c of ADR_CARDS) expect(JSON.stringify(c), c.id).not.toMatch(/guide formateur/i);
  });
});
