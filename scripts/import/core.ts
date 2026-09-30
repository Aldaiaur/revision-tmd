/**
 * Cœur de l'import des fiches Markdown → cartes.
 * Fonctions pures (aucun accès disque) pour pouvoir être testées.
 * Règle d'or : les réponses sont copiées telles quelles depuis la source, jamais reformulées.
 */
import { createHash } from 'node:crypto';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { toString } from 'mdast-util-to-string';
import type { Root, RootContent, Table, TableRow, Heading, Paragraph } from 'mdast';
import type { Card, CardType, Module, Statut } from '../../src/model/card.ts';

// ───────────────────────── Types de configuration ─────────────────────────

export type Role = 'key' | 'question' | 'answer' | 'reasoning' | 'ref' | 'status' | 'extra';

export type TableRule = {
  match: string;
  header?: string;
  code: string;
  kind: 'qr' | 'matrix' | 'pairs' | 'errors' | 'section' | 'ignore';
  module?: Module;
  moduleByKey?: Record<string, Module>;
  question?: string;
  questionPrefix?: string;
  forcePrefix?: boolean;
  rowQuestion?: Record<string, string>;
  key?: string;
  answer?: string[];
  roles?: Record<string, Role>;
  type?: CardType;
  statut?: string;
  baseStatut?: string;
  rowStatut?: Record<string, string>;
  nature?: 'perime' | 'erreur_corrigee';
  perimeTotal?: boolean;
  corrigeLabel?: string;
  tags?: string[];
};

export type ParagraphRule = {
  startsWith: string;
  code: string;
  module?: Module;
  question?: string;
  statut?: string;
  tags?: string[];
};

export type FicheConfig = {
  fiche: string;
  fichier: string;
  edition_ref: string;
  ignoreSections?: string[];
  tables: TableRule[];
  paragraphs: ParagraphRule[];
};

export type ExerciceConfig = {
  fiche: string;
  fichier: string;
  reponses?: string;
  format: 'phase' | 'qcm';
  moduleByTheme?: Record<string, Module>;
  moduleByKey?: Record<string, Module>;
  tags?: string[];
  tagsByTheme?: Record<string, string[]>;
};

export type ImportOptions = { longAnswerChars: number; longReasoningChars: number };

export type ReportEntry = { fichier: string; ligne: number; motif: string; extrait: string };

export type ImportResult = { cards: Card[]; report: ReportEntry[] };

// ───────────────────────── Utilitaires ─────────────────────────

export type Pastille = '🟢' | '🟠' | '🔴';
const PASTILLES: Pastille[] = ['🟢', '🟠', '🔴'];

export function findPastilles(s: string): Pastille[] {
  return PASTILLES.filter((p) => s.includes(p));
}

export function slugify(s: string, max = 40): string {
  const slug = s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[µ]/g, 'u')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.slice(0, max).replace(/-+$/g, '') || 'x';
}

