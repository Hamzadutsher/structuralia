import { printHtml, escapeHtml } from './pdf';
import { formatDate } from './format';
import { LETTERHEAD_LOGO } from './letterhead';
import { COMPANY, COMPANY_LEGAL_FOOTER, COMPANY_CONTACT_FOOTER } from './company';

/**
 * Génération des documents de contrôle du bureau d'études (phase suivi de chantier) :
 * réceptions de coffrage / ferraillage, PV de réserves, rapport de synthèse,
 * attestation de conformité ou de stabilité. Sortie PDF imprimable.
 */

export type PvType =
  | 'RECEPTION_COFFRAGE'
  | 'RECEPTION_FERRAILLAGE'
  | 'BON_COULAGE'
  | 'RESERVES'
  | 'SYNTHESE'
  | 'ATTESTATION';

export const PV_LABELS: Record<PvType, string> = {
  RECEPTION_COFFRAGE: 'PV de réception de coffrage',
  RECEPTION_FERRAILLAGE: 'PV de réception de ferraillage',
  BON_COULAGE: 'Bon de coulage',
  RESERVES: 'PV de réserves',
  SYNTHESE: 'Rapport de synthèse',
  ATTESTATION: 'Attestation de conformité / stabilité',
};

export type ControleStatut = 'CONFORME' | 'NON_CONFORME' | 'SANS_OBJET';
export interface ChecklistItem {
  point: string;
  statut: ControleStatut;
  observation?: string;
}

export interface ReserveItem {
  localisation: string;
  description: string;
  gravite: 'MINEURE' | 'MAJEURE';
  delai?: string;
}

export interface PvData {
  type: PvType;
  reference: string;
  chantierNom: string;
  chantierRef?: string;
  clientNom?: string;
  ville?: string;
  ouvrage?: string;
  date: string;
  controleur: string;
  // Réceptions coffrage / ferraillage
  items?: ChecklistItem[];
  decision?: 'ACCORDEE' | 'REFUSEE' | 'SOUS_RESERVES';
  observations?: string;
  // Réserves
  reserves?: ReserveItem[];
  // Synthèse
  periode?: string;
  intervenants?: string;
  points?: string[];
  conclusion?: string;
  // Attestation
  objet?: 'CONFORMITE' | 'STABILITE';
  designation?: string;
  references?: string;
  texte?: string;
  // Bon de coulage
  entreprise?: string;
  situation?: string;
  elements?: string;
  dosage?: string;
  volume?: string;
  plan?: string;
  heure?: string;
}

/** Points de contrôle par défaut — réception de coffrage. */
export const CHECKLIST_COFFRAGE: string[] = [
  'Implantation et niveaux conformes aux plans',
  'Dimensions et géométrie du coffrage',
  'Stabilité, étaiement et contreventement',
  'Étanchéité des joints du coffrage',
  'Propreté du fond de coffrage (absence de débris)',
  'Réservations, inserts et tiges d’ancrage en place',
  'Dispositifs de calage / enrobage prévus',
  'Produit de décoffrage appliqué',
];

/** Points de contrôle par défaut — réception de ferraillage. */
export const CHECKLIST_FERRAILLAGE: string[] = [
  'Nuance et diamètres des aciers conformes aux plans',
  'Nombre et espacement des barres',
  'Longueurs de recouvrement et d’ancrage',
  'Enrobage respecté (cales en place)',
  'Ligatures et stabilité de la cage d’armatures',
  'Aciers en attente positionnés',
  'Propreté des aciers (absence de rouille/terre)',
  'Renforts aux angles et zones singulières',
];

export function defaultChecklist(type: PvType): ChecklistItem[] {
  const src = type === 'RECEPTION_COFFRAGE' ? CHECKLIST_COFFRAGE : CHECKLIST_FERRAILLAGE;
  return src.map((point) => ({ point, statut: 'CONFORME' as ControleStatut, observation: '' }));
}

