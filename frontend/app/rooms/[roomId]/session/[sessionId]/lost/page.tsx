"use client";

import { Play } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ResultBoard } from "@/components/result-board";
import { prepareGameResult } from "@/lib/game-result";
import { useTranslations } from "next-intl";
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

/* =========================================================
   Lost Content – Premium UX
========================================================= */
function LostContent() {
  const router = useRouter();
  const { roomId, sessionId } = useParams() as {
    roomId: string;
    sessionId: string;
  };
  const searchParams = useSearchParams();
  const tLive = useTranslations("liveResult");

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

  return (
    <div className="relative min-h-screen bg-[#0f0f12] text-white flex flex-col items-center overflow-hidden">
      {/* Subtle Red Glow Background */}
      <div className="absolute top-32 w-80 h-80 bg-red-500/20 blur-[120px] rounded-full animate-pulse" />

      <div className="relative z-10 max-w-[430px] w-full  pt-8 pb-20 flex flex-col items-center">
        {/* Title Section */}
        <div className="text-center">
          <h1 className="text-xl font-bold line-clamp-1">{tLive("almostThereTitle")}</h1>

          <p className="text-gray-400 text-sm mt-2 line-clamp-1">
            {tLive("keepGoing")}
          </p>
        </div>

        {/* Glass Summary */}
        <div className="mt-4 mb-4 bg-white/5 backdrop-blur-md rounded-[10px] mx-auto p-4 py-2 w-[80%] text-sm text-gray-300 border border-white/10 text-center">
          <p>{tLive("winnerIs", { name: displayWinnerName })}</p>
        </div>

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
        <div className="w-full mt-8 space-y-2 px-12">
          <button
            onClick={() => router.replace(`/rooms/${roomId}`)}
            className="w-full h-10 rounded-[12px] font-medium flex items-center justify-center text-lg bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg"
          >
            <Play size={18} className="mr-2" /> {tLive("playAgainBtn")}
          </button>

          <button
            onClick={() => router.replace(`/rooms`)}
            className="w-full h-10 rounded-[12px] font-medium flex items-center justify-center text-lg bg-white/5 backdrop-blur-md border border-white/10"
          >
            {tLive("goHomeBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LostPage() {
  return (
    <Suspense fallback={null}>
      <LostContent />
    </Suspense>
  );
}
