"use client";

import { Star } from "lucide-react";
import { memo, useMemo } from "react";

type WinningPosition = [number, number];

const HEADERS = [
  { label: "B", color: "bg-[#0EA5E9]" },
  { label: "I", color: "bg-[#F43F5E]" },
  { label: "N", color: "bg-[#A855F7]" },
  { label: "G", color: "bg-[#22C55E]" },
  { label: "O", color: "bg-[#F97316]" },
] as const;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const ResultBoard = memo(function ResultBoard({
  board,
  winningPositions,
  calledNumbers,
  boardNum,
}: {
  board: number[][];
  winningPositions: WinningPosition[];
  calledNumbers: number[];
  boardNum: number;
}) {
  const winningSet = useMemo(
    () => new Set(winningPositions.map(([row, col]) => `${row}:${col}`)),
    [winningPositions],
  );
  const calledSet = useMemo(() => new Set(calledNumbers), [calledNumbers]);

  return (
    <div className="flex flex-col items-center ">
      <div className="grid grid-cols-5 gap-1.5 mb-1.5 w-full max-w-60">
        {HEADERS.map((header) => (
          <div
            key={header.label}
            className={cx(
              "aspect-square flex items-center h-8 w-10 justify-center rounded-[8px] text-white font-black shadow-md",
              header.color,
            )}
          >
            {header.label}
          </div>
        ))}
      </div>

      <div className="relative grid grid-cols-5 gap-1.5 w-full space-x-1.5 max-w-60">
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const key = `${rowIndex}:${colIndex}`;
            const isFree = rowIndex === 2 && colIndex === 2;
            const isWinning = !isFree && winningSet.has(key);
            const isCalled = !isFree && calledSet.has(cell);

            const isFreeIncludedInWinning =
              isFree &&
              winningPositions.some(
                ([r, c]) => r === rowIndex && c === colIndex,
              );

            let bgClass = "bg-[#2d2d30]";
            let textClass = "text-zinc-300";

            if (isFreeIncludedInWinning) {
              bgClass = "bg-emerald-500 border border-emerald-400";
              textClass = "text-white";
            } else if (isFree) {
              bgClass = "border border-green-500/40 bg-green-500/20";
              textClass = "text-green-500";
            } else if (isWinning) {
              bgClass = "bg-emerald-500 border border-emerald-400";
              textClass = "text-white";
            } else if (isCalled) {
              bgClass = "border border-blue-500";
              textClass = "text-white";
            }

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={cx(
                  "flex items-center justify-center rounded-[4px] h-8 w-10 text-[11px] font-bold shadow-md transition-all",
                  bgClass,
                  textClass,
                )}
              >
                {isFree ? (
                  <Star
                    className={
                      "h-4 w-4 " + !isFreeIncludedInWinning
                        ? "text-emerald-400"
                        : ""
                    }
                  />
                ) : (
                  cell
                )}
              </div>
            );
          }),
        )}
      </div>

      <p className="text-gray-400 text-xs mt-3 font-medium">
        BOARD #{boardNum + 1}
      </p>
    </div>
  );
});
