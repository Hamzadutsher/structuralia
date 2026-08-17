import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '@/lib/store';
import { eur, eurShort, formatDate, daysUntil } from '@/lib/format';
import { PageHead, StatCard } from '@/components/ui/Page';
import { StatusBadge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { buildRelanceText } from '@/lib/relance';
import { toCsv, downloadText } from '@/lib/csv';
import { useToast } from '@/components/ui/Toast';

const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const monthKey = (iso?: string) => (iso ? iso.slice(0, 7) : '');

export default function Tresorerie() {
  const data = useData();
  const toast = useToast();
  const clientObj = (id?: string) => data.clients.find((c) => c.id === id);
  const clientName = (id?: string) => clientObj(id)?.nom ?? '—';

  const relancer = (factureId: string) => {
    const f = data.factures.find((x) => x.id === factureId);
    if (!f) return;
    const client = clientObj(f.clientId);
    const to = client?.email ?? '';
    const subject = `Relance — facture ${f.reference}`;
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildRelanceText(f, client))}`;
  };

  const enc = useMemo(() => {
    // Encaissements attendus : factures non soldées (reste dû).
    return data.factures
      .filter((f) => f.statut !== 'PAYEE' && f.statut !== 'ANNULEE')
      .map((f) => ({ f, reste: (f.montantTTC || 0) - (f.montantPaye || 0), dj: daysUntil(f.dateEcheance) }))
      .filter((x) => x.reste > 0)
      .sort((a, b) => (a.f.dateEcheance ?? '').localeCompare(b.f.dateEcheance ?? ''));
  }, [data.factures]);

  const dec = useMemo(() => {
    // Décaissements prévus : dépenses à payer.
    return data.depenses
      .filter((d) => d.statut === 'A_PAYER')
      .map((d) => ({ d, dj: daysUntil(d.date) }))
      .sort((a, b) => (a.d.date ?? '').localeCompare(b.d.date ?? ''));
  }, [data.depenses]);

  const kpi = useMemo(() => {
    const encaisse = data.factures.reduce((s, f) => s + (f.montantPaye || 0), 0);
    const paye = data.depenses.filter((d) => d.statut === 'PAYEE').reduce((s, d) => s + (d.montantTTC || 0), 0);
    const aEncaisser = enc.reduce((s, x) => s + x.reste, 0);
    const aPayer = dec.reduce((s, x) => s + (x.d.montantTTC || 0), 0);
    const tresorerie = encaisse - paye;
    return { tresorerie, aEncaisser, aPayer, previsionnel: tresorerie + aEncaisser - aPayer };
  }, [data.factures, data.depenses, enc, dec]);

  // Prévisionnel mensuel (6 mois glissants).
  const previsionnel = useMemo(() => {
    const now = new Date();
    const mois: { key: string; label: string; entrees: number; sorties: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      mois.push({ key, label: `${MOIS[d.getMonth()]} ${d.getFullYear()}`, entrees: 0, sorties: 0 });
    }
    const byKey = new Map(mois.map((m) => [m.key, m]));
    enc.forEach((x) => {
      const m = byKey.get(monthKey(x.f.dateEcheance));
      if (m) m.entrees += x.reste;
    });
    dec.forEach((x) => {
      const m = byKey.get(monthKey(x.d.date));
      if (m) m.sorties += x.d.montantTTC || 0;
    });
    let cumul = kpi.tresorerie;
    return mois.map((m) => {
      const net = m.entrees - m.sorties;
      cumul += net;
      return { ...m, net, cumul };
    });
  }, [enc, dec, kpi.tresorerie]);

  const maxNet = Math.max(1, ...previsionnel.map((m) => Math.abs(m.net)));

  const exporterCsv = () => {
    const rows = previsionnel.map((m) => [m.label, m.entrees, m.sorties, m.net, m.cumul]);
    downloadText('previsionnel-tresorerie.csv', toCsv(['Mois', 'Entrées', 'Sorties', 'Net', 'Solde cumulé'], rows));
    toast('Prévisionnel exporté (CSV).', 'success');
  };

  return (
    <>
      <PageHead
        title="Trésorerie & échéancier"
        subtitle="Encaissements attendus, décaissements et prévisionnel"
        actions={
          <button className="btn btn--ghost" onClick={exporterCsv}>
            <Icon name="download" size={16} /> Exporter le prévisionnel (CSV)
          </button>
        }
      />

      <div className="stat-grid">
        <StatCard icon="euro" value={eurShort(kpi.tresorerie)} label="Trésorerie actuelle" trendUp={kpi.tresorerie >= 0} trend={kpi.tresorerie >= 0 ? 'Positive' : 'Négative'} />
        <StatCard icon="facture" value={eurShort(kpi.aEncaisser)} label="À encaisser (factures)" />
        <StatCard icon="clock" value={eurShort(kpi.aPayer)} label="À payer (dépenses)" />
        <StatCard icon="trending" value={eurShort(kpi.previsionnel)} label="Solde prévisionnel" trendUp={kpi.previsionnel >= 0} trend={kpi.previsionnel >= 0 ? 'Excédent' : 'Déficit'} />
      </div>

      {/* Prévisionnel mensuel */}
      <div className="card card--pad" style={{ marginBottom: 20 }}>
        <div className="section-title"><Icon name="calendar" size={18} /> Prévisionnel de trésorerie (6 mois)</div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Mois</th>
                <th style={{ textAlign: 'right' }}>Entrées</th>
                <th style={{ textAlign: 'right' }}>Sorties</th>
                <th style={{ textAlign: 'right' }}>Net</th>
                <th style={{ textAlign: 'right' }}>Solde cumulé</th>
              </tr>
            </thead>
            <tbody>
              {previsionnel.map((m) => (
                <tr key={m.key}>
                  <td className="cell-strong">{m.label}</td>
                  <td style={{ textAlign: 'right', color: 'var(--success)' }}>{m.entrees ? eur(m.entrees) : '—'}</td>
                  <td style={{ textAlign: 'right', color: 'var(--danger)' }}>{m.sorties ? eur(m.sorties) : '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: m.net >= 0 ? 'var(--success)' : 'var(--danger)' }}>{eur(m.net)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: m.cumul >= 0 ? 'var(--primary-700)' : 'var(--danger)' }}>{eur(m.cumul)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Graphique de flux net */}
      <div className="card card--pad" style={{ marginBottom: 20 }}>
        <div className="section-title"><Icon name="trending" size={18} /> Flux net mensuel</div>
        <div className="barlist">
          {previsionnel.map((m) => (
            <div className="barlist__row" key={m.key}>
              <div className="barlist__label">{m.label}</div>
              <div className="barlist__track">
                <div
                  className="barlist__bar"
                  style={{ width: `${(Math.abs(m.net) / maxNet) * 100}%`, background: m.net >= 0 ? 'var(--success)' : 'var(--danger)' }}
                />
              </div>
              <div className="barlist__value" style={{ color: m.net >= 0 ? 'var(--success)' : 'var(--danger)' }}>{eurShort(m.net)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="split">
        {/* Encaissements attendus */}
        <div className="card card--pad">
          <div className="section-title">
            <Icon name="facture" size={18} /> Encaissements attendus
            <span className="tab__count" style={{ marginLeft: 8 }}>{enc.length}</span>
          </div>
          {enc.length === 0 ? (
            <p className="cell-sub">Aucune facture en attente d’encaissement.</p>
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Facture</th><th>Client</th><th>Échéance</th><th style={{ textAlign: 'right' }}>Reste dû</th><th style={{ width: 44 }}></th></tr></thead>
                <tbody>
                  {enc.map(({ f, reste, dj }) => (
                    <tr key={f.id}>
                      <td className="cell-strong">{f.reference}</td>
                      <td className="cell-sub">{clientName(f.clientId)}</td>
                      <td className={dj !== null && dj < 0 ? 'echeance-retard' : ''}>{formatDate(f.dateEcheance)}</td>
                      <td style={{ textAlign: 'right' }} className="cell-strong">{eur(reste)}</td>
                      <td>
                        <button className="icon-btn" onClick={() => relancer(f.id)} aria-label="Relancer par e-mail" title="Relancer par e-mail">
                          <Icon name="bell" size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Link to="/facturation" className="btn btn--ghost btn--sm" style={{ marginTop: 12 }}>Voir la facturation <Icon name="chevron" size={14} /></Link>
        </div>

        {/* Décaissements prévus */}
        <div className="card card--pad">
          <div className="section-title">
            <Icon name="euro" size={18} /> Décaissements prévus
            <span className="tab__count" style={{ marginLeft: 8 }}>{dec.length}</span>
          </div>
          {dec.length === 0 ? (
            <p className="cell-sub">Aucune dépense à payer.</p>
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Dépense</th><th>Date</th><th>Statut</th><th style={{ textAlign: 'right' }}>Montant</th></tr></thead>
                <tbody>
                  {dec.map(({ d, dj }) => (
                    <tr key={d.id}>
                      <td className="cell-strong">{d.libelle}</td>
                      <td className={dj !== null && dj < 0 ? 'echeance-retard' : ''}>{formatDate(d.date)}</td>
                      <td><StatusBadge status={d.statut} /></td>
                      <td style={{ textAlign: 'right' }} className="cell-strong">{eur(d.montantTTC)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Link to="/comptabilite" className="btn btn--ghost btn--sm" style={{ marginTop: 12 }}>Voir la comptabilité <Icon name="chevron" size={14} /></Link>
        </div>
      </div>
    </>
  );
}
