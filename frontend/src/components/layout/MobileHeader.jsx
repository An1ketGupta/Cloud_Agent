import { Menu } from 'lucide-react';

export default function MobileHeader({ onOpenSidebar }) {
  return (
    <div className="md:hidden flex items-center justify-between p-4 border-b border-white/[0.08] bg-[#0c0d10] sticky top-0 z-40">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded bg-gradient-to-tr from-[#5e6ad2] to-[#828fff] flex items-center justify-center">
          <div className="w-2 h-2 border border-white rotate-45" />
        </div>
        <span className="font-semibold text-sm">Cloud Agent</span>
      </div>
      <button
        type="button"
        onClick={onOpenSidebar}
        className="p-1.5 rounded-lg border border-white/[0.1] bg-white/[0.05] text-[#8a8f98]"
      >
        <Menu className="w-4 h-4" />
      </button>
    </div>
  );
}
