import { useState, useEffect } from "react";
import { C } from "../data/constants";

export const GeneratingModal = ({ visible }) => {
  const [dots, setDots] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const t = setInterval(() => setDots((d) => (d + 1) % 4), 400);
    return () => clearInterval(t);
  }, [visible]);
  if (!visible) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(13,17,23,.92)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        gap: 20,
      }}
    >
      <div style={{ fontSize: 48 }}>🎵</div>
      <div style={{ color: C.green, fontWeight: 800, fontSize: 22 }}>
        Arranging your harmonies{".".repeat(dots)}
      </div>
      <div style={{ color: C.muted, fontSize: 14 }}>
        Scripture verified · SAT stems generating
      </div>
      <div
        style={{
          width: 220,
          height: 4,
          background: C.border,
          borderRadius: 2,
          overflow: "hidden",
          marginTop: 8,
        }}
      >
        <div
          style={{
            height: "100%",
            background: C.green,
            animation: "loadbar 2s ease-in-out infinite",
            borderRadius: 2,
          }}
        />
      </div>
      <style>{`@keyframes loadbar{0%{width:0%}60%{width:85%}100%{width:100%}}`}</style>
    </div>
  );
};
