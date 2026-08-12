import { useState } from 'react';
import { store, useData } from '@/lib/store';
import type { Document, DocumentCategorie } from '@/lib/types';
import { formatBytes, formatDate, humanize } from '@/lib/format';
import { PageHead } from '@/components/ui/Page';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/Misc';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { useCan } from '@/lib/roles';
import { uploadDocument, downloadDocument } from '@/lib/storage';
import { buildReference, LOT_TYPES } from '@/lib/reference';

const CATS: DocumentCategorie[] = ['PLAN', 'RAPPORT', 'NOTE_CALCUL', 'ADMINISTRATIF', 'PHOTO', 'AUTRE'];

/** Couleur du badge de format selon l'extension du fichier. */
function formatTone(type: string): 'danger' | 'info' | 'primary' | 'success' | 'warning' | 'neutral' {
  const t = type.toLowerCase();
  if (t === 'pdf') return 'danger';
  if (['dwg', 'dxf', 'rvt', 'ifc'].includes(t)) return 'info';
  if (['doc', 'docx', 'odt'].includes(t)) return 'primary';
  if (['xls', 'xlsx', 'csv', 'ods'].includes(t)) return 'success';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tif', 'tiff'].includes(t)) return 'warning';
  return 'neutral';
}

const empty: Omit<Document, 'id' | 'createdAt' | 'updatedAt'> = {
  titre: '',
  reference: '',
  categorie: 'PLAN',
  type: 'pdf',
  url: '#',
  taille: 0,
  clientId: '',
  chantierId: '',
  notes: '',
};

