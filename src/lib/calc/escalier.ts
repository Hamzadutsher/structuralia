/* =========================================================================
   Escalier droit — paillasse en béton armé. BAEL 91 rév. 99.
   La paillasse est calculée comme une dalle inclinée (bande de 1 m) en flexion
   simple. Descente de charges par mètre carré de projection horizontale.
   ========================================================================= */
import { aireBarre, type Etape } from './poteau';

export interface EscalierInput {
  /** Portée horizontale de la paillasse L (m). */
  L: number;
  /** Épaisseur de la paillasse ep (cm). */
  ep: number;
  /** Hauteur de contremarche (cm). */
  contremarche: number;
  /** Giron (cm). */
  giron: number;
  /** Charges permanentes additionnelles (revêtement, garde-corps…) kN/m². */
  Grev: number;
  /** Charge d'exploitation q (kN/m²). */
  Q: number;
  enrob: number; // cm
  phi: number; // mm
  fc28: number;
  fe: number;
  gammaB: number;
  gammaS: number;
}

export interface EscalierResult {
  ok: boolean;
  erreurs: string[];
  avertissements: string[];
  etapes: Etape[];
  alphaDeg: number; // inclinaison (°)
  G: number; // charge permanente totale (kN/m²)
  pu: number; // charge ultime (kN/m²)
  M0: number; // moment isostatique (kN·m/m)
  Mt: number; // moment en travée
  As: number; // acier principal (cm²/m)
  Ar: number; // acier de répartition (cm²/m)
  esp: number; // espacement acier principal (cm)
  nMarches: number;
  hauteurTotale: number; // m
}

