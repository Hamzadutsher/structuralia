import { useRef, useState } from 'react';
import { store, useData } from '@/lib/store';
import type { AppData } from '@/lib/types';
import { toCsv, downloadText } from '@/lib/csv';
import { PageHead, StatCard } from '@/components/ui/Page';
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

  const total = COLLECTIONS.reduce((s, c) => s + (data[c.key]?.length ?? 0), 0);

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
    } catch {
      toast('Lecture du fichier impossible (JSON invalide).', 'danger');
    }
  };
  const restaurer = (mode: 'replace' | 'merge') => {
    if (!pending) return;
    store.importAll(pending, mode);
    setPending(null);
    toast(mode === 'replace' ? 'Base restaurée (remplacement).' : 'Données fusionnées.', 'success');
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
            <p style={{ marginBottom: 14 }}>La sauvegarde contient :</p>
            <div className="detail-grid">
              {COLLECTIONS.filter((c) => (pending[c.key]?.length ?? 0) > 0).map((c) => (
                <div key={c.key} className="detail"><label>{c.label}</label><div>{pending[c.key]?.length ?? 0}</div></div>
              ))}
            </div>
            <p className="cell-sub" style={{ marginTop: 16 }}>
              <b>Remplacer tout</b> : écrase les données actuelles. <b>Fusionner</b> : ajoute les enregistrements manquants (dédoublonnage par identifiant).
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
