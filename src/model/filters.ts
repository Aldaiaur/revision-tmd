import type { Card, CardType, Module, Statut } from './card.ts';

export type Note = 'su' | 'hesite' | 'rate';

export type Filter = {
  modules: Module[];
  statuts: Statut[];
  types: CardType[];
  fiches: string[];
  tags: string[];
  /** Seulement les cartes dont la dernière note est « raté » ou « hésité ». */
  ratees: boolean;
  texte: string;
};

/** Par défaut, les cartes obsolètes sont exclues de la révision. */
export const DEFAULT_FILTER: Filter = {
  modules: [],
  statuts: ['stable', 'a_relire'],
  types: [],
  fiches: [],
  tags: [],
  ratees: false,
  texte: '',
};

export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[*_`|#>]/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const indexCache = new WeakMap<Card, string>();
function indexOf(c: Card): string {
  let s = indexCache.get(c);
  if (s === undefined) {
    s = normalize(
      [c.id, c.question, c.reponse_courte, c.raisonnement, c.developpement, c.statut_source, c.ref_dgr.join(' '), c.tags.join(' '), c.module].join(' '),
    );
    indexCache.set(c, s);
  }
  return s;
}

/** Recherche plein texte : tous les mots doivent être présents (accents et casse ignorés). */
export function matchesText(c: Card, texte: string): boolean {
  const tokens = normalize(texte).split(' ').filter(Boolean);
  if (!tokens.length) return true;
  const idx = indexOf(c);
  return tokens.every((t) => idx.includes(t));
}

export function applyFilter(cards: Card[], f: Filter, lastNote: Map<string, Note> = new Map()): Card[] {
  return cards.filter(
    (c) =>
      (!f.modules.length || f.modules.includes(c.module)) &&
      (!f.statuts.length || f.statuts.includes(c.statut)) &&
      (!f.types.length || f.types.includes(c.type)) &&
      (!f.fiches.length || f.fiches.includes(c.source.fiche)) &&
      (!f.tags.length || f.tags.every((t) => c.tags.includes(t))) &&
      (!f.ratees || ['rate', 'hesite'].includes(lastNote.get(c.id) ?? '')) &&
      matchesText(c, f.texte),
  );
}

export function isDefaultFilter(f: Filter): boolean {
  return JSON.stringify(f) === JSON.stringify(DEFAULT_FILTER);
}
