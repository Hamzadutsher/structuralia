import { useEffect, useState } from 'react';
import { Authenticator, useAuthenticator, View, Image, useTheme } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import type { Role } from '@/lib/types';

/**
 * Portail d'authentification Cognito (chargé uniquement si un backend Amplify
 * est déployé). Fournit le nom, le rôle applicatif (dérivé du groupe Cognito)
 * et la fonction de déconnexion à l'application.
 */
export default function AuthGate({
  children,
}: {
  children: (userName: string, role: Role, signOut: () => void) => React.ReactNode;
}) {
  return (
    <Authenticator
      variation="modal"
      components={{
        Header() {
          const { tokens } = useTheme();
          return (
            <View textAlign="center" padding={tokens.space.large}>
              <Image alt="STRUCTURALIA" src="/favicon.svg" width="56" height="56" />
              <h1 style={{ marginTop: 12, color: '#0f766e' }}>STRUCTURALIA</h1>
              <p style={{ color: '#64757e' }}>Espace de gestion du bureau d’études</p>
            </View>
          );
        },
      }}
    >
      <Inner>{children}</Inner>
    </Authenticator>
  );
}

const VALID_ROLES: Role[] = ['DIRECTION', 'INGENIEUR', 'GESTIONNAIRE'];

function Inner({
  children,
}: {
  children: (userName: string, role: Role, signOut: () => void) => React.ReactNode;
}) {
  const { user, signOut } = useAuthenticator((ctx) => [ctx.user]);
  const [role, setRole] = useState<Role>('INGENIEUR');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { fetchAuthSession } = await import('aws-amplify/auth');
        const session = await fetchAuthSession();
        const groups = (session.tokens?.accessToken?.payload['cognito:groups'] as string[]) ?? [];
        const found = VALID_ROLES.find((r) => groups.includes(r));
        if (active && found) setRole(found);
      } catch {
        /* rôle par défaut conservé */
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const email = user?.signInDetails?.loginId ?? 'Utilisateur';
  const name = email.split('@')[0].replace(/[._]/g, ' ');
  const displayName = name.charAt(0).toUpperCase() + name.slice(1);
  return <>{children(displayName, role, signOut)}</>;
}
