import { useState } from 'react';
import { store, useData } from '@/lib/store';
import type { Devis, DevisStatut, Facture, FactureStatut } from '@/lib/types';
import { eur, eurShort, formatDate, humanize, daysUntil } from '@/lib/format';
import { PageHead, StatCard } from '@/components/ui/Page';
import { Tabs } from '@/components/ui/Tabs';
import { StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/Misc';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { useCan } from '@/lib/roles';
import { exportDevisPdf, exportFacturePdf, exportRelancePdf } from '@/lib/pdf';
import { LignesEditor, totalHT } from '@/components/ui/LignesEditor';
import { catalogLignes, prestationToLigne, villaLignes } from '@/lib/catalog';
import { CatalogPicker } from '@/components/CatalogPicker';
import { SituationFacturation } from '@/components/SituationFacturation';
import { exportConventionPdf } from '@/lib/convention-doc';
import type { LigneDevis } from '@/lib/types';

/** Fusionne des lignes ajoutées avec l'existant (en retirant les lignes vides). */
const mergeLignes = (existing: LigneDevis[], added: LigneDevis[]): LigneDevis[] => [
  ...(existing ?? []).filter((l) => l.designation.trim()),
  ...added,
];
import { buildRelanceText } from '@/lib/relance';
import type { Client } from '@/lib/types';

const DEVIS_STATUTS: DevisStatut[] = ['BROUILLON', 'ENVOYE', 'ACCEPTE', 'REFUSE', 'EXPIRE'];
const FAC_STATUTS: FactureStatut[] = ['BROUILLON', 'ENVOYEE', 'PAYEE', 'PARTIELLE', 'EN_RETARD', 'ANNULEE'];

export default function Facturation() {
  const data = useData();
  const [tab, setTab] = useState('devis');

  return (
    <>
      <PageHead
        title="Devis & Factures"
        subtitle="Gestion commerciale et facturation du bureau d’études"
      />

      <div className="stat-grid">
        <StatCard
          icon="devis"
          value={String(data.devis.filter((d) => d.statut === 'ENVOYE').length)}
          label="Devis en attente"
        />
        <StatCard
          icon="check"
          value={eurShort(data.devis.filter((d) => d.statut === 'ACCEPTE').reduce((s, d) => s + d.montantTTC, 0))}
          label="Devis acceptés (TTC)"
        />
        <StatCard
          icon="euro"
          value={eurShort(data.factures.reduce((s, f) => s + (f.montantPaye || 0), 0))}
          label="Encaissé"
        />
        <StatCard
          icon="alert"
          value={eurShort(
            data.factures
              .filter((f) => f.statut === 'EN_RETARD' || f.statut === 'PARTIELLE')
              .reduce((s, f) => s + (f.montantTTC - (f.montantPaye || 0)), 0),
          )}
          label="À recouvrer"
        />
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: 'devis', label: 'Devis', icon: 'devis', count: data.devis.length },
          { key: 'factures', label: 'Factures', icon: 'facture', count: data.factures.length },
          {
            key: 'echeancier',
            label: 'Échéancier',
            icon: 'calendar',
            count: data.factures.filter((f) => f.statut !== 'PAYEE' && f.statut !== 'ANNULEE').length,
          },
        ]}
      />

      {tab === 'devis' && <DevisTab goToFactures={() => setTab('factures')} />}
      {tab === 'factures' && <FacturesTab />}
      {tab === 'echeancier' && <EcheancierTab />}
    </>
  );
}

/* ------------------------------------------------------------------ Devis */

const emptyDevis: Omit<Devis, 'id' | 'createdAt' | 'updatedAt'> = {
  reference: '',
  objet: '',
  clientId: '',
  chantierId: '',
  dateEmission: '',
  dateValidite: '',
  montantHT: 0,
  tauxTVA: 20,
  remisePourcent: 0,
  montantTTC: 0,
  statut: 'BROUILLON',
  lignes: [],
  notes: '',
};

