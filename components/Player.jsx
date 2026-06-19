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
    <div className="min-h-screen bg-suno-black text-white flex flex-col p-4 md:p-8">
      {/* Header */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between border-b border-suno-gray-800 pb-6 mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose} 
            className="p-3 bg-suno-gray-800 rounded-full hover:bg-suno-gray-700 active:scale-95 transition-all text-gray-400 hover:text-white"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <span className="px-3 py-1 rounded-full bg-suno-accent/15 text-suno-accent border border-suno-accent/30 text-[10px] font-bold uppercase tracking-widest">
              Choir Desk & Rehearsal
            </span>
            <h1 className="font-display text-2xl md:text-3xl text-white font-bold mt-1">{song.title}</h1>
          </div>
        </div>
        
        <div className="text-right hidden sm:block">
          <p className="text-sm font-bold text-suno-accent">{song.genre}</p>
          <p className="text-xs text-gray-400">Key of {song.musicKey || chords[0]} · {song.lang}</p>
        </div>
      </header>

      {/* Main Grid */}
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        {/* Left Column: Lyrics & Performance */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          {/* Active Screen Card */}
          <div className="bg-suno-gray-900 border border-suno-gray-800 p-6 rounded-3xl relative overflow-hidden group flex flex-col justify-between min-h-[320px]">
            {/* Background blur decorative circles */}
            <div className="absolute -right-24 -top-24 w-64 h-64 bg-suno-accent/5 blur-[100px] rounded-full group-hover:bg-suno-accent/10 transition-all duration-700"></div>
            
            <div className="flex items-center justify-between border-b border-suno-gray-800 pb-4 z-10">
              <span className="text-xs text-suno-accent font-bold uppercase tracking-widest">Live Prompt Sync</span>
              <div className="flex items-center gap-2 bg-suno-gray-800 px-3 py-1 rounded-full border border-suno-gray-700">
                <span className={`w-2.5 h-2.5 rounded-full ${isPlaying ? "bg-suno-accent animate-pulse" : "bg-gray-600"}`}></span>
                <span className="text-xs text-gray-400 font-bold">{isPlaying ? "Active Playback" : "Idle"}</span>
              </div>
            </div>

            {/* Lyric Prompter Box */}
            <div className="flex-1 flex flex-col justify-center py-8 z-10">
              {song.lyrics && song.lyrics[lyricIdx] ? (
                <div className="text-center space-y-3">
                  <span className="px-3 py-1 rounded-full bg-suno-gray-800 border border-suno-gray-700 text-xs font-bold text-suno-accent uppercase tracking-wider">
                    {song.lyrics[lyricIdx].part}
                  </span>
                  <p className="text-xl md:text-2xl font-bold text-white leading-relaxed px-4 md:px-8">
                    "{song.lyrics[lyricIdx].line}"
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-gray-500 italic">Press play below to start rehearsal monitor</p>
                </div>
              )}
            </div>

            {/* Chords Track */}
            <div className="border-t border-suno-gray-800 pt-6 z-10">
              <p className="text-center text-xs text-gray-500 uppercase tracking-widest mb-4">
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
                          ? "bg-suno-accent/20 border-suno-accent text-suno-accent shadow-[0_0_20px_rgba(59,130,246,0.25)] scale-110 font-bold"
                          : "bg-suno-gray-800 border-suno-gray-700 text-gray-400"
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
          <div className="bg-suno-gray-900 border border-suno-gray-800 p-6 rounded-3xl flex flex-col md:flex-row items-center gap-6 justify-between">
            {/* Playback Button Group */}
            <div className="flex items-center gap-4">
              <button 
                onClick={handleStop} 
                className="p-4 bg-suno-gray-800 hover:bg-suno-gray-700 rounded-2xl active:scale-95 transition-all text-gray-400 hover:text-white"
                title="Stop Rehearsal"
              >
                <span className="material-symbols-outlined">stop</span>
              </button>
              
              <button 
                onClick={handlePlayPause} 
                className={`w-16 h-16 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl ${
                  isPlaying 
                    ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-red-500/20" 
                    : "bg-suno-accent text-white shadow-suno-accent/20"
                }`}
              >
                <span className="material-symbols-outlined text-3xl font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {isPlaying ? "pause" : "play_arrow"}
                </span>
              </button>

              <div className="text-left ml-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Playback</p>
                <p className="text-sm text-white font-bold">{isPlaying ? "Rehearsal Live" : "Stopped"}</p>
              </div>
            </div>

            {/* BPM Adjuster */}
            <div className="flex-1 max-w-xs w-full flex items-center gap-4">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">BPM</span>
              <input
                type="range" 
                min={50} 
                max={160} 
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="flex-grow accent-suno-accent h-1 bg-suno-gray-700 rounded-full"
              />
              <span className="text-sm font-mono font-bold text-suno-accent w-12 text-right">{bpm}</span>
            </div>
          </div>

          {/* Scripture Verification Card */}
          {song.scripture && (
            <div className="bg-suno-gray-900 border border-suno-gray-800 p-5 rounded-3xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-suno-accent/15 border border-suno-accent/20 flex items-center justify-center text-suno-accent">
                <span className="material-symbols-outlined text-xl">menu_book</span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-suno-accent uppercase tracking-widest">Scriptural Reference Anchor</p>
                <p className="text-sm font-bold text-white mt-0.5">{song.scripture}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Choir Desk Mixer & Full Lyrics */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          {/* Stem Mixer */}
          <div className="bg-suno-gray-900 border border-suno-gray-800 p-6 rounded-3xl">
            <h3 className="text-lg text-white font-bold mb-4 flex items-center gap-2 font-display">
              <span className="material-symbols-outlined text-suno-accent">equalizer</span>
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
                  ? "bg-suno-gray-800 border-suno-gray-700 text-gray-500 cursor-wait" 
                  : stemUrls 
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                    : "bg-suno-accent/10 border-suno-accent/20 text-suno-accent hover:bg-suno-accent/20 hover:border-suno-accent"
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
            <div className="bg-suno-gray-900 border border-suno-gray-800 p-6 rounded-3xl flex-grow max-h-[350px] flex flex-col">
              <h3 className="text-base text-white font-bold mb-4 flex items-center gap-2 shrink-0 font-display">
                <span className="material-symbols-outlined text-suno-accent">subject</span>
                Full Lyric Sheets
              </h3>
              
              <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar flex-1">
                {song.lyrics.map((l, i) => (
                  <div 
                    key={i} 
                    className={`p-3 rounded-2xl border transition-all ${
                      lyricIdx === i 
                        ? "bg-suno-accent/15 border-suno-accent/30" 
                        : "bg-suno-gray-800/40 border-transparent hover:border-suno-gray-700"
                    }`}
                  >
                    <span className="text-[9px] font-bold text-suno-accent uppercase tracking-widest block mb-0.5">
                      {l.part}
                    </span>
                    <p className="text-xs text-white leading-relaxed font-sans">
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
