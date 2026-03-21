"use client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import {
  useGetAgentWithdrawalsQuery,
  useApproveWithdrawalMutation,
  useRejectWithdrawalMutation,
} from "@/lib/api";
import {
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Filter,
  ChevronUp,
  ChevronDown,
  ArrowUpRight,
  User,
} from "lucide-react";
import { motion } from "framer-motion";
import type { AgentWithdrawal, WithdrawalStatus } from "@/lib/types";
import { useTranslations } from "next-intl";

export default function AgentWithdrawalsPage() {
  const t = useTranslations("agent.withdrawals");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [orderBy, setOrderBy] = useState("createdAt");
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

  const { data, isLoading, isFetching } = useGetAgentWithdrawalsQuery({
    status: statusFilter,
    search: search || undefined,
    page,
    limit,
    orderBy,
    sortOrder,
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
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {t("title")}
            </h1>
            <p className="text-xs text-muted-foreground">
              {t("totalRequests", { count: data?.total ?? 0 })}
            </p>
          </div>
          {isFetching && (
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative max-w-sm">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-2">
            <select
              value={orderBy}
              onChange={(event) => {
                setOrderBy(event.target.value);
              }}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="createdAt">{t("filters.sortDate")}</option>
              <option value="amount">{t("filters.sortAmount")}</option>
            </select>
            <select
              value={sortOrder}
              onChange={(event) => {
                setSortOrder(event.target.value as "asc" | "desc");
              }}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="desc">{t("filters.sortDesc")}</option>
              <option value="asc">{t("filters.sortAsc")}</option>
            </select>
          </div>
        </div>
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
        <>
          <div className="space-y-2.5">
            {withdrawals.map((w: AgentWithdrawal, i: number) => {
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
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : w.id)}
                      className="w-full flex items-center justify-between p-3.5 text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border ${w.status === "approved" ? "bg-blue-500/10 border-blue-500/20" : w.status === "rejected" ? "bg-red-500/10 border-red-500/20" : "bg-amber-500/10 border-amber-500/20"}`}
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
                            {w.firstName || w.username || t("unknown")}
                          </div>
                          <div className="text-[10px] text-foreground/40 font-medium truncate">
                            {w.phone} • {new Date(w.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className="font-black text-sm text-foreground">
                            {Number(w.amount).toFixed(2)}
                          </div>
                          <div className="text-[9px] text-foreground/40">
                            ETB
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp size={14} className="text-foreground/30" />
                        ) : (
                          <ChevronDown
                            size={14}
                            className="text-foreground/30"
                          />
                        )}
                      </div>
                    </button>
                    {/* Expanded details and actions */}
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3.5 pb-3.5 pt-1 space-y-3 border-t border-[#111827]">
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="flex items-center gap-1.5 text-foreground/50">
                              <User size={12} />
                              <span>{w.username || t("na")}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-foreground/50">
                              <Badge>{w.phone}</Badge>
                            </div>
                            <div className="flex items-center gap-1.5 text-foreground/50">
                              <Badge>
                                {Number(w.userBalance || 0).toFixed(2)} ETB
                              </Badge>
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
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                  <Button
                                    size="sm"
                                    className="bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg h-9 text-xs font-bold"
                                    onClick={() =>
                                      setConfirmAction({
                                        id: w.id,
                                        action: "approve",
                                      })
                                    }
                                    disabled={processing}
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
                                    disabled={processing}
                                  >
                                    <XCircle size={14} className="mr-1" />
                                    {t("actions.reject")}
                                  </Button>
                                </div>
                              ) : (
                                <motion.div
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="space-y-2 bg-foreground/5 rounded-xl p-3 mt-2"
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
                                      className={`flex-1 h-8 text-xs font-bold rounded-lg ${confirmAction.action === "approve" ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"}`}
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
                  </Card>
                </motion.div>
              );
            })}
          </div>
          {/* Pagination Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-6 px-2">
            <div className="text-sm text-muted-foreground">
              {t("pagination.info", {
                page,
                totalPages: Math.max(1, Math.ceil((data?.total ?? 0) / limit)),
                total: data?.total ?? 0
              })}
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>{t("pagination.rowsPerPage")}</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  {[5, 10, 20, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  {t("pagination.previous")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * limit >= (data?.total ?? 0)}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  {t("pagination.next")}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
