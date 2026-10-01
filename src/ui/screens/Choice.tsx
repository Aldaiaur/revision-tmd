import { DECKS, type DeckId } from '../../data/cards.ts';
import { useStore } from '../../state/store.tsx';

/** Accueil : choix de la révision (IATA aérien ou ADR routier), chacune avec sa propre progression. */
export function Choice() {
  const { t, leitner } = useStore();
  const c = t.choix;
  const tile = (id: DeckId, info: typeof c.iata) => {
    const cards = DECKS[id].cards.filter((x) => x.statut !== 'obsolete');
    const vues = cards.filter((x) => leitner.has(x.id)).length;
    return (
      <section className="choice-card" aria-labelledby={`choix-${id}`}>
        <span className="tile-label">{info.sousTitre}</span>
        <h2 id={`choix-${id}`}>{info.titre}</h2>
        <p>{info.desc}</p>
        <p className="small">
          {c.cartes(cards.length)} · {c.vues(vues)}
        </p>
        <a className="button primary" href={`#/${DECKS[id].prefix}accueil`}>
          {info.ouvrir}
        </a>
      </section>
    );
  };
  return (
    <div className="screen">
      <h1>{c.titre}</h1>
      <p>{c.intro}</p>
      <div className="choice-grid">
        {tile('iata', c.iata)}
        {tile('adr', c.adr)}
      </div>
    </div>
  );
}
