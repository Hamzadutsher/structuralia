import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '@/lib/store';
import { eur, eurShort, formatDate, daysUntil } from '@/lib/format';
import { PageHead, StatCard } from '@/components/ui/Page';
import { StatusBadge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Misc';
import { Icon } from '@/components/ui/Icon';
import { BarList, type BarItem } from '@/components/ui/BarList';

const LAST_PROJET_KEY = 'structuralia:lastProjet';

export default function Dashboard() {
  const data = useData();
  const navigate = useNavigate();
  const [projetSel, setProjetSelState] = useState(() => localStorage.getItem(LAST_PROJET_KEY) || 'ALL');

  // Mémorise le dernier projet consulté.
  const setProjetSel = (v: string) => {
    setProjetSelState(v);
    try {
      localStorage.setItem(LAST_PROJET_KEY, v);
    } catch {
      /* ignore */
    }
  };

  // Si le projet mémorisé n'existe plus, on retombe sur le portefeuille.
  const effectiveSel =
    projetSel !== 'ALL' && data.chantiers.some((c) => c.id === projetSel) ? projetSel : 'ALL';

  const clientName = (id?: string) => data.clients.find((c) => c.id === id)?.nom ?? '—';

  const selecteur = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Icon name="chantier" size={16} />
      <select
        className="select"
        value={effectiveSel}
        onChange={(e) => setProjetSel(e.target.value)}
        style={{ minWidth: 220 }}
        aria-label="Projet"
      >
        <option value="ALL">Tous les projets (portefeuille)</option>
        {data.chantiers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nom}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <>
      <PageHead
        title="Tableau de bord"
        subtitle="Pilotage de l’activité, centré sur vos projets"
        actions={selecteur}
      />
      {effectiveSel === 'ALL' ? (
        <Portfolio data={data} clientName={clientName} navigate={navigate} />
      ) : (
        <ProjectFocus data={data} id={effectiveSel} clientName={clientName} navigate={navigate} />
      )}
    </>
  );
}

/* ---------------------------------------------------- Vue portefeuille */

type DataT = ReturnType<typeof useData>;
type Nav = ReturnType<typeof useNavigate>;

