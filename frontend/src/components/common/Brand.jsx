export default function Brand({ size = 'default' }) {
  const isLarge = size === 'large';
  return (
    <div className="flex items-center gap-2.5 font-semibold tracking-[-0.03em] select-none">
      <div className={`${isLarge ? 'w-8 h-8 rounded-lg' : 'w-6 h-6 rounded-md'} bg-gradient-to-tr from-[#5e6ad2] via-[#7582eb] to-[#9da7ff] flex items-center justify-center shadow-[0_0_18px_rgba(94,106,210,0.45)]`}>
        <div className={`${isLarge ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'} border-2 border-white/90 rounded-[2px] transform rotate-45`} />
      </div>
      <span className={`${isLarge ? 'text-lg' : 'text-sm'} text-[#f7f8f8] font-medium tracking-tight`}>
        Cloud Agent
      </span>
    </div>
  );
}