function fmt(x: number, d = 2): string {
  if (!isFinite(x)) return '—';
  return x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function calculEscalier(inp: EscalierInput): EscalierResult {
  const erreurs: string[] = [];
  const avertissements: string[] = [];
  const etapes: Etape[] = [];

  const h = inp.contremarche;
  const g = inp.giron;
  const alpha = Math.atan(h / g); // rad
  const cosA = Math.cos(alpha);
  const alphaDeg = (alpha * 180) / Math.PI;

  // Vérification du confort (loi de Blondel : 60 ≤ 2h + g ≤ 66 cm)
  const blondel = 2 * h + g;
  if (blondel < 59 || blondel > 66) {
    avertissements.push(`Loi de Blondel : 2h + g = ${fmt(blondel, 0)} cm hors de [60 ; 66] cm (confort).`);
  }

  const fbu = (0.85 * inp.fc28) / inp.gammaB;
  const fed = inp.fe / inp.gammaS;
  const ft28 = 0.6 + 0.06 * inp.fc28;

  // --- Charges (par m² de projection horizontale) ---------------------------
  const gPaillasse = ((inp.ep / 100) * 25) / cosA; // dalle inclinée
  const gMarches = 25 * (h / 100) / 2; // marches (triangle)
  const G = gPaillasse + gMarches + inp.Grev;
  const pu = 1.35 * G + 1.5 * inp.Q;
  etapes.push({ sym: 'α', label: 'Inclinaison de la paillasse', formule: 'arctan(h/g)', valeur: `${fmt(alphaDeg, 1)}°` });
  etapes.push({ sym: 'g₁', label: 'Poids paillasse', formule: 'ep·25/cosα', valeur: `${fmt(gPaillasse, 2)} kN/m²` });
  etapes.push({ sym: 'g₂', label: 'Poids des marches', formule: '25·h/2', valeur: `${fmt(gMarches, 2)} kN/m²` });
  etapes.push({ sym: 'G', label: 'Charge permanente totale', valeur: `${fmt(G, 2)} kN/m²` });
  etapes.push({ sym: 'pu', label: 'Charge ultime', formule: '1,35·G + 1,5·Q', valeur: `${fmt(pu, 2)} kN/m²` });

  // --- Flexion simple (bande de 1 m) ----------------------------------------
  const M0 = (pu * inp.L * inp.L) / 8; // kN·m/m
  const Mt = 0.85 * M0; // en travée (semi-encastrement usuel)
  const b = 1000;
  const d = (inp.ep - inp.enrob) * 10 - inp.phi / 2; // mm
  const M = Mt * 1e6;
  const mu = M / (b * d * d * fbu);
  const eps_es = fed / 200000;
  const alpha_lu = 3.5 / (3.5 + 1000 * eps_es);
  const mu_lu = 0.8 * alpha_lu * (1 - 0.4 * alpha_lu);
  let As_mm2: number;
  if (mu > mu_lu) {
    erreurs.push(`μ = ${fmt(mu, 3)} > μlu : paillasse trop mince, augmentez l'épaisseur.`);
    As_mm2 = (M / (0.9 * d * fed));
  } else {
    const al = 1.25 * (1 - Math.sqrt(Math.max(0, 1 - 2 * mu)));
    const z = d * (1 - 0.4 * al);
    As_mm2 = M / (z * fed);
  }
  etapes.push({ sym: 'M0', label: 'Moment isostatique', formule: 'pu·L²/8', valeur: `${fmt(M0, 2)} kN·m/m` });
  etapes.push({ sym: 'Mt', label: 'Moment en travée', formule: '0,85·M0', valeur: `${fmt(Mt, 2)} kN·m/m` });

  const Anf = (0.23 * b * d * ft28) / inp.fe;
  const As = Math.max(As_mm2, Anf) / 100; // cm²/m
  const Ar = As / 4; // répartition
  etapes.push({ sym: 'As', label: 'Acier principal', formule: 'Mt/(z·fed)', valeur: `${fmt(As)} cm²/m` });
  etapes.push({ sym: 'Ar', label: 'Acier de répartition', formule: 'As/4', valeur: `${fmt(Ar)} cm²/m` });

  const aB = aireBarre(inp.phi);
  const espMax = Math.min(3 * inp.ep, 33);
  const esp = Math.min(espMax, Math.floor((100 * aB) / As));
  etapes.push({ sym: 'esp', label: 'Espacement acier principal', formule: 'min(3·ep ; 33cm)', valeur: `${fmt(esp, 0)} cm (HA${inp.phi})` });

  const nMarches = Math.max(1, Math.round((inp.L * 100) / g));
  const hauteurTotale = (nMarches * h) / 100;

  return {
    ok: erreurs.length === 0,
    erreurs,
    avertissements,
    etapes,
    alphaDeg,
    G,
    pu,
    M0,
    Mt,
    As,
    Ar,
    esp,
    nMarches,
    hauteurTotale,
  };
}

/** Profil schématique de l'escalier (marches + paillasse + acier principal). */
export function buildEscalierSvg(inp: EscalierInput, res: EscalierResult, mode: 'app' | 'print' = 'app'): string {
  const VW = 360;
  const VH = 220;
  const pad = 26;
  const n = Math.min(res.nMarches, 16);
  const g = inp.giron;
  const h = inp.contremarche;
  const totalRun = n * g;
  const totalRise = n * h;
  const scale = Math.min((VW - 2 * pad) / totalRun, (VH - 2 * pad) / totalRise);
  const x0 = pad;
  const yBase = VH - pad;

  const beton = mode === 'app' ? 'stroke:var(--text-muted);fill:var(--surface-2)' : 'stroke:#64757e;fill:#f8fafb';
  const acier = mode === 'app' ? 'stroke:var(--primary-600)' : 'stroke:#0d9488';
  const txt = mode === 'app' ? 'fill:var(--text-muted)' : 'fill:#64757e';
  const svgA = mode === 'app' ? 'class="coupe coupe--wide"' : 'style="width:100%;max-width:380px;height:auto;display:block"';

  // Ligne des nez de marches (escalier)
  const steps: string[] = [];
  let x = x0;
  let y = yBase;
  let pathSteps = `M ${x} ${y}`;
  for (let i = 0; i < n; i++) {
    x += g * scale;
    pathSteps += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    y -= h * scale;
    pathSteps += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  // Sous-face de la paillasse (parallèle, décalée de ep)
  const dx = inp.ep * scale * Math.sin(Math.atan(h / g));
  const dy = inp.ep * scale * Math.cos(Math.atan(h / g));
  const xTop = x0 + totalRun * scale;
  const yTop = yBase - totalRise * scale;
  const soffit = `M ${x0.toFixed(1)} ${(yBase + 6).toFixed(1)} L ${(x0 + dx).toFixed(1)} ${(yBase + 6 + dy).toFixed(1)} L ${(xTop + dx).toFixed(1)} ${(yTop + 6 + dy).toFixed(1)} L ${xTop.toFixed(1)} ${(yTop + 6).toFixed(1)}`;

  steps.push(`<path d="${pathSteps}" style="${beton};stroke-width:1.6;fill:none"/>`);
  steps.push(`<path d="${soffit}" style="${beton};stroke-width:1.4"/>`);
  // Acier principal (parallèle à la paillasse, dans l'épaisseur)
  const off = (inp.ep * scale) / 2;
  steps.push(`<line x1="${(x0 + off * 0.4).toFixed(1)}" y1="${(yBase + 3).toFixed(1)}" x2="${(xTop + off * 0.4).toFixed(1)}" y2="${(yTop + 3).toFixed(1)}" style="${acier};stroke-width:2"/>`);
  steps.push(`<text x="${VW / 2}" y="${VH - 6}" style="${txt};font-size:10px;text-anchor:middle;font-weight:600">${res.nMarches} marches · ${fmt(res.hauteurTotale, 2)} m · HA${inp.phi} e=${res.esp.toFixed(0)}</text>`);

  return `<svg viewBox="0 0 ${VW} ${VH}" ${svgA} xmlns="http://www.w3.org/2000/svg">${steps.join('')}</svg>`;
}
