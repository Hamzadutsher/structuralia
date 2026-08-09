import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { PAGE_TITLES } from './nav';

interface Props {
  userName: string;
  onLogout?: () => void;
}

export function AppLayout({ userName, onLogout }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

  const toggleSidebar = () => {
    if (isMobile()) setMobileOpen((v) => !v);
    else setCollapsed((v) => !v);
  };

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const title =
    PAGE_TITLES[location.pathname] ??
    (location.pathname.startsWith('/projets') ? 'Fiche projet' : 'STRUCTURALIA');

  return (
    <div className="app-shell">
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />
      <div className={`sidebar-overlay${mobileOpen ? ' show' : ''}`} onClick={() => setMobileOpen(false)} />
      <div className={`main${collapsed ? ' collapsed' : ''}`}>
        <Topbar title={title} onToggleSidebar={toggleSidebar} userName={userName} onLogout={onLogout} />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
