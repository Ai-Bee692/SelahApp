export const LibraryTab = ({ songs, songsLoaded, onPlay, onQuickPlay, activeSongId }) => {
  const handleShare = async (e, song) => {
    e.stopPropagation();
    const url = `${window.location.origin}/song/${song.id}`;
    if (navigator.share) {
      await navigator.share({ title: song.title, text: `🎵 "${song.title}" on Selah`, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copied!");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl md:text-3xl text-white font-bold leading-tight">Your Library</h2>
        <p className="text-sm text-gray-400 mt-1.5">Browse and practice your saved gospel arrangements.</p>
      </div>

      <div className="bg-suno-gray-900 border border-suno-gray-800 p-6 rounded-3xl space-y-4">
        <div className="flex justify-between items-center border-b border-suno-gray-800 pb-3">
          <span className="text-[10px] font-bold text-suno-accent uppercase tracking-widest">
            {songs.length} Track{songs.length !== 1 ? "s" : ""} Arranged
          </span>
          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Scripture Verified</span>
        </div>

        {!songsLoaded ? (
          <div className="divide-y divide-suno-gray-800">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-4 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-suno-gray-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-suno-gray-800 rounded w-2/3" />
                  <div className="h-2.5 bg-suno-gray-800 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : songs.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-5xl text-gray-700 mb-4">library_music</span>
            <p className="text-gray-500 text-sm font-medium">No songs yet.</p>
            <p className="text-gray-600 text-xs mt-1">Generate your first song in Create Studio.</p>
          </div>
        ) : (
          <div className="divide-y divide-suno-gray-800">
            {songs.map((song, idx) => {
              const isActive = activeSongId === song.id;
              return (
                <div
                  key={song.id || idx}
                  className={`flex items-center justify-between py-4 cursor-pointer group px-2 rounded-xl transition-all duration-200 ${
                    isActive ? "bg-suno-accent/5 border border-suno-accent/20" : "hover:bg-suno-gray-800/40"
                  }`}
                >
                  {/* Track number / play toggle */}
                  <div className="flex items-center gap-4 min-w-0 flex-1" onClick={() => onPlay(song)}>
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-all duration-300 ${
                        isActive
                          ? "bg-suno-accent/20 border-suno-accent/50"
                          : "bg-suno-gray-800 border-suno-gray-700 group-hover:bg-suno-accent/20 group-hover:border-suno-accent/50"
                      }`}
                    >
                      <span className="group-hover:hidden font-mono text-xs text-gray-400">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span
                        className="hidden group-hover:block material-symbols-outlined text-suno-accent text-base"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {isActive ? "pause" : "play_arrow"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h4 className={`text-sm font-bold truncate transition-colors ${isActive ? "text-suno-accent" : "text-white group-hover:text-suno-accent"}`}>
                        {song.title}
                      </h4>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {song.lang} &middot; <span className="font-mono text-gray-500">📖 {song.scripture}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    {/* Quick play button */}
                    <button
                      id={`lib-play-${song.id}`}
                      onClick={(e) => { e.stopPropagation(); onQuickPlay(song); }}
                      className="p-2 text-gray-500 hover:text-suno-accent transition-colors opacity-0 group-hover:opacity-100"
                      title="Play"
                    >
                      <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                    </button>
                    {/* Share button */}
                    <button
                      id={`lib-share-${song.id}`}
                      onClick={(e) => handleShare(e, song)}
                      className="p-2 text-gray-500 hover:text-suno-accent transition-colors opacity-0 group-hover:opacity-100"
                      title="Share"
                    >
                      <span className="material-symbols-outlined text-base">share</span>
                    </button>
                    <span className="px-2.5 py-0.5 rounded-full bg-suno-gray-800 border border-suno-gray-700 text-[10px] font-bold text-gray-400 uppercase tracking-wider hidden sm:inline">
                      {song.genre}
                    </span>
                    {song.musicKey && (
                      <span className="px-2.5 py-0.5 rounded-full bg-suno-gray-800 border border-suno-gray-700 text-[10px] font-mono font-bold text-suno-accent uppercase hidden md:inline">
                        Key {song.musicKey}
                      </span>
                    )}
                    <span className="material-symbols-outlined text-gray-500 group-hover:text-suno-accent group-hover:translate-x-0.5 transition-all text-base">chevron_right</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
