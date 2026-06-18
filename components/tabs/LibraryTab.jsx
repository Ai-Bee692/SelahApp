import { C } from "../../data/constants";

export const LibraryTab = ({ songs, onPlay }) => {
  return (
    <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
      <div style={{ color: C.text, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>
        Your Library
      </div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>
        {songs.length} songs · All scripture-verified
      </div>
      {songs.map((s) => (
        <div
          key={s.id}
          onClick={() => onPlay(s)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "12px 0",
            borderBottom: `1px solid ${C.border}`,
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${C.greenDim}, ${C.green}88)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            🎵
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{s.title}</div>
            <div style={{ color: C.muted, fontSize: 12 }}>
              {s.lang} · 📖 {s.scripture}
            </div>
          </div>
          <div style={{ color: C.muted, fontSize: 11 }}>{s.genre}</div>
        </div>
      ))}
    </div>
  );
};
