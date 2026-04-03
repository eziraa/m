"use client";

import { Play, Share2 } from "lucide-react";
import { Suspense, useMemo, useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ResultBoard } from "@/components/result-board";
import { prepareGameResult } from "@/lib/game-result";
import { fetchSessionWinnerResult } from "@/lib/api";

type WinningPattern = "row" | "column" | "diagonal" | "full_house" | "corners";

function getWinningPositions(
  board: number[][],
  markedCells: number[],
  pattern: WinningPattern,
): [number, number][] {
  const markedSet = new Set(markedCells);
  const rowLines = Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 5 }, (_, col) => row * 5 + col),
  );
  const columnLines = Array.from({ length: 5 }, (_, col) =>
    Array.from({ length: 5 }, (_, row) => row * 5 + col),
  );
  const mainDiagonal = Array.from({ length: 5 }, (_, idx) => idx * 5 + idx);
  const antiDiagonal = Array.from(
    { length: 5 },
    (_, idx) => idx * 5 + (4 - idx),
  );

  const toPositions = (cells: number[]) =>
    cells.map((idx) => [Math.floor(idx / 5), idx % 5] as [number, number]);

  if (pattern === "full_house") {
    return board.flatMap((row, rowIndex) =>
      row.map((_, colIndex) => [rowIndex, colIndex] as [number, number]),
    );
  }

  if (pattern === "corners") {
    return toPositions([0, 4, 20, 24]);
  }

  if (pattern === "row") {
    const winningRow = rowLines.find((line) => line.every((idx) => markedSet.has(idx)));
    return toPositions(winningRow ?? []);
  }

  if (pattern === "column") {
    const winningColumn = columnLines.find((line) =>
      line.every((idx) => markedSet.has(idx)),
    );
    return toPositions(winningColumn ?? []);
  }

  const winningDiagonal = [mainDiagonal, antiDiagonal].find((line) =>
    line.every((idx) => markedSet.has(idx)),
  );
  return toPositions(winningDiagonal ?? []);
}

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
  const [winnerBoard, setWinnerBoard] = useState<null | {
    pattern: WinningPattern;
    boardMatrix: number[][];
    boardNo: number;
    markedCells: number[];
    calledNumbers: number[];
    potCents: number;
    winnerName: string;
  }>(null);

  useEffect(() => {
    let alive = true;
    const token =
      typeof window !== "undefined" ? localStorage.getItem("mella_token") : "";

    if (!token) return;

    void fetchSessionWinnerResult(token, sessionId)
      .then((data) => {
        if (!alive) return;
        setWinnerBoard({
          pattern: data.pattern,
          boardMatrix: data.boardMatrix,
          boardNo: data.boardNo,
          markedCells: data.markedCells,
          calledNumbers: data.calledNumbers,
          potCents: data.potCents,
          winnerName: data.winnerName,
        });
      })
      .catch(() => {
        // Keep the existing local result fallback if winner result is unavailable.
      });

    return () => {
      alive = false;
    };
  }, [sessionId]);

  const displayBoard = winnerBoard?.boardMatrix;
  const displayBoardNum = winnerBoard?.boardNo;
  const displayWinningPositions = useMemo(
    () =>
      winnerBoard
        ? getWinningPositions(
            winnerBoard.boardMatrix,
            winnerBoard.markedCells,
            winnerBoard.pattern,
          )
        : [],
    [winnerBoard],
  );
  const displayCalledNumbers = winnerBoard?.calledNumbers ?? [];
  const displayWinnerName = winnerBoard?.winnerName ?? result.winnerName;
  const displayPrizePool =
    typeof winnerBoard?.potCents === "number"
      ? winnerBoard.potCents / 100
      : result.prizePool;

  return (
    <div className="relative bg-[#0f0f12] min-h-screen flex flex-col items-center text-white overflow-x-hidden">
      {/* Background Glow */}
      <div className="absolute top-20 w-72 h-72 bg-yellow-500/20 blur-[120px] rounded-full animate-pulse" />

      {/* <Confetti /> */}

      <div className="relative z-10 w-full max-w-md  pb-10">
        {/* Header */}
        <div className="flex flex-col items-center mt-8 space-y-2 mb-2 text-center">
          <RewardBadge amount={displayPrizePool} />
          <h1 className="text-[16px] font-bold text-foreground/90 line-clamp-1  tracking-wide capitalize">
            Congratulations
          </h1>
          <p className="text-sm text-gray-300 line-clamp-1">
            Winner: {displayWinnerName}
          </p>
          <AnimatedCounter value={displayPrizePool} />
        </div>

        {/* Board */}
        {displayBoard && typeof displayBoardNum === "number" ? (
          <ResultBoard
            board={displayBoard}
            winningPositions={displayWinningPositions}
            calledNumbers={displayCalledNumbers}
            boardNum={displayBoardNum}
          />
        ) : (
          <div className="h-[226px] w-full max-w-60 animate-pulse rounded-[12px] bg-white/5" />
        )}

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
                `https://t.me/share/url?text=I just won ETB ${displayPrizePool} in Mella Bingo! Join me and play for a chance to win big!&url=https://t.me/mella_bingo_bot?start=welcome`,
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
