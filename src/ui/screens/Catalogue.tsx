import { useEffect, useMemo, useRef, useState } from 'react';
import { applyFilter, DEFAULT_FILTER, type Filter } from '../../model/filters.ts';
import { CARD_NUMBER } from '../../data/cards.ts';
import { useDeck } from '../../state/deck.tsx';
import { useStore } from '../../state/store.tsx';
import { FilterBar } from '../FilterBar.tsx';
import { Banners, Recto, Verso } from '../CardFaces.tsx';
import { NoteForm } from '../NoteForm.tsx';
import { Markdown } from '../Markdown.tsx';
import { StatusIcon } from '../StatusIcon.tsx';
import { useHotkeys } from '../hooks.ts';

/** Le catalogue montre aussi les cartes obsolètes (avec bandeau). */
const CATALOGUE_FILTER: Filter = { ...DEFAULT_FILTER, statuts: [] };

export function Catalogue() {
  const { t, lastNote, selected, toggleSelected, setSelected, notesById } = useStore();
  const deck = useDeck();
  const [filter, setFilter] = useState<Filter>(CATALOGUE_FILTER);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const cards = useMemo(() => applyFilter(deck.cards, filter, lastNote), [deck.cards, filter, lastNote]);
  const deckIds = useMemo(() => new Set(deck.cards.map((c) => c.id)), [deck.cards]);
  const nbCoches = [...selected].filter((id) => deckIds.has(id)).length;

  useEffect(() => setActive(0), [filter]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView?.({ block: 'nearest' });
  }, [active]);

  useHotkeys((e) => {
    const c = cards[active];
    if (e.key === '/') {
      e.preventDefault();
      searchRef.current?.focus();
    } else if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, cards.length - 1));
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if ((e.key === 'x' || e.key === 'X') && c) void toggleSelected(c.id);
    else if (e.key === 'Enter' && c && (e.target as HTMLElement).tagName !== 'BUTTON') setOpen((o) => (o === c.id ? null : c.id));
  });

  return (
    <div className="screen">
      <h1>{t.catalogue.titre}</h1>
      <FilterBar filter={filter} onChange={setFilter} count={cards.length} searchRef={searchRef} />
      <div className="actions">
        <span className="muted">{t.catalogue.coches(nbCoches)}</span>
        <button type="button" onClick={() => void setSelected([...selected, ...cards.map((c) => c.id)])}>
          {t.catalogue.toutCocher}
        </button>
        <button type="button" disabled={!nbCoches} onClick={() => void setSelected([...selected].filter((id) => !deckIds.has(id)))}>
          {t.catalogue.toutDecocher}
        </button>
        <span className="muted small">{t.catalogue.raccourcis}</span>
      </div>
      <ol className="card-list" ref={listRef}>
        {cards.map((c, idx) => (
          <li key={c.id} data-index={idx} className={`card-row ${idx === active ? 'active' : ''} status-row-${c.statut}`}>
            <div className="card-row-head">
              <input
                type="checkbox"
                aria-label={`${t.catalogue.cocher} #${CARD_NUMBER.get(c.id)}`}
                checked={selected.has(c.id)}
                onChange={() => void toggleSelected(c.id)}
              />
              <button
                type="button"
                className="card-row-title"
                aria-expanded={open === c.id}
                onClick={() => {
                  setActive(idx);
                  setOpen(open === c.id ? null : c.id);
                }}
              >
                <span className="card-num">#{CARD_NUMBER.get(c.id)}</span>
                <StatusIcon statut={c.statut} size={13} title={t.statutLong[c.statut]} />
                <Markdown inline text={c.question} />
              </button>
              <span className="chip">{c.module}</span>
              {notesById.has(c.id) && <span className="chip chip-note" title={notesById.get(c.id)!.valeur_relue}>✎</span>}
            </div>
            {open === c.id && (
              <div className="card-row-body">
                <Banners card={c} />
                {c.choix && <Recto card={c} choice={c.bonne_lettre ?? null} />}
                <Verso card={c} />
                {c.statut === 'a_relire' && <NoteForm card={c} />}
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
