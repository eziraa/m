"use client";

import { useEffect, useState, useRef } from "react";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Gamepad2,
  Gift,
  History as HistoryIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useGetTransactionsQuery } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { MobileHeader } from "@/components/mobile-header";

const ITEMS_PER_PAGE = 15;

export default function TransactionsPage() {
  const router = useRouter();
  const t = useTranslations("transactions");
  const commonT = useTranslations("common");
  const [activeTab, setActiveTab] = useState("all");
  const [displayedItems, setDisplayedItems] = useState(ITEMS_PER_PAGE);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data: allTransactions,
    isLoading,
    refetch,
  } = useGetTransactionsQuery(activeTab);

  // Intersection Observer for Infinite Scroll
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          allTransactions &&
          displayedItems < allTransactions.length
        ) {
          setDisplayedItems((prev) => prev + ITEMS_PER_PAGE);
        }
      },
      { threshold: 0.1 },
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [allTransactions, displayedItems]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return <ArrowDownLeft className="text-emerald-400" size={18} />;
      case "withdrawal":
        return <ArrowUpRight className="text-rose-400" size={18} />;
      case "game_win":
        return <Gamepad2 className="text-blue-400" size={18} />;
      case "game_lost":
        return <Gamepad2 className="text-zinc-500" size={18} />;
      case "referral_reward":
      case "referral_commission":
      case "welcome_bonus":
      case "adjustment":
      case "bonus":
        return <Gift className="text-amber-400" size={18} />;
      default:
        return <HistoryIcon className="text-zinc-400" size={18} />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "deposit":
      case "game_win":
      case "referral_reward":
      case "referral_commission":
      case "welcome_bonus":
      case "adjustment":
        return "text-emerald-400";
      case "withdrawal":
        return "text-rose-400";
      default:
        return "text-zinc-400";
    }
  };

  const currentTransactions = allTransactions?.slice(0, displayedItems) || [];

  return (
    <div className="bg-background  pb-18 custom-scrollbar overflow-y-auto max-h-screen px-4 w-full items-stretch justify-start mx-auto flex flex-col py-4">
      <MobileHeader
        title={t("title")}
        showBack
        onBack={() => router.back()}
        refetch={handleRefresh}
      />

      <div className="px-4 w-full py-4 space-y-4">
        {/* Tabs */}
        <Tabs
          defaultValue="all"
          className="w-full"
          onValueChange={(v) => {
            setActiveTab(v);
            setDisplayedItems(ITEMS_PER_PAGE);
          }}
        >
          <TabsList className="grid w-full grid-cols-3 bg-zinc-900/50 p-1 rounded-xl">
            <TabsTrigger
              value="all"
              className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all text-xs font-bold uppercase tracking-wider"
            >
              {t("tabs.all")}
            </TabsTrigger>
            <TabsTrigger
              value="in"
              className="rounded-lg data-[state=active]:bg-emerald-600 data-[state=active]:text-white transition-all text-xs font-bold uppercase tracking-wider"
            >
              {t("tabs.in")}
            </TabsTrigger>
            <TabsTrigger
              value="out"
              className="rounded-lg data-[state=active]:bg-rose-600 data-[state=active]:text-white transition-all text-xs font-bold uppercase tracking-wider"
            >
              {t("tabs.out")}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Content */}
        <div className="space-y-3 w-full ">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-20 bg-zinc-900/40 rounded-2xl animate-pulse border border-white/5"
              />
            ))
          ) : currentTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 space-y-4">
              <div className="p-4 bg-zinc-900/50 rounded-full">
                <HistoryIcon size={32} strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium">{t("empty")}</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {currentTransactions.map((tx, idx) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                >
                  <Card className="p-3 sm:p-4 w-full  bg-zinc-950/40 border-white/5 rounded-2xl flex flex-row items-center justify-between group active:scale-[0.98] transition-all hover:bg-zinc-900/40 gap-2">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <div
                        className={cn(
                          "size-10 sm:size-11 shrink-0 rounded-xl flex items-center justify-center border",
                          tx.type === "withdrawal"
                            ? "bg-rose-500/10 border-rose-500/10"
                            : tx.type === "deposit"
                              ? "bg-emerald-500/10 border-emerald-500/10"
                              : tx.type.includes("win")
                                ? "bg-blue-500/10 border-blue-500/10"
                                : "bg-zinc-500/10 border-white/5",
                        )}
                      >
                        {getTransactionIcon(tx.type)}
                      </div>

                      <div className="flex justify-start   flex-col gap-0.5 min-w-0 flex-1">
                        <span className="text-xs font-black uppercase tracking-wider text-zinc-400 truncate">
                          {t(`types.${tx.type}`) || tx.type.replace("_", " ")}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-medium truncate">
                          {format(new Date(tx.createdAt), "MMM d, h:mm a")}{" "}
                          •{" "}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                      <span
                        className={cn(
                          "text-sm font-black tracking-tight",
                          getTransactionColor(tx.type),
                        )}
                      >
                        {parseFloat(tx.amount.toString()) > 0 ? "+" : ""}
                        {tx.amount} {commonT("currency")}
                      </span>
                      <div
                        className={cn(
                          "px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest",
                          tx.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-amber-500/10 text-amber-500",
                        )}
                      >
                        {t(`status.${tx.status}`)}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {/* Infinite Scroll Trigger */}
          {allTransactions && displayedItems < allTransactions.length && (
            <div ref={loaderRef} className="py-8 flex justify-center">
              <div className="size-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
          )}

          {allTransactions &&
            displayedItems >= allTransactions.length &&
            currentTransactions.length > 0 && (
              <div className="py-8 text-center text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em]">
                {t("noMore")}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
