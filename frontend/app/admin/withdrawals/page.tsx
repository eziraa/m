"use client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import {
  useGetAdminWithdrawalsQuery,
  useApproveWithdrawalMutation,
  useRejectWithdrawalMutation,
} from "@/lib/api";
import {
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  ArrowUpRight,
  Phone,
  User,
  Wallet,
  Filter,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import type { AdminWithdrawal, WithdrawalStatus } from "@/lib/types";
import { useTranslations } from "next-intl";

export default function AdminWithdrawalsPage() {
  const t = useTranslations("admin.withdrawals");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    action: "approve" | "reject";
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Get balance of

  const STATUS_FILTERS = [
    { label: t("status.all"), value: "all" },
    { label: t("status.pending"), value: "pending" },
    { label: t("status.approved"), value: "approved" },
    { label: t("status.rejected"), value: "rejected" },
  ];

  const { data, isLoading, isFetching } = useGetAdminWithdrawalsQuery({
    status: statusFilter,
    search: search || undefined,
    page: 1,
    limit: 50,
  });

  const [approveWithdrawal, { isLoading: approving }] =
    useApproveWithdrawalMutation();
  const [rejectWithdrawal, { isLoading: rejecting }] =
    useRejectWithdrawalMutation();

  const handleApprove = async (id: string) => {
    try {
      const res = await approveWithdrawal(id).unwrap();
      if (res.success) {
        toast.success(t("toast.approved"));
        setConfirmAction(null);
        setExpandedId(null);
      }
    } catch (error: any) {
      toast.error(error.data?.error || t("toast.approveFailed"));
    }
  };

  const handleReject = async (id: string) => {
    try {
      const res = await rejectWithdrawal({
        id,
        reason: rejectReason || undefined,
      }).unwrap();
      if (res.success) {
        toast.success(t("toast.rejected"));
        setConfirmAction(null);
        setRejectReason("");
        setExpandedId(null);
      }
    } catch (error: any) {
      toast.error(error.data?.error || t("toast.rejectFailed"));
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
          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] gap-1">
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

  const withdrawals = data?.withdrawals ?? [];
  const processing = approving || rejecting;

  return (
    <div className="bg-background min-h-screen pb-20 px-4 flex flex-col py-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-foreground tracking-tight">
            {t("title")}
          </h1>
          <p className="text-xs text-foreground/40 font-medium">
            {t("totalRequests", { count: data?.total ?? 0 })}
          </p>
        </div>
        {isFetching && (
          <Loader2 size={16} className="animate-spin text-foreground/40" />
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
        />
        <Input
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9 text-sm bg-[#050816] border-[#111827] rounded-xl focus-visible:ring-1 focus-visible:ring-blue-500"
        />
      </div>

      {/* Status Filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all ${
              statusFilter === f.value
                ? f.value === "pending"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : f.value === "approved"
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : f.value === "rejected"
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : "bg-foreground/5 text-foreground/40 border border-transparent hover:bg-foreground/10"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Withdrawal List */}
      {isLoading ? (
        <div className="space-y-3 mt-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-foreground/5 animate-pulse"
            />
          ))}
        </div>
      ) : !withdrawals.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-foreground/30">
          <Filter size={40} className="mb-3 opacity-40" />
          <p className="text-sm font-medium">{t("noWithdrawals")}</p>
          <p className="text-xs mt-1">
            {search
              ? t("tryDifferentSearch")
              : t("noStatusRequests", {
                  status:
                    statusFilter !== "all" ? t(`status.${statusFilter}`) : "",
                })}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {withdrawals.map((w: AdminWithdrawal, i: number) => {
            const isExpanded = expandedId === w.id;
            const isConfirming = confirmAction?.id === w.id;

            return (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="bg-[#050816] border-[#111827] rounded-xl overflow-hidden">
                  {/* Main row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : w.id)}
                    className="w-full flex items-center justify-between p-3.5 text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border ${
                          w.status === "approved"
                            ? "bg-blue-500/10 border-blue-500/20"
                            : w.status === "rejected"
                              ? "bg-red-500/10 border-red-500/20"
                              : "bg-amber-500/10 border-amber-500/20"
                        }`}
                      >
                        <ArrowUpRight
                          size={18}
                          className={
                            w.status === "approved"
                              ? "text-blue-400"
                              : w.status === "rejected"
                                ? "text-red-400"
                                : "text-amber-400"
                          }
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-foreground truncate">
                          {w.firstName || w.username || "Unknown User"}
                        </div>
                        <div className="text-[10px] text-foreground/40 font-medium truncate">
                          {w.phone} •{" "}
                          {format(new Date(w.createdAt), "MMM d, h:mm a")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <div className="font-black text-sm text-foreground">
                          {Number(w.amount).toFixed(2)}
                        </div>
                        <div className="text-[9px] text-foreground/40">ETB</div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={14} className="text-foreground/30" />
                      ) : (
                        <ChevronDown size={14} className="text-foreground/30" />
                      )}
                    </div>
                  </button>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3.5 pb-3.5 pt-1 space-y-3 border-t border-[#111827]">
                          {/* Details grid */}
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="flex items-center gap-1.5 text-foreground/50">
                              <User size={12} />
                              <span>{w.username || "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-foreground/50">
                              <Phone size={12} />
                              <span>{w.phone}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-foreground/50">
                              <Wallet size={12} />
                              <span>
                                {t("userBalance", {
                                  amount: Number(w.userBalance || 0).toFixed(2),
                                })}
                              </span>
                            </div>
                            <div>
                              {getStatusBadge(w.status as WithdrawalStatus)}
                            </div>
                          </div>

                          {w.rejectionReason && (
                            <div className="text-xs text-red-400/70 bg-red-500/5 rounded-lg p-2">
                              {t("rejectionReasonLabel", {
                                reason: w.rejectionReason,
                              })}
                            </div>
                          )}

                          {/* Actions for pending */}
                          {w.status === "pending" && (
                            <>
                              {!isConfirming ? (
                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    size="sm"
                                    className="bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg h-9 text-xs font-bold"
                                    onClick={() =>
                                      setConfirmAction({
                                        id: w.id,
                                        action: "approve",
                                      })
                                    }
                                  >
                                    <CheckCircle2 size={14} className="mr-1" />
                                    {t("actions.approve")}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg h-9 text-xs font-bold"
                                    onClick={() =>
                                      setConfirmAction({
                                        id: w.id,
                                        action: "reject",
                                      })
                                    }
                                  >
                                    <XCircle size={14} className="mr-1" />
                                    {t("actions.reject")}
                                  </Button>
                                </div>
                              ) : (
                                <motion.div
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="space-y-2 bg-foreground/5 rounded-xl p-3"
                                >
                                  <p className="text-xs font-bold text-foreground/70">
                                    {confirmAction.action === "approve"
                                      ? t("confirmApprove", {
                                          amount: Number(w.amount).toFixed(2),
                                        })
                                      : t("confirmReject")}
                                  </p>
                                  {confirmAction.action === "reject" && (
                                    <Input
                                      placeholder={t("reasonPlaceholder")}
                                      value={rejectReason}
                                      onChange={(e) =>
                                        setRejectReason(e.target.value)
                                      }
                                      className="h-8 text-xs bg-[#020617] border-[#1f2937] rounded-lg"
                                    />
                                  )}
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      className={`flex-1 h-8 text-xs font-bold rounded-lg ${
                                        confirmAction.action === "approve"
                                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                                          : "bg-red-600 hover:bg-red-700 text-white"
                                      }`}
                                      onClick={() =>
                                        confirmAction.action === "approve"
                                          ? handleApprove(w.id)
                                          : handleReject(w.id)
                                      }
                                      disabled={processing}
                                    >
                                      {processing ? (
                                        <Loader2
                                          size={12}
                                          className="animate-spin"
                                        />
                                      ) : (
                                        t("actions.confirm")
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 text-xs rounded-lg"
                                      onClick={() => {
                                        setConfirmAction(null);
                                        setRejectReason("");
                                      }}
                                    >
                                      {t("actions.cancel")}
                                    </Button>
                                  </div>
                                </motion.div>
                              )}
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
