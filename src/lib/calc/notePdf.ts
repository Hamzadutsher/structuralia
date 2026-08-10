/* =========================================================================
   Notes de calcul imprimables (PDF via impression navigateur) — Poteaux BA.
   Squelette de marque STRUCTURALIA commun ; chaque module fournit ses
   hypothèses, ses étapes et son verdict. Sans dépendance externe.
   ========================================================================= */
import { printHtml, escapeHtml } from '@/lib/pdf';
import { COMPANY, COMPANY_LEGAL_FOOTER, COMPANY_CONTACT_FOOTER } from '@/lib/company';
import { formatDate } from '@/lib/format';
import { specPoteau, type PoteauInput, type PoteauResult, type Etape } from './poteau';
import { specPoteauFC, type PoteauFCInput, type PoteauFCResult } from './poteauFC';
import { specPoutre, type PoutreInput, type PoutreResult } from './poutre';
import { planSemelle, type SemelleInput, type SemelleResult } from './semelle';
import { specFilante, type FilanteInput, type FilanteResult } from './semelleFilante';
import { planDalle, type DalleInput, type DalleResult } from './dalle';
import {
  elevationPoutreContinue,
  type PoutreContinueInput,
  type PoutreContinueResult,
} from './poutreContinue';
import { buildCoupeSvg, buildSemellePlanSvg, buildDallePlanSvg, buildPoutreElevationSvg } from './coupe';
import { buildSismiqueSvg, type SismiqueInput, type SismiqueResult } from './sismique';
import type { DescenteInput, DescenteResult } from './descente';
import { buildEscalierSvg, type EscalierInput, type EscalierResult } from './escalier';

export interface NoteMeta {
  /** Repère de l'élément (ex. « P1 — RDC »). */
  repere?: string;
  /** Nom du projet / chantier. */
  projet?: string;
  /** Nom de l'ingénieur / rédacteur. */
  ingenieur?: string;
}

interface NoteContent {
  sousTitreDoc: string; // ex. « Poteau BA — compression centrée »
  hypotheses: Array<[string, string]>;
  etapes: Etape[];
  svg: string;
  verdict: { ok: boolean; texte: string };
  erreurs: string[];
  avertissements: string[];
  meta: NoteMeta;
}

