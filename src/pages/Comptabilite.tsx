import { useMemo, useState } from 'react';
import { store, useData } from '@/lib/store';
import type { Depense, DepenseCategorie, DepenseType, DepenseStatut } from '@/lib/types';
import { eur, eurShort, formatDate, humanize } from '@/lib/format';
import { PageHead, StatCard } from '@/components/ui/Page';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/Misc';
import { BarList, type BarItem } from '@/components/ui/BarList';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { useCan } from '@/lib/roles';

const TYPES: DepenseType[] = ['ACHAT', 'DEPLACEMENT', 'CHARGE'];
const CATS: DepenseCategorie[] = [
  'FOURNITURES', 'SOUS_TRAITANCE', 'DEPLACEMENT', 'CARBURANT', 'MATERIEL',
  'LOGICIELS', 'LOYER', 'HONORAIRES', 'IMPOTS_TAXES', 'SALAIRES', 'DIVERS',
];
const STATUTS: DepenseStatut[] = ['PAYEE', 'A_PAYER'];
const PAIEMENTS = ['Virement', 'Chèque', 'Espèces', 'Carte'];
const TYPE_LABEL: Record<DepenseType, string> = { ACHAT: 'Achat', DEPLACEMENT: 'Déplacement', CHARGE: 'Charge' };

const year = (iso?: string) => (iso ? new Date(iso).getFullYear() : 0);

const empty: Omit<Depense, 'id' | 'createdAt' | 'updatedAt'> = {
  date: new Date().toISOString().slice(0, 10),
  type: 'ACHAT',
  categorie: 'FOURNITURES',
  libelle: '',
  fournisseur: '',
  reference: '',
  montantHT: 0,
  tauxTVA: 20,
  montantTTC: 0,
  chantierId: '',
  moyenPaiement: 'Virement',
  statut: 'PAYEE',
  notes: '',
};

