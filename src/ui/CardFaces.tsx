import type { Card } from '../model/card.ts';
import { CARD_NUMBER } from '../data/cards.ts';
import { useStore } from '../state/store.tsx';
import { Markdown } from './Markdown.tsx';
import { StatusBadge } from './StatusIcon.tsx';

export function CardMeta({ card }: { card: Card }) {
  const { t } = useStore();
  return (
    <div className="card-meta">
      <span className="card-num">#{CARD_NUMBER.get(card.id)}</span>
      <span className="chip">{card.module}</span>
      <span className="chip chip-muted">{t.type[card.type]}</span>
      <StatusBadge statut={card.statut} />
    </div>
  );
}

export function Banners({ card }: { card: Card }) {
  const { t } = useStore();
  return (
    <>
      {card.statut === 'obsolete' && (
        <p className="banner banner-obsolete" role="alert">
          {t.carte.obsoleteBandeau}
        </p>
      )}
      {card.statut === 'a_relire' && card.nature_rouge === 'erreur_corrigee' && <p className="banner banner-piege">{t.carte.piegeBandeau}</p>}
      {card.tags.includes('maj-2026') && <p className="banner banner-maj">{t.carte.majBandeau}</p>}
      {card.statut === 'a_relire' && <p className="banner banner-relire">{t.carte.aRelireBandeau}</p>}
    </>
  );
}

export function Recto({ card, choice, onChoose }: { card: Card; choice?: string | null; onChoose?: (l: string) => void }) {
  const { t } = useStore();
  return (
    <div className="face recto">
      <Markdown className="question" text={card.question} />
      {card.choix && (
        <ol className="choix" aria-label={t.carte.choisir}>
          {card.choix.map((c) => {
            const state =
              choice == null ? '' : c.lettre === card.bonne_lettre ? 'good' : c.lettre === choice ? 'bad' : '';
            return (
              <li key={c.lettre}>
                <button type="button" className={`choix-btn ${state}`} disabled={!onChoose || choice != null} onClick={() => onChoose?.(c.lettre)}>
                  <b>{c.lettre}.</b> <Markdown inline text={c.texte} />
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export function Verso({ card, full = true }: { card: Card; full?: boolean }) {
  const { t } = useStore();
  return (
    <div className="face verso">
      {card.reponse_courte ? (
        <Markdown className="reponse" text={card.reponse_courte} />
      ) : (
        <p className="muted">⋯ {t.carte.reponseLongue}</p>
      )}
      {card.reponse_corrige_2014 && (
        <p className="corrige-2014">
          <span className="sr-only">{t.carte.corrige2014} : </span>
          <s>{card.reponse_corrige_2014}</s>
        </p>
      )}
      {card.raisonnement && (
        <div className="raisonnement">
          <span className="label">{t.carte.raisonnement}</span> <Markdown inline text={card.raisonnement} />
        </div>
      )}
      {full && card.developpement && (
        <details className="developpement" open={!card.reponse_courte || card.tags.includes('maj-2026')}>
          <summary>{t.carte.developpement}</summary>
          <Markdown text={card.developpement} />
        </details>
      )}
      {full && (
        <dl className="card-facts">
          <dt>{t.carte.statutSource}</dt>
          <dd>{card.statut_source}</dd>
          {card.ref_dgr.length > 0 && (
            <>
              <dt>{t.carte.refDgr}</dt>
              <dd>{card.ref_dgr.join(' · ')}</dd>
            </>
          )}
          <dt>{t.carte.source}</dt>
          <dd>
            {card.source.fiche} · {card.source.section} · {card.source.question} (l. {card.source.ligne}) · <code>{card.id}</code>
          </dd>
          <dt>DGR</dt>
          <dd>{t.carte.edition(card.edition_ref, card.edition_verifiee)}</dd>
        </dl>
      )}
    </div>
  );
}
