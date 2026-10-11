import { useEffect, useState } from 'react';
import { authApi } from './api/authApi';
import ConversationWorkspace from './ConversationWorkspace';
import { Terminal, GitBranch, ShieldCheck, Sparkles } from 'lucide-react';

function Brand({ size = 'default' }) {
  const isLarge = size === 'large';
  return (
    <div className="flex items-center gap-2.5 font-semibold tracking-[-0.03em] select-none">
      <div className={`${isLarge ? 'w-8 h-8 rounded-lg' : 'w-6 h-6 rounded-md'} bg-gradient-to-tr from-[#5e6ad2] via-[#7582eb] to-[#9da7ff] flex items-center justify-center shadow-[0_0_18px_rgba(94,106,210,0.45)]`}>
        <div className={`${isLarge ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'} border-2 border-white/90 rounded-[2px] transform rotate-45`} />
      </div>
      <span className={`${isLarge ? 'text-lg' : 'text-sm'} text-[#f7f8f8] font-medium tracking-tight`}>
        Cloud Agent
      </span>
    </div>
  );
}

function AuthForm({ mode, onModeChange, onSubmit, busy, error, notice }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const isSignUp = mode === 'signup';

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function submit(event) {
    event.preventDefault();
    onSubmit({
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
    });
  }

  return (
    <main className="min-h-screen w-full bg-[#08090a] text-[#f7f8f8] flex flex-col md:grid md:grid-cols-12 relative overflow-hidden">
      {/* Background radial gradient glow */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#5e6ad2]/10 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-10 w-[500px] h-[500px] bg-[#828fff]/5 blur-[120px] pointer-events-none rounded-full" />

      {/* Left side: Linear Product Story */}
      <section className="hidden md:flex md:col-span-6 lg:col-span-7 flex-col justify-between p-12 lg:p-16 border-r border-white/[0.07] bg-[#0c0d10]/60 backdrop-blur-sm relative z-10">
        <div>
          <Brand size="large" />
          <div className="mt-20 max-w-lg">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-medium tracking-[0.1em] text-[#8a8f98] uppercase mb-6">
              <Sparkles className="w-3 h-3 text-[#828fff]" /> Autonomous Workflows
            </span>
            <h1 className="text-4xl lg:text-5xl font-semibold tracking-[-0.04em] text-[#f7f8f8] leading-[1.1] mb-6">
              From natural idea to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#828fff] to-[#c4cbff]">working code.</span>
            </h1>
            <p className="text-[#8a8f98] text-base lg:text-lg leading-relaxed font-normal mb-8">
              Connect your repositories, describe requirements, and watch your agent plan, edit files, and generate reviewable diffs in seconds.
            </p>

            {/* Feature bullets */}
            <div className="space-y-3.5 pt-4 border-t border-white/[0.07]">
              <div className="flex items-center gap-3 text-xs text-[#a1a1aa]">
                <div className="w-5 h-5 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[#828fff]">
                  <Terminal className="w-3 h-3" />
                </div>
                <span>Isolated container sandboxes for reliable code execution</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#a1a1aa]">
                <div className="w-5 h-5 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[#828fff]">
                  <GitBranch className="w-3 h-3" />
                </div>
                <span>Interactive Git diff viewer with file-by-file accept or revert</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#a1a1aa]">
                <div className="w-5 h-5 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[#828fff]">
                  <ShieldCheck className="w-3 h-3" />
                </div>
                <span>Automated code inspection and quality assurance reviews</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 text-xs text-[#52555c] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          Engineered for developer velocity
        </div>
      </section>

      {/* Right side: Auth Form Card */}
      <section className="flex-1 md:col-span-6 lg:col-span-5 flex flex-col items-center justify-center p-6 sm:p-10 relative z-10">
        <div className="md:hidden self-start mb-8">
          <Brand size="default" />
        </div>

        <div className="w-full max-w-sm rounded-2xl bg-[#0f1013]/90 border border-white/[0.08] p-7 sm:p-8 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
          {/* Mode Switch Tabs */}
          <div className="flex items-center p-1 rounded-lg bg-[#08090a] border border-white/[0.06] mb-6">
            <button
              type="button"
              onClick={() => onModeChange('signin')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                !isSignUp
                  ? 'bg-white/[0.08] text-white shadow-sm'
                  : 'text-[#8a8f98] hover:text-white'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => onModeChange('signup')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                isSignUp
                  ? 'bg-white/[0.08] text-white shadow-sm'
                  : 'text-[#8a8f98] hover:text-white'
              }`}
            >
              Create account
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold tracking-tight text-[#f7f8f8]">
              {isSignUp ? 'Get started with Cloud Agent' : 'Welcome back'}
            </h2>
            <p className="text-xs text-[#8a8f98] mt-1">
              {isSignUp ? 'Enter your details to create your workspace.' : 'Sign in with your workspace credentials.'}
            </p>
          </div>

          {notice && <p className="notice notice-success mb-4 text-xs">{notice}</p>}
          {error && <p className="notice notice-error mb-4 text-xs">{error}</p>}

          <form onSubmit={submit} className="space-y-4">
            {isSignUp && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#8a8f98] mb-1.5">First name</label>
                  <input
                    name="firstName"
                    autoComplete="given-name"
                    value={form.firstName}
                    onChange={update}
                    required
                    disabled={busy}
                    className="w-full h-9 px-3 rounded-lg bg-[#15161b] border border-white/[0.08] text-xs text-[#f7f8f8] outline-none focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#8a8f98] mb-1.5">Last name</label>
                  <input
                    name="lastName"
                    autoComplete="family-name"
                    value={form.lastName}
                    onChange={update}
                    required
                    disabled={busy}
                    className="w-full h-9 px-3 rounded-lg bg-[#15161b] border border-white/[0.08] text-xs text-[#f7f8f8] outline-none focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-[#8a8f98] mb-1.5">Email address</label>
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="developer@company.com"
                value={form.email}
                onChange={update}
                required
                disabled={busy}
                className="w-full h-9 px-3 rounded-lg bg-[#15161b] border border-white/[0.08] text-xs text-[#f7f8f8] placeholder:text-[#52555c] outline-none focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#8a8f98] mb-1.5">Password</label>
              <input
                name="password"
                type="password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                minLength={isSignUp ? 8 : undefined}
                placeholder="••••••••••••"
                value={form.password}
                onChange={update}
                required
                disabled={busy}
                className="w-full h-9 px-3 rounded-lg bg-[#15161b] border border-white/[0.08] text-xs text-[#f7f8f8] placeholder:text-[#52555c] outline-none focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] transition-all"
              />
              {isSignUp && (
                <span className="block text-[10px] text-[#52555c] mt-1">Must be at least 8 characters.</span>
              )}
            </div>

            <button
              type="submit"
              disabled={busy}
              className="linear-btn-primary w-full mt-2"
            >
              {busy ? 'Processing…' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-[11px] text-[#71757e]">
            Cloud Agent · Dark modern workspace
          </p>
        </div>
      </section>
    </main>
  );
}

export default function CloudApp() {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('signup');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    authApi
      .getProfile()
      .then(({ user: profile }) => {
        if (active) setUser(profile);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function changeMode(nextMode) {
    setMode(nextMode);
    setError('');
    setNotice('');
  }

  async function submit(values) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'signup') {
        await authApi.signUp(values);
        setMode('signin');
        setNotice('Account created successfully. Please sign in with your credentials.');
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

  async function signOut() {
    setBusy(true);
    setError('');
    try {
      await authApi.signOut();
      setUser(null);
      setMode('signin');
      setNotice('Signed out successfully.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08090a] flex flex-col items-center justify-center gap-4 text-[#8a8f98] text-xs">
        <Brand size="large" />
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#5e6ad2] animate-ping" />
          <span>Loading workspace…</span>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <ConversationWorkspace
        initialUser={user}
        onSignOut={signOut}
        signingOut={busy}
        accountError={error}
      />
    );
  }

  return (
    <AuthForm
      key={mode}
      mode={mode}
      onModeChange={changeMode}
      onSubmit={submit}
      busy={busy}
      error={error}
      notice={notice}
    />
  );
}
