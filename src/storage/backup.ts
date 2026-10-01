/**
 * Export / import de la progression (tout l'état personnel) en un seul fichier JSON versionné.
 * L'import valide le fichier avant d'écrire quoi que ce soit, puis remplace l'état existant.
 */
import { z } from 'zod';
import { DEFAULT_SETTINGS, loadAll, type DB, type Snapshot } from './db.ts';

const Note = z.enum(['su', 'hesite', 'rate']);
export const BackupSchema = z.object({
  schema_version: z.literal(1),
  app: z.literal('iata-dgr'),
  exported_at: z.string(),
  reviews: z.array(z.object({ seq: z.number().optional(), cardId: z.string(), date: z.string(), note: Note, mode: z.enum(['revision', 'examen']) })),
  notes: z.array(z.object({ id: z.string(), valeur_relue: z.string(), edition: z.string(), date: z.string() })),
  selections: z.array(z.object({ nom: z.string(), ids: z.array(z.string()) })),
  settings: z
    .object({
      theme: z.enum(['auto', 'light', 'dark']),
      langue: z.enum(['fr', 'en']),
      dateExamen: z.string().nullable(),
      dateExamenAdr: z.string().nullable(),
      formatImpression: z.enum(['2x4', '2x5', '1x1', 'pliage']),
      modeImpression: z.enum(['duplex', 'recto']),
      decalageVersoMm: z.object({ x: z.number(), y: z.number() }),
      melanger: z.boolean(),
    })
    .partial(),
  exams: z.array(
    z.object({
      seq: z.number().optional(),
      deck: z.enum(['iata', 'adr']).optional(),
      debut: z.string(),
      fin: z.string().nullable(),
      dureeMin: z.number(),
      ids: z.array(z.string()),
      reponses: z.record(z.string(), z.string()),
      verdicts: z.record(z.string(), z.boolean()),
      score: z.number().nullable(),
    }),
  ),
  journal: z.array(
    z.object({
      seq: z.number().optional(),
      date: z.string(),
      cardId: z.string(),
      question: z.string(),
      maReponse: z.string(),
      bonneReponse: z.string(),
      cause: z.string(),
      regle: z.string(),
    }),
  ),
});
export type Backup = z.infer<typeof BackupSchema>;

export function makeBackup(s: Snapshot, now = new Date()): Backup {
  return { schema_version: 1, app: 'iata-dgr', exported_at: now.toISOString(), ...s };
}

export function parseBackup(text: string): Backup {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('Fichier illisible : ce n’est pas du JSON.');
  }
  const r = BackupSchema.safeParse(json);
  if (!r.success) throw new Error(`Fichier non reconnu : ${r.error.issues[0]?.path.join('.') ?? ''} ${r.error.issues[0]?.message ?? ''}`.trim());
  return r.data;
}

/** Remplace tout l'état personnel par celui de la sauvegarde (une seule transaction). */
export async function restoreBackup(db: DB, b: Backup): Promise<Snapshot> {
  const stores = ['reviews', 'notes', 'selections', 'settings', 'exams', 'journal'] as const;
  const tx = db.transaction(stores, 'readwrite');
  await Promise.all(stores.map((s) => tx.objectStore(s).clear()));
  for (const r of b.reviews) await tx.objectStore('reviews').put(r);
  for (const n of b.notes) await tx.objectStore('notes').put(n);
  for (const s of b.selections) await tx.objectStore('selections').put(s);
  await tx.objectStore('settings').put({ ...DEFAULT_SETTINGS, ...b.settings }, 'settings');
  for (const e of b.exams) await tx.objectStore('exams').put(e);
  for (const j of b.journal) await tx.objectStore('journal').put(j);
  await tx.done;
  return loadAll(db);
}
