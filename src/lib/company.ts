/**
 * Identité de l'entreprise STRUCTURALIA (bureau d'études techniques),
 * telle qu'elle figure sur les devis, factures et contrats officiels.
 * Centralisée ici pour tous les documents générés.
 */
export const COMPANY = {
  nom: 'STRUCTURALIA',
  activite: "Bureau d'Études Techniques Pluridisciplinaire",
  specialites:
    'Études techniques (Béton Armé TCE & CM) · VRD · CFO · CFA · Lots techniques · Coordination & pilotage des travaux · Métrés & ordonnancement · Conseil & assistance',
  adresse: '30 Bd Rahal El Maskini, Étg 2, Apt 5, Casablanca',
  ice: '003745094000015',
  rc: '681031 Casablanca',
  if: '66990674',
  email: 'structuralia.bci@gmail.com',
  fixe: '05222-04023',
  mobile: '+212648788848',
  tvaDefaut: 20,
} as const;

/** Ligne de pied de page réglementaire (identité fiscale). */
export const COMPANY_LEGAL_FOOTER = `Siège : ${COMPANY.adresse} · ICE ${COMPANY.ice} · RC ${COMPANY.rc} · IF ${COMPANY.if}`;
export const COMPANY_CONTACT_FOOTER = `Email : ${COMPANY.email} · Fixe : ${COMPANY.fixe} · Mobile : ${COMPANY.mobile}`;
