import { useMemo, useState } from 'react';
import type { Chantier, Client, DocumentCategorie, Pv } from '@/lib/types';
import {
  type PvData,
  type PvType,
  type ControleStatut,
  type ReserveItem,
  PV_LABELS,
  defaultChecklist,
  exportPv,
} from '@/lib/pv';
import { Modal } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';
import { humanize } from '@/lib/format';

const PV_PREFIX: Record<PvType, string> = {
  RECEPTION_COFFRAGE: 'PV-COF',
  RECEPTION_FERRAILLAGE: 'PV-FER',
  RESERVES: 'PV-RES',
  SYNTHESE: 'RS',
  ATTESTATION: 'ATT',
};

const PV_CATEGORIE: Record<PvType, DocumentCategorie> = {
  RECEPTION_COFFRAGE: 'RAPPORT',
  RECEPTION_FERRAILLAGE: 'RAPPORT',
  RESERVES: 'RAPPORT',
  SYNTHESE: 'RAPPORT',
  ATTESTATION: 'ADMINISTRATIF',
};

const STATUTS: ControleStatut[] = ['CONFORME', 'NON_CONFORME', 'SANS_OBJET'];
const TODAY = '2026-08-07';

interface ArchivePayload {
  titre: string;
  categorie: DocumentCategorie;
  chantierId: string;
  clientId?: string;
}

type PvRecord = Omit<Pv, 'id' | 'createdAt' | 'updatedAt'>;

