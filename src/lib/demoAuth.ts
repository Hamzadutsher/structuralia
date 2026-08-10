import type { Role } from './types';

/**
 * Authentification du **mode démonstration** (sans backend).
 *
 * ⚠️ Une authentification côté client n'est pas une sécurité réelle : le contrôle
 * s'exécute dans le navigateur. Le mot de passe n'est pas stocké en clair (seule
 * son empreinte SHA-256 figure ici). La vraie sécurité est assurée par Amazon
 * Cognito une fois le backend Amplify déployé (voir `AuthGate`).
 */

const SESSION_KEY = 'structuralia:demo-auth';
const REMEMBER_KEY = 'structuralia:demo-remember';

export const DEMO_USER: { username: string; passwordHash: string; displayName: string; role: Role } = {
  username: 'D.HAMZA',
  // SHA-256 de « H@mza1993 » (le mot de passe brut n'apparaît pas dans le code).
  passwordHash: '5db51a36f0582d177d43384aa3e906a40881c8fa343260accf4002373afb5f9e',
  displayName: 'D. HAMZA',
  role: 'DIRECTION',
};

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Tente une connexion démo. Renvoie true en cas de succès. */
export async function demoLogin(username: string, password: string, remember: boolean): Promise<boolean> {
  if (username.trim().toLowerCase() !== DEMO_USER.username.toLowerCase()) return false;
  const hash = await sha256Hex(password);
  if (hash !== DEMO_USER.passwordHash) return false;

  // « Se souvenir de moi » : session persistante (localStorage) sinon session
  // volatile (sessionStorage, effacée à la fermeture de l'onglet).
  const persistent = remember ? localStorage : sessionStorage;
  persistent.setItem(SESSION_KEY, '1');
  if (remember) {
    localStorage.setItem(REMEMBER_KEY, DEMO_USER.username);
  } else {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(REMEMBER_KEY);
  }
  return true;
}

export function isDemoLoggedIn(): boolean {
  return localStorage.getItem(SESSION_KEY) === '1' || sessionStorage.getItem(SESSION_KEY) === '1';
}

/** Identifiant mémorisé (pour préremplir le champ), ou chaîne vide. */
export function rememberedUsername(): string {
  return localStorage.getItem(REMEMBER_KEY) ?? '';
}

export function demoLogout(): void {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}
