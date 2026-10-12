import { ChevronRight, FolderGit2 } from 'lucide-react';

export default function RepositoryCard({ repo, onSelect }) {
  return (
    <div
      className="p-5 rounded-2xl border border-white/[0.08] bg-[#0c0d10] hover:border-white/[0.18] transition-all flex flex-col justify-between shadow-sm"
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <FolderGit2 className="w-4 h-4 text-[#828fff]" />
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] text-[#8a8f98]">
            GitHub
          </span>
        </div>
        <h3 className="text-sm font-semibold text-[#f7f8f8] truncate">
          {repo.fullName}
        </h3>
      </div>
      <button
        type="button"
        onClick={() => onSelect(repo.id)}
        className="mt-4 pt-3 border-t border-white/[0.06] text-xs text-[#828fff] hover:text-white flex items-center gap-1 font-medium"
      >
        Start task on this repository <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}
