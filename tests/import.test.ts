import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  decideStatut,
  extractRefs,
  importFiche,
  importPhase,
  splitChoices,
  type ExerciceConfig,
  type FicheConfig,
} from '../scripts/import/core.ts';
import { applyOverrides } from '../scripts/import/report.ts';
import { CardSchema } from '../src/model/card.ts';

const opts = { longAnswerChars: 240, longReasoningChars: 200 };

// Extraits réels des fiches (F1 D4, F2 Q9, F1 A)
const FICHE = `# F1 — Test

## A. Généralités (14 questions)

| Q | Question (abrégée) | Réponse du corrigé | Pourquoi / à retenir | Statut |
|---|---|---|---|---|
| 1 | Autorité compétente en France ? | **DGAC** | Le corrigé renvoie à la « divergence FRG-01 » (variation d'État). | 🟢 réponse · 🔴 code de variation |
| 5 | Périodicité de l'actualisation des connaissances ? | **2 ans** | Recyclage 24 mois (1.5.2.1). | 🟢 |
| 11 | Autorité compétente DG : Estonie | Ministry of Economic Affairs | Appendice D.1. | 🔴 à relire en Appendice D |

## B. Classification

**Q9 — Classe 3, (PIE, PE) → GE**

| PIE / PE | GE | PIE / PE | GE |
|---|---|---|---|
| 45 / 21 | **II** | 45 / 31 | **III** |

## C. Autre

| X | Y |
|---|---|
| a | b |
`;

const CFG: FicheConfig = {
  fiche: 'F1',
  fichier: 'test.md',
  edition_ref: '54-55',
  tables: [
    { match: 'A. Généralités', code: 'A', kind: 'qr', module: 'Généralités' },
    { match: 'Q9 — Classe 3', code: 'A-Q9', kind: 'pairs', module: 'Classification', question: 'Classe 3 — PIE / PE = {0} °C : GE ?', statut: '🟢' },
  ],
  paragraphs: [],
};

describe('statuts', () => {
  it('pastille unique', () => {
    expect(decideStatut(['🟢'], '').statut).toBe('stable');
    expect(decideStatut(['🟠'], '').statut).toBe('a_relire');
    expect(decideStatut([], '').statut).toBe('a_relire');
  });
  it('🔴 périmé seul → obsolete ; mêlé → a_relire + partie-perimee', () => {
    expect(decideStatut(['🔴'], 'Garuda | Non | GA-03').statut).toBe('obsolete');
    const mixte = decideStatut(['🟢 réponse · 🔴 code de variation'], '');
    expect(mixte.statut).toBe('a_relire');
    expect(mixte.tags).toContain('partie-perimee');
  });
  it('🔴 erreur du corrigé → reste en révision avec le tag piege-corrige', () => {
    const d = decideStatut(['🔴 le corrigé écrit GE II'], '');
    expect(d).toMatchObject({ statut: 'a_relire', nature_rouge: 'erreur_corrigee' });
    expect(d.tags).toContain('piege-corrige');
  });
  it('un numéro UN n’est pas un code de variation', () => {
    expect(decideStatut(['🔴 incohérence livret/diapo'], 'UN 1986, PI 364').nature_rouge).toBe('erreur_corrigee');
  });
  it('🔴 de nature inconnue → a_relire + rouge-a-trier', () => {
    expect(decideStatut(['🔴 pour la formule'], 'Q = 0,9').tags).toContain('rouge-a-trier');
  });
});

