import { ADR_MODULES, MODULES, type Card, type CardFile, type CardType, type Module, type Statut } from '../model/card.ts';

const files = import.meta.glob<CardFile>('../../data/cards/*.json', { eager: true, import: 'default' });

const ORDER = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'T', 'P1', 'P2', 'P3', 'P4', 'QCM'];

export const CARD_FILES: CardFile[] = Object.values(files).sort((a, b) => ORDER.indexOf(a.fiche) - ORDER.indexOf(b.fiche));
/** Cartes IATA DGR (générées par l'import des fiches Markdown). */
export const ALL_CARDS: Card[] = CARD_FILES.flatMap((f) => f.cards);
export const ALL_TAGS = [...new Set(ALL_CARDS.flatMap((c) => c.tags))].sort();
export const ALL_FICHES = CARD_FILES.map((f) => f.fiche);

/**
 * Cartes ADR : rédigées à la main dans data/adr/*.json, sous une forme compacte (voir AdrCard),
 * puis complétées ici au format commun des cartes.
 */
export type AdrCard = {
  /** Identifiant local, unique dans le fichier (ex. « Q1 »). */
  n: string;
  type: CardType;
  q: string;
  /** QCM : textes des choix, dans l'ordre A, B, C… */
  choix?: string[];
  bonne?: string;
  /** Réponse courte ; pour un QCM, déduite de la bonne lettre si absente. */
  r?: string;
  why?: string;
  dev?: string;
  ref?: string[];
  tags?: string[];
  diff?: 1 | 2 | 3;
  module?: Module;
  statut?: Statut;
  /** Pourquoi la carte est à vérifier (affiché comme « statut dans la fiche »). */
  verif?: string;
  /** Question d'origine dans les supports (ex. « Évaluation Q11 »). */
  src?: string;
};
export type AdrFile = { fiche: string; titre: string; module: Module; fichier: string; cards: AdrCard[] };

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0');
}

export function expandAdr(f: AdrFile): Card[] {
  return f.cards.map((c, i) => {
    const choix = c.choix?.map((texte, k) => ({ lettre: String.fromCharCode(65 + k), texte }));
    const bonneTexte = choix?.find((x) => x.lettre === c.bonne)?.texte;
    const statut = c.statut ?? 'stable';
    return {
      id: `ADR.${f.fiche}.${c.n}`,
      module: c.module ?? f.module,
      source: { fiche: f.fiche, fichier: f.fichier, section: f.titre, question: c.src ?? c.n, ligne: i + 1 },
      type: c.type,
      question: c.q,
      reponse_courte: c.r ?? (bonneTexte ? `**${c.bonne}.** ${bonneTexte}` : null),
      raisonnement: c.why ?? null,
      developpement: c.dev ?? null,
      ...(choix && c.bonne ? { choix, bonne_lettre: c.bonne } : {}),
      statut,
      statut_source: c.verif ?? (statut === 'stable' ? 'Supports de formation' : 'À vérifier'),
      ref_dgr: c.ref ?? [],
      edition_ref: '2025',
      edition_verifiee: null,
      tags: c.tags ?? [],
      difficulte: c.diff ?? 2,
      hash_source: hash(JSON.stringify(c)),
    } satisfies Card;
  });
}

const adrFiles = import.meta.glob<AdrFile>('../../data/adr/*.json', { eager: true, import: 'default' });
export const ADR_FILES: AdrFile[] = Object.values(adrFiles).sort((a, b) => a.fiche.localeCompare(b.fiche, 'fr', { numeric: true }));
export const ADR_CARDS: Card[] = ADR_FILES.flatMap(expandAdr);

/** Une révision : IATA (aérien) ou ADR (routier), chacune avec ses cartes et sa progression. */
export type DeckId = 'iata' | 'adr';
export type Deck = {
  id: DeckId;
  cards: Card[];
  modules: readonly Module[];
  fiches: string[];
  tags: string[];
  /** Préfixe des routes de la révision (« #/adr/revision »). */
  prefix: string;
};

export const DECKS: Record<DeckId, Deck> = {
  iata: { id: 'iata', cards: ALL_CARDS, modules: MODULES, fiches: ALL_FICHES, tags: ALL_TAGS, prefix: '' },
  adr: {
    id: 'adr',
    cards: ADR_CARDS,
    modules: ADR_MODULES,
    fiches: ADR_FILES.map((f) => f.fiche),
    tags: [...new Set(ADR_CARDS.flatMap((c) => c.tags))].sort(),
    prefix: 'adr/',
  },
};

export const deckOf = (cardId: string): DeckId => (cardId.startsWith('ADR.') ? 'adr' : 'iata');

export const CARD_BY_ID = new Map([...ALL_CARDS, ...ADR_CARDS].map((c) => [c.id, c]));

/** Numéro court et stable d'une carte dans sa révision (ordre de la source), utile à l'impression. */
export const CARD_NUMBER = new Map([...ALL_CARDS.map((c, i) => [c.id, i + 1] as const), ...ADR_CARDS.map((c, i) => [c.id, i + 1] as const)]);
