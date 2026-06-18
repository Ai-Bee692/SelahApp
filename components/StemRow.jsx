import { C } from "../data/constants";

export const StemRow = ({ label, color, vol, setVol, solo, setSolo, muted, setMuted }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 14px",
      background: C.card,
      borderRadius: 10,
      border: `1px solid ${C.border}`,
    }}
  >
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: 13,
        color: "#000",
        flexShrink: 0,
      }}
    >
      {label[0]}
    </div>
    <div style={{ flex: 1, fontSize: 13, color: C.text, fontWeight: 600 }}>
      {label}
    </div>
    <input
      type="range"
      min={0}
      max={100}
      value={vol}
      onChange={(e) => setVol(+e.target.value)}
      style={{ width: 80, accentColor: C.green }}
    />
    <button
      onClick={() => setSolo(!solo)}
      style={{
        padding: "4px 10px",
        borderRadius: 6,
        border: `1px solid ${solo ? C.green : C.border}`,
        background: solo ? C.green : "transparent",
        color: solo ? "#000" : C.muted,
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      SOLO
    </button>
    <button
      onClick={() => setMuted(!muted)}
      style={{
        padding: "4px 10px",
        borderRadius: 6,
        border: `1px solid ${muted ? "#E53E3E" : C.border}`,
        background: muted ? "#E53E3E" : "transparent",
        color: muted ? "#fff" : C.muted,
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      MUTE
    </button>
  </div>
);
