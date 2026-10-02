import { z } from 'zod';

export const MODULES = [
  'Généralités',
  'Restrictions',
  'Classification',
  'Identification',
  'Emballages',
  'Marquage',
  'Documents',
  'Traitement',
  'Expéditions',
  'Classe 7',
] as const;
/** Modules de la révision ADR (transport routier). */
export const ADR_MODULES = [
  'Réglementation',
  'Classification',
  'Emballages',
  'Étiquetage',
  'Exemptions',
  'Transport',
  'Gaz',
  'Biologique',
  'Lithium',
  'Déchets',
  'Citernes',
  'Véhicules',
  'Classe 1',
] as const;
export const ModuleSchema = z.enum([...MODULES, ...ADR_MODULES]);
export type Module = z.infer<typeof ModuleSchema>;

export const CARD_TYPES = [
  'qcm',
  'calcul',
  'classement',
  'relecture_document',
  'a_trous',
  'vrai_faux',
  'question_ouverte',
] as const;
export const CardTypeSchema = z.enum(CARD_TYPES);
export type CardType = z.infer<typeof CardTypeSchema>;

export const STATUTS = ['stable', 'a_relire', 'obsolete'] as const;
export const StatutSchema = z.enum(STATUTS);
export type Statut = z.infer<typeof StatutSchema>;

export const CardSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9]+(\.[A-Za-z0-9-]+)+$/),
  module: ModuleSchema,
  source: z.object({
    fiche: z.string(),
    fichier: z.string(),
    section: z.string(),
    question: z.string(),
    ligne: z.number().int().positive(),
  }),
  type: CardTypeSchema,
  question: z.string().min(1),
  reponse_courte: z.string().nullable(),
  raisonnement: z.string().nullable(),
  developpement: z.string().nullable(),
  reponse_corrige_2014: z.string().optional(),
  choix: z.array(z.object({ lettre: z.string(), texte: z.string() })).optional(),
  bonne_lettre: z.string().optional(),
  statut: StatutSchema,
  statut_source: z.string(),
  nature_rouge: z.enum(['perime', 'erreur_corrigee']).optional(),
  ref_dgr: z.array(z.string()),
  edition_ref: z.string(),
  edition_verifiee: z.string().nullable(),
  tags: z.array(z.string()),
  difficulte: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  hash_source: z.string(),
  overrides_appliques: z.array(z.string()).optional(),
});
export type Card = z.infer<typeof CardSchema>;

export const CardFileSchema = z.object({
  schema_version: z.literal(1),
  fiche: z.string(),
  fichier: z.string(),
  cards: z.array(CardSchema),
});
export type CardFile = z.infer<typeof CardFileSchema>;

/** Champs qu'un override manuel peut remplacer. */
export const OverrideSchema = CardSchema.pick({
  module: true,
  type: true,
  question: true,
  reponse_courte: true,
  raisonnement: true,
  developpement: true,
  statut: true,
  nature_rouge: true,
  ref_dgr: true,
  edition_verifiee: true,
  tags: true,
  difficulte: true,
})
  .partial()
  .extend({
    /** hash_source de la ligne au moment où l'override a été écrit (facultatif). */
    hash_source: z.string().optional(),
    /** Commentaire libre, jamais affiché sur la carte. */
    note: z.string().optional(),
  });
export type Override = z.infer<typeof OverrideSchema>;

export const OverridesFileSchema = z.object({
  schema_version: z.literal(1),
  cards: z.record(z.string(), OverrideSchema),
});
export type OverridesFile = z.infer<typeof OverridesFileSchema>;
