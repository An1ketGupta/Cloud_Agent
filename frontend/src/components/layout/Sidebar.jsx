import { FolderGit2, Home, MessageSquare, Plus, Settings, X } from 'lucide-react';
import { getDisplayName, getInitials } from '../../utils/user.js';

export default function Sidebar({
  user,
  view,
  sidebarOpen,
  onCloseSidebar,
  onNewConversation,
  conversations,
  activeId,
  navigate,
  openConversation,
}) {
  const displayName = getDisplayName(user);
  const initials = getInitials(user);
  return (
    <aside
      className={`fixed md:sticky top-0 left-0 z-50 md:z-20 h-screen w-72 bg-[#0c0d10] border-r border-white/[0.08] flex flex-col justify-between p-3.5 transition-transform duration-200 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
    >
      <div>
        {/* Workspace / Brand Header */}
        <div className="flex items-center justify-between px-2 py-2 mb-3">
          <button
            type="button"
            onClick={() => navigate('account')}
            className="flex items-center gap-2.5 text-left w-full group"
          >
            <div className="w-6 h-6 rounded bg-gradient-to-br from-[#5e6ad2] to-[#828fff] flex items-center justify-center text-[10px] font-bold text-white shadow-[0_0_12px_rgba(94,106,210,0.4)]">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-[#f7f8f8] truncate group-hover:text-white transition-colors">
                {displayName}
              </div>
              <div className="text-[10px] text-[#71757e] truncate font-mono">
                Cloud Agent Workspace
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={onCloseSidebar}
            className="md:hidden text-[#71757e] hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Conversation Button */}
        <button
          type="button"
          onClick={onNewConversation}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.09] text-xs font-medium text-[#f7f8f8] transition-all shadow-sm group mb-4"
        >
          <span className="flex items-center gap-2">
            <Plus className="w-3.5 h-3.5 text-[#828fff]" /> New task
          </span>
          <span className="text-[10px] text-[#62666d] font-mono group-hover:text-[#8a8f98]">
            ⌘N
          </span>
        </button>

        {/* Primary Navigation */}
        <nav className="space-y-1">
          <button
            type="button"
            onClick={() => navigate('home')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              view === 'home'
                ? 'bg-white/[0.08] text-white'
                : 'text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-white/[0.04]'
            }`}
          >
            <Home className="w-3.5 h-3.5" /> Home
          </button>
          <button
            type="button"
            onClick={() => navigate('conversations')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              view === 'conversations' || view === 'conversation'
                ? 'bg-white/[0.08] text-white'
                : 'text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-white/[0.04]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Tasks & Chats
          </button>
          <button
            type="button"
            onClick={() => navigate('repositories')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              view === 'repositories'
                ? 'bg-white/[0.08] text-white'
                : 'text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-white/[0.04]'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" /> Repositories
          </button>
          <button
            type="button"
            onClick={() => navigate('account')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              view === 'account'
                ? 'bg-white/[0.08] text-white'
                : 'text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-white/[0.04]'
            }`}
          >
            <Settings className="w-3.5 h-3.5" /> Settings
          </button>
        </nav>

        {/* Recent Tasks */}
        <div className="mt-6">
          <div className="px-2 text-[10px] font-semibold text-[#62666d] tracking-wider uppercase mb-2">
            Recent Code Tasks
          </div>
          <div className="space-y-0.5 max-h-56 overflow-y-auto pr-1">
            {conversations.length === 0 ? (
              <div className="px-2 text-xs text-[#52555c] italic">No active tasks yet</div>
            ) : (
              conversations.slice(0, 8).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openConversation(item.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition-all truncate ${
                    activeId === item.id && view === 'conversation'
                      ? 'bg-white/[0.08] text-white font-medium'
                      : 'text-[#8a8f98] hover:text-[#dedee2] hover:bg-white/[0.03]'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5e6ad2]/60 shrink-0" />
                  <span className="truncate">{item.title}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="pt-3 border-t border-white/[0.07]">
        <button
          type="button"
          onClick={() => navigate('account')}
          className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/[0.04] transition-all text-left"
        >
          <div className="w-7 h-7 rounded-full bg-white/[0.08] border border-white/[0.1] flex items-center justify-center text-[10px] font-bold text-white">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-[#f7f8f8] truncate">{displayName}</div>
            <div className="text-[10px] text-[#71757e] truncate">{user.email}</div>
          </div>
        </button>
      </div>
    </aside>
  );
}
