import { ChevronRight, MessageSquare, Plus } from 'lucide-react';

export default function ConversationsPage({ conversations, navigate, openConversation }) {
  return (
    <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 md:py-14">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-[11px] font-medium tracking-[0.08em] text-[#71757e] uppercase">
            Workspace
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-[#f7f8f8] mt-1">
            Tasks & Conversations
          </h1>
          <p className="text-xs sm:text-sm text-[#8a8f98] mt-1">
            Continue active agent runs or review previous repository diffs.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('home')}
          className="linear-btn-primary self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" /> New task
        </button>
      </div>

      {conversations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.12] p-12 text-center bg-[#0c0d10]/40">
          <MessageSquare className="w-8 h-8 text-[#52555c] mx-auto mb-3" />
          <h2 className="text-base font-medium text-[#f7f8f8] mb-1">No active tasks yet</h2>
          <p className="text-xs text-[#8a8f98] max-w-sm mx-auto mb-4">
            Select a repository on the home screen to launch your first code task.
          </p>
          <button
            type="button"
            onClick={() => navigate('home')}
            className="linear-btn-secondary"
          >
            Create one now
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d10] overflow-hidden divide-y divide-white/[0.06]">
          {conversations.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openConversation(item.id)}
              className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-white/[0.03] transition-all group"
            >
              <div className="min-w-0 pr-4">
                <div className="text-sm font-medium text-[#f7f8f8] group-hover:text-white transition-colors truncate">
                  {item.title}
                </div>
                <div className="flex items-center gap-3 text-xs text-[#71757e] mt-1 font-mono">
                  <span>{item.repository?.fullName || 'Repository'}</span>
                  <span>·</span>
                  <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#52555c] group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
