import { useEffect, useState } from 'react';
import { authApi } from './api/authApi';
import CloudWorkspace from './CloudWorkspace';

export function Brand() {
  return <div className="brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span><span>Cloud Agent</span></div>;
}

function AuthForm({ mode, onModeChange, onSubmit, busy, error, notice }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const isSignUp = mode === 'signup';
  function update(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); }
  function submit(event) { event.preventDefault(); onSubmit({ first_name: form.firstName.trim(), last_name: form.lastName.trim(), email: form.email.trim().toLowerCase(), password: form.password }); }

  return <main className="auth-page">
    <section className="auth-story" aria-label="About Cloud Agent"><Brand /><div className="auth-story-copy"><span className="eyebrow">Your coding workspace</span><h1>From idea to<br /><span>working code.</span></h1><p>Connect a repository, describe what you need, and follow your agent’s work from one focused workspace.</p></div><div className="auth-story-footer"><span className="story-dot" /> Built for the way you ship.</div></section>
    <section className="auth-panel" aria-labelledby="auth-title"><div className="auth-mobile-brand"><Brand /></div><div className="auth-card">
      <span className="eyebrow">{isSignUp ? 'Get started' : 'Welcome back'}</span><h2 id="auth-title">{isSignUp ? 'Create your account' : 'Sign in to Cloud Agent'}</h2><p className="auth-description">{isSignUp ? 'Set up your workspace and start building with your agent.' : 'Pick up where you left off in your workspace.'}</p>
      {notice && <p className="notice notice-success" role="status">{notice}</p>}{error && <p className="notice notice-error" role="alert">{error}</p>}
      <form className="auth-form" onSubmit={submit}>{isSignUp && <div className="form-row"><label className="field">First name<input name="firstName" autoComplete="given-name" value={form.firstName} onChange={update} required disabled={busy} /></label><label className="field">Last name<input name="lastName" autoComplete="family-name" value={form.lastName} onChange={update} required disabled={busy} /></label></div>}
        <label className="field">Email<input name="email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={update} required disabled={busy} /></label><label className="field">Password<input name="password" type="password" autoComplete={isSignUp ? 'new-password' : 'current-password'} minLength={isSignUp ? 8 : undefined} placeholder="Enter your password" value={form.password} onChange={update} required disabled={busy} /></label>{isSignUp && <p className="field-hint">Use at least 8 characters.</p>}<button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}</button>
      </form><p className="auth-switch">{isSignUp ? 'Already have an account?' : 'New to Cloud Agent?'} <button type="button" onClick={() => onModeChange(isSignUp ? 'signin' : 'signup')} disabled={busy}>{isSignUp ? 'Sign in' : 'Create an account'}</button></p>
    </div><p className="auth-panel-footer">Cloud Agent · Your workspace for code changes</p></section>
  </main>;
}

export default function CloudApp() {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('signup');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { let active = true; authApi.getProfile().then(({ user: profile }) => { if (active) setUser(profile); }).catch(() => {}).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  function changeMode(nextMode) { setMode(nextMode); setError(''); setNotice(''); }
  async function submit(values) { setBusy(true); setError(''); setNotice(''); try { if (mode === 'signup') { await authApi.signUp(values); setMode('signin'); setNotice('Account created. Sign in with your new credentials.'); } else { await authApi.signIn({ email: values.email, password: values.password }); const { user: profile } = await authApi.getProfile(); setUser(profile); } } catch (requestError) { setError(requestError.message); } finally { setBusy(false); } }
  async function signOut() { setBusy(true); setError(''); try { await authApi.signOut(); setUser(null); setMode('signin'); setNotice('You have signed out.'); } catch (requestError) { setError(requestError.message); } finally { setBusy(false); } }

  if (loading) return <div className="loading-screen" role="status"><Brand /><span>Loading your workspace…</span></div>;
  if (user) return <CloudWorkspace initialUser={user} onSignOut={signOut} signingOut={busy} accountError={error} />;
  return <AuthForm key={mode} mode={mode} onModeChange={changeMode} onSubmit={submit} busy={busy} error={error} notice={notice} />;
}
