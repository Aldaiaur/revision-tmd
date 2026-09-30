import type { Card, OverridesFile } from '../../src/model/card.ts';
import { plain, type ImportOptions, type ReportEntry } from './core.ts';

export type OverrideReport = { applied: string[]; unknown: string[]; stale: string[] };

/** Applique les overrides manuels (en place). Ils ont toujours le dernier mot. */
export function applyOverrides(cards: Card[], ov: OverridesFile): OverrideReport {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const rep: OverrideReport = { applied: [], unknown: [], stale: [] };
  for (const [id, o] of Object.entries(ov.cards)) {
    const card = byId.get(id);
    if (!card) {
      rep.unknown.push(id);
      continue;
    }
    const { hash_source, note: _note, ...fields } = o;
    if (hash_source && hash_source !== card.hash_source) rep.stale.push(id);
    Object.assign(card, fields);
    if (fields.statut && fields.statut !== 'obsolete' && !fields.nature_rouge) delete card.nature_rouge;
    card.overrides_appliques = Object.keys(fields).sort();
    rep.applied.push(id);
  }
  return rep;
}

const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');

export function renderReport(
  files: { fiche: string; fichier: string; cards: Card[] }[],
  entries: ReportEntry[],
  ov: OverrideReport,
  opts: ImportOptions,
): string {
  const all = files.flatMap((f) => f.cards);
  const L: string[] = [];
  const tally = (key: (c: Card) => string, list: Card[] = all) =>
    list.reduce<Record<string, number>>((a, c) => ((a[key(c)] = (a[key(c)] ?? 0) + 1), a), {});

  L.push('# Rapport d\'import des fiches', '');
  L.push('Généré par `npm run import`. Ne pas éditer : les décisions manuelles vont dans `data/overrides.json`.', '');

  L.push('## 1. Résumé', '');
  L.push('| Fichier | Cartes | stable | a_relire | obsolete | à condenser |', '|---|---|---|---|---|---|');
  for (const f of files) {
    const t = tally((c) => c.statut, f.cards);
    L.push(`| ${f.fiche} (${f.fichier}) | ${f.cards.length} | ${t.stable ?? 0} | ${t.a_relire ?? 0} | ${t.obsolete ?? 0} | ${f.cards.filter((c) => !c.reponse_courte).length} |`);
  }
  const t = tally((c) => c.statut);
  L.push(`| **Total** | **${all.length}** | ${t.stable ?? 0} | ${t.a_relire ?? 0} | ${t.obsolete ?? 0} | ${all.filter((c) => !c.reponse_courte).length} |`, '');
  L.push('Par module : ' + Object.entries(tally((c) => c.module)).map(([k, v]) => `${k} ${v}`).join(' · '), '');
  L.push('Par type : ' + Object.entries(tally((c) => c.type)).map(([k, v]) => `${k} ${v}`).join(' · '), '');

  const rouges = all.filter((c) => c.statut_source.includes('🔴'));
  L.push('## 2. Cartes 🔴 : nature détectée (à confirmer)', '');
  L.push(
    'Règle : 🔴 « erreur corrigée » → `a_relire` + tag `piege-corrige` (reste en révision). 🔴 « périmé » seul → `obsolete` (exclu). 🔴 périmé mêlé à 🟢/🟠 → `a_relire` + `partie-perimee`. Nature ambiguë → `a_relire` + `rouge-a-trier`.',
    '',
  );
  L.push('Pour corriger une décision : `data/overrides.json` → `{ "<id>": { "statut": "obsolete", "nature_rouge": "perime" } }`.', '');
  L.push('| Id | Nature | Statut retenu | Statut source |', '|---|---|---|---|');
  for (const c of rouges)
    L.push(`| \`${c.id}\` | ${c.nature_rouge ?? (c.tags.includes('rouge-a-trier') ? '**à trier**' : '—')} | ${c.statut} | ${esc(c.statut_source).slice(0, 110)} |`);
  L.push('');

  const longs = all.filter((c) => !c.reponse_courte);
  L.push(`## 3. Réponses à condenser (${longs.length})`, '');
  L.push(
    `Réponse de plus de ${opts.longAnswerChars} caractères, ou cas complet. Le texte intégral est dans \`developpement\`. Pour ajouter une réponse courte : \`{ "<id>": { "reponse_courte": "…" } }\` dans \`data/overrides.json\`.`,
    '',
  );
  for (const c of longs) L.push(`- \`${c.id}\` (${plain(c.developpement ?? '').length} car.) — ${esc(c.question).slice(0, 90)}`);
  L.push('');

  const groups = new Map<string, ReportEntry[]>();
  for (const e of entries) groups.set(e.motif, [...(groups.get(e.motif) ?? []), e]);
  L.push(`## 4. Lignes et blocs non convertis ou signalés (${entries.length})`, '');
  for (const [motif, list] of [...groups.entries()].sort()) {
    L.push(`### ${motif} (${list.length})`, '');
    for (const e of list) L.push(`- ${e.fichier}, ligne ${e.ligne} : ${esc(e.extrait)}`);
    L.push('');
  }

  L.push('## 5. Overrides manuels', '');
  L.push(`- Appliqués : ${ov.applied.length ? ov.applied.map((i) => `\`${i}\``).join(', ') : 'aucun'}`);
  L.push(`- Identifiants inconnus : ${ov.unknown.length ? ov.unknown.map((i) => `\`${i}\``).join(', ') : 'aucun'}`);
  L.push(`- Peut-être périmés (la ligne source a changé) : ${ov.stale.length ? ov.stale.map((i) => `\`${i}\``).join(', ') : 'aucun'}`, '');
  return L.join('\n');
}
