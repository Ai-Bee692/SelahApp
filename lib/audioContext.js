import { createContext, useContext, useState } from "react";

/**
 * Global audio state context.
 * Holds the active song and any app-level playback state so the
 * bottom mini-player bar never re-mounts when navigating between pages.
 */
const AudioContext = createContext(null);

export function AudioProvider({ children }) {
  const [activeSong, setActiveSong] = useState(null);

  return (
    <AudioContext.Provider value={{ activeSong, setActiveSong }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudioContext() {
  const ctx = useContext(AudioContext);
  assert(ctx !== null, "useAudioContext must be used inside <AudioProvider>");
  return ctx;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
