import { C, GENRES } from "../../data/constants";

export const HomeTab = ({ songs, onPlay }) => {
  const featuredSong = songs[0];

  return (
    <div className="space-y-10">
      {/* Welcome Banner */}
      <div>
        <h2 className="font-headline-lg text-2xl md:text-3xl text-white font-bold leading-tight">
          Welcome back, Choir Director 👋
        </h2>
        <p className="text-sm text-on-surface-variant mt-1.5">
          Ready to arrange and practice this Sunday's worship selections?
        </p>
      </div>

      {/* Hero Featured Release Card */}
      {featuredSong && (
        <section className="mt-6">
          <div className="relative rounded-[2rem] overflow-hidden aspect-[21/9] md:aspect-[3/1] group shadow-2xl border border-white/10">
            {/* Immersive Hero Background */}
            <div className="absolute inset-0 z-0">
              <div className="w-full h-full bg-gradient-to-br from-primary/30 via-secondary/15 to-transparent absolute z-10"></div>
              <div 
                className="w-full h-full bg-cover bg-center opacity-60 transition-transform duration-700 group-hover:scale-105" 
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=1000')" }}
              ></div>
            </div>
            
            <div className="relative z-10 h-full flex flex-col justify-center px-6 md:px-12 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 w-fit mb-3">
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  auto_awesome
                </span>
                <span className="text-[10px] font-bold tracking-widest uppercase">Featured Arrangement</span>
              </span>
              <h3 className="text-xl md:text-3xl font-bold text-white mb-2 leading-tight">
                {featuredSong.title}
              </h3>
              <p className="text-xs md:text-sm text-on-surface-variant mb-6 line-clamp-2">
                Theme: {featuredSong.theme} · Scriptural Anchor: {featuredSong.scripture} · {featuredSong.lang}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => onPlay(featuredSong)}
                  className="px-5 py-2.5 bg-white text-background font-bold rounded-xl flex items-center gap-2 active:scale-95 transition-all text-xs md:text-sm"
                >
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                    play_arrow
                  </span>
                  Listen & Practice
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Recent Arrangements Grid */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-headline-md text-lg text-white font-bold">
            Recent Arrangements
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {songs.map((s) => (
            <div
              key={s.id}
              onClick={() => onPlay(s)}
              className="rounded-2xl glass-card p-5 group cursor-pointer border border-white/5 hover:border-primary/50 hover:bg-white/5 transition-all duration-300 flex flex-col justify-between min-h-[140px]"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[9px] font-bold uppercase tracking-wider">
                    {s.genre}
                  </span>
                  <span className="text-on-surface-variant text-[10px]">
                    {s.musicKey}
                  </span>
                </div>
                <h4 className="font-body-md font-bold text-white group-hover:text-primary transition-colors line-clamp-1">
                  {s.title}
                </h4>
                <p className="text-xs text-on-surface-variant mt-1 line-clamp-1">
                  Theme: {s.theme} · {s.lang}
                </p>
              </div>
              
              <div className="flex items-center justify-between mt-4 border-t border-white/5 pt-3">
                <span className="text-[10px] font-mono text-on-surface-variant truncate">
                  📖 {s.scripture}
                </span>
                <span className="material-symbols-outlined text-primary text-base group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Browse by Genre */}
      <section>
        <h3 className="font-headline-md text-lg text-white font-bold mb-5">
          Browse by Genre Vibe
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {GENRES.map((g) => (
            <div
              key={g.label}
              className="rounded-2xl bg-surface-container border border-white/5 p-4 text-center cursor-pointer hover:border-primary/40 hover:bg-white/5 transition-all duration-300"
            >
              <div className="text-2xl mb-2">{g.icon}</div>
              <div className="text-xs font-bold text-on-surface-variant truncate">{g.label}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
