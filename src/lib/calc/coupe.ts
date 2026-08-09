/* =========================================================================
   Génération de la coupe transversale d'un poteau (SVG).
   Source unique utilisée à la fois par l'écran (mode 'app', classes CSS)
   et par la note de calcul imprimable (mode 'print', couleurs en dur).
   ========================================================================= */
import type { SectionForme } from './poteau';

export interface CoupeParams {
  forme: SectionForme;
  a: number;
  b: number;
  D: number;
  nBarres: number;
  phiL: number;
  phiT: number;
}

type Mode = 'app' | 'print';

const COLORS = {
  beton: '#f8fafb',
  betonStroke: '#64757e',
  cadre: '#14b8a6',
  bar: '#0f766e',
  barStroke: '#ffffff',
  cote: '#64757e',
  leg: '#0f766e',
};

/** Attributs de style selon le mode (classe CSS en app, style inline en print). */
function attrs(mode: Mode, cls: string, inline: string): string {
  return mode === 'app' ? `class="${cls}"` : `style="${inline}"`;
}

/** Répartit n points sur le pourtour d'un rectangle, en commençant par les angles. */
function perimetrePoints(n: number, x: number, y: number, w: number, h: number) {
  const corners = [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
  if (n <= 4) return corners.slice(0, Math.max(1, n));

  const extra = n - 4;
  const perSide = Math.floor(extra / 4);
  const reste = extra % 4;
  const pts = [...corners];
  const sides = [
    { from: corners[0], to: corners[1] },
    { from: corners[1], to: corners[2] },
    { from: corners[2], to: corners[3] },
    { from: corners[3], to: corners[0] },
  ];
  sides.forEach((s, si) => {
    const cnt = perSide + (si < reste ? 1 : 0);
    for (let j = 1; j <= cnt; j++) {
      const t = j / (cnt + 1);
      pts.push({ x: s.from.x + (s.to.x - s.from.x) * t, y: s.from.y + (s.to.y - s.from.y) * t });
    }
  });
  return pts;
}

/** Construit la coupe transversale du poteau sous forme de chaîne SVG. */
export function buildCoupeSvg(p: CoupeParams, mode: Mode = 'app'): string {
  const W = 260;
  const H = 220;
  const pad = 34;
  const enrob = 3; // cm (position indicative des barres depuis la paroi)
  const rBar = Math.max(3, p.phiL / 4);

  const betonA = attrs(mode, 'coupe__beton', `fill:${COLORS.beton};stroke:${COLORS.betonStroke};stroke-width:1.5`);
  const cadreA = attrs(mode, 'coupe__cadre', `fill:none;stroke:${COLORS.cadre};stroke-width:1.4;stroke-dasharray:4 3`);
  const barA = attrs(mode, 'coupe__bar', `fill:${COLORS.bar};stroke:${COLORS.barStroke};stroke-width:0.8`);
  const coteA = attrs(mode, 'coupe__cote', `fill:${COLORS.cote};font-size:11px;font-weight:600;text-anchor:middle`);
  const legA = attrs(mode, 'coupe__leg', `fill:${COLORS.leg};font-size:11px;font-weight:700;text-anchor:middle`);
  const svgA = mode === 'app' ? 'class="coupe"' : 'style="width:280px;height:auto;display:block"';

  const open = `<svg viewBox="0 0 ${W} ${H}" ${svgA} xmlns="http://www.w3.org/2000/svg">`;

  if (p.forme === 'rect') {
    const { a, b } = p;
    const scale = Math.min((W - 2 * pad) / b, (H - 2 * pad) / a);
    const w = b * scale;
    const h = a * scale;
    const x0 = (W - w) / 2;
    const y0 = (H - h) / 2;
    const m = enrob * scale;
    const pts = perimetrePoints(p.nBarres, x0 + m, y0 + m, w - 2 * m, h - 2 * m);

    return (
      open +
      `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" ${betonA}/>` +
      `<rect x="${x0 + m}" y="${y0 + m}" width="${w - 2 * m}" height="${h - 2 * m}" ${cadreA}/>` +
      pts.map((pt) => `<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="${rBar}" ${barA}/>`).join('') +
      `<text x="${W / 2}" y="${y0 + h + 20}" ${coteA}>b = ${b} cm</text>` +
      `<text x="${x0 - 10}" y="${H / 2}" ${coteA} transform="rotate(-90 ${x0 - 10} ${H / 2})">a = ${a} cm</text>` +
      `<text x="${W / 2}" y="14" ${legA}>${p.nBarres} HA${p.phiL} · cadres Ø${p.phiT}</text>` +
      `</svg>`
    );
  }

  // Circulaire
  const { D } = p;
  const scale = Math.min((W - 2 * pad) / D, (H - 2 * pad) / D);
  const R = (D * scale) / 2;
  const cx = W / 2;
  const cy = H / 2;
  const Rb = R - enrob * scale;
  const pts = Array.from({ length: p.nBarres }, (_, i) => {
    const ang = (2 * Math.PI * i) / p.nBarres - Math.PI / 2;
    return { x: cx + Rb * Math.cos(ang), y: cy + Rb * Math.sin(ang) };
  });

  return (
    open +
    `<circle cx="${cx}" cy="${cy}" r="${R}" ${betonA}/>` +
    `<circle cx="${cx}" cy="${cy}" r="${Rb}" ${cadreA}/>` +
    pts.map((pt) => `<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="${rBar}" ${barA}/>`).join('') +
    `<text x="${cx}" y="${cy + R + 20}" ${coteA}>D = ${D} cm</text>` +
    `<text x="${W / 2}" y="14" ${legA}>${p.nBarres} HA${p.phiL} · cerces Ø${p.phiT}</text>` +
    `</svg>`
  );
}
