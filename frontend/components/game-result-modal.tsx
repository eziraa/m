"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Trophy, XCircle, Zap, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Confetti } from "./coffetti";

interface GameResultViewProps {
  status: "won" | "lost" | "draw";
  reward?: number;
  deductedAmount?: number;
  boardNumber?: number;
  playerName?: string;
  isCurrentUser?: boolean;
  board?: number[][];
  winningPositions?: [number, number][];
  calledNumbers?: number[];
  onAction?: () => void;
  onSecondaryAction?: () => void;
}

export function GameResultView({
  status,
  reward = 0,
  deductedAmount = 0,
  boardNumber = 0,
  playerName = "Player",
  isCurrentUser = true,
  board,
  winningPositions = [],
  calledNumbers = [],
  onAction,
  onSecondaryAction,
}: GameResultViewProps) {
  const t = useTranslations("gameResult");
  const [showConfetti, setShowConfetti] = useState(false);
  const isWin = status === "won";
  const isLost = status === "lost";
  const isDraw = status === "draw";

  useEffect(() => {
    if (isWin) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isWin]);

  return (
    <div className="w-full max-w-2xl mx-auto min-h-screen  max-h-screen overflow-y-auto custom-scrollbar flex flex-col items-center justify-start py-12 px-6">
      <AnimatePresence>{showConfetti && <Confetti />}</AnimatePresence>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full relative flex flex-col items-center"
      >
        {/* Result Icon */}
        <motion.div
          animate={
            isWin
              ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }
              : { y: [0, -5, 0] }
          }
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className={cn(
            "w-16 h-16 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl relative",
            isWin &&
              "bg-linear-to-br from-emerald-500 to-teal-600 shadow-emerald-500/40",
            isLost &&
              "bg-linear-to-br from-red-500 to-orange-600 shadow-red-500/20",
            isDraw &&
              "bg-linear-to-br from-blue-500 to-slate-600 shadow-blue-500/20",
          )}
        >
          {isWin ? (
            <Trophy className="text-white" size={32} />
          ) : isDraw ? (
            <Zap className="text-white" size={32} />
          ) : (
            <XCircle className="text-white" size={32} />
          )}
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "text-3xl font-black tracking-tighter text-center italic uppercase leading-tight mb-3",
            isWin &&
              "text-transparent bg-linear-to-r from-emerald-400 to-teal-200 bg-clip-text",
            isLost && "text-red-500",
            isDraw && "text-blue-500",
          )}
        >
          {isWin
            ? isCurrentUser
              ? t("title.winSelf")
              : t("title.winOther", { name: playerName })
            : isDraw
              ? t("title.draw")
              : t("title.lost", { name: playerName })}
        </motion.h2>

        {/* Board Number */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm font-bold text-muted-foreground uppercase tracking-[0.2em] mb-10"
        >
          {t("boardLabel", { number: boardNumber + 1 })}
        </motion.p>

        {/* Bingo Board Display */}
        {board && board.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="w-full max-w-md flex flex-col items-center justify-center mb-10 p-4 rounded-3xl bg-muted/10 border border-muted/20 backdrop-blur-md shadow-inner"
          >
            <div className="grid grid-cols-5 gap-2 mb-3">
              {["B", "I", "N", "G", "O"].map((letter, idx) => {
                const colors = [
                  "bg-blue-500",
                  "bg-pink-500",
                  "bg-purple-500",
                  "bg-green-500",
                  "bg-orange-500",
                ];
                return (
                  <div
                    key={letter}
                    className={cn(
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
                    const isWinning = winningPositions?.some((pos) => {
                      if (Array.isArray(pos) && pos.length === 2) {
                        const [r, c] = pos;
                        return r === rowIndex && c === colIndex;
                      }
                      return false;
                    });
                    const isCalled = calledNumbers?.includes(num);

                    return (
                      <motion.div
                        key={`${rowIndex}-${colIndex}`}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          delay: 0.35 + (rowIndex * 5 + colIndex) * 0.02,
                        }}
                        className={`size-10 md:size-12 border-2 flex items-center justify-center rounded-xl font-bold text-sm md:text-base transition-all duration-500 ${
                          isWinning
                            ? "bg-amber-500 border-amber-300 text-white shadow-[0_0_20px_rgba(251,191,36,0.5)] z-10"
                            : isCalled
                              ? "bg-primary/20 text-primary border-primary/40"
                              : "bg-muted/20 text-muted-foreground border-muted/30"
                        }`}
                      >
                        {num === 0 ? (
                          <span className="text-[10px] md:text-xs font-black">
                            {t("free")}
                          </span>
                        ) : (
                          num
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Stats Cards / Info */}
        {!isWin && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="w-full max-w-md bg-linear-to-r from-destructive/10 to-red-600/5 border border-destructive/20 rounded-3xl p-6 mb-10"
          >
            <p className="text-base font-medium text-center text-foreground/80">
              {t("consolation")}
            </p>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="w-full max-w-md space-y-4"
        >
          <Button
            onClick={onAction}
            className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-base shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all bg-linear-to-r from-primary to-accent text-white"
          >
            {isWin ? t("cta.continue") : t("cta.playAgain")}
          </Button>

          <Button
            variant="outline"
            onClick={onSecondaryAction}
            className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-base bg-white/5 border-white/10 hover:bg-white/10 backdrop-blur-sm transition-all"
          >
            {t("cta.exit")}
          </Button>
        </motion.div>

        {/* Footer Text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-sm font-medium text-muted-foreground mt-12 text-center max-w-xs opacity-60"
        >
          {isWin ? t("footer.win") : t("footer.other")}
        </motion.p>
      </motion.div>
    </div>
  );
}
