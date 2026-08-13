import { lazy, Suspense, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ToastProvider } from '@/components/ui/Toast';
import { DemoLogin } from '@/components/DemoLogin';
import { RoleProvider } from '@/lib/roles';
import type { Role } from '@/lib/types';
import { isBackendConfigured } from '@/lib/amplify';
import { isDemoLoggedIn, demoLogout, DEMO_USER } from '@/lib/demoAuth';

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
const Comptabilite = lazy(() => import('@/pages/Comptabilite'));
const Donnees = lazy(() => import('@/pages/Donnees'));
const Poteau = lazy(() => import('@/pages/Poteau'));
const PoteauFC = lazy(() => import('@/pages/PoteauFC'));
const Poutre = lazy(() => import('@/pages/Poutre'));
const Semelle = lazy(() => import('@/pages/Semelle'));
const Dalle = lazy(() => import('@/pages/Dalle'));
const PoutreContinue = lazy(() => import('@/pages/PoutreContinue'));
const Sismique = lazy(() => import('@/pages/Sismique'));
const Descente = lazy(() => import('@/pages/Descente'));
const CalcHub = lazy(() => import('@/pages/CalcHub'));
const Escalier = lazy(() => import('@/pages/Escalier'));
const SemelleFilante = lazy(() => import('@/pages/SemelleFilante'));

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
            <Route path="/comptabilite" element={<Comptabilite />} />
            <Route path="/donnees" element={<Donnees />} />
            <Route path="/chantiers" element={<Chantiers />} />
            <Route path="/projets/:id" element={<ProjectDetail />} />
            <Route path="/suivi" element={<Suivi />} />
            <Route path="/calcul" element={<CalcHub />} />
            <Route path="/calcul/poteau" element={<Poteau />} />
            <Route path="/calcul/poteau-fc" element={<PoteauFC />} />
            <Route path="/calcul/poutre" element={<Poutre />} />
            <Route path="/calcul/semelle" element={<Semelle />} />
            <Route path="/calcul/semelle-filante" element={<SemelleFilante />} />
            <Route path="/calcul/dalle" element={<Dalle />} />
            <Route path="/calcul/escalier" element={<Escalier />} />
            <Route path="/calcul/poutre-continue" element={<PoutreContinue />} />
            <Route path="/calcul/sismique" element={<Sismique />} />
            <Route path="/calcul/descente" element={<Descente />} />
            <Route path="/membres" element={<Membres />} />
            <Route path="*" element={<Dashboard />} />
          </Route>
        </Routes>
      </Suspense>
    </ToastProvider>
  );
}

export default function App() {
  // Sans backend déployé : mode démo, protégé par un écran de connexion local.
  if (!isBackendConfigured) {
    return <DemoApp />;
  }
  return <AuthenticatedApp />;
}

/** Mode démo : écran de connexion puis application. */
function DemoApp() {
  const [user, setUser] = useState<string | null>(() => (isDemoLoggedIn() ? DEMO_USER.displayName : null));

  if (!user) {
    return <DemoLogin onSuccess={(name) => setUser(name)} />;
  }
  return (
    <RoleProvider initialRole={DEMO_USER.role} fromBackend={false}>
      <Router
        userName={user}
        onLogout={() => {
          demoLogout();
          setUser(null);
        }}
      />
    </RoleProvider>
  );
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
