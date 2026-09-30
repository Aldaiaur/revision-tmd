/**
 * Géométrie des planches A4 (en millimètres). Fonctions pures, testées.
 *
 * Recto-verso bord long (A4 portrait) : la feuille se retourne autour de son grand côté vertical.
 * Le verso d'une carte placée en (rangée r, colonne c) se trouve donc en (r, cols − 1 − c),
 * soit x' = largeur de page − x − largeur de carte, y inchangé.
 */
import type { PrintFormat } from '../storage/db.ts';

export const PAGE = { w: 210, h: 297 } as const;
/** Zone de grille : marges latérales 7 mm, haut 10 mm (en-tête de planche), bas 13 mm (mentions). */
export const GRID = { x: 7, y: 10, w: 196, h: 274 } as const;

export type Geometry = { cols: number; rows: number; cardW: number; cardH: number; x0: number; y0: number; pliage: boolean };

export function geometry(format: PrintFormat): Geometry {
  switch (format) {
    case '2x4':
      return { cols: 2, rows: 4, cardW: GRID.w / 2, cardH: GRID.h / 4, x0: GRID.x, y0: GRID.y, pliage: false };
    case '2x5':
      return { cols: 2, rows: 5, cardW: GRID.w / 2, cardH: GRID.h / 5, x0: GRID.x, y0: GRID.y, pliage: false };
    case '1x1':
      return { cols: 1, rows: 1, cardW: GRID.w, cardH: GRID.h / 2, x0: GRID.x, y0: GRID.y, pliage: false };
    case 'pliage':
      // Bandes pleine largeur : question à gauche, réponse à droite, pliure au centre.
      return { cols: 1, rows: 4, cardW: GRID.w, cardH: GRID.h / 4, x0: GRID.x, y0: GRID.y, pliage: true };
  }
}

export type Slot = { id: string; index: number; row: number; col: number; x: number; y: number; w: number; h: number };
export type Sheet = { kind: 'recto' | 'verso' | 'pliage'; number: number; slots: Slot[] };

export function perSheet(format: PrintFormat): number {
  const g = geometry(format);
  return g.cols * g.rows;
}

export function slotAt(g: Geometry, i: number): Omit<Slot, 'id' | 'index'> {
  const row = Math.floor(i / g.cols);
  const col = i % g.cols;
  return { row, col, x: g.x0 + col * g.cardW, y: g.y0 + row * g.cardH, w: g.cardW, h: g.cardH };
}

/** Position du verso d'un emplacement recto (miroir horizontal, bord long). */
export function mirror(s: Omit<Slot, 'id' | 'index'>, g: Geometry): Omit<Slot, 'id' | 'index'> {
  return { ...s, col: g.cols - 1 - s.col, x: PAGE.w - s.x - s.w };
}

/**
 * Découpe une liste de cartes en planches.
 * duplex : alternance recto, verso, recto, verso… (le verso est toujours la page paire).
 * recto  : format « pliage » obligatoire, une seule face par planche.
 */
export function paginate(ids: string[], format: PrintFormat, mode: 'duplex' | 'recto'): Sheet[] {
  const g = geometry(format);
  const n = g.cols * g.rows;
  const sheets: Sheet[] = [];
  for (let start = 0; start < ids.length; start += n) {
    const chunk = ids.slice(start, start + n);
    const slots = chunk.map((id, i) => ({ id, index: start + i, ...slotAt(g, i) }));
    if (g.pliage || mode === 'recto') {
      sheets.push({ kind: 'pliage', number: sheets.length + 1, slots });
    } else {
      sheets.push({ kind: 'recto', number: sheets.length + 1, slots });
      sheets.push({ kind: 'verso', number: sheets.length + 1, slots: slots.map((s) => ({ ...s, ...mirror(s, g) })) });
    }
  }
  return sheets;
}

export type Mark = { x1: number; y1: number; x2: number; y2: number };

/** Repères de découpe : prolongement de chaque ligne de coupe dans les marges (hors zone de carte). */
export function cropMarks(format: PrintFormat, len = 3, gap = 1): Mark[] {
  const g = geometry(format);
  const xs = Array.from({ length: g.cols + 1 }, (_, i) => g.x0 + i * g.cardW);
  const ys = Array.from({ length: g.rows + 1 }, (_, i) => g.y0 + i * g.cardH);
  const top = g.y0;
  const bottom = g.y0 + g.rows * g.cardH;
  const left = g.x0;
  const right = g.x0 + g.cols * g.cardW;
  const marks: Mark[] = [];
  for (const x of xs) {
    marks.push({ x1: x, y1: top - gap - len, x2: x, y2: top - gap });
    marks.push({ x1: x, y1: bottom + gap, x2: x, y2: bottom + gap + len });
  }
  for (const y of ys) {
    marks.push({ x1: left - gap - Math.min(len, left - gap - 1), y1: y, x2: left - gap, y2: y });
    marks.push({ x1: right + gap, y1: y, x2: right + gap + Math.min(len, PAGE.w - right - gap - 1), y2: y });
  }
  return marks;
}

/** Emplacements de contrôle de la page de calibration (centres des cartes 2 × 4). */
export function calibrationPoints(): { x: number; y: number }[] {
  const g = geometry('2x4');
  return Array.from({ length: g.cols * g.rows }, (_, i) => {
    const s = slotAt(g, i);
    return { x: s.x + s.w / 2, y: s.y + s.h / 2 };
  });
}
