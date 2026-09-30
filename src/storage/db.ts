import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Note } from '../model/filters.ts';

export type Review = { seq?: number; cardId: string; date: string; note: Note; mode: 'revision' | 'examen' };
export type NoteDGR = { id: string; valeur_relue: string; edition: string; date: string };
export type Selection = { nom: string; ids: string[] };
export type PrintFormat = '2x4' | '2x5' | '1x1' | 'pliage';
export type Settings = {
  theme: 'auto' | 'light' | 'dark';
  langue: 'fr' | 'en';
  dateExamen: string | null;
  formatImpression: PrintFormat;
  modeImpression: 'duplex' | 'recto';
  decalageVersoMm: { x: number; y: number };
  melanger: boolean;
};
export type ExamRun = {
  seq?: number;
  debut: string;
  fin: string | null;
  dureeMin: number;
  ids: string[];
  reponses: Record<string, string>;
  verdicts: Record<string, boolean>;
  score: number | null;
};
export type JournalEntry = {
  seq?: number;
  date: string;
  cardId: string;
  question: string;
  maReponse: string;
  bonneReponse: string;
  cause: string;
  regle: string;
};

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  langue: 'fr',
  dateExamen: null,
  formatImpression: '2x4',
  modeImpression: 'duplex',
  decalageVersoMm: { x: 0, y: 0 },
  melanger: false,
};

interface Schema extends DBSchema {
  reviews: { key: number; value: Review; indexes: { 'by-card': string } };
  notes: { key: string; value: NoteDGR };
  selections: { key: string; value: Selection };
  settings: { key: string; value: Settings };
  exams: { key: number; value: ExamRun };
  journal: { key: number; value: JournalEntry };
}

export type DB = IDBPDatabase<Schema>;

export function openStore(name = 'iata-dgr'): Promise<DB> {
  return openDB<Schema>(name, 1, {
    upgrade(db) {
      const r = db.createObjectStore('reviews', { keyPath: 'seq', autoIncrement: true });
      r.createIndex('by-card', 'cardId');
      db.createObjectStore('notes', { keyPath: 'id' });
      db.createObjectStore('selections', { keyPath: 'nom' });
      db.createObjectStore('settings');
      db.createObjectStore('exams', { keyPath: 'seq', autoIncrement: true });
      db.createObjectStore('journal', { keyPath: 'seq', autoIncrement: true });
    },
  });
}

export type Snapshot = {
  reviews: Review[];
  notes: NoteDGR[];
  selections: Selection[];
  settings: Settings;
  exams: ExamRun[];
  journal: JournalEntry[];
};

export async function loadAll(db: DB): Promise<Snapshot> {
  const [reviews, notes, selections, settings, exams, journal] = await Promise.all([
    db.getAll('reviews'),
    db.getAll('notes'),
    db.getAll('selections'),
    db.get('settings', 'settings'),
    db.getAll('exams'),
    db.getAll('journal'),
  ]);
  return { reviews, notes, selections, settings: { ...DEFAULT_SETTINGS, ...settings }, exams, journal };
}
