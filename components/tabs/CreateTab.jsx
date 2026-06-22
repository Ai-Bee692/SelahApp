import { useState } from "react";
import { THEMES, LANGS, GENRES, KEYS, EMOTIONAL_MODES, INSTRUMENTATION_MODIFIERS, VOCAL_LEADS } from "../../data/constants";

export const CreateTab = ({ onGenerate }) => {
  const [theme, setTheme] = useState("Thanksgiving");
  const [musicKey, setMusicKey] = useState("G");
  const [langs, setLangs] = useState(["English"]);
  const [genre, setGenre] = useState("Afrobeats");
  const [harmony, setHarmony] = useState("sat");
  const [scripture, setScripture] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rawSongText, setRawSongText] = useState("");
  const [emotionalMode, setEmotionalMode] = useState("joy_celebration");
  const [instrumentation, setInstrumentation] = useState("full_band");
  const [vocalGender, setVocalGender] = useState("f");

  const toggleLang = (l) =>
    setLangs((prev) =>
      prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]
    );

  const handleGenerate = () => {
    onGenerate({
      theme,
      musicKey,
      langs,
      genre,
      harmony,
      scripture,
      rawSongText,
      emotional_mode: emotionalMode,
      instrumentation: instrumentation,
      vocal_gender: vocalGender,
    });
  };

  return (
    <div className="space-y-8 w-full">
      {/* Title */}
      <div>
        <h2 className="font-headline-lg text-2xl md:text-3xl text-white font-bold leading-tight">
          Create Studio
        </h2>
        <p className="text-sm text-on-surface-variant mt-1.5">
          Shape the sound from soul to structure. AI writes the song — you direct the vision.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 w-full">
        {/* Left Side: Parameters Form */}
        <div className="md:col-span-8 space-y-6">
          <div className="bg-suno-gray-900 border border-suno-gray-800 p-6 md:p-8 rounded-3xl space-y-6">

            {/* Theme */}
            <div className="space-y-3 relative z-10">
              <label className="text-[10px] font-bold text-gray-300 uppercase tracking-widest block">
                Theme / Doctrine Focus
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {THEMES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`px-4 py-2 rounded-full text-xs font-bold border transition-all active:scale-95 ${
                      theme === t
                        ? "bg-suno-accent/15 border-suno-accent/30 text-suno-accent"
                        : "bg-suno-gray-800 text-gray-400 border-suno-gray-700 hover:border-suno-gray-600 hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Emotional Mode */}
            <div className="space-y-3 pt-4 border-t border-suno-gray-800/40">
              <label className="text-[10px] font-bold text-gray-300 uppercase tracking-widest block">
                Emotional Mode
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {EMOTIONAL_MODES.map((e) => (
                  <button
                    key={e.val}
                    id={`mode-${e.val}`}
                    onClick={() => setEmotionalMode(e.val)}
                    title={e.description}
                    className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all active:scale-95 ${
                      emotionalMode === e.val
                        ? "bg-suno-accent/15 border-suno-accent/30 text-suno-accent"
                        : "bg-suno-gray-800 border-suno-gray-700 text-gray-400 hover:border-suno-gray-600"
                    }`}
                  >
                    <span className="text-xl select-none">{e.icon}</span>
                    <span className="text-xs font-bold leading-tight">{e.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                {EMOTIONAL_MODES.find((e) => e.val === emotionalMode)?.description}
              </p>
            </div>

            {/* Vocal Lead */}
            <div className="space-y-3 pt-4 border-t border-suno-gray-800/40">
              <label className="text-[10px] font-bold text-gray-300 uppercase tracking-widest block">
                Vocal Lead
              </label>
              <div className="flex gap-2 flex-wrap">
                {VOCAL_LEADS.map((v) => (
                  <button
                    key={v.val}
                    id={`vocal-${v.val}`}
                    onClick={() => setVocalGender(v.val)}
                    className={`px-4 py-2 rounded-full text-xs font-bold border flex items-center gap-2 transition-all active:scale-95 ${
                      vocalGender === v.val
                        ? "bg-suno-accent/15 border-suno-accent/30 text-suno-accent"
                        : "bg-suno-gray-800 text-gray-400 border-suno-gray-700 hover:border-suno-gray-600 hover:text-white"
                    }`}
                  >
                    <span className="select-none">{v.icon}</span>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Instrumentation */}
            <div className="space-y-3 pt-4 border-t border-suno-gray-800/40">
              <label className="text-[10px] font-bold text-gray-300 uppercase tracking-widest block">
                Instrumentation Setup
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {INSTRUMENTATION_MODIFIERS.map((c) => (
                  <button
                    key={c.val}
                    id={`inst-${c.val}`}
                    onClick={() => setInstrumentation(c.val)}
                    className={`p-4 rounded-2xl border text-left transition-all active:scale-95 ${
                      instrumentation === c.val
                        ? "bg-suno-accent/15 border-suno-accent/30 text-suno-accent"
                        : "bg-suno-gray-800 border-suno-gray-700 text-gray-400 hover:border-suno-gray-600"
                    }`}
                  >
                    <p className={`text-xs font-bold flex items-center gap-2 ${instrumentation === c.val ? "text-white" : "text-gray-300"}`}>
                      <span className="text-sm select-none">{c.icon}</span>
                      {c.label}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{c.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div className="space-y-3 pt-4 border-t border-suno-gray-800/40">
              <label className="text-[10px] font-bold text-gray-300 uppercase tracking-widest block">
                Languages (Code-Switching)
              </label>
              <div className="flex flex-wrap gap-2">
                {LANGS.map((l) => {
                  const isSelected = langs.includes(l);
                  return (
                    <button
                      key={l}
                      id={`lang-${l}`}
                      onClick={() => toggleLang(l)}
                      className={`px-4 py-2 rounded-full text-xs font-bold border transition-all active:scale-95 ${
                        isSelected
                          ? "bg-suno-accent/15 border-suno-accent/30 text-suno-accent"
                          : "bg-suno-gray-800 text-gray-400 border-suno-gray-700 hover:border-suno-gray-600 hover:text-white"
                      }`}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Import Existing Song */}
            <div className="space-y-3 pt-4 border-t border-suno-gray-800/40">
              <label className="text-[10px] font-bold text-gray-300 uppercase tracking-widest block">
                Or Import Existing Song (Optional — Paste Chords &amp; Lyrics)
              </label>
              <textarea
                value={rawSongText}
                onChange={(e) => setRawSongText(e.target.value)}
                maxLength={4000}
                placeholder={`Paste your song text here... e.g.\nVerse 1\n[C] Lord, you are [F] good and [G] your mercy is [Am] forever...`}
                rows={4}
                className="w-full bg-suno-gray-850 border border-suno-gray-750 focus:border-suno-accent focus:ring-1 focus:ring-suno-accent rounded-2xl p-4 text-xs md:text-sm text-white placeholder:text-gray-500 outline-none transition-all resize-none"
              />
            </div>

            {/* Advanced Settings Toggle */}
            <div className="pt-2 border-t border-suno-gray-800/40">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors py-2 px-1 focus:outline-none"
                type="button"
              >
                <span
                  className="material-symbols-outlined text-lg transition-transform duration-200"
                  style={{ transform: showAdvanced ? "rotate(90deg)" : "none" }}
                >
                  chevron_right
                </span>
                <span>{showAdvanced ? "Hide Advanced Settings" : "Show Advanced Settings"}</span>
              </button>
            </div>

            {/* Collapsible Advanced */}
            {showAdvanced && (
              <div className="space-y-6 pt-4 border-t border-suno-gray-800/60">
                {/* Musical Key */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-300 uppercase tracking-widest block">
                    Target Musical Key
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {KEYS.map((k) => (
                      <button
                        key={k}
                        id={`key-${k}`}
                        onClick={() => setMusicKey(k)}
                        className={`w-9 h-9 rounded-xl text-xs font-bold border transition-all active:scale-95 flex items-center justify-center ${
                          musicKey === k
                            ? "bg-suno-accent/15 border-suno-accent/30 text-suno-accent"
                            : "bg-suno-gray-800 text-gray-400 border-suno-gray-700 hover:border-suno-gray-600 hover:text-white"
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scriptural Anchor */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-300 uppercase tracking-widest block">
                    Scriptural Anchor (Optional)
                  </label>
                  <input
                    value={scripture}
                    onChange={(e) => setScripture(e.target.value)}
                    maxLength={500}
                    placeholder="e.g. Psalm 100:4, Romans 8:31"
                    className="w-full bg-suno-gray-800 border border-suno-gray-700 focus:border-suno-accent focus:ring-1 focus:ring-suno-accent rounded-2xl p-4 text-sm text-white placeholder:text-gray-500 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {/* Create Button */}
            <div className="flex justify-end pt-4">
              <button
                id="generate-song-btn"
                onClick={handleGenerate}
                className="flex items-center gap-2 bg-suno-accent hover:bg-suno-accent/90 text-white px-5 py-3 rounded-full font-bold text-xs md:text-sm shadow-md active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-base">auto_awesome</span>
                <span>Generate New Song</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Genre Selection */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-suno-gray-900 border border-suno-gray-800 p-6 rounded-3xl space-y-4">
            <h3 className="text-base text-white font-bold mb-4 flex items-center gap-2 font-display">
              <span className="material-symbols-outlined text-suno-accent">audiotrack</span>
              Genre Vibe Presets
            </h3>

            <div className="grid grid-cols-1 gap-2">
              {GENRES.map((g) => {
                const isSelected = genre === g.label;
                return (
                  <button
                    key={g.label}
                    id={`genre-${g.label.replace(/[\s&]+/g, "-").toLowerCase()}`}
                    onClick={() => setGenre(g.label)}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all duration-300 active:scale-95 w-full ${
                      isSelected
                        ? "bg-suno-accent/15 border-suno-accent/30 text-suno-accent"
                        : "bg-suno-gray-800 border-suno-gray-700 text-gray-400 hover:border-suno-gray-600 hover:text-white"
                    }`}
                  >
                    <span className="text-xl select-none flex-shrink-0">{g.icon}</span>
                    <div className="flex-grow min-w-0">
                      <p className={`text-xs font-bold truncate ${isSelected ? "text-white" : "text-gray-300"}`}>
                        {g.label}
                      </p>
                      <p className="text-[9px] text-gray-500 leading-relaxed mt-0.5 line-clamp-2">
                        {g.description}
                      </p>
                    </div>
                    <span
                      className={`material-symbols-outlined text-base flex-shrink-0 ${isSelected ? "text-suno-accent" : "text-gray-600"}`}
                    >
                      {isSelected ? "radio_button_checked" : "radio_button_unchecked"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
