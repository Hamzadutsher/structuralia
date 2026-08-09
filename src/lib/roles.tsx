import { createContext, useContext, useMemo, useState } from 'react';
import type { Role } from './types';

export const ROLES: Role[] = ['DIRECTION', 'INGENIEUR', 'GESTIONNAIRE'];

export const ROLE_LABELS: Record<Role, string> = {
  DIRECTION: 'Direction',
  INGENIEUR: 'Ingénieur',
  GESTIONNAIRE: 'Gestionnaire',
};

export interface Permissions {
  /** Supprimer des enregistrements (clients, devis, chantiers…). */
  canDelete: boolean;
  /** Gérer les membres et leurs rôles. */
  canManageMembers: boolean;
  /** Créer / modifier devis, factures et conventions. */
  canManageFacturation: boolean;
  /** Créer / modifier chantiers et tâches. */
  canManageChantiers: boolean;
}

const MATRIX: Record<Role, Permissions> = {
  DIRECTION: {
    canDelete: true,
    canManageMembers: true,
    canManageFacturation: true,
    canManageChantiers: true,
  },
  GESTIONNAIRE: {
    canDelete: true,
    canManageMembers: false,
    canManageFacturation: true,
    canManageChantiers: true,
  },
  INGENIEUR: {
    canDelete: false,
    canManageMembers: false,
    canManageFacturation: false,
    canManageChantiers: true,
  },
};

export function permissionsFor(role: Role): Permissions {
  return MATRIX[role];
}

interface RoleContextValue {
  role: Role;
  setRole: (r: Role) => void;
  can: Permissions;
  /** true si le rôle provient de Cognito (backend), false en mode démo. */
  fromBackend: boolean;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({
  initialRole = 'DIRECTION',
  fromBackend = false,
  children,
}: {
  initialRole?: Role;
  fromBackend?: boolean;
  children: React.ReactNode;
}) {
  const [role, setRole] = useState<Role>(initialRole);
  const value = useMemo<RoleContextValue>(
    () => ({ role, setRole, can: permissionsFor(role), fromBackend }),
    [role, fromBackend],
  );
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole doit être utilisé dans un RoleProvider');
  return ctx;
}

/** Raccourci : renvoie les permissions du rôle courant. */
export function useCan(): Permissions {
  return useRole().can;
}
