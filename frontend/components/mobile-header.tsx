"use client";

import { RotateCcw, Plus } from "lucide-react";
import { useAuth } from "@/providers/auth.provider";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface MobileHeaderProps {
  refetch?: () => void;
}
export function MobileHeader({ refetch }: MobileHeaderProps) {
  const router = useRouter();
  const { user } = useAuth();
  const t = useTranslations("mobileHeader");
  return (
    <div className="flex flex-col gap-4 p-4 pb-2">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <h1 className="text-foreground text-lg line-clamp-1 font-black tracking-tight capitalize">
            {t("greeting", { name: user?.username || t("guest") })}
          </h1>
          <p className="text-muted-foreground text-[10px] font-bold capitalize tracking-widest">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/10 hover:bg-primary/20 transition-all active:scale-90"
            onClick={() => refetch?.()}
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={() => {
              router.push("/deposit");
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-black text-[10px] uppercase tracking-wider shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95 leading-none"
          >
            <Plus size={14} strokeWidth={3} />
            {t("deposit")}
          </button>
        </div>
      </div>
    </div>
  );
}
