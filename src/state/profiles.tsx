import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { deleteDB } from 'idb';
import { StoreProvider } from './store.tsx';

/**
 * Profils locaux : plusieurs personnes peuvent réviser sur le même navigateur, chacune avec sa progression.
 * Chaque profil a sa propre base IndexedDB ; le profil « defaut » garde la base historique (progression existante conservée).
 * La liste des profils est un simple réglage du navigateur (localStorage) : aucun compte, aucun envoi.
 */
export type Profil = { id: string; nom: string };

const KEY_LISTE = 'rtmd.profils';
const KEY_ACTIF = 'rtmd.profilActif';
/** Profil choisi pour cet onglet : on ne redemande « Qui révise ? » qu'à l'ouverture. */
const KEY_CHOISI = 'rtmd.profilChoisi';
const DEFAUT: Profil = { id: 'defaut', nom: 'Moi' };

export const dbNameOf = (id: string) => (id === DEFAUT.id ? 'iata-dgr' : `iata-dgr--${id}`);

function read<T>(storage: () => Storage, key: string, fallback: T): T {
  try {
    const v = storage().getItem(key);
    return v === null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}
function write(storage: () => Storage, key: string, value: unknown) {
  try {
    storage().setItem(key, JSON.stringify(value));
  } catch {
    // stockage indisponible (navigation privée stricte…) : les profils durent le temps de la session
  }
}
const local = () => window.localStorage;
const session = () => window.sessionStorage;

type Profiles = {
  profils: Profil[];
  actif: Profil;
  /** Faut-il demander « Qui révise ? » (plusieurs profils, aucun choisi dans cet onglet) ? */
  aChoisir: boolean;
  choisir: (id: string) => void;
  ajouter: (nom: string) => void;
  renommer: (id: string, nom: string) => void;
  supprimer: (id: string) => Promise<void>;
};

const noop = () => {};
const Ctx = createContext<Profiles>({
  profils: [DEFAUT],
  actif: DEFAUT,
  aChoisir: false,
  choisir: noop,
  ajouter: noop,
  renommer: noop,
  supprimer: async () => {},
});

export function ProfilesProvider({ children }: { children: ReactNode }) {
  const [profils, setProfils] = useState<Profil[]>(() => {
    const l = read<Profil[]>(local, KEY_LISTE, []);
    return l.length ? l : [DEFAUT];
  });
  const [actifId, setActifId] = useState<string>(() => read(local, KEY_ACTIF, DEFAUT.id));
  const [choisi, setChoisi] = useState<boolean>(() => read(session, KEY_CHOISI, false));
  const actif = profils.find((p) => p.id === actifId) ?? profils[0]!;

  const save = (l: Profil[]) => {
    setProfils(l);
    write(local, KEY_LISTE, l);
  };
  const choisir = useCallback((id: string) => {
    setActifId(id);
    setChoisi(true);
    write(local, KEY_ACTIF, id);
    write(session, KEY_CHOISI, true);
  }, []);
  const ajouter = (nom: string) => {
    const p = { id: Date.now().toString(36), nom: nom.trim() || 'Sans nom' };
    save([...profils, p]);
    choisir(p.id);
  };
  const renommer = (id: string, nom: string) => save(profils.map((p) => (p.id === id ? { ...p, nom: nom.trim() || p.nom } : p)));
  const supprimer = async (id: string) => {
    const reste = profils.filter((p) => p.id !== id);
    if (!reste.length) return; // on garde toujours au moins un profil
    save(reste);
    if (id === actif.id) choisir(reste[0]!.id);
    try {
      await deleteDB(dbNameOf(id));
    } catch {
      // base déjà absente ou verrouillée : la liste est à jour, c'est l'essentiel
    }
  };

  const value: Profiles = { profils, actif, aChoisir: profils.length > 1 && !choisi, choisir, ajouter, renommer, supprimer };
  return (
    <Ctx.Provider value={value}>
      <StoreProvider key={actif.id} dbName={dbNameOf(actif.id)}>
        {children}
      </StoreProvider>
    </Ctx.Provider>
  );
}

export function useProfiles(): Profiles {
  return useContext(Ctx);
}