// --- Rendu HTML -------------------------------------------------------------

const STATUT_LABEL: Record<ControleStatut, string> = {
  CONFORME: 'Conforme',
  NON_CONFORME: 'Non conforme',
  SANS_OBJET: 'Sans objet',
};
const STATUT_COLOR: Record<ControleStatut, string> = {
  CONFORME: '#16a34a',
  NON_CONFORME: '#dc2626',
  SANS_OBJET: '#64757e',
};
const DECISION_LABEL: Record<NonNullable<PvData['decision']>, string> = {
  ACCORDEE: 'Bétonnage AUTORISÉ',
  REFUSEE: 'Bétonnage REFUSÉ',
  SOUS_RESERVES: 'Autorisé SOUS RÉSERVES',
};
const DECISION_COLOR: Record<NonNullable<PvData['decision']>, string> = {
  ACCORDEE: '#16a34a',
  REFUSEE: '#dc2626',
  SOUS_RESERVES: '#d97706',
};

function header(d: PvData): string {
  return `
  <div class="head">
    <div class="brand">
      <img class="logo-img" src="${LETTERHEAD_LOGO}" alt="STRUCTURALIA" />
      <div><small>${escapeHtml(COMPANY.activite.toUpperCase())}</small></div>
    </div>
    <div class="doc-title">
      <h1>${escapeHtml(PV_LABELS[d.type].toUpperCase())}</h1>
      <div class="ref">${escapeHtml(d.reference)}</div>
    </div>
  </div>
  <table class="meta">
    <tr>
      <td><label>Chantier</label>${escapeHtml(d.chantierNom)}${d.chantierRef ? ` (${escapeHtml(d.chantierRef)})` : ''}</td>
      <td><label>Client</label>${escapeHtml(d.clientNom ?? '—')}</td>
    </tr>
    <tr>
      <td><label>Ouvrage / zone</label>${escapeHtml(d.ouvrage ?? '—')}</td>
      <td><label>Localité</label>${escapeHtml(d.ville ?? '—')}</td>
    </tr>
    <tr>
      <td><label>Date du contrôle</label>${formatDate(d.date)}</td>
      <td><label>Contrôleur</label>${escapeHtml(d.controleur ?? '—')}</td>
    </tr>
  </table>`;
}

function bodyReception(d: PvData): string {
  const rows = (d.items ?? [])
    .map(
      (it) => `<tr>
        <td>${escapeHtml(it.point)}</td>
        <td style="color:${STATUT_COLOR[it.statut]};font-weight:700;white-space:nowrap">${STATUT_LABEL[it.statut]}</td>
        <td>${escapeHtml(it.observation ?? '')}</td>
      </tr>`,
    )
    .join('');
  const dec = d.decision ?? 'ACCORDEE';
  return `
  <table class="grid">
    <thead><tr><th>Point de contrôle</th><th style="width:130px">Résultat</th><th style="width:34%">Observation</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  ${d.observations ? `<div class="notes"><b>Observations générales :</b><br>${escapeHtml(d.observations)}</div>` : ''}
  <div class="decision" style="border-color:${DECISION_COLOR[dec]};color:${DECISION_COLOR[dec]}">
    Décision : ${DECISION_LABEL[dec]}
  </div>`;
}

