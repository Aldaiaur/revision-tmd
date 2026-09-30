import { CARD_BY_ID } from '../data/cards.ts';
import type { PrintFormat } from '../storage/db.ts';
import { useStore } from '../state/store.tsx';
import { calibrationPoints, cropMarks, PAGE, type Sheet } from './layout.ts';
import { PrintRecto, PrintVerso } from './PrintCard.tsx';

const mm = (v: number) => `${v}mm`;

function SheetFrame({ label, children, total, number }: { label: string; children: React.ReactNode; total: number; number: number }) {
  const { t } = useStore();
  return (
    <div className="sheet-box">
    <section className="sheet" aria-label={`Planche ${number} / ${total} · ${label}`}>
      <div className="sheet-head">
        Révision IATA DGR · planche {number}/{total} · {label}
      </div>
      {children}
      <div className="sheet-foot">{t.mention}</div>
    </section>
    </div>
  );
}

function Marks({ format }: { format: PrintFormat }) {
  return (
    <svg className="crop-marks" viewBox={`0 0 ${PAGE.w} ${PAGE.h}`} width={mm(PAGE.w)} height={mm(PAGE.h)} aria-hidden="true">
      {cropMarks(format).map((m, i) => (
        <line key={i} x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} stroke="#000" strokeWidth={0.2} />
      ))}
    </svg>
  );
}

export function Sheets({ sheets, format }: { sheets: Sheet[]; format: PrintFormat }) {
  const { settings } = useStore();
  const size = format === '1x1' ? 'large' : 'small';
  const { x: dx, y: dy } = settings.decalageVersoMm;
  const labelOf = (s: Sheet) =>
    s.kind === 'recto' ? 'RECTO (questions)' : s.kind === 'verso' ? 'VERSO (réponses) · recto-verso bord long' : 'recto seul · plier au centre';
  return (
    <>
      {sheets.map((s) => (
        <SheetFrame key={s.number} label={labelOf(s)} total={sheets.length} number={s.number}>
          <div className="sheet-grid" style={s.kind === 'verso' ? { transform: `translate(${mm(dx)}, ${mm(dy)})` } : undefined}>
            {s.kind !== 'verso' && <Marks format={format} />}
            {s.slots.map((slot) => {
              const card = CARD_BY_ID.get(slot.id);
              if (!card) return null;
              const style = { left: mm(slot.x), top: mm(slot.y), width: mm(slot.w), height: mm(slot.h) };
              if (s.kind === 'pliage')
                return (
                  <div key={slot.id} className="slot slot-strip" style={style}>
                    <div className="strip-half">
                      <PrintRecto card={card} size="small" />
                    </div>
                    <div className="fold-line" aria-hidden="true" />
                    <div className="strip-half">
                      <PrintVerso card={card} size="small" />
                    </div>
                  </div>
                );
              return (
                <div key={slot.id} className="slot" style={style}>
                  {s.kind === 'recto' ? <PrintRecto card={card} size={size} /> : <PrintVerso card={card} size={size} />}
                </div>
              );
            })}
          </div>
        </SheetFrame>
      ))}
    </>
  );
}

/**
 * Page de calibration : croix + règles graduées au recto, croix seule au verso.
 * Les graduations indiquent directement la correction à saisir.
 */
export function CalibrationSheets() {
  const { settings } = useStore();
  const { x: dx, y: dy } = settings.decalageVersoMm;
  const pts = calibrationPoints();
  const ticks = Array.from({ length: 11 }, (_, i) => i - 5);
  return (
    <>
      <SheetFrame label="CALIBRATION — recto" total={2} number={1}>
        <svg className="crop-marks" viewBox={`0 0 ${PAGE.w} ${PAGE.h}`} width={mm(PAGE.w)} height={mm(PAGE.h)}>
          {pts.map((p, i) => (
            <g key={i} stroke="#000" strokeWidth={0.15} fontSize={2.2} textAnchor="middle">
              {/* petite croix de référence */}
              <line x1={p.x - 2} y1={p.y} x2={p.x + 2} y2={p.y} />
              <line x1={p.x} y1={p.y - 2} x2={p.x} y2={p.y + 2} />
              {/* échelle horizontale (correction x), sous la croix */}
              <line x1={p.x - 5} y1={p.y + 8} x2={p.x + 5} y2={p.y + 8} />
              {/* échelle verticale (correction y), à droite de la croix */}
              <line x1={p.x + 8} y1={p.y - 5} x2={p.x + 8} y2={p.y + 5} />
              {ticks.map((k) => (
                <g key={k}>
                  <line x1={p.x + k} y1={p.y + 8} x2={p.x + k} y2={p.y + (k % 5 === 0 ? 10 : 9.2)} />
                  <line x1={p.x + 8} y1={p.y + k} x2={p.x + (k % 5 === 0 ? 10 : 9.2)} y2={p.y + k} />
                  {k % 5 === 0 && (
                    <text x={p.x + k} y={p.y + 12.4} stroke="none" fill="#000">
                      {k > 0 ? `+${k}` : k}
                    </text>
                  )}
                  {k % 2 === 0 && (
                    <>
                      <text x={p.x + 10.8} y={p.y + k + 0.8} stroke="none" fill="#000" textAnchor="start">
                        {-k > 0 ? `+${-k}` : -k}
                      </text>
                    </>
                  )}
                </g>
              ))}
              <text x={p.x} y={p.y + 15.5} stroke="none" fill="#555" fontSize={1.8}>x (mm)</text>
              <text x={p.x + 14} y={p.y - 6} stroke="none" fill="#555" fontSize={1.8}>y (mm)</text>
            </g>
          ))}
          <text x={PAGE.w / 2} y={PAGE.h - 20} fontSize={3} textAnchor="middle">
            Imprimez ces deux pages en recto-verso, bord long, échelle 100 %. Regardez le recto par transparence :
          </text>
          <text x={PAGE.w / 2} y={PAGE.h - 15.5} fontSize={3} textAnchor="middle">
            la graduation sur laquelle tombe la croix du verso est la correction x (horizontale) et y (verticale) à saisir.
          </text>
          <text x={PAGE.w / 2} y={PAGE.h - 11} fontSize={3} textAnchor="middle">
            Correction actuelle : x = {dx} mm, y = {dy} mm.
          </text>
        </svg>
      </SheetFrame>
      <SheetFrame label="CALIBRATION — verso" total={2} number={2}>
        <div className="sheet-grid" style={{ transform: `translate(${mm(dx)}, ${mm(dy)})` }}>
          <svg className="crop-marks" viewBox={`0 0 ${PAGE.w} ${PAGE.h}`} width={mm(PAGE.w)} height={mm(PAGE.h)}>
            {pts.map((p, i) => (
              <g key={i} stroke="#000" strokeWidth={0.25}>
                <line x1={PAGE.w - p.x - 14} y1={p.y} x2={PAGE.w - p.x + 14} y2={p.y} />
                <line x1={PAGE.w - p.x} y1={p.y - 14} x2={PAGE.w - p.x} y2={p.y + 14} />
              </g>
            ))}
          </svg>
        </div>
      </SheetFrame>
    </>
  );
}
