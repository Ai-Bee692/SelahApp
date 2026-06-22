import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getSong, saveSong } from "../../lib/songService";
import { useGospelAudio } from "../../lib/useGospelAudio";
import { Player } from "../../components/Player";
import { supabase } from "../../lib/supabase";

export default function SongPage() {
  const router = useRouter();
  const { id } = router.query;
  const [song, setSong] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (id) {
      getSong(Number(id)).then((data) => {
        if (data) {
          setSong(data);
        } else {
          console.error("Song not found:", id);
        }
      });
    }
  }, [id]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const chords = song?.chords && song.chords.length > 0 ? song.chords : ["C", "F", "G", "Am"];
  const genre = song?.genre || "Contemporary";

  const audioState = useGospelAudio(chords, genre);

  const handleUpdateSong = async (updatedSong) => {
    setSong(updatedSong);
    try {
      await saveSong(updatedSong);
    } catch (dbErr) {
      console.error("Failed to persist updated song locally:", dbErr);
    }
  };

  const navigateToTab = (tabName) => {
    router.push(`/?tab=${tabName}`);
  };

  if (!song) {
    return (
      <div className="bg-suno-black text-white min-h-screen flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <span className="animate-spin material-symbols-outlined text-4xl text-suno-accent">progress_activity</span>
          <p className="text-sm text-gray-400">Loading Choir Desk...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-suno-black text-white selection:bg-suno-accent/30 min-h-screen overflow-x-hidden font-sans">
      <Head>
        <title>SelahAI | Choir Desk &amp; Rehearsal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Sidebar Navigation Shell (Hidden on Mobile) */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-suno-gray-900 border-r border-suno-gray-800 flex flex-col p-6 space-y-4 z-50 hidden md:flex">
        <div className="flex flex-col items-center mb-8 border-b border-suno-gray-800 pb-6">
          <div className="w-24 h-24 rounded-2xl overflow-hidden bg-suno-gray-900 border border-suno-gray-800 flex items-center justify-center shadow-lg mb-3">
            <img src="/logo.png" alt="Selah Logo" className="w-full h-full object-cover" />
          </div>
          <div className="text-center mt-2">
            <h1 className="font-serif text-2xl text-white tracking-[0.25em] uppercase font-medium">Selah</h1>
            <p className="text-[9px] uppercase tracking-[0.2em] text-gray-400 font-semibold mt-1">Gospel Music App</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          <button
            onClick={() => navigateToTab("home")}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 font-medium text-gray-400 hover:text-white hover:bg-suno-gray-800/50"
          >
            <span className="material-symbols-outlined text-xl">explore</span>
            <span className="text-sm">Discover</span>
          </button>
          <button
            onClick={() => navigateToTab("create")}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 font-medium text-gray-400 hover:text-white hover:bg-suno-gray-800/50"
          >
            <span className="material-symbols-outlined text-xl">add_circle</span>
            <span className="text-sm">Create Studio</span>
          </button>
          <button
            onClick={() => navigateToTab("library")}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 font-medium text-gray-400 hover:text-white hover:bg-suno-gray-800/50"
          >
            <span className="material-symbols-outlined text-xl">library_music</span>
            <span className="text-sm">Library</span>
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="md:ml-64 pb-24 min-h-screen transition-all duration-300">
        {/* Mobile Top Navbar */}
        <header className="h-16 border-b border-suno-gray-800 flex items-center justify-between px-6 bg-suno-black/85 backdrop-blur-md sticky top-0 z-40 md:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-suno-gray-950 border border-suno-gray-800 flex items-center justify-center shadow-md">
              <img src="/logo.png" alt="Selah Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="font-serif text-base text-white tracking-[0.15em] uppercase font-normal mt-0.5">Selah</h1>
          </div>
          <button 
            onClick={() => setMenuOpen(true)}
            className="p-2 text-gray-400 hover:text-white transition-colors active:scale-90"
            title="Open Navigation Menu"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>
        </header>

        {/* Top Header Anchor */}
        <header className="h-20 border-b border-suno-gray-800 flex items-center justify-between px-8 bg-suno-black/80 backdrop-blur-md sticky top-0 z-40 hidden md:flex">
          <div className="flex items-center gap-6">
            <div className="relative w-96">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">search</span>
              <input
                className="w-full bg-suno-gray-900 border border-suno-gray-800 rounded-full pl-12 pr-6 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-suno-accent focus:border-suno-accent text-white placeholder:text-gray-500 transition-all"
                placeholder="Search for songs, themes, scriptures..."
                type="text"
                disabled
              />
            </div>
          </div>
        </header>

        {/* Player Component */}
        <div className="pt-2">
          <Player 
            song={song} 
            audioState={audioState} 
            onClose={() => router.push('/')} 
            onUpdateSong={handleUpdateSong}
            user={user}
          />
        </div>
      </main>

      {/* Full-Screen Drawer Menu (Hamburger Overlay) */}
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
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-suno-gray-950 border border-suno-gray-800 flex items-center justify-center shadow-lg mb-3">
              <img src="/logo.png" alt="Selah Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="font-serif text-2xl text-white tracking-[0.25em] uppercase font-medium">Selah</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-semibold mt-1">Gospel Music App</p>
          </div>
          <nav className="flex flex-col items-center space-y-6">
            <button
              onClick={() => { navigateToTab("home"); setMenuOpen(false); }}
              className="text-xl font-medium text-gray-400 hover:text-white transition-colors"
            >
              Discover
            </button>
            <button
              onClick={() => { navigateToTab("create"); setMenuOpen(false); }}
              className="text-xl font-medium text-gray-400 hover:text-white transition-colors"
            >
              Create Studio
            </button>
            <button
              onClick={() => { navigateToTab("library"); setMenuOpen(false); }}
              className="text-xl font-medium text-gray-400 hover:text-white transition-colors"
            >
              Library
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
