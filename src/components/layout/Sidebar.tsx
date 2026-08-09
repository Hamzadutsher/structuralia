import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { NAV, type NavLink as NavLinkType } from './nav';
import { useCan } from '@/lib/roles';

interface Props {
  collapsed: boolean;
  mobileOpen: boolean;
  onNavigate: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onNavigate }: Props) {
  const can = useCan();
  // Sous-groupes dépliés par défaut.
  const [open, setOpen] = useState<Record<string, boolean>>({
    'Gestion interne': true,
    'Gestion externe': true,
  });

  const visible = (links: NavLinkType[]) => links.filter((l) => !l.perm || can[l.perm]);

  const renderLink = (link: NavLinkType, nested = false) => (
    <NavLink
      key={link.to}
      to={link.to}
      end={link.to === '/'}
      className={({ isActive }) => `nav-item${nested ? ' nav-item--nested' : ''}${isActive ? ' active' : ''}`}
      onClick={onNavigate}
      title={collapsed ? link.label : undefined}
    >
      <span className="nav-item__icon">
        <Icon name={link.icon} size={nested ? 17 : 19} />
      </span>
      <span className="nav-item__label">{link.label}</span>
    </NavLink>
  );

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
      <div className="sidebar__brand">
        <div className="sidebar__logo">S</div>
        {!collapsed && (
          <div className="sidebar__brand-text">
            <b>STRUCTURALIA</b>
            <span>Bureau d’études</span>
          </div>
        )}
      </div>

      <nav className="sidebar__nav">
        {NAV.map((cat, ci) => {
          const directLinks = visible(cat.links ?? []);
          const groups = (cat.groups ?? [])
            .map((g) => ({ ...g, links: visible(g.links) }))
            .filter((g) => g.links.length > 0);
          if (directLinks.length === 0 && groups.length === 0) return null;

          return (
            <div key={cat.title ?? `cat-${ci}`} className="nav-cat">
              {cat.title && (
                <div className="nav-section">
                  {collapsed ? '•••' : cat.title}
                </div>
              )}

              {directLinks.map((l) => renderLink(l))}

              {groups.map((g) => {
                const isOpen = collapsed || open[g.title] !== false;
                return (
                  <div key={g.title} className="nav-subgroup">
                    {!collapsed && (
                      <button
                        className="nav-subhead"
                        onClick={() => setOpen((o) => ({ ...o, [g.title]: o[g.title] === false }))}
                        aria-expanded={isOpen}
                      >
                        <span className="nav-item__icon"><Icon name={g.icon} size={17} /></span>
                        <span className="nav-subhead__label">{g.title}</span>
                        <Icon name="chevron" size={14} className={`nav-subhead__chev${isOpen ? ' open' : ''}`} />
                      </button>
                    )}
                    {isOpen && (
                      <div className="nav-sublinks">
                        {g.links.map((l) => renderLink(l, !collapsed))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
