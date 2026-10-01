import { z } from 'zod';
import raw from '../../data/app-config.json';
import { MODULES } from './card.ts';

export const AppConfigSchema = z.object({
  leitner: z.object({
    intervallesJours: z.array(z.number().int().positive()).length(5),
    nouvellesParSession: z.number().int().nonnegative(),
  }),
  pointsFaibles: z.object({
    dernieresRevisions: z.number().int().positive(),
    boites: z.array(z.number().int().min(1).max(5)),
  }),
  examen: z.object({
    dureeMin: z.number().positive(),
    seuil: z.number().min(0).max(1),
    nbQuestions: z.number().int().positive(),
    bonusBoitesFaibles: z.number().min(1),
    /** Poids par module (absent = 1), toutes révisions confondues. */
    poidsModules: z.record(z.string(), z.number().nonnegative()),
  }),
});
export type AppConfig = z.infer<typeof AppConfigSchema>;

export const CONFIG: AppConfig = AppConfigSchema.parse(raw);
export const MODULE_LIST = MODULES;
