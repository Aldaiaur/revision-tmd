import { useState } from 'react';
import { useProfiles } from '../../state/profiles.tsx';
import { useStore } from '../../state/store.tsx';

/**
 * « Qui révise ? » à l'ouverture (picker) ou gestion complète des profils locaux (#/profils).
 * Chaque profil a sa propre progression, stockée dans ce navigateur uniquement.
 */
export function ProfilesScreen({ picker = false }: { picker?: boolean }) {
  const { t } = useStore();
  const p = t.profils;
  const { profils, actif, choisir, ajouter, renommer, supprimer } = useProfiles();
  const [nouveau, setNouveau] = useState('');
  const [edition, setEdition] = useState<string | null>(null);
  const [nom, setNom] = useState('');

  const creer = () => {
    if (!nouveau.trim()) return;
    ajouter(nouveau);
    setNouveau('');
    if (!picker) window.location.hash = '#/choix';
  };

  return (
    <div className="screen narrow">
      <h1>{picker ? p.quiRevise : p.titre}</h1>
      <p className="muted">{p.intro}</p>
      <ul className="profile-list">
        {profils.map((x) => (
          <li key={x.id} className="profile-row">
            {edition === x.id ? (
              <form
                className="profile-edit"
                onSubmit={(e) => {
                  e.preventDefault();
                  renommer(x.id, nom);
                  setEdition(null);
                }}
              >
                <input aria-label={p.nom} value={nom} onChange={(e) => setNom(e.target.value)} autoFocus />
                <button type="submit">{t.commun.enregistrer}</button>
                <button type="button" onClick={() => setEdition(null)}>
                  {t.commun.annuler}
                </button>
              </form>
            ) : (
              <>
                <button
                  type="button"
                  className={`profile-btn ${x.id === actif.id ? 'primary' : ''}`}
                  aria-current={x.id === actif.id ? 'true' : undefined}
                  onClick={() => {
                    choisir(x.id);
                    window.location.hash = '#/choix';
                  }}
                >
                  {x.nom}
                </button>
                {!picker && (
                  <span className="profile-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setEdition(x.id);
                        setNom(x.nom);
                      }}
                    >
                      {p.renommer}
                    </button>
                    <button
                      type="button"
                      disabled={profils.length < 2}
                      onClick={() => {
                        if (window.confirm(p.confirmerSuppression(x.nom))) void supprimer(x.id);
                      }}
                    >
                      {p.supprimer}
                    </button>
                  </span>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
      <form
        className="actions"
        onSubmit={(e) => {
          e.preventDefault();
          creer();
        }}
      >
        <label htmlFor="profil-nouveau">{p.ajouter}</label>
        <input id="profil-nouveau" value={nouveau} onChange={(e) => setNouveau(e.target.value)} placeholder={p.nomPlaceholder} />
        <button type="submit" disabled={!nouveau.trim()}>
          {p.creer}
        </button>
      </form>
      {!picker && <p className="muted small">{p.note}</p>}
    </div>
  );
}
