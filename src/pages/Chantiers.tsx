import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { store, useData } from '@/lib/store';
import type { Chantier, ChantierStatut } from '@/lib/types';
import { eur, formatDate, humanize } from '@/lib/format';
import { PageHead } from '@/components/ui/Page';
import { StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, Progress } from '@/components/ui/Misc';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { useCan } from '@/lib/roles';
import { NouvelleAffaireParticulier } from '@/components/NouvelleAffaireParticulier';

const STATUTS: ChantierStatut[] = ['PLANIFIE', 'EN_COURS', 'SUSPENDU', 'TERMINE', 'ANNULE'];

const empty: Omit<Chantier, 'id' | 'createdAt' | 'updatedAt'> = {
  nom: '',
  reference: '',
  clientId: '',
  adresse: '',
  ville: '',
  dateDebut: '',
  dateFinPrevue: '',
  budget: 0,
  avancement: 0,
  statut: 'PLANIFIE',
  chefProjet: '',
  description: '',
};

export default function Chantiers() {
  const data = useData();
  const toast = useToast();
  const navigate = useNavigate();
  const can = useCan();
  const [filterStatut, setFilterStatut] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Chantier | null>(null);
  const [form, setForm] = useState(empty);
  const [affaire, setAffaire] = useState(false);

  const clientName = (id: string) => data.clients.find((c) => c.id === id)?.nom ?? '—';

  const filtered = data.chantiers.filter((c) => {
    const q = search.toLowerCase();
    const matchQ = !q || c.nom.toLowerCase().includes(q) || (c.ville ?? '').toLowerCase().includes(q);
    return matchQ && (!filterStatut || c.statut === filterStatut);
  });

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty, reference: `CH-2026-${String(data.chantiers.length + 1).padStart(2, '0')}`, clientId: data.clients[0]?.id ?? '' });
    setModal(true);
  };
  const openEdit = (c: Chantier) => {
    setEditing(c);
    const { id, createdAt, updatedAt, ...rest } = c;
    void id; void createdAt; void updatedAt;
    setForm({ ...empty, ...rest });
    setModal(true);
  };
  const save = () => {
    if (!form.nom.trim() || !form.clientId) {
      toast('Nom et client requis.', 'danger');
      return;
    }
    if (editing) {
      store.update('chantiers', editing.id, form);
      toast('Chantier mis à jour.', 'success');
    } else {
      store.create('chantiers', form);
      toast('Chantier créé.', 'success');
    }
    setModal(false);
  };
  const del = (c: Chantier) => {
    if (!confirm(`Supprimer le chantier « ${c.nom} » ?`)) return;
    store.remove('chantiers', c.id);
    toast('Chantier supprimé.', 'danger');
  };
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <PageHead
        title="Projets"
        subtitle="Vos projets (chantiers) — cœur de l’activité du bureau d’études"
        actions={
          <>
            <button className="btn btn--ghost" onClick={() => setAffaire(true)} title="Créer client + projet + devis villa">
              <Icon name="building" size={16} /> Affaire particulier
            </button>
            <button className="btn btn--primary" onClick={openNew}>
              <Icon name="plus" size={16} /> Nouveau projet
            </button>
          </>
        }
      />

      <NouvelleAffaireParticulier
        open={affaire}
        onClose={() => setAffaire(false)}
        onCreated={(id) => {
          setAffaire(false);
          navigate(`/projets/${id}`);
        }}
      />

      <div className="toolbar">
        <div className="toolbar__search">
          <Icon name="search" size={16} />
          <input placeholder="Rechercher un chantier…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select" value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          {STATUTS.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon="chantier" title="Aucun chantier" />
        </div>
      ) : (
        <div className="chantier-grid">
          {filtered.map((c) => {
            const nbTaches = data.taches.filter((t) => t.chantierId === c.id).length;
            return (
              <div
                key={c.id}
                className="chantier-card"
                onClick={() => navigate(`/projets/${c.id}`)}
                title="Ouvrir la fiche projet"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div>
                    <div className="cell-sub">{c.reference}</div>
                    <h3 style={{ fontSize: 15, marginTop: 2 }}>{c.nom}</h3>
                  </div>
                  <StatusBadge status={c.statut} />
                </div>
                <div className="cell-sub" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <Icon name="pin" size={14} /> {c.ville || '—'} · {clientName(c.clientId)}
                </div>
                <div style={{ margin: '14px 0 10px' }}>
                  <Progress value={c.avancement} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
                  <div>
                    <div className="cell-sub">Échéance</div>
                    <div className="cell-strong">{formatDate(c.dateFinPrevue)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="cell-sub">{nbTaches} tâche{nbTaches > 1 ? 's' : ''}</div>
                    <div className="cell-strong">{eur(c.budget)}</div>
                  </div>
                </div>
                <div className="row-actions" style={{ marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
                  <button className="btn btn--ghost btn--sm" onClick={() => navigate(`/projets/${c.id}`)}>
                    <Icon name="dashboard" size={14} /> Fiche projet
                  </button>
                  <div style={{ flex: 1 }} />
                  <button className="icon-btn" onClick={() => openEdit(c)} aria-label="Modifier">
                    <Icon name="edit" size={15} />
                  </button>
                  {can.canDelete && (
                    <button className="icon-btn danger" onClick={() => del(c)} aria-label="Supprimer">
                      <Icon name="trash" size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modale de création / édition */}
      <Modal
        open={modal}
        large
        title={editing ? 'Modifier le chantier' : 'Nouveau chantier'}
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
            <label>Référence</label>
            <input value={form.reference} onChange={(e) => set('reference', e.target.value)} />
          </div>
          <div className="field">
            <label>Client *</label>
            <select value={form.clientId} onChange={(e) => set('clientId', e.target.value)}>
              <option value="">— Choisir —</option>
              {data.clients.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <div className="field field--full">
            <label>Nom du chantier *</label>
            <input value={form.nom} onChange={(e) => set('nom', e.target.value)} />
          </div>
          <div className="field">
            <label>Ville</label>
            <input value={form.ville} onChange={(e) => set('ville', e.target.value)} />
          </div>
          <div className="field">
            <label>Adresse</label>
            <input value={form.adresse} onChange={(e) => set('adresse', e.target.value)} />
          </div>
          <div className="field">
            <label>Chef de projet</label>
            <input value={form.chefProjet} onChange={(e) => set('chefProjet', e.target.value)} />
          </div>
          <div className="field">
            <label>Budget (MAD)</label>
            <input type="number" value={form.budget} onChange={(e) => set('budget', Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Date de début</label>
            <input type="date" value={form.dateDebut} onChange={(e) => set('dateDebut', e.target.value)} />
          </div>
          <div className="field">
            <label>Fin prévue</label>
            <input type="date" value={form.dateFinPrevue} onChange={(e) => set('dateFinPrevue', e.target.value)} />
          </div>
          <div className="field">
            <label>Avancement : {form.avancement}%</label>
            <input type="range" min={0} max={100} value={form.avancement} onChange={(e) => set('avancement', Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Statut</label>
            <select value={form.statut} onChange={(e) => set('statut', e.target.value as ChantierStatut)}>
              {STATUTS.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
            </select>
          </div>
          <div className="field field--full">
            <label>Description</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
        </div>
      </Modal>
    </>
  );
}