const CSS = `
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e2a30; margin: 0; padding: 34px 40px; font-size: 12px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #14b8a6; padding-bottom: 14px; margin-bottom: 16px; gap: 20px; }
  .brand { display: flex; gap: 12px; align-items: flex-start; max-width: 62%; }
  .logo { width: 44px; height: 44px; border-radius: 10px; background: #14b8a6; color: #fff; display: grid; place-items: center; font-weight: 800; font-size: 22px; flex-shrink: 0; }
  .brand b { font-size: 19px; letter-spacing: 1px; color: #0f766e; }
  .brand .act { font-size: 10px; color: #1e2a30; font-weight: 600; margin-top: 2px; }
  .doc-title { text-align: right; flex-shrink: 0; }
  .doc-title h1 { margin: 0; color: #0f766e; font-size: 18px; letter-spacing: 1px; }
  .doc-title .ref { font-size: 12px; font-weight: 700; margin-top: 4px; }
  .doc-title .date { font-size: 10.5px; color: #64757e; margin-top: 2px; }
  h2 { font-size: 12.5px; color: #0f766e; text-transform: uppercase; letter-spacing: .5px; margin: 18px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e4e9ec; }
  .cols { display: flex; gap: 18px; align-items: flex-start; }
  .cols .left { flex: 1; }
  .cols .right { width: 300px; flex-shrink: 0; text-align: center; }
  table.hyp { width: 100%; border-collapse: collapse; }
  table.hyp td { padding: 5px 8px; border-bottom: 1px solid #eef2f4; vertical-align: top; }
  table.hyp .hk { color: #64757e; width: 42%; font-weight: 600; }
  table.hyp .hv { font-weight: 600; }
  .coupe-box { border: 1px solid #e4e9ec; border-radius: 10px; padding: 10px; background: #ffffff; display: inline-block; }
  .coupe-cap { font-size: 10px; color: #64757e; margin-top: 6px; }
  table.note { width: 100%; border-collapse: collapse; margin-top: 4px; }
  table.note th { background: #0f766e; color: #fff; text-align: left; padding: 7px 9px; font-size: 9.5px; text-transform: uppercase; letter-spacing: .4px; }
  table.note td { padding: 6px 9px; border-bottom: 1px solid #e4e9ec; }
  table.note .sym { font-weight: 700; color: #0f766e; width: 64px; }
  table.note .formule { font-style: italic; color: #64757e; }
  table.note .val { text-align: right; font-weight: 700; white-space: nowrap; }
  .verdict { margin-top: 14px; padding: 10px 14px; border-radius: 8px; font-weight: 700; font-size: 12px; }
  .verdict.ok { background: #dcfce7; color: #166534; }
  .verdict.ko { background: #fee2e2; color: #991b1b; }
  .msg { margin-top: 8px; padding: 8px 12px; border-radius: 6px; font-size: 11px; }
  .msg.err { background: #fee2e2; color: #991b1b; }
  .msg.warn { background: #fef3c7; color: #92580a; }
  .foot { margin-top: 28px; text-align: center; color: #93a2ab; font-size: 9px; border-top: 1px solid #e4e9ec; padding-top: 10px; line-height: 1.6; }
  .sign { margin-top: 22px; display: flex; justify-content: flex-end; }
  .sign .box { width: 240px; text-align: center; font-size: 10.5px; color: #64757e; }
  .sign .line { border-top: 1px solid #93a2ab; margin-top: 40px; padding-top: 5px; }
  @media print { body { padding: 16px 20px; } h2 { page-break-after: avoid; } table.note tr { page-break-inside: avoid; } }
`;

