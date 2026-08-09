import { useState } from 'react';
import { store, useData } from '@/lib/store';
import type { Tache, TachePriorite, TacheStatut } from '@/lib/types';
import { formatDate, humanize, daysUntil } from '@/lib/format';
import { PageHead } from '@/components/ui/Page';
import { StatusBadge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { useCan } from '@/lib/roles';
import { PvGenerator } from '@/components/PvGenerator';
import { PV_LABELS, exportPv, type PvData, type PvType } from '@/lib/pv';
import type { Pv } from '@/lib/types';

const COLONNES: { key: TacheStatut; label: string }[] = [
  { key: 'A_FAIRE', label: 'À faire' },
  { key: 'EN_COURS', label: 'En cours' },
  { key: 'BLOQUE', label: 'Bloqué' },
  { key: 'TERMINE', label: 'Terminé' },
];
const PRIORITES: TachePriorite[] = ['BASSE', 'NORMALE', 'HAUTE', 'CRITIQUE'];
const STATUTS: TacheStatut[] = ['A_FAIRE', 'EN_COURS', 'BLOQUE', 'TERMINE'];

const empty: Omit<Tache, 'id' | 'createdAt' | 'updatedAt'> = {
  titre: '',
  description: '',
  chantierId: '',
  responsable: '',
  dateDebut: '',
  dateEcheance: '',
  avancement: 0,
  priorite: 'NORMALE',
  statut: 'A_FAIRE',
};

export default function Suivi() {
  const data = useData();
  const toast = useToast();
  const can = useCan();
  const [chantierId, setChantierId] = useState('ALL');
  const [pvOpen, setPvOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Tache | null>(null);
  const [form, setForm] = useState(empty);

  const chantierName = (id: string) => data.chantiers.find((c) => c.id === id)?.nom ?? '—';

  const visible = data.taches.filter((t) => chantierId === 'ALL' || t.chantierId === chantierId);

  const openNew = (statut: TacheStatut = 'A_FAIRE') => {
    setEditing(null);
    setForm({
      ...empty,
      statut,
      chantierId: chantierId !== 'ALL' ? chantierId : data.chantiers[0]?.id ?? '',
    });
    setModal(true);
  };
  const openEdit = (t: Tache) => {
    setEditing(t);
    const { id, createdAt, updatedAt, ...rest } = t;
    void id; void createdAt; void updatedAt;
    setForm({ ...empty, ...rest });
    setModal(true);
  };
  const save = () => {
    if (!form.titre.trim() || !form.chantierId) {
      toast('Titre et chantier requis.', 'danger');
      return;
    }
    const avancement = form.statut === 'TERMINE' ? 100 : form.avancement;
    if (editing) {
      store.update('taches', editing.id, { ...form, avancement });
      toast('Tâche mise à jour.', 'success');
    } else {
      store.create('taches', { ...form, avancement });
      toast('Tâche créée.', 'success');
    }
    setModal(false);
  };
  const del = (t: Tache) => {
    if (!confirm(`Supprimer la tâche « ${t.titre} » ?`)) return;
    store.remove('taches', t.id);
    toast('Tâche supprimée.', 'danger');
  };
  const move = (t: Tache, statut: TacheStatut) => {
    store.update('taches', t.id, { statut, avancement: statut === 'TERMINE' ? 100 : t.avancement });
  };
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const chantierTabs = [
    { key: 'ALL', label: 'Tous les chantiers', count: data.taches.length },
    ...data.chantiers
      .filter((c) => c.statut === 'EN_COURS' || c.statut === 'PLANIFIE')
      .map((c) => ({ key: c.id, label: c.nom, count: data.taches.filter((t) => t.chantierId === c.id).length })),
  ];

  return (
    <>
      <PageHead
        title="Suivi des travaux"
        subtitle="Pilotage des tâches de chantier et documents de contrôle"
        actions={
          <>
            <button className="btn btn--ghost" onClick={() => setPvOpen(true)}>
              <Icon name="convention" size={16} /> Document de contrôle
            </button>
            <button className="btn btn--primary" onClick={() => openNew()}>
              <Icon name="plus" size={16} /> Nouvelle tâche
            </button>
          </>
        }
      />

      <Tabs active={chantierId} onChange={setChantierId} tabs={chantierTabs} />

      <div className="board">
        {COLONNES.map((col) => {
          const items = visible.filter((t) => t.statut === col.key);
          return (
            <div key={col.key} className="board__col">
              <div className="board__col-head">
                <span>{col.label}</span>
                <span className="tab__count">{items.length}</span>
              </div>
              {items.map((t) => {
                const dj = daysUntil(t.dateEcheance);
                const late = dj !== null && dj < 0 && t.statut !== 'TERMINE';
                return (
                  <div key={t.id} className="task-card" onClick={() => openEdit(t)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                      <h4>{t.titre}</h4>
                      <StatusBadge status={t.priorite} />
                    </div>
                    {chantierId === 'ALL' && <div className="cell-sub">{chantierName(t.chantierId)}</div>}
                    <div className="task-card__meta">
                      <span style={{ color: late ? 'var(--danger)' : undefined }}>
                        <Icon name="calendar" size={12} /> {formatDate(t.dateEcheance)}
                      </span>
                      <span>{t.responsable}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
                      {col.key !== 'A_FAIRE' && (
                        <button
                          className="btn btn--ghost btn--sm"
                          title="Reculer"
                          onClick={() => move(t, prevStatut(col.key))}
                        >
                          ←
                        </button>
                      )}
                      {col.key !== 'TERMINE' && (
                        <button
                          className="btn btn--ghost btn--sm"
                          title="Avancer"
                          onClick={() => move(t, nextStatut(col.key))}
                        >
                          →
                        </button>
                      )}
                      <div style={{ flex: 1 }} />
                      {can.canDelete && (
                        <button className="icon-btn danger" onClick={() => del(t)} aria-label="Supprimer">
                          <Icon name="trash" size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              <button className="btn btn--ghost btn--sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => openNew(col.key)}>
                <Icon name="plus" size={14} /> Ajouter
              </button>
            </div>
          );
        })}
      </div>

      <PvRegistre chantierId={chantierId} />

      <Modal
        open={modal}
        title={editing ? 'Modifier la tâche' : 'Nouvelle tâche'}
        onClose={() => setModal(false)}
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setModal(false)}>Annuler</button>
            <button className="btn btn--primary" onClick={save}><Icon name="check" size={16} /> Enregistrer</button>
          </>
        }
      >
        <div className="form-grid">
          <div className="field field--full">
            <label>Titre *</label>
            <input value={form.titre} onChange={(e) => set('titre', e.target.value)} />
          </div>
          <div className="field">
            <label>Chantier *</label>
            <select value={form.chantierId} onChange={(e) => set('chantierId', e.target.value)}>
              <option value="">— Choisir —</option>
              {data.chantiers.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Responsable</label>
            <input value={form.responsable} onChange={(e) => set('responsable', e.target.value)} />
          </div>
          <div className="field">
            <label>Priorité</label>
            <select value={form.priorite} onChange={(e) => set('priorite', e.target.value as TachePriorite)}>
              {PRIORITES.map((p) => <option key={p} value={p}>{humanize(p)}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Statut</label>
            <select value={form.statut} onChange={(e) => set('statut', e.target.value as TacheStatut)}>
              {STATUTS.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Date de début</label>
            <input type="date" value={form.dateDebut} onChange={(e) => set('dateDebut', e.target.value)} />
          </div>
          <div className="field">
            <label>Échéance</label>
            <input type="date" value={form.dateEcheance} onChange={(e) => set('dateEcheance', e.target.value)} />
          </div>
          <div className="field field--full">
            <label>Avancement : {form.avancement}%</label>
            <input type="range" min={0} max={100} value={form.avancement} onChange={(e) => set('avancement', Number(e.target.value))} />
          </div>
          <div className="field field--full">
            <label>Description</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
        </div>
      </Modal>

      <PvGenerator
        open={pvOpen}
        onClose={() => setPvOpen(false)}
        chantiers={data.chantiers}
        clients={data.clients}
        defaultChantierId={chantierId !== 'ALL' ? chantierId : undefined}
        existingPvs={data.pvs}
        onSavePv={(pv) => store.create('pvs', pv)}
        onArchive={(doc) => store.create('documents', { ...doc, type: 'pdf', notes: 'Document de contrôle généré depuis le suivi.' })}
        onDone={(msg) => toast(msg, 'success')}
      />
    </>
  );
}

function PvRegistre({ chantierId }: { chantierId: string }) {
  const data = useData();
  const toast = useToast();
  const can = useCan();

  const chantierNom = (id: string) => data.chantiers.find((c) => c.id === id)?.nom ?? '—';
  const pvs = (data.pvs ?? [])
    .filter((p) => chantierId === 'ALL' || p.chantierId === chantierId)
    .slice()
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

  const reprint = (p: Pv) => {
    // Le payload contient le PvData complet ; on le réimprime à l'identique.
    exportPv(p.payload as PvData);
  };
  const del = (p: Pv) => {
    if (!confirm(`Supprimer le document « ${p.reference} » du registre ?`)) return;
    store.remove('pvs', p.id);
    toast('Document retiré du registre.', 'danger');
  };

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card--pad" style={{ paddingBottom: 4 }}>
        <div className="section-title" style={{ marginBottom: 0 }}>
          <Icon name="convention" size={18} /> Registre des documents de contrôle
          <span className="tab__count" style={{ marginLeft: 8 }}>{pvs.length}</span>
        </div>
      </div>
      {pvs.length === 0 ? (
        <div style={{ padding: '8px 20px 24px' }} className="cell-sub">
          Aucun document de contrôle émis pour cette sélection. Utilisez « Document de contrôle » pour en générer un.
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Type</th>
                <th>Chantier</th>
                <th>Ouvrage / zone</th>
                <th>Date</th>
                <th>Contrôleur</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {pvs.map((p) => {
                const payload = p.payload as PvData;
                return (
                  <tr key={p.id}>
                    <td className="cell-strong">{p.reference}</td>
                    <td>{PV_LABELS[p.type as PvType] ?? p.type}</td>
                    <td>{chantierNom(p.chantierId)}</td>
                    <td className="cell-sub">{payload?.ouvrage || '—'}</td>
                    <td>{formatDate(p.date)}</td>
                    <td>{p.controleur || '—'}</td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn" onClick={() => reprint(p)} aria-label="Ré-imprimer" title="Ré-imprimer / PDF">
                          <Icon name="download" size={15} />
                        </button>
                        {can.canDelete && (
                          <button className="icon-btn danger" onClick={() => del(p)} aria-label="Supprimer">
                            <Icon name="trash" size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function nextStatut(s: TacheStatut): TacheStatut {
  const order: TacheStatut[] = ['A_FAIRE', 'EN_COURS', 'BLOQUE', 'TERMINE'];
  // parcours logique : A_FAIRE → EN_COURS → TERMINE ; BLOQUE → EN_COURS
  if (s === 'A_FAIRE') return 'EN_COURS';
  if (s === 'EN_COURS') return 'TERMINE';
  if (s === 'BLOQUE') return 'EN_COURS';
  return order[order.length - 1];
}
function prevStatut(s: TacheStatut): TacheStatut {
  if (s === 'TERMINE') return 'EN_COURS';
  if (s === 'BLOQUE') return 'A_FAIRE';
  if (s === 'EN_COURS') return 'A_FAIRE';
  return 'A_FAIRE';
}
