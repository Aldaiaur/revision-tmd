// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StoreProvider, useStore } from '../src/state/store.tsx';
import { App } from '../src/App.tsx';
import { ALL_CARDS } from '../src/data/cards.ts';
import { applyFilter, DEFAULT_FILTER } from '../src/model/filters.ts';

afterEach(() => {
  cleanup();
  window.location.hash = '';
});

let dbCounter = 0;
function mount(dbName = `test-${++dbCounter}`) {
  render(
    <StoreProvider dbName={dbName}>
      <App />
    </StoreProvider>,
  );
  return dbName;
}

const key = (k: string) => act(() => void fireEvent.keyDown(window, { key: k }));

describe('filtres', () => {
  it('« Classe 7 + à relire » correspond au JSON', () => {
    const n = applyFilter(ALL_CARDS, { ...DEFAULT_FILTER, modules: ['Classe 7'], statuts: ['a_relire'] }).length;
    expect(n).toBe(ALL_CARDS.filter((c) => c.module === 'Classe 7' && c.statut === 'a_relire').length);
    expect(n).toBeGreaterThan(0);
  });
  it('les cartes obsolètes sont exclues par défaut', () => {
    const def = applyFilter(ALL_CARDS, DEFAULT_FILTER);
    expect(def.some((c) => c.statut === 'obsolete')).toBe(false);
    expect(def.length).toBe(ALL_CARDS.length - ALL_CARDS.filter((c) => c.statut === 'obsolete').length);
  });
  it('recherche sans accents ni casse', () => {
    const accents = applyFilter(ALL_CARDS, { ...DEFAULT_FILTER, texte: 'tétrachlorure' }).map((c) => c.id);
    expect(accents.length).toBeGreaterThan(0);
    expect(accents).toEqual(
      applyFilter(ALL_CARDS, { ...DEFAULT_FILTER, texte: 'TETRACHLORURE' }).map((c) => c.id),
    );
  });
});

describe('révision au clavier', () => {
  it('Espace retourne, 1/2/3 notent et passent à la carte suivante', async () => {
    window.location.hash = '#/revision';
    mount();
    fireEvent.click(await screen.findByRole('button', { name: /Démarrer/ }));
    expect(screen.getByText(/Carte 1 \//)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Je savais/ })).toBeNull();
    key(' ');
    expect(screen.getByRole('button', { name: /Je savais/ })).toBeTruthy();
    key('1');
    expect(screen.getByText(/Carte 2 \//)).toBeTruthy();
    key(' ');
    key('3');
    expect(screen.getByText(/Carte 3 \//)).toBeTruthy();
    key('Escape');
    expect(await screen.findByRole('button', { name: /Démarrer/ })).toBeTruthy();
  });
});

function Probe({ onReady }: { onReady: (s: ReturnType<typeof useStore>) => void }) {
  const s = useStore();
  if (s.ready) onReady(s);
  return null;
}

describe('persistance IndexedDB', () => {
  it('une note 🟠 et une notation survivent au rechargement', async () => {
    const name = `persist-${Date.now()}`;
    const card = ALL_CARDS.find((c) => c.statut === 'a_relire')!;
    let store: ReturnType<typeof useStore> | null = null;
    render(
      <StoreProvider dbName={name}>
        <Probe onReady={(s) => (store = s)} />
      </StoreProvider>,
    );
    await waitFor(() => expect(store).not.toBeNull());
    await act(async () => {
      await store!.saveNote({ id: card.id, valeur_relue: 'PI 353, 5 L', edition: '67', date: '2026-09-30T10:00:00Z' });
      await store!.rate(card.id, 'rate');
    });
    cleanup();

    let reloaded: ReturnType<typeof useStore> | null = null;
    render(
      <StoreProvider dbName={name}>
        <Probe onReady={(s) => (reloaded = s)} />
      </StoreProvider>,
    );
    await waitFor(() => expect(reloaded).not.toBeNull());
    expect(reloaded!.notesById.get(card.id)?.valeur_relue).toBe('PI 353, 5 L');
    expect(reloaded!.lastNote.get(card.id)).toBe('rate');
  });
});

describe('catalogue', () => {
  it('montre les cartes obsolètes avec leur bandeau', async () => {
    window.location.hash = '#/catalogue';
    mount();
    const obs = ALL_CARDS.find((c) => c.statut === 'obsolete')!;
    const search = await screen.findByRole('searchbox');
    fireEvent.change(search, { target: { value: obs.id } });
    const rows = await screen.findAllByRole('button', { expanded: false });
    fireEvent.click(rows[0]!);
    expect(await screen.findByRole('alert')).toBeTruthy();
  });
});
