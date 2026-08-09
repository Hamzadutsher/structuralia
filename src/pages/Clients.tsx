import { useMemo, useState } from 'react';
import { store, useData } from '@/lib/store';
import type { Client, ClientStatut, ClientType } from '@/lib/types';
import { humanize } from '@/lib/format';
import { PageHead } from '@/components/ui/Page';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/Misc';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { useCan } from '@/lib/roles';

const TYPES: ClientType[] = ['PARTICULIER', 'ENTREPRISE', 'COLLECTIVITE'];
const STATUTS: ClientStatut[] = ['PROSPECT', 'ACTIF', 'INACTIF'];

const empty: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> = {
  nom: '',
  type: 'ENTREPRISE',
  contactNom: '',
  email: '',
  telephone: '',
  adresse: '',
  ville: '',
  codePostal: '',
  siret: '',
  statut: 'PROSPECT',
  notes: '',
};

export default function Clients() {
  const data = useData();
  const toast = useToast();
  const can = useCan();
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(empty);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return data.clients.filter((c) => {
      const matchQ =
        !q ||
        c.nom.toLowerCase().includes(q) ||
        (c.ville ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q);
      const matchS = !filterStatut || c.statut === filterStatut;
      return matchQ && matchS;
    });
  }, [data.clients, search, filterStatut]);

  const countChantiers = (id: string) => data.chantiers.filter((c) => c.clientId === id).length;

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setModal(true);
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    const { id, createdAt, updatedAt, ...rest } = c;
    void id;
    void createdAt;
    void updatedAt;
    setForm({ ...empty, ...rest });
    setModal(true);
  };

  const save = () => {
    if (!form.nom.trim()) {
      toast('Le nom du client est requis.', 'danger');
      return;
    }
    if (editing) {
      store.update('clients', editing.id, form);
      toast('Client mis à jour.', 'success');
    } else {
      store.create('clients', form);
      toast('Client créé.', 'success');
    }
    setModal(false);
  };

  const del = (c: Client) => {
    if (!confirm(`Supprimer le client « ${c.nom} » ?`)) return;
    store.remove('clients', c.id);
    toast('Client supprimé.', 'danger');
  };

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <PageHead
        title="Clients"
        subtitle={`${data.clients.length} clients — particuliers, entreprises et collectivités`}
        actions={
          <button className="btn btn--primary" onClick={openNew}>
            <Icon name="plus" size={16} /> Nouveau client
          </button>
        }
      />

      <div className="toolbar">
        <div className="toolbar__search">
          <Icon name="search" size={16} />
          <input
            placeholder="Rechercher un client, une ville…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="select" value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          {STATUTS.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </select>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState
            icon="clients"
            title="Aucun client"
            text="Ajoutez votre premier client pour démarrer."
            action={
              <button className="btn btn--primary" onClick={openNew}>
                <Icon name="plus" size={16} /> Nouveau client
              </button>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Contact</th>
                  <th>Ville</th>
                  <th>Chantiers</th>
                  <th>Statut</th>
                  <th style={{ width: 90 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="cell-strong">{c.nom}</div>
                      {c.email && <div className="cell-sub">{c.email}</div>}
                    </td>
                    <td>
                      <Badge tone="neutral">{humanize(c.type)}</Badge>
                    </td>
                    <td>
                      <div>{c.contactNom || '—'}</div>
                      <div className="cell-sub">{c.telephone}</div>
                    </td>
                    <td>{c.ville || '—'}</td>
                    <td>{countChantiers(c.id) || '—'}</td>
                    <td>
                      <StatusBadge status={c.statut} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn" onClick={() => openEdit(c)} aria-label="Modifier">
                          <Icon name="edit" size={15} />
                        </button>
                        {can.canDelete && (
                          <button className="icon-btn danger" onClick={() => del(c)} aria-label="Supprimer">
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
        title={editing ? 'Modifier le client' : 'Nouveau client'}
        onClose={() => setModal(false)}
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setModal(false)}>
              Annuler
            </button>
            <button className="btn btn--primary" onClick={save}>
              <Icon name="check" size={16} /> Enregistrer
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="field field--full">
            <label>Nom / Raison sociale *</label>
            <input value={form.nom} onChange={(e) => set('nom', e.target.value)} placeholder="Ex. Groupe Alami Promotion" />
          </div>
          <div className="field">
            <label>Type</label>
            <select value={form.type} onChange={(e) => set('type', e.target.value as ClientType)}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {humanize(t)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Statut</label>
            <select value={form.statut} onChange={(e) => set('statut', e.target.value as ClientStatut)}>
              {STATUTS.map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Personne de contact</label>
            <input value={form.contactNom} onChange={(e) => set('contactNom', e.target.value)} />
          </div>
          <div className="field">
            <label>SIRET / RC</label>
            <input value={form.siret} onChange={(e) => set('siret', e.target.value)} />
          </div>
          <div className="field">
            <label>E-mail</label>
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div className="field">
            <label>Téléphone</label>
            <input value={form.telephone} onChange={(e) => set('telephone', e.target.value)} />
          </div>
          <div className="field">
            <label>Ville</label>
            <input value={form.ville} onChange={(e) => set('ville', e.target.value)} />
          </div>
          <div className="field">
            <label>Code postal</label>
            <input value={form.codePostal} onChange={(e) => set('codePostal', e.target.value)} />
          </div>
          <div className="field field--full">
            <label>Adresse</label>
            <input value={form.adresse} onChange={(e) => set('adresse', e.target.value)} />
          </div>
          <div className="field field--full">
            <label>Notes</label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
        </div>
      </Modal>
    </>
  );
}
