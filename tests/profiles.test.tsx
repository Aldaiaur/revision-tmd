// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ProfilesProvider } from '../src/state/profiles.tsx';
import { App } from '../src/App.tsx';

afterEach(() => {
  cleanup();
  window.location.hash = '';
  localStorage.clear();
  sessionStorage.clear();
});

const mount = () =>
  render(
    <ProfilesProvider>
      <App />
    </ProfilesProvider>,
  );

describe('profils locaux', () => {
  it('un seul profil : pas de question à l\'ouverture', async () => {
    mount();
    expect(await screen.findByRole('heading', { name: 'Choisir la révision' })).toBeTruthy();
  });

  it('création d\'un profil, puis « Qui révise ? » à la réouverture', async () => {
    window.location.hash = '#/profils';
    mount();
    fireEvent.change(await screen.findByLabelText('Nouveau profil'), { target: { value: 'Alice' } });
    fireEvent.click(screen.getByRole('button', { name: 'Créer' }));
    expect(await screen.findByRole('link', { name: 'Alice' })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('rtmd.profils')!).map((p: { nom: string }) => p.nom)).toEqual(['Moi', 'Alice']);

    cleanup();
    sessionStorage.clear(); // nouvel onglet
    mount();
    expect(await screen.findByRole('heading', { name: 'Qui révise ?' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Moi' }));
    expect(await screen.findByRole('heading', { name: 'Choisir la révision' })).toBeTruthy();
  });
});
