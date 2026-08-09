import { defineAuth } from '@aws-amplify/backend';

/**
 * Authentification Cognito pour STRUCTURALIA.
 * Connexion par e-mail. Les utilisateurs représentent les membres du
 * bureau d'études (ingénieurs, gestionnaires, direction).
 * @see https://docs.amplify.aws/react/build-a-backend/auth/
 */
export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailSubject: 'STRUCTURALIA — Confirmez votre compte',
      verificationEmailBody: (createCode) =>
        `Bienvenue sur STRUCTURALIA. Votre code de confirmation est : ${createCode()}`,
    },
  },
  // Rôles applicatifs (groupes Cognito). L'utilisateur est rattaché à un groupe
  // qui détermine ses permissions dans l'application.
  groups: ['DIRECTION', 'INGENIEUR', 'GESTIONNAIRE'],
  userAttributes: {
    fullname: { required: false, mutable: true },
    'custom:role': {
      dataType: 'String',
      mutable: true,
      minLen: 0,
      maxLen: 32,
    },
  },
});
