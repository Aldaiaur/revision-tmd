import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { ProfilesProvider } from './state/profiles.tsx';
import { ErrorBoundary } from './ui/ErrorBoundary.tsx';
import { setupPwa } from './pwa.ts';
import './styles.css';

// Hors ligne : le service worker met toute l'app en cache (absent en développement et dans les tests).
setupPwa();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ProfilesProvider>
        <App />
      </ProfilesProvider>
    </ErrorBoundary>
  </StrictMode>,
);
