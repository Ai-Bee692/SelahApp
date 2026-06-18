import { useRef, useEffect } from "react";
import { C } from "../data/constants";

export const StemRow = ({ label, color, vol, setVol, solo, setSolo, muted, setMuted, url, isPlaying }) => {
  const audioRef = useRef(null);

  // 1. Initialize audio object when URL is received
  useEffect(() => {
    if (url && !audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.loop = true;
    }
  }, [url]);

  // 2. Sync playback with the global Play/Pause button
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch((e) => console.log("Audio play error (mock missing file):", e));
    } else {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [isPlaying]);

  // 3. Sync volume and mute state
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = muted ? 0 : (vol / 100);
  }, [vol, muted]);

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
        background: url ? `linear-gradient(90deg, ${color}22, ${C.card})` : C.card,
        borderRadius: 10, border: `1px solid ${url ? color : C.border}`,
        transition: "all 0.3s ease"
      }}
    >
      <div
        style={{
          width: 32, height: 32, borderRadius: "50%", background: color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: 13, color: "#000", flexShrink: 0,
        }}
      >
        {label[0]}
      </div>
      <div style={{ flex: 1, fontSize: 13, color: C.text, fontWeight: 600 }}>
        {label}
      </div>
      <input
        type="range" min={0} max={100} value={vol}
        onChange={(e) => setVol(+e.target.value)}
        style={{ width: 80, accentColor: C.green }}
      />
      <button
        onClick={() => setSolo(!solo)}
        style={{
          padding: "4px 10px", borderRadius: 6,
          border: `1px solid ${solo ? C.green : C.border}`,
          background: solo ? C.green : "transparent",
          color: solo ? "#000" : C.muted,
          fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
        }}
      >
        SOLO
      </button>
      <button
        onClick={() => setMuted(!muted)}
        style={{
          padding: "4px 10px", borderRadius: 6,
          border: `1px solid ${muted ? "#E53E3E" : C.border}`,
          background: muted ? "#E53E3E" : "transparent",
          color: muted ? "#fff" : C.muted,
          fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
        }}
      >
        MUTE
      </button>
    </div>
  );
};
