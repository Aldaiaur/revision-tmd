import { useEffect, type ReactNode } from 'react';
import { useStore } from './state/store.tsx';
import { DeckProvider } from './state/deck.tsx';
import { DECKS, type DeckId } from './data/cards.ts';
import { useRoute } from './ui/hooks.ts';
import { Review } from './ui/screens/Review.tsx';
import { Catalogue } from './ui/screens/Catalogue.tsx';
import { SettingsScreen } from './ui/screens/Settings.tsx';
import { PrintScreen } from './ui/screens/Print.tsx';
import { Home } from './ui/screens/Home.tsx';
import { Exam } from './ui/screens/Exam.tsx';
import { Choice } from './ui/screens/Choice.tsx';
import { ProfilesScreen } from './ui/screens/Profiles.tsx';
import { useProfiles } from './state/profiles.tsx';

type Dict = ReturnType<typeof useStore>['t'];
type RouteDef = { key: string; label: (t: Dict) => string; render: () => ReactNode };

/** Écrans d'une révision (IATA sans préfixe : #/revision ; ADR préfixée : #/adr/revision). */
const DECK_ROUTES: RouteDef[] = [
  { key: 'accueil', label: (t) => t.nav.accueil, render: () => <Home /> },
  { key: 'revision', label: (t) => t.nav.revision, render: () => <Review /> },
  { key: 'catalogue', label: (t) => t.nav.catalogue, render: () => <Catalogue /> },
  { key: 'impression', label: (t) => t.nav.impression, render: () => <PrintScreen /> },
  { key: 'examen', label: (t) => t.nav.examen, render: () => <Exam /> },
  { key: 'reglages', label: (t) => t.nav.reglages, render: () => <SettingsScreen /> },
];

/** Route → révision et écran. Hash vide ou inconnu : accueil (choix de la révision). */
function parse(route: string): { deck: DeckId; page: RouteDef | null } {
  const adr = route === 'adr' || route.startsWith('adr/');
  const key = adr ? route.slice(4) || 'accueil' : route;
  return { deck: adr ? 'adr' : 'iata', page: DECK_ROUTES.find((r) => r.key === key) ?? null };
}

export function App() {
  const { t, ready } = useStore();
  const { profils, actif, aChoisir } = useProfiles();
  const [route] = useRoute();
  const { deck, page } = parse(route);
  const prefix = DECKS[deck].prefix;
  const l = t.decks[deck];
  const pageLabel = page ? page.label(t) : t.nav.choix;

  useEffect(() => {
    document.title = page ? `${pageLabel} · ${l.titre}` : t.choix.titre;
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [page, pageLabel, l, t]);

  return (
    <DeckProvider value={DECKS[deck]}>
      <a className="skip-link" href="#main">
        {t.a11y.allerContenu}
      </a>
      <header className="app-header no-print">
        <span className="brand">{page ? l.titre : t.choix.marque}</span>
        {profils.length > 1 && (
          <a className="profile-chip" href="#/profils" title={t.profils.changer}>
            {actif.nom}
          </a>
        )}
        <nav aria-label={t.a11y.navPrincipale}>
          <a href="#/choix" aria-current={page || route === 'profils' ? undefined : 'page'}>
            {t.nav.choix}
          </a>
          <a href="#/profils" aria-current={route === 'profils' ? 'page' : undefined}>
            {t.nav.profils}
          </a>
          {page &&
            DECK_ROUTES.map((r) => (
              <a key={r.key} href={`#/${prefix}${r.key}`} aria-current={r === page ? 'page' : undefined}>
                {r.label(t)}
              </a>
            ))}
        </nav>
      </header>
      <main id="main" tabIndex={-1}>
        {!ready ? null : aChoisir ? (
          <ProfilesScreen picker />
        ) : page ? (
          page.render()
        ) : route === 'profils' ? (
          <ProfilesScreen />
        ) : (
          <Choice />
        )}
      </main>
      <footer className="app-footer no-print">
        <p>{l.mention}</p>
      </footer>
    </DeckProvider>
  );
}
