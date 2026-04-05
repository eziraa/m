"use client";

import { useAuth } from "@/providers/auth.provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Trophy,
  Gamepad2,
  TrendingUp,
  Share2,
  Edit,
  Medal,
  Star,
  Zap,
  Clock,
  ChevronRight,
} from "lucide-react";
import ReferralStats from "@/components/referral/ReferralStats";
import InviteModal from "@/components/referral/InviteModal";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useGetGameStatsQuery, useGetTransactionsQuery } from "@/lib/api";
import { Transaction } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { useTranslations } from "next-intl";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
} as const;

export default function ProfilePage() {
  const { user } = useAuth();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const t = useTranslations("profilePage");

  const { data: gameStatsData } = useGetGameStatsQuery(undefined, {
    skip: !user,
  });
  const { data: transactionsData } = useGetTransactionsQuery("all", {
    skip: !user,
  });

  console.log("Game Stats:", gameStatsData);
  if (!user) return null;
  const played = gameStatsData?.played ?? 0;
  const gamesWon = gameStatsData?.won ?? 0;
  const totalGames = played;
  const winRateNumber = totalGames > 0 ? (gamesWon / totalGames) * 100 : 0;
  const winRate = `${Math.round(winRateNumber)}%`;

  const joinDate = new Date().toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });

  const stats = {
    level: Math.max(1, Math.floor(totalGames / 10) + 1),
    xp: played * 100,
    nextLevelXp: (Math.floor(totalGames / 10) + 2) * 100,
    gamesWon,
    totalGames,
    winRate,
    joinDate,
  };

  const achievements = [
    {
      name: t("achievements.firstBlood.name"),
      desc: t("achievements.firstBlood.desc"),
      icon: <Medal size={18} />,
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/20",
      unlocked: gamesWon > 0,
    },
    {
      name: t("achievements.highRoller.name"),
      desc: t("achievements.highRoller.desc"),
      icon: <Gamepad2 size={18} />,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
      unlocked: totalGames >= 50,
    },
    {
      name: t("achievements.sharpshooter.name"),
      desc: t("achievements.sharpshooter.desc"),
      icon: <Zap size={18} />,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
      unlocked: false,
    },
  ];

  const transactions = (transactionsData as Transaction[]) || [];
  const gameTransactions = transactions.filter(
    (tx) => tx.type === "game_win" || tx.type === "game_lost",
  );

  const recentGames = gameTransactions.slice(0, 3).map((tx) => {
    const created = new Date(tx.createdAt);
    const time = formatDistanceToNow(created, { addSuffix: true });
    const isWin = tx.type === "game_win";
    return {
      result: isWin ? t("recent.victory") : t("recent.defeat"),
      time,
      details: tx.description,
      xp: Math.abs(Number(tx.amount)),
      isWin,
    };
  });

  return (
    <div className="relative min-h-full w-full text-foreground bg-background">
      {/* Background Pattern */}
      <div className="fixed inset-0 z-0 opacity-[0.05] pointer-events-none select-none overflow-hidden">
        <div className="text-foreground text-[15vw] font-black break-all foregroundspace-pre-wrap leading-none opacity-20 transform -rotate-12 translate-y-[-10%]">
          {Array.from({ length: 50 }).map((_, idx) => (
            <span key={idx} className="mr-8 rotate-12">
              {Math.floor(Math.random() * 100)}
            </span>
          ))}
        </div>
      </div>

      <motion.div
        className="relative z-10 space-y-6 px-4 pt-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* HEADER SECTION */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col items-center pt-4"
        >
          <div className="relative group">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-green-500/20 rounded-full blur-3xl -z-10 group-hover:bg-green-500/30 transition-all duration-500" />

            <Avatar className="w-28 h-28 ring-4 ring-green-500/20 shadow-2xl transition-transform group-hover:scale-105 duration-500">
              <AvatarImage
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
              />
              <AvatarFallback className="text-3xl font-black bg-green-600 text-foreground">
                @{user.username?.substring(0, 2)}
              </AvatarFallback>
            </Avatar>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -bottom-1 -right-1 bg-green-500 text-foreground size-10 rounded-full flex items-center justify-center font-black text-xs border-4 border-background shadow-lg"
            >
              {stats.level}
            </motion.div>
          </div>

          <div className="mt-4 text-center">
            <h1 className="text-3xl font-black tracking-tight">
              {user.username}
            </h1>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-foreground/40 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                <Medal size={12} className="text-yellow-500" />
                {t("badge.pro")}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6 w-full">
            <Button className="h-12 rounded-[12px] bg-green-500 hover:bg-green-600 text-foreground font-black active:scale-95 transition-all shadow-lg shadow-green-500/20">
              <Edit size={16} className="mr-2" /> {t("actions.editInfo")}
            </Button>
            <Button
              variant="secondary"
              className="px-6 h-12 rounded-[12px] border bg-foreground/5 border-foreground/30 font-black active:scale-95 transition-all"
              onClick={() => setIsInviteModalOpen(true)}
            >
              <Share2 size={16} />
            </Button>
          </div>
        </motion.div>

        {/* PROGRESS CARD */}
        <motion.div variants={itemVariants}>
          <Card className="p-5 bg-foreground/5 border-foreground/10 rounded-[20px] backdrop-blur-xl relative overflow-hidden">
            <div className="flex justify-between items-end mb-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-black text-foreground/40 uppercase tracking-widest">
                  {t("progress.growth")}
                </span>
                <span className="text-lg font-black tracking-tight">
                  {t("progress.level")}
                </span>
              </div>
              <span className="text-xs font-black font-mono text-green-500">
                {stats.xp} / {stats.nextLevelXp} {t("currency.birr")}
              </span>
            </div>

            <div className="relative h-2.5 bg-foreground/5 rounded-full overflow-hidden border border-foreground/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(stats.xp / stats.nextLevelXp) * 100}%` }}
                transition={{ duration: 1.5, ease: "circOut" }}
                className="h-full bg-linear-to-r from-green-600 to-green-400 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.4)] relative"
              >
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-foreground/20 to-transparent" />
              </motion.div>
            </div>

            <p className="text-[10px] text-foreground/30 mt-3 text-center font-black uppercase tracking-widest">
              {t("progress.next", {
                amount: stats.nextLevelXp - stats.xp,
                level: stats.level + 1,
              })}
            </p>
          </Card>
        </motion.div>

        {/* STATS GRID */}
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: t("stats.wins"),
              value: stats.gamesWon,
              icon: <Trophy size={16} />,
              color: "text-green-500",
              bgColor: "bg-green-500/10",
              borderColor: "border-green-500/20",
            },
            {
              label: t("stats.rate"),
              value: stats.winRate,
              icon: <TrendingUp size={16} />,
              color: "text-emerald-500",
              bgColor: "bg-emerald-500/10",
              borderColor: "border-emerald-500/20",
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              whileHover={{ y: -4 }}
              className="flex-1"
            >
              <Card
                className={cn(
                  "p-4 border backdrop-blur-md bg-foreground/5 rounded-[20px] transition-all",
                  stat.borderColor,
                )}
              >
                <div
                  className={cn(
                    "inline-flex p-2 rounded-lg mb-4",
                    stat.bgColor,
                    stat.color,
                  )}
                >
                  {stat.icon}
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-black tracking-tighter">
                    {stat.value}
                  </span>
                  <span className="text-[10px] font-black text-foreground/40 uppercase tracking-widest">
                    {stat.label}
                  </span>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* RECENT ACTIVITY */}
        <motion.div variants={itemVariants} className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground/40">
              {t("recent.title")}
            </h3>
            <span className="text-[10px] font-black text-green-500 uppercase cursor-pointer">
              {t("recent.viewAll")}
            </span>
          </div>

          <div className="space-y-2">
            {recentGames.map((game, i) => (
              <motion.div
                key={i}
                whileHover={{ x: 4 }}
                className="flex items-center justify-between p-3 rounded-2xl bg-foreground/5 border border-foreground/5 group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "size-10 rounded-xl flex items-center justify-center font-black",
                      game.isWin
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-rose-500/10 text-rose-500",
                    )}
                  >
                    {game.isWin ? <Star size={18} /> : <Zap size={18} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black text-sm tracking-tight">
                      {game.result}
                    </span>
                    <span className="text-[10px] font-bold text-foreground/40 flex items-center gap-1">
                      <Clock size={10} /> {game.time} • {game.details}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col w-30 items-end">
                  <span
                    className={cn(
                      "font-black text-sm",
                      game.isWin ? "text-emerald-500" : "text-rose-500",
                    )}
                  >
                    {t("recent.amount", {
                      sign: game.isWin ? "+" : "-",
                      amount: game.xp,
                    })}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ACHIEVEMENTS */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground/40">
              {t("achievements.title")}
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {achievements.map((ach, i) => (
              <motion.div
                key={ach.name}
                whileHover={{ scale: 1.02 }}
                className={cn(
                  "p-4 rounded-[20px] border flex items-center gap-4 transition-all relative overflow-hidden",
                  ach.unlocked
                    ? "bg-foreground/5 border-foreground/10 shadow-lg"
                    : "bg-foreground/5 border-foreground/5 opacity-40 grayscale",
                )}
              >
                {/* Status Badge */}
                {!ach.unlocked && (
                  <div className="absolute top-3 right-3">
                    <Badge
                      variant="outline"
                      className="text-[8px] font-black uppercase text-foreground/40 border-foreground/10 px-1.5 py-0"
                    >
                      {t("achievements.locked")}
                    </Badge>
                  </div>
                )}

                <div
                  className={cn(
                    "size-12 rounded-2xl flex items-center justify-center border transition-all",
                    ach.unlocked
                      ? cn(ach.bgColor, ach.borderColor, ach.color)
                      : "bg-foreground/5 border-foreground/10 text-foreground/20",
                  )}
                >
                  {ach.icon}
                </div>

                <div className="flex flex-col">
                  <span className="font-black text-sm tracking-tight">
                    {ach.name}
                  </span>
                  <span className="text-[10px] font-bold text-foreground/40 leading-tight pr-4">
                    {ach.desc}
                  </span>
                </div>

                {ach.unlocked && (
                  <div className="ml-auto">
                    <ChevronRight size={16} className="text-foreground/20" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* REFERRAL STATS */}
        <motion.div variants={itemVariants}>
          <ReferralStats />
        </motion.div>
      </motion.div>

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />
    </div>
  );
}
