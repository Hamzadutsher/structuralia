import { useMemo, useRef, useState } from 'react';
import { store, useData } from '@/lib/store';
import type { Prestation } from '@/lib/types';
import { eur } from '@/lib/format';
import { SECTIONS_STANDARD } from '@/lib/catalog';
import { parseCsv, detectDelimiter, toCsv, downloadText } from '@/lib/csv';
import { PageHead } from '@/components/ui/Page';
import { Badge } from '@/components/ui/Badge';
import { BarList, type BarItem } from '@/components/ui/BarList';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/Misc';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { useCan } from '@/lib/roles';

const empty: Omit<Prestation, 'id' | 'createdAt' | 'updatedAt'> = {
  section: SECTIONS_STANDARD[0],
  designation: '',
  unite: 'U',
  prixUnitaire: 0,
  actif: true,
};

export default function Catalogue() {
  const data = useData();
  const toast = useToast();
  const can = useCan();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Prestation | null>(null);
  const [form, setForm] = useState(empty);
  const fileRef = useRef<HTMLInputElement>(null);

  // --- Export / Import CSV ---
  const exportCsv = () => {
    const rows = data.prestations.map((p) => [p.section, p.designation, p.unite ?? '', p.prixUnitaire, p.actif ? 'Active' : 'Inactive']);
    const csv = toCsv(['Mission', 'Désignation', 'Unité', 'Prix unitaire HT', 'État'], rows);
    downloadText('catalogue-prestations.csv', csv);
    toast('Catalogue exporté (CSV).', 'success');
  };

  const modeleCsv = () => {
    const csv = toCsv(
      ['Mission', 'Désignation', 'Unité', 'Prix unitaire HT', 'État'],
      [
        [SECTIONS_STANDARD[0], 'Étude technique structure BA', 'F', 12000, 'Active'],
        [SECTIONS_STANDARD[1], 'Suivi et réceptions des phases structure BA', 'U', 6500, 'Active'],
        [SECTIONS_STANDARD[2], 'Rapport de conformité électricité CFO', 'Ft', 1000, 'Active'],
      ],
    );
    downloadText('modele-catalogue.csv', csv);
    toast('Modèle CSV téléchargé.', 'success');
  };

  // Statistiques : prestations les plus valorisées (devis + factures).
  const stats = useMemo<BarItem[]>(() => {
    const map = new Map<string, number>();
    [...data.devis, ...data.factures].forEach((doc) =>
      (doc.lignes ?? []).forEach((l) => {
        if (!l.designation?.trim()) return;
        const key = l.designation.trim();
        map.set(key, (map.get(key) ?? 0) + (l.quantite || 0) * (l.prixUnitaire || 0));
      }),
    );
    return [...map.entries()]
      .map(([label, total]) => ({ label, value: total, display: eur(total) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [data.devis, data.factures]);

  const importCsv = async (file: File) => {
    try {
      const text = await file.text();
      const rows = parseCsv(text, detectDelimiter(text));
      if (rows.length < 2) {
        toast('Fichier CSV vide ou invalide.', 'danger');
        return;
      }
      let added = 0;
      let updated = 0;
      rows.slice(1).forEach((cols) => {
        const [section, designation, unite, prixStr, actifStr] = cols;
        if (!designation || !designation.trim()) return;
        const prixUnitaire = Number(String(prixStr ?? '').replace(/\s| /g, '').replace(',', '.')) || 0;
        const actif = !/inactif|^0$|false|non/i.test((actifStr ?? '').trim());
        const existing = data.prestations.find(
          (p) =>
            p.designation.trim().toLowerCase() === designation.trim().toLowerCase() &&
            p.section.trim().toLowerCase() === (section ?? '').trim().toLowerCase(),
        );
        if (existing) {
          store.update('prestations', existing.id, { unite: unite || existing.unite, prixUnitaire, actif });
          updated++;
        } else {
          store.create('prestations', { section: (section || 'AUTRES').trim(), designation: designation.trim(), unite: (unite || 'U').trim(), prixUnitaire, actif });
          added++;
        }
      });
      toast(`Import terminé : ${added} ajoutée(s), ${updated} mise(s) à jour.`, 'success');
    } catch {
      toast('Échec de la lecture du fichier CSV.', 'danger');
    }
  };

  const filtered = data.prestations.filter(
    (p) =>
      !search ||
      p.designation.toLowerCase().includes(search.toLowerCase()) ||
      p.section.toLowerCase().includes(search.toLowerCase()),
  );
  // Groupement par section (ordre d'apparition)
  const sections = [...new Set(filtered.map((p) => p.section))];

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setModal(true);
  };
  const openEdit = (p: Prestation) => {
    setEditing(p);
    const { id, createdAt, updatedAt, ...rest } = p;
    void id; void createdAt; void updatedAt;
    setForm({ ...empty, ...rest });
    setModal(true);
  };
  const save = () => {
    if (!form.designation.trim()) {
      toast('La désignation est requise.', 'danger');
      return;
    }
    if (editing) {
      store.update('prestations', editing.id, form);
      toast('Prestation mise à jour.', 'success');
    } else {
      store.create('prestations', form);
      toast('Prestation ajoutée au catalogue.', 'success');
    }
    setModal(false);
  };
  const del = (p: Prestation) => {
    if (!confirm(`Supprimer « ${p.designation} » du catalogue ?`)) return;
    store.remove('prestations', p.id);
    toast('Prestation supprimée.', 'danger');
  };
  const toggleActif = (p: Prestation) => store.update('prestations', p.id, { actif: !p.actif });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <PageHead
        title="Catalogue de prestations"
        subtitle="Vos prestations types — alimentent devis, factures et conventions"
        actions={
          <>
            <button className="btn btn--ghost" onClick={modeleCsv} title="Télécharger un modèle CSV">
              <Icon name="document" size={16} /> Modèle CSV
            </button>
            <button className="btn btn--ghost" onClick={exportCsv} title="Exporter le catalogue en CSV">
              <Icon name="download" size={16} /> Exporter CSV
            </button>
            {can.canManageFacturation && (
              <button className="btn btn--ghost" onClick={() => fileRef.current?.click()} title="Importer un catalogue CSV">
                <Icon name="folder" size={16} /> Importer CSV
              </button>
            )}
            {can.canManageFacturation && (
              <button className="btn btn--primary" onClick={openNew}>
                <Icon name="plus" size={16} /> Nouvelle prestation
              </button>
            )}
          </>
        }
      />

      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importCsv(f);
          e.target.value = '';
        }}
      />

      <div className="toolbar">
        <div className="toolbar__search">
          <Icon name="search" size={16} />
          <input placeholder="Rechercher une prestation…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="toolbar__spacer" />
        <span className="cell-sub">{data.prestations.length} prestation(s) · {data.prestations.filter((p) => p.actif).length} active(s)</span>
      </div>

      {stats.length > 0 && (
        <div className="card card--pad" style={{ marginBottom: 20 }}>
          <div className="section-title">
            <Icon name="trending" size={18} /> Prestations les plus facturées
            <span className="cell-sub" style={{ fontWeight: 400, marginLeft: 'auto' }}>Devis + factures · HT</span>
          </div>
          <BarList items={stats} />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card"><EmptyState icon="devis" title="Catalogue vide" text="Ajoutez vos prestations types." /></div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Désignation</th>
                  <th style={{ width: 70 }}>Unité</th>
                  <th style={{ width: 140 }}>P.U. HT</th>
                  <th style={{ width: 90 }}>État</th>
                  <th style={{ width: 100 }}></th>
                </tr>
              </thead>
              <tbody>
                {sections.map((sec) => (
                  <SectionRows
                    key={sec}
                    sec={sec}
                    rows={filtered.filter((p) => p.section === sec)}
                    canDelete={can.canDelete}
                    canManage={can.canManageFacturation}
                    onEdit={openEdit}
                    onDelete={del}
                    onToggle={toggleActif}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={modal}
        title={editing ? 'Modifier la prestation' : 'Nouvelle prestation'}
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
            <label>Mission / section</label>
            <input list="sections-catalog" value={form.section} onChange={(e) => set('section', e.target.value)} />
            <datalist id="sections-catalog">
              {SECTIONS_STANDARD.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div className="field field--full">
            <label>Désignation *</label>
            <input value={form.designation} onChange={(e) => set('designation', e.target.value)} placeholder="Ex. Étude technique structure BA" />
          </div>
          <div className="field">
            <label>Unité</label>
            <input value={form.unite} onChange={(e) => set('unite', e.target.value)} placeholder="U, F, Ft…" />
          </div>
          <div className="field">
            <label>Prix unitaire HT (MAD)</label>
            <input type="number" value={form.prixUnitaire} onChange={(e) => set('prixUnitaire', Number(e.target.value))} />
          </div>
          <div className="field">
            <label>État</label>
            <select value={form.actif ? '1' : '0'} onChange={(e) => set('actif', e.target.value === '1')}>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          </div>
        </div>
      </Modal>
    </>
  );
}

function SectionRows({
  sec,
  rows,
  canDelete,
  canManage,
  onEdit,
  onDelete,
  onToggle,
}: {
  sec: string;
  rows: Prestation[];
  canDelete: boolean;
  canManage: boolean;
  onEdit: (p: Prestation) => void;
  onDelete: (p: Prestation) => void;
  onToggle: (p: Prestation) => void;
}) {
  return (
    <>
      <tr className="sec-row">
        <td colSpan={5} className="sec-label">{sec}</td>
      </tr>
      {rows.map((p) => (
        <tr key={p.id} style={{ opacity: p.actif ? 1 : 0.55 }}>
          <td className="cell-strong">{p.designation}</td>
          <td>{p.unite || '—'}</td>
          <td className="cell-strong">{eur(p.prixUnitaire)}</td>
          <td>
            {p.actif ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Inactive</Badge>}
          </td>
          <td>
            <div className="row-actions">
              {canManage && (
                <button className="icon-btn" onClick={() => onToggle(p)} title={p.actif ? 'Désactiver' : 'Activer'} aria-label="Activer/Désactiver">
                  <Icon name={p.actif ? 'close' : 'check'} size={15} />
                </button>
              )}
              {canManage && (
                <button className="icon-btn" onClick={() => onEdit(p)} aria-label="Modifier"><Icon name="edit" size={15} /></button>
              )}
              {canDelete && (
                <button className="icon-btn danger" onClick={() => onDelete(p)} aria-label="Supprimer"><Icon name="trash" size={15} /></button>
              )}
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}
