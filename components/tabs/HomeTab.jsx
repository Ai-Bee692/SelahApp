import { useState } from "react";
import { GENRES } from "../../data/constants";

const COVER_IMAGES = {
  1: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=600",
  2: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?q=80&w=600",
  3: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=600",
};

const COVER_FALLBACKS = [
  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=600",
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600",
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=600",
  "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=600",
  "https://images.unsplash.com/photo-1507838153414-b4b713384a76?q=80&w=600",
];

const getSongCover = (song) => {
  if (COVER_IMAGES[song.id]) return COVER_IMAGES[song.id];
  return COVER_FALLBACKS[String(song.title).charCodeAt(0) % COVER_FALLBACKS.length];
};

/** Card skeleton for loading state — prevents flash of empty content */
const SongCardSkeleton = () => (
  <div className="bg-suno-gray-900 border border-suno-gray-800 rounded-xl overflow-hidden animate-pulse">
    <div className="aspect-square bg-suno-gray-800" />
    <div className="p-4 space-y-2">
      <div className="h-4 bg-suno-gray-800 rounded w-3/4" />
      <div className="h-3 bg-suno-gray-800 rounded w-1/2" />
      <div className="h-3 bg-suno-gray-800 rounded w-1/3 mt-3" />
    </div>
  </div>
);

/**
 * HomeTab
 * @param {Object[]} songs
 * @param {boolean}  songsLoaded  — true once the async DB load has resolved
 * @param {Function} onPlay       — click card body → navigate to Choir Desk
 * @param {Function} onQuickPlay  — click ▶ button → play audio, stay on page
 * @param {Function} onCreateFirst
 * @param {string|null} activeSongId — id of currently playing song (for active state on card)
 */
