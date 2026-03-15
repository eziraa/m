"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";

type BingoBoardProps = {
  boardIndex: number;
  lastCalledNumber: number | null;
  onCellClick: (row: number, col: number) => Promise<boolean>;
  isWinner?: boolean;
  calledNumbers: number[];
};

function buildBoard(boardIndex: number): number[][] {
  const start = ((boardIndex - 1) % 15) * 5 + 1;
  return Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 5 }, (_, col) => start + row * 5 + col),
  );
}

export function BingoBoard({
  boardIndex,
  lastCalledNumber,
  onCellClick,
  isWinner = false,
  calledNumbers,
}: BingoBoardProps) {
  const board = useMemo(() => buildBoard(boardIndex), [boardIndex]);
  const calledSet = useMemo(() => new Set(calledNumbers), [calledNumbers]);

  return (
    <div
      className={cn(
        "rounded-[2rem] border p-3 md:p-4",
        isWinner ? "border-emerald-400/60" : "border-white/10",
      )}
    >
      <div className="grid grid-cols-5 gap-2 md:gap-3">
        {board.map((row, rowIndex) =>
          row.map((num, colIndex) => {
            const isCalled = calledSet.has(num);
            const isLastCalled = lastCalledNumber === num;
            return (
              <button
                key={`${rowIndex}-${colIndex}-${num}`}
                type="button"
                onClick={() => void onCellClick(rowIndex, colIndex)}
                className={cn(
                  "aspect-square rounded-xl border text-sm md:text-base font-black transition-all",
                  isCalled
                    ? "border-emerald-300/60 bg-emerald-500/30 text-white"
                    : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10",
                  isLastCalled && "ring-2 ring-amber-300/60",
                )}
              >
                {num}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