export function normHeader(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function hash(s: string): string {
  return createHash('sha1').update(s.replace(/\s+/g, ' ').trim()).digest('hex').slice(0, 12);
}

/** Texte brut (sans Markdown) : sert aux longueurs et à la détection. */
export function plain(md: string): string {
  return md
    .replace(/\*\*|__/g, '')
    .replace(/(^|\s)[*_]([^*_]+)[*_]/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Références de section DGR citées dans un texte (numéros seulement, jamais le contenu). */
export function extractRefs(texts: string[]): string[] {
  const out: string[] = [];
  const push = (r: string) => {
    const v = r.trim().replace(/[.,;]$/, '');
    if (v && !out.includes(v)) out.push(v);
  };
  for (const t of texts) {
    if (!t) continue;
    for (const m of t.matchAll(/\b\d{1,2}\.\d{1,2}\.[A-Z]\b/g)) push(m[0]);
    for (const m of t.matchAll(/\b\d{1,2}(?:\.\d{1,2}){2,}\b/g)) push(m[0]);
    for (const m of t.matchAll(/\b(?:Section|section|Liste|table|tableau|Table)\s+(\d{1,2}(?:\.\d{1,2})*(?:\.[A-Z])?)\b/g)) push(m[1]!);
    for (const m of t.matchAll(/\b(?:Appendice|App\.)\s+([A-Z](?:\.\d+)*)/g)) push(`App. ${m[1]}`);
  }
  return out;
}

// ───────────────────────── Statuts ─────────────────────────

/** Signal fort de péremption : variations d'État ou d'exploitant (codes « XX-00 », hors UN/ID). */
const RE_PERIME_FORT = /variation|\b(?!UN\b|ID\b)[A-Z]{2,3}-\d{2}[a-z]?\b/;
const RE_PERIME =
  /périm|obsolète|Appendice D|annexe D|disparu|n'existe plus|CBTA|[Aa]ujourd'hui|règle de 2014|de 2014 :|[Ee]n 2026/;
const RE_ERREUR =
  /corrigé (?:écrit|donne|coche|note|dit|répond|traite|invoque|retient|associe|ne relève|corrige|porte)|[Cc]orrigé\s*:|Correct\s*:|[Cc]oquille|incohérence|erreur|au lieu de|\bet non\b|faute|contredit|livret (?:écrit|dit|donne)|ne correspond|ne reproduis pas|retenir le corrigé|alors que/;

function nature(text: string): 'perime' | 'erreur_corrigee' | undefined {
  if (RE_PERIME_FORT.test(text)) return 'perime';
  if (RE_ERREUR.test(text)) return 'erreur_corrigee';
  if (RE_PERIME.test(text)) return 'perime';
  return undefined;
}

export type StatutDecision = {
  statut: Statut;
  statut_source: string;
  nature_rouge?: 'perime' | 'erreur_corrigee';
  tags: string[];
  aTrier?: string;
};

/**
 * sources : textes porteurs de pastilles (cellule Statut, note de config…), dans l'ordre.
 * detection : texte élargi (ligne + contexte) pour qualifier un 🔴.
 */
export function decideStatut(
  sources: string[],
  detection: string,
  forcedNature?: 'perime' | 'erreur_corrigee',
  partial = false,
): StatutDecision {
  const src = sources.map((s) => s.trim()).filter(Boolean);
  const P = new Set(src.flatMap(findPastilles));
  const statut_source = src.length ? src.join(' · ') : '(aucune pastille)';
  if (P.size === 0) return { statut: 'a_relire', statut_source, tags: [] };
  if (!P.has('🔴')) return { statut: P.has('🟠') ? 'a_relire' : 'stable', statut_source, tags: [] };

  // D'abord les segments qui portent le 🔴, puis la ligne et son contexte.
  const rouges = src.flatMap((s) => s.split(/ · |\n/)).filter((s) => s.includes('🔴')).join(' ');
  const nat = forcedNature ?? nature(rouges) ?? nature(detection);
  if (!nat) return { statut: 'a_relire', statut_source, tags: ['rouge-a-trier'], aTrier: '🔴 de nature inconnue' };
  if (nat === 'erreur_corrigee') return { statut: 'a_relire', statut_source, nature_rouge: nat, tags: ['piege-corrige'] };
  if (P.size === 1 && !partial) return { statut: 'obsolete', statut_source, nature_rouge: 'perime', tags: [] };
  return { statut: 'a_relire', statut_source, nature_rouge: 'perime', tags: ['partie-perimee'] };
}

// ───────────────────────── Parcours Markdown ─────────────────────────

export function parseMd(text: string): Root {
  return unified().use(remarkParse).use(remarkGfm).parse(text) as Root;
}

function raw(text: string, n: { position?: { start: { offset?: number }; end: { offset?: number } } }): string {
  const p = n.position;
  if (!p || p.start.offset === undefined || p.end.offset === undefined) return '';
  return text.slice(p.start.offset, p.end.offset).trim();
}
/** Contenu d'une cellule de tableau, sans les barres de bordure. */
function cellRaw(text: string, n: Parameters<typeof raw>[1]): string {
  return raw(text, n).replace(/^\|/, '').replace(/(?<!\\)\|$/, '').trim();
}
const line = (n: RootContent | TableRow): number => n.position?.start.line ?? 1;

function isBoldStart(n: RootContent): n is Paragraph {
  return n.type === 'paragraph' && n.children[0]?.type === 'strong';
}

/** Rôles des colonnes, déduits des en-têtes puis corrigés par la config. */
export function detectRoles(headers: string[], overrides: Record<string, Role> = {}): Role[] {
  const starts = (h: string, list: string[]) => list.some((x) => h.startsWith(x));
  return headers.map((hRaw) => {
    if (overrides[hRaw]) return overrides[hRaw]!;
    const h = normHeader(hRaw);
    if (['q', '#', 'cas'].includes(h)) return 'key';
    if (starts(h, ['statut'])) return 'status';
    if (starts(h, ['pourquoi', 'raisonnement', 'demarche', 'remarques'])) return 'reasoning';
    if (starts(h, ['ref', 'reference'])) return 'ref';
    if (starts(h, ['reponse', 'marquage a ajouter', 'etiquettes attendues', 'correction', 'lecture', 'responsable', 'oui / non', 'designation', 'valeur']))
      return 'answer';
    if (
      starts(h, ['question', 'affirmation', 'donnees', 'produit', 'colis concerne', 'expedition', 'dgd donnee', 'operation', 'contenu', 'gravage', 'caracteristiques', 'constat', 'erreur'])
    )
      return 'question';
    return 'extra';
  });
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{([^{}]+)\}/g, (_, k: string) => values[k] ?? `{${k}}`);
}

function guessType(answer: string, reasoning: string): CardType {
  const a = plain(answer);
  if (/^(Vrai|Faux|Oui|Non)\b/i.test(a)) return 'vrai_faux';
  if (/\bQ\s*=|\d\s*[×/]\s*\d|=\s*\d/.test(`${a} ${plain(reasoning)}`)) return 'calcul';
  return 'question_ouverte';
}

function keyId(k: string): string {
  const t = plain(k);
  const num = t.match(/^(\d+)(.*)$/);
  if (num) return `Q${num[1]}${num[2]!.trim() ? '-' + slugify(num[2]!) : ''}`;
  return slugify(t);
}

type Ctx = {
  text: string;
  cfg: FicheConfig;
  opts: ImportOptions;
  cards: Card[];
  report: ReportEntry[];
  ids: Map<string, number>;
};

function uniqueId(ctx: Ctx, base: string, ligne: number): string {
  const n = ctx.ids.get(base) ?? 0;
  ctx.ids.set(base, n + 1);
  if (n === 0) return base;
  const id = `${base}-${n + 1}`;
  if (!/-suite$/.test(base)) ctx.report.push({ fichier: ctx.cfg.fichier, ligne, motif: 'Identifiant en double, suffixe ajouté', extrait: id });
  return id;
}

type Draft = {
  id: string;
  module: Module;
  section: string;
  question: string;
  sourceQuestion: string;
  ligne: number;
  type: CardType;
  answer: string;
  reasoning?: string;
  extras?: string[];
  refs?: string[];
  statutSources: string[];
  detection: string;
  forcedNature?: 'perime' | 'erreur_corrigee';
  reponse_corrige_2014?: string;
  choix?: { lettre: string; texte: string }[];
  bonne_lettre?: string;
  tags?: string[];
  difficulte?: 1 | 2 | 3;
  rawForHash: string;
  alwaysLong?: boolean;
  /** Cas complet : un 🔴 « périmé » n'en concerne qu'une partie. */
  partial?: boolean;
  edition_ref?: string;
};

function makeCard(ctx: Ctx, d: Draft): Card {
  const dec = decideStatut(d.statutSources, d.detection, d.forcedNature, d.partial);
  const answerPlain = plain(d.answer);
  const extras = (d.extras ?? []).filter(Boolean);
  const long = d.alwaysLong || answerPlain.length > ctx.opts.longAnswerChars;
  const reponse_courte = long ? null : d.answer || null;
  const devParts = [...(long ? [d.answer] : []), ...extras];
  const reasoning = d.reasoning?.trim() || null;
  const tags = new Set([...(d.tags ?? []), ...dec.tags]);
  const all = `${d.answer} ${reasoning ?? ''} ${dec.statut_source}`;
  if (/sans corrig|pas de corrigé/i.test(all)) tags.add('sans-corrige');
  if (/variation/i.test(all)) tags.add('variation');
  if (dec.aTrier) ctx.report.push({ fichier: ctx.cfg.fichier, ligne: d.ligne, motif: dec.aTrier, extrait: d.id });
  if (!reponse_courte && !long)
    ctx.report.push({ fichier: ctx.cfg.fichier, ligne: d.ligne, motif: 'Réponse vide', extrait: d.id });
  const card: Card = {
    id: d.id,
    module: d.module,
    source: { fiche: ctx.cfg.fiche, fichier: ctx.cfg.fichier, section: d.section, question: d.sourceQuestion, ligne: d.ligne },
    type: d.type,
    question: d.question,
    reponse_courte,
    raisonnement: reasoning,
    developpement: devParts.length ? devParts.join('\n\n') : null,
    statut: dec.statut,
    statut_source: dec.statut_source,
    ref_dgr: extractRefs([...(d.refs ?? []), d.answer, reasoning ?? '']),
    edition_ref: d.edition_ref ?? ctx.cfg.edition_ref,
    edition_verifiee: null,
    tags: [...tags].sort(),
    difficulte: d.difficulte ?? 2,
    hash_source: hash(d.rawForHash),
  };
  if (dec.nature_rouge) card.nature_rouge = dec.nature_rouge;
  if (d.reponse_corrige_2014) card.reponse_corrige_2014 = d.reponse_corrige_2014;
  if (d.choix) card.choix = d.choix;
  if (d.bonne_lettre) card.bonne_lettre = d.bonne_lettre;
  return card;
}

// ───────────────────────── Fiches F1…F5, T ─────────────────────────

function pickTableRule(rules: TableRule[], path: string, headers: string): TableRule | undefined {
  return rules
    .filter((r) => r.kind !== 'section' && path.includes(r.match) && (!r.header || headers.includes(r.header)))
    .sort((a, b) => b.match.length - a.match.length)[0];
}

function pickSectionRule(rules: TableRule[], anchorText: string): TableRule | undefined {
  return rules.filter((r) => r.kind === 'section' && anchorText.includes(r.match)).sort((a, b) => b.match.length - a.match.length)[0];
}

export function importFiche(text: string, cfg: FicheConfig, opts: ImportOptions): ImportResult {
  const ctx: Ctx = { text, cfg, opts, cards: [], report: [], ids: new Map() };
  const nodes = parseMd(text).children;
  const stack: { depth: number; text: string }[] = [];
  let boldTitle: string | null = null;
  let ignoreDepth: number | null = null;
  let seenH2 = false;

  const pathOf = () => [...stack.filter((h) => h.depth > 1).map((h) => h.text), ...(boldTitle ? [boldTitle] : [])].join(' > ');

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]!;
    if (n.type === 'heading') {
      const h = n as Heading;
      const t = toString(h);
      while (stack.length && stack[stack.length - 1]!.depth >= h.depth) stack.pop();
      stack.push({ depth: h.depth, text: t });
      boldTitle = null;
      if (h.depth === 2) seenH2 = true;
      if (ignoreDepth !== null && h.depth <= ignoreDepth) ignoreDepth = null;
      if (ignoreDepth === null && cfg.ignoreSections?.some((s) => t.startsWith(s))) ignoreDepth = h.depth;
      if (ignoreDepth !== null) continue;
      const rule = pickSectionRule(cfg.tables, t);
      if (rule) {
        let j = i + 1;
        while (j < nodes.length && !(nodes[j]!.type === 'heading' && (nodes[j] as Heading).depth <= h.depth)) j++;
        sectionCard(ctx, rule, t, pathOf(), nodes.slice(i + 1, j), line(n));
        i = j - 1;
      }
      continue;
    }
    if (!seenH2 || ignoreDepth !== null || n.type === 'thematicBreak' || n.type === 'html') continue;

    if (n.type === 'paragraph') {
      const r = raw(text, n);
      const pRule = cfg.paragraphs.find((p) => r.startsWith(p.startsWith));
      if (pRule) {
        if (pRule.code !== 'ignore') paragraphCard(ctx, pRule, r, pathOf(), line(n));
        continue;
      }
      if (isBoldStart(n)) {
        const t = toString(n);
        const sRule = pickSectionRule(cfg.tables, t);
        if (sRule) {
          let j = i + 1;
          while (j < nodes.length && nodes[j]!.type !== 'heading' && !isBoldStart(nodes[j]!)) j++;
          sectionCard(ctx, sRule, t, pathOf(), nodes.slice(i + 1, j), line(n));
          i = j - 1;
          continue;
        }
        if (nodes[i + 1]?.type === 'table') {
          boldTitle = t;
          continue;
        }
      }
      ctx.report.push({ fichier: cfg.fichier, ligne: line(n), motif: 'Paragraphe non converti', extrait: plain(r).slice(0, 90) });
      continue;
    }

    if (n.type === 'table') {
      const tbl = n as Table;
      const headers = tbl.children[0]!.children.map((c) => toString(c).trim());
      const rule = pickTableRule(cfg.tables, pathOf(), headers.join(' | '));
      if (!rule) {
        ctx.report.push({ fichier: cfg.fichier, ligne: line(n), motif: 'Tableau non configuré', extrait: headers.join(' | ') });
      } else if (rule.kind !== 'ignore') {
        tableCards(ctx, rule, tbl, headers, pathOf());
      }
      continue;
    }

    ctx.report.push({ fichier: cfg.fichier, ligne: line(n), motif: `Bloc « ${n.type} » non converti`, extrait: plain(raw(text, n)).slice(0, 90) });
  }
  return { cards: ctx.cards, report: ctx.report };
}

