"use client";

import { Trophy, XCircle, Zap } from "lucide-react";

interface GameResultViewProps {
  status: "won" | "lost" | "draw";
  reward?: number;
  boardNumber?: number;
  playerName?: string;
  isCurrentUser?: boolean;
  board?: number[][];
  winningPositions?: [number, number][];
  calledNumbers?: number[];
  onAction?: () => void;
  onSecondaryAction?: () => void;
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function GameResultView({
  status,
  reward = 0,
  boardNumber = 0,
  playerName = "Player",
  isCurrentUser = true,
  board,
  winningPositions = [],
  calledNumbers = [],
  onAction,
  onSecondaryAction,
}: GameResultViewProps) {
  const isWin = status === "won";
  const isLost = status === "lost";
  const isDraw = status === "draw";

  return (
    <div className="w-full max-w-2xl mx-auto min-h-screen max-h-screen overflow-y-auto custom-scrollbar flex flex-col items-center justify-start py-12 px-6">
      <div className="w-full relative flex flex-col items-center">
        <div
          className={cx(
            "w-16 h-16 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl relative",
            isWin &&
              "bg-linear-to-br from-emerald-500 to-teal-600 shadow-emerald-500/40",
            isLost &&
              "bg-linear-to-br from-red-500 to-orange-600 shadow-red-500/20",
            isDraw &&
              "bg-linear-to-br from-green-500 to-slate-600 shadow-green-500/20",
          )}
        >
          {isWin ? (
            <Trophy className="text-white" size={32} />
          ) : isDraw ? (
            <Zap className="text-white" size={32} />
          ) : (
            <XCircle className="text-white" size={32} />
          )}
        </div>

        <h2
          className={cx(
            "text-3xl font-black tracking-tighter text-center italic uppercase leading-tight mb-3",
            isWin &&
              "text-transparent bg-linear-to-r from-emerald-400 to-teal-200 bg-clip-text",
            isLost && "text-red-500",
            isDraw && "text-green-500",
          )}
        >
          {isWin
            ? isCurrentUser
              ? "You won"
              : `${playerName} won`
            : isDraw
              ? "Draw"
              : `${playerName} won`}
        </h2>

        <p className="text-sm font-bold text-muted-foreground uppercase tracking-[0.2em] mb-10">
          BOARD #{boardNumber + 1}
        </p>

        {board && board.length > 0 ? (
          <div className="w-full max-w-md flex flex-col items-center justify-center mb-10 p-4 rounded-3xl bg-muted/10 border border-muted/20 backdrop-blur-md shadow-inner">
            <div className="grid grid-cols-5 gap-2 mb-3">
              {["B", "I", "N", "G", "O"].map((letter, idx) => {
                const colors = [
                  "bg-green-500",
                  "bg-pink-500",
                  "bg-purple-500",
                  "bg-green-500",
                  "bg-orange-500",
                ];
                return (
                  <div
                    key={letter}
                    className={cx(
                      "text-center size-10 border-2 flex items-center justify-center font-black text-white text-lg rounded-xl shadow-lg",
                      colors[idx],
                    )}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>

            <div className="grid gap-2">
              {board.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-2">
                  {row.map((num, colIndex) => {
                    const isFree = num === 0;
                    const isWinning = winningPositions.some(
                      ([r, c]) => r === rowIndex && c === colIndex,
                    );
                    const isCalled = !isFree && calledNumbers.includes(num);

                    return (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className={cx(
                          "size-10 md:size-12 border-2 flex items-center justify-center rounded-xl font-bold text-sm md:text-base transition-all duration-500",
                          isWinning
                            ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_16px_rgba(16,185,129,0.4)] z-10"
                            : isCalled
                              ? "bg-green-600 border-green-500 text-white"
                              : "bg-muted/20 text-muted-foreground border-muted/30",
                        )}
                      >
                        {isFree ? (
                          <span className="text-[10px] md:text-xs font-semibold lowercase">
                            free
                          </span>
                        ) : (
                          num
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {!isWin ? (
          <div className="w-full max-w-md bg-linear-to-r from-destructive/10 to-red-600/5 border border-destructive/20 rounded-3xl p-6 mb-10">
            <p className="text-base font-medium text-center text-foreground/80">
              Better luck next time
            </p>
          </div>
        ) : null}

        {isWin ? (
          <p className="text-xl font-black mb-8 text-emerald-300">
            ETB {reward.toFixed(2)}
          </p>
        ) : null}

        <div className="w-full max-w-md space-y-4">
          <button
            onClick={onAction}
            className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-base shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all bg-linear-to-r from-primary to-accent text-white"
          >
            {isWin ? "Continue" : "Play Again"}
          </button>

          <button
            onClick={onSecondaryAction}
            className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-base bg-white/5 border border-white/10 hover:bg-white/10 backdrop-blur-sm transition-all"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}
