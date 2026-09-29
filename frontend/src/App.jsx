import { useEffect, useState } from 'react';
import { authApi } from './api/authApi';

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
};

const labelClassName = 'grid gap-2 text-sm font-bold text-slate-700';
const inputClassName = 'h-12 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-3 focus:ring-blue-100 disabled:opacity-60';
const eyebrowClassName = 'text-xs font-bold uppercase tracking-[0.13em] text-blue-700';

function AuthForm({ mode, onModeChange, onSubmit, busy, error, notice }) {
  const [form, setForm] = useState(emptyForm);
  const isSignUp = mode === 'signup';

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
    });
  }

  function switchMode() {
    setForm(emptyForm);
    onModeChange(isSignUp ? 'signin' : 'signup');
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[43%_1fr]">
      <section
        className="flex min-h-56 flex-col justify-between bg-linear-to-br from-slate-950 via-slate-900 to-blue-900 px-6 py-7 text-white lg:min-h-screen lg:p-[clamp(2rem,5vw,4.75rem)]"
        aria-label="About Cloud Agent"
      >
        <div className="font-display text-lg font-extrabold tracking-tight">Cloud Agent</div>
        <div className="max-w-lg">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.13em] text-blue-200">Your coding workspace</p>
          <h1 className="font-display text-3xl leading-tight font-extrabold tracking-tight lg:mb-6 lg:text-[clamp(2.5rem,4.4vw,4.8rem)]">
            Move from an issue to a reviewed patch.
          </h1>
          <p className="hidden text-lg leading-7 text-slate-300 lg:block">
            Connect your repository, describe the change, and follow the agent team’s work in one place.
          </p>
        </div>
        <p className="hidden text-sm text-slate-400 lg:block">Built for repository level changes.</p>
      </section>

      <section className="grid place-items-center bg-slate-50 px-6 py-12 lg:py-10" aria-labelledby="auth-title">
        <div className="w-full max-w-[440px]">
          <p className={`${eyebrowClassName} mb-3`}>{isSignUp ? 'Get started' : 'Welcome back'}</p>
          <h2 id="auth-title" className="font-display mb-3 text-3xl leading-tight font-bold tracking-tight text-slate-900">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </h2>
          <p className="mb-8 leading-7 text-slate-500">
            {isSignUp ? 'Use your email and a password to create an account.' : 'Enter the email and password for your Cloud Agent account.'}
          </p>

          {notice && <p className="mb-5 rounded-lg bg-green-50 px-3.5 py-3 text-sm text-green-800" role="status">{notice}</p>}
          {error && <p className="mb-5 rounded-lg bg-red-50 px-3.5 py-3 text-sm text-red-800" role="alert">{error}</p>}

          <form className="grid gap-4.5" onSubmit={handleSubmit}>
            {isSignUp && (
              <div className="grid grid-cols-2 gap-3.5">
                <label className={labelClassName}>
                  First name
                  <input className={inputClassName} name="firstName" autoComplete="given-name" value={form.firstName} onChange={updateField} required disabled={busy} />
                </label>
                <label className={labelClassName}>
                  Last name
                  <input className={inputClassName} name="lastName" autoComplete="family-name" value={form.lastName} onChange={updateField} required disabled={busy} />
                </label>
              </div>
            )}
            <label className={labelClassName}>
              Email
              <input className={inputClassName} name="email" type="email" autoComplete="email" value={form.email} onChange={updateField} required disabled={busy} />
            </label>
            <label className={labelClassName}>
              Password
              <input className={inputClassName} name="password" type="password" autoComplete={isSignUp ? 'new-password' : 'current-password'} minLength={isSignUp ? 8 : undefined} value={form.password} onChange={updateField} required disabled={busy} />
            </label>
            {isSignUp && <p className="-mt-2.5 text-xs text-slate-500">Use at least 8 characters.</p>}
            <button
              className="mt-2 min-h-12 rounded-lg bg-blue-700 px-4 font-bold text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
              type="submit"
              disabled={busy}
            >
              {busy ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {isSignUp ? 'Already have an account?' : 'New to Cloud Agent?'}{' '}
            <button type="button" className="font-bold text-blue-700 hover:underline disabled:opacity-60" onClick={switchMode} disabled={busy}>
              {isSignUp ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}

function AccountPage({ user, onSignOut, busy, error }) {
  const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ');

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-6 lg:px-20">
        <span className="font-display text-lg font-extrabold tracking-tight">Cloud Agent</span>
        <button
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-bold text-blue-800 transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60"
          type="button"
          onClick={onSignOut}
          disabled={busy}
        >
          Sign out
        </button>
      </header>
      <section className="mx-5 my-10 max-w-3xl rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 sm:mx-auto sm:p-12 lg:my-24">
        <p className={`${eyebrowClassName} mb-3`}>Your workspace</p>
        <h1 className="font-display mb-2 text-3xl font-bold tracking-tight sm:text-5xl">Welcome, {displayName || user.email}.</h1>
        <p className="text-slate-500">Signed in as {user.email}</p>
        {error && <p className="mt-5 rounded-lg bg-red-50 px-3.5 py-3 text-sm text-red-800" role="alert">{error}</p>}
        <div className="mt-8 border-t border-slate-200 pt-7">
          <h2 className="font-display mb-3 text-lg font-bold">GitHub connection</h2>
          {user.githubAccount ? (
            <p className="leading-7 text-slate-600">Connected as <strong>{user.githubAccount.githubUsername}</strong>. {user.githubAccount.repositories.length} repositories are available.</p>
          ) : (
            <p className="leading-7 text-slate-600">Your account is ready. Connect GitHub to work with a repository.</p>
          )}
        </div>
      </section>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('signup');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    authApi.getProfile()
      .then(({ user: profile }) => { if (active) setUser(profile); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function changeMode(nextMode) {
    setMode(nextMode);
    setError('');
    setNotice('');
  }

  async function handleSubmit(values) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'signup') {
        await authApi.signUp(values);
        setMode('signin');
        setNotice('Account created. Sign in with your new credentials.');
      } else {
        await authApi.signIn({ email: values.email, password: values.password });
        const { user: profile } = await authApi.getProfile();
        setUser(profile);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    setError('');
    try {
      await authApi.signOut();
      setUser(null);
      setMode('signin');
      setNotice('You have signed out.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="grid min-h-screen place-items-center bg-slate-50 text-slate-600" role="status">Loading your account…</div>;
  if (user) return <AccountPage user={user} onSignOut={handleSignOut} busy={busy} error={error} />;

  return <AuthForm key={mode} mode={mode} onModeChange={changeMode} onSubmit={handleSubmit} busy={busy} error={error} notice={notice} />;
}
