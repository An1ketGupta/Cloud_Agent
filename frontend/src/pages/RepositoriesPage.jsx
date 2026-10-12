import { FolderGit2, RefreshCw } from 'lucide-react';
import RepositoryCard from '../components/repositories/RepositoryCard.jsx';

export default function RepositoriesPage({
  repositories,
  syncing,
  syncRepositories,
  onSelectRepository,
}) {
  return (
    <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 md:py-14">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-[11px] font-medium tracking-[0.08em] text-[#71757e] uppercase">
            Connected Codebases
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-[#f7f8f8] mt-1">
            Repositories
          </h1>
          <p className="text-xs sm:text-sm text-[#8a8f98] mt-1">
            Repositories your Cloud Agent can clone and solve issues in.
          </p>
        </div>
        <button
          type="button"
          onClick={syncRepositories}
          disabled={syncing}
          className="linear-btn-secondary self-start sm:self-auto flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing…' : 'Sync GitHub'}
        </button>
      </div>

      {repositories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.12] p-12 text-center bg-[#0c0d10]/40">
          <FolderGit2 className="w-8 h-8 text-[#52555c] mx-auto mb-3" />
          <h2 className="text-base font-medium text-[#f7f8f8] mb-1">No repositories found</h2>
          <p className="text-xs text-[#8a8f98] max-w-sm mx-auto mb-4">
            Connect your GitHub account or refresh to sync your repository list.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {repositories.map((repo) => (
            <RepositoryCard key={repo.id} repo={repo} onSelect={onSelectRepository} />
          ))}
        </div>
      )}
    </div>
  );
}