export const HomeTab = ({ songs, songsLoaded, onPlay, onQuickPlay, onCreateFirst, activeSongId }) => {
  const featuredSong = songs[0];
  const [likedSongs, setLikedSongs] = useState({});

  const toggleLike = (e, id) => {
    e.stopPropagation();
    setLikedSongs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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
    <div className="space-y-10">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl md:text-3xl text-white font-bold leading-tight">
          Welcome back, Choir Director 👋
        </h2>
        <p className="text-sm text-gray-400 mt-1.5">
          Ready to arrange and practice this Sunday&apos;s worship selections?
        </p>
      </div>

      {/* Featured Banner */}
      {!songsLoaded ? (
        <section className="mb-12">
          <div className="h-64 rounded-3xl bg-suno-gray-900 border border-suno-gray-800 animate-pulse" />
        </section>
      ) : featuredSong ? (
        <section>
          <div
            className="relative h-64 rounded-3xl overflow-hidden mb-12 border border-suno-gray-800 group cursor-pointer"
            onClick={() => onPlay(featuredSong)}
          >
            <img
              src="https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=1200"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-60"
              alt="Featured"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent p-8 md:p-12 flex flex-col justify-center">
              <span className="text-suno-accent font-bold tracking-widest uppercase text-sm mb-2">
                Featured Sunday Arrangement
              </span>
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-white">
                {featuredSong.title}
              </h2>
              <p className="text-gray-300 max-w-lg mb-6 leading-relaxed line-clamp-2 text-sm">
                {featuredSong.theme} · {featuredSong.scripture} · {featuredSong.lang}
              </p>
              <div className="flex gap-3">
                <button
                  id="featured-play-btn"
                  onClick={(e) => { e.stopPropagation(); onQuickPlay(featuredSong); }}
                  className="bg-white text-black px-8 py-3 rounded-full font-bold hover:scale-105 active:scale-95 transition-transform text-sm flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                  Play
                </button>
                <button
                  id="featured-open-btn"
                  onClick={(e) => { e.stopPropagation(); onPlay(featuredSong); }}
                  className="bg-white/10 border border-white/20 text-white px-6 py-3 rounded-full font-bold hover:bg-white/20 active:scale-95 transition-all text-sm"
                >
                  Open Choir Desk
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="mb-12">
          <div className="relative rounded-3xl overflow-hidden border border-suno-gray-800 bg-suno-gray-900 p-10 md:p-16 flex flex-col items-center justify-center text-center min-h-[260px] group">
            <div className="absolute inset-0 opacity-20">
              <img src="https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=1200" className="w-full h-full object-cover" alt="" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-suno-gray-900 via-suno-gray-900/70 to-transparent" />
            <div className="relative z-10 flex flex-col items-center">
              <span className="material-symbols-outlined text-5xl text-suno-accent mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              <h3 className="text-2xl md:text-3xl font-display font-bold text-white mb-2">Your Choir Has No Songs Yet</h3>
              <p className="text-gray-400 text-sm max-w-md mb-6">
                Generate your first AI-powered gospel arrangement. Pick a theme, key, genre, and language — and Groq AI will write it in seconds.
              </p>
              <button
                id="create-first-song-btn"
                onClick={onCreateFirst}
                className="px-8 py-3 rounded-full bg-suno-accent hover:bg-suno-accent/90 text-white font-bold text-sm shadow-lg active:scale-95 transition-transform flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">add_circle</span>
                Create Your First Song
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Recent Arrangements Grid */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-display font-bold text-white">Recent Arrangements</h2>
        </div>

        {!songsLoaded ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => <SongCardSkeleton key={i} />)}
          </div>
        ) : songs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="material-symbols-outlined text-4xl text-gray-700 mb-3">queue_music</span>
            <p className="text-gray-500 text-sm">No arrangements yet — generate one in Create Studio.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {songs.map((song) => {
              const isLiked = !!likedSongs[song.id];
              const isActive = activeSongId === song.id;
              return (
                <div
                  key={song.id}
                  onClick={() => onPlay(song)}
                  className={`group bg-suno-gray-900 border rounded-xl overflow-hidden transition-all duration-300 cursor-pointer flex flex-col ${
                    isActive ? "border-suno-accent/50 shadow-[0_0_16px_rgba(35,212,94,0.15)]" : "border-suno-gray-800 hover:border-suno-gray-700"
                  }`}
                >
                  <div className="relative aspect-square overflow-hidden bg-suno-gray-800">
                    <img
                      src={getSongCover(song)}
                      alt={song.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    {/* Play button overlay — quick play stays on page */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        id={`quick-play-${song.id}`}
                        className="w-12 h-12 bg-suno-accent rounded-full flex items-center justify-center text-white transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-xl hover:scale-110 active:scale-95"
                        onClick={(e) => { e.stopPropagation(); onQuickPlay(song); }}
                        title="Play"
                      >
                        <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                          {isActive ? "pause" : "play_arrow"}
                        </span>
                      </button>
                    </div>
                    {/* Heart + Share overlay */}
                    <div className="absolute top-2.5 right-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        id={`share-${song.id}`}
                        className="p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:text-suno-accent transition-colors"
                        onClick={(e) => handleShare(e, song)}
                        title="Share"
                      >
                        <span className="material-symbols-outlined text-sm">share</span>
                      </button>
                      <button
                        id={`like-${song.id}`}
                        className={`p-2 bg-black/60 backdrop-blur-md rounded-full transition-colors ${isLiked ? "text-red-500" : "text-white hover:text-red-400"}`}
                        onClick={(e) => toggleLike(e, song.id)}
                        title={isLiked ? "Unlike" : "Like"}
                      >
                        <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: `'FILL' ${isLiked ? 1 : 0}` }}>favorite</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-4 flex-grow flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-lg text-white truncate mb-1 font-display">{song.title}</h3>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm font-medium">Key of {song.musicKey}</span>
                        <span className="text-[10px] text-gray-500 font-mono truncate max-w-[120px]" title={song.scripture}>
                          📖 {song.scripture}
                        </span>
                      </div>
                    </div>
                    {song.genre && (
                      <div className="mt-4 flex gap-1 flex-wrap">
                        <span className="px-2 py-0.5 bg-suno-gray-800 rounded-full text-[10px] text-gray-400 font-bold uppercase tracking-wider">{song.genre}</span>
                        <span className="px-2 py-0.5 bg-suno-gray-800 rounded-full text-[10px] text-gray-400 font-bold uppercase tracking-wider">{song.lang}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Browse by Genre */}
      <section>
        <h3 className="text-lg text-white font-bold mb-5 font-display">Browse by Genre Vibe</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {GENRES.map((g) => (
            <div
              key={g.label}
              className="rounded-xl bg-suno-gray-900 border border-suno-gray-800 p-5 text-center cursor-pointer hover:border-suno-accent/50 hover:bg-suno-gray-800/50 transition-all duration-300 group"
            >
              <div className="text-3xl mb-2.5 transition-transform duration-300 group-hover:scale-110">{g.icon}</div>
              <div className="text-xs font-bold text-gray-400 truncate group-hover:text-white transition-colors">{g.label}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
