import type { AppData } from './types';
import { CATALOG } from './catalog';

/** Jeu de données de démonstration réaliste pour un bureau d'études. */
export function seedData(): AppData {
  const now = '2026-08-07T09:00:00.000Z';
  const mk = (id: string) => ({ id, createdAt: now, updatedAt: now });

  return {
    clients: [
      { ...mk('c1'), nom: 'Mairie de Casablanca', type: 'COLLECTIVITE', contactNom: 'S. Bennani', email: 'contact@casablanca.ma', telephone: '+212522000001', ville: 'Casablanca', codePostal: '20000', siret: '', statut: 'ACTIF', notes: 'Marché-cadre voirie et ouvrages d’art.' },
      { ...mk('c2'), nom: 'Groupe Alami Promotion', type: 'ENTREPRISE', contactNom: 'R. Alami', email: 'r.alami@alami-promo.ma', telephone: '+212661000002', ville: 'Rabat', codePostal: '10000', siret: 'RC 45871', statut: 'ACTIF', notes: 'Promoteur immobilier — résidences R+8.' },
      { ...mk('c3'), nom: 'SCI Les Oliviers', type: 'ENTREPRISE', contactNom: 'H. Tazi', email: 'h.tazi@lesoliviers.ma', telephone: '+212661000003', ville: 'Marrakech', codePostal: '40000', statut: 'ACTIF' },
      { ...mk('c4'), nom: 'M. Karim Idrissi', type: 'PARTICULIER', contactNom: 'K. Idrissi', email: 'k.idrissi@gmail.com', telephone: '+212662000004', ville: 'Fès', codePostal: '30000', statut: 'PROSPECT', notes: 'Villa individuelle — étude structure.' },
      { ...mk('c5'), nom: 'OCP Infrastructure', type: 'ENTREPRISE', contactNom: 'N. Fassi', email: 'n.fassi@ocp.ma', telephone: '+212522000005', ville: 'Khouribga', codePostal: '25000', siret: 'RC 12003', statut: 'ACTIF', notes: 'Bâtiments industriels et charpente métallique.' },
      { ...mk('c6'), nom: 'Résidences Atlas', type: 'ENTREPRISE', contactNom: 'Y. Berrada', email: 'contact@atlas-res.ma', telephone: '+212661000006', ville: 'Tanger', codePostal: '90000', statut: 'INACTIF' },
    ],

    conventions: [
      { ...mk('cv1'), reference: 'CONV-2026-011', objet: 'Mission de maîtrise d’œuvre — voirie urbaine', clientId: 'c1', dateDebut: '2026-01-15', dateFin: '2026-12-31', montant: 480000, statut: 'ACTIVE', notes: 'Tranche ferme + 2 tranches optionnelles.' },
      { ...mk('cv2'), reference: 'CONV-2026-018', objet: 'Étude structure résidence R+8 «Le Parc»', clientId: 'c2', dateDebut: '2026-03-01', dateFin: '2026-09-30', montant: 220000, statut: 'ACTIVE' },
      { ...mk('cv3'), reference: 'CONV-2025-097', objet: 'Assistance technique — hangar industriel', clientId: 'c5', dateDebut: '2025-06-01', dateFin: '2026-05-31', montant: 150000, statut: 'EXPIREE' },
      { ...mk('cv4'), reference: 'CONV-2026-024', objet: 'Diagnostic structure villa', clientId: 'c4', dateDebut: '2026-08-01', dateFin: '2026-10-31', montant: 45000, statut: 'BROUILLON' },
    ],

    devis: [
      { ...mk('d1'), reference: 'DEV-2026-101', objet: 'Note de calcul béton armé — R+8', clientId: 'c2', chantierId: 'ch1', dateEmission: '2026-02-10', dateValidite: '2026-03-12', montantHT: 180000, tauxTVA: 20, montantTTC: 216000, statut: 'ACCEPTE', lignes: [{ designation: 'Étude structure BA', quantite: 1, prixUnitaire: 140000 }, { designation: 'Plans d’exécution', quantite: 1, prixUnitaire: 40000 }] },
      { ...mk('d2'), reference: 'DEV-2026-114', objet: 'Diagnostic structure villa individuelle', clientId: 'c4', chantierId: 'ch4', dateEmission: '2026-07-20', dateValidite: '2026-08-20', montantHT: 38000, tauxTVA: 20, montantTTC: 45600, statut: 'ENVOYE', lignes: [{ designation: 'Visite + relevé', quantite: 1, prixUnitaire: 8000 }, { designation: 'Rapport diagnostic', quantite: 1, prixUnitaire: 30000 }] },
      { ...mk('d3'), reference: 'DEV-2026-108', objet: 'Charpente métallique hangar 2400 m²', clientId: 'c5', chantierId: 'ch2', dateEmission: '2026-05-05', dateValidite: '2026-06-05', montantHT: 96000, tauxTVA: 20, montantTTC: 115200, statut: 'ACCEPTE', lignes: [{ designation: 'Dimensionnement charpente', quantite: 1, prixUnitaire: 96000 }] },
      { ...mk('d4'), reference: 'DEV-2026-120', objet: 'Étude VRD lotissement', clientId: 'c3', chantierId: 'ch5', dateEmission: '2026-07-28', dateValidite: '2026-08-28', montantHT: 62000, tauxTVA: 20, montantTTC: 74400, statut: 'BROUILLON', lignes: [{ designation: 'Étude VRD', quantite: 1, prixUnitaire: 62000 }] },
      { ...mk('d5'), reference: 'DEV-2026-095', objet: 'Mission MOE voirie — tranche 1', clientId: 'c1', chantierId: 'ch3', dateEmission: '2026-01-08', dateValidite: '2026-02-08', montantHT: 160000, tauxTVA: 20, montantTTC: 192000, statut: 'ACCEPTE', lignes: [{ designation: 'MOE tranche ferme', quantite: 1, prixUnitaire: 160000 }] },
    ],

    factures: [
      { ...mk('f1'), reference: 'FAC-2026-051', objet: 'Acompte 40% — étude R+8', clientId: 'c2', chantierId: 'ch1', devisId: 'd1', dateEmission: '2026-03-05', dateEcheance: '2026-04-05', montantHT: 72000, tauxTVA: 20, montantTTC: 86400, montantPaye: 86400, statut: 'PAYEE', lignes: [] },
      { ...mk('f2'), reference: 'FAC-2026-063', objet: 'Situation n°2 — étude R+8', clientId: 'c2', chantierId: 'ch1', devisId: 'd1', dateEmission: '2026-06-10', dateEcheance: '2026-07-10', montantHT: 54000, tauxTVA: 20, montantTTC: 64800, montantPaye: 0, statut: 'EN_RETARD', lignes: [] },
      { ...mk('f3'), reference: 'FAC-2026-070', objet: 'Charpente hangar — acompte', clientId: 'c5', chantierId: 'ch2', devisId: 'd3', dateEmission: '2026-05-20', dateEcheance: '2026-06-20', montantHT: 48000, tauxTVA: 20, montantTTC: 57600, montantPaye: 57600, statut: 'PAYEE', lignes: [] },
      { ...mk('f4'), reference: 'FAC-2026-078', objet: 'MOE voirie — situation 1', clientId: 'c1', chantierId: 'ch3', devisId: 'd5', dateEmission: '2026-07-15', dateEcheance: '2026-08-15', montantHT: 40000, tauxTVA: 20, montantTTC: 48000, montantPaye: 20000, statut: 'PARTIELLE', lignes: [] },
      { ...mk('f5'), reference: 'FAC-2026-081', objet: 'Charpente hangar — solde', clientId: 'c5', chantierId: 'ch2', devisId: 'd3', dateEmission: '2026-07-30', dateEcheance: '2026-08-30', montantHT: 48000, tauxTVA: 20, montantTTC: 57600, montantPaye: 0, statut: 'ENVOYEE', lignes: [] },
    ],

    documents: [
      { ...mk('doc1'), titre: 'Plan de coffrage niveau RDC', categorie: 'PLAN', type: 'pdf', taille: 2_400_000, clientId: 'c2', chantierId: 'ch1', url: '#' },
      { ...mk('doc2'), titre: 'Note de calcul sismique', categorie: 'NOTE_CALCUL', type: 'pdf', taille: 1_100_000, clientId: 'c2', chantierId: 'ch1', url: '#' },
      { ...mk('doc3'), titre: 'Rapport de diagnostic villa', categorie: 'RAPPORT', type: 'docx', taille: 850_000, clientId: 'c4', url: '#' },
      { ...mk('doc4'), titre: 'Convention signée CONV-2026-011', categorie: 'ADMINISTRATIF', type: 'pdf', taille: 620_000, clientId: 'c1', url: '#' },
      { ...mk('doc5'), titre: 'Photos avancement — semaine 28', categorie: 'PHOTO', type: 'zip', taille: 14_800_000, clientId: 'c5', chantierId: 'ch2', url: '#' },
      { ...mk('doc6'), titre: 'Plan de charpente métallique', categorie: 'PLAN', type: 'dwg', taille: 3_600_000, clientId: 'c5', chantierId: 'ch2', url: '#' },
    ],

    chantiers: [
      { ...mk('ch1'), nom: 'Résidence «Le Parc» R+8', reference: 'CH-2026-04', clientId: 'c2', adresse: 'Av. Hassan II', ville: 'Rabat', dateDebut: '2026-03-15', dateFinPrevue: '2026-11-30', budget: 220000, avancement: 55, statut: 'EN_COURS', chefProjet: 'A. Chraibi', description: 'Suivi d’exécution structure béton armé, 8 niveaux + 2 sous-sols.' },
      { ...mk('ch2'), nom: 'Hangar industriel OCP', reference: 'CH-2026-02', clientId: 'c5', adresse: 'Zone industrielle', ville: 'Khouribga', dateDebut: '2026-05-10', dateFinPrevue: '2026-09-15', budget: 150000, avancement: 72, statut: 'EN_COURS', chefProjet: 'M. El Amrani', description: 'Charpente métallique 2400 m², contrôle montage.' },
      { ...mk('ch3'), nom: 'Voirie urbaine — lot 1', reference: 'CH-2026-01', clientId: 'c1', adresse: 'Quartier Sidi Maârouf', ville: 'Casablanca', dateDebut: '2026-02-01', dateFinPrevue: '2026-12-20', budget: 480000, avancement: 38, statut: 'EN_COURS', chefProjet: 'A. Chraibi', description: 'Maîtrise d’œuvre voirie et réseaux divers.' },
      { ...mk('ch4'), nom: 'Villa Idrissi', reference: 'CH-2026-07', clientId: 'c4', ville: 'Fès', dateDebut: '2026-09-01', dateFinPrevue: '2026-10-30', budget: 45000, avancement: 0, statut: 'PLANIFIE', chefProjet: 'S. Ouazzani', description: 'Diagnostic et renforcement structure existante.' },
      { ...mk('ch5'), nom: 'Lotissement Les Oliviers', reference: 'CH-2025-19', clientId: 'c3', ville: 'Marrakech', dateDebut: '2025-09-01', dateFinPrevue: '2026-06-30', budget: 300000, avancement: 100, statut: 'TERMINE', chefProjet: 'M. El Amrani', description: 'Étude VRD et voirie — livré.' },
    ],

    taches: [
      { ...mk('t1'), titre: 'Validation plans de coffrage niv. 4', chantierId: 'ch1', responsable: 'A. Chraibi', dateEcheance: '2026-08-12', avancement: 60, priorite: 'HAUTE', statut: 'EN_COURS', description: 'Revue des plans avant coulage.' },
      { ...mk('t2'), titre: 'Contrôle ferraillage voiles SS2', chantierId: 'ch1', responsable: 'S. Ouazzani', dateEcheance: '2026-08-09', avancement: 0, priorite: 'CRITIQUE', statut: 'A_FAIRE' },
      { ...mk('t3'), titre: 'Réception charpente — travée A', chantierId: 'ch2', responsable: 'M. El Amrani', dateEcheance: '2026-08-15', avancement: 30, priorite: 'NORMALE', statut: 'EN_COURS' },
      { ...mk('t4'), titre: 'Note de calcul assemblages boulonnés', chantierId: 'ch2', responsable: 'A. Chraibi', dateEcheance: '2026-08-20', avancement: 100, priorite: 'NORMALE', statut: 'TERMINE' },
      { ...mk('t5'), titre: 'Relevé topographique lot 1', chantierId: 'ch3', responsable: 'Équipe terrain', dateEcheance: '2026-08-25', avancement: 45, priorite: 'NORMALE', statut: 'EN_COURS' },
      { ...mk('t6'), titre: 'Coordination réseaux — attente concessionnaire', chantierId: 'ch3', responsable: 'S. Ouazzani', dateEcheance: '2026-08-18', avancement: 20, priorite: 'HAUTE', statut: 'BLOQUE', description: 'En attente plans concessionnaire eau.' },
      { ...mk('t7'), titre: 'Planifier visite diagnostic', chantierId: 'ch4', responsable: 'S. Ouazzani', dateEcheance: '2026-09-02', avancement: 0, priorite: 'BASSE', statut: 'A_FAIRE' },
    ],

    membres: [
      { ...mk('m1'), nom: 'A. Chraibi', email: 'a.chraibi@structuralia.ma', role: 'DIRECTION', poste: 'Directeur technique', telephone: '+212661100001', actif: true },
      { ...mk('m2'), nom: 'M. El Amrani', email: 'm.elamrani@structuralia.ma', role: 'INGENIEUR', poste: 'Ingénieur structure', telephone: '+212661100002', actif: true },
      { ...mk('m3'), nom: 'S. Ouazzani', email: 's.ouazzani@structuralia.ma', role: 'INGENIEUR', poste: 'Ingénieur VRD', telephone: '+212661100003', actif: true },
      { ...mk('m4'), nom: 'L. Benjelloun', email: 'l.benjelloun@structuralia.ma', role: 'GESTIONNAIRE', poste: 'Gestionnaire administratif', telephone: '+212661100004', actif: true },
      { ...mk('m5'), nom: 'K. Sbai', email: 'k.sbai@structuralia.ma', role: 'GESTIONNAIRE', poste: 'Assistante facturation', telephone: '+212661100005', actif: false },
    ],

    pvs: [
      {
        ...mk('pv1'),
        reference: 'PV-COF-CH-2026-04-001',
        type: 'RECEPTION_COFFRAGE',
        titre: 'PV de réception de coffrage — PV-COF-CH-2026-04-001',
        chantierId: 'ch1',
        clientId: 'c2',
        date: '2026-07-30',
        controleur: 'A. Chraibi',
        payload: {
          type: 'RECEPTION_COFFRAGE',
          reference: 'PV-COF-CH-2026-04-001',
          chantierNom: 'Résidence «Le Parc» R+8',
          chantierRef: 'CH-2026-04',
          clientNom: 'Groupe Alami Promotion',
          ville: 'Rabat',
          ouvrage: 'Dalle niveau 3',
          date: '2026-07-30',
          controleur: 'A. Chraibi',
          items: [
            { point: 'Implantation et niveaux conformes aux plans', statut: 'CONFORME', observation: '' },
            { point: 'Stabilité, étaiement et contreventement', statut: 'CONFORME', observation: 'Étaiement renforcé travée B' },
            { point: 'Étanchéité des joints du coffrage', statut: 'CONFORME', observation: '' },
          ],
          decision: 'ACCORDEE',
          observations: 'Coffrage conforme, bétonnage autorisé le lendemain.',
        },
      },
      {
        ...mk('pv2'),
        reference: 'PV-RES-CH-2026-02-001',
        type: 'RESERVES',
        titre: 'PV de réserves — PV-RES-CH-2026-02-001',
        chantierId: 'ch2',
        clientId: 'c5',
        date: '2026-07-25',
        controleur: 'M. El Amrani',
        payload: {
          type: 'RESERVES',
          reference: 'PV-RES-CH-2026-02-001',
          chantierNom: 'Hangar industriel OCP',
          chantierRef: 'CH-2026-02',
          clientNom: 'OCP Infrastructure',
          ville: 'Khouribga',
          ouvrage: 'Charpente — travée A',
          date: '2026-07-25',
          controleur: 'M. El Amrani',
          reserves: [
            { localisation: 'Nœud N12', description: 'Boulonnage incomplet (2 boulons manquants)', gravite: 'MAJEURE', delai: '48 h' },
            { localisation: 'Panne P4', description: 'Traitement anticorrosion à reprendre', gravite: 'MINEURE', delai: '1 semaine' },
          ],
        },
      },
    ],

    prestations: CATALOG.map((c, i) => ({
      ...mk(`pr${i + 1}`),
      section: c.section,
      designation: c.designation,
      unite: c.unite,
      prixUnitaire: c.prixUnitaire,
      actif: true,
    })),
  };
}
