import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/**
 * Modèle de données STRUCTURALIA — bureau d'études techniques.
 *
 * Gestion interne : Clients, Conventions, Devis, Factures, Documents.
 * Gestion externe : Chantiers, Tâches de suivi des travaux.
 *
 * Autorisation : tout utilisateur authentifié (membre du BET) a accès.
 * On pourra affiner par groupes/rôles ultérieurement.
 *
 * @see https://docs.amplify.aws/react/build-a-backend/data/
 */
const schema = a.schema({
  // ---------------------------------------------------------------------------
  // GESTION INTERNE
  // ---------------------------------------------------------------------------
  Client: a
    .model({
      nom: a.string().required(),
      type: a.enum(['PARTICULIER', 'ENTREPRISE', 'COLLECTIVITE']),
      contactNom: a.string(),
      email: a.email(),
      telephone: a.phone(),
      adresse: a.string(),
      ville: a.string(),
      codePostal: a.string(),
      siret: a.string(),
      statut: a.enum(['PROSPECT', 'ACTIF', 'INACTIF']),
      notes: a.string(),
      // Relations
      conventions: a.hasMany('Convention', 'clientId'),
      devis: a.hasMany('Devis', 'clientId'),
      factures: a.hasMany('Facture', 'clientId'),
      chantiers: a.hasMany('Chantier', 'clientId'),
      documents: a.hasMany('Document', 'clientId'),
    })
    .authorization((allow) => [allow.authenticated()]),

  Convention: a
    .model({
      reference: a.string().required(),
      objet: a.string().required(),
      clientId: a.id(),
      client: a.belongsTo('Client', 'clientId'),
      dateDebut: a.date(),
      dateFin: a.date(),
      montant: a.float(),
      statut: a.enum(['BROUILLON', 'ACTIVE', 'EXPIREE', 'RESILIEE']),
      fichierUrl: a.string(),
      notes: a.string(),
      prestations: a.json(), // prestations retenues (détaillées dans le contrat)
    })
    .authorization((allow) => [allow.authenticated()]),

  Devis: a
    .model({
      reference: a.string().required(),
      objet: a.string().required(),
      clientId: a.id(),
      client: a.belongsTo('Client', 'clientId'),
      chantierId: a.id(),
      chantier: a.belongsTo('Chantier', 'chantierId'),
      dateEmission: a.date(),
      dateValidite: a.date(),
      montantHT: a.float(),
      tauxTVA: a.float(),
      remisePourcent: a.float(),
      montantTTC: a.float(),
      statut: a.enum(['BROUILLON', 'ENVOYE', 'ACCEPTE', 'REFUSE', 'EXPIRE']),
      // Lignes de prestation sérialisées en JSON
      lignes: a.json(),
      notes: a.string(),
      factures: a.hasMany('Facture', 'devisId'),
    })
    .authorization((allow) => [allow.authenticated()]),

  Facture: a
    .model({
      reference: a.string().required(),
      objet: a.string(),
      clientId: a.id(),
      client: a.belongsTo('Client', 'clientId'),
      chantierId: a.id(),
      chantier: a.belongsTo('Chantier', 'chantierId'),
      devisId: a.id(),
      devis: a.belongsTo('Devis', 'devisId'),
      dateEmission: a.date(),
      dateEcheance: a.date(),
      montantHT: a.float(),
      tauxTVA: a.float(),
      remisePourcent: a.float(),
      montantTTC: a.float(),
      montantPaye: a.float(),
      statut: a.enum(['BROUILLON', 'ENVOYEE', 'PAYEE', 'PARTIELLE', 'EN_RETARD', 'ANNULEE']),
      lignes: a.json(),
      notes: a.string(),
    })
    .authorization((allow) => [allow.authenticated()]),

  Document: a
    .model({
      titre: a.string().required(),
      categorie: a.enum(['PLAN', 'RAPPORT', 'NOTE_CALCUL', 'ADMINISTRATIF', 'PHOTO', 'AUTRE']),
      type: a.string(), // extension / mime
      url: a.string(),
      storageKey: a.string(), // chemin S3 (Amplify Storage)
      taille: a.integer(),
      clientId: a.id(),
      client: a.belongsTo('Client', 'clientId'),
      chantierId: a.id(),
      chantier: a.belongsTo('Chantier', 'chantierId'),
      notes: a.string(),
    })
    .authorization((allow) => [allow.authenticated()]),

  // ---------------------------------------------------------------------------
  // GESTION EXTERNE
  // ---------------------------------------------------------------------------
  Chantier: a
    .model({
      nom: a.string().required(),
      reference: a.string(),
      clientId: a.id(),
      client: a.belongsTo('Client', 'clientId'),
      adresse: a.string(),
      ville: a.string(),
      dateDebut: a.date(),
      dateFinPrevue: a.date(),
      budget: a.float(),
      avancement: a.integer(), // 0-100
      statut: a.enum(['PLANIFIE', 'EN_COURS', 'SUSPENDU', 'TERMINE', 'ANNULE']),
      chefProjet: a.string(),
      description: a.string(),
      taches: a.hasMany('Tache', 'chantierId'),
      documents: a.hasMany('Document', 'chantierId'),
      devis: a.hasMany('Devis', 'chantierId'),
      factures: a.hasMany('Facture', 'chantierId'),
    })
    .authorization((allow) => [allow.authenticated()]),

  Tache: a
    .model({
      titre: a.string().required(),
      description: a.string(),
      chantierId: a.id(),
      chantier: a.belongsTo('Chantier', 'chantierId'),
      responsable: a.string(),
      dateDebut: a.date(),
      dateEcheance: a.date(),
      avancement: a.integer(), // 0-100
      priorite: a.enum(['BASSE', 'NORMALE', 'HAUTE', 'CRITIQUE']),
      statut: a.enum(['A_FAIRE', 'EN_COURS', 'BLOQUE', 'TERMINE']),
    })
    .authorization((allow) => [allow.authenticated()]),

  // ---------------------------------------------------------------------------
  // ADMINISTRATION
  // ---------------------------------------------------------------------------
  Membre: a
    .model({
      nom: a.string().required(),
      email: a.email().required(),
      role: a.enum(['DIRECTION', 'INGENIEUR', 'GESTIONNAIRE']),
      poste: a.string(),
      telephone: a.phone(),
      actif: a.boolean(),
    })
    .authorization((allow) => [allow.authenticated()]),

  // Catalogue de prestations types (gérable dans l'app)
  Prestation: a
    .model({
      section: a.string(),
      designation: a.string().required(),
      unite: a.string(),
      prixUnitaire: a.float(),
      actif: a.boolean(),
    })
    .authorization((allow) => [allow.authenticated()]),

  // Documents de contrôle émis (PV de réception, réserves, synthèse, attestation)
  Pv: a
    .model({
      reference: a.string().required(),
      type: a.string(),
      titre: a.string(),
      chantierId: a.id(),
      clientId: a.id(),
      date: a.date(),
      controleur: a.string(),
      payload: a.json(), // PvData complet pour ré-impression
    })
    .authorization((allow) => [allow.authenticated()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
