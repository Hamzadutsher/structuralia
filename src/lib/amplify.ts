import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';

/**
 * Configure Amplify à partir de `amplify_outputs.json`.
 *
 * Le dépôt inclut un `amplify_outputs.json` **placeholder** (objet vide) afin que
 * l'application démarre immédiatement en local **sans backend déployé** : elle
 * bascule alors en mode démo (localStorage).
 *
 * Dès qu'un backend est déployé — `npx ampx sandbox` en local, ou le build
 * Amplify Hosting en production — la commande `ampx generate outputs` **écrase**
 * ce fichier avec la vraie configuration (Cognito + AppSync/Data) et
 * l'application se connecte automatiquement au backend réel.
 */
export let isBackendConfigured = false;

// Le placeholder ne contient pas de clé `auth` : on ne configure Amplify que
// lorsqu'une vraie configuration est présente.
if (outputs && (outputs as Record<string, unknown>).auth) {
  Amplify.configure(outputs as unknown as Parameters<typeof Amplify.configure>[0]);
  isBackendConfigured = true;
  // eslint-disable-next-line no-console
  console.info('[STRUCTURALIA] Backend Amplify connecté.');
} else {
  // eslint-disable-next-line no-console
  console.info('[STRUCTURALIA] Mode démo local (localStorage). Déployez le backend pour activer Cognito + Data.');
}
