import { useEffect, useMemo, useRef, useState } from 'react';
import type { Card } from '../../model/card.ts';
import { applyFilter, DEFAULT_FILTER, type Filter, type Note } from '../../model/filters.ts';
import { ALL_CARDS, CARD_BY_ID } from '../../data/cards.ts';
import { useStore } from '../../state/store.tsx';
import { FilterBar } from '../FilterBar.tsx';
import { Banners, CardMeta, Recto, Verso } from '../CardFaces.tsx';
import { NoteForm } from '../NoteForm.tsx';
import { shuffle, useHotkeys } from '../hooks.ts';

export type SessionOrder = (cards: Card[]) => Card[];

export function Review({ order, extraOptions }: { order?: SessionOrder; extraOptions?: React.ReactNode } = {}) {
  const { t, lastNote, settings, updateSettings } = useStore();
  const [filter, setFilter] = useState<Filter>(DEFAULT_FILTER);
  const [queue, setQueue] = useState<string[] | null>(null);
  const matching = useMemo(() => applyFilter(ALL_CARDS, filter, lastNote), [filter, lastNote]);
  const planned = useMemo(() => (order ? order(matching) : matching), [order, matching]);

  const start = () => setQueue((settings.melanger ? shuffle(planned) : planned).map((c) => c.id));

  if (queue) return <Session ids={queue} onQuit={() => setQueue(null)} onRestart={start} />;

  return (
    <div className="screen">
      <h1>{t.revision.titre}</h1>
      <FilterBar filter={filter} onChange={setFilter} count={matching.length} />
      <div className="actions">
        {extraOptions}
        <label className="check">
          <input type="checkbox" checked={settings.melanger} onChange={(e) => void updateSettings({ melanger: e.target.checked })} /> {t.revision.melanger}
        </label>
        <button type="button" className="primary" disabled={!planned.length} onClick={start}>
          {t.revision.demarrer(planned.length)}
        </button>
      </div>
      {!planned.length && <p className="muted">{t.revision.vide}</p>}
    </div>
  );
}

function Session({ ids, onQuit, onRestart }: { ids: string[]; onQuit: () => void; onRestart: () => void }) {
  const { t, rate } = useStore();
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [choice, setChoice] = useState<string | null>(null);
  const [tally, setTally] = useState<Record<Note, number>>({ su: 0, hesite: 0, rate: 0 });
  const noteRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const done = i >= ids.length;
  const card = done ? null : CARD_BY_ID.get(ids[i]!)!;

  const grade = (n: Note) => {
    if (!card || !flipped) return;
    void rate(card.id, n);
    setTally((x) => ({ ...x, [n]: x[n] + 1 }));
    setI(i + 1);
    setFlipped(false);
    setChoice(null);
  };
  const choose = (l: string) => {
    if (!card?.choix || choice) return;
    setChoice(l);
    setFlipped(true);
  };

  // Après retournement, le focus va sur la carte : un second Espace ne note jamais par accident.
  useEffect(() => {
    if (flipped) cardRef.current?.focus({ preventScroll: true });
  }, [flipped, i]);

  useHotkeys((e) => {
    if (e.key === 'Escape') return onQuit();
    if (!card) return;
    if (e.key === ' ' || e.key === 'Enter') {
      // Un bouton qui a le focus gère lui-même Espace / Entrée : pas de double déclenchement.
      if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).tagName === 'SUMMARY') return;
      e.preventDefault();
      setFlipped((f) => !f);
    } else if (['1', '2', '3'].includes(e.key)) grade((['su', 'hesite', 'rate'] as const)[Number(e.key) - 1]!);
    else if (card.choix && /^[a-e]$/i.test(e.key)) choose(e.key.toUpperCase());
    else if ((e.key === 'n' || e.key === 'N') && flipped && card.statut === 'a_relire') {
      e.preventDefault();
      noteRef.current?.focus();
    }
  });

  if (!card)
    return (
      <div className="screen session-end">
        <h1>{t.revision.fin}</h1>
        <p className="big">{t.revision.bilan(tally.su, tally.hesite, tally.rate)}</p>
        <div className="actions">
          <button type="button" className="primary" onClick={onRestart} autoFocus>
            {t.revision.recommencer}
          </button>
          <button type="button" onClick={onQuit}>
            {t.revision.quitter}
          </button>
        </div>
      </div>
    );

  return (
    <div className="screen session">
      <div className="session-top">
        <span aria-live="polite">{t.revision.progression(i + 1, ids.length)}</span>
        <progress max={ids.length} value={i} />
        <button type="button" className="link" onClick={onQuit}>
          {t.revision.quitter}
        </button>
      </div>
      <article ref={cardRef} tabIndex={-1} className={`flashcard ${flipped ? 'is-flipped' : ''}`} aria-live="polite">
        <CardMeta card={card} />
        <Banners card={card} />
        <Recto card={card} choice={choice} onChoose={card.choix ? choose : undefined} />
        {flipped && (
          <>
            <hr />
            <Verso card={card} />
            {card.statut === 'a_relire' && <NoteForm card={card} inputRef={noteRef} />}
          </>
        )}
      </article>
      <div className="grade-bar">
        {!flipped ? (
          <button key="flip" type="button" className="primary wide" onClick={() => setFlipped(true)} autoFocus>
            {t.carte.retourner} <kbd>Espace</kbd>
          </button>
        ) : (
          <>
            <button key="su" type="button" className="grade grade-su" onClick={() => grade('su')}>
              {t.note.su} <kbd>1</kbd>
            </button>
            <button key="hesite" type="button" className="grade grade-hesite" onClick={() => grade('hesite')}>
              {t.note.hesite} <kbd>2</kbd>
            </button>
            <button key="rate" type="button" className="grade grade-rate" onClick={() => grade('rate')}>
              {t.note.rate} <kbd>3</kbd>
            </button>
          </>
        )}
      </div>
      <p className="muted small center">{t.revision.raccourcis}</p>
    </div>
  );
}
