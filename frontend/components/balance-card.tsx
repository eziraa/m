"use client";
import { Skeleton } from "@/components/ui/skeleton";
import Logo from "./logo";
import CountUp from "react-countup";

export function BalanceCard({
  balance,
  currency,
}: {
  balance?: string;
  currency?: string;
}) {
  const isLoading = false; // Replace with actual loading state
  return (
    <div className="relative mx-4 mt-2 overflow-hidden rounded-2xl bg-linear-to-br from-green-500 to-emerald-600 p-5 shadow-lg shadow-green-500/20">
      {/* Pattern Overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg width="100%" height="100%">
          <pattern
            id="balance-pattern"
            x="0"
            y="0"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1" fill="white" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#balance-pattern)" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col gap-4">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-16 bg-white/20" />
              <Skeleton className="h-8 w-32 bg-white/20" />
            </div>
            <div className="h-px w-3/4 bg-white/20" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-12 bg-white/20" />
              <Skeleton className="h-6 w-24 bg-white/20" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex  flex-col">
              <span className="text-white/80 text-xs font-medium uppercase tracking-wider">
                Balance
              </span>
              <span className="text-white text-3xl font-black">
                {balance ? (
                  `${currency} ${balance}`
                ) : (
                  <CountUp
                    start={0}
                    end={20}
                    duration={1.5}
                    separator=","
                    decimals={2}
                    decimal="."
                    prefix="ETB "
                    className="text-white text-3xl font-black"
                  />
                )}
              </span>
            </div>

            <div className="h-px w-3/4 bg-white/20" />

            <div className="flex flex-col">
              <span className="text-white/80 text-xs font-medium uppercase tracking-wider">
                Bonus
              </span>
              <span className="text-white text-xl font-bold">ETB 0.00</span>
            </div>
          </>
        )}
      </div>

      {/* ETB Coin */}
      <div className="absolute top-1/2 right-6 -translate-y-1/2 w-40 h-40">
        <div className="relative w-full h-full flex items-center justify-center">
          {/* <div className="absolute w-32 h-32 rounded-full bg-linear-to-b from-green-500 via-green-500 to-green-600 shadow-xl border-4 border-green-200/50 flex items-center justify-center">
            <span className="text-white/70 text-4xl font-black tracking-tighter select-none">
              ETB
            </span>
            <div className="absolute inset-2 rounded-full border border-green-400/30" />
          </div> */}
          <Logo />
        </div>
      </div>
    </div>
  );
}