function bodyBonCoulage(d: PvData): string {
  const dec = d.decision ?? 'ACCORDEE';
  return `
  <table class="meta">
    <tr>
      <td><label>Entreprise</label>${escapeHtml(d.entreprise ?? '—')}</td>
      <td><label>Situation</label>${escapeHtml(d.situation ?? '—')}</td>
    </tr>
    <tr>
      <td><label>Date de la réception</label>${formatDate(d.date)}${d.heure ? ` à ${escapeHtml(d.heure)}` : ''}</td>
      <td><label>N° de plan</label>${escapeHtml(d.plan ?? '—')}</td>
    </tr>
    <tr>
      <td><label>Dosage / classe du béton</label>${escapeHtml(d.dosage ?? '—')}</td>
      <td><label>Volume de béton</label>${escapeHtml(d.volume ?? '—')}</td>
    </tr>
  </table>
  <p class="intro">Il a été procédé ce jour à la réception du <b>coffrage et ferraillage</b> de ${escapeHtml(d.elements || d.ouvrage || '…')}, par le bureau d'études STRUCTURALIA.</p>
  <p>Le coffrage et le ferraillage sont <b>conformes aux plans de béton armé</b>.</p>
  <div class="decision" style="border-color:${DECISION_COLOR[dec]};color:${DECISION_COLOR[dec]}">${DECISION_LABEL[dec]}</div>
  <div class="notes"><b>N.B. :</b> le béton doit être convenablement vibré et respecter le dosage prescrit${d.dosage ? ` (${escapeHtml(d.dosage)})` : ''}.</div>`;
}

function bodyReserves(d: PvData): string {
  const rows = (d.reserves ?? [])
    .map(
      (r, i) => `<tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(r.localisation)}</td>
        <td>${escapeHtml(r.description)}</td>
        <td style="color:${r.gravite === 'MAJEURE' ? '#dc2626' : '#d97706'};font-weight:700">${r.gravite === 'MAJEURE' ? 'Majeure' : 'Mineure'}</td>
        <td>${escapeHtml(r.delai ?? '—')}</td>
      </tr>`,
    )
    .join('');
  return `
  <p class="intro">Lors de la visite de contrôle, les réserves suivantes ont été relevées et doivent être levées dans les délais indiqués :</p>
  <table class="grid">
    <thead><tr><th style="width:34px">N°</th><th style="width:22%">Localisation</th><th>Description de la réserve</th><th style="width:90px">Gravité</th><th style="width:120px">Délai de levée</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#64757e">Aucune réserve.</td></tr>'}</tbody>
  </table>`;
}

function bodySynthese(d: PvData): string {
  const points = (d.points ?? []).filter(Boolean).map((p) => `<li>${escapeHtml(p)}</li>`).join('');
  return `
  <table class="meta">
    <tr><td><label>Période</label>${escapeHtml(d.periode ?? '—')}</td><td><label>Intervenants</label>${escapeHtml(d.intervenants ?? '—')}</td></tr>
  </table>
  <h2>Points traités et avancement</h2>
  <ul class="points">${points || '<li>—</li>'}</ul>
  ${d.observations ? `<h2>Observations</h2><p>${escapeHtml(d.observations)}</p>` : ''}
  ${d.conclusion ? `<div class="notes"><b>Conclusion :</b><br>${escapeHtml(d.conclusion)}</div>` : ''}`;
}

function bodyAttestation(d: PvData): string {
  const objet = d.objet === 'STABILITE' ? 'la stabilité' : 'la conformité';
  const defaut = `Je soussigné, ${d.controleur || '—'}, agissant pour le compte du bureau d'études STRUCTURALIA, atteste par la présente ${objet} des travaux de ${d.designation || "l'ouvrage désigné ci-dessus"} exécutés sur le chantier « ${d.chantierNom} », au regard des plans d'exécution, des règles de l'art et de la réglementation en vigueur${d.references ? ` (${d.references})` : ''}.`;
  return `
  <p class="intro"><b>Objet :</b> Attestation de ${objet === 'la stabilité' ? 'stabilité' : 'conformité'}${d.designation ? ` — ${escapeHtml(d.designation)}` : ''}</p>
  <div class="attest">${escapeHtml(d.texte && d.texte.trim() ? d.texte : defaut)}</div>
  ${d.references ? `<p class="refs"><b>Références réglementaires :</b> ${escapeHtml(d.references)}</p>` : ''}`;
}