function sectionCard(ctx: Ctx, rule: TableRule, anchor: string, path: string, body: RootContent[], ligne: number) {
  const md = body.map((b) => raw(ctx.text, b)).filter(Boolean).join('\n\n');
  const single = body.length === 1 && body[0]!.type === 'paragraph';
  const id = uniqueId(ctx, `${ctx.cfg.fiche}.${rule.code}`, ligne);
  ctx.cards.push(
    makeCard(ctx, {
      id,
      module: rule.module!,
      section: path,
      sourceQuestion: anchor,
      question: rule.question ?? anchor,
      ligne,
      type: rule.type ?? 'question_ouverte',
      answer: md,
      alwaysLong: !single,
      statutSources: [
        ...[anchor, ...md.split('\n')].filter((s) => findPastilles(s).length).map((s) => plain(s).slice(0, 160)),
        ...(rule.statut ? [rule.statut] : []),
      ],
      partial: !single && !rule.perimeTotal,
      detection: `${anchor} ${md}`,
      forcedNature: rule.nature,
      tags: ['cas-complet', ...(rule.tags ?? [])],
      difficulte: 3,
      rawForHash: `${anchor}\n${md}`,
    }),
  );
}

function paragraphCard(ctx: Ctx, rule: ParagraphRule, r: string, path: string, ligne: number) {
  const id = uniqueId(ctx, `${ctx.cfg.fiche}.${rule.code}`, ligne);
  ctx.cards.push(
    makeCard(ctx, {
      id,
      module: rule.module!,
      section: path,
      sourceQuestion: plain(r).slice(0, 60),
      question: rule.question ?? plain(r),
      ligne,
      type: 'question_ouverte',
      answer: r,
      statutSources: rule.statut ? [rule.statut] : findPastilles(r).length ? [r] : [],
      detection: `${path} ${r}`,
      tags: rule.tags,
      rawForHash: r,
    }),
  );
}

