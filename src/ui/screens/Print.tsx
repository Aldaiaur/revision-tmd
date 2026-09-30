import { useMemo, useState } from 'react';
import { applyFilter, DEFAULT_FILTER, type Filter } from '../../model/filters.ts';
import { weakIds } from '../../model/weak.ts';
import { CONFIG } from '../../model/config.ts';
import { ALL_CARDS } from '../../data/cards.ts';
import type { PrintFormat } from '../../storage/db.ts';
import { useStore } from '../../state/store.tsx';
import { paginate } from '../../print/layout.ts';
import { CalibrationSheets, Sheets } from '../../print/Sheets.tsx';
import { FilterBar } from '../FilterBar.tsx';

type Source = 'filtre' | 'cochees' | 'faibles';

/** Sélection « points faibles » : ratées ou hésitées récemment, plus les boîtes Leitner faibles (app-config.json). */
export type WeakSelector = (ctx: ReturnType<typeof useStore>) => Set<string>;
const defaultWeak: WeakSelector = (s) => {
  const set = weakIds(s.reviews, CONFIG.pointsFaibles.dernieresRevisions);
  for (const [id, st] of s.leitner) if (CONFIG.pointsFaibles.boites.includes(st.box)) set.add(id);
  return set;
};

export function PrintScreen({ weak = defaultWeak }: { weak?: WeakSelector }) {
  const store = useStore();
  const { settings, updateSettings, selected, lastNote } = store;
  const [source, setSource] = useState<Source>(selected.size ? 'cochees' : 'filtre');
  const [filter, setFilter] = useState<Filter>(DEFAULT_FILTER);
  const [calibration, setCalibration] = useState(false);
  const [scale, setScale] = useState(0.5);

  const weakSet = weak(store);
  const filtered = useMemo(() => applyFilter(ALL_CARDS, filter, lastNote), [filter, lastNote]);
  const ids = useMemo(() => {
    if (source === 'filtre') return filtered.map((c) => c.id);
    const set = source === 'cochees' ? selected : weakSet;
    return ALL_CARDS.filter((c) => set.has(c.id)).map((c) => c.id);
  }, [source, filtered, selected, weakSet]);

  const mode = settings.modeImpression;
  const format: PrintFormat = mode === 'recto' ? 'pliage' : settings.formatImpression === 'pliage' ? '2x4' : settings.formatImpression;
  const sheets = useMemo(() => paginate(ids, format, mode), [ids, format, mode]);
  const pages = calibration ? 2 : sheets.length;

  return (
    <div className="print-screen">
      <aside className="print-controls no-print" aria-label="Options d'impression">
        <h1>Imprimer</h1>

        <fieldset>
          <legend>Cartes</legend>
          <label className="check">
            <input type="radio" name="src" checked={source === 'filtre'} onChange={() => setSource('filtre')} /> Par filtre ({filtered.length})
          </label>
          <label className="check">
            <input type="radio" name="src" checked={source === 'cochees'} onChange={() => setSource('cochees')} /> Cartes cochées ({selected.size})
          </label>
          <label className="check">
            <input type="radio" name="src" checked={source === 'faibles'} onChange={() => setSource('faibles')} /> Points faibles ({weakSet.size})
          </label>
        </fieldset>

        <fieldset>
          <legend>Mode</legend>
          <label className="check">
            <input type="radio" name="mode" checked={mode === 'duplex'} onChange={() => void updateSettings({ modeImpression: 'duplex' })} /> Recto-verso (bord long)
          </label>
          <label className="check">
            <input type="radio" name="mode" checked={mode === 'recto'} onChange={() => void updateSettings({ modeImpression: 'recto' })} /> Recto seul, avec pliage
          </label>
        </fieldset>

        {mode === 'duplex' && (
          <fieldset>
            <legend>Format</legend>
            {(
              [
                ['2x4', '2 × 4 cartes (98 × 68,5 mm)'],
                ['2x5', '2 × 5 cartes (98 × 54,8 mm)'],
                ['1x1', '1 carte par page (196 × 137 mm)'],
              ] as const
            ).map(([v, label]) => (
              <label key={v} className="check">
                <input type="radio" name="format" checked={format === v} onChange={() => void updateSettings({ formatImpression: v })} /> {label}
              </label>
            ))}
          </fieldset>
        )}

        {mode === 'duplex' && (
          <fieldset>
            <legend>Décalage du verso (mm)</legend>
            <div className="offset-row">
              <label>
                x{' '}
                <input
                  type="number"
                  step={0.5}
                  value={settings.decalageVersoMm.x}
                  onChange={(e) => void updateSettings({ decalageVersoMm: { ...settings.decalageVersoMm, x: Number(e.target.value) || 0 } })}
                />
              </label>
              <label>
                y{' '}
                <input
                  type="number"
                  step={0.5}
                  value={settings.decalageVersoMm.y}
                  onChange={(e) => void updateSettings({ decalageVersoMm: { ...settings.decalageVersoMm, y: Number(e.target.value) || 0 } })}
                />
              </label>
            </div>
            <label className="check">
              <input type="checkbox" checked={calibration} onChange={(e) => setCalibration(e.target.checked)} /> Afficher la page de calibration
            </label>
          </fieldset>
        )}

        <label className="check">
          Aperçu{' '}
          <input type="range" min={0.3} max={1} step={0.05} value={scale} onChange={(e) => setScale(Number(e.target.value))} aria-label="Échelle de l'aperçu" />
        </label>

        <p className="muted small">
          {calibration ? 'Page de calibration (2 pages)' : `${ids.length} cartes · ${pages} page${pages > 1 ? 's' : ''}`}
        </p>
        <button type="button" className="primary wide" disabled={!calibration && !ids.length} onClick={() => window.print()}>
          Imprimer / PDF
        </button>
        <p className="muted small">
          Dans la boîte d'impression : papier A4, <b>échelle 100 %</b> (pas « ajuster »), marges « aucune » ou « par défaut »,
          {mode === 'duplex' ? ' recto-verso retourné sur le bord long.' : ' recto seul.'} Pour un PDF, choisissez « Enregistrer au format PDF ».
        </p>
      </aside>

      <div className="print-main">
        {source === 'filtre' && !calibration && (
          <div className="no-print">
            <FilterBar filter={filter} onChange={setFilter} count={filtered.length} />
          </div>
        )}
        <div className="print-preview" style={{ '--scale': scale } as React.CSSProperties}>
          {calibration ? <CalibrationSheets /> : <Sheets sheets={sheets} format={format} />}
        </div>
      </div>
    </div>
  );
}
