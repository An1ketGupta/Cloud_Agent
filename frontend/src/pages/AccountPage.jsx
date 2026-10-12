import { LogOut } from 'lucide-react';
import { getDisplayName, getInitials } from '../utils/user.js';

export default function AccountPage({ user, onSignOut, signingOut }) {
  const displayName = getDisplayName(user);
  const initials = getInitials(user);
  return (
    <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-10 md:py-14">
      <div className="mb-8">
        <span className="text-[11px] font-medium tracking-[0.08em] text-[#71757e] uppercase">
          Settings
        </span>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-[#f7f8f8] mt-1">
          Your Account
        </h1>
      </div>

      <div className="space-y-4">
        {/* Profile Card */}
        <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#0c0d10]">
          <h2 className="text-sm font-semibold text-[#f7f8f8] mb-3">Profile details</h2>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#5e6ad2] to-[#828fff] flex items-center justify-center font-bold text-white text-sm">
              {initials}
            </div>
            <div>
              <div className="text-sm font-medium text-[#f7f8f8]">{displayName}</div>
              <div className="text-xs text-[#8a8f98]">{user.email}</div>
            </div>
          </div>
        </div>

        {/* GitHub Card */}
        <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#0c0d10] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#f7f8f8]">GitHub Connection</h2>
            <p className="text-xs text-[#8a8f98] mt-1">
              {user.githubAccount
                ? `Connected as @${user.githubAccount.githubUsername}`
                : 'No GitHub account connected yet.'}
            </p>
          </div>
          {!user.githubAccount && (
            <a href="/auth/github/" className="linear-btn-secondary text-xs">
              Connect GitHub
            </a>
          )}
        </div>

        {/* Sign Out Card */}
        <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#0c0d10] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#f7f8f8]">Active Session</h2>
            <p className="text-xs text-[#8a8f98] mt-1">Sign out of your active workspace session.</p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            disabled={signingOut}
            className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-xs font-medium transition-all flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </div>
    </div>
  );
}