export function PvGenerator({
  open,
  onClose,
  chantiers,
  clients,
  defaultChantierId,
  existingPvs,
  onSavePv,
  onArchive,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  chantiers: Chantier[];
  clients: Client[];
  defaultChantierId?: string;
  existingPvs: Pv[];
  onSavePv: (pv: PvRecord) => void;
  onArchive: (doc: ArchivePayload) => void;
  onDone: (message: string) => void;
}) {
  const [type, setType] = useState<PvType>('RECEPTION_COFFRAGE');
  const [chantierId, setChantierId] = useState(defaultChantierId ?? chantiers[0]?.id ?? '');
  const [ouvrage, setOuvrage] = useState('');
  const [date, setDate] = useState(TODAY);
  const [controleur, setControleur] = useState('');
  const [archive, setArchive] = useState(true);

  // Champs spécifiques
  const [items, setItems] = useState(() => defaultChecklist('RECEPTION_COFFRAGE'));
  const [decision, setDecision] = useState<PvData['decision']>('ACCORDEE');
  const [observations, setObservations] = useState('');
  const [reserves, setReserves] = useState<ReserveItem[]>([{ localisation: '', description: '', gravite: 'MINEURE', delai: '' }]);
  const [periode, setPeriode] = useState('');
  const [intervenants, setIntervenants] = useState('');
  const [points, setPoints] = useState<string[]>(['']);
  const [conclusion, setConclusion] = useState('');
  const [objet, setObjet] = useState<'CONFORMITE' | 'STABILITE'>('CONFORMITE');
  const [designation, setDesignation] = useState('');
  const [references, setReferences] = useState('BAEL 91 / Eurocodes / RPS 2011');
  const [texte, setTexte] = useState('');

  const chantier = chantiers.find((c) => c.id === chantierId);
  const client = clients.find((c) => c.id === chantier?.clientId);
  // Numérotation automatique par type ET par chantier.
  const reference = useMemo(() => {
    const nn = (existingPvs ?? []).filter((p) => p.type === type && p.chantierId === chantierId).length + 1;
    const suffix = String(nn).padStart(3, '0');
    return chantier?.reference
      ? `${PV_PREFIX[type]}-${chantier.reference}-${suffix}`
      : `${PV_PREFIX[type]}-2026-${suffix}`;
  }, [type, chantierId, chantier?.reference, existingPvs]);

  const changeType = (t: PvType) => {
    setType(t);
    if (t === 'RECEPTION_COFFRAGE' || t === 'RECEPTION_FERRAILLAGE') {
      setItems(defaultChecklist(t));
    }
  };

  const isReception = type === 'RECEPTION_COFFRAGE' || type === 'RECEPTION_FERRAILLAGE';

  const build = (): PvData => ({
    type,
    reference,
    chantierNom: chantier?.nom ?? '—',
    chantierRef: chantier?.reference,
    clientNom: client?.nom,
    ville: chantier?.ville,
    ouvrage,
    date,
    controleur: controleur || chantier?.chefProjet || '',
    items: isReception ? items : undefined,
    decision: isReception ? decision : undefined,
    observations: observations || undefined,
    reserves: type === 'RESERVES' ? reserves.filter((r) => r.description.trim()) : undefined,
    periode: type === 'SYNTHESE' ? periode : undefined,
    intervenants: type === 'SYNTHESE' ? intervenants : undefined,
    points: type === 'SYNTHESE' ? points.filter((p) => p.trim()) : undefined,
    conclusion: type === 'SYNTHESE' ? conclusion : undefined,
    objet: type === 'ATTESTATION' ? objet : undefined,
    designation: type === 'ATTESTATION' ? designation : undefined,
    references: type === 'ATTESTATION' ? references : undefined,
    texte: type === 'ATTESTATION' ? texte : undefined,
  });

  const generate = () => {
    if (!chantierId) {
      onDone('Sélectionnez un chantier.');
      return;
    }
    const data = build();
    exportPv(data);
    // Enregistrement systématique dans le registre des PV (ré-impression possible).
    onSavePv({
      reference,
      type,
      titre: `${PV_LABELS[type]} — ${reference}`,
      chantierId,
      clientId: chantier?.clientId,
      date,
      controleur: data.controleur,
      payload: data,
    });
    // Archivage optionnel dans les documents du chantier.
    if (archive && chantier) {
      onArchive({
        titre: `${PV_LABELS[type]} — ${reference}`,
        categorie: PV_CATEGORIE[type],
        chantierId,
        clientId: chantier.clientId,
      });
    }
    onDone('Document de contrôle généré et enregistré.');
    onClose();
  };

  // Helpers listes
  const setItem = (i: number, patch: Partial<(typeof items)[number]>) =>
    setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const setReserve = (i: number, patch: Partial<ReserveItem>) =>
    setReserves(reserves.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <Modal
      open={open}
      large
      title="Générer un document de contrôle"
      onClose={onClose}
      footer={
        <>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
            <input type="checkbox" checked={archive} onChange={(e) => setArchive(e.target.checked)} />
            Archiver dans les documents du chantier
          </label>
          <button className="btn btn--ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn--primary" onClick={generate}>
            <Icon name="download" size={16} /> Générer le PDF
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field">
          <label>Type de document</label>
          <select value={type} onChange={(e) => changeType(e.target.value as PvType)}>
            {(Object.keys(PV_LABELS) as PvType[]).map((t) => (
              <option key={t} value={t}>{PV_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Référence</label>
          <input value={reference} disabled />
        </div>
        <div className="field">
          <label>Chantier *</label>
          <select value={chantierId} onChange={(e) => setChantierId(e.target.value)}>
            <option value="">— Choisir —</option>
            {chantiers.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Ouvrage / zone concernée</label>
          <input value={ouvrage} onChange={(e) => setOuvrage(e.target.value)} placeholder="Ex. Voile SS2, Poteau P12, Dalle niv. 3…" />
        </div>
        <div className="field">
          <label>Date du contrôle</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Contrôleur</label>
          <input value={controleur} onChange={(e) => setControleur(e.target.value)} placeholder={chantier?.chefProjet ?? 'Nom du contrôleur'} />
        </div>

        {/* --- Réceptions coffrage / ferraillage --- */}
        {isReception && (
          <div className="field field--full">
            <label>Check-list de contrôle</label>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr><th>Point de contrôle</th><th style={{ width: 150 }}>Résultat</th><th>Observation</th></tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: 12.5 }}>{it.point}</td>
                      <td>
                        <select className="ligne-input" value={it.statut} onChange={(e) => setItem(i, { statut: e.target.value as ControleStatut })}>
                          {STATUTS.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
                        </select>
                      </td>
                      <td>
                        <input className="ligne-input" value={it.observation ?? ''} onChange={(e) => setItem(i, { observation: e.target.value })} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="field" style={{ minWidth: 220 }}>
                <label>Décision de bétonnage</label>
                <select value={decision} onChange={(e) => setDecision(e.target.value as PvData['decision'])}>
                  <option value="ACCORDEE">Bétonnage autorisé</option>
                  <option value="SOUS_RESERVES">Autorisé sous réserves</option>
                  <option value="REFUSEE">Bétonnage refusé</option>
                </select>
              </div>
            </div>
          </div>
        )}
        {isReception && (
          <div className="field field--full">
            <label>Observations générales</label>
            <textarea value={observations} onChange={(e) => setObservations(e.target.value)} />
          </div>
        )}

        {/* --- PV de réserves --- */}
        {type === 'RESERVES' && (
          <div className="field field--full">
            <label>Réserves relevées</label>
            {reserves.map((r, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 130px 120px 36px', gap: 8, marginBottom: 8 }}>
                <input className="ligne-input" placeholder="Localisation" value={r.localisation} onChange={(e) => setReserve(i, { localisation: e.target.value })} />
                <input className="ligne-input" placeholder="Description de la réserve" value={r.description} onChange={(e) => setReserve(i, { description: e.target.value })} />
                <select className="ligne-input" value={r.gravite} onChange={(e) => setReserve(i, { gravite: e.target.value as ReserveItem['gravite'] })}>
                  <option value="MINEURE">Mineure</option>
                  <option value="MAJEURE">Majeure</option>
                </select>
                <input className="ligne-input" placeholder="Délai" value={r.delai ?? ''} onChange={(e) => setReserve(i, { delai: e.target.value })} />
                <button className="icon-btn danger" type="button" onClick={() => setReserves(reserves.filter((_, idx) => idx !== i))}>
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))}
            <button className="btn btn--ghost btn--sm" type="button" onClick={() => setReserves([...reserves, { localisation: '', description: '', gravite: 'MINEURE', delai: '' }])}>
              <Icon name="plus" size={14} /> Ajouter une réserve
            </button>
          </div>
        )}

        {/* --- Rapport de synthèse --- */}
        {type === 'SYNTHESE' && (
          <>
            <div className="field">
              <label>Période</label>
              <input value={periode} onChange={(e) => setPeriode(e.target.value)} placeholder="Ex. Semaine 32 / Août 2026" />
            </div>
            <div className="field">
              <label>Intervenants</label>
              <input value={intervenants} onChange={(e) => setIntervenants(e.target.value)} />
            </div>
            <div className="field field--full">
              <label>Points traités / avancement</label>
              {points.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input className="ligne-input" value={p} onChange={(e) => setPoints(points.map((x, idx) => (idx === i ? e.target.value : x)))} placeholder={`Point ${i + 1}`} />
                  <button className="icon-btn danger" type="button" onClick={() => setPoints(points.filter((_, idx) => idx !== i))}>
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              ))}
              <button className="btn btn--ghost btn--sm" type="button" onClick={() => setPoints([...points, ''])}>
                <Icon name="plus" size={14} /> Ajouter un point
              </button>
            </div>
            <div className="field field--full">
              <label>Observations</label>
              <textarea value={observations} onChange={(e) => setObservations(e.target.value)} />
            </div>
            <div className="field field--full">
              <label>Conclusion</label>
              <textarea value={conclusion} onChange={(e) => setConclusion(e.target.value)} />
            </div>
          </>
        )}

        {/* --- Attestation --- */}
        {type === 'ATTESTATION' && (
          <>
            <div className="field">
              <label>Objet</label>
              <select value={objet} onChange={(e) => setObjet(e.target.value as 'CONFORMITE' | 'STABILITE')}>
                <option value="CONFORMITE">Attestation de conformité</option>
                <option value="STABILITE">Attestation de stabilité</option>
              </select>
            </div>
            <div className="field">
              <label>Désignation de l’ouvrage</label>
              <input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Ex. Structure béton armé R+8" />
            </div>
            <div className="field field--full">
              <label>Références réglementaires</label>
              <input value={references} onChange={(e) => setReferences(e.target.value)} />
            </div>
            <div className="field field--full">
              <label>Texte de l’attestation (laisser vide pour le texte automatique)</label>
              <textarea value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Un texte réglementaire est généré automatiquement si ce champ reste vide." />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
