import { useRef, useState } from 'react';
import { useSettings, saveSettings, resetSettings, getSettings, type AppSettings } from '@/lib/settings';
import { resizeImage, isImageFile } from '@/lib/images';
import { PageHead } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { useCan } from '@/lib/roles';

export default function Parametres() {
  const current = useSettings();
  const toast = useToast();
  const can = useCan();
  const logoRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<AppSettings>(() => ({ ...current, company: { ...current.company } }));

  const readonly = !can.canManageMembers;
  const setC = <K extends keyof AppSettings['company']>(k: K, v: string) =>
    setForm((f) => ({ ...f, company: { ...f.company, [k]: v } }));
  const set = <K extends keyof AppSettings>(k: K, v: AppSettings[K]) => setForm((f) => ({ ...f, [k]: v }));

  const onLogo = async (file: File) => {
    if (!isImageFile(file)) {
      toast('Veuillez choisir une image.', 'danger');
      return;
    }
    const r = await resizeImage(file, 700, 0.9);
    set('letterheadLogo', r.dataUrl);
    toast('Logo chargé — pensez à enregistrer.', 'success');
  };

  const enregistrer = () => {
    saveSettings(form);
    toast('Paramètres enregistrés.', 'success');
  };
  const reinitialiser = () => {
    if (!confirm('Réinitialiser tous les paramètres (identité, logo, valeurs par défaut) ?')) return;
    resetSettings();
    const s = getSettings();
    setForm({ ...s, company: { ...s.company } });
    toast('Paramètres réinitialisés.', 'success');
  };

  return (
    <>
      <PageHead
        title="Paramètres de l’entreprise"
        subtitle="Identité, logo et valeurs par défaut — repris sur tous les documents"
        actions={
          can.canManageMembers && (
            <>
              <button className="btn btn--ghost" onClick={reinitialiser}>
                <Icon name="settings" size={16} /> Réinitialiser
              </button>
              <button className="btn btn--primary" onClick={enregistrer}>
                <Icon name="check" size={16} /> Enregistrer
              </button>
            </>
          )
        }
      />

      {readonly && (
        <div className="login-error" style={{ marginBottom: 16 }}>
          <Icon name="alert" size={15} /> Lecture seule — seule la Direction peut modifier les paramètres.
        </div>
      )}

      <div className="split">
        {/* Identité */}
        <div className="card card--pad">
          <div className="section-title"><Icon name="building" size={18} /> Identité de l’entreprise</div>
          <div className="form-grid">
            <div className="field field--full">
              <label>Nom / Raison sociale</label>
              <input value={form.company.nom} disabled={readonly} onChange={(e) => setC('nom', e.target.value)} />
            </div>
            <div className="field field--full">
              <label>Activité</label>
              <input value={form.company.activite} disabled={readonly} onChange={(e) => setC('activite', e.target.value)} />
            </div>
            <div className="field field--full">
              <label>Spécialités</label>
              <textarea value={form.company.specialites} disabled={readonly} onChange={(e) => setC('specialites', e.target.value)} />
            </div>
            <div className="field field--full">
              <label>Adresse (siège)</label>
              <input value={form.company.adresse} disabled={readonly} onChange={(e) => setC('adresse', e.target.value)} />
            </div>
            <div className="field">
              <label>ICE</label>
              <input value={form.company.ice} disabled={readonly} onChange={(e) => setC('ice', e.target.value)} />
            </div>
            <div className="field">
              <label>RC</label>
              <input value={form.company.rc} disabled={readonly} onChange={(e) => setC('rc', e.target.value)} />
            </div>
            <div className="field">
              <label>IF (identifiant fiscal)</label>
              <input value={form.company.ifisc} disabled={readonly} onChange={(e) => setC('ifisc', e.target.value)} />
            </div>
            <div className="field">
              <label>E-mail</label>
              <input value={form.company.email} disabled={readonly} onChange={(e) => setC('email', e.target.value)} />
            </div>
            <div className="field">
              <label>Téléphone fixe</label>
              <input value={form.company.fixe} disabled={readonly} onChange={(e) => setC('fixe', e.target.value)} />
            </div>
            <div className="field">
              <label>Mobile</label>
              <input value={form.company.mobile} disabled={readonly} onChange={(e) => setC('mobile', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Logo + valeurs par défaut */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card card--pad">
            <div className="section-title"><Icon name="document" size={18} /> Logo / en-tête</div>
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, textAlign: 'center', marginBottom: 12 }}>
              <img src={form.letterheadLogo} alt="Logo" style={{ maxWidth: '100%', maxHeight: 90 }} />
            </div>
            {!readonly && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn--ghost btn--sm" onClick={() => logoRef.current?.click()}>
                  <Icon name="folder" size={14} /> Changer le logo
                </button>
                <input
                  ref={logoRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onLogo(f); e.target.value = ''; }}
                />
              </div>
            )}
            <p className="cell-sub" style={{ marginTop: 10 }}>Repris en tête de tous les documents générés.</p>
          </div>

          <div className="card card--pad">
            <div className="section-title"><Icon name="euro" size={18} /> Valeurs par défaut</div>
            <div className="form-grid">
              <div className="field">
                <label>TVA par défaut (%)</label>
                <input type="number" value={form.tvaDefaut} disabled={readonly} onChange={(e) => set('tvaDefaut', Number(e.target.value))} />
              </div>
              <div className="field">
                <label>Barème kilométrique (MAD/km)</label>
                <input type="number" step="0.1" value={form.baremeKm} disabled={readonly} onChange={(e) => set('baremeKm', Number(e.target.value))} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
