import { Loader2 } from 'lucide-react';
import MessageItem from './MessageItem.jsx';

export default function MessageList({ conversation, execution, onFileDecision, reviewingFile }) {
  const tasks = new Map(conversation?.tasks?.map((task) => [task.id, task]) || []);
  return (
    <div className="flex-1 space-y-4 mb-6">
      {!conversation ? (
        <div className="text-center py-16 text-xs text-[#71757e] flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#828fff]" /> Loading task session…
        </div>
      ) : (
        conversation.messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            task={tasks.get(message.taskId)}
            execution={execution?.[message.taskId]}
            onFileDecision={onFileDecision}
            reviewingFile={reviewingFile}
          />
        ))
      )}
    </div>
  );
}