function body(d: PvData): string {
  switch (d.type) {
    case 'RECEPTION_COFFRAGE':
    case 'RECEPTION_FERRAILLAGE':
      return bodyReception(d);
    case 'BON_COULAGE':
      return bodyBonCoulage(d);
    case 'RESERVES':
      return bodyReserves(d);
    case 'SYNTHESE':
      return bodySynthese(d);
    case 'ATTESTATION':
      return bodyAttestation(d);
  }
}

function buildHtml(d: PvData): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>${escapeHtml(PV_LABELS[d.type])} ${escapeHtml(d.reference)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e2a30; margin: 0; padding: 42px 48px; font-size: 12.5px; line-height: 1.55; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #14b8a6; padding-bottom: 18px; margin-bottom: 20px; }
  .brand { display: flex; gap: 12px; align-items: center; }
  .logo-img { height: 44px; width: auto; display: block; margin-bottom: 3px; }
  .brand small { color: #64757e; display: block; font-size: 8.5px; font-weight: 700; max-width: 320px; }
  .doc-title { text-align: right; max-width: 300px; }
  .doc-title h1 { margin: 0; color: #0f766e; font-size: 17px; letter-spacing: 1px; }
  .doc-title .ref { font-size: 14px; font-weight: 700; margin-top: 4px; }
  table.meta { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
  table.meta td { background: #f4f7f9; border: 3px solid #fff; border-radius: 8px; padding: 9px 12px; width: 50%; vertical-align: top; }
  table.meta label { display: block; text-transform: uppercase; font-size: 9.5px; letter-spacing: .8px; color: #93a2ab; font-weight: 700; margin-bottom: 2px; }
  table.grid { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  table.grid th { background: #0f766e; color: #fff; text-align: left; padding: 8px 10px; font-size: 10.5px; text-transform: uppercase; letter-spacing: .4px; }
  table.grid td { padding: 8px 10px; border-bottom: 1px solid #e4e9ec; vertical-align: top; }
  h2 { font-size: 13px; color: #0f766e; margin: 18px 0 8px; }
  ul.points { margin: 0 0 8px 18px; }
  ul.points li { margin-bottom: 4px; }
  .intro { margin-bottom: 12px; }
  .notes { margin-top: 14px; padding: 12px 14px; background: #f0fdfa; border-left: 3px solid #14b8a6; border-radius: 6px; color: #115e59; }
  .decision { margin-top: 18px; padding: 12px 16px; border: 2px solid; border-radius: 8px; font-weight: 800; font-size: 14px; text-align: center; letter-spacing: .5px; }
  .attest { margin: 8px 0 16px; padding: 16px 18px; background: #f8fafb; border: 1px solid #e4e9ec; border-radius: 8px; text-align: justify; }
  .refs { color: #64757e; }
  .sign { margin-top: 42px; display: flex; justify-content: space-between; }
  .sign div { width: 45%; }
  .sign label { font-size: 11px; color: #64757e; }
  .sign .line { margin-top: 48px; border-top: 1px solid #93a2ab; padding-top: 4px; font-size: 11px; color: #64757e; }
  .foot { margin-top: 30px; text-align: center; color: #93a2ab; font-size: 10.5px; border-top: 1px solid #e4e9ec; padding-top: 12px; }
  @media print { body { padding: 20px 24px; } }
</style></head>
<body>
  ${header(d)}
  ${body(d)}
  <div class="sign">
    <div><label>Pour l'entreprise / le client</label><div class="line">Nom, date et signature</div></div>
    <div><label>Le contrôleur — STRUCTURALIA</label><div class="line">${escapeHtml(d.controleur ?? '')}</div></div>
  </div>
  <div class="foot">${escapeHtml(PV_LABELS[d.type])} · ${escapeHtml(d.reference)} · établi le ${formatDate(d.date)}<br>${escapeHtml(COMPANY_LEGAL_FOOTER)}<br>${escapeHtml(COMPANY_CONTACT_FOOTER)}</div>
</body></html>`;
}

export function exportPv(d: PvData) {
  printHtml(buildHtml(d));
}
