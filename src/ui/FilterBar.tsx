import type { RefObject } from 'react';
import { CARD_TYPES, MODULES, STATUTS } from '../model/card.ts';
import { DEFAULT_FILTER, isDefaultFilter, type Filter } from '../model/filters.ts';
import { ALL_FICHES, ALL_TAGS } from '../data/cards.ts';
import { useStore } from '../state/store.tsx';
import { StatusIcon } from './StatusIcon.tsx';

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function Chips<T extends string>({ label, values, selected, onChange, render }: {
  label: string;
  values: readonly T[];
  selected: T[];
  onChange: (v: T[]) => void;
  render?: (v: T) => React.ReactNode;
}) {
  return (
    <fieldset className="chips">
      <legend>{label}</legend>
      {values.map((v) => (
        <button key={v} type="button" className="chip-btn" aria-pressed={selected.includes(v)} onClick={() => onChange(toggle(selected, v))}>
          {render ? render(v) : v}
        </button>
      ))}
    </fieldset>
  );
}

export function FilterBar({ filter, onChange, count, searchRef }: {
  filter: Filter;
  onChange: (f: Filter) => void;
  count: number;
  searchRef?: RefObject<HTMLInputElement | null>;
}) {
  const { t } = useStore();
  const set = (patch: Partial<Filter>) => onChange({ ...filter, ...patch });
  return (
    <section className="filter-bar" aria-label={t.filtre.titre}>
      <div className="filter-top">
        <input
          ref={searchRef}
          type="search"
          className="search"
          placeholder={t.filtre.recherche}
          aria-label={t.filtre.recherche}
          value={filter.texte}
          onChange={(e) => set({ texte: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Escape') (e.target as HTMLInputElement).blur();
            e.stopPropagation();
          }}
        />
        <span className="count" aria-live="polite">
          {t.filtre.resultats(count)}
        </span>
        {!isDefaultFilter(filter) && (
          <button type="button" className="link" onClick={() => onChange(DEFAULT_FILTER)}>
            {t.filtre.reinitialiser}
          </button>
        )}
      </div>
      <Chips label={t.filtre.modules} values={MODULES} selected={filter.modules} onChange={(modules) => set({ modules })} />
      <Chips
        label={t.filtre.statuts}
        values={STATUTS}
        selected={filter.statuts}
        onChange={(statuts) => set({ statuts })}
        render={(s) => (
          <>
            <StatusIcon statut={s} size={12} /> {t.statut[s]}
          </>
        )}
      />
      <label className="check">
        <input type="checkbox" checked={filter.ratees} onChange={(e) => set({ ratees: e.target.checked })} /> {t.filtre.ratees}
      </label>
      <details className="more-filters">
        <summary>
          {t.filtre.types} · {t.filtre.fiches} · {t.filtre.tags}
          {filter.types.length + filter.fiches.length + filter.tags.length > 0 && ` (${filter.types.length + filter.fiches.length + filter.tags.length})`}
        </summary>
        <Chips label={t.filtre.types} values={CARD_TYPES} selected={filter.types} onChange={(types) => set({ types })} render={(v) => t.type[v]} />
        <Chips label={t.filtre.fiches} values={ALL_FICHES} selected={filter.fiches} onChange={(fiches) => set({ fiches })} />
        <Chips label={t.filtre.tags} values={ALL_TAGS} selected={filter.tags} onChange={(tags) => set({ tags })} />
      </details>
    </section>
  );
}
