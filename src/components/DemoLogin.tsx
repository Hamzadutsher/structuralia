import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { demoLogin, rememberedUsername, DEMO_USER } from '@/lib/demoAuth';

/** Écran de connexion du mode démonstration. */
export function DemoLogin({ onSuccess }: { onSuccess: (displayName: string) => void }) {
  const remembered = rememberedUsername();
  const [username, setUsername] = useState(remembered);
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(!!remembered);
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const ok = await demoLogin(username, password, remember);
      if (ok) onSuccess(DEMO_USER.displayName);
      else setError('Identifiant ou mot de passe incorrect.');
    } catch {
      setError('Erreur de connexion.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <div className="login-logo">S</div>
          <div>
            <b>STRUCTURALIA</b>
            <span>Bureau d’études techniques</span>
          </div>
        </div>

        <h1 className="login-title">Connexion</h1>
        <p className="login-sub">Espace de gestion du bureau d’études</p>

        <div className="field" style={{ marginBottom: 14 }}>
          <label>Identifiant</label>
          <div className="login-input">
            <Icon name="clients" size={16} />
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ex. D.HAMZA"
              autoComplete="username"
              autoFocus={!remembered}
            />
          </div>
        </div>

        <div className="field" style={{ marginBottom: 14 }}>
          <label>Mot de passe</label>
          <div className="login-input">
            <Icon name="settings" size={16} />
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Votre mot de passe"
              autoComplete="current-password"
              autoFocus={!!remembered}
            />
            <button type="button" className="login-eye" onClick={() => setShowPwd((v) => !v)} aria-label="Afficher/masquer">
              <Icon name={showPwd ? 'close' : 'search'} size={15} />
            </button>
          </div>
        </div>

        <label className="login-remember">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Se souvenir de moi
        </label>

        {error && (
          <div className="login-error">
            <Icon name="alert" size={15} /> {error}
          </div>
        )}

        <button className="btn btn--primary login-submit" type="submit" disabled={busy}>
          {busy ? 'Connexion…' : (
            <>
              <Icon name="logout" size={16} /> Se connecter
            </>
          )}
        </button>
      </form>
    </div>
  );
}
