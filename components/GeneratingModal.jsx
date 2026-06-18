import { useState, useEffect } from "react";

export const GeneratingModal = ({ visible }) => {
  const [dots, setDots] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const t = setInterval(() => setDots((d) => (d + 1) % 4), 400);
    return () => clearInterval(t);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-md flex flex-col items-center justify-center z-[150] gap-5">
      <div className="text-5xl animate-bounce">🥁</div>
      <div className="text-white font-headline-md text-xl md:text-2xl font-bold mt-2">
        Arranging your harmonies{".".repeat(dots)}
      </div>
      <p className="text-xs text-on-surface-variant max-w-xs text-center leading-relaxed">
        Biblically grounded lyrics & multipart SAT harmonies generating using Llama-3.3
      </p>
      
      <div className="w-56 h-1 bg-white/10 rounded-full overflow-hidden mt-4 relative">
        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-secondary w-2/3 rounded-full animate-[pulse_1.5s_infinite]"></div>
      </div>
    </div>
  );
};
