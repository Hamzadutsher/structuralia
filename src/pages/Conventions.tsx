import { useState } from 'react';
import { store, useData } from '@/lib/store';
import type { Convention, ConventionStatut } from '@/lib/types';
import { eur, formatDate, humanize } from '@/lib/format';
import { PageHead } from '@/components/ui/Page';
import { StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/Misc';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { useCan } from '@/lib/roles';
import { exportConventionPdf } from '@/lib/convention-doc';
import { CatalogPicker } from '@/components/CatalogPicker';
import { totalHT } from '@/components/ui/LignesEditor';
import type { LigneDevis } from '@/lib/types';

const STATUTS: ConventionStatut[] = ['BROUILLON', 'ACTIVE', 'EXPIREE', 'RESILIEE'];

const empty: Omit<Convention, 'id' | 'createdAt' | 'updatedAt'> = {
  reference: '',
  objet: '',
  clientId: '',
  dateDebut: '',
  dateFin: '',
  montant: 0,
  statut: 'BROUILLON',
  fichierUrl: '',
  notes: '',
  prestations: [] as LigneDevis[],
};

export default function Conventions() {
  const data = useData();
  const toast = useToast();
  const can = useCan();
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [modal, setModal] = useState(false);
  const [picker, setPicker] = useState(false);
  const [editing, setEditing] = useState<Convention | null>(null);
  const [form, setForm] = useState(empty);

  const clientObj = (id: string) => data.clients.find((c) => c.id === id);
  const clientName = (id: string) => clientObj(id)?.nom ?? '—';

  // Crée une convention à partir de prestations retenues (le contrat les détaille).
  const creerDepuisPrestations = (lignes: LigneDevis[]) => {
    const montant = totalHT(lignes);
    const created = store.create('conventions', {
      reference: `CONV-2026-${10 + data.conventions.length + 1}`,
      objet: 'Études techniques et suivi des travaux',
      clientId: data.clients[0]?.id ?? '',
      dateDebut: new Date().toISOString().slice(0, 10),
      dateFin: '',
      montant,
      statut: 'BROUILLON',
      fichierUrl: '',
      notes: '',
      prestations: lignes,
    });
    openEdit(created);
    toast('Convention créée depuis les prestations — complétez le client puis générez le contrat.', 'success');
  };

  const filtered = data.conventions.filter((c) => {
    const q = search.toLowerCase();
    const matchQ = !q || c.reference.toLowerCase().includes(q) || c.objet.toLowerCase().includes(q) || clientName(c.clientId).toLowerCase().includes(q);
    return matchQ && (!filterStatut || c.statut === filterStatut);
  });

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty, reference: `CONV-2026-${10 + data.conventions.length + 1}`, clientId: data.clients[0]?.id ?? '' });
    setModal(true);
  };
  const openEdit = (c: Convention) => {
    setEditing(c);
    const { id, createdAt, updatedAt, ...rest } = c;
    void id; void createdAt; void updatedAt;
    setForm({ ...empty, ...rest });
    setModal(true);
  };
  const save = () => {
    if (!form.reference.trim() || !form.clientId) {
      toast('Référence et client requis.', 'danger');
      return;
    }
    if (editing) {
      store.update('conventions', editing.id, form);
      toast('Convention mise à jour.', 'success');
    } else {
      store.create('conventions', form);
      toast('Convention créée.', 'success');
    }
    setModal(false);
  };
  const del = (c: Convention) => {
    if (!confirm(`Supprimer la convention ${c.reference} ?`)) return;
    store.remove('conventions', c.id);
    toast('Convention supprimée.', 'danger');
  };
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <PageHead
        title="Conventions"
        subtitle="Conventions et contrats clients du bureau d’études"
        actions={
          <>
            <button className="btn btn--ghost" onClick={() => setPicker(true)}>
              <Icon name="devis" size={16} /> Depuis des prestations
            </button>
            <button className="btn btn--primary" onClick={openNew}>
              <Icon name="plus" size={16} /> Nouvelle convention
            </button>
          </>
        }
      />

      <CatalogPicker open={picker} onClose={() => setPicker(false)} onAdd={creerDepuisPrestations} />

      <div className="toolbar">
        <div className="toolbar__search">
          <Icon name="search" size={16} />
          <input placeholder="Rechercher une convention…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select" value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          {STATUTS.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
        </select>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState icon="convention" title="Aucune convention" />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Objet</th>
                  <th>Client</th>
                  <th>Période</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th style={{ width: 90 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td className="cell-strong">{c.reference}</td>
                    <td>{c.objet}</td>
                    <td>{clientName(c.clientId)}</td>
                    <td className="cell-sub">{formatDate(c.dateDebut)} → {formatDate(c.dateFin)}</td>
                    <td className="cell-strong">{eur(c.montant)}</td>
                    <td><StatusBadge status={c.statut} /></td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn" onClick={() => exportConventionPdf(c, clientObj(c.clientId))} aria-label="Générer le contrat" title="Générer le contrat (PDF)">
                          <Icon name="download" size={15} />
                        </button>
                        <button className="icon-btn" onClick={() => openEdit(c)} aria-label="Modifier"><Icon name="edit" size={15} /></button>
                        {can.canDelete && (
                          <button className="icon-btn danger" onClick={() => del(c)} aria-label="Supprimer"><Icon name="trash" size={15} /></button>
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
        title={editing ? 'Modifier la convention' : 'Nouvelle convention'}
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
            <label>Référence *</label>
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
            <label>Objet</label>
            <input value={form.objet} onChange={(e) => set('objet', e.target.value)} />
          </div>
          <div className="field">
            <label>Date de début</label>
            <input type="date" value={form.dateDebut} onChange={(e) => set('dateDebut', e.target.value)} />
          </div>
          <div className="field">
            <label>Date de fin</label>
            <input type="date" value={form.dateFin} onChange={(e) => set('dateFin', e.target.value)} />
          </div>
          <div className="field">
            <label>Montant (MAD)</label>
            <input type="number" value={form.montant} onChange={(e) => set('montant', Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Statut</label>
            <select value={form.statut} onChange={(e) => set('statut', e.target.value as ConventionStatut)}>
              {STATUTS.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
            </select>
          </div>
          {form.prestations && form.prestations.length > 0 && (
            <div className="field field--full">
              <label>Prestations rattachées</label>
              <div className="detail" style={{ background: 'var(--primary-50)' }}>
                {form.prestations.length} prestation(s) — détaillées dans le contrat généré · Total HT {eur(totalHT(form.prestations))}
              </div>
            </div>
          )}
          <div className="field field--full">
            <label>Notes</label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
        </div>
      </Modal>
    </>
  );
}