export default function Comptabilite() {
  const data = useData();
  const toast = useToast();
  const can = useCan();
  const nowYear = new Date().getFullYear();
  const [exercice, setExercice] = useState(nowYear);
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Depense | null>(null);
  const [form, setForm] = useState(empty);

  const chantierName = (id?: string) => data.chantiers.find((c) => c.id === id)?.nom ?? '—';

  const annees = useMemo(() => {
    const set = new Set<number>([nowYear]);
    data.depenses.forEach((d) => set.add(year(d.date)));
    data.factures.forEach((f) => set.add(year(f.dateEmission)));
    return [...set].filter(Boolean).sort((a, b) => b - a);
  }, [data.depenses, data.factures, nowYear]);

  const depensesExercice = data.depenses.filter((d) => year(d.date) === exercice);

  const kpi = useMemo(() => {
    const depTTC = depensesExercice.reduce((s, d) => s + (d.montantTTC || 0), 0);
    const parType = (t: DepenseType) => depensesExercice.filter((d) => d.type === t).reduce((s, d) => s + d.montantTTC, 0);
    const recettes = data.factures
      .filter((f) => year(f.dateEmission) === exercice)
      .reduce((s, f) => s + (f.montantPaye || 0), 0);
    return { depTTC, recettes, resultat: recettes - depTTC, achats: parType('ACHAT'), deplacements: parType('DEPLACEMENT'), charges: parType('CHARGE') };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depensesExercice, data.factures, exercice]);

  const parCategorie = useMemo<BarItem[]>(() => {
    const map = new Map<string, number>();
    depensesExercice.forEach((d) => map.set(d.categorie, (map.get(d.categorie) ?? 0) + d.montantTTC));
    return [...map.entries()].map(([c, v]) => ({ label: humanize(c), value: v, display: eurShort(v) })).sort((a, b) => b.value - a.value).slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depensesExercice]);

  const filtered = depensesExercice
    .filter((d) => !filterType || d.type === filterType)
    .filter((d) => {
      const q = search.toLowerCase();
      return !q || d.libelle.toLowerCase().includes(q) || (d.fournisseur ?? '').toLowerCase().includes(q);
    })
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty, date: `${exercice}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01` });
    setModal(true);
  };
  const openEdit = (d: Depense) => {
    setEditing(d);
    const { id, createdAt, updatedAt, ...rest } = d;
    void id; void createdAt; void updatedAt;
    setForm({ ...empty, ...rest });
    setModal(true);
  };
  const save = () => {
    if (!form.libelle.trim()) {
      toast('Le libellé est requis.', 'danger');
      return;
    }
    const montantTTC = Math.round(form.montantHT * (1 + form.tauxTVA / 100));
    const payload = { ...form, montantTTC };
    if (editing) {
      store.update('depenses', editing.id, payload);
      toast('Dépense mise à jour.', 'success');
    } else {
      store.create('depenses', payload);
      toast('Dépense enregistrée.', 'success');
    }
    setModal(false);
  };
  const del = (d: Depense) => {
    if (!confirm(`Supprimer la dépense « ${d.libelle} » ?`)) return;
    store.remove('depenses', d.id);
    toast('Dépense supprimée.', 'danger');
  };
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <PageHead
        title="Comptabilité interne"
        subtitle="Dépenses, achats et frais — synthèse par exercice"
        actions={
          <>
            <select className="select" value={exercice} onChange={(e) => setExercice(Number(e.target.value))} aria-label="Exercice">
              {annees.map((a) => <option key={a} value={a}>Exercice {a}</option>)}
            </select>
            {can.canManageFacturation && (
              <button className="btn btn--primary" onClick={openNew}>
                <Icon name="plus" size={16} /> Nouvelle dépense
              </button>
            )}
          </>
        }
      />

      <div className="stat-grid">
        <StatCard icon="euro" value={eurShort(kpi.recettes)} label={`Recettes encaissées ${exercice}`} />
        <StatCard icon="facture" value={eurShort(kpi.depTTC)} label="Dépenses (TTC)" />
        <StatCard icon="trending" value={eurShort(kpi.resultat)} label="Résultat (recettes − dépenses)" trendUp={kpi.resultat >= 0} trend={kpi.resultat >= 0 ? 'Bénéfice' : 'Déficit'} />
        <StatCard icon="chantier" value={eurShort(kpi.achats + kpi.deplacements)} label="Achats + déplacements" />
      </div>

      <div className="split" style={{ marginBottom: 20 }}>
        <div className="card card--pad">
          <div className="section-title"><Icon name="trending" size={18} /> Dépenses par catégorie ({exercice})</div>
          {parCategorie.length === 0 ? <p className="cell-sub">Aucune dépense sur cet exercice.</p> : <BarList items={parCategorie} />}
        </div>
        <div className="card card--pad">
          <div className="section-title"><Icon name="facture" size={18} /> Répartition</div>
          {(['ACHAT', 'DEPLACEMENT', 'CHARGE'] as DepenseType[]).map((t) => {
            const v = t === 'ACHAT' ? kpi.achats : t === 'DEPLACEMENT' ? kpi.deplacements : kpi.charges;
            return (
              <div key={t} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span className="cell-sub">{TYPE_LABEL[t]}</span><b>{eur(v)}</b>
              </div>
            );
          })}
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar__search">
          <Icon name="search" size={16} />
          <input placeholder="Rechercher (libellé, fournisseur)…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">Tous les types</option>
          {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState icon="facture" title="Aucune dépense" text={`Aucune dépense pour l'exercice ${exercice}.`} />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Libellé</th>
                  <th>Catégorie</th>
                  <th>Fournisseur</th>
                  <th>Projet</th>
                  <th>Montant TTC</th>
                  <th>Statut</th>
                  <th style={{ width: 90 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id}>
                    <td>{formatDate(d.date)}</td>
                    <td>
                      <div className="cell-strong">{d.libelle}</div>
                      {d.reference && <div className="cell-sub">{d.reference}</div>}
                    </td>
                    <td><Badge tone="neutral">{humanize(d.categorie)}</Badge></td>
                    <td>{d.fournisseur || '—'}</td>
                    <td className="cell-sub">{d.chantierId ? chantierName(d.chantierId) : '—'}</td>
                    <td className="cell-strong">{eur(d.montantTTC)}</td>
                    <td><StatusBadge status={d.statut} /></td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn" onClick={() => openEdit(d)} aria-label="Modifier"><Icon name="edit" size={15} /></button>
                        {can.canDelete && (
                          <button className="icon-btn danger" onClick={() => del(d)} aria-label="Supprimer"><Icon name="trash" size={15} /></button>
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
        large
        title={editing ? 'Modifier la dépense' : 'Nouvelle dépense'}
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
            <label>Date</label>
            <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </div>
          <div className="field">
            <label>Type</label>
            <select value={form.type} onChange={(e) => set('type', e.target.value as DepenseType)}>
              {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
          </div>
          <div className="field field--full">
            <label>Libellé *</label>
            <input value={form.libelle} onChange={(e) => set('libelle', e.target.value)} placeholder="Ex. Achat matériel topographique" />
          </div>
          <div className="field">
            <label>Catégorie</label>
            <select value={form.categorie} onChange={(e) => set('categorie', e.target.value as DepenseCategorie)}>
              {CATS.map((c) => <option key={c} value={c}>{humanize(c)}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Fournisseur</label>
            <input value={form.fournisseur} onChange={(e) => set('fournisseur', e.target.value)} />
          </div>
          <div className="field">
            <label>N° facture d'achat</label>
            <input value={form.reference} onChange={(e) => set('reference', e.target.value)} />
          </div>
          <div className="field">
            <label>Projet (optionnel)</label>
            <select value={form.chantierId} onChange={(e) => set('chantierId', e.target.value)}>
              <option value="">— Aucun —</option>
              {data.chantiers.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Montant HT (MAD)</label>
            <input type="number" value={form.montantHT} onChange={(e) => set('montantHT', Number(e.target.value))} />
          </div>
          <div className="field">
            <label>TVA (%)</label>
            <input type="number" value={form.tauxTVA} onChange={(e) => set('tauxTVA', Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Montant TTC (calculé)</label>
            <input disabled value={eur(form.montantHT * (1 + form.tauxTVA / 100))} />
          </div>
          <div className="field">
            <label>Moyen de paiement</label>
            <select value={form.moyenPaiement} onChange={(e) => set('moyenPaiement', e.target.value)}>
              {PAIEMENTS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Statut</label>
            <select value={form.statut} onChange={(e) => set('statut', e.target.value as DepenseStatut)}>
              {STATUTS.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
            </select>
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
