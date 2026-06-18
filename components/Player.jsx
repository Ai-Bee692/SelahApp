import { useState, useEffect } from "react";
import { StemRow } from "./StemRow";

export const Player = ({ song, audioState, onClose }) => {
  const { isPlaying, currentChordIdx, bpm, setBpm, play, pause, stop } = audioState;
  const chords = song.chords && song.chords.length > 0 ? song.chords : ["C", "F", "G", "Am"];

  const [lyricIdx, setLyricIdx] = useState(0);
  const [isGeneratingStems, setIsGeneratingStems] = useState(false);
  const [stemUrls, setStemUrls] = useState(null);

  const [stemState, setStemState] = useState({
    lead:    { vol: 90, solo: false, muted: false },
    soprano: { vol: 85, solo: false, muted: false },
    alto:    { vol: 80, solo: false, muted: false },
    tenor:   { vol: 75, solo: false, muted: false },
  });

  const generateCloudStems = async () => {
    setIsGeneratingStems(true);
    try {
      const res = await fetch("/api/stems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lyrics: song.lyrics,
          genre: song.genre,
          musicKey: song.musicKey || chords[0]
        }),
      });
      const data = await res.json();
      if (data.stems) {
        setStemUrls(data.stems);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to reach Cloud GPU Server.");
    }
    setIsGeneratingStems(false);
  };

  // Sync lyrics index when chord progression shifts
  useEffect(() => {
    if (isPlaying && song.lyrics && song.lyrics.length > 0) {
      setLyricIdx((i) => (i + 1) % song.lyrics.length);
    }
  }, [currentChordIdx, isPlaying]);

  const updateStem = (key, field, val) =>
    setStemState((s) => ({ ...s, [key]: { ...s[key], [field]: val } }));

  const handlePlayPause = () => (isPlaying ? pause() : play());
  const handleStop = () => { stop(); setLyricIdx(0); };

  const stemColors = { lead: "#8B5CF6", soprano: "#F59E0B", alto: "#10B981", tenor: "#06B6D4" };
  const stemLabels = { lead: "Lead Vocals", soprano: "Soprano Harmony", alto: "Alto Harmony", tenor: "Tenor Harmony" };

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col p-4 md:p-8">
      {/* Header */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between border-b border-white/10 pb-6 mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose} 
            className="p-3 bg-white/5 rounded-full hover:bg-white/10 active:scale-95 transition-all text-on-surface-variant hover:text-white"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <span className="px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 text-[10px] font-bold uppercase tracking-widest">
              Choir Desk & Rehearsal
            </span>
            <h1 className="font-headline-lg text-2xl md:text-3xl text-white font-bold mt-1">{song.title}</h1>
          </div>
        </div>
        
        <div className="text-right hidden sm:block">
          <p className="text-sm font-bold text-primary">{song.genre}</p>
          <p className="text-xs text-on-surface-variant">Key of {song.musicKey || chords[0]} · {song.lang}</p>
        </div>
      </header>

      {/* Main Grid */}
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        {/* Left Column: Lyrics & Performance */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          {/* Active Screen Card */}
          <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group border border-white/10 flex flex-col justify-between min-h-[320px]">
            {/* Background blur decorative circles */}
            <div className="absolute -right-24 -top-24 w-64 h-64 bg-primary/10 blur-[100px] rounded-full group-hover:bg-primary/15 transition-all duration-700"></div>
            
            <div className="flex items-center justify-between border-b border-white/5 pb-4 z-10">
              <span className="font-label-sm text-xs text-primary uppercase tracking-widest">Live Prompt Sync</span>
              <div className="flex items-center gap-2 bg-surface-container-high px-3 py-1 rounded-full border border-white/5">
                <span className={`w-2.5 h-2.5 rounded-full ${isPlaying ? "bg-secondary animate-pulse" : "bg-outline"}`}></span>
                <span className="text-xs text-on-surface-variant font-bold">{isPlaying ? "Active Playback" : "Idle"}</span>
              </div>
            </div>

            {/* Lyric Prompter Box */}
            <div className="flex-1 flex flex-col justify-center py-8 z-10">
              {song.lyrics && song.lyrics[lyricIdx] ? (
                <div className="text-center space-y-3">
                  <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-primary uppercase tracking-wider">
                    {song.lyrics[lyricIdx].part}
                  </span>
                  <p className="text-xl md:text-2xl font-bold text-white leading-relaxed px-4 md:px-8">
                    "{song.lyrics[lyricIdx].line}"
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-on-surface-variant italic">Press play below to start rehearsal monitor</p>
                </div>
              )}
            </div>

            {/* Chords Track */}
            <div className="border-t border-white/5 pt-6 z-10">
              <p className="text-center font-label-sm text-xs text-on-surface-variant uppercase tracking-widest mb-4">
                Chord Arranger
              </p>
              <div className="flex justify-center gap-3">
                {chords.map((chord, i) => {
                  const isActive = isPlaying && currentChordIdx === i;
                  return (
                    <div 
                      key={i} 
                      className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 font-mono text-sm ${
                        isActive 
                          ? "bg-primary/20 border-primary text-primary shadow-[0_0_20px_rgba(208,188,255,0.25)] scale-110 font-bold"
                          : "bg-surface-container border-white/5 text-on-surface-variant"
                      }`}
                    >
                      {chord}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Performance Toolbar */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col md:flex-row items-center gap-6 justify-between">
            {/* Playback Button Group */}
            <div className="flex items-center gap-4">
              <button 
                onClick={handleStop} 
                className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl active:scale-95 transition-all text-on-surface-variant hover:text-white"
                title="Stop Rehearsal"
              >
                <span className="material-symbols-outlined">stop</span>
              </button>
              
              <button 
                onClick={handlePlayPause} 
                className={`w-16 h-16 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl ${
                  isPlaying 
                    ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-red-500/20" 
                    : "bg-gradient-to-r from-primary to-secondary text-background shadow-primary/25"
                }`}
              >
                <span className="material-symbols-outlined text-3xl font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {isPlaying ? "pause" : "play_arrow"}
                </span>
              </button>

              <div className="text-left ml-2">
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Playback</p>
                <p className="text-sm text-white font-bold">{isPlaying ? "Rehearsal Live" : "Stopped"}</p>
              </div>
            </div>

            {/* BPM Adjuster */}
            <div className="flex-1 max-w-xs w-full flex items-center gap-4">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">BPM</span>
              <input
                type="range" 
                min={50} 
                max={160} 
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="flex-grow accent-primary h-1 bg-white/10 rounded-full"
              />
              <span className="text-sm font-mono font-bold text-primary w-12 text-right">{bpm}</span>
            </div>
          </div>

          {/* Scripture Verification Card */}
          {song.scripture && (
            <div className="glass-panel p-5 rounded-3xl border border-white/5 flex items-center gap-4 bg-surface-container-low">
              <div className="w-12 h-12 rounded-2xl bg-secondary/15 border border-secondary/20 flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-xl">menu_book</span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Scriptural Reference Anchor</p>
                <p className="text-sm font-bold text-white mt-0.5">{song.scripture}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Choir Desk Mixer & Full Lyrics */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          {/* Stem Mixer */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10">
            <h3 className="font-headline-md text-lg text-white font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">equalizer</span>
              Choir Desk Mixer
            </h3>

            <div className="space-y-3">
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
                  url={stemUrls ? stemUrls[key] : null}
                  isPlaying={isPlaying}
                />
              ))}
            </div>

            {/* Cloud GPU Trigger */}
            <button
              onClick={generateCloudStems}
              disabled={isGeneratingStems || stemUrls}
              className={`w-full mt-6 py-4 rounded-2xl font-bold text-sm border flex items-center justify-center gap-2 active:scale-95 transition-all ${
                isGeneratingStems 
                  ? "bg-surface-container border-white/10 text-on-surface-variant cursor-wait" 
                  : stemUrls 
                    ? "bg-secondary/15 border-secondary/30 text-secondary" 
                    : "bg-gradient-to-r from-primary/10 to-secondary/5 border-primary/30 text-primary hover:border-primary/60 hover:shadow-lg hover:shadow-primary/5"
              }`}
            >
              {isGeneratingStems ? (
                <>
                  <span className="animate-spin material-symbols-outlined text-base">progress_activity</span>
                  Synthesizing SAT Stems (ACE-Step)...
                </>
              ) : stemUrls ? (
                <>
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  SAT Harmonies Generated
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">cloud_sync</span>
                  Synthesize Choir SAT Harmonies
                </>
              )}
            </button>
          </div>

          {/* Full Lyrics List */}
          {song.lyrics && song.lyrics.length > 0 && (
            <div className="glass-panel p-6 rounded-3xl border border-white/10 flex-grow max-h-[350px] flex flex-col">
              <h3 className="font-headline-md text-base text-white font-bold mb-4 flex items-center gap-2 shrink-0">
                <span className="material-symbols-outlined text-primary">subject</span>
                Full Lyric Sheets
              </h3>
              
              <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar flex-1">
                {song.lyrics.map((l, i) => (
                  <div 
                    key={i} 
                    className={`p-3 rounded-2xl border transition-all ${
                      lyricIdx === i 
                        ? "bg-primary/15 border-primary/30" 
                        : "bg-surface-container border-transparent hover:border-white/5"
                    }`}
                  >
                    <span className="text-[9px] font-bold text-primary uppercase tracking-widest block mb-0.5">
                      {l.part}
                    </span>
                    <p className="text-xs text-white leading-relaxed">
                      {l.line}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