function renderNote(c: NoteContent): void {
  const hypRows = c.hypotheses
    .map(([k, v]) => `<tr><td class="hk">${escapeHtml(k)}</td><td class="hv">${escapeHtml(v)}</td></tr>`)
    .join('');

  const etapeRows = c.etapes
    .map(
      (e) => `<tr>
        <td class="sym">${escapeHtml(e.sym)}</td>
        <td>${escapeHtml(e.label)}</td>
        <td class="formule">${escapeHtml(e.formule ?? '')}</td>
        <td class="val">${escapeHtml(e.valeur)}</td>
      </tr>`,
    )
    .join('');

  const messages = [
    ...c.erreurs.map((m) => `<div class="msg err">⚠︎ ${escapeHtml(m)}</div>`),
    ...c.avertissements.map((m) => `<div class="msg warn">⚠︎ ${escapeHtml(m)}</div>`),
  ].join('');

  const verdict = c.verdict.ok
    ? `<div class="verdict ok">✓ ${escapeHtml(c.verdict.texte)}</div>`
    : `<div class="verdict ko">✗ ${escapeHtml(c.verdict.texte)}</div>`;

  const sousTitre = [c.meta.repere, c.meta.projet]
    .filter((x): x is string => Boolean(x))
    .map(escapeHtml)
    .join(' · ');

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Note de calcul — Poteau ${escapeHtml(c.meta.repere ?? '')}</title>
<style>${CSS}</style></head><body>
  <div class="head">
    <div class="brand">
      <div class="logo">S</div>
      <div>
        <b>${escapeHtml(COMPANY.nom)}</b>
        <div class="act">${escapeHtml(COMPANY.activite)}</div>
      </div>
    </div>
    <div class="doc-title">
      <h1>NOTE DE CALCUL</h1>
      <div class="ref">${escapeHtml(c.sousTitreDoc)}</div>
      ${sousTitre ? `<div class="ref">${sousTitre}</div>` : ''}
      <div class="date">Date : ${formatDate(new Date().toISOString())}${c.meta.ingenieur ? ` · Rédacteur : ${escapeHtml(c.meta.ingenieur)}` : ''}</div>
    </div>
  </div>

  <div class="cols">
    <div class="left">
      <h2>1. Hypothèses</h2>
      <table class="hyp"><tbody>${hypRows}</tbody></table>
    </div>
    ${
      c.svg
        ? `<div class="right">
      <h2>Schéma</h2>
      <div class="coupe-box">${c.svg}</div>
      <div class="coupe-cap">Schéma indicatif (non coté à l'échelle)</div>
    </div>`
        : ''
    }
  </div>

  <h2>2. Détail du calcul</h2>
  <table class="note">
    <thead><tr><th>Symb.</th><th>Désignation</th><th>Formule</th><th style="text-align:right">Valeur</th></tr></thead>
    <tbody>${etapeRows}</tbody>
  </table>

  <h2>3. Conclusion</h2>
  ${verdict}
  ${messages}

  <div class="sign">
    <div class="box"><div class="line">Ingénieur BET — cachet & signature</div></div>
  </div>

  <div class="foot">${escapeHtml(COMPANY_LEGAL_FOOTER)}<br>${escapeHtml(COMPANY_CONTACT_FOOTER)}</div>
</body></html>`;

  printHtml(html);
}

const LIAISON: Record<number, string> = {
  0.7: 'Poteau continu de bâtiment (k = 0,7)',
  1: 'Articulé — articulé (k = 1,0)',
  0.5: 'Encastré — encastré (k = 0,5)',
  2: 'Encastré — libre / console (k = 2,0)',
};

/* -------------------------------------------------- Compression centrée */

export function exportPoteauNotePdf(inp: PoteauInput, res: PoteauResult, meta: NoteMeta = {}): void {
  const geom =
    inp.forme === 'rect' ? `Section rectangulaire ${inp.a} × ${inp.b} cm` : `Section circulaire Ø ${inp.D} cm`;
  const age: Record<string, string> = {
    apres90j: 'Après 90 jours',
    avant90j: 'Avant 90 jours',
    avant28j: 'Avant 28 jours',
  };
  renderNote({
    sousTitreDoc: 'Poteau BA — compression centrée',
    hypotheses: [
      ['Règlement', 'BAEL 91 révisé 99 — compression centrée (Art. B.8.4)'],
      ['Géométrie', geom],
      ['Longueur libre l₀', `${inp.l0} m`],
      ['Conditions de liaison', LIAISON[inp.k] ?? `k = ${inp.k}`],
      ['Effort normal ultime Nu', `${inp.Nu} kN`],
      ['Béton', `fc28 = ${inp.fc28} MPa (γb = ${inp.gammaB})`],
      ['Acier', `FeE${inp.fe} — fe = ${inp.fe} MPa (γs = ${inp.gammaS})`],
      ['Application des charges', age[inp.age] ?? inp.age],
      ['Aciers longitudinaux', `HA${inp.phiL} · enrobage ${inp.enrob} cm`],
    ],
    etapes: res.etapes,
    svg: buildCoupeSvg(specPoteau(inp, res), 'print'),
    verdict: {
      ok: res.ok,
      texte: res.ok
        ? `Dimensionnement vérifié — ${res.nBarres} HA${inp.phiL} (${res.AsReel.toFixed(2)} cm²), cadres Ø${res.phiT} espacés de ${res.stCourant.toFixed(0)} cm. Nu,lim = ${res.NuLim.toFixed(0)} kN ≥ Nu = ${inp.Nu} kN.`
        : 'Dimensionnement à revoir (voir observations ci-dessous).',
    },
    erreurs: res.erreurs,
    avertissements: res.avertissements,
    meta,
  });
}

/* --------------------------------------------------------------- Poutre */

const FISSURATION: Record<string, string> = {
  PP: 'Peu préjudiciable',
  P: 'Préjudiciable',
  TP: 'Très préjudiciable',
};

export function exportPoutreNotePdf(inp: PoutreInput, res: PoutreResult, meta: NoteMeta = {}): void {
  renderNote({
    sousTitreDoc: 'Poutre BA — flexion simple + effort tranchant',
    hypotheses: [
      ['Règlement', 'BAEL 91 révisé 99 — flexion simple (A.4) & effort tranchant (A.5)'],
      ['Géométrie', `Section rectangulaire ${inp.b} × ${inp.h} cm · enrobage ${inp.enrob} cm`],
      ['Moment ultime Mu', `${inp.Mu} kN·m`],
      ['Effort tranchant Vu', `${inp.Vu} kN`],
      ['Fissuration', FISSURATION[inp.fissuration] ?? inp.fissuration],
      ['Béton', `fc28 = ${inp.fc28} MPa (γb = ${inp.gammaB})`],
      ['Acier', `FeE${inp.fe} — fe = ${inp.fe} MPa (γs = ${inp.gammaS})`],
      ['Aciers', `longitudinaux HA${inp.phiL} · cadres ${inp.nBrins}× Ø${inp.phiT}`],
    ],
    etapes: res.etapes,
    svg: buildCoupeSvg(specPoutre(inp, res), 'print'),
    verdict: {
      ok: res.ok,
      texte: res.ok
        ? `Ferraillage vérifié — ${res.nInf} HA${inp.phiL} en partie basse (${res.AsReel.toFixed(2)} cm²), cadres ${inp.nBrins}× Ø${res.phiT} espacés de ${res.st.toFixed(0)} cm. τu = ${res.tauU.toFixed(2)} ≤ ${res.tauLim.toFixed(2)} MPa.`
        : 'Dimensionnement à revoir (voir observations ci-dessous).',
    },
    erreurs: res.erreurs,
    avertissements: res.avertissements,
    meta,
  });
}

/* --------------------------------------------------------------- Semelle */

export function exportSemelleNotePdf(inp: SemelleInput, res: SemelleResult, meta: NoteMeta = {}): void {
  renderNote({
    sousTitreDoc: 'Semelle isolée — méthode des bielles',
    hypotheses: [
      ['Règlement', 'BAEL 91 révisé 99 — semelle rigide (méthode des bielles)'],
      ['Poteau', `${inp.a} × ${inp.b} cm`],
      ['Effort normal Nu (ELU)', `${inp.Nu} kN`],
      ['Effort normal Nser (ELS)', `${inp.Nser} kN`],
      ['Contrainte admissible du sol', `σsol = ${inp.sigmaSol} MPa`],
      ['Béton', `fc28 = ${inp.fc28} MPa (γb = ${inp.gammaB})`],
      ['Acier', `FeE${inp.fe} — fe = ${inp.fe} MPa (γs = ${inp.gammaS})`],
      ['Aciers', `HA${inp.phiL} · enrobage ${inp.enrob} cm`],
    ],
    etapes: res.etapes,
    svg: buildSemellePlanSvg(planSemelle(inp, res), 'print'),
    verdict: {
      ok: res.ok,
      texte: res.ok
        ? `Semelle ${res.A} × ${res.B} × ${res.h} cm — nappe //A ${res.nA} HA${inp.phiL}, nappe //B ${res.nB} HA${inp.phiL}. σsol = ${res.sigmaSolCalc.toFixed(3)} ≤ ${inp.sigmaSol} MPa. Ancrage : ${res.crochets ? 'crochets' : 'droit'}.`
        : 'Dimensionnement à revoir (voir observations ci-dessous).',
    },
    erreurs: res.erreurs,
    avertissements: res.avertissements,
    meta,
  });
}

