/**
 * npm run import
 * Convertit les fiches Markdown en cartes JSON (data/cards/*.json) et écrit data/import-report.md.
 * Les décisions manuelles de data/overrides.json sont appliquées en dernier et survivent aux réimports.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CardFileSchema, CardSchema, OverridesFileSchema, type Card } from '../src/model/card.ts';
import { importFiche, importPhase, importQcm, type ExerciceConfig, type FicheConfig, type ReportEntry } from './import/core.ts';
import { applyOverrides, renderReport } from './import/report.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'import.config.json'), 'utf8')) as {
  sourceDir: string;
  longAnswerChars: number;
  longReasoningChars: number;
  fiches: FicheConfig[];
  exercices: ExerciceConfig[];
};
const opts = { longAnswerChars: config.longAnswerChars, longReasoningChars: config.longReasoningChars };
const src = (f: string) => fs.readFileSync(path.join(root, config.sourceDir, f), 'utf8');

const files: { fiche: string; fichier: string; cards: Card[] }[] = [];
const report: ReportEntry[] = [];

for (const cfg of config.fiches) {
  const r = importFiche(src(cfg.fichier), cfg, opts);
  files.push({ fiche: cfg.fiche, fichier: cfg.fichier, cards: r.cards });
  report.push(...r.report);
}
for (const cfg of config.exercices) {
  const r = cfg.format === 'qcm' ? importQcm(src(cfg.fichier), src(cfg.reponses!), cfg, opts) : importPhase(src(cfg.fichier), cfg, opts);
  files.push({ fiche: cfg.fiche, fichier: cfg.fichier, cards: r.cards });
  report.push(...r.report);
}

// Overrides manuels
const ovPath = path.join(root, 'data', 'overrides.json');
if (!fs.existsSync(ovPath)) fs.writeFileSync(ovPath, JSON.stringify({ schema_version: 1, cards: {} }, null, 2) + '\n');
const overrides = OverridesFileSchema.parse(JSON.parse(fs.readFileSync(ovPath, 'utf8')));
const ovReport = applyOverrides(files.flatMap((f) => f.cards), overrides);

// Validation et unicité
const seen = new Set<string>();
for (const f of files)
  for (const c of f.cards) {
    CardSchema.parse(c);
    if (seen.has(c.id)) throw new Error(`Identifiant en double : ${c.id}`);
    seen.add(c.id);
  }

// Écriture (déterministe : pas d'horodatage, ordre de la source)
const outDir = path.join(root, 'data', 'cards');
fs.mkdirSync(outDir, { recursive: true });
const expected = new Set(files.map((f) => `${f.fiche}.json`));
for (const old of fs.readdirSync(outDir)) if (old.endsWith('.json') && !expected.has(old)) fs.rmSync(path.join(outDir, old));
for (const f of files) {
  const data = CardFileSchema.parse({ schema_version: 1, fiche: f.fiche, fichier: f.fichier, cards: f.cards });
  fs.writeFileSync(path.join(outDir, `${f.fiche}.json`), JSON.stringify(data, null, 2) + '\n');
}
fs.writeFileSync(path.join(root, 'data', 'import-report.md'), renderReport(files, report, ovReport, opts));

const all = files.flatMap((f) => f.cards);
const count = (k: (c: Card) => string) => Object.entries(all.reduce<Record<string, number>>((a, c) => ((a[k(c)] = (a[k(c)] ?? 0) + 1), a), {}));
console.log(`${all.length} cartes écrites dans data/cards/ (${files.length} fichiers).`);
console.log('Statuts :', count((c) => c.statut).map(([k, v]) => `${k} ${v}`).join(' · '));
console.log(`Rapport : data/import-report.md (${report.length} entrées, ${all.filter((c) => !c.reponse_courte).length} réponses à condenser).`);
