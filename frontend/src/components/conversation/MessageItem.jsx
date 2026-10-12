import RunDetails from './RunDetails.jsx';

export default function MessageItem({
  message, task, execution, onFileDecision, reviewingFile,
  onCreatePullRequest, canPublish, publicationBusy,
}) {
  const isUser = message.role === 'user';
  return (
    <article
      className={`rounded-2xl p-4 sm:p-5 border transition-all ${
        isUser
          ? 'bg-[#121318] border-white/[0.1] ml-auto max-w-[85%]'
          : 'bg-[#0f1013] border-white/[0.08] mr-auto w-full'
      }`}
    >
      {/* Message Sender Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isUser ? (
            <span className="text-xs font-semibold text-[#f7f8f8]">You</span>
          ) : (
            <>
              <div className="w-4 h-4 rounded bg-[#5e6ad2] flex items-center justify-center text-[9px] text-white font-bold">
                C
              </div>
              <span className="text-xs font-semibold text-[#f7f8f8]">Cloud Agent</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-[#8a8f98]">
                {message.mode === 'code' ? 'Agent' : 'Ask'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <p className="text-sm text-[#dedee2] leading-relaxed whitespace-pre-wrap">
        {message.status === 'pending'
          ? message.mode === 'code'
            ? 'Agent is inspecting repository files and modifying code…'
            : 'Reading repository context…'
          : message.content}
      </p>

      {/* Run Details if assistant message with taskId */}
      {message.role === 'assistant' && task && (
        <RunDetails
          task={task}
          execution={execution}
          onFileDecision={onFileDecision}
          reviewingFile={reviewingFile}
          onCreatePullRequest={onCreatePullRequest}
          canPublish={canPublish}
          publicationBusy={publicationBusy}
        />
      )}
    </article>
  );
}
