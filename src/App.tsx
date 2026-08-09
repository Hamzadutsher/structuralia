import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ToastProvider } from '@/components/ui/Toast';
import { RoleProvider } from '@/lib/roles';
import type { Role } from '@/lib/types';
import { isBackendConfigured } from '@/lib/amplify';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Clients = lazy(() => import('@/pages/Clients'));
const Facturation = lazy(() => import('@/pages/Facturation'));
const Conventions = lazy(() => import('@/pages/Conventions'));
const Documents = lazy(() => import('@/pages/Documents'));
const Chantiers = lazy(() => import('@/pages/Chantiers'));
const Suivi = lazy(() => import('@/pages/Suivi'));
const Membres = lazy(() => import('@/pages/Membres'));
const ProjectDetail = lazy(() => import('@/pages/ProjectDetail'));
const Catalogue = lazy(() => import('@/pages/Catalogue'));

function Router({ userName, onLogout }: { userName: string; onLogout?: () => void }) {
  return (
    <ToastProvider>
      <Suspense fallback={<div style={{ padding: 40 }}>Chargement…</div>}>
        <Routes>
          <Route element={<AppLayout userName={userName} onLogout={onLogout} />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/facturation" element={<Facturation />} />
            <Route path="/conventions" element={<Conventions />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/catalogue" element={<Catalogue />} />
            <Route path="/chantiers" element={<Chantiers />} />
            <Route path="/projets/:id" element={<ProjectDetail />} />
            <Route path="/suivi" element={<Suivi />} />
            <Route path="/membres" element={<Membres />} />
            <Route path="*" element={<Dashboard />} />
          </Route>
        </Routes>
      </Suspense>
    </ToastProvider>
  );
}

export default function App() {
  // Sans backend déployé : mode démo, utilisateur fictif, rôle modifiable.
  if (!isBackendConfigured) {
    return (
      <RoleProvider initialRole="DIRECTION" fromBackend={false}>
        <Router userName="Démo BET" />
      </RoleProvider>
    );
  }
  return <AuthenticatedApp />;
}

/** Chargé uniquement lorsque le backend Amplify est configuré. */
function AuthenticatedApp() {
  const Gate = lazy(() => import('@/components/AuthGate'));
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Chargement de la session…</div>}>
      <Gate>
        {(userName: string, role: Role, signOut: () => void) => (
          <RoleProvider initialRole={role} fromBackend>
            <Router userName={userName} onLogout={signOut} />
          </RoleProvider>
        )}
      </Gate>
    </Suspense>
  );
}