/* -------------------------------------------------------- Semelle filante */

export function exportFilanteNotePdf(inp: FilanteInput, res: FilanteResult, meta: NoteMeta = {}): void {
  renderNote({
    sousTitreDoc: 'Semelle filante — méthode des bielles',
    hypotheses: [
      ['Règlement', 'BAEL 91 révisé 99 — semelle filante rigide (par ml)'],
      ['Mur / voile porté', `épaisseur ${inp.bMur} cm`],
      ['Effort Nu (ELU)', `${inp.Nu} kN/ml`],
      ['Effort Nser (ELS)', `${inp.Nser} kN/ml`],
      ['Contrainte de sol', `σsol = ${inp.sigmaSol} MPa`],
      ['Béton', `fc28 = ${inp.fc28} MPa (γb = ${inp.gammaB})`],
      ['Acier', `FeE${inp.fe} — transversaux HA${inp.phiL}, filants HA${inp.phiT}`],
    ],
    etapes: res.etapes,
    svg: buildCoupeSvg(specFilante(inp, res), 'print'),
    verdict: {
      ok: res.ok,
      texte: `Semelle ${res.B} × ${res.h} cm — transversaux HA${inp.phiL} e=${res.esp.toFixed(0)} (${res.As.toFixed(2)} cm²/ml). σsol = ${res.sigmaSolCalc.toFixed(3)} ≤ ${inp.sigmaSol} MPa. Ancrage : ${res.crochets ? 'crochets' : 'droit'}.`,
    },
    erreurs: res.erreurs,
    avertissements: res.avertissements,
    meta,
  });
}

