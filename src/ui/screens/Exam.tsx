import { useEffect, useMemo, useState } from 'react';
import { CARD_BY_ID, CARD_NUMBER, deckOf } from '../../data/cards.ts';
import { useDeck } from '../../state/deck.tsx';
import { CONFIG } from '../../model/config.ts';
import { autoVerdict, CAUSES, drawExam, formatDuration, journalCsv, passed, remainingMs, score } from '../../exam/exam.ts';
import type { ExamRun } from '../../storage/db.ts';
import { useStore } from '../../state/store.tsx';
import { Banners, Verso } from '../CardFaces.tsx';
import { Markdown } from '../Markdown.tsx';
import { useHotkeys } from '../hooks.ts';

/** Réglages de l'examen blanc de la révision courante (data/app-config.json). */
function useCfg() {
  return useDeck().id === 'adr' ? CONFIG.examenAdr : CONFIG.examen;
}

export function Exam() {
  const { exams: all } = useStore();
  const deck = useDeck();
  const exams = all.filter((e) => (e.deck ?? 'iata') === deck.id);
  const active = [...exams].reverse().find((e) => e.fin === null);
  const toCorrect = [...exams].reverse().find((e) => e.fin !== null && e.score === null);
  if (active) return <Running run={active} />;
  if (toCorrect) return <Correction run={toCorrect} />;
  return <Setup />;
}

