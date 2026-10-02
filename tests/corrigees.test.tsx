// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { StoreProvider, useStore } from '../src/state/store.tsx';
import { openStore } from '../src/storage/db.ts';
import { ADR_CARDS } from '../src/data/cards.ts';

afterEach(cleanup);

function Probe({ onReady }: { onReady: (s: ReturnType<typeof useStore>) => void }) {
  const s = useStore();
  if (s.ready) onReady(s);
  return null;
}

describe('cartes corrigées', () => {
  it('une carte dont le contenu a changé depuis la notation est signalée, pas les autres', async () => {
    const name = `corr-${Date.now()}`;
    const [a, b, c] = ADR_CARDS;
    const db = await openStore(name);
    await db.add('reviews', { cardId: a!.id, note: 'su', mode: 'revision', date: '2026-10-01T10:00:00Z', hash: 'ancienne-version' });
    await db.add('reviews', { cardId: b!.id, note: 'su', mode: 'revision', date: '2026-10-01T10:00:00Z', hash: b!.hash_source });
    await db.add('reviews', { cardId: c!.id, note: 'su', mode: 'revision', date: '2026-10-01T10:00:00Z' }); // ancienne notation sans empreinte
    db.close();

    let store: ReturnType<typeof useStore> | null = null;
    render(
      <StoreProvider dbName={name}>
        <Probe onReady={(s) => (store = s)} />
      </StoreProvider>,
    );
    await waitFor(() => expect(store).not.toBeNull());
    expect([...store!.corrigees]).toEqual([a!.id]);
    expect(store!.persistent).toBe(true);
  });
});
