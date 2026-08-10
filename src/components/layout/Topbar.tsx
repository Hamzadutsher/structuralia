import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useRole, ROLES, ROLE_LABELS } from '@/lib/roles';
import { useData } from '@/lib/store';
import type { Role } from '@/lib/types';

interface Props {
  title: string;
  onToggleSidebar: () => void;
  userName: string;
  onLogout?: () => void;
}

interface SearchHit {
  icon: IconName;
  label: string;
  sub: string;
  to: string;
}

export function Topbar({ title, onToggleSidebar, userName, onLogout }: Props) {
  const { role, setRole, fromBackend, can } = useRole();
  const data = useData();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<number | undefined>(undefined);

  const initials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

  const hits = useMemo<SearchHit[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const has = (...vals: (string | undefined)[]) => vals.some((v) => (v ?? '').toLowerCase().includes(q));
    const out: SearchHit[] = [];
    const push = (arr: SearchHit[]) => out.push(...arr.slice(0, 4));

    push(
      data.clients.filter((c) => has(c.nom, c.ville, c.email)).map((c) => ({
        icon: 'clients', label: c.nom, sub: `Client · ${c.ville ?? ''}`, to: '/clients',
      })),
    );
    push(
      data.chantiers.filter((c) => has(c.nom, c.ville, c.reference)).map((c) => ({
        icon: 'chantier', label: c.nom, sub: `Chantier · ${c.reference ?? ''}`, to: '/chantiers',
      })),
    );
    push(
      data.devis.filter((d) => has(d.reference, d.objet)).map((d) => ({
        icon: 'devis', label: d.reference, sub: `Devis · ${d.objet}`, to: '/facturation',
      })),
    );
    push(
      data.factures.filter((f) => has(f.reference, f.objet)).map((f) => ({
        icon: 'facture', label: f.reference, sub: `Facture · ${f.objet ?? ''}`, to: '/facturation',
      })),
    );
    push(
      data.conventions.filter((c) => has(c.reference, c.objet)).map((c) => ({
        icon: 'convention', label: c.reference, sub: `Convention · ${c.objet}`, to: '/conventions',
      })),
    );
    push(
      data.documents.filter((d) => has(d.titre)).map((d) => ({
        icon: 'document', label: d.titre, sub: 'Document', to: '/documents',
      })),
    );
    if (can.canManageMembers) {
      push(
        data.membres.filter((m) => has(m.nom, m.email, m.poste)).map((m) => ({
          icon: 'settings', label: m.nom, sub: `Membre · ${m.poste ?? ''}`, to: '/membres',
        })),
      );
    }
    return out.slice(0, 12);
  }, [query, data, can.canManageMembers]);

  const go = (to: string) => {
    navigate(to);
    setQuery('');
    setOpen(false);
  };

  return (
    <header className="topbar">
      <button className="topbar__toggle" onClick={onToggleSidebar} aria-label="Menu">
        <Icon name="menu" size={20} />
      </button>
      <div className="topbar__title">{title}</div>
      <div className="topbar__spacer" />

      <div className="topbar__search-wrap">
        <div className="topbar__search">
          <Icon name="search" size={16} />
          <input
            placeholder="Rechercher un client, chantier, devis…"
            aria-label="Recherche globale"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              blurTimer.current = window.setTimeout(() => setOpen(false), 150);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && hits[0]) go(hits[0].to);
              if (e.key === 'Escape') setOpen(false);
            }}
          />
        </div>
        {open && query.trim().length >= 2 && (
          <div
            className="search-results"
            onMouseDown={() => blurTimer.current && window.clearTimeout(blurTimer.current)}
          >
            {hits.length === 0 ? (
              <div className="search-empty">Aucun résultat pour « {query} »</div>
            ) : (
              hits.map((h, i) => (
                <button key={i} className="search-hit" onClick={() => go(h.to)}>
                  <span className="search-hit__icon"><Icon name={h.icon} size={15} /></span>
                  <span className="search-hit__text">
                    <b>{h.label}</b>
                    <span>{h.sub}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Sélecteur de rôle : outil de démo tant que le backend n'est pas branché.
          En mode backend, le rôle provient du groupe Cognito (lecture seule). */}
      <select
        className="select"
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
        disabled={fromBackend}
        title={fromBackend ? 'Rôle défini par Cognito' : 'Changer de rôle'}
        aria-label="Rôle"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>

      <button className="topbar__toggle" aria-label="Notifications">
        <Icon name="bell" size={19} />
      </button>

      <div className="topbar__user">
        <div className="topbar__avatar">{initials || 'U'}</div>
        <div className="topbar__user-meta">
          <b>{userName}</b>
          <span>{ROLE_LABELS[role]}</span>
        </div>
        {onLogout && (
          <button className="icon-btn" onClick={onLogout} aria-label="Déconnexion" title="Déconnexion">
            <Icon name="logout" size={16} />
          </button>
        )}
      </div>
    </header>
  );
}