function Setup() {
  const { exams: all, leitner, saveExam, journal: allJournal } = useStore();
  const deck = useDeck();
  const exams = all.filter((e) => (e.deck ?? 'iata') === deck.id);
  const journal = allJournal.filter((j) => deckOf(j.cardId) === deck.id);
  const cfg = useCfg();
  const [n, setN] = useState(cfg.nbQuestions);
  const done = exams.filter((e) => e.score !== null);

  const start = () => {
    const ids = drawExam(deck.cards, leitner, cfg, CONFIG.pointsFaibles.boites, n);
    void saveExam({ deck: deck.id, debut: new Date().toISOString(), fin: null, dureeMin: cfg.dureeMin, ids, reponses: {}, verdicts: {}, score: null });
  };

  const download = () => {
    const blob = new Blob([journalCsv(journal)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `journal-erreurs-${deck.id}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="screen narrow">
      <h1>Examen blanc</h1>
      <p>
        Durée <b>{formatDuration(cfg.dureeMin * 60_000)}</b> · seuil de réussite <b>{Math.round(cfg.seuil * 100)} %</b> · tirage pondéré par module, cartes des
        boîtes {CONFIG.pointsFaibles.boites.join(' et ')} favorisées (× {cfg.bonusBoitesFaibles}), cartes obsolètes exclues.
      </p>
      <p className="muted small">
        Les QCM sont corrigés automatiquement. Pour les autres questions, vous écrivez votre réponse, puis vous la comparez à la fiche et vous vous notez
        vous-même à la fin : le score est donc en partie <b>auto-évalué</b>. Paramètres : <code>data/app-config.json</code>.
      </p>
      <div className="actions">
        <label>
          Nombre de questions{' '}
          <input type="number" min={5} max={200} value={n} onChange={(e) => setN(Math.max(1, Number(e.target.value) || cfg.nbQuestions))} style={{ width: '5rem' }} />
        </label>
        <button type="button" className="primary" onClick={start}>
          Commencer l'épreuve
        </button>
      </div>

      <h2>Historique</h2>
      {done.length === 0 ? (
        <p className="muted">Aucun examen blanc terminé.</p>
      ) : (
        <table className="simple-table">
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Score</th>
              <th scope="col">Résultat</th>
            </tr>
          </thead>
          <tbody>
            {[...done].reverse().map((e) => {
              const s = score(e.ids, e.verdicts);
              return (
                <tr key={e.seq}>
                  <td>{new Date(e.debut).toLocaleString()}</td>
                  <td>
                    {s.justes} / {s.total} ({Math.round(s.ratio * 100)} %)
                  </td>
                  <td>{passed(s.ratio, cfg.seuil) ? '✓ Réussi' : '✗ Sous le seuil'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <h2>Journal d'erreurs ({journal.length})</h2>
      <p className="muted small">Alimenté par les corrections d'examen (fiche 00 : date, question, ma réponse, bonne réponse, cause, règle à retenir).</p>
      <button type="button" disabled={!journal.length} onClick={download}>
        Exporter en CSV
      </button>
      {journal.length > 0 && (
        <ul className="journal">
          {[...journal].reverse().slice(0, 20).map((j) => (
            <li key={j.seq}>
              <b>#{CARD_NUMBER.get(j.cardId)}</b> {j.question.slice(0, 90)} — <i>{j.cause}</i>
              {j.regle && <> : {j.regle}</>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Running({ run }: { run: ExamRun }) {
  const { saveExam } = useStore();
  const deck = useDeck();
  const [i, setI] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [reponses, setReponses] = useState(run.reponses);
  const left = remainingMs(run, now);
  const card = CARD_BY_ID.get(run.ids[i]!);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const finish = () => void saveExam({ ...run, reponses, fin: new Date().toISOString() });
  // Temps écoulé : l'épreuve se termine d'elle-même (y compris après un rechargement tardif).
  const expired = left === 0;
  useEffect(() => {
    if (expired) finish();
  }, [expired]);

  const answer = (v: string) => {
    const id = run.ids[i]!;
    setReponses((prev) => ({ ...prev, [id]: v }));
  };
  useEffect(() => {
    if (reponses !== run.reponses) void saveExam({ ...run, reponses });
  }, [reponses]);

  useHotkeys((e) => {
    if (e.key === 'ArrowRight') setI((x) => Math.min(x + 1, run.ids.length - 1));
    else if (e.key === 'ArrowLeft') setI((x) => Math.max(x - 1, 0));
    else if (card?.choix && /^[a-e]$/i.test(e.key)) answer(e.key.toUpperCase());
  });

  if (!card) return null;
  const answered = run.ids.filter((id) => reponses[id]?.trim()).length;
  return (
    <div className="screen">
      <div className="exam-top">
        <h1>Examen blanc</h1>
        <span className={`timer ${left < 10 * 60_000 ? 'timer-low' : ''}`} role="timer" aria-label="Temps restant">
          {formatDuration(left)}
        </span>
        <span className="muted">
          {answered} / {run.ids.length} répondues
        </span>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Terminer l'épreuve ? (${run.ids.length - answered} question(s) sans réponse)`)) finish();
          }}
        >
          Terminer et corriger
        </button>
      </div>
      <nav className="exam-grid" aria-label="Questions">
        {run.ids.map((id, k) => (
          <button
            key={id}
            type="button"
            className={`${k === i ? 'current' : ''} ${reponses[id]?.trim() ? 'done' : ''}`}
            aria-current={k === i ? 'step' : undefined}
            onClick={() => setI(k)}
          >
            {k + 1}
          </button>
        ))}
      </nav>
      <article className="flashcard">
        <p className="muted small">
          Question {i + 1} / {run.ids.length} · {card.module}
        </p>
        <Markdown className="question" text={card.question} />
        {card.choix ? (
          <fieldset className="choix-radio">
            <legend className="sr-only">Choix</legend>
            {card.choix.map((c) => (
              <label key={c.lettre} className="check">
                <input type="radio" name={`q-${card.id}`} checked={reponses[card.id] === c.lettre} onChange={() => answer(c.lettre)} />
                <b>{c.lettre}.</b> <Markdown inline text={c.texte} />
              </label>
            ))}
          </fieldset>
        ) : (
          <label className="exam-answer">
            <span className="sr-only">Votre réponse</span>
            <textarea rows={5} value={reponses[card.id] ?? ''} onChange={(e) => answer(e.target.value)} placeholder={`Votre réponse (${deck.l.regl} ouvert)…`} />
          </label>
        )}
      </article>
      <div className="actions">
        <button type="button" disabled={i === 0} onClick={() => setI(i - 1)}>
          ← Précédente
        </button>
        <button type="button" className="primary" disabled={i === run.ids.length - 1} onClick={() => setI(i + 1)}>
          Suivante →
        </button>
        <span className="muted small">← → : naviguer (hors zone de saisie) · A à D : répondre à un QCM</span>
      </div>
    </div>
  );
}

