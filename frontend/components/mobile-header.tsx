"use client";

import { RotateCcw, Plus, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth.provider";
import { useRouter } from "next/navigation";

interface MobileHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  refetch?: () => void;
}

export function MobileHeader({ 
  title, 
  showBack, 
  onBack, 
  refetch 
}: MobileHeaderProps) {
  const router = useRouter();
  const { user } = useAuth();

  if (title) {
    return (
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-3">
          {showBack && (
            <button 
              onClick={onBack || (() => router.back())}
              className="p-2 bg-zinc-900/50 rounded-xl text-zinc-400 hover:text-white transition-colors active:scale-90"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className="text-foreground text-lg font-black tracking-tight">
            {title}
          </h1>
        </div>
        {refetch && (
          <button
            className="p-2 bg-green-500 rounded-xl text-white border border-primary/10 transition-all active:scale-90"
            onClick={() => refetch()}
          >
            <RotateCcw size={18} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-2">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <h1 className="text-foreground text-lg line-clamp-1 font-black tracking-tight capitalize">
            Welcome {user?.username}
          </h1>
          <p className="text-muted-foreground text-[10px] font-bold capitalize tracking-widest">
            Play Bingo and win big
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="p-2 bg-green-500 rounded-xl text-white border border-primary/10  transition-all active:scale-90"
            onClick={() => refetch?.()}
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={() => {
              router.push("/deposit");
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-green-500 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95 leading-none"
          >
            <Plus size={14} strokeWidth={3} />
            Deposit
          </button>
        </div>
      </div>
    </div>
  );
}
