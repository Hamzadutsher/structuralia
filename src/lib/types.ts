/** Types métier STRUCTURALIA (miroir du schéma Amplify Data). */

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export type ClientType = 'PARTICULIER' | 'ENTREPRISE' | 'COLLECTIVITE';
export type ClientStatut = 'PROSPECT' | 'ACTIF' | 'INACTIF';

export interface Client extends BaseEntity {
  nom: string;
  type: ClientType;
  contactNom?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  ville?: string;
  codePostal?: string;
  siret?: string;
  statut: ClientStatut;
  notes?: string;
}

export type ConventionStatut = 'BROUILLON' | 'ACTIVE' | 'EXPIREE' | 'RESILIEE';

export interface Convention extends BaseEntity {
  reference: string;
  objet: string;
  clientId: string;
  dateDebut?: string;
  dateFin?: string;
  montant?: number;
  statut: ConventionStatut;
  fichierUrl?: string;
  notes?: string;
  /** Prestations retenues (détaillées dans le contrat). */
  prestations?: LigneDevis[];
}

export interface LigneDevis {
  /** Mission / regroupement (ex. « MISSION ÉTUDE TECHNIQUE »). */
  section?: string;
  designation: string;
  /** Unité (U, F, Ft, ml, m²…). */
  unite?: string;
  quantite: number;
  prixUnitaire: number;
}

export type DevisStatut = 'BROUILLON' | 'ENVOYE' | 'ACCEPTE' | 'REFUSE' | 'EXPIRE';

export interface Devis extends BaseEntity {
  reference: string;
  objet: string;
  clientId: string;
  /** Projet (chantier) rattaché — facturation filtrable par projet. */
  chantierId?: string;
  dateEmission?: string;
  dateValidite?: string;
  montantHT: number;
  tauxTVA: number;
  /** Remise globale en pourcentage appliquée au total HT. */
  remisePourcent?: number;
  montantTTC: number;
  statut: DevisStatut;
  lignes: LigneDevis[];
  notes?: string;
}

export type FactureStatut =
  | 'BROUILLON'
  | 'ENVOYEE'
  | 'PAYEE'
  | 'PARTIELLE'
  | 'EN_RETARD'
  | 'ANNULEE';

export interface Facture extends BaseEntity {
  reference: string;
  objet?: string;
  clientId: string;
  /** Projet (chantier) rattaché — facturation filtrable par projet. */
  chantierId?: string;
  devisId?: string;
  dateEmission?: string;
  dateEcheance?: string;
  montantHT: number;
  tauxTVA: number;
  /** Remise globale en pourcentage appliquée au total HT. */
  remisePourcent?: number;
  montantTTC: number;
  montantPaye: number;
  statut: FactureStatut;
  lignes: LigneDevis[];
  notes?: string;
}

export type DocumentCategorie =
  | 'PLAN'
  | 'RAPPORT'
  | 'NOTE_CALCUL'
  | 'ADMINISTRATIF'
  | 'PHOTO'
  | 'AUTRE';

export interface Document extends BaseEntity {
  titre: string;
  /** Référence structurée auto (TYPE-PROJET-CLIENT-DATE-Vx). */
  reference?: string;
  categorie: DocumentCategorie;
  type?: string;
  url?: string;
  /** Chemin S3 (Amplify Storage) lorsqu'un backend est déployé. */
  storageKey?: string;
  /** Data URL locale (mode démo, petits fichiers). */
  dataUrl?: string;
  taille?: number;
  clientId?: string;
  chantierId?: string;
  notes?: string;
}

/** Document de contrôle émis (PV de réception, réserves, synthèse, attestation). */
export interface Pv extends BaseEntity {
  reference: string;
  /** Valeur de PvType (voir `lib/pv.ts`) — stockée en chaîne pour éviter un couplage circulaire. */
  type: string;
  titre: string;
  chantierId: string;
  clientId?: string;
  date?: string;
  controleur?: string;
  /** Données complètes du PV (PvData sérialisé) pour ré-impression à l'identique. */
  payload: unknown;
}

/** Prestation type du catalogue (gérable dans l'app). */
export interface Prestation extends BaseEntity {
  section: string;
  designation: string;
  unite?: string;
  prixUnitaire: number;
  actif: boolean;
}

export type DepenseType = 'ACHAT' | 'DEPLACEMENT' | 'CHARGE';
export type DepenseCategorie =
  | 'FOURNITURES'
  | 'SOUS_TRAITANCE'
  | 'DEPLACEMENT'
  | 'CARBURANT'
  | 'MATERIEL'
  | 'LOGICIELS'
  | 'LOYER'
  | 'HONORAIRES'
  | 'IMPOTS_TAXES'
  | 'SALAIRES'
  | 'DIVERS';
export type DepenseStatut = 'PAYEE' | 'A_PAYER';

/** Dépense interne : facture d'achat, frais de déplacement, charge… */
export interface Depense extends BaseEntity {
  date: string;
  type: DepenseType;
  categorie: DepenseCategorie;
  libelle: string;
  fournisseur?: string;
  reference?: string; // n° de facture d'achat
  montantHT: number;
  tauxTVA: number;
  montantTTC: number;
  chantierId?: string; // rattachement projet optionnel
  moyenPaiement?: string;
  statut: DepenseStatut;
  notes?: string;
  /** Frais de déplacement au barème : distance et taux (MAD/km). */
  km?: number;
  tauxKm?: number;
}

export type Role = 'DIRECTION' | 'INGENIEUR' | 'GESTIONNAIRE';

export interface Membre extends BaseEntity {
  nom: string;
  email: string;
  role: Role;
  poste?: string;
  telephone?: string;
  actif: boolean;
}

export type ChantierStatut =
  | 'PLANIFIE'
  | 'EN_COURS'
  | 'SUSPENDU'
  | 'TERMINE'
  | 'ANNULE';

export interface Chantier extends BaseEntity {
  nom: string;
  reference?: string;
  clientId: string;
  adresse?: string;
  ville?: string;
  dateDebut?: string;
  dateFinPrevue?: string;
  budget?: number;
  avancement: number;
  statut: ChantierStatut;
  chefProjet?: string;
  description?: string;
}

export type TachePriorite = 'BASSE' | 'NORMALE' | 'HAUTE' | 'CRITIQUE';
export type TacheStatut = 'A_FAIRE' | 'EN_COURS' | 'BLOQUE' | 'TERMINE';

export interface Tache extends BaseEntity {
  titre: string;
  description?: string;
  chantierId: string;
  responsable?: string;
  dateDebut?: string;
  dateEcheance?: string;
  avancement: number;
  priorite: TachePriorite;
  statut: TacheStatut;
}

export interface AppData {
  clients: Client[];
  conventions: Convention[];
  devis: Devis[];
  factures: Facture[];
  documents: Document[];
  chantiers: Chantier[];
  taches: Tache[];
  membres: Membre[];
  pvs: Pv[];
  prestations: Prestation[];
  depenses: Depense[];
}

export type EntityKey = keyof AppData;
