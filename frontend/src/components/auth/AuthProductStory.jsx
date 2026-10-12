import { GitBranch, ShieldCheck, Sparkles, Terminal } from 'lucide-react';
import Brand from '../common/Brand.jsx';

export default function AuthProductStory() {
  return (
    <section className="hidden md:flex md:col-span-6 lg:col-span-7 flex-col justify-between p-12 lg:p-16 border-r border-white/[0.07] bg-[#0c0d10]/60 backdrop-blur-sm relative z-10">
      <div>
        <Brand size="large" />
        <div className="mt-20 max-w-lg">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-medium tracking-[0.1em] text-[#8a8f98] uppercase mb-6">
            <Sparkles className="w-3 h-3 text-[#828fff]" /> Autonomous Workflows
          </span>
          <h1 className="text-4xl lg:text-5xl font-semibold tracking-[-0.04em] text-[#f7f8f8] leading-[1.1] mb-6">
            From natural idea to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#828fff] to-[#c4cbff]">working code.</span>
          </h1>
          <p className="text-[#8a8f98] text-base lg:text-lg leading-relaxed font-normal mb-8">
            Connect your repositories, describe requirements, and watch your agent plan, edit files, and generate reviewable diffs in seconds.
          </p>

          {/* Feature bullets */}
          <div className="space-y-3.5 pt-4 border-t border-white/[0.07]">
            <div className="flex items-center gap-3 text-xs text-[#a1a1aa]">
              <div className="w-5 h-5 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[#828fff]">
                <Terminal className="w-3 h-3" />
              </div>
              <span>Isolated container sandboxes for reliable code execution</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#a1a1aa]">
              <div className="w-5 h-5 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[#828fff]">
                <GitBranch className="w-3 h-3" />
              </div>
              <span>Interactive Git diff viewer with file-by-file accept or revert</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#a1a1aa]">
              <div className="w-5 h-5 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[#828fff]">
                <ShieldCheck className="w-3 h-3" />
              </div>
              <span>Automated code inspection and quality assurance reviews</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-8 text-xs text-[#52555c] flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
        Engineered for developer velocity
      </div>
    </section>
  );
}
