import { useStore } from '../../state/store.tsx';

/** Accueil : choix de la réglementation à réviser (IATA disponible, ADR à venir). */
export function Choice() {
  const { t } = useStore();
  const c = t.choix;
  return (
    <div className="screen">
      <h1>{c.titre}</h1>
      <p>{c.intro}</p>
      <div className="choice-grid">
        <section className="choice-card" aria-labelledby="choix-iata">
          <span className="tile-label">{c.iata.sousTitre}</span>
          <h2 id="choix-iata">{c.iata.titre}</h2>
          <p>{c.iata.desc}</p>
          <a className="button primary" href="#/accueil">
            {c.iata.ouvrir}
          </a>
        </section>
        <section className="choice-card disabled" aria-labelledby="choix-adr">
          <span className="tile-label">{c.adr.sousTitre}</span>
          <h2 id="choix-adr">
            {c.adr.titre} <span className="choice-badge">{c.bientot}</span>
          </h2>
          <p>{c.adr.desc}</p>
          <a className="button" href="#/adr">
            {c.adr.ouvrir}
          </a>
        </section>
      </div>
    </div>
  );
}

/** Révision ADR : vide pour le moment. */
export function AdrPlaceholder() {
  const { t } = useStore();
  return (
    <div className="screen narrow">
      <h1>{t.choix.adr.titre}</h1>
      <p>{t.choix.adrVide}</p>
      <a className="button" href="#/choix">
        {t.choix.retour}
      </a>
    </div>
  );
}