describe('importFiche', () => {
  const r = importFiche(FICHE, CFG, opts);

  it('une ligne = une carte valide, réponse copiée telle quelle', () => {
    const c = r.cards.find((c) => c.id === 'F1.A.Q5')!;
    expect(c.question).toBe("Périodicité de l'actualisation des connaissances ?");
    expect(c.reponse_courte).toBe('**2 ans**');
    expect(c.ref_dgr).toContain('1.5.2.1');
    for (const card of r.cards) expect(() => CardSchema.parse(card)).not.toThrow();
  });

  it('statut mixte et 🔴 périmé', () => {
    expect(r.cards.find((c) => c.id === 'F1.A.Q1')!.statut).toBe('a_relire');
    expect(r.cards.find((c) => c.id === 'F1.A.Q11')!.statut).toBe('obsolete');
  });

  it('un tableau double produit 2 cartes par ligne', () => {
    const pairs = r.cards.filter((c) => c.id.startsWith('F1.A-Q9.'));
    expect(pairs.map((c) => c.id)).toEqual(['F1.A-Q9.45-21', 'F1.A-Q9.45-31']);
    expect(pairs[1]!.question).toBe('Classe 3 — PIE / PE = 45 / 31 °C : GE ?');
    expect(pairs[1]!.reponse_courte).toBe('**III**');
  });

  it('un tableau non configuré va dans le rapport', () => {
    expect(r.report.some((e) => e.motif === 'Tableau non configuré' && e.extrait === 'X | Y')).toBe(true);
  });

  it('les identifiants restent stables quand on insère une ligne', () => {
    const insert = FICHE.replace('| 5 |', '| 3 | Nouvelle question ? | **Oui** | | 🟢 |\n| 5 |');
    const r2 = importFiche(insert, CFG, opts);
    const before = new Map(r.cards.map((c) => [c.id, c.hash_source]));
    for (const [id, h] of before) expect(r2.cards.find((c) => c.id === id)?.hash_source).toBe(h);
    expect(r2.cards.some((c) => c.id === 'F1.A.Q3')).toBe(true);
  });

  it('import déterministe', () => {
    expect(JSON.stringify(importFiche(FICHE, CFG, opts))).toBe(JSON.stringify(r));
  });
});

describe('exercices', () => {
  it('sépare les choix A-D et retrouve la bonne lettre', () => {
    expect(splitChoices('Quelle colonne ? A. G  B. I  C. K  D. M')).toEqual({
      question: 'Quelle colonne ?',
      choix: [
        { lettre: 'A', texte: 'G' },
        { lettre: 'B', texte: 'I' },
        { lettre: 'C', texte: 'K' },
        { lettre: 'D', texte: 'M' },
      ],
    });
    const md = `# Phase\n\n# B. EXERCICES\n\n## Thème 1 : Navigation\n**1.1** Quelle colonne ?\nA. G  B. I  C. K  D. M\n\n**1.2** Question libre ?\n\n# C. CORRIGÉ\n\n**1.1 B (colonne I)**, quantité en J.\n\n**1.2** Réponse libre.\n`;
    const cfg: ExerciceConfig = { fiche: 'P1', fichier: 'p.md', format: 'phase', moduleByTheme: { '1': 'Identification' } };
    const { cards } = importPhase(md, cfg, opts);
    expect(cards.map((c) => [c.id, c.type, c.bonne_lettre])).toEqual([
      ['P1.Q1-1', 'qcm', 'B'],
      ['P1.Q1-2', 'question_ouverte', undefined],
    ]);
    expect(cards[1]!.reponse_courte).toBe('Réponse libre.');
  });
});

describe('références et overrides', () => {
  it('extrait les numéros de section sans texte', () => {
    expect(extractRefs(['table 9.3.A et 7.1.4.1 ; Appendice B.2.1 ; Section 2.8'])).toEqual(['9.3.A', '7.1.4.1', '2.8', 'App. B.2.1']);
  });
  it('les overrides ont le dernier mot et signalent une source modifiée', () => {
    const { cards } = importFiche(FICHE, CFG, opts);
    const rep = applyOverrides(cards, {
      schema_version: 1,
      cards: { 'F1.A.Q11': { statut: 'a_relire', hash_source: 'autre' }, 'X.Y': { tags: [] } },
    });
    expect(cards.find((c) => c.id === 'F1.A.Q11')!.statut).toBe('a_relire');
    expect(rep).toEqual({ applied: ['F1.A.Q11'], unknown: ['X.Y'], stale: ['F1.A.Q11'] });
  });
});

describe('données réelles', () => {
  it('toutes les cartes générées sont valides et uniques', () => {
    const dir = path.resolve(__dirname, '../data/cards');
    const ids = new Set<string>();
    for (const f of fs.readdirSync(dir)) {
      for (const c of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).cards) {
        CardSchema.parse(c);
        expect(ids.has(c.id)).toBe(false);
        ids.add(c.id);
      }
    }
    expect(ids.size).toBeGreaterThan(400);
  });
});
