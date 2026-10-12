import { ArrowLeft } from 'lucide-react';
import Composer from '../components/conversation/Composer.jsx';
import MessageList from '../components/conversation/MessageList.jsx';

export default function ConversationPage({
  conversation,
  execution,
  navigate,
  reviewFile,
  reviewingFile,
  pending,
  composerProps,
}) {
  return (
    <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 min-h-screen">
      {/* Header */}
      <div className="pb-4 mb-6 border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('conversations')}
            className="p-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] text-[#8a8f98] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-[#f7f8f8]">
              {conversation?.title || 'Conversation'}
            </h1>
            <span className="text-xs text-[#71757e] font-mono">
              {conversation?.repository?.fullName || 'Repository…'}
            </span>
          </div>
        </div>
      </div>

      {/* Message Stream */}
      <MessageList
        conversation={conversation}
        execution={execution}
        onFileDecision={reviewFile}
        reviewingFile={reviewingFile}
      />

      {/* Bottom Sticky Composer */}
      <div className="sticky bottom-4 z-20">
        <Composer
          {...composerProps}
          disabled={pending || !conversation}
        />
      </div>
    </div>
  );
}