export default function Documents() {
  const data = useData();
  const toast = useToast();
  const can = useCan();
  const [tab, setTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [lotCode, setLotCode] = useState('GEN');
  const [version, setVersion] = useState(0);

  const clientName = (id?: string) => data.clients.find((c) => c.id === id)?.nom;
  const chantierName = (id?: string) => data.chantiers.find((c) => c.id === id)?.nom;

  // Construit la référence structurée à partir des paramètres courants.
  const buildRef = (lot = lotCode, ver = version, clientId = form.clientId, chantierId = form.chantierId) => {
    const ch = data.chantiers.find((c) => c.id === chantierId);
    const cl = data.clients.find((c) => c.id === clientId);
    return buildReference({
      typeCode: lot,
      projet: ch?.reference || ch?.nom,
      client: cl?.nom,
      date: new Date().toISOString(),
      version: ver,
    });
  };

  const filtered = data.documents.filter((d) => {
    const matchCat = tab === 'ALL' || d.categorie === tab;
    const q = search.toLowerCase();
    const matchQ = !q || d.titre.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  const tabs = [
    { key: 'ALL', label: 'Tous', icon: 'folder' as const, count: data.documents.length },
    ...CATS.map((c) => ({
      key: c,
      label: humanize(c),
      count: data.documents.filter((d) => d.categorie === c).length,
    })),
  ];

  const openNew = () => {
    setLotCode('GEN');
    setVersion(0);
    setForm({ ...empty, reference: buildReference({ typeCode: 'GEN', date: new Date().toISOString(), version: 0 }) });
    setFile(null);
    setModal(true);
  };
  const save = async () => {
    if (!form.titre.trim()) {
      toast('Le titre est requis.', 'danger');
      return;
    }
    setBusy(true);
    try {
      let payload = { ...form };
      if (file) {
        const res = await uploadDocument(file);
        payload = { ...payload, storageKey: res.storageKey, dataUrl: res.dataUrl, taille: res.taille, type: res.type };
      }
      store.create('documents', payload);
      toast('Document ajouté.', 'success');
      setModal(false);
    } catch {
      toast('Échec de l’envoi du fichier.', 'danger');
    } finally {
      setBusy(false);
    }
  };
  const download = async (d: Document) => {
    const ok = await downloadDocument(d);
    if (!ok) toast('Fichier indisponible (métadonnées uniquement en démo).', 'danger');
  };
  const del = (d: Document) => {
    if (!confirm(`Supprimer le document « ${d.titre} » ?`)) return;
    store.remove('documents', d.id);
    toast('Document supprimé.', 'danger');
  };
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <PageHead
        title="Documentations"
        subtitle="Plans, notes de calcul, rapports et pièces administratives"
        actions={
          <button className="btn btn--primary" onClick={openNew}>
            <Icon name="plus" size={16} /> Ajouter un document
          </button>
        }
      />

      <Tabs active={tab} onChange={setTab} tabs={tabs} />

      <div className="toolbar">
        <div className="toolbar__search">
          <Icon name="search" size={16} />
          <input placeholder="Rechercher un document…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState icon="document" title="Aucun document" text="Aucun document dans cette catégorie." />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Catégorie</th>
                  <th>Rattachement</th>
                  <th>Taille</th>
                  <th>Ajouté le</th>
                  <th style={{ width: 120 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="stat__icon" style={{ width: 34, height: 34 }}>
                          <Icon name="document" size={16} />
                        </span>
                        <div>
                          <div className="cell-strong">{d.titre}</div>
                          <div className="cell-sub">{d.reference ? `${d.reference} · ` : ''}.{d.type}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <Badge tone="primary">{humanize(d.categorie)}</Badge>
                        {d.type && <Badge tone={formatTone(d.type)}>{d.type.toUpperCase()}</Badge>}
                      </div>
                    </td>
                    <td className="cell-sub">
                      {chantierName(d.chantierId) || clientName(d.clientId) || '—'}
                    </td>
                    <td>{formatBytes(d.taille)}</td>
                    <td>{formatDate(d.createdAt)}</td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn" aria-label="Télécharger" onClick={() => download(d)}>
                          <Icon name="download" size={15} />
                        </button>
                        {can.canDelete && (
                          <button className="icon-btn danger" onClick={() => del(d)} aria-label="Supprimer">
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
        title="Ajouter un document"
        onClose={() => setModal(false)}
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setModal(false)} disabled={busy}>Annuler</button>
            <button className="btn btn--primary" onClick={save} disabled={busy}>
              <Icon name="check" size={16} /> {busy ? 'Envoi…' : 'Enregistrer'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="field field--full">
            <label>Titre *</label>
            <input value={form.titre} onChange={(e) => set('titre', e.target.value)} placeholder="Ex. Plan de coffrage niveau RDC" />
          </div>
          <div className="field">
            <label>Catégorie</label>
            <select value={form.categorie} onChange={(e) => set('categorie', e.target.value as DocumentCategorie)}>
              {CATS.map((c) => <option key={c} value={c}>{humanize(c)}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Format</label>
            <input value={form.type} onChange={(e) => set('type', e.target.value)} placeholder="pdf, dwg, docx…" />
          </div>
          <div className="field">
            <label>Client</label>
            <select
              value={form.clientId}
              onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({ ...f, clientId: v, reference: buildRef(lotCode, version, v, f.chantierId) }));
              }}
            >
              <option value="">— Aucun —</option>
              {data.clients.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Projet / chantier</label>
            <select
              value={form.chantierId}
              onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({ ...f, chantierId: v, reference: buildRef(lotCode, version, f.clientId, v) }));
              }}
            >
              <option value="">— Aucun —</option>
              {data.chantiers.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Type de lot / prestation</label>
            <select
              value={lotCode}
              onChange={(e) => {
                const v = e.target.value;
                setLotCode(v);
                setForm((f) => ({ ...f, reference: buildRef(v, version, f.clientId, f.chantierId) }));
              }}
            >
              {LOT_TYPES.map((l) => <option key={l.code} value={l.code}>{l.code} — {l.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Version</label>
            <input
              type="number"
              min={0}
              value={version}
              onChange={(e) => {
                const n = Math.max(0, Number(e.target.value));
                setVersion(n);
                setForm((f) => ({ ...f, reference: buildRef(lotCode, n, f.clientId, f.chantierId) }));
              }}
            />
          </div>
          <div className="field field--full">
            <label>Référence (automatique)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={{ flex: 1 }} value={form.reference ?? ''} onChange={(e) => set('reference', e.target.value)} />
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => set('reference', buildRef())} title="Régénérer la référence">
                <Icon name="settings" size={14} /> Régénérer
              </button>
            </div>
            <span className="cell-sub">Format : TYPE-PROJET-CLIENT-AAMMJJ-Vx (modifiable).</span>
          </div>
          <div className="field field--full">
            <label>Fichier</label>
            <input
              type="file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFile(f);
                  set('titre', form.titre || f.name.replace(/\.[^.]+$/, ''));
                  set('type', f.name.split('.').pop() || 'pdf');
                  set('taille', f.size);
                }
              }}
            />
            <span className="cell-sub">
              Le fichier est envoyé sur Amazon S3 (Amplify Storage) lorsqu’un backend est déployé.
              En mode démo, les fichiers ≤ 1,5 Mo restent téléchargeables localement.
            </span>
          </div>
        </div>
      </Modal>
    </>
  );
}
