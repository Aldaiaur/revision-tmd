import { useEffect, useState, type RefObject } from 'react';
import type { Card } from '../model/card.ts';
import { useStore } from '../state/store.tsx';

/** Champ « valeur relue dans mon DGR » d'une carte à vérifier. Stocké en IndexedDB, jamais dans les fiches. */
export function NoteForm({ card, inputRef }: { card: Card; inputRef?: RefObject<HTMLInputElement | null> }) {
  const { t, notesById, saveNote } = useStore();
  const existing = notesById.get(card.id);
  const [valeur, setValeur] = useState(existing?.valeur_relue ?? '');
  const [edition, setEdition] = useState(existing?.edition ?? '67');

  useEffect(() => {
    setValeur(existing?.valeur_relue ?? '');
    setEdition(existing?.edition ?? '67');
  }, [card.id, existing]);

  const dirty = valeur !== (existing?.valeur_relue ?? '') || edition !== (existing?.edition ?? '67');

  return (
    <form
      className="note-form"
      onSubmit={(e) => {
        e.preventDefault();
        void saveNote({ id: card.id, valeur_relue: valeur.trim(), edition: edition.trim(), date: new Date().toISOString() });
      }}
    >
      <label className="note-label" htmlFor={`note-${card.id}`}>
        {t.carte.noteTitre}
      </label>
      <div className="note-row">
        <input
          id={`note-${card.id}`}
          ref={inputRef}
          value={valeur}
          onChange={(e) => setValeur(e.target.value)}
          placeholder={t.carte.notePlaceholder}
          onKeyDown={(e) => e.stopPropagation()}
        />
        <label className="note-ed">
          {t.carte.noteEdition}
          <input value={edition} onChange={(e) => setEdition(e.target.value)} size={3} onKeyDown={(e) => e.stopPropagation()} />
        </label>
        <button type="submit" disabled={!dirty}>
          {t.carte.noteEnregistrer}
        </button>
      </div>
      {existing && !dirty && <p className="muted small">{t.carte.noteEnregistree(new Date(existing.date).toLocaleDateString())}</p>}
    </form>
  );
}
