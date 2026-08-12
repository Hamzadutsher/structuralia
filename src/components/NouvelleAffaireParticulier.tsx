import { useState } from 'react';
import { store, useData } from '@/lib/store';
import { villaLignes } from '@/lib/catalog';
import { totalHT } from '@/components/ui/LignesEditor';
import { eur } from '@/lib/format';
import { Modal } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';

/**
 * Assistant « nouvelle affaire particulier » : crée en une fois le client
 * (particulier), le projet (maison individuelle) et un devis pré-rempli avec
 * le modèle villa, puis ouvre la fiche projet.
 */
export function NouvelleAffaireParticulier({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (chantierId: string) => void;
}) {
  const data = useData();
  const toast = useToast();
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [ville, setVille] = useState('');
  const [projet, setProjet] = useState('');
  const [budget, setBudget] = useState(0);

  const reset = () => {
    setNom(''); setTelephone(''); setEmail(''); setVille(''); setProjet(''); setBudget(0);
  };

  const lignes = villaLignes();
  const montantHT = totalHT(lignes);

  const creer = () => {
    if (!nom.trim()) {
      toast('Le nom du client est requis.', 'danger');
      return;
    }
    const projetNom = projet.trim() || `Villa ${nom.trim()}`;
    // 1) Client particulier
    const client = store.create('clients', {
      nom: nom.trim(),
      type: 'PARTICULIER',
      contactNom: nom.trim(),
      telephone,
      email,
      ville,
      statut: 'ACTIF',
    });
    // 2) Projet (maison individuelle)
    const chantier = store.create('chantiers', {
      nom: projetNom,
      reference: `CH-2026-${String(data.chantiers.length + 1).padStart(2, '0')}`,
      clientId: client.id,
      ville,
      dateDebut: new Date().toISOString().slice(0, 10),
      dateFinPrevue: '',
      budget,
      avancement: 0,
      statut: 'PLANIFIE',
      chefProjet: '',
      description: 'Maison individuelle — étude et suivi structure.',
    });
    // 3) Devis villa
    store.create('devis', {
      reference: `DEV-2026-${100 + data.devis.length + 1}`,
      objet: `Études techniques et suivi — ${projetNom}`,
      clientId: client.id,
      chantierId: chantier.id,
      dateEmission: new Date().toISOString().slice(0, 10),
      dateValidite: '',
      montantHT,
      tauxTVA: 20,
      montantTTC: Math.round(montantHT * 1.2),
      statut: 'BROUILLON',
      lignes,
      notes: '',
    });
    toast('Affaire créée : client + projet + devis villa.', 'success');
    reset();
    onCreated(chantier.id);
  };

  return (
    <Modal
      open={open}
      title="Nouvelle affaire — maison individuelle"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn--primary" onClick={creer}>
            <Icon name="check" size={16} /> Créer l’affaire
          </button>
        </>
      }
    >
      <p className="cell-sub" style={{ marginBottom: 16 }}>
        <Icon name="building" size={13} /> Crée en une fois le <b>client particulier</b>, le <b>projet</b> et un <b>devis villa</b> (modèle {eur(montantHT)} HT), puis ouvre la fiche projet.
      </p>
      <div className="form-grid">
        <div className="field">
          <label>Nom du client *</label>
          <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. M. Karim Idrissi" />
        </div>
        <div className="field">
          <label>Ville</label>
          <input value={ville} onChange={(e) => setVille(e.target.value)} />
        </div>
        <div className="field">
          <label>Téléphone</label>
          <input value={telephone} onChange={(e) => setTelephone(e.target.value)} />
        </div>
        <div className="field">
          <label>E-mail</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Nom du projet</label>
          <input value={projet} onChange={(e) => setProjet(e.target.value)} placeholder={nom ? `Villa ${nom}` : 'Villa …'} />
        </div>
        <div className="field">
          <label>Budget (MAD)</label>
          <input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
        </div>
      </div>
    </Modal>
  );
}