function tableCards(ctx: Ctx, rule: TableRule, tbl: Table, headers: string[], path: string) {
  const roles = detectRoles(headers, rule.roles);
  const rows = tbl.children.slice(1);
  const pathPastilles = findPastilles(path).length ? [path.split(' > ').pop()!] : [];
  let parentQuestion = '';

  rows.forEach((row, idx) => {
    const cells = row.children.map((c) => cellRaw(ctx.text, c));
    const values: Record<string, string> = {};
    headers.forEach((h, k) => (values[h] = cells[k] ?? ''));
    const rowRaw = raw(ctx.text, row);
    const ligne = line(row);
    const rowNum = String(idx + 1);

    if (rule.kind === 'pairs') {
      const half = headers.length / 2;
      for (let p = 0; p < 2; p++) {
        const part = cells.slice(p * half, (p + 1) * half);
        if (!part[0]) continue;
        const sub = `${rowNum}${p === 0 ? 'a' : 'b'}`;
        const rowStat = rule.rowStatut?.[sub];
        ctx.cards.push(
          makeCard(ctx, {
            id: uniqueId(ctx, `${ctx.cfg.fiche}.${rule.code}.${slugify(plain(part[0]))}`, ligne),
            module: rule.module!,
            section: path,
            sourceQuestion: `ligne ${rowNum}, ${p === 0 ? 'gauche' : 'droite'}`,
            question: fill(rule.question!, { '0': plain(part[0]) }),
            ligne,
            type: rule.type ?? 'classement',
            answer: part.slice(1).join(' · '),
            statutSources: rowStat ? [rowStat] : rule.statut ? [rule.statut] : pathPastilles,
            detection: `${rowStat ?? ''} ${part.join(' ')}`,
            rawForHash: part.join('|'),
            tags: rule.tags,
          }),
        );
      }
      return;
    }

    const keyCol = roles.indexOf('key');
    const keyRaw = rule.key ? plain(fill(rule.key, values)) : keyCol >= 0 ? plain(cells[keyCol] ?? '') : rowNum;
    const keyNum = keyRaw.match(/^\d+/)?.[0] ?? keyRaw;
    const statusIdx = roles.indexOf('status');
    const statusCell = statusIdx >= 0 ? cells[statusIdx] ?? '' : '';
    const rowStat = rule.rowStatut?.[rowNum];
    let statutSources: string[];
    let corrige2014: string | undefined;
    if (statusCell && findPastilles(statusCell).length) {
      statutSources = [statusCell];
      if (rule.corrigeLabel && statusCell.includes('🔴')) {
        const rest = plain(statusCell.replace(/🔴/g, ''));
        if (rest) corrige2014 = `${rule.corrigeLabel} : ${rest}`;
      }
    } else if (findPastilles(rowRaw).length) statutSources = [cells.filter((c) => findPastilles(c).length).join(' · ')];
    else if (rule.statut) statutSources = [rule.statut];
    else statutSources = pathPastilles;
    if (rowStat) statutSources = [...statutSources.filter((s) => s !== rule.statut), rowStat];
    if (rule.baseStatut) statutSources = [rule.baseStatut, ...statutSources];

    const module = rule.moduleByKey?.[keyNum] ?? rule.module!;
    const common = {
      module,
      section: path,
      ligne,
      statutSources,
      detection: `${rowRaw} ${path}`,
      forcedNature: rule.nature,
      rawForHash: rowRaw,
      tags: rule.tags,
      reponse_corrige_2014: corrige2014,
    };

    if (rule.kind === 'matrix' || rule.kind === 'errors') {
      const used = new Set<string>();
      for (const m of `${rule.question ?? ''} ${rule.key ?? ''}`.matchAll(/\{([^{}]+)\}/g)) used.add(m[1]!);
      const answerCols = rule.answer ?? headers.filter((h, k) => !used.has(h) && roles[k] !== 'status' && roles[k] !== 'ref');
      const parts = answerCols
        .filter((h) => plain(values[h] ?? ''))
        .map((h) => (answerCols.length > 1 ? `${h} : ${values[h]}` : values[h]!));
      const plainValues: Record<string, string> = {};
      for (const h of headers) plainValues[h] = plain(values[h] ?? '');
      ctx.cards.push(
        makeCard(ctx, {
          ...common,
          id: uniqueId(ctx, `${ctx.cfg.fiche}.${rule.code}.${keyId(keyRaw)}`, ligne),
          sourceQuestion: keyRaw,
          question: fill(rule.question!, plainValues),
          type: rule.type ?? (rule.kind === 'errors' ? 'relecture_document' : 'classement'),
          answer: parts.join(' · '),
          refs: headers.filter((_, k) => roles[k] === 'ref').map((h) => plain(values[h] ?? '')),
        }),
      );
      return;
    }

    // kind === 'qr'
    const pick = (role: Role) => headers.filter((_, k) => roles[k] === role).map((h) => values[h] ?? '').filter((v) => plain(v));
    const qCell = pick('question')[0] ?? '';
    let answer = pick('answer').join(' · ');
    let reasoning = pick('reasoning').join(' · ');
    const extras = headers.filter((_, k) => roles[k] === 'extra' && plain(values[headers[k]!] ?? '')).map((h) => `**${h}** : ${values[h]}`);
    if (!plain(answer) && !plain(reasoning)) {
      ctx.report.push({ fichier: ctx.cfg.fichier, ligne, motif: 'Ligne sans réponse (renvoi ou sous-tableau), ignorée', extrait: plain(rowRaw).slice(0, 90) });
      return;
    }
    if (/^voir ci-dessous$/i.test(plain(answer))) {
      ctx.report.push({ fichier: ctx.cfg.fichier, ligne, motif: 'Renvoi « voir ci-dessous », traité par un autre tableau', extrait: plain(rowRaw).slice(0, 90) });
      return;
    }
    if (!plain(answer)) {
      answer = reasoning;
      reasoning = '';
    }
    const isSuite = /suite/i.test(keyRaw);
    const plainValues: Record<string, string> = {};
    for (const h of headers) plainValues[h] = plain(values[h] ?? '');
    let question = rule.rowQuestion?.[keyNum] ? fill(rule.rowQuestion[keyNum]!, plainValues) : rule.question ? fill(rule.question, plainValues) : plain(qCell);
    if (rule.questionPrefix && !rule.rowQuestion?.[keyNum] && (rule.forcePrefix || !question.trim().endsWith('?'))) question = rule.questionPrefix + question;
    if (isSuite) question = `${parentQuestion} → ${question || 'suite'}`;
    else parentQuestion = question;
    if (plain(reasoning).length > ctx.opts.longReasoningChars)
      ctx.report.push({ fichier: ctx.cfg.fichier, ligne, motif: `Raisonnement long (${plain(reasoning).length} car.), non raccourci`, extrait: `${ctx.cfg.fiche}.${rule.code}.${keyId(keyRaw)}` });

    ctx.cards.push(
      makeCard(ctx, {
        ...common,
        id: uniqueId(ctx, `${ctx.cfg.fiche}.${rule.code}.${keyId(keyRaw)}`, ligne),
        sourceQuestion: keyRaw,
        question,
        type: rule.type ?? guessType(answer, reasoning),
        answer,
        reasoning,
        extras,
        refs: pick('ref').map(plain),
      }),
    );
  });
}

