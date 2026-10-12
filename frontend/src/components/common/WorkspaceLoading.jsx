import Brand from './Brand.jsx';

export default function WorkspaceLoading() {
  return (
    <div className="min-h-screen bg-[#08090a] flex flex-col items-center justify-center gap-4 text-[#8a8f98] text-xs">
      <Brand size="large" />
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#5e6ad2] animate-ping" />
        <span>Loading workspace…</span>
      </div>
    </div>
  );
}
