import { ChevronRight, FolderGit2, Sparkles } from 'lucide-react';
import Composer from '../components/conversation/Composer.jsx';
import QuickTasks from '../components/conversation/QuickTasks.jsx';

export default function HomePage({
  user,
  composerProps,
  repositoryId,
  onRepositoryChange,
  repositories,
  onTemplateSelect,
}) {
  return (
    <div className="flex-1 flex flex-col items-center">
      {/* Top Hero & Fast Composer Section */}
      <div className="w-full max-w-4xl px-4 sm:px-6 pt-12 md:pt-16 pb-8">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-medium tracking-[0.1em] text-[#8a8f98] uppercase mb-4">
            <Sparkles className="w-3 h-3 text-[#828fff]" /> Autonomous GitHub Agent
          </span>
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-[-0.04em] text-[#f7f8f8] leading-[1.1] mb-3">
            Solve issues directly in your repository
          </h1>
          <p className="text-[#8a8f98] text-sm sm:text-base leading-relaxed">
            Choose a repository, provide a prompt, and the agent executes in a container sandbox, tests the changes, and generates an interactive diff.
          </p>
        </div>

        {/* Composer */}
        {!user.githubAccount ? (
          <div className="rounded-2xl border border-white/[0.09] bg-[#0f1013] p-8 text-center shadow-lg max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mx-auto mb-4 text-[#828fff]">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <h2 className="text-base font-semibold text-[#f7f8f8] mb-1.5">
              Connect your GitHub account
            </h2>
            <p className="text-xs text-[#8a8f98] max-w-sm mx-auto mb-5">
              Link your GitHub account so Cloud Agent can clone, read, and write code to your repositories.
            </p>
            <a
              href="/auth/github/"
              className="linear-btn-primary inline-flex items-center gap-2"
            >
              Connect GitHub <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : (
          <Composer
            {...composerProps}
            disabled={!repositoryId}
            repository={repositoryId}
            onRepositoryChange={onRepositoryChange}
            repositories={repositories}
            isNew
          />
        )}
      </div>

      <QuickTasks onSelect={onTemplateSelect} />
    </div>
  );
}
