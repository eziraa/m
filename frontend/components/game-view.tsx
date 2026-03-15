"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Play, RefreshCcw, Timer, Trophy } from "lucide-react";
import { BingoBoard } from "./bingo-board";
import { useTranslations } from "next-intl";

interface GameViewProps {
  session: any;
  userId: string;
  selectedBoardIndex: number;
  lastCalled: number | null;
  calledNumbers: number[];
  winners: any[];
  countdown: number | null;
  startGame: () => void;
  resetGame: () => void;
  handleCellClick: (row: number, col: number) => Promise<boolean>;
}

export function GameView({
  session,
  userId,
  selectedBoardIndex,
  lastCalled,
  calledNumbers,
  winners,
  countdown,
  startGame,
  resetGame,
  handleCellClick,
}: GameViewProps) {
  const isPlaying = session?.status === "playing";
  const t = useTranslations("gameView");

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 w-full px-4 py-8 relative">
      {/* Decorative floating elements */}
      <div className="absolute top-1/4 -left-12 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-12 w-64 h-64 bg-accent/10 rounded-full blur-[100px] pointer-events-none" />

      {/* LEFT COLUMN: Game State & Controls */}
      <div className="lg:col-span-4 space-y-8 order-2 lg:order-1 relative z-10">
        {/* BIG BALL DISPLAY - THE 3D SPHERE */}
        <div className="relative group">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative aspect-square w-full max-w-[320px] mx-auto lg:max-w-none rounded-full flex items-center justify-center"
          >
            {/* Outer Rings */}
            <div className="absolute inset-0 rounded-full border border-white/5 border-dashed animate-[spin_30s_linear_infinite]" />
            <div className="absolute inset-8 rounded-full border border-primary/20 animate-[spin_20s_linear_infinite_reverse]" />
            <div className="absolute inset-16 rounded-full border border-accent/10 animate-[spin_40s_linear_infinite]" />

            {/* The Sphere */}
            <AnimatePresence mode="popLayout">
              <motion.div
                key={lastCalled || "waiting"}
                initial={{ scale: 0.5, opacity: 0, rotateY: 180 }}
                animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                exit={{ scale: 1.5, opacity: 0, rotateY: -180 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="w-56 h-56 rounded-full relative z-20 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
              >
                {/* 3D Shading Effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-blue-900" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.4),transparent_60%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(0,0,0,0.4),transparent_60%)]" />
                <div className="absolute inset-2 border border-white/20 rounded-full pointer-events-none" />

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-8xl font-black text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)] tracking-tighter italic">
                    {lastCalled || "--"}
                  </span>
                  {!isPlaying && (
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60 -mt-2">
                      {t("ready")}
                    </span>
                  )}
                </div>

                {/* Glassy reflection */}
                <div className="absolute top-4 left-4 w-12 h-6 bg-white/20 rounded-[50%] rotate-[-30deg] blur-[2px]" />
              </motion.div>
            </AnimatePresence>

            {/* Glow burst on number change */}
            <AnimatePresence>
              {lastCalled && (
                <motion.div
                  key={`glow-${lastCalled}`}
                  initial={{ scale: 0.8, opacity: 1 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  className="absolute inset-0 bg-primary/20 rounded-full blur-2xl z-10"
                  transition={{ duration: 1 }}
                />
              )}
            </AnimatePresence>
          </motion.div>

          <div className="mt-6 flex justify-center">
            <div className="bg-white/5 backdrop-blur-md text-white md:text-[10px] text-[9px] font-black uppercase tracking-[0.2em] px-5 py-2 rounded-2xl border border-white/10 shadow-lg inline-flex items-center gap-2">
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isPlaying ? "bg-accent animate-pulse" : "bg-muted-foreground",
                )}
              />
              {isPlaying ? t("liveBroadcast") : t("sessionStandby")}
            </div>
          </div>
        </div>

        {/* CONTROLS & INFO */}
        <div className="space-y-4">
          {session?.status === "waiting" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Button
                size="lg"
                onClick={startGame}
                className="w-full h-16 rounded-[1.5rem] text-lg font-black tracking-widest bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-400 shadow-[0_10px_30px_rgba(59,130,246,0.3)] border-0 transition-transform active:scale-95 group"
              >
                <Play className="mr-2 fill-current group-hover:translate-x-1 transition-transform" />{" "}
                {t("start")}
              </Button>
            </motion.div>
          )}

          {/* RECENT NUMBERS */}
          <Card className="p-6 bg-white/5 border-white/10 backdrop-blur-2xl rounded-[2rem] shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
            <div className="flex items-center justify-between mb-5 relative z-10">
              <div>
                <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] block mb-1">
                  {t("queue")}
                </span>
                <h4 className="text-sm font-black text-white italic uppercase tracking-tight">
                  {t("callHistory")}
                </h4>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] font-black bg-primary/20 border-primary/20 text-primary px-3 py-1 rounded-xl"
              >
                {calledNumbers.length} / 75
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2 justify-start relative z-10">
              {calledNumbers
                .slice(-10)
                .reverse()
                .map((num, i) => (
                  <motion.div
                    key={`${num}-${i}`}
                    initial={{ scale: 0, y: 10 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black italic transition-all duration-300",
                      i === 0
                        ? "bg-accent text-white shadow-[0_0_20px_rgba(251,113,133,0.4)] scale-110 z-10 ring-2 ring-white/20"
                        : "bg-white/5 text-white/40 border border-white/5 hover:bg-white/10",
                    )}
                  >
                    {num}
                  </motion.div>
                ))}
              {calledNumbers.length === 0 && (
                <div className="w-full text-center py-4">
                  <p className="text-xs text-white/20 font-bold uppercase tracking-widest italic italic">
                    {t("waitingCalls")}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* WINNER ALERT */}
          <AnimatePresence>
            {winners.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-accent/10 border border-accent/20 rounded-[2rem] p-5 flex items-center gap-5 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-12 h-full bg-accent/5 skew-x-[30deg] translate-x-4" />
                <div className="bg-gradient-to-br from-accent to-accent/60 text-white w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
                  <Trophy size={24} />
                </div>
                <div className="relative z-10">
                  <div className="font-black text-accent uppercase text-[10px] tracking-[0.2em] mb-1">
                    {t("victorySequence")}
                  </div>
                  <div className="text-sm font-black text-white italic tracking-tight">
                    {t("hitsBingo", { count: winners.length })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* RIGHT COLUMN: User Board */}
      <div className="lg:col-span-8 order-1 lg:order-2 space-y-6">
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-br from-primary/30 via-transparent to-accent/30 rounded-[3rem] blur-xl opacity-30" />
          <div className="relative bg-black/20 backdrop-blur-md rounded-[3rem] p-1.5 md:p-2 border border-white/10">
            <BingoBoard
              boardIndex={selectedBoardIndex}
              lastCalledNumber={lastCalled}
              onCellClick={handleCellClick}
              isWinner={winners.some(
                (w) =>
                  w.userId === userId && w.boardNumber === selectedBoardIndex,
              )}
              calledNumbers={calledNumbers}
            />
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            variant="ghost"
            className="text-white/30 hover:text-white/60 hover:bg-white/5 rounded-2xl px-8 transition-colors text-[10px] font-black uppercase tracking-[0.3em]"
            onClick={resetGame}
          >
            <RefreshCcw size={14} className="mr-2" /> {t("abort")}
          </Button>
        </div>
      </div>
    </div>
  );
}
