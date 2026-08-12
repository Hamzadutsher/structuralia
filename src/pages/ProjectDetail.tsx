import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { store, useData } from '@/lib/store';
import { eur, eurShort, formatDate, humanize, daysUntil } from '@/lib/format';
import { PageHead, StatCard } from '@/components/ui/Page';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Progress, Detail, EmptyState } from '@/components/ui/Misc';
import { Icon } from '@/components/ui/Icon';
import { exportDevisPdf, exportFacturePdf } from '@/lib/pdf';
import { exportPv, PV_LABELS, type PvData, type PvType } from '@/lib/pv';
import { exportConventionPdf } from '@/lib/convention-doc';
import { catalogLignes } from '@/lib/catalog';
import { totalHT } from '@/components/ui/LignesEditor';
import { useToast } from '@/components/ui/Toast';
import { useCan } from '@/lib/roles';
import { PhotoGallery } from '@/components/PhotoGallery';

export default function ProjectDetail() {
  const { id } = useParams();
  const data = useData();
  const navigate = useNavigate();
  const toast = useToast();
  const can = useCan();
  const [tab, setTab] = useState('apercu');

  const chantier = data.chantiers.find((c) => c.id === id);

  // Mémorise le dernier projet consulté (repris par le tableau de bord).
  useEffect(() => {
    if (id) {
      try {
        localStorage.setItem('structuralia:lastProjet', id);
      } catch {
        /* ignore */
      }
    }
  }, [id]);

  const scoped = useMemo(() => {
    if (!chantier) return null;
    const client = data.clients.find((c) => c.id === chantier.clientId);
    return {
      client,
      taches: data.taches.filter((t) => t.chantierId === chantier.id),
      documents: data.documents.filter((d) => d.chantierId === chantier.id),
      pvs: data.pvs.filter((p) => p.chantierId === chantier.id),
      // Facturation rattachée directement au projet.
      devis: data.devis.filter((d) => d.chantierId === chantier.id),
      factures: data.factures.filter((f) => f.chantierId === chantier.id),
      // Autres documents financiers du client, non rattachés à ce projet.
      devisAutres: data.devis.filter((d) => d.clientId === chantier.clientId && d.chantierId !== chantier.id),
      facturesAutres: data.factures.filter((f) => f.clientId === chantier.clientId && f.chantierId !== chantier.id),
      conventions: data.conventions.filter((cv) => cv.clientId === chantier.clientId),
    };
  }, [chantier, data]);

  if (!chantier || !scoped) {
    return (
      <div className="card">
        <EmptyState
          icon="chantier"
          title="Projet introuvable"
          text="Ce projet n’existe pas ou a été supprimé."
          action={
            <Link to="/" className="btn btn--primary">
              <Icon name="dashboard" size={16} /> Retour au tableau de bord
            </Link>
          }
        />
      </div>
    );
  }

  const { client, taches, documents, pvs, devis, factures, devisAutres, facturesAutres, conventions } = scoped;

  const factureCA = factures.reduce((s, f) => s + (f.montantPaye || 0), 0);
  const factureDu = factures
    .filter((f) => f.statut !== 'PAYEE' && f.statut !== 'ANNULEE')
    .reduce((s, f) => s + (f.montantTTC - (f.montantPaye || 0)), 0);
  const factureHTp = factures.reduce((s, f) => s + (f.montantHT || 0), 0);
  const tauxFacturation = chantier.budget ? Math.round((factureHTp / chantier.budget) * 100) : 0;
  const tachesTerminees = taches.filter((t) => t.statut === 'TERMINE').length;
  const dj = daysUntil(chantier.dateFinPrevue);

  /** Crée un devis brouillon pré-rempli avec le modèle BET, rattaché au projet. */
  const creerDevisModele = () => {
    const lignes = catalogLignes();
    const montantHT = totalHT(lignes);
    const tauxTVA = 20;
    store.create('devis', {
      reference: `DEV-2026-${100 + data.devis.length + 1}`,
      objet: `Études techniques et suivi — ${chantier.nom}`,
      clientId: chantier.clientId,
      chantierId: chantier.id,
      dateEmission: new Date().toISOString().slice(0, 10),
      dateValidite: '',
      montantHT,
      tauxTVA,
      montantTTC: Math.round(montantHT * (1 + tauxTVA / 100)),
      statut: 'BROUILLON',
      lignes,
      notes: '',
    });
    setTab('facturation');
    toast('Devis brouillon créé à partir du modèle BET.', 'success');
  };

  /** Crée une convention pré-remplie (montant = devis acceptés du projet) et génère le contrat. */
  const creerConventionModele = () => {
    const acceptes = devis.filter((d) => d.statut === 'ACCEPTE');
    const base = acceptes.length ? acceptes : devis;
    const montant = base.reduce((s, d) => s + (d.montantHT || 0), 0);
    const created = store.create('conventions', {
      reference: `CONV-2026-${10 + data.conventions.length + 1}`,
      objet: `Études techniques et suivi — ${chantier.nom}`,
      clientId: chantier.clientId,
      dateDebut: new Date().toISOString().slice(0, 10),
      dateFin: '',
      montant,
      statut: 'BROUILLON',
      fichierUrl: '',
      notes: '',
    });
    exportConventionPdf(created, client);
    setTab('conventions');
    toast('Convention créée et contrat généré.', 'success');
  };

  return (
    <>
      <PageHead
        title={chantier.nom}
        subtitle={`${chantier.reference ?? ''} · ${chantier.ville ?? ''} · Client : ${client?.nom ?? '—'}`}
        actions={
          <button className="btn btn--ghost" onClick={() => navigate(-1)}>
            <Icon name="chevron" size={16} /> Retour
          </button>
        }
      />

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
        <StatusBadge status={chantier.statut} />
        <Badge tone="neutral">Chef de projet : {chantier.chefProjet || '—'}</Badge>
        {dj !== null && (
          <Badge tone={dj < 0 && chantier.statut !== 'TERMINE' ? 'danger' : 'info'}>
            {dj < 0 ? `Échéance dépassée de ${-dj} j` : `Échéance dans ${dj} j`}
          </Badge>
        )}
      </div>

      <div className="stat-grid">
        <StatCard icon="trending" value={`${chantier.avancement}%`} label="Avancement" />
        <StatCard icon="euro" value={eurShort(chantier.budget)} label="Budget du projet" />
        <StatCard icon="facture" value={eurShort(factureCA)} label="Facturé encaissé (projet)" />
        <StatCard icon="suivi" value={`${tachesTerminees}/${taches.length}`} label="Tâches terminées" />
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: 'apercu', label: 'Aperçu', icon: 'building' },
          { key: 'taches', label: 'Tâches', icon: 'suivi', count: taches.length },
          { key: 'docs', label: 'Documents', icon: 'document', count: documents.length },
          { key: 'controles', label: 'PV / Contrôles', icon: 'convention', count: pvs.length },
          { key: 'photos', label: 'Photos', icon: 'pin', count: documents.filter((d) => d.categorie === 'PHOTO').length },
          { key: 'facturation', label: 'Facturation', icon: 'facture', count: devis.length + factures.length },
          { key: 'conventions', label: 'Conventions', icon: 'convention', count: conventions.length },
        ]}
      />

      {/* --- Aperçu --- */}
      {tab === 'apercu' && (
        <div className="split">
          <div className="card card--pad">
            <div className="section-title"><Icon name="building" size={18} /> Informations du projet</div>
            <div style={{ marginBottom: 16 }}>
              <label className="cell-sub" style={{ fontWeight: 600 }}>Avancement global</label>
              <div style={{ marginTop: 6 }}><Progress value={chantier.avancement} /></div>
            </div>
            <div className="detail-grid">
              <Detail label="Référence">{chantier.reference || '—'}</Detail>
              <Detail label="Statut">{humanize(chantier.statut)}</Detail>
              <Detail label="Chef de projet">{chantier.chefProjet || '—'}</Detail>
              <Detail label="Budget">{eur(chantier.budget)}</Detail>
              <Detail label="Début">{formatDate(chantier.dateDebut)}</Detail>
              <Detail label="Fin prévue">{formatDate(chantier.dateFinPrevue)}</Detail>
              <Detail label="Adresse">{chantier.adresse || '—'}</Detail>
              <Detail label="Ville">{chantier.ville || '—'}</Detail>
            </div>
            {chantier.description && (
              <div style={{ marginTop: 16 }}>
                <label className="cell-sub" style={{ fontWeight: 600 }}>Description</label>
                <p style={{ marginTop: 6 }}>{chantier.description}</p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card card--pad">
              <div className="section-title"><Icon name="clients" size={18} /> Client</div>
              {client ? (
                <div className="detail-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <Detail label="Nom">{client.nom}</Detail>
                  <Detail label="Contact">{client.contactNom || '—'}</Detail>
                  <Detail label="E-mail">{client.email || '—'}</Detail>
                  <Detail label="Téléphone">{client.telephone || '—'}</Detail>
                </div>
              ) : (
                <p className="cell-sub">Client non renseigné.</p>
              )}
              <Link to="/clients" className="btn btn--ghost btn--sm" style={{ marginTop: 12 }}>
                Voir les clients <Icon name="chevron" size={14} />
              </Link>
            </div>
            <div className="card card--pad">
              <div className="section-title"><Icon name="euro" size={18} /> Finances (projet)</div>
              <div style={{ marginBottom: 10 }} title={`${eur(factureHTp)} facturés HT sur ${eur(chantier.budget)} de budget`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="cell-sub">Facturation / budget</span>
                  <b>{tauxFacturation}%</b>
                </div>
                <Progress value={tauxFacturation} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span className="cell-sub">Budget</span><b>{eur(chantier.budget)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span className="cell-sub">Facturé (HT)</span><b>{eur(factureHTp)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span className="cell-sub">Encaissé</span><b>{eur(factureCA)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span className="cell-sub">Restant dû</span><b style={{ color: factureDu > 0 ? 'var(--danger)' : undefined }}>{eur(factureDu)}</b>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Tâches --- */}
      {tab === 'taches' && (
        <div className="card">
          {taches.length === 0 ? (
            <EmptyState icon="suivi" title="Aucune tâche" text="Aucune tâche pour ce projet." />
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr><th>Tâche</th><th>Responsable</th><th>Échéance</th><th>Priorité</th><th style={{ width: 150 }}>Avancement</th><th>Statut</th></tr>
                </thead>
                <tbody>
                  {taches.map((t) => (
                    <tr key={t.id}>
                      <td className="cell-strong">{t.titre}</td>
                      <td>{t.responsable || '—'}</td>
                      <td>{formatDate(t.dateEcheance)}</td>
                      <td><StatusBadge status={t.priorite} /></td>
                      <td><Progress value={t.avancement} /></td>
                      <td><StatusBadge status={t.statut} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ padding: 14 }}>
            <Link to="/suivi" className="btn btn--ghost btn--sm">Ouvrir le suivi des travaux <Icon name="chevron" size={14} /></Link>
          </div>
        </div>
      )}

      {/* --- Documents --- */}
      {tab === 'docs' && (
        <div className="card">
          {documents.length === 0 ? (
            <EmptyState icon="document" title="Aucun document" text="Aucun document rattaché à ce projet." />
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Document</th><th>Catégorie</th><th>Format</th><th>Ajouté le</th></tr></thead>
                <tbody>
                  {documents.map((d) => (
                    <tr key={d.id}>
                      <td className="cell-strong">{d.titre}</td>
                      <td><Badge tone="primary">{humanize(d.categorie)}</Badge></td>
                      <td className="cell-sub">.{d.type}</td>
                      <td>{formatDate(d.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ padding: 14 }}>
            <Link to="/documents" className="btn btn--ghost btn--sm">Ouvrir les documentations <Icon name="chevron" size={14} /></Link>
          </div>
        </div>
      )}

      {/* --- PV / Contrôles --- */}
      {tab === 'controles' && (
        <div className="card">
          {pvs.length === 0 ? (
            <EmptyState icon="convention" title="Aucun PV" text="Aucun document de contrôle émis pour ce projet." />
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Référence</th><th>Type</th><th>Ouvrage / zone</th><th>Date</th><th>Contrôleur</th><th style={{ width: 60 }}></th></tr></thead>
                <tbody>
                  {pvs.map((p) => {
                    const payload = p.payload as PvData;
                    return (
                      <tr key={p.id}>
                        <td className="cell-strong">{p.reference}</td>
                        <td>{PV_LABELS[p.type as PvType] ?? p.type}</td>
                        <td className="cell-sub">{payload?.ouvrage || '—'}</td>
                        <td>{formatDate(p.date)}</td>
                        <td>{p.controleur || '—'}</td>
                        <td>
                          <button className="icon-btn" onClick={() => exportPv(payload)} aria-label="Ré-imprimer" title="Ré-imprimer / PDF">
                            <Icon name="download" size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ padding: 14 }}>
            <Link to="/suivi" className="btn btn--ghost btn--sm">Générer un document de contrôle <Icon name="chevron" size={14} /></Link>
          </div>
        </div>
      )}

      {/* --- Photos --- */}
      {tab === 'photos' && (
        <div className="card card--pad">
          <div className="section-title"><Icon name="pin" size={18} /> Photos du chantier</div>
          <PhotoGallery chantierId={chantier.id} clientId={chantier.clientId} />
        </div>
      )}

      {/* --- Facturation --- */}
      {tab === 'facturation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <p className="cell-sub" style={{ margin: 0 }}>
              <Icon name="pin" size={13} /> Devis et factures <b>rattachés à ce projet</b>. Les autres documents du client <b>{client?.nom}</b> sont listés en bas.
            </p>
            {can.canManageFacturation && (
              <button className="btn btn--primary btn--sm" onClick={creerDevisModele}>
                <Icon name="plus" size={14} /> Nouveau devis (modèle BET)
              </button>
            )}
          </div>
          <div className="card">
            <div className="card--pad" style={{ paddingBottom: 0 }}><div className="section-title" style={{ marginBottom: 0 }}><Icon name="devis" size={18} /> Devis</div></div>
            {devis.length === 0 ? <div style={{ padding: 20 }} className="cell-sub">Aucun devis.</div> : (
              <div className="table-wrap"><table className="data">
                <thead><tr><th>Référence</th><th>Objet</th><th>Montant TTC</th><th>Statut</th><th style={{ width: 50 }}></th></tr></thead>
                <tbody>{devis.map((d) => (
                  <tr key={d.id}>
                    <td className="cell-strong">{d.reference}</td><td>{d.objet}</td><td className="cell-strong">{eur(d.montantTTC)}</td>
                    <td><StatusBadge status={d.statut} /></td>
                    <td><button className="icon-btn" onClick={() => exportDevisPdf(d, client)} title="PDF"><Icon name="download" size={15} /></button></td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}
          </div>
          <div className="card">
            <div className="card--pad" style={{ paddingBottom: 0 }}><div className="section-title" style={{ marginBottom: 0 }}><Icon name="facture" size={18} /> Factures</div></div>
            {factures.length === 0 ? <div style={{ padding: 20 }} className="cell-sub">Aucune facture.</div> : (
              <div className="table-wrap"><table className="data">
                <thead><tr><th>Référence</th><th>Échéance</th><th>Montant TTC</th><th>Réglé</th><th>Statut</th><th style={{ width: 50 }}></th></tr></thead>
                <tbody>{factures.map((f) => (
                  <tr key={f.id}>
                    <td className="cell-strong">{f.reference}</td><td>{formatDate(f.dateEcheance)}</td><td className="cell-strong">{eur(f.montantTTC)}</td>
                    <td>{eur(f.montantPaye)}</td><td><StatusBadge status={f.statut} /></td>
                    <td><button className="icon-btn" onClick={() => exportFacturePdf(f, client)} title="PDF"><Icon name="download" size={15} /></button></td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}
          </div>

          {(devisAutres.length > 0 || facturesAutres.length > 0) && (
            <div className="card card--pad">
              <div className="section-title" style={{ marginBottom: 6 }}>
                <Icon name="clients" size={18} /> Autres documents du client (autres projets)
              </div>
              <p className="cell-sub" style={{ marginBottom: 4 }}>
                {devisAutres.length} devis et {facturesAutres.length} facture(s) du client rattachés à d’autres projets.
              </p>
              {[...devisAutres, ...facturesAutres].map((doc) => (
                <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <span className="cell-strong">{doc.reference}</span>
                    <span className="cell-sub"> · {data.chantiers.find((c) => c.id === doc.chantierId)?.nom ?? 'Sans projet'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="cell-strong">{eur(doc.montantTTC)}</span>
                    <StatusBadge status={doc.statut} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- Conventions --- */}
      {tab === 'conventions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <p className="cell-sub" style={{ margin: 0 }}>
              <Icon name="convention" size={13} /> Conventions du client <b>{client?.nom}</b>.
            </p>
            {can.canManageFacturation && (
              <button className="btn btn--primary btn--sm" onClick={creerConventionModele}>
                <Icon name="plus" size={14} /> Nouvelle convention + contrat
              </button>
            )}
          </div>
          <div className="card">
            {conventions.length === 0 ? (
              <EmptyState icon="convention" title="Aucune convention" text="Aucune convention pour ce client." />
            ) : (
              <div className="table-wrap">
                <table className="data">
                  <thead><tr><th>Référence</th><th>Objet</th><th>Période</th><th>Montant</th><th>Statut</th><th style={{ width: 50 }}></th></tr></thead>
                  <tbody>
                    {conventions.map((cv) => (
                      <tr key={cv.id}>
                        <td className="cell-strong">{cv.reference}</td>
                        <td>{cv.objet}</td>
                        <td className="cell-sub">{formatDate(cv.dateDebut)} → {formatDate(cv.dateFin)}</td>
                        <td className="cell-strong">{eur(cv.montant)}</td>
                        <td><StatusBadge status={cv.statut} /></td>
                        <td>
                          <button className="icon-btn" onClick={() => exportConventionPdf(cv, client)} aria-label="Générer le contrat" title="Générer le contrat (PDF)">
                            <Icon name="download" size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
