import { C, GENRES } from "../../data/constants";

export const HomeTab = ({ songs, onPlay }) => {
  return (
    <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
      <div style={{ color: C.text, fontWeight: 800, fontSize: 22, marginBottom: 4 }}>
        Good morning, Director 👋
      </div>
      <div style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>
        What's the choir working on this Sunday?
      </div>

      <div style={{ color: C.green, fontWeight: 700, fontSize: 12, letterSpacing: 1, marginBottom: 10 }}>
        RECENT GENERATIONS
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        {songs.map((s) => (
          <div
            key={s.id}
            onClick={() => onPlay(s)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: "12px 14px",
              cursor: "pointer",
              transition: "border-color .15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.green)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 10,
                background: `linear-gradient(135deg, ${C.greenDim}, ${C.green})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              🎵
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{s.title}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>
                {s.genre} · {s.lang} · {s.theme}
              </div>
            </div>
            <div style={{ color: C.green, fontSize: 20 }}>›</div>
          </div>
        ))}
      </div>

      <div style={{ color: C.green, fontWeight: 700, fontSize: 12, letterSpacing: 1, marginBottom: 10 }}>
        BROWSE BY GENRE
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {GENRES.map((g) => (
          <div
            key={g.label}
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: "14px 8px",
              textAlign: "center",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 22 }}>{g.icon}</div>
            <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{g.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
