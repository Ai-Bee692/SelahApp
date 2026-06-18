import { useState, useEffect } from "react";
import { C } from "../data/constants";
import { StemRow } from "./StemRow";
import { useGospelAudio } from "../lib/useGospelAudio";

export const Player = ({ song, onClose }) => {
  const chords = song.chords && song.chords.length > 0 ? song.chords : ["C", "F", "G", "Am"];
  const genre = song.genre || 'Contemporary';
  const { isPlaying, currentChordIdx, bpm, setBpm, play, pause, stop } = useGospelAudio(chords, genre);

  const [lyricIdx, setLyricIdx] = useState(0);
  const [stemState, setStemState] = useState({
    lead:    { vol: 90, solo: false, muted: false },
    soprano: { vol: 85, solo: false, muted: false },
    alto:    { vol: 80, solo: false, muted: false },
    tenor:   { vol: 75, solo: false, muted: false },
  });

  // Advance lyrics every time the chord changes
  useEffect(() => {
    if (isPlaying && song.lyrics && song.lyrics.length > 0) {
      setLyricIdx((i) => (i + 1) % song.lyrics.length);
    }
  }, [currentChordIdx]);

  const updateStem = (key, field, val) =>
    setStemState((s) => ({ ...s, [key]: { ...s[key], [field]: val } }));

  const handlePlayPause = () => (isPlaying ? pause() : play());
  const handleStop = () => { stop(); setLyricIdx(0); };
  const handleClose = () => { stop(); onClose(); };

  const stemColors = { lead: "#1DB954", soprano: "#F6AD55", alto: "#68D391", tenor: "#76E4F7" };
  const stemLabels = { lead: "Lead Melody", soprano: "Soprano", alto: "Alto", tenor: "Tenor" };

  return (
    <div style={{ background: C.bg, minHeight: "100%", display: "flex", flexDirection: "column" }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center",
        padding: "16px 20px", borderBottom: `1px solid ${C.border}`,
      }}>
        <button onClick={handleClose} style={{
          background: "none", border: "none", color: C.muted,
          cursor: "pointer", fontSize: 22, padding: 0, marginRight: 14,
        }}>←</button>
        <div>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 16 }}>{song.title}</div>
          <div style={{ color: C.muted, fontSize: 12 }}>
            {song.genre} · Key of {song.musicKey || chords[0]} · {song.lang}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px" }}>

        {/* ── Now Playing Card ────────────────────────────── */}
        <div style={{
          background: `linear-gradient(135deg, ${C.greenDim}44, ${C.card})`,
          border: `1px solid ${C.green}44`,
          borderRadius: 16, padding: 20, marginBottom: 16, textAlign: "center",
        }}>
          <div style={{ fontSize: 42, marginBottom: 8 }}>🎶</div>
          <div style={{ color: C.text, fontWeight: 700, fontSize: 17, marginBottom: 12 }}>
            {song.title}
          </div>

          {/* Lyric Display */}
          <div style={{
            background: C.surface, borderRadius: 10, padding: "14px 16px",
            margin: "0 0 16px", minHeight: 60,
          }}>
            {song.lyrics && song.lyrics[lyricIdx] ? (
              <>
                <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>
                  [{song.lyrics[lyricIdx].part}]
                </div>
                <div style={{ color: C.green, fontWeight: 600, fontSize: 14, lineHeight: 1.5 }}>
                  {song.lyrics[lyricIdx].line}
                </div>
              </>
            ) : (
              <div style={{ color: C.muted, fontSize: 13 }}>Press Play to begin...</div>
            )}
          </div>

          {/* ── Chord Display ────────────────────────────── */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: C.muted, fontSize: 11, marginBottom: 8, letterSpacing: 1 }}>
              CHORD PROGRESSION
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
              {chords.map((chord, i) => {
                const isActive = isPlaying && currentChordIdx === i;
                return (
                  <div key={i} style={{
                    width: 52, height: 52,
                    borderRadius: 10,
                    border: `2px solid ${isActive ? C.green : C.border}`,
                    background: isActive
                      ? `linear-gradient(135deg, ${C.green}33, ${C.green}11)`
                      : C.surface,
                    color: isActive ? C.green : C.muted,
                    fontWeight: isActive ? 800 : 600,
                    fontSize: chord.length > 2 ? 12 : 15,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s ease",
                    boxShadow: isActive ? `0 0 14px ${C.green}55` : "none",
                    transform: isActive ? "scale(1.1)" : "scale(1)",
                  }}>
                    {chord}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Playback Controls ────────────────────────── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 16 }}>
            {/* Stop */}
            <button onClick={handleStop} style={{
              width: 38, height: 38, borderRadius: "50%",
              background: C.surface, border: `1px solid ${C.border}`,
              color: C.muted, fontSize: 16, cursor: "pointer",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}>⏹</button>

            {/* Play / Pause */}
            <button onClick={handlePlayPause} style={{
              width: 58, height: 58, borderRadius: "50%",
              background: isPlaying
                ? `linear-gradient(135deg, #E53E3E, #C53030)`
                : `linear-gradient(135deg, ${C.green}, #17A845)`,
              border: "none", fontSize: 22, cursor: "pointer",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              boxShadow: isPlaying ? "0 4px 20px #E53E3E55" : `0 4px 20px ${C.green}55`,
              transition: "all 0.2s ease",
            }}>
              {isPlaying ? "⏸" : "▶"}
            </button>

            {/* BPM up */}
            <button onClick={() => setBpm(Math.min(bpm + 4, 160))} style={{
              width: 38, height: 38, borderRadius: "50%",
              background: C.surface, border: `1px solid ${C.border}`,
              color: C.muted, fontSize: 14, cursor: "pointer",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}>+</button>
          </div>

          {/* ── BPM Slider ───────────────────────────────── */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: C.muted, fontSize: 11, whiteSpace: "nowrap" }}>BPM</span>
            <input
              type="range" min={50} max={160} value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              style={{ flex: 1, accentColor: C.green }}
            />
            <span style={{
              color: C.green, fontWeight: 700, fontSize: 13,
              minWidth: 32, textAlign: "right",
            }}>{bpm}</span>
          </div>
        </div>

        {/* ── Scripture Badge ──────────────────────────────── */}
        {song.scripture && (
          <div style={{
            background: C.card, borderRadius: 10,
            border: `1px solid ${C.border}`,
            padding: "12px 16px", display: "flex", alignItems: "center",
            gap: 10, marginBottom: 16,
          }}>
            <span style={{ fontSize: 18 }}>📖</span>
            <div>
              <div style={{ color: C.green, fontWeight: 700, fontSize: 12 }}>SCRIPTURE ANCHOR</div>
              <div style={{ color: C.muted, fontSize: 13 }}>{song.scripture}</div>
            </div>
          </div>
        )}

        {/* ── Choir Desk / Stem Mixer ──────────────────────── */}
        <div style={{
          background: C.surface, borderRadius: 14,
          border: `1px solid ${C.border}`, padding: 16, marginBottom: 16,
        }}>
          <div style={{
            color: C.green, fontWeight: 700, fontSize: 13,
            letterSpacing: 1, marginBottom: 12,
          }}>🎼 CHOIR DESK — STEM MIXER</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(stemState).map(([key, s]) => (
              <StemRow
                key={key}
                label={stemLabels[key]}
                color={stemColors[key]}
                vol={s.vol}
                setVol={(v) => updateStem(key, "vol", v)}
                solo={s.solo}
                setSolo={(v) => updateStem(key, "solo", v)}
                muted={s.muted}
                setMuted={(v) => updateStem(key, "muted", v)}
              />
            ))}
          </div>

          {/* ACE-Step Button */}
          <button
            style={{
              width: "100%", marginTop: 16, padding: "12px",
              borderRadius: 10, border: `1px solid ${C.green}55`,
              background: `linear-gradient(135deg, #1DB95422, transparent)`,
              color: C.green, fontWeight: 700, fontSize: 13,
              cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 8, transition: "all 0.2s ease",
            }}
            onClick={() => alert("🎙️ ACE-Step will generate real Soprano, Alto & Tenor voice stems.\n\nThis requires GPU processing and is available in Phase 2 of SelahAI.")}
          >
            <span>🎙️</span> Generate Real Choir Stems (ACE-Step)
          </button>
        </div>

        {/* ── Full Lyrics ──────────────────────────────────── */}
        {song.lyrics && song.lyrics.length > 0 && (
          <div style={{
            background: C.card, borderRadius: 14,
            border: `1px solid ${C.border}`, padding: 16, marginBottom: 20,
          }}>
            <div style={{
              color: C.green, fontWeight: 700, fontSize: 13,
              letterSpacing: 1, marginBottom: 12,
            }}>📝 FULL LYRICS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {song.lyrics.map((l, i) => (
                <div key={i} style={{
                  padding: "10px 12px", borderRadius: 8,
                  background: lyricIdx === i ? `${C.green}18` : "transparent",
                  border: `1px solid ${lyricIdx === i ? C.green + "44" : "transparent"}`,
                  transition: "all 0.2s ease",
                }}>
                  <div style={{ color: C.muted, fontSize: 10, marginBottom: 2 }}>[{l.part}]</div>
                  <div style={{ color: C.text, fontSize: 13, lineHeight: 1.5 }}>{l.line}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
