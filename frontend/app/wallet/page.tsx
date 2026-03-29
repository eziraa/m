"use client";
import { format } from "date-fns";

import { useAuth } from "@/providers/auth.provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Plus,
  Trophy,
  Gamepad2,
  Star,
  X,
  CreditCard,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

import {
  useGetWalletQuery,
  useGetTransactionsQuery,
  useDepositMutation,
  useWithdrawMutation,
} from "@/lib/api";
import { Transaction } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function WalletPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const t = useTranslations("wallet");

  // RTK Query Hooks
  const { data: walletData, isLoading: walletLoading } = useGetWalletQuery(
    undefined,
    {
      skip: !user,
    },
  );
  const { data: transactionsData, isLoading: txLoading } =
    useGetTransactionsQuery(activeTab, {
      skip: !user,
    });

  const [deposit, { isLoading: depositLoading }] = useDepositMutation();
  const [withdraw, { isLoading: withdrawLoading }] = useWithdrawMutation();

  const balance = walletData?.balance ?? 0;
  const transactions = (transactionsData as Transaction[]) || [];
  const loading = walletLoading || txLoading;

  // Dialog states
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState("");

  const processing = depositLoading || withdrawLoading;

  const handleTransaction = async (type: "deposit" | "withdraw") => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return toast.error(t("errors.invalidAmount"));

    try {
      if (type === "deposit") {
        const res = await deposit({ amount: val }).unwrap();
        if (res.success) {
          toast.success(t("toast.depositSuccess"));
          setDepositOpen(false);
          setAmount("");
        }
      } else {
        const res = await withdraw({
          amount: val,
          method: "Credit Card",
        }).unwrap();
        if (res.success) {
          toast.success(t("toast.withdrawSuccess"));
          setWithdrawOpen(false);
          setAmount("");
        }
      }
    } catch (error: any) {
      toast.error(error.data?.error || t("errors.transactionFailed"));
    }
  };

  if (!user) return null;

  // Helper to group transactions by date
  const groupedTransactions = transactions.reduce(
    (groups, tx) => {
      const date = new Date(tx.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: undefined,
      });
      const today = new Date().toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      const key = date === today ? t("today") : date;

      if (!groups[key]) groups[key] = [];
      groups[key].push(tx);
      return groups;
    },
    {} as Record<string, typeof transactions>,
  );

  const getIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return <ArrowDownLeft className="text-emerald-400" size={20} />;
      case "withdrawal":
        return <ArrowUpRight className="text-rose-400" size={20} />;
      case "game_win":
        return <Trophy className="text-amber-400" size={20} />;
      case "game_lost":
        return <Gamepad2 className="text-blue-400" size={20} />;
      case "game_fee":
        return <CreditCard className="text-amber-400" size={20} />;
      case "referral_reward":
      case "referral_commission":
      case "welcome_bonus":
      case "adjustment":
      case "bonus":
        return <Star className="text-emerald-400" size={20} />;
      default:
        return <Wallet size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "approved":
        return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      case "pending":
        return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      case "failed":
      case "rejected":
        return "text-red-500 bg-red-500/10 border-red-500/20";
      default:
        return "text-slate-500";
    }
  };

  const formatTitle = (type: string) => {
    switch (type) {
      case "deposit":
        return t("transaction.deposit");
      case "withdrawal":
        return t("transaction.withdrawal");
      case "game_win":
        return t("transaction.gameWin");
      case "game_lost":
        return t("transaction.gameLost");
      case "referral_reward":
        return t("transaction.referralReward");
      case "referral_commission":
        return t("transaction.referralCommission");
      case "welcome_bonus":
        return t("transaction.welcomeBonus");
      case "adjustment":
        return t("transaction.adjustment");
      case "game_fee":
        return t("transaction.gameFee");
      case "bonus":
        return t("transaction.bonus");
      default:
        return t("transaction.default");
    }
  };

  const getStatusLabel = (status: string, type?: string) => {
    const isWithdrawal = type === "withdrawal";
    switch (status) {
      case "completed":
      case "approved":
        return isWithdrawal ? t("status.approved") : t("status.completed");
      case "pending":
        return t("status.pending");
      case "failed":
      case "rejected":
        return isWithdrawal ? t("status.rejected") : t("status.failed");
      default:
        return status;
    }
  };

  return (
    <div className="flex flex-col gap-4 px-3 w-full">
      {/* ... Header ... */}

      {/* BALANCE CARD */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-linear-to-br to-indigo-600 from-indigo-500 via-blue-500  p-4 px-6 self-stretch text-foreground shadow-2xl shadow-blue-900/40 mb-6 group"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-foreground/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-start text-center">
          <p className="font-medium text-blue-100/80 mb-2 uppercase tracking-widest text-xs">
            {t("balance.title")}
          </p>
          <h2 className="text-6xl font-black tracking-tighter mb-4 drop-shadow-lg">
            <span className="text-2xl align-top opacity-60 mr-2">ETB</span>
            {balance.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </h2>

          <div className="grid grid-cols-2 gap-2 w-full ">
            <Button
              className="bg-foreground text-blue-600 hover:bg-blue-50 hover:text-blue-700 font-bold h-12 rounded-2xl text-sm shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 border-0"
              onClick={() => router.push("/deposit")}
            >
              <Plus size={16} className="mr-0.5" /> {t("balance.deposit")}
            </Button>
            <Button
              className="bg-red-500  text-foreground hover:bg-red-600 border border-foreground/10 font-bold h-12 rounded-2xl text-sm backdrop-blur-md shadow-lg transition-all hover:-translate-y-0.5"
              onClick={() => router.push("/withdraw")}
            >
              <ArrowUpRight size={16} className="mr-0.5" />{" "}
              {t("balance.withdraw")}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Inputs Dialogs */}
      <AnimatePresence>
        {depositOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDepositOpen(false)}
            className="fixed inset-0 z-1000 bg-foreground/10 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center overflow-hidden"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none select-none overflow-hidden">
              <div className="text-foreground text-[15vw] font-black break-all foregroundspace-pre-wrap leading-none opacity-20 transform -rotate-12 translate-y-[-10%]">
                {Array.from({ length: 50 }).map((_, idx) => (
                  <span key={idx} className="mr-8 rotate-45">
                    {Math.floor(Math.random() * 100)}
                  </span>
                ))}
              </div>
            </div>

            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative z-10 w-full max-w-[400px] bg-background  py-10 p-6 rounded-2xl flex flex-col items-center "
            >
              {/* Close Icon */}
              <motion.button
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={() => setDepositOpen(false)}
                className="absolute top-4 right-4 z-10"
              >
                <X size={24} className="text-foreground/70" />
              </motion.button>
              <h1 className="text-[20px] font-black text-foreground  tracking-tight ">
                {t("deposit.title")}
              </h1>

              <p className="text-foreground/70 leading-[1.2] font-black text mb-3  tracking-tight px-4">
                {t("deposit.subtitle")}
              </p>
              <div className="py-4 space-y-4 w-full">
                <div className="text-center">
                  <div className="text-4xl font-black text-primary">
                    {amount || "0"} <span className="text-2xl">ETB</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 w-full gap-2">
                  {[10, 50, 100].map((val) => (
                    <button
                      key={val}
                      className="bg-foreground/15 border border-foreground/30 rounded-[8px] h-9 "
                      onClick={() => setAmount(val.toString())}
                    >
                      {val} ETB
                    </button>
                  ))}
                </div>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={t("amountPlaceholder")}
                  className="flex h-10 w-full rounded-[10px] border border-foreground/30 bg-background px-3 py-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/30 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <Button
                  className="w-full h-13 rounded-[10px] font-bold"
                  onClick={() => handleTransaction("deposit")}
                  disabled={processing}
                >
                  {processing ? t("deposit.processing") : t("deposit.confirm")}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {withdrawOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setWithdrawOpen(false)}
            className="fixed inset-0 z-1000 bg-foreground/10 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center overflow-hidden"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none select-none overflow-hidden">
              <div className="text-foreground text-[15vw] font-black break-all foregroundspace-pre-wrap leading-none opacity-20 transform -rotate-12 translate-y-[-10%]">
                {Array.from({ length: 50 }).map((_, idx) => (
                  <span key={idx} className="mr-8 rotate-45">
                    {Math.floor(Math.random() * 100)}
                  </span>
                ))}
              </div>
            </div>

            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative z-10 w-full max-w-[400px] bg-background gap-2 py-10 p-6 rounded-2xl flex flex-col items-center "
            >
              {/* Close Icon */}
              <motion.button
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={() => setWithdrawOpen(false)}
                className="absolute top-4 right-4 z-10"
              >
                <X size={24} className="text-foreground/70" />
              </motion.button>
              <h1 className="text-[20px] font-black text-foreground  tracking-tight ">
                {t("withdraw.title")}
              </h1>

              <p className="text-foreground/70 leading-[1.2] font-black text mb-3  tracking-tight px-4">
                {t("withdraw.subtitle")}
              </p>
              <div className="py-4 space-y-4 w-full">
                <div className="text-center">
                  <div className="text-4xl font-black text-rose-500">
                    {amount || "0"} <span className="text-2xl">ETB</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[10, 50, 100].map((val) => (
                    <button
                      key={val}
                      className="bg-foreground/15 border border-foreground/30 rounded-[8px] h-9 "
                      onClick={() => setAmount(val.toString())}
                    >
                      {val} ETB
                    </button>
                  ))}
                </div>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={t("amountPlaceholder")}
                  className="flex h-10 w-full rounded-[10px] border border-foreground/30 bg-background px-3 py-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/30 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <Button
                  className="w-full h-13 font-bold rounded-[10px]"
                  onClick={() => handleTransaction("withdraw")}
                  disabled={processing}
                >
                  {processing
                    ? t("withdraw.processing")
                    : t("withdraw.confirm")}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transactions Tabs */}
      <div className="w-full px-4 bg-foreground/80 dark:bg-black/80 rounded-2xl pb-6">
        <Tabs
          defaultValue="all"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full "
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-sm flex items-center gap-2">
              {t("transactions.title")}
            </h3>
            <TabsList className="bg-black/10 border border-foreground/5 rounded-full p-1 h-9">
              <TabsTrigger
                value="all"
                className="rounded-full text-xs h-7 px-3 data-[state=active]:bg-primary data-[state=active]:text-foreground"
              >
                {t("transactions.tabs.all")}
              </TabsTrigger>
              <TabsTrigger
                value="in"
                className="rounded-full text-xs h-7 px-3 data-[state=active]:bg-emerald-500 data-[state=active]:text-foreground"
              >
                {t("transactions.tabs.in")}
              </TabsTrigger>
              <TabsTrigger
                value="out"
                className="rounded-full text-xs h-7 px-3 data-[state=active]:bg-rose-500 data-[state=active]:text-foreground"
              >
                {t("transactions.tabs.out")}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value={activeTab}
            className="space-y-6"
          >
            {loading ? (
              <div className="text-center py-10 text-muted-foreground animate-pulse">
                {t("transactions.loading")}
              </div>
            ) : Object.keys(groupedTransactions).length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                {t("transactions.empty")}
              </div>
            ) : (
              Object.entries(groupedTransactions).map(
                ([date, txs], groupIndex) => (
                  <div key={date}>
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: groupIndex * 0.1 }}
                      className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 ml-1"
                    >
                      {date}
                    </motion.div>

                    <div className="space-y-3">
                      {txs.map((tx, i) => (
                        <motion.div
                          key={tx.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: groupIndex * 0.1 + i * 0.05 }}
                        >
                          <Card className="flex flex-row items-center justify-between p-3 sm:p-4 bg-blue-600/5 border-blue-600/50 hover:bg-blue-600/10 hover:border-blue-600/10 transition-all cursor-pointer group rounded-[10px] backdrop-blur-md gap-2">
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                              <div
                                className={`w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-[12px] sm:rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-105 shadow-inner ${
                                  +tx.amount > 0
                                    ? "bg-emerald-500/10 border-emerald-500/20"
                                    : "bg-foreground/5 border-foreground/10"
                                }`}
                              >
                                {getIcon(tx.type)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-sm tracking-tight text-foreground truncate">
                                  {formatTitle(tx.type)}
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate font-medium flex items-center gap-1">
                                  {tx.description || tx.type}
                                </div>
                                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                  {format(new Date(tx.createdAt), "h:mm a")}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <div
                                className={`font-black text-sm sm:text-base mb-1 ${
                                  +tx.amount > 0
                                    ? "text-emerald-400"
                                    : "text-red-500"
                                }`}
                              >
                                {Number(tx.amount) > 0 ? "+" : ""}
                                {Number(tx.amount).toFixed(2)}
                              </div>
                              <Badge
                                variant="outline"
                                className={`text-[10px] h-5 px-1.5 font-bold border ${getStatusColor(tx.status)}`}
                              >
                                {getStatusLabel(tx.status, tx.type)}
                              </Badge>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ),
              )
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
