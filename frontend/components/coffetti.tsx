import { useMemo } from "react";

const COLORS = [
  "hsl(43,96%,54%)", // gold
  "hsl(142,71%,45%)", // green
  "hsl(213,94%,55%)", // blue
  "hsl(0,84%,60%)", // red
  "hsl(270,80%,65%)", // purple
  "hsl(48,100%,68%)", // yellow
  "#FF6EC7", // pink
];

interface Piece {
  id: number;
  left: string;
  delay: string;
  duration: string;
  size: string;
  color: string;
  shape: "rect" | "circle" | "tri";
}

export const Confetti = () => {
  const pieces: Piece[] = useMemo(() => {
    return Array.from({ length: 150 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${(Math.random() * 4).toFixed(2)}s`,
      duration: `${(3 + Math.random() * 4).toFixed(2)}s`,
      size: `${6 + Math.random() * 8}px`,
      color: COLORS[i % COLORS.length],
      shape: (["rect", "circle", "tri"] as const)[i % 3],
    }));
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
            width: p.size,
            height: p.size,
            backgroundColor: p.shape !== "circle" ? p.color : undefined,
            background: p.shape === "circle" ? p.color : undefined,
            borderRadius:
              p.shape === "circle" ? "50%" : p.shape === "tri" ? "0" : "2px",
            clipPath:
              p.shape === "tri"
                ? "polygon(50% 0%, 0% 100%, 100% 100%)"
                : undefined,
          }}
        />
      ))}
    </div>
  );
};
