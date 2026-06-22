import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { MOCK_SONGS } from "../data/constants";
import { GeneratingModal } from "../components/GeneratingModal";
import { AuthRequiredModal } from "../components/AuthRequiredModal";
import { HomeTab } from "../components/tabs/HomeTab";
import { CreateTab } from "../components/tabs/CreateTab";
import { LibraryTab } from "../components/tabs/LibraryTab";
import { CommunityTab } from "../components/tabs/CommunityTab";
import { useGospelAudio } from "../lib/useGospelAudio";
import { supabase } from "../lib/supabase";
import { getAllSongs, saveSong, getUser, signOut } from "../lib/songService";

export default function SelahApp() {
  const router = useRouter();
  const [tab, setTab] = useState("home");
  const [songs, setSongs] = useState(MOCK_SONGS);
  const [songsLoaded, setSongsLoaded] = useState(false);
  const [activeSong, setActiveSong] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [user, setUser] = useState(null);
  const [userInitials, setUserInitials] = useState("?");

  const chords = activeSong?.chords?.length > 0 ? activeSong.chords : ["C", "F", "G", "Am"];
  const genre = activeSong?.genre || "Contemporary";
  const audioState = useGospelAudio(chords, genre);
  const { isPlaying, currentChordIdx, bpm, setBpm, play, pause, stop } = audioState;

  // ─── Auth + Songs Load ─────────────────────────────────────────────────────
  useEffect(() => {
    // Check auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const name = session.user.user_metadata?.full_name || session.user.email || "?";
        setUserInitials(
          name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
        );
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Network status
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Load songs (Supabase → IndexedDB fallback)
    getAllSongs().then((dbSongs) => {
      if (dbSongs && dbSongs.length > 0) {
        setSongs((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const unique = dbSongs.filter((s) => !existingIds.has(s.id));
          return [...unique, ...prev];
        });
      }
      setSongsLoaded(true);
    }).catch(() => setSongsLoaded(true));

    // Restore tab from router query
    if (router.query.tab) setTab(router.query.tab);

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [router.query.tab]);

  // Sync active song's backing track into the audio engine
  useEffect(() => {
    if (activeSong?.audio_url) {
      audioState.loadBackingTrack(activeSong.audio_url);
    } else if (audioState.clearBackingTrack) {
      audioState.clearBackingTrack();
    }
  }, [activeSong]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleGenerate = async ({ theme, musicKey, langs, genre: selectedGenre, harmony, scripture, rawSongText, emotional_mode, instrumentation, vocal_gender }) => {
    if (isOffline) {
      alert("You are offline. Song generation requires an active internet connection.");
      return;
    }
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, musicKey, langs, genre: selectedGenre, harmony, scripture, rawSongText, emotional_mode, instrumentation, vocal_gender }),
      });
      const data = await res.json();
      const newSong = {
        id: Date.now(),
        title: data.title || `New ${theme} Song`,
        genre: selectedGenre,
        musicKey,
        lang: langs.join(" + "),
        theme,
        scripture: data.scripture || scripture || `Auto-matched for "${theme}"`,
        lyrics: data.lyrics || [],
        chords: data.chords || [],
        emotional_mode: data.emotional_mode || emotional_mode || null,
        instrumentation: data.instrumentation || instrumentation || null,
        vocal_gender: data.vocal_gender || vocal_gender || null,
        is_public: true,
        created_at: Date.now(),
      };
      const savedSong = await saveSong(newSong).catch(() => newSong);
      setSongs((prev) => [savedSong, ...prev]);
      stop();
      setActiveSong(savedSong);
      router.push(`/song/${savedSong.id}`);
    } catch (err) {
      console.error(err);
      alert("Error generating song. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateSong = useCallback(async (updatedSong) => {
    setSongs((prev) => prev.map((s) => (s.id === updatedSong.id ? updatedSong : s)));
    if (activeSong?.id === updatedSong.id) setActiveSong(updatedSong);
    await saveSong(updatedSong).catch(console.error);
  }, [activeSong]);

  /** Navigate to Choir Desk (song editing/rehearsal mode) */
  const handleSongSelect = (song) => {
    stop();
    setActiveSong(song);
    router.push(`/song/${song.id}`);
  };

  /** Spotify-style quick play — play audio but stay on the current page */
  const handleQuickPlay = (song) => {
    if (activeSong?.id === song.id) {
      isPlaying ? pause() : play();
      return;
    }
    stop();
    setActiveSong(song);
    // Give audio engine a tick to update chords/genre, then play
    setTimeout(() => play(), 50);
  };

  const handleSignOut = async () => {
    stop();
    await signOut();
    router.push("/auth");
  };

  // ─── Shared Sidebar ────────────────────────────────────────────────────────
  const SidebarNav = ({ navigateFn = setTab }) => (
    <aside className="fixed left-0 top-0 h-full w-64 bg-suno-gray-900 border-r border-suno-gray-800 flex flex-col p-6 z-50 hidden md:flex">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8 border-b border-suno-gray-800 pb-6">
        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-suno-gray-900 border border-suno-gray-800 flex items-center justify-center shadow-lg mb-3">
          <img src="/logo.png" alt="Selah Logo" className="w-full h-full object-cover" />
        </div>
        <div className="text-center mt-2">
          <h1 className="font-serif text-2xl text-white tracking-[0.25em] uppercase font-medium">Selah</h1>
          <p className="text-[9px] uppercase tracking-[0.2em] text-gray-400 font-semibold mt-1">Gospel Music App</p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1">
        {[
          { id: "home", label: "Discover", icon: "explore" },
          { id: "create", label: "Create Studio", icon: "add_circle" },
          { id: "library", label: "Library", icon: "library_music" },
          { id: "community", label: "Community", icon: "groups" },
        ].map(({ id, label, icon }) => (
          <button
            key={id}
            id={`nav-${id}`}
            onClick={() => navigateFn(id)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 font-medium ${
              tab === id ? "bg-suno-gray-800 text-white" : "text-gray-400 hover:text-white hover:bg-suno-gray-800/50"
            }`}
          >
            <span className={`material-symbols-outlined text-xl ${tab === id ? "text-suno-accent" : ""}`}>{icon}</span>
            <span className="text-sm">{label}</span>
          </button>
        ))}
      </nav>

      {/* User profile area */}
      <div className="border-t border-suno-gray-800 pt-4 mt-4">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-suno-accent/20 border border-suno-accent/30 flex items-center justify-center shrink-0">
              {user.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-suno-accent">{userInitials}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {user.user_metadata?.full_name || user.email?.split("@")[0] || "User"}
              </p>
              <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
            </div>
            <button
              id="sign-out-btn"
              onClick={handleSignOut}
              className="p-1.5 text-gray-500 hover:text-white transition-colors"
              title="Sign out"
            >
              <span className="material-symbols-outlined text-base">logout</span>
            </button>
          </div>
        ) : (
          <button
            id="sign-in-nav-btn"
            onClick={() => router.push("/auth")}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-suno-gray-800/50 transition-all font-medium"
          >
            <span className="material-symbols-outlined text-xl">person</span>
            <span className="text-sm">Sign In</span>
          </button>
        )}
      </div>
    </aside>
  );

  return (
    <div className="bg-suno-black text-white selection:bg-suno-accent/30 min-h-screen overflow-x-hidden font-sans">
      <Head>
        <title>SelahAI | Gospel Music Co-Writer</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <GeneratingModal visible={generating} />
      <AuthRequiredModal visible={showAuthModal} onClose={() => setShowAuthModal(false)} />

      <SidebarNav navigateFn={setTab} />

      <main className={`md:ml-64 ${activeSong ? "pb-44" : "pb-24"} min-h-screen transition-all duration-300`}>
        {/* Mobile header */}
        <header className="h-16 border-b border-suno-gray-800 flex items-center justify-between px-6 bg-suno-black/85 backdrop-blur-md sticky top-0 z-40 md:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-suno-gray-950 border border-suno-gray-800 flex items-center justify-center shadow-md">
              <img src="/logo.png" alt="Selah Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="font-serif text-base text-white tracking-[0.15em] uppercase font-normal mt-0.5">Selah</h1>
          </div>
          <div className="flex items-center gap-2">
            {isOffline && (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-1 rounded-full">Offline</span>
            )}
            <button
              onClick={() => setMenuOpen(true)}
              className="p-2 text-gray-400 hover:text-white transition-colors active:scale-90"
              title="Open Navigation Menu"
            >
              <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
          </div>
        </header>

        {/* Desktop top bar */}
        <header className="h-20 border-b border-suno-gray-800 flex items-center justify-between px-8 bg-suno-black/80 backdrop-blur-md sticky top-0 z-40 hidden md:flex">
          <div className="flex items-center gap-6">
            <div className="relative w-96">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">search</span>
              <input
                className="w-full bg-suno-gray-900 border border-suno-gray-800 rounded-full pl-12 pr-6 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-suno-accent focus:border-suno-accent text-white placeholder:text-gray-500 transition-all"
                placeholder="Search songs, themes, scriptures..."
                type="text"
                disabled
              />
            </div>
          </div>
          <div className="flex items-center gap-4 text-gray-400">
            {isOffline && (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">Offline Mode</span>
            )}
          </div>
        </header>

        {/* Tab content */}
        <div className="px-4 md:px-8 pt-6">
          {tab === "home" && (
            <HomeTab
              songs={songs}
              songsLoaded={songsLoaded}
              onPlay={handleSongSelect}
              onQuickPlay={handleQuickPlay}
              onCreateFirst={() => setTab("create")}
              activeSongId={activeSong?.id}
            />
          )}
          {tab === "create" && <CreateTab onGenerate={handleGenerate} />}
          {tab === "library" && (
            <LibraryTab
              songs={songs}
              songsLoaded={songsLoaded}
              onPlay={handleSongSelect}
              onQuickPlay={handleQuickPlay}
              activeSongId={activeSong?.id}
            />
          )}
          {tab === "community" && <CommunityTab onPlay={handleSongSelect} />}
        </div>
      </main>

      {/* Persistent bottom player bar */}
      {activeSong && (
        <footer
          className="fixed bottom-0 left-0 w-full bg-suno-gray-900 border-t border-suno-gray-800 z-[60] flex items-center px-4 md:px-8 shadow-[0_-8px_30px_rgb(0,0,0,0.5)] justify-between"
          style={{ height: "5rem", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          {/* Song info — click to open Choir Desk */}
          <div
            className="flex items-center gap-3 w-1/3 md:w-1/4 min-w-0 cursor-pointer group"
            onClick={() => router.push(`/song/${activeSong.id}`)}
          >
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-suno-gray-800 overflow-hidden flex-shrink-0 shadow-lg border border-suno-gray-700 relative">
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-lg">open_in_full</span>
              </div>
              <img src="/logo.png" alt="Selah Logo" className="w-full h-full object-cover" />
            </div>
            <div className="truncate min-w-0">
              <h5 className="text-sm font-bold text-white truncate leading-tight group-hover:text-suno-accent transition-colors">{activeSong.title}</h5>
              <p className="text-xs text-gray-400 truncate leading-tight">{activeSong.genre} · Key of {activeSong.musicKey || chords[0]}</p>
            </div>
          </div>

          {/* Center playback controls */}
          <div className="flex-1 flex flex-col items-center min-w-0 px-3 md:px-4">
            <div className="flex items-center gap-4 md:gap-6 mb-1.5">
              <button onClick={stop} className="text-gray-400 hover:text-white transition-colors" title="Stop">
                <span className="material-symbols-outlined text-xl">stop</span>
              </button>
              <button
                id="mini-player-play-btn"
                onClick={() => (isPlaying ? pause() : play())}
                className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg"
                title={isPlaying ? "Pause" : "Play"}
              >
                <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {isPlaying ? "pause" : "play_arrow"}
                </span>
              </button>
              <button
                onClick={() => router.push(`/song/${activeSong.id}`)}
                className="text-gray-400 hover:text-white transition-colors"
                title="Open Choir Desk"
              >
                <span className="material-symbols-outlined text-xl">equalizer</span>
              </button>
            </div>
            {/* Chord progress strip */}
            <div className="w-full flex items-center gap-2 overflow-hidden">
              <span className="text-[9px] font-mono text-gray-500 shrink-0">Chords:</span>
              <div className="flex gap-1 overflow-hidden min-w-0">
                {chords.slice(0, 8).map((chord, idx) => {
                  const isActive = isPlaying && currentChordIdx === idx;
                  return (
                    <span
                      key={idx}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono border shrink-0 transition-all ${
                        isActive
                          ? "bg-suno-accent/20 text-suno-accent border-suno-accent/40 font-bold scale-105"
                          : "bg-suno-gray-800 text-gray-400 border-transparent"
                      }`}
                    >
                      {chord}
                    </span>
                  );
                })}
                {chords.length > 8 && (
                  <span className="text-[9px] text-gray-600 font-mono self-center shrink-0">+{chords.length - 8}</span>
                )}
              </div>
              <span className="text-[10px] font-mono text-suno-accent font-bold ml-auto shrink-0">{bpm}</span>
            </div>
          </div>

          {/* Right: Choir Desk button — desktop only */}
          <div className="hidden md:flex items-center justify-end w-1/4 shrink-0">
            <button
              id="open-choir-desk-btn"
              onClick={() => router.push(`/song/${activeSong.id}`)}
              className="px-4 py-2 bg-suno-accent/10 hover:bg-suno-accent/20 text-suno-accent text-xs font-bold rounded-full border border-suno-accent/20 flex items-center gap-1.5 transition-all"
            >
              <span className="material-symbols-outlined text-[15px]">equalizer</span>
              Choir Desk
            </button>
          </div>
        </footer>
      )}

      {/* Mobile bottom nav */}
      <nav className={`md:hidden fixed ${activeSong ? "bottom-20" : "bottom-0"} left-0 w-full bg-suno-gray-900 border-t border-suno-gray-800 flex justify-around items-center h-16 px-4 pb-safe z-50 transition-all duration-300`}>
        {[
          { id: "home", label: "Discover", icon: "explore" },
          { id: "create", label: "Create", icon: "add_circle" },
          { id: "library", label: "Library", icon: "library_music" },
          { id: "community", label: "Community", icon: "groups" },
        ].map(({ id, label, icon }) => (
          <button
            key={id}
            id={`mobile-nav-${id}`}
            onClick={() => setTab(id)}
            className={`flex flex-col items-center active:scale-90 transition-transform ${tab === id ? "text-suno-accent" : "text-gray-400"}`}
          >
            <span className="material-symbols-outlined text-xl">{icon}</span>
            <span className="text-[10px] font-bold mt-0.5">{label}</span>
          </button>
        ))}
      </nav>

      {/* Mobile hamburger menu */}
      {menuOpen && (
        <div className="fixed inset-0 bg-suno-black/95 backdrop-blur-2xl z-[150] flex flex-col items-center justify-center space-y-8 animate-fadeIn">
          <button
            onClick={() => setMenuOpen(false)}
            className="absolute top-6 right-6 p-2.5 text-gray-400 hover:text-white transition-colors"
            title="Close Menu"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
          <div className="flex flex-col items-center mb-4">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-suno-gray-950 border border-suno-gray-800 shadow-lg mb-3">
              <img src="/logo.png" alt="Selah Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="font-serif text-2xl text-white tracking-[0.25em] uppercase font-medium">Selah</h1>
          </div>
          <nav className="flex flex-col items-center space-y-6">
            {[
              { id: "home", label: "Discover" },
              { id: "create", label: "Create Studio" },
              { id: "library", label: "Library" },
              { id: "community", label: "Community" },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => { setTab(id); setMenuOpen(false); }}
                className={`text-xl font-medium transition-colors ${tab === id ? "text-suno-accent" : "text-gray-400 hover:text-white"}`}
              >
                {label}
              </button>
            ))}
          </nav>
          {user ? (
            <button
              onClick={() => { handleSignOut(); setMenuOpen(false); }}
              className="text-base text-gray-500 hover:text-red-400 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              Sign Out
            </button>
          ) : (
            <button
              onClick={() => { router.push("/auth"); setMenuOpen(false); }}
              className="text-base text-gray-400 hover:text-white transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      )}
    </div>
  );
}
