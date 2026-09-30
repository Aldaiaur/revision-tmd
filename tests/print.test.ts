import { describe, expect, it } from 'vitest';
import { cropMarks, geometry, GRID, mirror, PAGE, paginate, slotAt } from '../src/print/layout.ts';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `c${i + 1}`);

describe('géométrie', () => {
  it('les grilles tiennent dans la zone imprimable A4', () => {
    for (const f of ['2x4', '2x5', '1x1', 'pliage'] as const) {
      const g = geometry(f);
      expect(g.x0 + g.cols * g.cardW).toBeLessThanOrEqual(GRID.x + GRID.w + 1e-9);
      expect(g.y0 + g.rows * g.cardH).toBeLessThanOrEqual(GRID.y + GRID.h + 1e-9);
      expect(g.x0).toBeGreaterThanOrEqual(5);
    }
    expect(geometry('2x4')).toMatchObject({ cardW: 98, cardH: 68.5 });
  });
  it('la grille est centrée horizontalement (miroir exact)', () => {
    expect(GRID.x + GRID.w / 2).toBe(PAGE.w / 2);
  });
});

describe('pagination recto-verso', () => {
  it('16 cartes en 2 × 4 → 4 pages R, V, R, V', () => {
    const s = paginate(ids(16), '2x4', 'duplex');
    expect(s.map((x) => x.kind)).toEqual(['recto', 'verso', 'recto', 'verso']);
    expect(s.map((x) => x.slots.length)).toEqual([8, 8, 8, 8]);
  });
  it('le verso est le miroir gauche/droite du recto, rangée identique', () => {
    const [recto, verso] = paginate(ids(8), '2x4', 'duplex');
    for (const r of recto!.slots) {
      const v = verso!.slots.find((s) => s.id === r.id)!;
      expect(v.row).toBe(r.row);
      expect(v.col).toBe(1 - r.col);
      expect(v.y).toBe(r.y);
      expect(v.x + v.w / 2).toBeCloseTo(PAGE.w - (r.x + r.w / 2));
    }
  });
  it('dernière planche incomplète : versos aux positions miroir des rectos présents', () => {
    const s = paginate(ids(11), '2x4', 'duplex');
    expect(s).toHaveLength(4);
    const recto = s[2]!;
    const verso = s[3]!;
    expect(recto.slots.map((x) => [x.id, x.col])).toEqual([
      ['c9', 0],
      ['c10', 1],
      ['c11', 0],
    ]);
    expect(verso.slots.map((x) => [x.id, x.col])).toEqual([
      ['c9', 1],
      ['c10', 0],
      ['c11', 1],
    ]);
  });
  it('2 × 5 et 1 par page', () => {
    expect(paginate(ids(23), '2x5', 'duplex')).toHaveLength(6);
    const one = paginate(ids(3), '1x1', 'duplex');
    expect(one.map((x) => x.kind)).toEqual(['recto', 'verso', 'recto', 'verso', 'recto', 'verso']);
    expect(one[1]!.slots[0]!.x).toBe(one[0]!.slots[0]!.x);
  });
  it('pliage : une seule face, 4 bandes par page, pas de verso', () => {
    const s = paginate(ids(9), 'pliage', 'recto');
    expect(s.map((x) => [x.kind, x.slots.length])).toEqual([
      ['pliage', 4],
      ['pliage', 4],
      ['pliage', 1],
    ]);
  });
  it('miroir involutif', () => {
    const g = geometry('2x5');
    const s = slotAt(g, 7);
    expect(mirror(mirror(s, g), g)).toEqual(s);
  });
});

describe('repères de découpe', () => {
  it('restent dans la page et hors des cartes', () => {
    const g = geometry('2x4');
    for (const m of cropMarks('2x4')) {
      for (const [x, y] of [
        [m.x1, m.y1],
        [m.x2, m.y2],
      ] as const) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(PAGE.w);
        expect(y).toBeGreaterThanOrEqual(0);
        const inside = x > g.x0 && x < g.x0 + g.cols * g.cardW && y > g.y0 && y < g.y0 + g.rows * g.cardH;
        expect(inside).toBe(false);
      }
    }
    expect(cropMarks('2x4')).toHaveLength((3 + 5) * 2);
  });
});
