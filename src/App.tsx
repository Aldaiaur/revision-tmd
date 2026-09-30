import { useEffect, type ReactNode } from 'react';
import { useStore } from './state/store.tsx';
import { useRoute } from './ui/hooks.ts';
import { Review } from './ui/screens/Review.tsx';
import { Catalogue } from './ui/screens/Catalogue.tsx';
import { SettingsScreen } from './ui/screens/Settings.tsx';
import { PrintScreen } from './ui/screens/Print.tsx';
import { Home } from './ui/screens/Home.tsx';

type RouteDef = { key: string; label: (t: ReturnType<typeof useStore>['t']) => string; render: () => ReactNode };

const ROUTES: RouteDef[] = [
  { key: 'accueil', label: (t) => t.nav.accueil, render: () => <Home /> },
  { key: 'revision', label: (t) => t.nav.revision, render: () => <Review /> },
  { key: 'catalogue', label: (t) => t.nav.catalogue, render: () => <Catalogue /> },
  { key: 'impression', label: (t) => t.nav.impression, render: () => <PrintScreen /> },
  { key: 'reglages', label: (t) => t.nav.reglages, render: () => <SettingsScreen /> },
];

export function App() {
  const { t, ready } = useStore();
  const [route] = useRoute();
  const current = ROUTES.find((r) => r.key === route) ?? ROUTES[0]!;

  useEffect(() => {
    document.title = `${current.label(t)} · ${t.appTitle}`;
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [current, t]);

  return (
    <>
      <a className="skip-link" href="#main">
        Aller au contenu
      </a>
      <header className="app-header no-print">
        <span className="brand">{t.appTitle}</span>
        <nav aria-label="Navigation principale">
          {ROUTES.map((r) => (
            <a key={r.key} href={`#/${r.key}`} aria-current={r === current ? 'page' : undefined}>
              {r.label(t)}
            </a>
          ))}
        </nav>
      </header>
      <main id="main" tabIndex={-1}>
        {ready ? current.render() : null}
      </main>
      <footer className="app-footer no-print">
        <p>{t.mention}</p>
      </footer>
    </>
  );
}