/* --------------------------------------------------------------- Escalier */

export function exportEscalierNotePdf(inp: EscalierInput, res: EscalierResult, meta: NoteMeta = {}): void {
  renderNote({
    sousTitreDoc: 'Escalier droit — paillasse BA',
    hypotheses: [
      ['Règlement', 'BAEL 91 révisé 99 — paillasse (dalle inclinée)'],
      ['Portée horizontale L', `${inp.L} m`],
      ['Paillasse', `épaisseur ${inp.ep} cm · enrobage ${inp.enrob} cm`],
      ['Marche', `contremarche ${inp.contremarche} cm · giron ${inp.giron} cm`],
      ['Charges', `G add. = ${inp.Grev} kN/m² · q = ${inp.Q} kN/m²`],
      ['Béton', `fc28 = ${inp.fc28} MPa (γb = ${inp.gammaB})`],
      ['Acier', `FeE${inp.fe} — HA${inp.phi}`],
    ],
    etapes: res.etapes,
    svg: buildEscalierSvg(inp, res, 'print'),
    verdict: {
      ok: res.ok,
      texte: res.ok
        ? `Paillasse ${inp.ep} cm — acier principal ${res.As.toFixed(2)} cm²/m (HA${inp.phi} e=${res.esp.toFixed(0)}), répartition ${res.Ar.toFixed(2)} cm²/m. ${res.nMarches} marches, hauteur ${res.hauteurTotale.toFixed(2)} m.`
        : 'Dimensionnement à revoir (voir observations ci-dessous).',
    },
    erreurs: res.erreurs,
    avertissements: res.avertissements,
    meta,
  });
}

/* ------------------------------------------------------- Descente de charges */

export function exportDescenteNotePdf(inp: DescenteInput, res: DescenteResult, meta: NoteMeta = {}): void {
  const detail: typeof res.etapes = res.niveaux.map((n) => ({
    sym: n.nom,
    label: `G = ${n.Gcum.toFixed(0)} kN · Q = ${n.Qcum.toFixed(0)} kN (cumulés)`,
    formule: `Nser = ${n.Nser.toFixed(0)} kN`,
    valeur: `Nu = ${n.Nu.toFixed(0)} kN`,
  }));
  renderNote({
    sousTitreDoc: 'Descente de charges — poteau',
    hypotheses: [
      ['Méthode', 'Cumul niveau par niveau (surface d’influence)'],
      ['Nombre de niveaux', `${inp.niveaux.length}`],
      ['Combinaison ELU', '1,35·G + 1,5·Q'],
      ['Dégression Q (NF P06-001)', 'non appliquée automatiquement'],
    ],
    etapes: [...detail, ...res.etapes],
    svg: '',
    verdict: {
      ok: res.ok,
      texte: `Charge en pied : Nu = ${res.NuPied.toFixed(0)} kN · Nser = ${res.NserPied.toFixed(0)} kN (→ dimensionnement du poteau et de la semelle).`,
    },
    erreurs: res.erreurs,
    avertissements: res.avertissements,
    meta,
  });
}

