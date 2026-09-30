import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_SETTINGS, loadAll, openStore, type DB, type ExamRun, type JournalEntry, type NoteDGR, type Review, type Settings, type Snapshot } from '../storage/db.ts';
import type { Note } from '../model/filters.ts';
import { en } from '../i18n/en.ts';
import { fr, type Dict } from '../i18n/fr.ts';
import { CONFIG } from '../model/config.ts';
import { computeStates, localDay, type CardState } from '../srs/leitner.ts';

export const CURRENT_SELECTION = 'Sélection courante';

type Store = Snapshot & {
  ready: boolean;
  db: DB | null;
  t: Dict;
  lastNote: Map<string, Note>;
  notesById: Map<string, NoteDGR>;
  selected: Set<string>;
  leitner: Map<string, CardState>;
  today: string;
  rate: (cardId: string, note: Note, mode?: Review['mode']) => Promise<void>;
  saveNote: (n: NoteDGR) => Promise<void>;
  setSelected: (ids: Iterable<string>) => Promise<void>;
  toggleSelected: (id: string) => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  saveExam: (run: ExamRun) => Promise<ExamRun>;
  addJournal: (e: JournalEntry) => Promise<void>;
  reload: () => Promise<void>;
};

const Ctx = createContext<Store | null>(null);

const EMPTY: Snapshot = { reviews: [], notes: [], selections: [], settings: DEFAULT_SETTINGS, exams: [], journal: [] };

export function StoreProvider({ children, dbName }: { children: ReactNode; dbName?: string }) {
  const [db, setDb] = useState<DB | null>(null);
  const [snap, setSnap] = useState<Snapshot>(EMPTY);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    if (db) setSnap(await loadAll(db));
  }, [db]);

  useEffect(() => {
    let alive = true;
    openStore(dbName)
      .then(async (d) => {
        const s = await loadAll(d);
        if (!alive) return;
        setDb(d);
        setSnap(s);
        setReady(true);
      })
      .catch(() => setReady(true)); // IndexedDB indisponible : l'app reste utilisable sans persistance
    return () => {
      alive = false;
    };
  }, [dbName]);

  // Thème
  useEffect(() => {
    const root = document.documentElement;
    if (snap.settings.theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', snap.settings.theme);
    root.lang = snap.settings.langue;
  }, [snap.settings.theme, snap.settings.langue]);

  const lastNote = useMemo(() => {
    const m = new Map<string, Note>();
    for (const r of snap.reviews) if (r.mode === 'revision') m.set(r.cardId, r.note);
    return m;
  }, [snap.reviews]);
  const notesById = useMemo(() => new Map(snap.notes.map((n) => [n.id, n])), [snap.notes]);
  const selected = useMemo(() => new Set(snap.selections.find((s) => s.nom === CURRENT_SELECTION)?.ids ?? []), [snap.selections]);

  const rate = useCallback(
    async (cardId: string, note: Note, mode: Review['mode'] = 'revision') => {
      const r: Review = { cardId, note, mode, date: new Date().toISOString() };
      if (db) r.seq = await db.add('reviews', r);
      setSnap((s) => ({ ...s, reviews: [...s.reviews, r] }));
    },
    [db],
  );

  const saveNote = useCallback(
    async (n: NoteDGR) => {
      if (db) await db.put('notes', n);
      setSnap((s) => ({ ...s, notes: [...s.notes.filter((x) => x.id !== n.id), n] }));
    },
    [db],
  );

  const setSelected = useCallback(
    async (ids: Iterable<string>) => {
      const sel = { nom: CURRENT_SELECTION, ids: [...new Set(ids)] };
      if (db) await db.put('selections', sel);
      setSnap((s) => ({ ...s, selections: [...s.selections.filter((x) => x.nom !== CURRENT_SELECTION), sel] }));
    },
    [db],
  );

  const toggleSelected = useCallback(
    async (id: string) => {
      const next = new Set(selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      await setSelected(next);
    },
    [selected, setSelected],
  );

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const next = { ...snap.settings, ...patch };
      if (db) await db.put('settings', next, 'settings');
      setSnap((s) => ({ ...s, settings: next }));
    },
    [db, snap.settings],
  );

  const saveExam = useCallback(
    async (run: ExamRun) => {
      const saved = { ...run };
      if (db) saved.seq = await db.put('exams', saved);
      else saved.seq ??= Date.now();
      setSnap((s) => ({ ...s, exams: [...s.exams.filter((e) => e.seq !== saved.seq), saved] }));
      return saved;
    },
    [db],
  );

  const addJournal = useCallback(
    async (e: JournalEntry) => {
      const saved = { ...e };
      if (db) saved.seq = await db.add('journal', saved);
      setSnap((s) => ({ ...s, journal: [...s.journal, saved] }));
    },
    [db],
  );

  const leitner = useMemo(() => computeStates(snap.reviews, CONFIG.leitner, snap.settings.dateExamen), [snap.reviews, snap.settings.dateExamen]);
  const today = localDay(new Date());

  const t = snap.settings.langue === 'en' ? en : fr;

  const value: Store = {
    ...snap,
    ready,
    db,
    t,
    lastNote,
    notesById,
    selected,
    leitner,
    today,
    rate,
    saveNote,
    setSelected,
    toggleSelected,
    updateSettings,
    saveExam,
    addJournal,
    reload,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore hors de StoreProvider');
  return s;
}
