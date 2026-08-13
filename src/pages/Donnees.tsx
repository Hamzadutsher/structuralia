import { useRef, useState } from 'react';
import { store, useData, getAutoBackup } from '@/lib/store';
import type { AppData, EntityKey } from '@/lib/types';
import { toCsv, downloadText } from '@/lib/csv';
import { humanize } from '@/lib/format';
import { getJournal, clearJournal, type JournalAction } from '@/lib/journal';
import { PageHead, StatCard } from '@/components/ui/Page';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { useCan } from '@/lib/roles';

const COLLECTIONS: { key: keyof AppData; label: string }[] = [
  { key: 'clients', label: 'Clients' },
  { key: 'chantiers', label: 'Projets' },
  { key: 'devis', label: 'Devis' },
  { key: 'factures', label: 'Factures' },
  { key: 'conventions', label: 'Conventions' },
  { key: 'documents', label: 'Documents' },
  { key: 'taches', label: 'Tâches' },
  { key: 'pvs', label: 'PV de contrôle' },
  { key: 'prestations', label: 'Prestations' },
  { key: 'depenses', label: 'Dépenses' },
  { key: 'membres', label: 'Membres' },
];

const APP_VERSION = 'v7';

export default function Donnees() {
  const data = useData();
  const toast = useToast();
  const can = useCan();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Partial<AppData> | null>(null);
  const [selKeys, setSelKeys] = useState<EntityKey[]>([]);

  const total = COLLECTIONS.reduce((s, c) => s + (data[c.key]?.length ?? 0), 0);
  const auto = getAutoBackup();
  const journal = getJournal();
  const dt = (iso: string) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  const ACTION_TONE: Record<JournalAction, 'success' | 'info' | 'danger'> = { create: 'success', update: 'info', delete: 'danger' };
  const ACTION_LABEL: Record<JournalAction, string> = { create: 'Création', update: 'Modif.', delete: 'Suppr.' };

  // --- Sauvegarde complète (JSON) ---
  const exporterJSON = () => {
    const backup = { meta: { app: 'STRUCTURALIA', version: APP_VERSION, date: new Date().toISOString() }, data };
    downloadText(`structuralia-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backup, null, 2), 'application/json;charset=utf-8');
    toast('Sauvegarde exportée.', 'success');
  };

  // --- Restauration ---
  const onFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const payload: Partial<AppData> = parsed?.data ?? parsed;
      if (!payload || typeof payload !== 'object' || !Array.isArray(payload.clients ?? [])) {
        toast('Fichier de sauvegarde invalide.', 'danger');
        return;
      }
      setPending(payload);
      setSelKeys(COLLECTIONS.map((c) => c.key).filter((k) => ((payload[k] as unknown[])?.length ?? 0) > 0));
    } catch {
      toast('Lecture du fichier impossible (JSON invalide).', 'danger');
    }
  };
  const restaurer = (mode: 'replace' | 'merge') => {
    if (!pending || selKeys.length === 0) return;
    store.importAll(pending, mode, selKeys);
    setPending(null);
    toast(mode === 'replace' ? 'Base restaurée (remplacement).' : 'Données fusionnées.', 'success');
  };
  const toggleKey = (k: EntityKey) => setSelKeys((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  const restaurerAuto = () => {
    if (!auto) return;
    if (!confirm('Restaurer la dernière sauvegarde automatique ? Les données actuelles seront remplacées.')) return;
    store.importAll(auto.data, 'replace');
    toast('Sauvegarde automatique restaurée.', 'success');
  };

  // --- Exports CSV ---
  const exportClientsCsv = () => {
    const rows = data.clients.map((c) => [c.nom, c.type, c.contactNom ?? '', c.email ?? '', c.telephone ?? '', c.ville ?? '', c.siret ?? '', c.statut]);
    downloadText('clients.csv', toCsv(['Nom', 'Type', 'Contact', 'E-mail', 'Téléphone', 'Ville', 'RC/ICE', 'Statut'], rows));
    toast('Clients exportés (CSV).', 'success');
  };
  const exportFacturesCsv = () => {
    const nom = (id: string) => data.clients.find((c) => c.id === id)?.nom ?? '';
    const rows = data.factures.map((f) => [f.reference, nom(f.clientId), f.dateEmission ?? '', f.dateEcheance ?? '', f.montantHT, f.montantTTC, f.montantPaye, f.statut]);
    downloadText('factures.csv', toCsv(['Référence', 'Client', 'Émission', 'Échéance', 'Montant HT', 'Montant TTC', 'Réglé', 'Statut'], rows));
    toast('Factures exportées (CSV).', 'success');
  };
  const exportDepensesCsv = () => {
    const rows = data.depenses.map((d) => [d.date, d.type, d.categorie, d.libelle, d.fournisseur ?? '', d.montantHT, d.montantTTC, d.statut]);
    downloadText('depenses.csv', toCsv(['Date', 'Type', 'Catégorie', 'Libellé', 'Fournisseur', 'Montant HT', 'Montant TTC', 'Statut'], rows));
    toast('Dépenses exportées (CSV).', 'success');
  };

  const reinitialiser = () => {
    if (!confirm('Vider TOUTE la base de données ? Cette action est irréversible (pensez à exporter une sauvegarde avant).')) return;
    store.clear();
    toast('Base de données vidée.', 'danger');
  };

  return (
    <>
      <PageHead
        title="Base de données"
        subtitle="Sauvegarde, restauration et exports de vos données"
      />

      <div className="stat-grid">
        <StatCard icon="folder" value={String(total)} label="Enregistrements au total" />
        <StatCard icon="clients" value={String(data.clients.length)} label="Clients" />
        <StatCard icon="chantier" value={String(data.chantiers.length)} label="Projets" />
        <StatCard icon="facture" value={String(data.factures.length)} label="Factures" />
      </div>

      <div className="split">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Sauvegarde / restauration */}
          <div className="card card--pad">
            <div className="section-title"><Icon name="download" size={18} /> Sauvegarde & restauration</div>
            <p className="cell-sub" style={{ marginBottom: 14 }}>
              Exportez l’intégralité de vos données dans un fichier de sauvegarde, ou restaurez une sauvegarde existante.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn--primary" onClick={exporterJSON}>
                <Icon name="download" size={16} /> Exporter la sauvegarde (JSON)
              </button>
              {can.canManageMembers && (
                <button className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
                  <Icon name="folder" size={16} /> Restaurer une sauvegarde
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                  e.target.value = '';
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <span className="cell-sub">
                <Icon name="clock" size={13} /> Sauvegarde automatique : {auto ? dt(auto.time) : 'aucune'}
              </span>
              {auto && (
                <button className="btn btn--ghost btn--sm" onClick={restaurerAuto}>
                  <Icon name="download" size={14} /> Restaurer l’auto-sauvegarde
                </button>
              )}
            </div>
          </div>

          {/* Exports CSV */}
          <div className="card card--pad">
            <div className="section-title"><Icon name="facture" size={18} /> Exports (CSV pour le comptable)</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn--ghost btn--sm" onClick={exportClientsCsv}><Icon name="clients" size={14} /> Clients</button>
              <button className="btn btn--ghost btn--sm" onClick={exportFacturesCsv}><Icon name="facture" size={14} /> Factures</button>
              <button className="btn btn--ghost btn--sm" onClick={exportDepensesCsv}><Icon name="euro" size={14} /> Dépenses</button>
            </div>
          </div>

          {/* Zone dangereuse */}
          {can.canManageMembers && (
            <div className="card card--pad" style={{ borderColor: 'var(--danger-bg)' }}>
              <div className="section-title" style={{ color: 'var(--danger)' }}><Icon name="alert" size={18} /> Zone sensible</div>
              <p className="cell-sub" style={{ marginBottom: 12 }}>Vide toutes les collections. Exportez une sauvegarde au préalable.</p>
              <button className="btn btn--danger" onClick={reinitialiser}>
                <Icon name="trash" size={16} /> Réinitialiser la base
              </button>
            </div>
          )}
        </div>

        {/* Détail des collections */}
        <div className="card card--pad">
          <div className="section-title"><Icon name="document" size={18} /> Contenu de la base</div>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Collection</th><th style={{ textAlign: 'right' }}>Enregistrements</th></tr></thead>
              <tbody>
                {COLLECTIONS.map((c) => (
                  <tr key={c.key}>
                    <td className="cell-strong">{c.label}</td>
                    <td style={{ textAlign: 'right' }}>{data[c.key]?.length ?? 0}</td>
                  </tr>
                ))}
                <tr>
                  <td className="cell-strong">Total</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary-700)' }}>{total}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Journal des modifications */}
      <div className="card card--pad" style={{ marginTop: 20 }}>
        <div className="section-title">
          <Icon name="clock" size={18} /> Journal des modifications
          <span className="tab__count" style={{ marginLeft: 8 }}>{journal.length}</span>
          {journal.length > 0 && (
            <button className="btn btn--ghost btn--sm" style={{ marginLeft: 'auto' }} onClick={() => { clearJournal(); toast('Journal effacé.', 'success'); }}>
              <Icon name="trash" size={13} /> Effacer
            </button>
          )}
        </div>
        {journal.length === 0 ? (
          <p className="cell-sub">Aucune modification enregistrée.</p>
        ) : (
          <div className="table-wrap" style={{ maxHeight: 320, overflowY: 'auto' }}>
            <table className="data">
              <thead><tr><th style={{ width: 150 }}>Date</th><th style={{ width: 110 }}>Action</th><th>Collection</th><th>Identifiant</th></tr></thead>
              <tbody>
                {journal.slice(0, 50).map((e, i) => (
                  <tr key={i}>
                    <td className="cell-sub">{dt(e.time)}</td>
                    <td><Badge tone={ACTION_TONE[e.action]}>{ACTION_LABEL[e.action]}</Badge></td>
                    <td>{humanize(e.entity)}</td>
                    <td className="cell-sub">{e.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Choix du mode de restauration */}
      <Modal
        open={!!pending}
        title="Restaurer la sauvegarde"
        onClose={() => setPending(null)}
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setPending(null)}>Annuler</button>
            <button className="btn btn--ghost" onClick={() => restaurer('merge')}><Icon name="plus" size={15} /> Fusionner</button>
            <button className="btn btn--primary" onClick={() => restaurer('replace')}><Icon name="check" size={15} /> Remplacer tout</button>
          </>
        }
      >
        {pending && (
          <div>
            <p style={{ marginBottom: 12 }}>Collections à restaurer <span className="cell-sub">({selKeys.length} sélectionnée(s))</span> :</p>
            <div className="detail-grid">
              {COLLECTIONS.filter((c) => ((pending[c.key] as unknown[])?.length ?? 0) > 0).map((c) => (
                <label key={c.key} className="detail" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={selKeys.includes(c.key as EntityKey)} onChange={() => toggleKey(c.key as EntityKey)} />
                  <span style={{ flex: 1 }}>{c.label}</span>
                  <b>{(pending[c.key] as unknown[])?.length ?? 0}</b>
                </label>
              ))}
            </div>
            <p className="cell-sub" style={{ marginTop: 16 }}>
              <b>Remplacer tout</b> : écrase les collections sélectionnées. <b>Fusionner</b> : ajoute les enregistrements manquants (dédoublonnage par identifiant). Les collections non cochées ne sont pas touchées.
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