// ───────────────────────── Exercices (phases, QCM) ─────────────────────────

/** Sépare « question A. x  B. y » en question + choix. */
export function splitChoices(s: string): { question: string; choix?: { lettre: string; texte: string }[] } {
  const m = s.match(/(^|\n|\s{2,}|\?\s|:\s)A\.\s/);
  if (!m || m.index === undefined) return { question: s.trim() };
  const cut = m.index + m[1]!.length;
  const seg = s.slice(cut).trim();
  const parts = seg.split(/\s{2,}(?=[B-E]\.\s)/);
  const choix = parts.map((p) => {
    const mm = p.match(/^([A-E])\.\s+([\s\S]*)$/);
    return mm ? { lettre: mm[1]!, texte: mm[2]!.trim() } : null;
  });
  if (choix.some((c) => !c) || choix.length < 2) return { question: s.trim() };
  return { question: s.slice(0, cut).trim(), choix: choix as { lettre: string; texte: string }[] };
}

type Q = { id: string; theme?: string; text: string; ligne: number; raw: string };

export function importPhase(text: string, cfg: ExerciceConfig, opts: ImportOptions): ImportResult {
  const fcfg: FicheConfig = { fiche: cfg.fiche, fichier: cfg.fichier, edition_ref: 'non précisée', tables: [], paragraphs: [] };
  const ctx: Ctx = { text, cfg: fcfg, opts, cards: [], report: [], ids: new Map() };
  const nodes = parseMd(text).children;
  let mode: 'skip' | 'q' | 'a' = 'skip';
  let theme: string | undefined;
  const questions: Q[] = [];
  const answers = new Map<string, { raw: string; letter?: string; ligne: number }>();

  for (const n of nodes) {
    if (n.type === 'heading') {
      const t = toString(n);
      if ((n as Heading).depth === 1) mode = /EXERCICES|QUESTIONS/.test(t) ? 'q' : /CORRIGÉ/.test(t) ? 'a' : 'skip';
      const th = t.match(/^Thème\s+(\d+)/);
      if (th) theme = th[1];
      continue;
    }
    if (mode === 'skip' || n.type !== 'paragraph') continue;
    const r = raw(text, n);
    if (mode === 'q') {
      const m = r.match(/^\*\*(\d+(?:\.\d+)?)\.?\*\*\s*([\s\S]*)$/);
      if (m) questions.push({ id: m[1]!, theme, text: m[2]!, ligne: line(n), raw: r });
      else if (/^A\.\s/.test(r) && questions.length) {
        const q = questions[questions.length - 1]!;
        q.text += `\n${r}`;
        q.raw += `\n${r}`;
      } else ctx.report.push({ fichier: cfg.fichier, ligne: line(n), motif: 'Paragraphe non converti', extrait: plain(r).slice(0, 90) });
    } else {
      const m = r.match(/^\*\*(\d+(?:\.\d+)?)\.?\s*([A-E])?\b\.?/);
      if (!m) {
        ctx.report.push({ fichier: cfg.fichier, ligne: line(n), motif: 'Paragraphe du corrigé non rattaché', extrait: plain(r).slice(0, 90) });
        continue;
      }
      const body = r.replace(/^\*\*(\d+(?:\.\d+)?)\.?\s*/, '**').replace(/^\*\*\*\*\s*/, '');
      answers.set(m[1]!, { raw: body, letter: m[2], ligne: line(n) });
    }
  }

  for (const q of questions) {
    const a = answers.get(q.id);
    if (!a) {
      ctx.report.push({ fichier: cfg.fichier, ligne: q.ligne, motif: 'Question sans corrigé', extrait: `${q.id} ${plain(q.text).slice(0, 70)}` });
      continue;
    }
    const { question, choix } = splitChoices(q.text);
    const module = cfg.moduleByKey?.[q.id] ?? (q.theme ? cfg.moduleByTheme?.[q.theme] : undefined);
    if (!module) {
      ctx.report.push({ fichier: cfg.fichier, ligne: q.ligne, motif: 'Module introuvable, question ignorée', extrait: q.id });
      continue;
    }
    ctx.cards.push(
      makeCard(ctx, {
        id: uniqueId(ctx, `${cfg.fiche}.Q${slugify(q.id)}`, q.ligne),
        module,
        section: q.theme ? `Thème ${q.theme}` : 'Questions',
        sourceQuestion: q.id,
        question: plain(question),
        ligne: q.ligne,
        type: choix ? 'qcm' : guessType(a.raw, ''),
        answer: a.raw,
        statutSources: findPastilles(a.raw).length ? [a.raw] : [],
        detection: a.raw,
        choix,
        bonne_lettre: choix && a.letter ? a.letter : undefined,
        tags: [...(cfg.tags ?? []), ...(q.theme ? cfg.tagsByTheme?.[q.theme] ?? [] : [])],
        rawForHash: `${q.raw}\n${a.raw}`,
        edition_ref: 'non précisée',
      }),
    );
    if (choix && !a.letter)
      ctx.report.push({ fichier: cfg.fichier, ligne: a.ligne, motif: 'QCM : lettre de bonne réponse introuvable', extrait: q.id });
  }
  return { cards: ctx.cards, report: ctx.report };
}

