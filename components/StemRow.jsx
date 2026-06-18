import { useRef, useEffect } from "react";

export const StemRow = ({ label, color, vol, setVol, solo, setSolo, muted, setMuted, url, isPlaying }) => {
  const audioRef = useRef(null);

  // Sync playback with URL load
  useEffect(() => {
    if (url && !audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.loop = true;
    }
  }, [url]);

  // Sync global playback
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch((e) => console.log("Audio play error:", e));
    } else {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [isPlaying]);

  // Sync volume and mute
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = muted ? 0 : (vol / 100);
  }, [vol, muted]);

  return (
    <div
      className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-300 ${
        url 
          ? "bg-gradient-to-r from-primary/5 to-surface-container" 
          : "bg-surface-container border-white/5"
      }`}
      style={{ borderColor: url ? `${color}40` : "rgba(255, 255, 255, 0.05)" }}
    >
      {/* Icon/Letter */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none text-background shadow-md"
        style={{ backgroundColor: color }}
      >
        {label[0]}
      </div>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-white truncate">{label}</p>
        <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mt-0.5">
          {url ? "Synthesizer Ready" : "Local Synthesis"}
        </p>
      </div>

      {/* Volume Slider */}
      <input
        type="range"
        min={0}
        max={100}
        value={vol}
        onChange={(e) => setVol(+e.target.value)}
        className="w-20 accent-primary h-1 bg-white/10 rounded-full"
      />

      {/* Buttons */}
      <div className="flex gap-1.5">
        <button
          onClick={() => setSolo(!solo)}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all active:scale-95 ${
            solo
              ? "bg-primary text-background border-primary shadow-[0_0_12px_rgba(208,188,255,0.3)]"
              : "bg-white/5 text-on-surface-variant border-white/5 hover:border-white/20"
          }`}
        >
          SOLO
        </button>
        <button
          onClick={() => setMuted(!muted)}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all active:scale-95 ${
            muted
              ? "bg-red-500/20 text-red-500 border-red-500/30"
              : "bg-white/5 text-on-surface-variant border-white/5 hover:border-white/20"
          }`}
        >
          MUTE
        </button>
      </div>
    </div>
  );
};
