import { useState } from 'react';
import Brand from '../common/Brand.jsx';

export default function AuthForm({ mode, onModeChange, onSubmit, busy, error, notice }) {
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
  );
}
