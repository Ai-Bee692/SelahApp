import { C } from "../data/constants";

export const GenreCard = ({ icon, label, selected, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background: selected
        ? `linear-gradient(135deg, ${C.greenDim}, ${C.green}22)`
        : C.card,
      border: `1.5px solid ${selected ? C.green : C.border}`,
      borderRadius: 12,
      padding: "18px 12px",
      cursor: "pointer",
      textAlign: "center",
      transition: "all .2s",
      userSelect: "none",
    }}
  >
    <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
    <div
      style={{
        color: selected ? C.green : C.text,
        fontWeight: 600,
        fontSize: 13,
      }}
    >
      {label}
    </div>
  </div>
);
