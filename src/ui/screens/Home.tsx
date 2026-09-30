import { useMemo, useState } from 'react';
import { MODULES, type Module } from '../../model/card.ts';
import { CONFIG } from '../../model/config.ts';
import { ALL_CARDS } from '../../data/cards.ts';
import { dailyQueue, isDue, streak, type CardState } from '../../srs/leitner.ts';
import { useStore } from '../../state/store.tsx';

const SEGMENTS = ['b5', 'b4', 'b3', 'b2', 'b1', 'new'] as const;
type Seg = (typeof SEGMENTS)[number];
const SEG_LABEL: Record<Seg, string> = { b5: 'Boîte 5 (maîtrisées)', b4: 'Boîte 4', b3: 'Boîte 3', b2: 'Boîte 2', b1: 'Boîte 1', new: 'Jamais vues' };

type Row = { module: Module | 'Toutes'; total: number; counts: Record<Seg, number> };

function tally(cards: typeof ALL_CARDS, states: Map<string, CardState>, module: Row['module']): Row {
  const counts: Record<Seg, number> = { b5: 0, b4: 0, b3: 0, b2: 0, b1: 0, new: 0 };
  for (const c of cards) {
    const s = states.get(c.id);
    counts[s ? (`b${s.box}` as Seg) : 'new']++;
  }
  return { module, total: cards.length, counts };
}

const pct = (n: number, d: number) => (d ? Math.round((100 * n) / d) : 0);

export function Home() {
  const { t, leitner, today, reviews, notes, settings, exams } = useStore();
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  // Les cartes obsolètes ne comptent pas dans la progression.
  const cards = useMemo(() => ALL_CARDS.filter((c) => c.statut !== 'obsolete'), []);
  const rows = useMemo(
    () => [tally(cards, leitner, 'Toutes'), ...MODULES.map((m) => tally(cards.filter((c) => c.module === m), leitner, m))],
    [cards, leitner],
  );
  const dueCount = cards.filter((c) => isDue(leitner.get(c.id), today)).length;
  const queueCount = dailyQueue(cards, leitner, today, CONFIG.leitner.nouvellesParSession).length;
  const seen = cards.filter((c) => leitner.has(c.id)).length;
  const mastered = rows[0]!.counts.b5;
  const aRelire = ALL_CARDS.filter((c) => c.statut === 'a_relire');
  const relues = aRelire.filter((c) => notes.some((n) => n.id === c.id && n.valeur_relue)).length;
  const serie = streak(reviews, today);
  const jours = settings.dateExamen ? Math.round((Date.parse(settings.dateExamen) - Date.parse(today)) / 86400000) : null;
  const lastExam = [...exams].filter((e) => e.score !== null).pop();

  return (
    <div className="screen">
      <h1>{t.nav.accueil}</h1>
      <div className="tiles">
        <div className="tile tile-main">
          <span className="tile-label">À réviser aujourd'hui</span>
          <span className="tile-value">{queueCount}</span>
          <span className="tile-sub">
            {dueCount} échue{dueCount > 1 ? 's' : ''} + {queueCount - dueCount} nouvelle{queueCount - dueCount > 1 ? 's' : ''}
          </span>
          <a className="button primary" href="#/revision?dues">
            Réviser maintenant
          </a>
        </div>
        <div className="tile">
          <span className="tile-label">Série</span>
          <span className="tile-value">{serie}</span>
          <span className="tile-sub">jour{serie > 1 ? 's' : ''} d'affilée</span>
        </div>
        <div className="tile">
          <span className="tile-label">Maîtrisées</span>
          <span className="tile-value">{mastered}</span>
          <span className="tile-sub">
            sur {cards.length} ({pct(mastered, cards.length)} %) · {seen} vues
          </span>
        </div>
        <div className="tile">
          <span className="tile-label">Valeurs relues (67e)</span>
          <span className="tile-value">{relues}</span>
          <span className="tile-sub">sur {aRelire.length} cartes à vérifier</span>
        </div>
        <div className="tile">
          <span className="tile-label">Examen</span>
          <span className="tile-value">{jours === null ? '—' : jours >= 0 ? `J-${jours}` : 'passé'}</span>
          <span className="tile-sub">
            {lastExam ? `Dernier blanc : ${Math.round(lastExam.score! * 100)} %` : settings.dateExamen ? settings.dateExamen : <a href="#/reglages">Saisir la date</a>}
          </span>
        </div>
      </div>

      <h2 id="prog-title">Progression par module</h2>
      <p className="muted small">Part des cartes (hors obsolètes) par boîte Leitner. Survolez un segment pour le détail.</p>
      <ul className="legend" aria-label="Légende">
        {SEGMENTS.map((s) => (
          <li key={s}>
            <span className={`swatch seg-${s}`} aria-hidden="true" /> {SEG_LABEL[s]}
          </li>
        ))}
      </ul>
      <div className="viz" aria-describedby="prog-title" onMouseLeave={() => setTip(null)}>
        {rows.map((r) => (
          <div key={r.module} className={`viz-row ${r.module === 'Toutes' ? 'viz-total' : ''}`}>
            <span className="viz-label">{r.module}</span>
            <div className="viz-bar" role="img" aria-label={`${r.module} : ${r.counts.b5} maîtrisées sur ${r.total}`}>
              {SEGMENTS.filter((s) => r.counts[s] > 0).map((s) => (
                <span
                  key={s}
                  className={`viz-seg seg-${s}`}
                  style={{ flexGrow: r.counts[s] }}
                  onMouseMove={(e) => {
                    const box = (e.currentTarget.closest('.viz') as HTMLElement).getBoundingClientRect();
                    setTip({ x: e.clientX - box.left, y: e.clientY - box.top, text: `${r.module} · ${SEG_LABEL[s]} : ${r.counts[s]} carte${r.counts[s] > 1 ? 's' : ''} (${pct(r.counts[s], r.total)} %)` });
                  }}
                />
              ))}
            </div>
            <span className="viz-value">
              {pct(r.counts.b5, r.total)} % <span className="muted small">({r.total})</span>
            </span>
          </div>
        ))}
        {tip && (
          <div className="viz-tip" style={{ left: tip.x + 12, top: tip.y + 12 }} role="status">
            {tip.text}
          </div>
        )}
      </div>
      <details className="viz-table">
        <summary>Voir en tableau</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Module</th>
              {SEGMENTS.map((s) => (
                <th key={s} scope="col">
                  {SEG_LABEL[s]}
                </th>
              ))}
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.module}>
                <th scope="row">{r.module}</th>
                {SEGMENTS.map((s) => (
                  <td key={s}>{r.counts[s]}</td>
                ))}
                <td>{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
