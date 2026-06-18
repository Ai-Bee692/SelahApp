import { useState } from "react";
import { C, THEMES, LANGS, GENRES, KEYS } from "../../data/constants";
import { Pill } from "../Pill";
import { GenreCard } from "../GenreCard";
import { Label } from "../Label";

export const CreateTab = ({ onGenerate }) => {
  const [theme, setTheme] = useState("Thanksgiving");
  const [musicKey, setMusicKey] = useState("G");
  const [langs, setLangs] = useState(["English"]);
  const [genre, setGenre] = useState("Afrobeats");
  const [harmony, setHarmony] = useState("sat");
  const [scripture, setScripture] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const toggleLang = (l) =>
    setLangs((prev) =>
      prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]
    );

  return (
    <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
      <div style={{ color: C.text, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>
        Create a Song
      </div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>
        Select your options · We handle the rest
      </div>

      {/* Language Pills */}
      <div style={{ marginBottom: 20 }}>
        <Label>Language</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {LANGS.map((l) => (
            <Pill key={l} label={l} selected={langs.includes(l)} onClick={() => toggleLang(l)} />
          ))}
        </div>
      </div>

      {/* Theme */}
      <div style={{ marginBottom: 20 }}>
        <Label>Theme / Doctrine</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {THEMES.map((t) => (
            <Pill key={t} label={t} selected={theme === t} onClick={() => setTheme(t)} />
          ))}
        </div>
      </div>

      {/* Key Selection */}
      <div style={{ marginBottom: 20 }}>
        <Label>Musical Key</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {KEYS.map((k) => (
            <Pill key={k} label={k} selected={musicKey === k} onClick={() => setMusicKey(k)} />
          ))}
        </div>
      </div>

      {/* Genre Grid */}
      <div style={{ marginBottom: 20 }}>
        <Label>Genre Vibe</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
          {GENRES.map((g) => (
            <GenreCard
              key={g.label}
              icon={g.icon}
              label={g.label}
              selected={genre === g.label}
              onClick={() => setGenre(g.label)}
            />
          ))}
        </div>
      </div>

      {/* Harmony Toggle */}
      <div style={{ marginBottom: 20 }}>
        <Label>Harmony Structure</Label>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          {[
            { val: "solo", label: "Solo Leader" },
            { val: "sat", label: "Multipart Choir (SAT)" },
          ].map((o) => (
            <button
              key={o.val}
              onClick={() => setHarmony(o.val)}
              style={{
                flex: 1,
                padding: "10px 8px",
                borderRadius: 10,
                border: `1.5px solid ${harmony === o.val ? C.green : C.border}`,
                background: harmony === o.val ? `${C.green}22` : "transparent",
                color: harmony === o.val ? C.green : C.muted,
                fontWeight: harmony === o.val ? 700 : 400,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Toggle */}
      <button
        onClick={() => setShowAdvanced((s) => !s)}
        style={{
          background: "none",
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          color: C.muted,
          fontSize: 13,
          padding: "8px 14px",
          cursor: "pointer",
          fontFamily: "inherit",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {showAdvanced ? "▲" : "▼"} Advanced Options
      </button>

      {showAdvanced && (
        <div
          style={{
            background: C.card,
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <Label>Scriptural Anchor (optional)</Label>
          <input
            value={scripture}
            onChange={(e) => setScripture(e.target.value)}
            placeholder="e.g. Psalm 23, Romans 8:31"
            style={{
              width: "100%",
              marginTop: 8,
              padding: "10px 12px",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              color: C.text,
              fontSize: 14,
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
          <div style={{ color: C.muted, fontSize: 11, marginTop: 6 }}>
            The AI will anchor every lyric to this verse and display the reference tag.
          </div>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={() => onGenerate({ theme, musicKey, langs, genre, harmony, scripture })}
        style={{
          width: "100%",
          padding: "16px",
          borderRadius: 14,
          border: "none",
          background: `linear-gradient(135deg, ${C.green}, #17A845)`,
          color: "#000",
          fontWeight: 800,
          fontSize: 16,
          cursor: "pointer",
          fontFamily: "inherit",
          letterSpacing: 0.5,
          boxShadow: `0 4px 20px ${C.green}44`,
        }}
      >
        🎶 Generate Song
      </button>
    </div>
  );
};
