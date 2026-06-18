import { C } from "../data/constants";

export const Label = ({ children }) => (
  <div style={{ color: C.green, fontWeight: 700, fontSize: 12, letterSpacing: 1 }}>
    {children}
  </div>
);
