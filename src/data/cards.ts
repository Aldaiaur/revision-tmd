import type { Card, CardFile } from '../model/card.ts';

const files = import.meta.glob<CardFile>('../../data/cards/*.json', { eager: true, import: 'default' });

const ORDER = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'T', 'P1', 'P2', 'P3', 'P4', 'QCM'];

export const CARD_FILES: CardFile[] = Object.values(files).sort((a, b) => ORDER.indexOf(a.fiche) - ORDER.indexOf(b.fiche));
export const ALL_CARDS: Card[] = CARD_FILES.flatMap((f) => f.cards);
export const CARD_BY_ID = new Map(ALL_CARDS.map((c) => [c.id, c]));
export const ALL_TAGS = [...new Set(ALL_CARDS.flatMap((c) => c.tags))].sort();
export const ALL_FICHES = CARD_FILES.map((f) => f.fiche);

/** Numéro court et stable d'une carte (ordre de la source), utile à l'impression. */
export const CARD_NUMBER = new Map(ALL_CARDS.map((c, i) => [c.id, i + 1]));