function Portfolio({
  data,
  clientName,
  navigate,
}: {
  data: DataT;
  clientName: (id?: string) => string;
  navigate: Nav;
}) {
  const kpi = useMemo(() => {
    const caEncaisse = data.factures.reduce((s, f) => s + (f.montantPaye || 0), 0);
    const enAttente = data.factures
      .filter((f) => f.statut !== 'PAYEE' && f.statut !== 'ANNULEE')
      .reduce((s, f) => s + (f.montantTTC - (f.montantPaye || 0)), 0);
    const actifs = data.chantiers.filter((c) => c.statut === 'EN_COURS');
    const avancementMoyen = actifs.length
      ? Math.round(actifs.reduce((s, c) => s + c.avancement, 0) / actifs.length)
      : 0;
    return { caEncaisse, enAttente, nbActifs: actifs.length, avancementMoyen };
  }, [data]);

  // Facturation HT émise pour un projet (indicateur budget vs facturé).
  const factureHTProjet = (chantierId: string) =>
    data.factures.filter((f) => f.chantierId === chantierId).reduce((s, f) => s + (f.montantHT || 0), 0);

  const rangStatut: Record<string, number> = { EN_COURS: 0, PLANIFIE: 1, SUSPENDU: 2, TERMINE: 3, ANNULE: 4 };
  const projets = [...data.chantiers].sort(
    (a, b) => (rangStatut[a.statut] ?? 9) - (rangStatut[b.statut] ?? 9) || b.avancement - a.avancement,
  );

  const caParClient = useMemo<BarItem[]>(() => {
    const totaux = new Map<string, number>();
    data.factures.forEach((f) => {
      if (f.statut === 'ANNULEE') return;
      totaux.set(f.clientId, (totaux.get(f.clientId) ?? 0) + f.montantTTC);
    });
    return [...totaux.entries()]
      .map(([id, total]) => ({ label: clientName(id), value: total, display: eurShort(total) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.factures, data.clients]);

  const facturesARelancer = data.factures
    .filter((f) => f.statut === 'EN_RETARD' || f.statut === 'PARTIELLE')
    .slice(0, 5);

  const tachesUrgentes = data.taches
    .filter((t) => t.statut !== 'TERMINE')
    .map((t) => ({ ...t, dj: daysUntil(t.dateEcheance) ?? 999 }))
    .sort((a, b) => a.dj - b.dj)
    .slice(0, 6);

  return (
    <>
      <div className="stat-grid">
        <StatCard icon="chantier" value={String(kpi.nbActifs)} label="Projets en cours" />
        <StatCard icon="trending" value={`${kpi.avancementMoyen}%`} label="Avancement moyen" />
        <StatCard icon="euro" value={eurShort(kpi.caEncaisse)} label="Chiffre d’affaires encaissé" />
        <StatCard icon="clock" value={eurShort(kpi.enAttente)} label="Encours à recouvrer" />
      </div>

      {/* Portefeuille de projets */}
      <div className="card card--pad" style={{ marginBottom: 20 }}>
        <div className="section-title">
          <Icon name="chantier" size={18} /> Portefeuille de projets
          <span className="cell-sub" style={{ fontWeight: 400, marginLeft: 'auto' }}>
            Cliquez un projet pour ouvrir sa fiche
          </span>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Projet</th>
                <th>Client</th>
                <th>Statut</th>
                <th style={{ width: 150 }}>Avancement</th>
                <th>Budget</th>
                <th style={{ width: 170 }}>Facturation / budget</th>
                <th>Échéance</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {projets.map((c) => {
                const factHT = factureHTProjet(c.id);
                const taux = c.budget ? Math.round((factHT / c.budget) * 100) : 0;
                return (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/projets/${c.id}`)}>
                  <td>
                    <Link to={`/projets/${c.id}`} className="cell-strong" onClick={(e) => e.stopPropagation()}>
                      {c.nom}
                    </Link>
                    <div className="cell-sub">{c.reference} · {c.ville}</div>
                  </td>
                  <td>{clientName(c.clientId)}</td>
                  <td><StatusBadge status={c.statut} /></td>
                  <td><Progress value={c.avancement} /></td>
                  <td className="cell-strong">{eur(c.budget)}</td>
                  <td title={`${eur(factHT)} facturés sur ${eur(c.budget)}`}>
                    <div className="progress-label">
                      <div className="progress">
                        <div
                          className="progress__bar"
                          style={{ width: `${Math.min(100, taux)}%`, background: taux >= 100 ? 'var(--success)' : undefined }}
                        />
                      </div>
                      <span>{taux}%</span>
                    </div>
                  </td>
                  <td>{formatDate(c.dateFinPrevue)}</td>
                  <td style={{ color: 'var(--text-soft)' }}><Icon name="chevron" size={16} /></td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="split">
        <div className="card card--pad">
          <div className="section-title">
            <Icon name="trending" size={18} /> Chiffre d’affaires facturé par client
            <span className="cell-sub" style={{ fontWeight: 400, marginLeft: 'auto' }}>Top 5 · TTC</span>
          </div>
          <BarList items={caParClient} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card card--pad">
            <div className="section-title"><Icon name="alert" size={18} /> Factures à relancer</div>
            {facturesARelancer.length === 0 && <p className="cell-sub">Aucune relance en attente.</p>}
            {facturesARelancer.map((f) => (
              <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div className="cell-strong">{f.reference}</div>
                  <div className="cell-sub">{clientName(f.clientId)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="cell-strong">{eur(f.montantTTC - (f.montantPaye || 0))}</div>
                  <StatusBadge status={f.statut} />
                </div>
              </div>
            ))}
            <Link to="/facturation" className="btn btn--ghost btn--sm" style={{ marginTop: 12 }}>
              Voir la facturation <Icon name="chevron" size={14} />
            </Link>
          </div>

          <div className="card card--pad">
            <div className="section-title"><Icon name="suivi" size={18} /> Tâches prioritaires</div>
            {tachesUrgentes.map((t) => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ minWidth: 0 }}>
                  <div className="cell-strong" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{t.titre}</div>
                  <div className="cell-sub">{clientName(data.chantiers.find((c) => c.id === t.chantierId)?.clientId)}</div>
                </div>
                <StatusBadge status={t.priorite} />
              </div>
            ))}
            <Link to="/suivi" className="btn btn--ghost btn--sm" style={{ marginTop: 12 }}>
              Suivi des travaux <Icon name="chevron" size={14} />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------------------------------------------------- Vue projet focalisé */

function ProjectFocus({
  data,
  id,
  clientName,
  navigate,
}: {
  data: DataT;
  id: string;
  clientName: (id?: string) => string;
  navigate: Nav;
}) {
  const chantier = data.chantiers.find((c) => c.id === id);
  if (!chantier) return <div className="card card--pad">Projet introuvable.</div>;

  const factures = data.factures.filter((f) => f.chantierId === id);
  const caProjet = factures.reduce((s, f) => s + (f.montantPaye || 0), 0);
  const duProjet = factures
    .filter((f) => f.statut !== 'PAYEE' && f.statut !== 'ANNULEE')
    .reduce((s, f) => s + (f.montantTTC - (f.montantPaye || 0)), 0);
  const factureHT = factures.reduce((s, f) => s + (f.montantHT || 0), 0);
  const tauxFacturation = chantier.budget ? Math.round((factureHT / chantier.budget) * 100) : 0;
  const taches = data.taches.filter((t) => t.chantierId === id);
  const tachesOuvertes = taches
    .filter((t) => t.statut !== 'TERMINE')
    .map((t) => ({ ...t, dj: daysUntil(t.dateEcheance) ?? 999 }))
    .sort((a, b) => a.dj - b.dj);
  const nbDocs = data.documents.filter((d) => d.chantierId === id).length;
  const nbPv = data.pvs.filter((p) => p.chantierId === id).length;
  const dj = daysUntil(chantier.dateFinPrevue);

  return (
    <>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <StatusBadge status={chantier.statut} />
        <span className="cell-sub">
          {chantier.reference} · {chantier.ville} · {clientName(chantier.clientId)} · Chef de projet : {chantier.chefProjet || '—'}
        </span>
        <div style={{ flex: 1 }} />
        <Link to={`/projets/${chantier.id}`} className="btn btn--primary btn--sm">
          <Icon name="dashboard" size={14} /> Ouvrir la fiche complète
        </Link>
      </div>

      <div className="stat-grid">
        <StatCard icon="trending" value={`${chantier.avancement}%`} label="Avancement" />
        <StatCard icon="euro" value={eurShort(chantier.budget)} label="Budget du projet" />
        <StatCard icon="facture" value={eurShort(caProjet)} label="Facturé encaissé" />
        <StatCard icon="clock" value={eurShort(duProjet)} label="Restant dû" />
      </div>

      <div className="split">
        <div className="card card--pad">
          <div className="section-title">
            <Icon name="suivi" size={18} /> Tâches en cours du projet
            <span className="tab__count" style={{ marginLeft: 8 }}>{tachesOuvertes.length}</span>
          </div>
          {tachesOuvertes.length === 0 ? (
            <p className="cell-sub">Aucune tâche ouverte.</p>
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr><th>Tâche</th><th>Responsable</th><th>Échéance</th><th>Priorité</th><th>Statut</th></tr>
                </thead>
                <tbody>
                  {tachesOuvertes.map((t) => (
                    <tr key={t.id}>
                      <td className="cell-strong">{t.titre}</td>
                      <td>{t.responsable || '—'}</td>
                      <td className={t.dj < 0 ? 'echeance-retard' : ''}>{formatDate(t.dateEcheance)}</td>
                      <td><StatusBadge status={t.priorite} /></td>
                      <td><StatusBadge status={t.statut} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card card--pad">
            <div className="section-title"><Icon name="building" size={18} /> Repères</div>
            <div style={{ marginBottom: 12 }}>
              <label className="cell-sub" style={{ fontWeight: 600 }}>Avancement</label>
              <div style={{ marginTop: 6 }}><Progress value={chantier.avancement} /></div>
            </div>
            <div style={{ marginBottom: 12 }} title={`${eur(factureHT)} facturés sur ${eur(chantier.budget)}`}>
              <label className="cell-sub" style={{ fontWeight: 600 }}>Facturation / budget</label>
              <div style={{ marginTop: 6 }}><Progress value={tauxFacturation} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span className="cell-sub">Échéance</span>
              <b style={{ color: dj !== null && dj < 0 && chantier.statut !== 'TERMINE' ? 'var(--danger)' : undefined }}>
                {formatDate(chantier.dateFinPrevue)}
              </b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span className="cell-sub">Documents</span><b>{nbDocs}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span className="cell-sub">PV de contrôle</span><b>{nbPv}</b>
            </div>
          </div>
          <div className="card card--pad">
            <div className="section-title"><Icon name="facture" size={18} /> Accès rapides</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn btn--ghost btn--sm" onClick={() => navigate(`/projets/${chantier.id}`)}>
                <Icon name="euro" size={14} /> Facturation du projet
              </button>
              <Link to="/suivi" className="btn btn--ghost btn--sm">
                <Icon name="convention" size={14} /> Documents de contrôle
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