/* -------------------------------------------------------------- Sismique */

export function exportSismiqueNotePdf(inp: SismiqueInput, res: SismiqueResult, meta: NoteMeta = {}): void {
  const detail: typeof res.etapes = res.niveaux
    .slice()
    .reverse()
    .map((lvl) => ({
      sym: lvl.nom,
      label: `Niveau h = ${lvl.h.toFixed(2)} m · W = ${lvl.W.toFixed(0)} kN`,
      formule: `F = ${lvl.F.toFixed(1)} kN`,
      valeur: `V étage = ${lvl.V.toFixed(1)} kN`,
    }));
  renderNote({
    sousTitreDoc: 'Analyse sismique — méthode statique équivalente (RPS 2011)',
    hypotheses: [
      ['Règlement', 'RPS 2011 (Maroc) — coefficients saisis par l’ingénieur'],
      ['Accélération de zone A', `${inp.A}`],
      ['Coefficient de site S', `${inp.S}`],
      ['Amplification dynamique D', `${inp.D}`],
      ['Priorité I', `${inp.I}`],
      ['Comportement K', `${inp.K}`],
      ['Période T', `${inp.T} s`],
      ['Poids total W', `${res.Wtot.toFixed(0)} kN`],
    ],
    etapes: [...res.etapes, ...detail],
    svg: buildSismiqueSvg(res, 'print'),
    verdict: {
      ok: res.ok,
      texte: res.ok
        ? `Effort tranchant à la base V = ${res.Vbase.toFixed(1)} kN (${res.niveaux.length} niveaux). Valeurs des coefficients à confirmer selon les tableaux du RPS 2011.`
        : 'Données à revoir (voir observations ci-dessous).',
    },
    erreurs: res.erreurs,
    avertissements: res.avertissements,
    meta,
  });
}

/* ------------------------------------------------------- Poutre continue */

export function exportPoutreContinueNotePdf(
  inp: PoutreContinueInput,
  res: PoutreContinueResult,
  meta: NoteMeta = {},
): void {
  const portees = inp.travees.map((t) => t.L).join(' + ');
  renderNote({
    sousTitreDoc: `Poutre continue ${inp.travees.length} travées — Caquot`,
    hypotheses: [
      ['Règlement', 'BAEL 91 révisé 99 — méthode de Caquot'],
      ['Travées', `${portees} m`],
      ['Section', `${inp.b} × ${inp.h} cm · enrobage ${inp.enrob} cm`],
      ['Charges', inp.travees.map((t, i) => `T${i + 1}: g=${t.g} q=${t.q} kN/m`).join(' · ')],
      ['Béton', `fc28 = ${inp.fc28} MPa (γb = ${inp.gammaB})`],
      ['Acier', `FeE${inp.fe} — fe = ${inp.fe} MPa (γs = ${inp.gammaS}) · HA${inp.phiL}`],
    ],
    etapes: res.etapes,
    svg: buildPoutreElevationSvg(elevationPoutreContinue(inp, res), 'print'),
    verdict: {
      ok: res.ok,
      texte: res.ok
        ? `${res.travees.length} travées ferraillées — voir tableau détaillé des travées et chapeaux ci-dessus.`
        : 'Dimensionnement à revoir (voir observations ci-dessous).',
    },
    erreurs: res.erreurs,
    avertissements: res.avertissements,
    meta,
  });
}

