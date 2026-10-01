import { useEffect, useState, type RefObject } from 'react';
import type { Card } from '../model/card.ts';
import { useStore } from '../state/store.tsx';
import { useDeck } from '../state/deck.tsx';

/** Champ « valeur relue dans mon DGR / ADR » d'une carte à vérifier. Stocké en IndexedDB, jamais dans les fiches. */
export function NoteForm({ card, inputRef }: { card: Card; inputRef?: RefObject<HTMLInputElement | null> }) {
  const { t, notesById, saveNote } = useStore();
  const { l } = useDeck();
  const existing = notesById.get(card.id);
  const [valeur, setValeur] = useState(existing?.valeur_relue ?? '');
  const [edition, setEdition] = useState(existing?.edition ?? l.editionDefaut);

  useEffect(() => {
    setValeur(existing?.valeur_relue ?? '');
    setEdition(existing?.edition ?? l.editionDefaut);
  }, [card.id, existing, l.editionDefaut]);

  const dirty = valeur !== (existing?.valeur_relue ?? '') || edition !== (existing?.edition ?? l.editionDefaut);

  return (
    <form
      className="note-form"
      onSubmit={(e) => {
        e.preventDefault();
        void saveNote({ id: card.id, valeur_relue: valeur.trim(), edition: edition.trim(), date: new Date().toISOString() });
      }}
    >
      <label className="note-label" htmlFor={`note-${card.id}`}>
        {l.noteTitre}
      </label>
      <div className="note-row">
        <input
          id={`note-${card.id}`}
          ref={inputRef}
          value={valeur}
          onChange={(e) => setValeur(e.target.value)}
          placeholder={l.notePlaceholder}
          onKeyDown={(e) => e.stopPropagation()}
        />
        <label className="note-ed">
          {t.carte.noteEdition}
          <input value={edition} onChange={(e) => setEdition(e.target.value)} size={4} onKeyDown={(e) => e.stopPropagation()} />
        </label>
        <button type="submit" disabled={!dirty}>
          {t.carte.noteEnregistrer}
        </button>
      </div>
      {existing && !dirty && <p className="muted small">{t.carte.noteEnregistree(new Date(existing.date).toLocaleDateString())}</p>}
    </form>
  );
}
