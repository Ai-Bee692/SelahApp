import { useState } from "react";
import { THEMES, LANGS, GENRES, KEYS } from "../../data/constants";

export const CreateTab = ({ onGenerate }) => {
  const [theme, setTheme] = useState("Thanksgiving");
  const [musicKey, setMusicKey] = useState("G");
  const [langs, setLangs] = useState(["English"]);
  const [genre, setGenre] = useState("Afrobeats");
  const [harmony, setHarmony] = useState("sat");
  const [scripture, setScripture] = useState("");
  const [isAutoEnhance, setIsAutoEnhance] = useState(true);

  const toggleLang = (l) =>
    setLangs((prev) =>
      prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]
    );

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Title */}
      <div>
        <h2 className="font-headline-lg text-2xl md:text-3xl text-white font-bold leading-tight">
          Create Studio
        </h2>
        <p className="text-sm text-on-surface-variant mt-1.5">
          Describe the theme, language, and genre vibe. Our AI will handle the songwriting.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Side: Parameters Form */}
        <div className="md:col-span-8 space-y-6">
          <div className="bg-suno-gray-900 border border-suno-gray-800 p-6 md:p-8 rounded-3xl relative overflow-hidden group space-y-6">
            {/* Prompt input styled section */}
            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-suno-accent uppercase tracking-widest">
                  Theme / Doctrine Focus
                </label>
                <div className="flex items-center gap-1.5 bg-suno-gray-800 px-3 py-1 rounded-full border border-suno-gray-700">
                  <span className="w-2 h-2 rounded-full bg-suno-accent animate-pulse"></span>
                  <span className="text-[10px] font-bold text-suno-accent uppercase tracking-wider">
                    Selah v2.4 Engine
                  </span>
                </div>
              </div>

              {/* Theme selection chips */}
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

            {/* Language Selection */}
            <div className="space-y-3 relative z-10">
              <label className="text-[10px] font-bold text-suno-accent uppercase tracking-widest block">
                Languages (Code-Switching)
              </label>
              <div className="flex flex-wrap gap-2">
                {LANGS.map((l) => {
                  const isSelected = langs.includes(l);
                  return (
                    <button
                      key={l}
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

            {/* Key Selection */}
            <div className="space-y-3 relative z-10">
              <label className="text-[10px] font-bold text-suno-accent uppercase tracking-widest block">
                Target Musical Key
              </label>
              <div className="flex flex-wrap gap-1.5">
                {KEYS.map((k) => (
                  <button
                    key={k}
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

            {/* Harmony Structure Options */}
            <div className="space-y-3 relative z-10">
              <label className="text-[10px] font-bold text-suno-accent uppercase tracking-widest block">
                Harmony Arrangement
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { val: "solo", label: "Solo Worship Leader" },
                  { val: "sat", label: "Multipart Choir (S.A.T.)" },
                ].map((o) => (
                  <button
                    key={o.val}
                    onClick={() => setHarmony(o.val)}
                    className={`p-4 rounded-2xl border text-xs font-bold text-left transition-all active:scale-95 ${
                      harmony === o.val
                        ? "bg-suno-accent/15 border-suno-accent/30 text-suno-accent"
                        : "bg-suno-gray-800 border-suno-gray-700 text-gray-400 hover:border-suno-gray-600"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scriptural Anchor */}
            <div className="space-y-3 relative z-10">
              <label className="text-[10px] font-bold text-suno-accent uppercase tracking-widest block">
                Scriptural Anchor (Optional)
              </label>
              <input
                value={scripture}
                onChange={(e) => setScripture(e.target.value)}
                placeholder="e.g. Psalm 100:4, Romans 8:31"
                className="w-full bg-suno-gray-800 border border-suno-gray-700 focus:border-suno-accent focus:ring-1 focus:ring-suno-accent rounded-2xl p-4 text-sm text-white placeholder:text-gray-500 outline-none transition-all"
              />
              <p className="text-[10px] text-gray-500 italic">
                Our songwriter model will align the lyrics to the theme and values of this scripture.
              </p>
            </div>

            {/* Create Button */}
            <button
              onClick={() => onGenerate({ theme, musicKey, langs, genre, harmony, scripture })}
              className="w-full bg-suno-accent text-white py-4 rounded-xl font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg shadow-suno-accent/20 flex items-center justify-center gap-2 mt-8"
            >
              <span className="material-symbols-outlined text-xl">bolt</span>
              Generate Gospel Masterpiece
            </button>
          </div>
        </div>

        {/* Right Side: Genre Selection */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-suno-gray-900 border border-suno-gray-800 p-6 rounded-3xl space-y-4">
            <h3 className="text-base text-white font-bold mb-4 flex items-center gap-2 font-display">
              <span className="material-symbols-outlined text-suno-accent">audiotrack</span>
              Genre Vibe Presets
            </h3>
            
            <div className="grid grid-cols-1 gap-2.5">
              {GENRES.map((g) => {
                const isSelected = genre === g.label;
                return (
                  <button
                    key={g.label}
                    onClick={() => setGenre(g.label)}
                    className={`p-4 rounded-2xl border text-left flex items-center gap-4 transition-all duration-300 active:scale-95 w-full ${
                      isSelected
                        ? "bg-suno-accent/15 border-suno-accent/30 text-suno-accent"
                        : "bg-suno-gray-800 border-suno-gray-700 text-gray-400 hover:border-suno-gray-600 hover:text-white"
                    }`}
                  >
                    <span className="text-2xl select-none">{g.icon}</span>
                    <div>
                      <p className="text-xs font-bold text-white">{g.label}</p>
                      <p className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">
                        Select Beat & Rhythm
                      </p>
                    </div>
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
