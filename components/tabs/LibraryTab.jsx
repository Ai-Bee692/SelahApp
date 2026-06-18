export const LibraryTab = ({ songs, onPlay }) => {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="font-headline-lg text-2xl md:text-3xl text-white font-bold leading-tight">
          Your Library
        </h2>
        <p className="text-sm text-on-surface-variant mt-1.5">
          Browse and practice your saved and generated gospel songs.
        </p>
      </div>

      {/* Song List */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
            {songs.length} Track{songs.length !== 1 ? "s" : ""} Arranged
          </span>
          <span className="text-[10px] text-on-surface-variant uppercase font-bold">
            Scripture Verified
          </span>
        </div>

        <div className="divide-y divide-white/5">
          {songs.map((s, idx) => (
            <div
              key={s.id || idx}
              onClick={() => onPlay(s)}
              className="flex items-center justify-between py-4 cursor-pointer group hover:bg-white/[0.02] px-2 rounded-xl transition-all duration-200"
            >
              <div className="flex items-center gap-4 min-w-0 flex-1">
                {/* Index / Icon */}
                <div className="w-10 h-10 rounded-xl bg-surface-container border border-white/5 flex items-center justify-center text-lg shrink-0 group-hover:bg-primary/20 group-hover:border-primary/30 transition-all duration-300">
                  <span className="group-hover:hidden font-mono text-xs text-on-surface-variant">
                    {idx + 1}
                  </span>
                  <span className="hidden group-hover:block material-symbols-outlined text-primary text-base font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
                    play_arrow
                  </span>
                </div>
                
                {/* Text Info */}
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">
                    {s.title}
                  </h4>
                  <p className="text-xs text-on-surface-variant truncate mt-0.5">
                    {s.lang} · <span className="font-mono">📖 {s.scripture}</span>
                  </p>
                </div>
              </div>

              {/* Right side Metadata */}
              <div className="flex items-center gap-6 shrink-0 ml-4">
                <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider hidden sm:inline">
                  {s.genre}
                </span>
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary group-hover:translate-x-0.5 transition-all text-base">
                  chevron_right
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
