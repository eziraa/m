"use client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { toast } from "sonner";
import {
  useGetWalletQuery,
  useCreateWithdrawalMutation,
  useGetUserWithdrawalsQuery,
  useGetWithdrawalEligibilityQuery,
} from "@/lib/api";
import { useAuth } from "@/providers/auth.provider";
import {
  ArrowUpRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Gamepad2,
  Wallet,
  PiggyBank,
  Phone,
  Loader2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import type { Withdrawal, WithdrawalStatus } from "@/lib/types";
import { useTranslations } from "next-intl";

const PHONE_REGEX = /^(\+251|0)9\d{8}$/;

type WithdrawFormValues = {
  amount: string;
  phone: string;
};

export default function WithdrawPage() {
  const t = useTranslations("withdraw");
  const { user } = useAuth();
  const [createWithdrawal, { isLoading: submitting }] =
    useCreateWithdrawalMutation();
  const { data: walletData, isLoading: walletLoading } = useGetWalletQuery(
    undefined,
    { skip: !user },
  );
  const { data: eligibility, isLoading: eligLoading } =
    useGetWithdrawalEligibilityQuery(undefined, { skip: !user });
  const { data: historyData, isLoading: historyLoading } =
    useGetUserWithdrawalsQuery(undefined, { skip: !user });

  const walletBalance = walletData?.balance ?? 0;

  const minWithdrawalAmount = eligibility?.minWithdrawalAmount ?? 100;
  const minAccountLeft = eligibility?.minAccountLeft ?? 50;
  const minDepositRequired = eligibility?.minDepositRequired ?? 50;
  const gamesRequired = eligibility?.gamesRequired ?? 20;
  const gamesPlayed = eligibility?.gamesPlayed ?? 0;
  const totalDeposit = eligibility?.totalDeposit ?? 0;
  const hasPending = eligibility?.hasPending ?? false;
  const displayBalance = eligibility?.balance ?? walletBalance;

  const quickAmounts = useMemo(() => [100, 200, 500, 1000], []);

  const missingGames = Math.max(0, gamesRequired - gamesPlayed);
  const missingDeposit = Math.max(0, minDepositRequired - totalDeposit);
  const canWithdrawAny = displayBalance - minAccountLeft >= minWithdrawalAmount;

  const schema = useMemo(
    () =>
      z.object({
        amount: z
          .string()
          .min(1, t("validation.amountRequired"))
          .refine((v) => Number(v) > 0, t("validation.amountPositive"))
          .refine(
            (v) => Number(v) >= minWithdrawalAmount,
            t("validation.amountMin", { min: minWithdrawalAmount }),
          )
          .refine(
            (v) => Number(v) <= displayBalance,
            t("validation.amountLimit"),
          )
          .refine(
            (v) => displayBalance - Number(v) >= minAccountLeft,
            t("validation.amountMinLeft", { min: minAccountLeft }),
          ),
        phone: z
          .string()
          .min(1, t("validation.phoneRequired"))
          .refine(
            (v) => PHONE_REGEX.test(v.trim()),
            t("validation.phoneInvalid"),
          ),
      }),
    [displayBalance, minWithdrawalAmount, minAccountLeft, t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<WithdrawFormValues>({
    resolver: zodResolver(schema),
  });

  const amount = watch("amount");

  const onSubmit = async (data: WithdrawFormValues) => {
    if (eligLoading || walletLoading) return;

    if (hasPending) {
      toast.error(t("toast.hasPending"));
      return;
    }

    if (missingGames > 0) {
      toast.error(t("toast.needGames", { count: missingGames }));
      return;
    }

    if (missingDeposit > 0) {
      toast.error(t("toast.needDeposit", { amount: missingDeposit }));
      return;
    }

    if (!canWithdrawAny) {
      toast.error(
        t("toast.balanceTooLow", {
          minWithdraw: minWithdrawalAmount,
          minLeft: minAccountLeft,
        }),
      );
      return;
    }

    try {
      const res = await createWithdrawal({
        amount: +data.amount,
        phone: data.phone.trim(),
      }).unwrap();
      if (res.success) {
        toast.success(t("success"));
        reset();
      }
    } catch (error: any) {
      const apiErr = error?.data;
      switch (apiErr?.code) {
        case "min_withdrawal_amount":
          toast.error(
            t("serverErrors.minWithdrawalAmount", {
              min: apiErr?.minWithdrawalAmount ?? minWithdrawalAmount,
            }),
          );
          break;
        case "min_deposit_required":
          toast.error(
            t("serverErrors.minDepositRequired", {
              min: apiErr?.minDepositRequired ?? minDepositRequired,
            }),
          );
          break;
        case "min_games_required":
          toast.error(
            t("serverErrors.minGamesRequired", {
              min: apiErr?.gamesRequired ?? gamesRequired,
            }),
          );
          break;
        case "min_account_left":
          toast.error(
            t("serverErrors.minAccountLeft", {
              min: apiErr?.minAccountLeft ?? minAccountLeft,
            }),
          );
          break;
        case "pending_withdrawal_exists":
          toast.error(t("serverErrors.pendingWithdrawal"));
          break;
        default:
          toast.error(apiErr?.error || t("error"));
      }
    }
  };

  const getStatusBadge = (status: WithdrawalStatus) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] gap-1">
            <Clock size={10} /> {t("status.pending")}
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px] gap-1">
            <CheckCircle2 size={10} /> {t("status.approved")}
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px] gap-1">
            <XCircle size={10} /> {t("status.rejected")}
          </Badge>
        );
    }
  };

  const notEligible = !!eligibility && !eligibility.eligible;
  const showGamesWarning = !!eligibility && gamesPlayed < gamesRequired;
  const showDepositWarning = !!eligibility && totalDeposit < minDepositRequired;
  const showBalanceWarning = !!eligibility && !canWithdrawAny;

  return (
    <div className="flex flex-col gap-5 px-4 py-4 min-h-full">
      {/* Balance & Games Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl bg-linear-to-br from-emerald-600 to-green-700 p-4 px-5 text-foreground shadow-2xl shadow-green-900/40"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-400/15 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />

        <div className="relative z-10">
          <p className="font-medium text-green-100/80 uppercase tracking-widest text-xs mb-1">
            {t("balanceLabel")}
          </p>
          <h2 className="text-4xl font-black tracking-tighter mb-3 drop-shadow-lg">
            <span className="text-lg align-top opacity-60 mr-1">ETB</span>
            {eligLoading || walletLoading ? (
              <span className="animate-pulse">---</span>
            ) : (
              displayBalance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            )}
          </h2>

          <div className="flex items-center gap-2 text-xs text-green-100/80">
            <Gamepad2 size={14} />
            <span>
              {t("gamesPlayed", {
                played: gamesPlayed,
                required: gamesRequired,
              })}
            </span>
            {eligibility?.eligible && (
              <Badge className="bg-white/15 text-white border-0 text-[9px] ml-auto">
                ✓ {t("eligible")}
              </Badge>
            )}
          </div>
        </div>
      </motion.div>

      {/* Warnings */}
      <AnimatePresence>
        {showGamesWarning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-amber-400"
          >
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div className="text-xs">
              <p className="font-bold">{t("notEligibleTitle")}</p>
              <p className="text-amber-400/70">
                {t("notEligibleDesc", { count: gamesRequired - gamesPlayed })}
              </p>
            </div>
          </motion.div>
        )}
        {showDepositWarning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-amber-400"
          >
            <PiggyBank size={18} className="mt-0.5 shrink-0" />
            <div className="text-xs">
              <p className="font-bold">{t("depositNotEligibleTitle")}</p>
              <p className="text-amber-400/70">
                {t("depositNotEligibleDesc", { amount: missingDeposit })}
              </p>
            </div>
          </motion.div>
        )}
        {showBalanceWarning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-amber-400"
          >
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div className="text-xs">
              <p className="font-bold">{t("balanceNotEligibleTitle")}</p>
              <p className="text-amber-400/70">
                {t("balanceNotEligibleDesc", {
                  minWithdraw: minWithdrawalAmount,
                  minLeft: minAccountLeft,
                })}
              </p>
            </div>
          </motion.div>
        )}
        {hasPending && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-3 bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-green-400"
          >
            <Clock size={18} className="mt-0.5 shrink-0" />
            <div className="text-xs">
              <p className="font-bold">{t("hasPendingTitle")}</p>
              <p className="text-green-400/70">{t("hasPendingDesc")}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rules */}
      <Card className="bg-[#050816] border border-[#111827] rounded-2xl p-4 w-full text-foreground shadow-xl shadow-black/40">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-foreground/80">
            {t("rulesTitle")}
          </h3>
          <p className="text-[11px] text-foreground/40 font-medium">
            {t("rulesSubtitle")}
          </p>
        </div>
        <div className="mt-3 space-y-1.5 text-[11px] text-foreground/60">
          <div className="flex items-center justify-between gap-2">
            <span>{t("rules.minGames", { count: gamesRequired })}</span>
            <Badge className="bg-foreground/5 border border-foreground/10 text-[10px] text-foreground/50">
              {gamesPlayed}/{gamesRequired}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>{t("rules.minDeposit", { amount: minDepositRequired })}</span>
            <Badge className="bg-foreground/5 border border-foreground/10 text-[10px] text-foreground/50">
              {totalDeposit.toFixed(0)} ETB
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>
              {t("rules.minWithdraw", { amount: minWithdrawalAmount })}
            </span>
            <Badge className="bg-foreground/5 border border-foreground/10 text-[10px] text-foreground/50">
              {minWithdrawalAmount} ETB
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>{t("rules.minLeft", { amount: minAccountLeft })}</span>
            <Badge className="bg-foreground/5 border border-foreground/10 text-[10px] text-foreground/50">
              {minAccountLeft} ETB
            </Badge>
          </div>
        </div>
      </Card>

      {/* Withdrawal Form */}
      <Card className="bg-[#050816] border border-[#111827] rounded-2xl p-0 w-full text-foreground shadow-xl shadow-black/40">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 p-4"
        >
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-foreground/70 tracking-wide">
              {t("formTitle")}
            </h2>
            <p className="text-[11px] text-foreground/40 font-medium">
              {t("formSubtitle")}
            </p>
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-foreground/60 flex items-center gap-1.5">
              <Wallet size={12} /> {t("amountLabel")}
            </label>
            <div className="flex items-center gap-2 rounded-xl bg-[#020617] border border-[#1f2937] px-3 py-2.5">
              <Input
                placeholder="0.00"
                type="number"
                autoComplete="off"
                step="0.01"
                {...register("amount")}
                className="border-none bg-transparent p-3 font-semibold focus-visible:ring-1 focus-visible:ring-green-500 focus-visible:ring-offset-0"
              />
              <span className="ml-auto text-[11px] font-semibold text-foreground/50">
                ETB
              </span>
            </div>
            {/* Quick amounts */}
            <div className="grid grid-cols-4 gap-1.5">
              {quickAmounts.map((val) => (
                <button
                  key={val}
                  type="button"
                  disabled={
                    eligLoading ||
                    walletLoading ||
                    notEligible ||
                    val < minWithdrawalAmount ||
                    displayBalance - val < minAccountLeft
                  }
                  onClick={() => setValue("amount", val.toString())}
                  className={`text-[11px] font-semibold py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                    amount === val.toString()
                      ? "bg-green-600/30 text-green-400 border border-green-500/30"
                      : "bg-foreground/5 border border-foreground/10 text-foreground/50 hover:bg-foreground/10"
                  }`}
                >
                  {val} ETB
                </button>
              ))}
            </div>
            {errors.amount && (
              <span className="text-[11px] text-destructive mt-0.5">
                {errors.amount.message}
              </span>
            )}
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-foreground/60 flex items-center gap-1.5">
              <Phone size={12} /> - {t("phoneLabel")}
            </label>
            <div className="flex items-center gap-2 rounded-xl bg-[#020617] border border-[#1f2937] px-3 py-2.5">
              <Input
                placeholder="09xxxxxxxx"
                type="tel"
                autoComplete="off"
                {...register("phone")}
                className="border-none bg-transparent p-3 font-semibold focus-visible:ring-1 focus-visible:ring-green-500 focus-visible:ring-offset-0"
              />
            </div>
            {errors.phone && (
              <span className="text-[11px] text-destructive mt-0.5">
                {errors.phone.message}
              </span>
            )}
          </div>

          <Button
            className="mt-1 w-full rounded-xl text-sm font-semibold h-11 bg-green-600/90 hover:bg-green-600 text-white shadow-lg shadow-green-500/30 disabled:opacity-40"
            variant="default"
            type="submit"
            disabled={
              submitting ||
              eligLoading ||
              walletLoading ||
              notEligible ||
              hasPending
            }
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                {t("submitting")}
              </>
            ) : (
              <>
                <ArrowUpRight size={16} className="mr-1" />
                {t("submit")}
              </>
            )}
          </Button>

          <p className="text-[10px] leading-relaxed text-foreground/40">
            {t("processedNote")}
          </p>
        </form>
      </Card>

      {/* Withdrawal History */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-foreground/70 flex items-center gap-2">
          <Clock size={14} /> {t("recentRequests")}
        </h3>

        {historyLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-foreground/5 animate-pulse"
              />
            ))}
          </div>
        ) : !historyData?.withdrawals?.length ? (
          <div className="text-center py-8 text-foreground/30 text-sm">
            {t("noRequests")}
          </div>
        ) : (
          <div className="space-y-2.5">
            {historyData.withdrawals.map((w: Withdrawal, i: number) => (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="flex items-center justify-between  flex-row p-3.5 bg-[#050816] border-[#111827] rounded-xl">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                        w.status === "approved"
                          ? "bg-green-500/10 border-green-500/20"
                          : w.status === "rejected"
                            ? "bg-red-500/10 border-red-500/20"
                            : "bg-amber-500/10 border-amber-500/20"
                      }`}
                    >
                      <ArrowUpRight
                        size={18}
                        className={
                          w.status === "approved"
                            ? "text-green-400"
                            : w.status === "rejected"
                              ? "text-red-400"
                              : "text-amber-400"
                        }
                      />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-foreground">
                        -{Number(w.amount).toFixed(2)} ETB
                      </div>
                      <div className="text-[10px] text-foreground/40 font-medium">
                        {w.phone} •{" "}
                        {format(new Date(w.createdAt), "MMM d, h:mm a")}
                      </div>
                      {w.rejectionReason && (
                        <div className="text-[10px] text-red-400/70 mt-0.5">
                          {w.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>{getStatusBadge(w.status)}</div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
