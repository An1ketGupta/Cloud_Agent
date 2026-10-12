import { ChevronRight } from 'lucide-react';
import { taskTemplates } from '../../constants/taskTemplates.js';

export default function QuickTasks({ onSelect }) {
  return (
    <div className="w-full max-w-4xl px-4 sm:px-6 pb-16">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-medium tracking-[0.08em] text-[#71757e] uppercase">
          Quick Tasks
        </span>
        <span className="text-xs text-[#52555c]">
          Click to prefill prompt
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {taskTemplates.map((t, idx) => {
          const Icon = t.icon;
          return (
            <div
              key={idx}
              onClick={() => {
                onSelect(t);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="group rounded-2xl bg-[#0f1013]/90 hover:bg-[#131418] border border-white/[0.08] hover:border-white/[0.18] p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_30px_rgba(94,106,210,0.1)] relative overflow-hidden"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[#828fff] group-hover:text-white transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#71757e] px-2 py-0.5 rounded bg-white/[0.04]">
                  {t.mode === 'code' ? 'Agent' : 'Ask'}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-[#71757e] uppercase tracking-wider mb-1">
                  {t.category}
                </span>
                <h3 className="text-sm font-semibold text-[#f7f8f8] tracking-tight group-hover:text-white mb-1.5">
                  {t.title}
                </h3>
                <p className="text-xs text-[#8a8f98] leading-relaxed">
                  {t.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#71757e] group-hover:text-[#dedee2] transition-colors">
                <span>Use this template</span>
                <div className="w-6 h-6 rounded-full border border-white/[0.1] group-hover:border-white/[0.25] flex items-center justify-center">
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
