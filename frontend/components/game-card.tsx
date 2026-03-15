"use client";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useState } from "react";
import { InsufficientBalanceModal } from "./insufficient-balance-modal";
import { useTranslations } from "next-intl";

interface GameCardProps {
  name: string;
  price: string | number;
  color?: string;
  icon?: string;
  ballColor?: string;
  id: string;
  canAfford: boolean;
  isLive?: boolean;
}

export function GameCard({
  name,
  price,
  color = "blue",
  icon = "🎉",
  ballColor = "bg-primary/20",
  id,
  canAfford,
  isLive = false,
}: GameCardProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const t = useTranslations("gameCard");

  return (
    <>
      <div
        className={cn(
          "relative flex flex-col bg-linear-to-br   justify-between p-4 rounded-2xl h-40 overflow-hidden shadow-xl transition-all active:scale-95 group border border-foreground/10",
          color,
          !canAfford && " cursor-not-allowed",
        )}
        onClick={() => {
          if (!canAfford) {
            setShowModal(true);
            return;
          }
          if (isLive) {
            router.push(`/rooms/${id}/room-full`);
            return;
          }
          router.push(`/rooms/${id}`);
        }}
      >
        {/* Live Indicator */}
        {isLive && (
          <div className="absolute top-3 right-3 z-36 flex items-center gap-1.5 px-1 py-0.5 bg-red-500 rounded-full shadow-lg shadow-red-500/40 border border-white/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span className="text-[6px] font-black tracking-tighter text-white uppercase leading-none">
              LIVE
            </span>
          </div>
        )}
        <div className="relative z-10 flex flex-col gap-1">
          <span className="text-foreground/70 text-[10px] font-black uppercase tracking-widest">
            {name}
          </span>
          <span className="text-foreground text-xl font-black">
            {price} ETB
          </span>
        </div>

        <button className="relative z-10 w-fit px-4 py-2 bg-foreground/10 hover:bg-foreground/20 backdrop-blur-xl rounded-xl text-foreground text-[10px] font-black tracking-wider uppercase transition-all border border-foreground/10 shadow-lg shadow-black/20">
          {t("playNow")}
        </button>

        {/* Premium Icon Graphic */}
        <div className="absolute -bottom-4 -right-4 w-28 h-28 rotate-12 transition-transform group-hover:rotate-0 duration-500">
          <div
            className={cn(
              "relative w-full h-full rounded-full flex items-center justify-center shadow-2xl border-4 border-white/10 backdrop-blur-sm",
              ballColor,
            )}
          >
            <div className="w-14 h-14 rounded-full bg-foreground/10 flex items-center justify-center shadow-inner border border-foreground/20">
              <span className="text-4xl drop-shadow-md filter grayscale-[0.2] group-hover:grayscale-0 transition-all">
                {icon}
              </span>
            </div>
            {/* Enhanced Shine effect */}
            <div className="absolute top-4 left-6 w-8 h-4 bg-foreground/20 rounded-full blur-[4px] -rotate-45" />
            <div className="absolute bottom-6 right-8 w-2 h-2 bg-foreground/10 rounded-full blur-[1px]" />
          </div>
        </div>

        {/* Background Decor */}
        {/* <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl" /> */}
      </div>
      <InsufficientBalanceModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