/* ----------------------------------------------------------------- Dalle */

export function exportDalleNotePdf(inp: DalleInput, res: DalleResult, meta: NoteMeta = {}): void {
  renderNote({
    sousTitreDoc: `Dalle pleine — portée sur ${res.sens} sens`,
    hypotheses: [
      ['Règlement', 'BAEL 91 révisé 99 — dalle (Annexe E.3, Pigeaud)'],
      ['Portées', `lx = ${Math.min(inp.lx, inp.ly)} m · ly = ${Math.max(inp.lx, inp.ly)} m`],
      ['Épaisseur', `h = ${inp.h} cm`],
      ['Charges', `g = ${inp.g} kN/m² · q = ${inp.q} kN/m² → pu = ${res.pu.toFixed(2)} kN/m²`],
      ['Appuis', inp.appui === 'isole' ? 'Appuis simples (dalle isolée)' : 'Panneau continu'],
      ['Fissuration', FISSURATION[inp.fissuration] ?? inp.fissuration],
      ['Béton', `fc28 = ${inp.fc28} MPa (γb = ${inp.gammaB})`],
      ['Acier', `FeE${inp.fe} — fe = ${inp.fe} MPa (γs = ${inp.gammaS}) · HA${inp.phi}`],
    ],
    etapes: res.etapes,
    svg: buildDallePlanSvg(planDalle(inp, res), 'print'),
    verdict: {
      ok: res.ok,
      texte: res.ok
        ? `Dalle ${res.sens} sens — // lx : ${res.Asx.toFixed(2)} cm²/m (HA${inp.phi} e=${res.espX.toFixed(0)}) · // ly : ${res.Asy.toFixed(2)} cm²/m (HA${inp.phi} e=${res.espY.toFixed(0)}).`
        : 'Dimensionnement à revoir (voir observations ci-dessous).',
    },
    erreurs: res.erreurs,
    avertissements: res.avertissements,
    meta,
  });
}

/* -------------------------------------------------------- Flexion composée */

export function exportPoteauFCNotePdf(inp: PoteauFCInput, res: PoteauFCResult, meta: NoteMeta = {}): void {
  renderNote({
    sousTitreDoc: 'Poteau BA — flexion composée',
    hypotheses: [
      ['Règlement', 'BAEL 91 révisé 99 — flexion composée (2ᵉ ordre forfaitaire)'],
      ['Géométrie', `Section rectangulaire ${inp.b} × ${inp.h} cm · enrobage ${inp.enrob} cm`],
      ['Longueur libre l₀', `${inp.l0} m`],
      ['Conditions de liaison', LIAISON[inp.k] ?? `k = ${inp.k}`],
      ['Effort normal ultime Nu', `${inp.Nu} kN`],
      ['Moment ultime Mu', `${inp.Mu} kN·m`],
      ['Fluage', `α = Mg/(Mg+Mq) = ${inp.alphaG} · φ = ${inp.phiFluage}`],
      ['Béton', `fc28 = ${inp.fc28} MPa (γb = ${inp.gammaB})`],
      ['Acier', `FeE${inp.fe} — fe = ${inp.fe} MPa (γs = ${inp.gammaS})`],
      ['Aciers longitudinaux', `HA${inp.phiL}`],
    ],
    etapes: res.etapes,
    svg: buildCoupeSvg(specPoteauFC(inp, res), 'print'),
    verdict: {
      ok: res.ok,
      texte: res.ok
        ? `Section ${res.section} — nappe basse ${res.nBas} HA${inp.phiL}, nappe haute ${res.nHaut} HA${inp.phiL} (total ${res.AsReel.toFixed(2)} cm²), cadres Ø${res.phiT} à ${res.stCourant.toFixed(0)} cm.`
        : 'Dimensionnement à revoir (voir observations ci-dessous).',
    },
    erreurs: res.erreurs,
    avertissements: res.avertissements,
    meta,
  });
}
