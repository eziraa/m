"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const bingoLetters = ["B", "I", "N", "G", "O"] as const;
const letterGradients = [
  "from-sky-500 to-green-500",
  "from-pink-500 to-rose-500",
  "from-purple-500 to-emerald-500",
  "from-emerald-500 to-green-500",
  "from-amber-500 to-orange-500",
];

interface LiveGameLoaderProps {
  totalBoards: number;
  readyCount: number;
  gameName?: string;
}

const skeletonNumbers = Array.from({ length: 25 }, (_, i) => i + 1);

export default function LiveGameLoader() {
  return (
    <div className=" fixed z-[2000] min-h-screen w-full overflow-hidden flex flex-col items-center bg-[#03040b] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-10 h-56 w-56 rounded-full bg-primary/30 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-accent/20 blur-[160px]" />
        <div className="absolute inset-x-0 top-20 mx-auto h-96 w-96 rounded-full border border-white/5 opacity-20" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-100 flex-col items-stretch gap-4 pr-4 py-6">
        <section className="relative flex flex-col items-center rounded-[32px] border border-white/5 bg-white/5 p-5 shadow-[0_10px_60px_rgba(0,0,0,0.35)]">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
            className="relative flex h-44 w-44 items-center justify-center"
          >
            <div className="absolute inset-2 rounded-full border border-white/10" />
            <div className="absolute inset-0 animate-radar rounded-full bg-primary/20" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
              className="absolute inset-3 rounded-full border border-white/20 border-dashed"
            />
            <div className="relative z-10 flex h-33 w-33 flex-col items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary to-emerald-900 text-white shadow-[0_15px_45px_rgba(59,130,246,0.6)]">
              <span className="text-6xl font-black tracking-tighter drop-shadow-xl">
                --
              </span>
              <div className="mt-1 text-[10px] uppercase tracking-[0.4em] text-white/70">
                Loading
              </div>
              <Loader2 className="mt-3 h-5 w-5 animate-spin text-white/70" />
            </div>
          </motion.div>

          <div className="mt-4 flex w-full items-center justify-between text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
            <span>Queue</span>
            <span>00 / 75</span>
          </div>
          <div className="mt-2 flex w-full gap-1 overflow-hidden rounded-2xl bg-black/30 p-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-7 flex-1 rounded-[8px] bg-gradient-to-br from-white/10 to-white/5 animate-pulse"
              />
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-black/40 p-4 shadow-inner shadow-black/40">
          <div className="grid grid-cols-5 gap-1 pb-3">
            {bingoLetters.map((letter, i) => (
              <div
                key={letter}
                className={`flex h-7 w-12 items-center justify-center rounded-[6px] text-[11px] font-black text-white bg-gradient-to-r ${letterGradients[i]} shadow-lg`}
              >
                {letter}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-1 space-y-1">
            {skeletonNumbers.map((num) => (
              <div
                key={num}
                className="aspect-square rounded-[8px] h-7 w-11 border border-white/10 bg-white/5 text-[11px] font-bold text-white/30 animate-pulse"
              >
                <div className="flex h-full w-full items-center opacity-20 justify-center">
                  {num}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-white/5 p-3 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
            <span>ተዘጋጅቷል</span>
            <span>የቦርድ ስታተስ</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="h-9 flex-1 rounded-xl bg-white/5 animate-shimmer"
              />
            ))}
          </div>
          <button className="mt-2 h-12 rounded-2xl bg-gradient-to-r from-green-500 to-cyan-500 text-sm font-black animate-out   tracking-[0.3em] text-white shadow-[0_10px_40px_rgba(14,165,233,0.35)] active:scale-95">
            በማዘጋጀት ላይ ...
          </button>
        </section>
      </div>
    </div>
  );
}
