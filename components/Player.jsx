import { useState, useEffect } from "react";
import { StemRow } from "./StemRow";
import { AuthRequiredModal } from "./AuthRequiredModal";

export const Player = ({ song, audioState, onClose, onUpdateSong, user }) => {
  const {
    isPlaying, currentChordIdx, bpm, setBpm, play, pause, stop,
    volumes, setVolume, exportWav, exportMidi,
    loadStems, applyStemGains, stemsLoaded, stemsLoading,
    loadBackingTrack, backingTrackLoaded, backingTrackLoading,
  } = audioState;

  const chords = song.chords && song.chords.length > 0 ? song.chords : ["C", "F", "G", "Am"];

  const [mode, setMode] = useState("choir");
  const [isGeneratingStems, setIsGeneratingStems] = useState(false);
  const [isSynthesizingLocal, setIsSynthesizingLocal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [generationStage, setGenerationStage] = useState("");
  const [stemUrls, setStemUrls] = useState(null);

  // AI-generated full-mix state (apiframe/Suno)
  const [aiAudioUrl, setAiAudioUrl] = useState(null);
  const [aiAudioTitle, setAiAudioTitle] = useState(null);
  const [aiTracks, setAiTracks] = useState(null);      // both Suno variants
  const [selectedTrackIdx, setSelectedTrackIdx] = useState(0);
  const [aiSource, setAiSource] = useState(null);      // "apiframe_suno" | null

  const [stemState, setStemState] = useState({
    lead:    { vol: 90, solo: false, muted: false },
    soprano: { vol: 85, solo: false, muted: false },
    alto:    { vol: 80, solo: false, muted: false },
    tenor:   { vol: 75, solo: false, muted: false },
  });

  const [backingTrackUrl, setBackingTrackUrl] = useState(null);
  const [isGeneratingBacking, setIsGeneratingBacking] = useState(false);
  const [backingError, setBackingError] = useState(null);
  const [stemsError, setStemsError] = useState(null);

  // Sync stem URLs with Web Audio context loader (used for local synth stems)
  useEffect(() => {
    if (stemUrls && loadStems) {
      loadStems(stemUrls);
    }
  }, [stemUrls, loadStems]);

  // Sync volume/mute/solo changes to Web Audio gain nodes
  useEffect(() => {
    if (applyStemGains) {
      applyStemGains(stemState);
    }
  }, [stemState, applyStemGains]);

  // Sync backing track URL with audio context loader
  useEffect(() => {
    if (backingTrackUrl && loadBackingTrack) {
      loadBackingTrack(backingTrackUrl);
    }
  }, [backingTrackUrl, loadBackingTrack]);

  // When AI audio URL changes, load it as the backing track so it plays via the audio engine
  useEffect(() => {
    if (aiAudioUrl && loadBackingTrack) {
      loadBackingTrack(aiAudioUrl);
    }
  }, [aiAudioUrl, loadBackingTrack]);

  // Load existing generated AI song data from song prop if available
  useEffect(() => {
    if (song) {
      setAiAudioUrl(song.audio_url || null);
      setAiTracks(song.tracks || null);
      setAiSource(song.ai_source || (song.audio_url ? "apiframe_suno" : null));
      setAiAudioTitle(song.title || null);
      if (song.tracks && song.audio_url) {
        const idx = song.tracks.findIndex(t => t.audio_url === song.audio_url);
        if (idx !== -1) setSelectedTrackIdx(idx);
      }
    }
  }, [song]);

  // Expired state validation: 48 hours limit
  const isExpired = song.created_at && (Date.now() - song.created_at) > 48 * 60 * 60 * 1000;

  // Precompute chord-to-lyric index mapping
  const chordToLyricMap = [];
  const flatLyricsText = [];
  (song.lyrics || []).forEach((l, lineIdx) => {
    const chordsList = l.chords || [];
    chordsList.forEach(() => {
      chordToLyricMap.push(lineIdx);
      flatLyricsText.push(l.line || "");
    });
  });
  const activeLyricIdx = chordToLyricMap[currentChordIdx] ?? 0;

  // Auto-scroll the active lyric line into view in Spotify Karaoke style
  useEffect(() => {
    const activeEl = document.getElementById(`lyric-line-${activeLyricIdx}`);
    const container = document.getElementById("karaoke-lyrics-container");
    if (activeEl && container) {
      container.scrollTo({
        top: activeEl.offsetTop - container.offsetTop - (container.clientHeight / 2) + (activeEl.clientHeight / 2),
        behavior: "smooth",
      });
    }
  }, [activeLyricIdx]);

  // ── Local Web Audio synth (instant preview fallback) ──────────────────────
  const generateLocalStems = async () => {
    if (stop) stop();
    setIsSynthesizingLocal(true);
    setStemsError(null);
    setAiAudioUrl(null);
    setAiSource(null);
    try {
      const { getSATBNotesForChords, renderVoiceStemWav, bufferToWav } = await import("../lib/useGospelAudio");
      const satb = getSATBNotesForChords(chords);
      const voices = ["soprano", "alto", "tenor", "lead"];
      const renderedUrls = {};
      for (const voice of voices) {
        const notesByChord = satb[voice].map((note) => [note]);
        const buffer = await renderVoiceStemWav(notesByChord, voice, bpm, flatLyricsText);
        const wavBlob = bufferToWav(buffer);
        renderedUrls[voice] = URL.createObjectURL(wavBlob);
      }
      setStemUrls(renderedUrls);
    } catch (e) {
      console.error(e);
      setStemsError({ type: "error", message: "Local synthesis failed: " + e.message });
    } finally {
      setIsSynthesizingLocal(false);
    }
  };

  // ── AI Song Generation (apiframe.ai / Suno) ───────────────────────────────
  const generateCloudStems = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (stop) stop();
    setIsGeneratingStems(true);
    setElapsedTime(0);
    setGenerationStage("Submitting request to AI backend...");
    setStemsError(null);
    setStemUrls(null);
    setAiAudioUrl(null);
    setAiTracks(null);
    setAiSource(null);

    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    try {
      setGenerationStage("Suno is composing & rendering (this may take 30-120 seconds)...");
      const res = await fetch("/api/stems", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lyrics:       song.lyrics,
          genre:        song.genre        || "Contemporary",
          musicKey:     song.musicKey     || chords[0] || "G",
          chords:       chords,
          title:        song.title,
          emotional_mode: song.emotional_mode || null,
          instrumentation: song.instrumentation || null,
          vocal_gender: song.vocal_gender  || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        clearInterval(timer);
        setIsGeneratingStems(false);
        setGenerationStage("");

        if (data.fallback === "web_audio") {
          setStemsError({
            type:    "setup",
            message: `AI generation unavailable: ${data.message || "backend unreachable"}. Using local synthesizer.`,
          });
          await generateLocalStems();
        } else {
          setStemsError({ type: "error", message: data.message || "AI song generation failed." });
          await generateLocalStems();
        }
        return;
      }

      if (data.audio_url) {
        const updated = {
          ...song,
          audio_url: data.audio_url,
          tracks: data.tracks || null,
          ai_source: data.source || "apiframe_suno",
        };
        if (onUpdateSong) {
          onUpdateSong(updated);
        }
        setAiAudioUrl(data.audio_url);
        setAiAudioTitle(data.audio_title || null);
        setAiTracks(data.tracks || null);
        setAiSource(data.source || "apiframe_suno");
        setSelectedTrackIdx(0);
      }
    } catch (e) {
      console.error("[Player] Cloud AI error:", e);
      clearInterval(timer);
      setIsGeneratingStems(false);
      setGenerationStage("");

      setStemsError({
        type:    "error",
        message: "Could not reach the backend. Falling back to local synthesizer.",
      });
      await generateLocalStems();
    } finally {
      clearInterval(timer);
      setIsGeneratingStems(false);
      setGenerationStage("");
    }
  };

  const handleSelectTrack = (idx) => {
    if (!aiTracks || !aiTracks[idx]) return;
    setSelectedTrackIdx(idx);
    const selectedUrl = aiTracks[idx].audio_url;
    setAiAudioUrl(selectedUrl);
    if (loadBackingTrack) loadBackingTrack(selectedUrl);
    
    const updated = {
      ...song,
      audio_url: selectedUrl,
    };
    if (onUpdateSong) {
      onUpdateSong(updated);
    }
  };

  const generateCloudBacking = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (stop) stop();
    setIsGeneratingBacking(true);
    setBackingError(null);
    try {
      const { renderWavBuffer, bufferToWav } = await import("../lib/useGospelAudio");
      const buffer = await renderWavBuffer(chords, song.genre || "Contemporary", bpm);
      const wavBlob = bufferToWav(buffer);
      const reader = new FileReader();
      const base64DataUri = await new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(wavBlob);
      });
      const res = await fetch("/api/melody", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input_audio: base64DataUri, genre: song.genre || "Contemporary", bpm }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        if (data.error === "no_replicate_token") {
          throw new Error("REPLICATE_API_TOKEN is missing. Please set it in .env.local.");
        }
        throw new Error(data.message || "Cloud backing track synthesis failed.");
      }
      if (data.backing_url) setBackingTrackUrl(data.backing_url);
    } catch (e) {
      console.error("Cloud Backing Generation Error:", e);
      setBackingError(e.message);
    } finally {
      setIsGeneratingBacking(false);
    }
  };

  const updateStem = (key, field, val) =>
    setStemState((s) => ({ ...s, [key]: { ...s[key], [field]: val } }));

  const handlePlayPause = () => (isPlaying ? pause() : play());
  const handleStop = () => { stop(); };

  const handleLyricLineChange = (index, field, val) => {
    if (isExpired) return;
    const updatedLyrics = [...(song.lyrics || [])];
    updatedLyrics[index] = { ...updatedLyrics[index], [field]: val };
    if (onUpdateSong) onUpdateSong({ ...song, lyrics: updatedLyrics });
  };

  const handleChordsChange = (val) => {
    if (isExpired) return;
    const updatedChords = val.split(/[\s,]+/).map((c) => c.trim()).filter((c) => c.length > 0);
    if (onUpdateSong) onUpdateSong({ ...song, chords: updatedChords });
  };

  const stemColors  = { lead: "#8B5CF6", soprano: "#F59E0B", alto: "#10B981", tenor: "#06B6D4" };
  const stemLabels  = { lead: "Lead Vocals", soprano: "Soprano Harmony", alto: "Alto Harmony", tenor: "Tenor Harmony" };

  // Whether an AI full-mix is active (collapses the SATB mixer to a single channel)
  const isAiMixActive = aiSource === "apiframe_suno" && !!aiAudioUrl;

  const handleShare = async () => {
    const url = `${window.location.origin}/song/${song.id}`;
    const text = `🎵 "${song.title}" — gospel arrangement on Selah`;
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title: song.title, text, url }).catch(() => {});
    } else if (typeof navigator !== "undefined") {
      await navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  };

  const handleTogglePublish = async () => {
    const nextIsPublic = song.is_public === false ? true : !song.is_public;
    const updated = {
      ...song,
      is_public: nextIsPublic,
    };
    if (onUpdateSong) {
      await onUpdateSong(updated);
    }
  };

  return (
    <div className="min-h-screen bg-suno-black text-white flex flex-col p-4 md:p-8">
      <AuthRequiredModal visible={showAuthModal} onClose={() => setShowAuthModal(false)} />
      {/* Header */}
      <header className="max-w-6xl mx-auto w-full flex flex-col md:flex-row md:items-center justify-between border-b border-suno-gray-800 pb-6 mb-8 gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-3 bg-suno-gray-800 rounded-full hover:bg-suno-gray-700 active:scale-95 transition-all text-gray-400 hover:text-white"
            title="Back to Dashboard"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <span className="px-3 py-1 rounded-full bg-suno-accent/15 text-suno-accent border border-suno-accent/30 text-[10px] font-bold uppercase tracking-widest">
              Choir Desk &amp; Rehearsal
            </span>
            <h1 className="font-display text-2xl md:text-3xl text-white font-bold mt-1">{song.title}</h1>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center bg-suno-gray-900 border border-suno-gray-800 p-1.5 rounded-full self-start md:self-auto shadow-inner">
          <button
            onClick={() => setMode("choir")}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
              mode === "choir" ? "bg-suno-accent text-white shadow-md" : "text-gray-400 hover:text-white"
            }`}
          >
            Choir Practice Mode
          </button>
          <button
            onClick={() => setMode("workstation")}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
              mode === "workstation" ? "bg-suno-accent text-white shadow-md" : "text-gray-400 hover:text-white"
            }`}
          >
            Song Part Workstation
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="player-publish-btn"
            onClick={handleTogglePublish}
            className={`p-2.5 rounded-full active:scale-95 transition-all flex items-center justify-center border ${
              song.is_public
                ? "bg-suno-accent/20 border-suno-accent/40 text-suno-accent hover:bg-suno-accent/30"
                : "bg-suno-gray-800 border-suno-gray-700 text-gray-400 hover:text-white hover:border-suno-gray-600"
            }`}
            title={song.is_public ? "Published to Community (click to make private)" : "Private (click to publish to community)"}
          >
            <span className="material-symbols-outlined text-xl">
              {song.is_public ? "public" : "public_off"}
            </span>
          </button>

          <button
            id="player-share-btn"
            onClick={handleShare}
            className="p-2.5 bg-suno-gray-800 hover:bg-suno-gray-700 rounded-full active:scale-95 transition-all text-gray-400 hover:text-white"
            title="Share this song"
          >
            <span className="material-symbols-outlined text-xl">share</span>
          </button>
          <div className="text-right hidden lg:block">
            <p className="text-sm font-bold text-suno-accent">{song.genre}</p>
            <p className="text-xs text-gray-400">Key of {song.musicKey || chords[0]} · {song.lang}</p>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">

        {/* ================================================================ */}
        {/* CHOIR PRACTICE MODE                                              */}
        {/* ================================================================ */}
        {mode === "choir" && (
          <>
            {/* Left Column: Prompter Sheet */}
            <div className="lg:col-span-7 flex flex-col space-y-6">
              <div className="bg-suno-gray-900 border border-suno-gray-800 p-6 rounded-3xl relative overflow-hidden group flex flex-col justify-between min-h-[350px]">
                <div className="absolute -right-24 -top-24 w-64 h-64 bg-suno-accent/5 blur-[100px] rounded-full group-hover:bg-suno-accent/10 transition-all duration-700"></div>

                <div className="flex items-center justify-between border-b border-suno-gray-800 pb-4 z-10">
                  <span className="text-xs text-suno-accent font-bold uppercase tracking-widest">Choir Prompt Sync</span>
                  <div className="flex items-center gap-2 bg-suno-gray-800 px-3 py-1 rounded-full border border-suno-gray-700">
                    <span className={`w-2.5 h-2.5 rounded-full ${isPlaying ? "bg-emerald-500 animate-pulse" : "bg-gray-600"}`}></span>
                    <span className="text-xs text-gray-400 font-bold">{isPlaying ? "Active Playback" : "Idle"}</span>
                  </div>
                </div>

                {/* Lyric Prompter - Spotify Synced Karaoke Vibe */}
                <div 
                  id="karaoke-lyrics-container" 
                  className="flex-1 overflow-y-auto max-h-[180px] my-4 py-2 px-4 space-y-4 scroll-smooth custom-scrollbar relative z-10 bg-suno-gray-950/45 rounded-2xl border border-suno-gray-850/40"
                >
                  {song.lyrics && song.lyrics.length > 0 ? (
                    song.lyrics.map((l, index) => {
                      const isActive = index === activeLyricIdx;
                      return (
                        <div
                          key={index}
                          id={`lyric-line-${index}`}
                          className={`text-center transition-all duration-300 py-1.5 rounded-xl ${
                            isActive 
                              ? "scale-105 opacity-100 font-extrabold bg-suno-accent/10 text-suno-accent px-4 py-2 shadow-sm border border-suno-accent/20" 
                              : "opacity-40 text-gray-400 font-semibold"
                          }`}
                        >
                          <span className="text-[9px] uppercase tracking-wider font-bold bg-suno-gray-800 border border-suno-gray-750 px-2 py-0.5 rounded-full mr-2">
                            {l.part}
                          </span>
                          <span className="text-sm md:text-base font-display">
                            {l.line}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 italic text-sm">Press play below to start rehearsal monitor</p>
                    </div>
                  )}
                </div>

                {/* Arrangement Monitor */}
                {song.lyrics && song.lyrics[activeLyricIdx] && (
                  <div className="z-10 flex items-center justify-center gap-4 bg-suno-gray-950/60 border border-suno-gray-850 px-4 py-2.5 rounded-2xl max-w-md mx-auto w-full backdrop-blur-sm mb-4">
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Dynamics</span>
                      <span className={`text-xs font-mono font-bold uppercase ${
                        song.lyrics[activeLyricIdx].arrangement?.dynamics === "forte" ? "text-rose-400" :
                        song.lyrics[activeLyricIdx].arrangement?.dynamics === "piano" ? "text-cyan-400" : "text-amber-400"
                      }`}>
                        {song.lyrics[activeLyricIdx].arrangement?.dynamics || "mezzo"}
                      </span>
                    </div>
                    <div className="h-6 w-px bg-suno-gray-800"></div>
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Arrangement</span>
                      <span className="text-xs font-mono font-bold text-suno-accent uppercase">
                        {song.lyrics[activeLyricIdx].arrangement?.percussion === "solo" ? "Drum Solo" :
                         song.lyrics[activeLyricIdx].arrangement?.percussion === "mute" ? "Acapella" :
                         song.lyrics[activeLyricIdx].arrangement?.percussion === "light" ? "Light Band" : "Full Band"}
                      </span>
                    </div>
                    <div className="h-6 w-px bg-suno-gray-800"></div>
                    <div className="flex items-center gap-2">
                      {["piano", "percussion", "bass", "guitar"].map((inst) => {
                        const isPercSolo   = song.lyrics[activeLyricIdx].arrangement?.percussion === "solo";
                        const isPercMuted  = song.lyrics[activeLyricIdx].arrangement?.percussion === "mute";
                        const isActive     = inst === "percussion" ? !isPercMuted : !isPercSolo;
                        const icon         = inst === "piano" ? "piano" : inst === "percussion" ? "album" : inst === "bass" ? "music_note" : "tune";
                        return (
                          <span
                            key={inst}
                            className={`material-symbols-outlined text-sm p-1 rounded ${
                              isActive ? "text-suno-accent bg-suno-accent/10 border border-suno-accent/20" : "text-gray-600 bg-suno-gray-800/40 border border-transparent"
                            }`}
                            title={`${inst.toUpperCase()} — ${isActive ? "Active" : "Inactive"}`}
                          >
                            {icon}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Active Chords Guide */}
                <div className="border-t border-suno-gray-800 pt-6 z-10">
                  <p className="text-center text-xs text-gray-500 uppercase tracking-widest mb-4">Active Chords Guide</p>
                  <div className="flex justify-center flex-wrap gap-3">
                    {chords.map((chord, i) => {
                      const isActive = isPlaying && currentChordIdx === i;
                      return (
                        <div
                          key={i}
                          className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 font-mono text-sm ${
                            isActive
                              ? "bg-suno-accent/20 border-suno-accent text-suno-accent shadow-[0_0_20px_rgba(35,212,94,0.25)] scale-110 font-bold"
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

              {/* Playback Controls */}
              <div className="bg-suno-gray-900 border border-suno-gray-800 p-6 rounded-3xl flex flex-col md:flex-row items-center gap-6 justify-between">
                <div className="flex items-center gap-4">
                  <button onClick={handleStop} className="p-4 bg-suno-gray-800 hover:bg-suno-gray-700 rounded-2xl active:scale-95 transition-all text-gray-400 hover:text-white" title="Stop Playback">
                    <span className="material-symbols-outlined">stop</span>
                  </button>
                  <button
                    onClick={handlePlayPause}
                    className={`w-16 h-16 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl ${
                      isPlaying ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-red-500/20" : "bg-suno-accent text-white shadow-suno-accent/20"
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
                <div className="flex-1 max-w-xs w-full flex items-center gap-4">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tempo</span>
                  <input
                    type="range" min={50} max={160} value={bpm}
                    onChange={(e) => setBpm(Number(e.target.value))}
                    className="flex-grow accent-suno-accent h-1 bg-suno-gray-700 rounded-full"
                  />
                  <span className="text-sm font-mono font-bold text-suno-accent w-12 text-right">{bpm}</span>
                </div>
              </div>

              {/* Downloads */}
              <div className="bg-suno-gray-900 border border-suno-gray-800 p-6 rounded-3xl">
                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-suno-accent text-lg">download</span>
                  Downloads
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button id="download-wav-btn" onClick={exportWav} className="flex items-center justify-center gap-2.5 p-4 rounded-2xl bg-suno-gray-800 hover:bg-suno-gray-750 border border-suno-gray-700 text-white text-sm font-bold active:scale-98 transition-all">
                    <span className="material-symbols-outlined text-lg">music_note</span>
                    Full Song (WAV)
                  </button>
                  <button id="download-midi-btn" onClick={exportMidi} className="flex items-center justify-center gap-2.5 p-4 rounded-2xl bg-suno-gray-800 hover:bg-suno-gray-750 border border-suno-gray-700 text-white text-sm font-bold active:scale-98 transition-all">
                    <span className="material-symbols-outlined text-lg">piano</span>
                    MIDI Pack
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Audio Mixer */}
            <div className="lg:col-span-5 flex flex-col space-y-6">
              <div className="bg-suno-gray-900 border border-suno-gray-800 p-6 rounded-3xl">

                {/* AI Full Mix panel — shown when Suno generation is active */}
                {isAiMixActive ? (
                  <>
                    <h3 className="text-lg text-white font-bold mb-1 flex items-center gap-2 font-display">
                      <span className="material-symbols-outlined text-suno-accent">auto_awesome</span>
                      AI Full Mix (Suno)
                    </h3>
                    <p className="text-[10px] text-gray-500 mb-4 uppercase tracking-wider">
                      Full composed song — vocals &amp; instruments blended by AI
                    </p>

                    {/* Honest note about SATB collapse */}
                    <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs leading-relaxed flex gap-2">
                      <span className="material-symbols-outlined text-base shrink-0 mt-0.5">info</span>
                      <span>
                        This is a single AI-composed track, not independent SATB parts. The AI blends
                        vocals and instruments together — individual voice control is not available for cloud-generated songs.
                      </span>
                    </div>

                    {/* Track title */}
                    {aiAudioTitle && (
                      <p className="text-sm font-bold text-white mb-3 truncate">
                        &ldquo;{aiAudioTitle}&rdquo;
                      </p>
                    )}

                    {/* Full Mix StemRow (single channel) */}
                    <StemRow
                      label="Full Mix (Cloud)"
                      color="#23D45E"
                      vol={stemState.lead.vol}
                      setVol={(v) => updateStem("lead", "vol", v)}
                      solo={false}
                      setSolo={() => {}}
                      muted={stemState.lead.muted}
                      setMuted={(v) => updateStem("lead", "muted", v)}
                      url={aiAudioUrl}
                      isPlaying={isPlaying}
                    />

                    {/* Track picker — Suno gives 2 variants for free */}
                    {aiTracks && aiTracks.length > 1 && (
                      <div className="mt-4">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                          Suno generated 2 versions — pick your favourite:
                        </p>
                        <div className="flex gap-2">
                          {aiTracks.map((track, idx) => (
                            <button
                              key={idx}
                              id={`track-picker-${idx}`}
                              onClick={() => handleSelectTrack(idx)}
                              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                                selectedTrackIdx === idx
                                  ? "bg-suno-accent/15 border-suno-accent/30 text-suno-accent"
                                  : "bg-suno-gray-800 border-suno-gray-700 text-gray-400 hover:text-white hover:border-suno-gray-600"
                              }`}
                            >
                              Version {idx + 1}
                              {track.duration_sec && (
                                <span className="ml-1 text-[9px] opacity-60">
                                  {Math.round(track.duration_sec)}s
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="w-full mt-5 py-4 rounded-2xl font-bold text-sm bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-base">check_circle</span>
                      AI Song Ready — Press Play
                    </div>

                    {/* Re-generate button */}
                    <button
                      id="regenerate-ai-song-btn"
                      onClick={generateCloudStems}
                      disabled={isGeneratingStems || isSynthesizingLocal}
                      className="w-full mt-3 py-3 rounded-2xl font-bold text-xs border flex items-center justify-center gap-2 active:scale-95 transition-all bg-suno-gray-800 border-suno-gray-700 text-gray-400 hover:text-white hover:border-suno-gray-600"
                    >
                      <span className="material-symbols-outlined text-sm">refresh</span>
                      Generate New Version (uses 1 credit)
                    </button>
                  </>
                ) : (
                  <>
                    {/* Local SATB synth mixer — shown when no AI mix is active */}
                    <h3 className="text-lg text-white font-bold mb-4 flex items-center gap-2 font-display">
                      <span className="material-symbols-outlined text-suno-accent">equalizer</span>
                      Choir SAT Harmonies
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

                    {stemsLoaded ? (
                      <div className="w-full mt-6 py-4 rounded-2xl font-bold text-sm bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-base">check_circle</span>
                        Local Harmonies Loaded &amp; Ready
                      </div>
                    ) : stemsLoading ? (
                      <div className="w-full mt-6 py-4 rounded-2xl font-bold text-sm bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center gap-2">
                        <span className="animate-spin material-symbols-outlined text-base">progress_activity</span>
                        Loading Stems into Audio Engine...
                      </div>
                    ) : (
                      <div className="mt-6 space-y-3">
                        {/* Polling Stage Overlay */}
                        {isGeneratingStems && (
                          <div className="p-4 rounded-2xl bg-suno-accent/10 border border-suno-accent/25 text-suno-accent flex flex-col gap-1.5 animate-pulse">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wider">AI Generation Status</span>
                              <span className="text-xs font-mono font-bold bg-suno-accent/20 px-2 py-0.5 rounded-md">{elapsedTime}s</span>
                            </div>
                            <p className="text-xs text-white/95 leading-relaxed font-semibold">{generationStage}</p>
                          </div>
                        )}

                        {/* AI generation — primary option */}
                        <button
                          id="generate-ai-song-btn"
                          onClick={generateCloudStems}
                          disabled={isGeneratingStems || isSynthesizingLocal}
                          className={`w-full py-3.5 rounded-2xl font-bold text-xs border flex items-center justify-center gap-2 active:scale-95 transition-all ${
                            isGeneratingStems
                              ? "bg-suno-gray-800 border-suno-gray-700 text-gray-500 cursor-wait"
                              : isSynthesizingLocal
                              ? "bg-suno-gray-850 border-suno-gray-800 text-gray-600 cursor-not-allowed"
                              : "bg-suno-accent/10 border-suno-accent/20 text-suno-accent hover:bg-suno-accent/20 hover:border-suno-accent"
                          }`}
                        >
                          {isGeneratingStems ? (
                            <>
                              <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                              Generating AI Song ({elapsedTime}s)...
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-sm">auto_awesome</span>
                              Generate AI Song (Suno via apiframe)
                            </>
                          )}
                        </button>

                        {/* Local synth — instant fallback */}
                        <button
                          id="generate-local-stems-btn"
                          onClick={generateLocalStems}
                          disabled={isGeneratingStems || isSynthesizingLocal}
                          className={`w-full py-3.5 rounded-2xl font-bold text-xs border flex items-center justify-center gap-2 active:scale-95 transition-all ${
                            isSynthesizingLocal
                              ? "bg-suno-gray-800 border-suno-gray-700 text-gray-500 cursor-wait"
                              : isGeneratingStems
                              ? "bg-suno-gray-850 border-suno-gray-800 text-gray-600 cursor-not-allowed"
                              : "bg-suno-gray-800 border-suno-gray-700 text-gray-300 hover:bg-suno-gray-750 hover:text-white"
                          }`}
                        >
                          {isSynthesizingLocal ? (
                            <>
                              <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                              Synthesizing...
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-sm">piano</span>
                              Instant Local Synth (No Credits)
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Error feedback */}
                {stemsError && (
                  <div className={`mt-3 p-4 rounded-2xl border text-sm flex items-start gap-3 ${
                    stemsError.type === "setup"
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      : "bg-red-500/10 border-red-500/20 text-red-400"
                  }`}>
                    <span className="material-symbols-outlined text-lg mt-0.5 shrink-0">
                      {stemsError.type === "setup" ? "info" : stemsError.type === "retry" ? "update" : "error"}
                    </span>
                    <div>
                      <p className="font-bold text-xs uppercase tracking-wider mb-1">
                        {stemsError.type === "setup" ? "Fallback Active" : stemsError.type === "retry" ? "Retrying" : "Error"}
                      </p>
                      <p className="text-xs leading-relaxed">{stemsError.message}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ================================================================ */}
        {/* SONG PART WORKSTATION EDITOR                                     */}
        {/* ================================================================ */}
        {mode === "workstation" && (
          <div className="lg:col-span-12 flex flex-col md:flex-row gap-8 w-full relative">

            {isExpired && (
              <div className="absolute inset-0 bg-suno-black/80 backdrop-blur-md rounded-3xl z-30 flex flex-col items-center justify-center p-6 border border-suno-gray-800 text-center">
                <span className="material-symbols-outlined text-red-500 text-5xl mb-4">lock</span>
                <h3 className="text-xl font-bold text-white font-display">Workstation Session Locked</h3>
                <p className="text-sm text-gray-400 max-w-md mt-2">
                  This song was generated more than 48 hours ago. Dynamic mixing, part editing, and structure modifications are restricted to premium subscribers.
                </p>
                <button onClick={onClose} className="mt-6 px-6 py-2.5 rounded-full bg-suno-accent hover:bg-suno-accent/90 text-white font-bold text-xs shadow-lg active:scale-95 transition-transform">
                  Return to Dashboard
                </button>
              </div>
            )}

            {/* Left: Instrumental Mixer */}
            <div className="w-full md:w-1/3 space-y-6">
              <div className="bg-suno-gray-900 border border-suno-gray-800 p-6 rounded-3xl">
                <h3 className="text-base text-white font-bold mb-5 flex items-center gap-2 font-display">
                  <span className="material-symbols-outlined text-suno-accent">tune</span>
                  Instrument Mixer
                </h3>
                <div className="space-y-6">
                  {Object.keys(volumes).map((inst) => (
                    <div key={inst} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white capitalize">{inst}</span>
                        <span className="text-[10px] font-mono text-suno-accent font-bold">
                          {Math.round(volumes[inst] * 100)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-gray-500 text-lg">
                          {inst === "piano" ? "piano" : inst === "percussion" ? "album" : inst === "bass" ? "music_note" : "tune"}
                        </span>
                        <input
                          type="range" min={0} max={100}
                          value={Math.round(volumes[inst] * 100)}
                          onChange={(e) => setVolume(inst, Number(e.target.value) / 100)}
                          className="flex-grow accent-suno-accent h-1 bg-suno-gray-800 rounded-full"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 border-t border-suno-gray-800 pt-6">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-suno-accent text-sm">cloud</span>
                    Cloud AI Backing Track (Replicate)
                  </h4>
                  {backingTrackLoaded ? (
                    <div className="w-full py-3 rounded-2xl font-bold text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-base">check_circle</span>
                      Cloud AI Backing Track Active
                    </div>
                  ) : backingTrackLoading ? (
                    <div className="w-full py-3 rounded-2xl font-bold text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center gap-2">
                      <span className="animate-spin material-symbols-outlined text-base">progress_activity</span>
                      Loading Cloud Backing Track...
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={generateCloudBacking}
                        disabled={isGeneratingBacking}
                        className={`w-full py-3 rounded-xl font-bold text-xs border flex items-center justify-center gap-2 active:scale-95 transition-all ${
                          isGeneratingBacking
                            ? "bg-suno-gray-800 border-suno-gray-700 text-gray-500 cursor-wait"
                            : "bg-suno-accent/10 border-suno-accent/20 text-suno-accent hover:bg-suno-accent/20 hover:border-suno-accent"
                        }`}
                      >
                        {isGeneratingBacking ? (
                          <>
                            <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                            Generating Cloud Backing Track...
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-sm">music_note</span>
                            Upgrade to Cloud AI Backing (Replicate)
                          </>
                        )}
                      </button>
                      {backingError && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs leading-normal">
                          {backingError}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-8 border-t border-suno-gray-800 pt-6">
                  <div className="flex items-center justify-between gap-4">
                    <button onClick={handleStop} className="p-3.5 bg-suno-gray-800 hover:bg-suno-gray-750 rounded-xl text-gray-400 hover:text-white transition-all active:scale-95" title="Stop Playback">
                      <span className="material-symbols-outlined text-base">stop</span>
                    </button>
                    <button onClick={handlePlayPause} className="flex-grow py-3 rounded-xl bg-suno-accent hover:bg-suno-accent/90 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 shadow-md transition-transform">
                      <span className="material-symbols-outlined text-sm">{isPlaying ? "pause" : "play_arrow"}</span>
                      {isPlaying ? "Pause Rehearsal" : "Play Backing Track"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Structure Editor */}
            <div className="flex-1 space-y-6">
              <div className="bg-suno-gray-900 border border-suno-gray-800 p-6 rounded-3xl">
                <h3 className="text-base text-white font-bold mb-4 flex items-center gap-2 font-display">
                  <span className="material-symbols-outlined text-suno-accent">edit_note</span>
                  Song Structure Editor
                </h3>

                <div className="space-y-2 mb-6">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                    Global Chords Loop (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={chords.join(", ")}
                    onChange={(e) => handleChordsChange(e.target.value)}
                    className="w-full bg-suno-gray-850 border border-suno-gray-700 focus:border-suno-accent rounded-xl px-4 py-3 text-sm font-mono text-suno-accent focus:outline-none transition-colors"
                    placeholder="e.g. C, F, G, Am"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                    Song Parts &amp; Lyrics
                  </label>
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                    {song.lyrics && song.lyrics.map((l, index) => (
                      <div key={index} className="flex gap-3 p-3 bg-suno-gray-850 border border-suno-gray-800 rounded-2xl items-start">
                        <input
                          type="text" value={l.part}
                          onChange={(e) => handleLyricLineChange(index, "part", e.target.value)}
                          className="w-20 bg-suno-gray-900 border border-suno-gray-750 focus:border-suno-accent rounded-lg px-2.5 py-1.5 text-center text-xs font-bold text-suno-accent focus:outline-none transition-colors"
                          placeholder="Part"
                        />
                        <input
                          type="text" value={l.line}
                          onChange={(e) => handleLyricLineChange(index, "line", e.target.value)}
                          className="flex-1 bg-suno-gray-900 border border-suno-gray-750 focus:border-suno-accent rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none transition-colors"
                          placeholder="Lyrics Line"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
