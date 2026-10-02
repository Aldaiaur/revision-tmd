import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { ProfilesProvider } from './state/profiles.tsx';
import './styles.css';

// Hors ligne : le service worker met toute l'app en cache (absent en développement et dans les tests).
if (import.meta.env.PROD) {
  void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProfilesProvider>
      <App />
    </ProfilesProvider>
  </StrictMode>,
);