export function importQcm(qText: string, aText: string, cfg: ExerciceConfig, opts: ImportOptions): ImportResult {
  const fcfg: FicheConfig = { fiche: cfg.fiche, fichier: cfg.fichier, edition_ref: 'non précisée', tables: [], paragraphs: [] };
  const ctx: Ctx = { text: qText, cfg: fcfg, opts, cards: [], report: [], ids: new Map() };
  const answers = new Map<string, { letter: string; justification: string; row: string }>();
  for (const n of parseMd(aText).children) {
    if (n.type !== 'table') continue;
    for (const row of (n as Table).children.slice(1)) {
      const cells = row.children.map((c) => cellRaw(aText, c));
      const letter = plain(cells[1] ?? '').match(/^[A-E]$/)?.[0];
      if (cells[0] && letter) answers.set(plain(cells[0]), { letter, justification: cells[2] ?? '', row: raw(aText, row) });
    }
  }
  for (const n of parseMd(qText).children) {
    if (n.type !== 'paragraph') continue;
    const r = raw(qText, n);
    const m = r.match(/^\*\*Q(\d+)\.\*\*\s*([\s\S]*)$/);
    if (!m) continue;
    const id = m[1]!;
    const { question, choix } = splitChoices(m[2]!);
    const a = answers.get(id);
    const module = cfg.moduleByKey?.[id];
    if (!a || !choix || !module) {
      ctx.report.push({ fichier: cfg.fichier, ligne: line(n), motif: !a ? 'QCM sans corrigé' : !choix ? 'Choix A-D non reconnus' : 'Module introuvable', extrait: `Q${id}` });
      continue;
    }
    const good = choix.find((c) => c.lettre === a.letter);
    ctx.cards.push(
      makeCard(ctx, {
        id: uniqueId(ctx, `${cfg.fiche}.Q${id}`, line(n)),
        module,
        section: 'QCM',
        sourceQuestion: `Q${id}`,
        question: plain(question),
        ligne: line(n),
        type: 'qcm',
        answer: `**${a.letter}.** ${good?.texte ?? ''}`.trim(),
        reasoning: a.justification,
        statutSources: [],
        detection: a.justification,
        choix,
        bonne_lettre: a.letter,
        tags: cfg.tags,
        rawForHash: `${r}\n${a.row}`,
        edition_ref: 'non précisée',
      }),
    );
  }
  return { cards: ctx.cards, report: ctx.report };
}
