"use client";

import { Play, Share2 } from "lucide-react";
import { Suspense, useMemo, useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ResultBoard } from "@/components/result-board";
import { prepareGameResult } from "@/lib/game-result";

/* =========================
   Animated Prize Counter
========================= */
const AnimatedCounter = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frameId = 0;
    const startedAt = performance.now();
    const durationMs = 1200;

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / durationMs, 1);
      setDisplay(Math.round(value * progress));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    setDisplay(0);
    frameId = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frameId);
  }, [value]);

  return (
    <h2 className="text-3xl font-extrabold bg-linear-to-r from-yellow-300 via-orange-400 to-pink-500 bg-clip-text text-transparent drop-shadow-xl">
      ETB {display.toLocaleString()}
    </h2>
  );
};

/* =========================
   Reward Badge
========================= */
const RewardBadge = ({ amount }: { amount: number }) => {
  const label =
    amount > 5000 ? "🏆 JACKPOT" : amount > 1000 ? "🔥 BIG WIN" : "⭐ WINNER";

  return (
    <div className="px-6 py-2 rounded-full bg-linear-to-r from-yellow-400 to-orange-500 text-black text-sm font-bold shadow-xl animate-out fade-in">
      {label}
    </div>
  );
};

/* =========================
   Main Won Content
========================= */
function WonContent() {
  const router = useRouter();
  const { roomId, sessionId } = useParams() as {
    roomId: string;
    sessionId: string;
  };
  const searchParams = useSearchParams();

  // Fast, memoized result preparation
  const result = useMemo(
    () => prepareGameResult(sessionId, searchParams),
    [sessionId, searchParams],
  );

  return (
    <div className="relative bg-[#0f0f12] min-h-screen flex flex-col items-center text-white overflow-x-hidden">
      {/* Background Glow */}
      <div className="absolute top-20 w-72 h-72 bg-yellow-500/20 blur-[120px] rounded-full animate-pulse" />

      {/* <Confetti /> */}

      <div className="relative z-10 w-full max-w-md  pb-10">
        {/* Header */}
        <div className="flex flex-col items-center mt-8 space-y-2 mb-2 text-center">
          <RewardBadge amount={result.prizePool} />
          <h1 className="text-[16px] font-bold text-foreground/90 line-clamp-1  tracking-wide capitalize">
            Congratulations
          </h1>
          <p className="text-sm text-gray-300 line-clamp-1">
            Winner: {result.winnerName}
          </p>
          <AnimatedCounter value={result.prizePool} />
        </div>

        {/* Board */}
        <ResultBoard
          board={result.board}
          winningPositions={result.winningPositions}
          calledNumbers={result.calledNumbers}
          boardNum={result.boardNum}
        />

        {/* CTA Buttons */}
        <div className="w-full mt-4 space-y-2 px-12">
          <button
            onClick={() => router.replace(`/rooms/${roomId}`)}
            className="w-full h-10 rounded-[12px]  font-bold bg-linear-to-r from-blue-500 to-indigo-600 shadow-lg active:scale-95 transition"
          >
            <Play className="mr-1" size={18} />
            Play Again
          </button>

          <button
            onClick={() =>
              window.open(
                `https://t.me/share/url?text=I just won ETB ${result.prizePool} in Mella Bingo! Join me and play for a chance to win big!&url=https://t.me/mella_bingo_bot?start=welcome`,
              )
            }
            className="w-full h-10 rounded-[12px]  font-bold bg-linear-to-r from-yellow-400 to-orange-500 text-black shadow-lg active:scale-95 transition"
          >
            <Share2 className="mr-2" size={18} />
            Share
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WonPage() {
  return (
    <Suspense fallback={null}>
      <WonContent />
    </Suspense>
  );
}
