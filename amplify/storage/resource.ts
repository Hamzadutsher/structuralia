import { defineStorage } from '@aws-amplify/backend';

/**
 * Stockage des fichiers STRUCTURALIA (Amazon S3 via Amplify Storage).
 * Les documents (plans, notes de calcul, rapports…) sont rangés sous
 * `documents/`. Tout membre authentifié du BET peut lire, écrire et supprimer.
 * @see https://docs.amplify.aws/react/build-a-backend/storage/
 */
export const storage = defineStorage({
  name: 'structuraliaFiles',
  access: (allow) => ({
    'documents/*': [allow.authenticated.to(['read', 'write', 'delete'])],
  }),
});
