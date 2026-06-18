import { useState } from "react";
import Head from "next/head";
import { C, MOCK_SONGS } from "../data/constants";
import { GeneratingModal } from "../components/GeneratingModal";
import { Player } from "../components/Player";
import { HomeTab } from "../components/tabs/HomeTab";
import { CreateTab } from "../components/tabs/CreateTab";
import { LibraryTab } from "../components/tabs/LibraryTab";

export default function SelahApp() {
  const [tab, setTab] = useState("home");
  const [songs, setSongs] = useState(MOCK_SONGS);
  const [activeSong, setActiveSong] = useState(null);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async ({ theme, musicKey, langs, genre, harmony, scripture }) => {
    setGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, musicKey, langs, genre, harmony, scripture }),
      });
      
      const data = await res.json();
      
      const newSong = {
        id: Date.now(),
        title: data.title || `New ${theme} Song`,
        genre,
        musicKey,
        lang: langs.join(" + "),
        theme,
        scripture: data.scripture || scripture || `Auto-matched for "${theme}"`,
        lyrics: data.lyrics || [],
        chords: data.chords || []
      };
      
      setSongs((prev) => [newSong, ...prev]);
      setActiveSong(newSong);
    } catch (err) {
      console.error(err);
      alert("Error generating song. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (activeSong) {
    return (
      <div
        style={{
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          background: C.bg,
          minHeight: "100vh",
          maxWidth: 420,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Head>
          <title>Selah Player</title>
        </Head>
        <Player song={activeSong} onClose={() => setActiveSong(null)} />
      </div>
    );
  }

  const tabs = [
    { id: "home", icon: "🏠", label: "Home" },
    { id: "create", icon: "✚", label: "Create" },
    { id: "library", icon: "📚", label: "Library" },
  ];

  return (
    <div
      style={{
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        background: C.bg,
        minHeight: "100vh",
        maxWidth: 420,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      <Head>
        <title>Selah App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <GeneratingModal visible={generating} />

      {/* Top Bar */}
      <div
        style={{
          padding: "14px 20px 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div style={{ color: C.green, fontWeight: 900, fontSize: 24, letterSpacing: 1 }}>
          SELAH
        </div>
        <div style={{ color: C.muted, fontSize: 11, fontStyle: "italic" }}>
          Pause. Reflect. Worship.
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {tab === "home" && (
          <HomeTab songs={songs} onPlay={setActiveSong} />
        )}
        {tab === "create" && <CreateTab onGenerate={handleGenerate} />}
        {tab === "library" && (
          <LibraryTab songs={songs} onPlay={setActiveSong} />
        )}
      </div>

      {/* Bottom Nav */}
      <div
        style={{
          display: "flex",
          borderTop: `1px solid ${C.border}`,
          background: C.surface,
          padding: "8px 0 4px",
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              padding: "6px 0",
            }}
          >
            <span style={{ fontSize: t.id === "create" ? 22 : 18 }}>{t.icon}</span>
            <span
              style={{
                fontSize: 10,
                color: tab === t.id ? C.green : C.muted,
                fontWeight: tab === t.id ? 700 : 400,
                fontFamily: "inherit",
              }}
            >
              {t.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
