import { C } from "../data/constants";

export const Pill = ({ label, selected, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: "6px 14px",
      borderRadius: 999,
      border: `1px solid ${selected ? C.green : C.border}`,
      background: selected ? C.green : "transparent",
      color: selected ? "#000" : C.muted,
      fontSize: 13,
      fontWeight: selected ? 700 : 400,
      cursor: "pointer",
      transition: "all .15s",
      fontFamily: "inherit",
    }}
  >
    {label}
  </button>
);