function Correction({ run }: { run: ExamRun }) {
  const { saveExam, addJournal, journal } = useStore();
  const cfg = useCfg();
  const initial = useMemo(() => {
    const v: Record<string, boolean> = { ...run.verdicts };
    for (const id of run.ids) {
      const auto = autoVerdict(CARD_BY_ID.get(id)!, run.reponses[id]);
      if (auto !== undefined) v[id] = auto;
    }
    return v;
  }, [run]);
  const [verdicts, setVerdicts] = useState(initial);
  const s = score(run.ids, verdicts);
  const setVerdict = (id: string, ok: boolean) => setVerdicts((prev) => ({ ...prev, [id]: ok }));
  useEffect(() => {
    if (verdicts !== initial) void saveExam({ ...run, verdicts });
  }, [verdicts]);
  const inJournal = new Set(journal.filter((j) => j.date >= run.debut).map((j) => j.cardId));

  return (
    <div className="screen">
      <h1>Correction</h1>
      <p>
        {s.justes} / {s.total} justes ({Math.round(s.ratio * 100)} %) · {run.ids.length - Object.keys(verdicts).length} à noter · seuil{' '}
        {Math.round(cfg.seuil * 100)} %
      </p>
      <ol className="correction-list">
        {run.ids.map((id) => {
          const card = CARD_BY_ID.get(id)!;
          const v = verdicts[id];
          const auto = autoVerdict(card, run.reponses[id]) !== undefined;
          return (
            <li key={id} className={`correction ${v === true ? 'ok' : v === false ? 'ko' : ''}`}>
              <Markdown className="question" text={card.question} />
              <p>
                <span className="label">Ma réponse</span> {run.reponses[id]?.trim() || <i className="muted">sans réponse</i>}
              </p>
              <Banners card={card} />
              <Verso card={card} full={false} />
              {auto ? (
                <p className="verdict">{v ? '✓ Juste (QCM)' : '✗ Faux (QCM)'}</p>
              ) : (
                <div className="actions">
                  <button type="button" aria-pressed={v === true} className="grade grade-su" onClick={() => setVerdict(id, true)}>
                    ✓ Juste
                  </button>
                  <button type="button" aria-pressed={v === false} className="grade grade-rate" onClick={() => setVerdict(id, false)}>
                    ✗ Faux
                  </button>
                </div>
              )}
              {v === false && !inJournal.has(id) && (
                <JournalForm
                  onSave={(cause, regle) =>
                    void addJournal({
                      date: new Date().toISOString(),
                      cardId: id,
                      question: card.question,
                      maReponse: run.reponses[id] ?? '',
                      bonneReponse: card.reponse_courte ?? card.developpement?.slice(0, 300) ?? '',
                      cause,
                      regle,
                    })
                  }
                />
              )}
              {v === false && inJournal.has(id) && <p className="muted small">✎ Ajoutée au journal d'erreurs</p>}
            </li>
          );
        })}
      </ol>
      <div className="actions">
        <button type="button" className="primary" disabled={!s.complet} onClick={() => void saveExam({ ...run, verdicts, score: s.ratio })}>
          Valider le résultat
        </button>
        {s.complet && (
          <strong className={passed(s.ratio, cfg.seuil) ? 'status-stable' : 'status-obsolete'}>
            {passed(s.ratio, cfg.seuil) ? '✓ Au-dessus du seuil' : '✗ Sous le seuil'} ({Math.round(s.ratio * 100)} %)
          </strong>
        )}
      </div>
    </div>
  );
}

function JournalForm({ onSave }: { onSave: (cause: string, regle: string) => void }) {
  const [cause, setCause] = useState<string>(CAUSES[0]);
  const [regle, setRegle] = useState('');
  return (
    <form
      className="journal-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(cause, regle);
      }}
    >
      <label>
        Cause{' '}
        <select value={cause} onChange={(e) => setCause(e.target.value)}>
          {CAUSES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="grow">
        Règle à retenir <input value={regle} onChange={(e) => setRegle(e.target.value)} />
      </label>
      <button type="submit">Ajouter au journal</button>
    </form>
  );
}
