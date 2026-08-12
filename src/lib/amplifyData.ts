import type { EntityKey } from './types';

/**
 * Adaptateur Amplify Data : CRUD réel sur DynamoDB via `generateClient<Schema>()`.
 * Chargé dynamiquement afin de ne pas alourdir le mode démo.
 *
 * Mapping clé du store (pluriel) → nom du modèle Amplify.
 */
const MODEL: Record<EntityKey, string> = {
  clients: 'Client',
  conventions: 'Convention',
  devis: 'Devis',
  factures: 'Facture',
  documents: 'Document',
  chantiers: 'Chantier',
  taches: 'Tache',
  membres: 'Membre',
  pvs: 'Pv',
  prestations: 'Prestation',
  depenses: 'Depense',
};

/** Champs présents côté client uniquement, à ne pas envoyer au backend. */
const CLIENT_ONLY_FIELDS = ['dataUrl'];

// Le type du client Amplify n'est connu qu'après génération de `amplify_outputs`.
// On reste volontairement en `any` pour ne pas coupler le build au codegen.
/* eslint-disable @typescript-eslint/no-explicit-any */
let clientPromise: Promise<any> | null = null;

async function getModels(): Promise<any> {
  if (!clientPromise) {
    clientPromise = import('aws-amplify/data').then(({ generateClient }) => generateClient());
  }
  const client = await clientPromise;
  return client.models;
}

function sanitize(item: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = { ...item };
  for (const k of CLIENT_ONLY_FIELDS) delete out[k];
  // Retire d'éventuels champs de relation renvoyés par Amplify (fonctions lazy).
  for (const k of Object.keys(out)) {
    if (typeof out[k] === 'function') delete out[k];
  }
  return out;
}

export async function listAll(key: EntityKey): Promise<any[]> {
  const models = await getModels();
  const { data } = await models[MODEL[key]].list();
  return data ?? [];
}

export async function createRecord(key: EntityKey, item: Record<string, any>): Promise<any | null> {
  const models = await getModels();
  const { data } = await models[MODEL[key]].create(sanitize(item));
  return data ?? null;
}

export async function updateRecord(key: EntityKey, id: string, patch: Record<string, any>): Promise<void> {
  const models = await getModels();
  await models[MODEL[key]].update({ id, ...sanitize(patch) });
}

export async function deleteRecord(key: EntityKey, id: string): Promise<void> {
  const models = await getModels();
  await models[MODEL[key]].delete({ id });
}
/* eslint-enable @typescript-eslint/no-explicit-any */