function DevisTab({ goToFactures }: { goToFactures: () => void }) {
  const data = useData();
  const toast = useToast();
  const can = useCan();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [picker, setPicker] = useState(false);
  const [editing, setEditing] = useState<Devis | null>(null);
  const [form, setForm] = useState(emptyDevis);
  const [situation, setSituation] = useState<Devis | null>(null);

  const clientObj = (id: string) => data.clients.find((c) => c.id === id);
  const clientName = (id: string) => clientObj(id)?.nom ?? '—';

  const dejaFactureHT = (devisId: string) =>
    data.factures.filter((f) => f.devisId === devisId && f.statut !== 'ANNULEE').reduce((s, f) => s + (f.montantHT || 0), 0);

  // Crée une facture de situation (partielle) à partir d'un devis.
  const creerSituation = (montantHT: number, lignes: Devis['lignes'], libelle: string) => {
    const d = situation;
    if (!d) return;
    store.create('factures', {
      reference: `FAC-2026-${50 + data.factures.length + 1}`,
      objet: `${d.objet} — ${libelle}`,
      clientId: d.clientId,
      chantierId: d.chantierId ?? '',
      devisId: d.id,
      dateEmission: new Date().toISOString().slice(0, 10),
      dateEcheance: '',
      montantHT,
      tauxTVA: d.tauxTVA,
      remisePourcent: 0,
      montantTTC: Math.round(montantHT * (1 + d.tauxTVA / 100)),
      montantPaye: 0,
      statut: 'BROUILLON',
      lignes,
      notes: `${libelle} — depuis le devis ${d.reference}.`,
    });
    toast('Facture (situation) créée.', 'success');
    setSituation(null);
    goToFactures();
  };

  // Génère une convention + contrat à partir d'un devis.
  const genererConvention = (d: Devis) => {
    const montant = totalHT(d.lignes) || d.montantHT;
    const created = store.create('conventions', {
      reference: `CONV-2026-${10 + data.conventions.length + 1}`,
      objet: d.objet,
      clientId: d.clientId,
      dateDebut: new Date().toISOString().slice(0, 10),
      dateFin: '',
      montant,
      statut: 'BROUILLON',
      fichierUrl: '',
      notes: `Convention générée depuis le devis ${d.reference}.`,
    });
    exportConventionPdf(created, clientObj(d.clientId));
    toast('Convention créée et contrat généré depuis le devis.', 'success');
  };

  const filtered = data.devis.filter(
    (d) =>
      !search ||
      d.reference.toLowerCase().includes(search.toLowerCase()) ||
      d.objet.toLowerCase().includes(search.toLowerCase()) ||
      clientName(d.clientId).toLowerCase().includes(search.toLowerCase()),
  );

  const openNew = () => {
    setEditing(null);
    setForm({
      ...emptyDevis,
      reference: `DEV-2026-${100 + data.devis.length + 1}`,
      clientId: data.clients[0]?.id ?? '',
      lignes: [{ designation: '', quantite: 1, prixUnitaire: 0 }],
    });
    setModal(true);
  };
  const openEdit = (d: Devis) => {
    setEditing(d);
    const { id, createdAt, updatedAt, ...rest } = d;
    void id; void createdAt; void updatedAt;
    const lignes =
      rest.lignes && rest.lignes.length > 0
        ? rest.lignes
        : [{ designation: rest.objet || 'Prestation', quantite: 1, prixUnitaire: rest.montantHT }];
    setForm({ ...emptyDevis, ...rest, lignes });
    setModal(true);
  };
  const save = () => {
    if (!form.reference.trim() || !form.clientId) {
      toast('Référence et client requis.', 'danger');
      return;
    }
    const brut = totalHT(form.lignes);
    const montantHT = Math.round(brut * (1 - (form.remisePourcent || 0) / 100));
    const montantTTC = Math.round(montantHT * (1 + form.tauxTVA / 100));
    const payload = { ...form, montantHT, montantTTC };
    if (editing) {
      store.update('devis', editing.id, payload);
      toast('Devis mis à jour.', 'success');
    } else {
      store.create('devis', payload);
      toast('Devis créé.', 'success');
    }
    setModal(false);
  };
  const del = (d: Devis) => {
    if (!confirm(`Supprimer le devis ${d.reference} ?`)) return;
    store.remove('devis', d.id);
    toast('Devis supprimé.', 'danger');
  };
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <div className="toolbar">
        <div className="toolbar__search">
          <Icon name="search" size={16} />
          <input placeholder="Rechercher un devis…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="toolbar__spacer" />
        {can.canManageFacturation && (
          <button className="btn btn--primary" onClick={openNew}>
            <Icon name="plus" size={16} /> Nouveau devis
          </button>
        )}
      </div>

      <CatalogPicker open={picker} onClose={() => setPicker(false)} onAdd={(l) => set('lignes', mergeLignes(form.lignes, l))} />

      <SituationFacturation
        open={!!situation}
        devis={situation}
        dejaFactureHT={situation ? dejaFactureHT(situation.id) : 0}
        chantierAvancement={
          situation?.chantierId ? data.chantiers.find((c) => c.id === situation.chantierId)?.avancement : undefined
        }
        onClose={() => setSituation(null)}
        onCreate={creerSituation}
      />

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState icon="devis" title="Aucun devis" />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Objet</th>
                  <th>Client</th>
                  <th>Émission</th>
                  <th>Montant TTC</th>
                  <th>Statut</th>
                  <th style={{ width: 90 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id}>
                    <td className="cell-strong">{d.reference}</td>
                    <td>{d.objet}</td>
                    <td>{clientName(d.clientId)}</td>
                    <td>{formatDate(d.dateEmission)}</td>
                    <td className="cell-strong">{eur(d.montantTTC)}</td>
                    <td><StatusBadge status={d.statut} /></td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn" onClick={() => exportDevisPdf(d, clientObj(d.clientId))} aria-label="Exporter PDF" title="Exporter en PDF">
                          <Icon name="download" size={15} />
                        </button>
                        {can.canManageFacturation && (
                          <>
                            <button className="icon-btn" onClick={() => setSituation(d)} aria-label="Facturer" title="Facturer (situation : avancement, phases, montant)">
                              <Icon name="facture" size={15} />
                            </button>
                            <button className="icon-btn" onClick={() => genererConvention(d)} aria-label="Convention" title="Générer une convention + contrat depuis ce devis">
                              <Icon name="convention" size={15} />
                            </button>
                            <button className="icon-btn" onClick={() => openEdit(d)} aria-label="Modifier"><Icon name="edit" size={15} /></button>
                          </>
                        )}
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
        title={editing ? 'Modifier le devis' : 'Nouveau devis'}
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
          <div className="field">
            <label>Projet / chantier</label>
            <select value={form.chantierId ?? ''} onChange={(e) => set('chantierId', e.target.value)}>
              <option value="">— Aucun —</option>
              {data.chantiers
                .filter((ch) => !form.clientId || ch.clientId === form.clientId)
                .map((ch) => <option key={ch.id} value={ch.id}>{ch.nom}</option>)}
            </select>
          </div>
          <div className="field field--full">
            <label>Objet</label>
            <input value={form.objet} onChange={(e) => set('objet', e.target.value)} />
          </div>
          <div className="field">
            <label>Date d’émission</label>
            <input type="date" value={form.dateEmission} onChange={(e) => set('dateEmission', e.target.value)} />
          </div>
          <div className="field">
            <label>Validité</label>
            <input type="date" value={form.dateValidite} onChange={(e) => set('dateValidite', e.target.value)} />
          </div>
          <div className="field">
            <label>TVA (%)</label>
            <input type="number" value={form.tauxTVA} onChange={(e) => set('tauxTVA', Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Remise (%)</label>
            <input type="number" min={0} max={100} value={form.remisePourcent} onChange={(e) => set('remisePourcent', Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Statut</label>
            <select value={form.statut} onChange={(e) => set('statut', e.target.value as DevisStatut)}>
              {DEVIS_STATUTS.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
            </select>
          </div>
          <div className="field field--full">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <label>Lignes de prestation</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPicker(true)} title="Choisir des prestations du catalogue">
                  <Icon name="plus" size={14} /> Choisir des prestations…
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => {
                    const cat = data.prestations.filter((p) => p.actif);
                    set('lignes', cat.length ? cat.map(prestationToLigne) : catalogLignes());
                  }}
                  title="Charger tout le catalogue de prestations"
                >
                  <Icon name="devis" size={14} /> Modèle complet
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => set('lignes', villaLignes())}
                  title="Prestations types pour une maison individuelle"
                >
                  <Icon name="building" size={14} /> Modèle villa
                </button>
              </div>
            </div>
            <LignesEditor value={form.lignes} onChange={(lignes) => set('lignes', lignes)} tauxTVA={form.tauxTVA} remisePourcent={form.remisePourcent} />
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

/* --------------------------------------------------------------- Factures */

const emptyFacture: Omit<Facture, 'id' | 'createdAt' | 'updatedAt'> = {
  reference: '',
  objet: '',
  clientId: '',
  chantierId: '',
  devisId: '',
  dateEmission: '',
  dateEcheance: '',
  montantHT: 0,
  tauxTVA: 20,
  remisePourcent: 0,
  montantTTC: 0,
  montantPaye: 0,
  statut: 'BROUILLON',
  lignes: [],
  notes: '',
};

function FacturesTab() {
  const data = useData();
  const toast = useToast();
  const can = useCan();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [picker, setPicker] = useState(false);
  const [editing, setEditing] = useState<Facture | null>(null);
  const [form, setForm] = useState(emptyFacture);

  const clientObj = (id: string) => data.clients.find((c) => c.id === id);
  const clientName = (id: string) => clientObj(id)?.nom ?? '—';

  // Remplissage automatique de la facture à partir d'un devis choisi.
  const chooseDevis = (devisId: string) => {
    const d = data.devis.find((x) => x.id === devisId);
    if (!d) {
      setForm((f) => ({ ...f, devisId: '' }));
      return;
    }
    const remise = d.remisePourcent || 0;
    const montantHT = Math.round((totalHT(d.lignes) || d.montantHT) * (1 - remise / 100));
    setForm((f) => ({
      ...f,
      devisId,
      clientId: d.clientId,
      chantierId: d.chantierId ?? '',
      objet: d.objet,
      lignes: d.lignes,
      tauxTVA: d.tauxTVA,
      remisePourcent: remise,
      montantHT,
      montantTTC: Math.round(montantHT * (1 + d.tauxTVA / 100)),
    }));
    toast('Facture pré-remplie depuis le devis.', 'success');
  };

  const filtered = data.factures.filter(
    (f) =>
      !search ||
      f.reference.toLowerCase().includes(search.toLowerCase()) ||
      clientName(f.clientId).toLowerCase().includes(search.toLowerCase()),
  );

  const openNew = () => {
    setEditing(null);
    setForm({
      ...emptyFacture,
      reference: `FAC-2026-${50 + data.factures.length + 1}`,
      clientId: data.clients[0]?.id ?? '',
      lignes: [{ designation: '', quantite: 1, prixUnitaire: 0 }],
    });
    setModal(true);
  };
  const openEdit = (f: Facture) => {
    setEditing(f);
    const { id, createdAt, updatedAt, ...rest } = f;
    void id; void createdAt; void updatedAt;
    const lignes =
      rest.lignes && rest.lignes.length > 0
        ? rest.lignes
        : [{ designation: rest.objet || 'Prestation', quantite: 1, prixUnitaire: rest.montantHT }];
    setForm({ ...emptyFacture, ...rest, lignes });
    setModal(true);
  };
  const save = () => {
    if (!form.reference.trim() || !form.clientId) {
      toast('Référence et client requis.', 'danger');
      return;
    }
    const brut = totalHT(form.lignes);
    const montantHT = Math.round(brut * (1 - (form.remisePourcent || 0) / 100));
    const montantTTC = Math.round(montantHT * (1 + form.tauxTVA / 100));
    let statut = form.statut;
    if (form.montantPaye >= montantTTC && montantTTC > 0) statut = 'PAYEE';
    else if (form.montantPaye > 0 && form.montantPaye < montantTTC) statut = 'PARTIELLE';
    const payload = { ...form, montantHT, montantTTC, statut };
    if (editing) {
      store.update('factures', editing.id, payload);
      toast('Facture mise à jour.', 'success');
    } else {
      store.create('factures', payload);
      toast('Facture créée.', 'success');
    }
    setModal(false);
  };
  const del = (f: Facture) => {
    if (!confirm(`Supprimer la facture ${f.reference} ?`)) return;
    store.remove('factures', f.id);
    toast('Facture supprimée.', 'danger');
  };
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <div className="toolbar">
        <div className="toolbar__search">
          <Icon name="search" size={16} />
          <input placeholder="Rechercher une facture…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="toolbar__spacer" />
        {can.canManageFacturation && (
          <button className="btn btn--primary" onClick={openNew}>
            <Icon name="plus" size={16} /> Nouvelle facture
          </button>
        )}
      </div>

      <CatalogPicker open={picker} onClose={() => setPicker(false)} onAdd={(l) => set('lignes', mergeLignes(form.lignes, l))} />

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState icon="facture" title="Aucune facture" />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Client</th>
                  <th>Échéance</th>
                  <th>Montant TTC</th>
                  <th>Réglé</th>
                  <th>Statut</th>
                  <th style={{ width: 90 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => (
                  <tr key={f.id}>
                    <td className="cell-strong">{f.reference}</td>
                    <td>{clientName(f.clientId)}</td>
                    <td>{formatDate(f.dateEcheance)}</td>
                    <td className="cell-strong">{eur(f.montantTTC)}</td>
                    <td>{eur(f.montantPaye)}</td>
                    <td><StatusBadge status={f.statut} /></td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn" onClick={() => exportFacturePdf(f, clientObj(f.clientId))} aria-label="Exporter PDF" title="Exporter en PDF">
                          <Icon name="download" size={15} />
                        </button>
                        {can.canManageFacturation && (
                          <button className="icon-btn" onClick={() => openEdit(f)} aria-label="Modifier"><Icon name="edit" size={15} /></button>
                        )}
                        {can.canDelete && (
                          <button className="icon-btn danger" onClick={() => del(f)} aria-label="Supprimer"><Icon name="trash" size={15} /></button>
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
        title={editing ? 'Modifier la facture' : 'Nouvelle facture'}
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
          <div className="field">
            <label>Projet / chantier</label>
            <select value={form.chantierId ?? ''} onChange={(e) => set('chantierId', e.target.value)}>
              <option value="">— Aucun —</option>
              {data.chantiers
                .filter((ch) => !form.clientId || ch.clientId === form.clientId)
                .map((ch) => <option key={ch.id} value={ch.id}>{ch.nom}</option>)}
            </select>
          </div>
          <div className="field field--full">
            <label>Objet</label>
            <input value={form.objet} onChange={(e) => set('objet', e.target.value)} />
          </div>
          <div className="field">
            <label>Devis lié (remplissage auto)</label>
            <select value={form.devisId} onChange={(e) => chooseDevis(e.target.value)}>
              <option value="">— Aucun —</option>
              {data.devis.filter((d) => !form.clientId || d.clientId === form.clientId).map((d) => (
                <option key={d.id} value={d.id}>{d.reference} — {d.objet}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Statut</label>
            <select value={form.statut} onChange={(e) => set('statut', e.target.value as FactureStatut)}>
              {FAC_STATUTS.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Date d’émission</label>
            <input type="date" value={form.dateEmission} onChange={(e) => set('dateEmission', e.target.value)} />
          </div>
          <div className="field">
            <label>Échéance</label>
            <input type="date" value={form.dateEcheance} onChange={(e) => set('dateEcheance', e.target.value)} />
          </div>
          <div className="field">
            <label>TVA (%)</label>
            <input type="number" value={form.tauxTVA} onChange={(e) => set('tauxTVA', Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Remise (%)</label>
            <input type="number" min={0} max={100} value={form.remisePourcent} onChange={(e) => set('remisePourcent', Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Montant réglé (MAD)</label>
            <input type="number" value={form.montantPaye} onChange={(e) => set('montantPaye', Number(e.target.value))} />
          </div>
          <div className="field field--full">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <label>Lignes de prestation</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPicker(true)} title="Choisir des prestations du catalogue">
                  <Icon name="plus" size={14} /> Choisir des prestations…
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => {
                    const cat = data.prestations.filter((p) => p.actif);
                    set('lignes', cat.length ? cat.map(prestationToLigne) : catalogLignes());
                  }}
                  title="Charger tout le catalogue de prestations"
                >
                  <Icon name="devis" size={14} /> Modèle complet
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => set('lignes', villaLignes())}
                  title="Prestations types pour une maison individuelle"
                >
                  <Icon name="building" size={14} /> Modèle villa
                </button>
              </div>
            </div>
            <LignesEditor value={form.lignes} onChange={(lignes) => set('lignes', lignes)} tauxTVA={form.tauxTVA} remisePourcent={form.remisePourcent} />
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

/* ------------------------------------------------------------- Échéancier */

function EcheancierTab() {
  const data = useData();
  const toast = useToast();
  const can = useCan();
  const [relance, setRelance] = useState<{ facture: Facture; client?: Client; texte: string } | null>(null);

  const clientObj = (id: string) => data.clients.find((c) => c.id === id);

  const echeances = data.factures
    .filter((f) => f.statut !== 'PAYEE' && f.statut !== 'ANNULEE')
    .map((f) => ({ f, dj: daysUntil(f.dateEcheance) ?? 0, reste: f.montantTTC - (f.montantPaye || 0) }))
    .sort((a, b) => a.dj - b.dj);

  const totalDu = echeances.reduce((s, e) => s + e.reste, 0);
  const enRetard = echeances.filter((e) => e.dj < 0);

  const openRelance = (f: Facture) => {
    const client = clientObj(f.clientId);
    setRelance({ facture: f, client, texte: buildRelanceText(f, client) });
  };

  const sendEmail = () => {
    if (!relance) return;
    const to = relance.client?.email ?? '';
    const subject = `Relance — facture ${relance.facture.reference}`;
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(relance.texte)}`;
  };

  return (
    <>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <StatCard icon="alert" value={String(enRetard.length)} label="Factures en retard" />
        <StatCard icon="euro" value={eur(totalDu)} label="Total restant dû" />
        <StatCard icon="clock" value={String(echeances.length)} label="Factures non soldées" />
      </div>

      <div className="card">
        {echeances.length === 0 ? (
          <EmptyState icon="check" title="Aucune échéance en attente" text="Toutes les factures sont réglées." />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Facture</th>
                  <th>Client</th>
                  <th>Échéance</th>
                  <th>Retard</th>
                  <th>Restant dû</th>
                  <th>Statut</th>
                  <th style={{ width: 120 }}></th>
                </tr>
              </thead>
              <tbody>
                {echeances.map(({ f, dj, reste }) => (
                  <tr key={f.id}>
                    <td className="cell-strong">{f.reference}</td>
                    <td>{clientObj(f.clientId)?.nom ?? '—'}</td>
                    <td>{formatDate(f.dateEcheance)}</td>
                    <td className={dj < 0 ? 'echeance-retard' : ''}>
                      {dj < 0 ? `${-dj} j de retard` : dj === 0 ? "Aujourd'hui" : `Dans ${dj} j`}
                    </td>
                    <td className="cell-strong">{eur(reste)}</td>
                    <td><StatusBadge status={f.statut} /></td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn--ghost btn--sm" onClick={() => openRelance(f)}>
                          <Icon name="bell" size={14} /> Relancer
                        </button>
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
        open={!!relance}
        large
        title={`Relance — ${relance?.facture.reference ?? ''}`}
        onClose={() => setRelance(null)}
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setRelance(null)}>Fermer</button>
            <button className="btn btn--ghost" onClick={sendEmail}>
              <Icon name="bell" size={15} /> Ouvrir l’e-mail
            </button>
            <button
              className="btn btn--primary"
              onClick={() => {
                if (relance) {
                  exportRelancePdf(relance.facture.reference, relance.client, relance.texte);
                  if (can.canManageFacturation) {
                    toast('Courrier de relance généré.', 'success');
                  }
                }
              }}
            >
              <Icon name="download" size={15} /> Imprimer / PDF
            </button>
          </>
        }
      >
        {relance && (
          <>
            <div className="detail-grid" style={{ marginBottom: 16 }}>
              <div className="detail">
                <label>Client</label>
                <div>{relance.client?.nom ?? '—'}</div>
              </div>
              <div className="detail">
                <label>E-mail</label>
                <div>{relance.client?.email ?? '— (non renseigné)'}</div>
              </div>
              <div className="detail">
                <label>Restant dû</label>
                <div>{eur(relance.facture.montantTTC - (relance.facture.montantPaye || 0))}</div>
              </div>
            </div>
            <label className="cell-sub" style={{ fontWeight: 600 }}>Aperçu du courrier</label>
            <div className="relance-preview" style={{ marginTop: 6 }}>{relance.texte}</div>
          </>
        )}
      </Modal>
    </>
  );
}
