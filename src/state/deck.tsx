import { createContext, useContext } from 'react';
import { DECKS, type Deck } from '../data/cards.ts';
import { useStore } from './store.tsx';

const DeckCtx = createContext<Deck>(DECKS.iata);

/** Révision affichée (IATA par défaut), fixée par la route. */
export const DeckProvider = DeckCtx.Provider;

/** Révision courante, avec ses libellés (DGR ou ADR) dans la langue de l'interface. */
export function useDeck() {
  const deck = useContext(DeckCtx);
  const { t } = useStore();
  return { ...deck, l: t.decks[deck.id], href: (page: string) => `#/${deck.prefix}${page}` };
}
