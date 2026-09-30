import type { Card } from '../model/card.ts';
import { CARD_NUMBER } from '../data/cards.ts';
import { useStore } from '../state/store.tsx';
import { Markdown } from '../ui/Markdown.tsx';
import { StatusIcon } from '../ui/StatusIcon.tsx';
import { FitBox } from './FitBox.tsx';

const SIZES = { small: { max: 12, min: 6 }, large: { max: 18, min: 8 } };

function Head({ card, face }: { card: Card; face: 'Q' | 'R' }) {
  const { t } = useStore();
  return (
    <div className="pc-head">
      <b>#{CARD_NUMBER.get(card.id)}</b>
      <span className="pc-face">{face}</span>
      <span className="pc-module">{card.module}</span>
      <span className={`pc-statut status-${card.statut}`}>
        <StatusIcon statut={card.statut} size={9} title={t.statut[card.statut]} />
        {t.statut[card.statut]}
      </span>
      <span className="pc-ed">DGR 67e</span>
    </div>
  );
}

function Overflow({ card }: { card: Card }) {
  return <p className="pc-overflow">⋯ suite dans l'app : {card.id}</p>;
}

export function PrintRecto({ card, size }: { card: Card; size: 'small' | 'large' }) {
  const s = SIZES[size];
  return (
    <div className={`pc pc-recto pc-${card.statut}`}>
      <Head card={card} face="Q" />
      <FitBox className="pc-body" max={s.max} min={s.min} depKey={`${card.id}-q-${size}`}>
        <Markdown className="pc-question" text={card.question} />
        {card.choix && (
          <ol className="pc-choix">
            {card.choix.map((c) => (
              <li key={c.lettre}>
                <b>{c.lettre}.</b> <Markdown inline text={c.texte} />
              </li>
            ))}
          </ol>
        )}
      </FitBox>
      <Overflow card={card} />
      {card.statut === 'obsolete' && <div className="pc-watermark">OBSOLÈTE — ne pas mémoriser</div>}
    </div>
  );
}

export function PrintVerso({ card, size }: { card: Card; size: 'small' | 'large' }) {
  const { notesById } = useStore();
  const s = SIZES[size];
  const note = notesById.get(card.id);
  const body = card.reponse_courte ?? card.developpement ?? '';
  return (
    <div className={`pc pc-verso pc-${card.statut}`}>
      <Head card={card} face="R" />
      <FitBox className="pc-body" max={s.max} min={s.min} depKey={`${card.id}-r-${size}-${note?.valeur_relue ?? ''}`}>
        <Markdown className="pc-reponse" text={body} />
        {card.reponse_corrige_2014 && (
          <p className="pc-corrige">
            <s>{card.reponse_corrige_2014}</s> ✗
          </p>
        )}
        {card.raisonnement && (
          <p className="pc-raison">
            <Markdown inline text={card.raisonnement} />
          </p>
        )}
      </FitBox>
      <Overflow card={card} />
      <div className="pc-foot">
        {card.tags.includes('maj-2026') && <span className="pc-maj">⚠ Mis à jour 2026 : voir l'app</span>}
        {card.ref_dgr.length > 0 && <span>Réf. {card.ref_dgr.slice(0, 4).join(' · ')} (éd. {card.edition_ref})</span>}
        {card.statut === 'a_relire' && (
          <span className="pc-note">
            Valeur 67e : {note?.valeur_relue ? <b>{note.valeur_relue}</b> : <span className="pc-blank" />}
          </span>
        )}
      </div>
      {card.statut === 'obsolete' && <div className="pc-watermark">OBSOLÈTE — ne pas mémoriser</div>}
    </div>
  );
}
