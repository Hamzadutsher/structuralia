import { useState } from 'react';
import { store, useData } from '@/lib/store';
import type { Membre, Role } from '@/lib/types';
import { PageHead } from '@/components/ui/Page';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/Misc';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { useCan, ROLES, ROLE_LABELS, permissionsFor } from '@/lib/roles';

const ROLE_TONE: Record<Role, 'primary' | 'info' | 'warning'> = {
  DIRECTION: 'warning',
  INGENIEUR: 'info',
  GESTIONNAIRE: 'primary',
};

const empty: Omit<Membre, 'id' | 'createdAt' | 'updatedAt'> = {
  nom: '',
  email: '',
  role: 'INGENIEUR',
  poste: '',
  telephone: '',
  actif: true,
};

const PERM_LABELS: { key: keyof ReturnType<typeof permissionsFor>; label: string }[] = [
  { key: 'canManageChantiers', label: 'Chantiers & suivi' },
  { key: 'canManageFacturation', label: 'Devis & factures' },
  { key: 'canDelete', label: 'Suppression' },
  { key: 'canManageMembers', label: 'Membres & rôles' },
];

export default function Membres() {
  const data = useData();
  const toast = useToast();
  const can = useCan();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Membre | null>(null);
  const [form, setForm] = useState(empty);

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setModal(true);
  };
  const openEdit = (m: Membre) => {
    setEditing(m);
    const { id, createdAt, updatedAt, ...rest } = m;
    void id; void createdAt; void updatedAt;
    setForm({ ...empty, ...rest });
    setModal(true);
  };
  const save = () => {
    if (!form.nom.trim() || !form.email.trim()) {
      toast('Nom et e-mail requis.', 'danger');
      return;
    }
    if (editing) {
      store.update('membres', editing.id, form);
      toast('Membre mis à jour.', 'success');
    } else {
      store.create('membres', form);
      toast('Membre ajouté.', 'success');
    }
    setModal(false);
  };
  const del = (m: Membre) => {
    if (!confirm(`Retirer le membre « ${m.nom} » ?`)) return;
    store.remove('membres', m.id);
    toast('Membre supprimé.', 'danger');
  };
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <PageHead
        title="Membres & rôles"
        subtitle="Équipe du bureau d’études et droits d’accès"
        actions={
          <button className="btn btn--primary" onClick={openNew}>
            <Icon name="plus" size={16} /> Nouveau membre
          </button>
        }
      />

      {/* Récapitulatif des rôles et permissions */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        {ROLES.map((r) => {
          const p = permissionsFor(r);
          return (
            <div key={r} className="card card--pad">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Badge tone={ROLE_TONE[r]}>{ROLE_LABELS[r]}</Badge>
                <span className="cell-sub">{data.membres.filter((m) => m.role === r).length} membre(s)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {PERM_LABELS.map((perm) => (
                  <div key={perm.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ color: p[perm.key] ? 'var(--success)' : 'var(--text-soft)' }}>
                      <Icon name={p[perm.key] ? 'check' : 'close'} size={14} />
                    </span>
                    <span style={{ color: p[perm.key] ? 'var(--text)' : 'var(--text-soft)' }}>{perm.label}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 6 }}>
        {data.membres.length === 0 ? (
          <EmptyState icon="clients" title="Aucun membre" />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Membre</th>
                  <th>Poste</th>
                  <th>Rôle</th>
                  <th>Contact</th>
                  <th>État</th>
                  <th style={{ width: 90 }}></th>
                </tr>
              </thead>
              <tbody>
                {data.membres.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="topbar__avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                          {m.nom.split(' ').slice(0, 2).map((s) => s[0]).join('')}
                        </div>
                        <div>
                          <div className="cell-strong">{m.nom}</div>
                          <div className="cell-sub">{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{m.poste || '—'}</td>
                    <td><Badge tone={ROLE_TONE[m.role]}>{ROLE_LABELS[m.role]}</Badge></td>
                    <td className="cell-sub">{m.telephone || '—'}</td>
                    <td>
                      {m.actif ? <Badge tone="success">Actif</Badge> : <Badge tone="neutral">Inactif</Badge>}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn" onClick={() => openEdit(m)} aria-label="Modifier">
                          <Icon name="edit" size={15} />
                        </button>
                        {can.canDelete && (
                          <button className="icon-btn danger" onClick={() => del(m)} aria-label="Supprimer">
                            <Icon name="trash" size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modal}
        title={editing ? 'Modifier le membre' : 'Nouveau membre'}
        onClose={() => setModal(false)}
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setModal(false)}>Annuler</button>
            <button className="btn btn--primary" onClick={save}><Icon name="check" size={16} /> Enregistrer</button>
          </>
        }
      >
        <div className="form-grid">
          <div className="field">
            <label>Nom *</label>
            <input value={form.nom} onChange={(e) => set('nom', e.target.value)} />
          </div>
          <div className="field">
            <label>E-mail *</label>
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div className="field">
            <label>Poste</label>
            <input value={form.poste} onChange={(e) => set('poste', e.target.value)} />
          </div>
          <div className="field">
            <label>Téléphone</label>
            <input value={form.telephone} onChange={(e) => set('telephone', e.target.value)} />
          </div>
          <div className="field">
            <label>Rôle</label>
            <select value={form.role} onChange={(e) => set('role', e.target.value as Role)}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div className="field">
            <label>État</label>
            <select value={form.actif ? '1' : '0'} onChange={(e) => set('actif', e.target.value === '1')}>
              <option value="1">Actif</option>
              <option value="0">Inactif</option>
            </select>
          </div>
        </div>
        <p className="cell-sub" style={{ marginTop: 14 }}>
          En production, le rôle est porté par le groupe Cognito de l’utilisateur ; cette page reflète et administre ces affectations.
        </p>
      </Modal>
    </>
  );
}
