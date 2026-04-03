"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterSortModal } from "@/components/agent/FilterSortModal";
import {
  useGetAgentWithdrawalsQuery,
  useApproveWithdrawalMutation,
  useRejectWithdrawalMutation,
} from "@/lib/api";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Filter,
  Search,
  ChevronUp,
  ChevronDown,
  ArrowUpRight,
  User,
} from "lucide-react";
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
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [draftStatusFilter, setDraftStatusFilter] = useState(statusFilter);
  const [draftSortOrder, setDraftSortOrder] = useState(sortOrder);
  const [draftOrderBy, setDraftOrderBy] = useState(orderBy);

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

  useEffect(() => {
    if (!isFilterModalOpen) return;
    setDraftStatusFilter(statusFilter);
    setDraftSortOrder(sortOrder);
    setDraftOrderBy(orderBy);
  }, [isFilterModalOpen, orderBy, sortOrder, statusFilter]);

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

  const applyFilters = () => {
    setStatusFilter(draftStatusFilter);
    setSortOrder(draftSortOrder);
    setOrderBy(draftOrderBy);
    setPage(1);
    setIsFilterModalOpen(false);
  };

  const resetFilters = () => {
    setDraftStatusFilter("pending");
    setDraftSortOrder("desc");
    setDraftOrderBy("createdAt");
    setStatusFilter("pending");
    setSearch("");
    setSortOrder("desc");
    setOrderBy("createdAt");
    setPage(1);
    setIsFilterModalOpen(false);
  };

  const getStatusBadge = (status: WithdrawalStatus) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="gap-1 border-amber-500/20 bg-amber-500/10 text-[10px] text-amber-400">
            <Clock size={10} /> {t("status.pending")}
          </Badge>
        );
      case "approved":
        return (
          <Badge className="gap-1 border-blue-500/20 bg-blue-500/10 text-[10px] text-blue-400">
            <CheckCircle2 size={10} /> {t("status.approved")}
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="gap-1 border-red-500/20 bg-red-500/10 text-[10px] text-red-400">
            <XCircle size={10} /> {t("status.rejected")}
          </Badge>
        );
    }
  };

  const withdrawals = data?.withdrawals ?? [];
  const processing = approving || rejecting;

  return (
    <div className="space-y-4 pb-28">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t("title")}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t("totalRequests", { count: data?.total ?? 0 })}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 self-start lg:w-auto lg:min-w-[22rem]">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="min-h-[44px] w-full pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {isFetching ? (
              <div className="inline-flex min-h-[44px] items-center rounded-md border px-3 text-xs text-muted-foreground">
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Updating
              </div>
            ) : null}
            <FilterSortModal
              open={isFilterModalOpen}
              onOpenChange={setIsFilterModalOpen}
              title={t("title")}
              description={t("totalRequests", { count: data?.total ?? 0 })}
              onApply={applyFilters}
              onReset={resetFilters}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Status
                  </label>
                  <select
                    value={draftStatusFilter}
                    onChange={(e) => setDraftStatusFilter(e.target.value)}
                    className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="all">{t("status.all")}</option>
                    <option value="pending">{t("status.pending")}</option>
                    <option value="approved">{t("status.approved")}</option>
                    <option value="rejected">{t("status.rejected")}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Sort field
                  </label>
                  <select
                    value={draftOrderBy}
                    onChange={(e) => setDraftOrderBy(e.target.value)}
                    className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="createdAt">{t("filters.sortDate")}</option>
                    <option value="amount">{t("filters.sortAmount")}</option>
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Sort order
                  </label>
                  <select
                    value={draftSortOrder}
                    onChange={(e) =>
                      setDraftSortOrder(e.target.value as "asc" | "desc")
                    }
                    className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="desc">{t("filters.sortDesc")}</option>
                    <option value="asc">{t("filters.sortAsc")}</option>
                  </select>
                </div>
              </div>
            </FilterSortModal>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-2 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-foreground/5"
            />
          ))}
        </div>
      ) : !withdrawals.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-foreground/30">
          <Filter size={40} className="mb-3 opacity-40" />
          <p className="text-sm font-medium">{t("noWithdrawals")}</p>
          <p className="mt-1 text-xs">
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
                  <Card className="overflow-hidden rounded-xl border-[#111827] bg-[#050816]">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : w.id)}
                      className="flex w-full items-center justify-between p-3.5 text-left"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                            w.status === "approved"
                              ? "border-blue-500/20 bg-blue-500/10"
                              : w.status === "rejected"
                                ? "border-red-500/20 bg-red-500/10"
                                : "border-amber-500/20 bg-amber-500/10"
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
                          <div className="truncate text-sm font-bold text-foreground">
                            {w.firstName || w.username || t("unknown")}
                          </div>
                          <div className="truncate text-[10px] font-medium text-foreground/40">
                            {w.phone} • {new Date(w.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <div className="text-right">
                          <div className="text-sm font-black text-foreground">
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
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-3 border-t border-[#111827] px-3.5 pb-3.5 pt-1">
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
                            <div>{getStatusBadge(w.status as WithdrawalStatus)}</div>
                          </div>
                          {w.rejectionReason && (
                            <div className="rounded-lg bg-red-500/5 p-2 text-xs text-red-400/70">
                              {t("rejectionReasonLabel", {
                                reason: w.rejectionReason,
                              })}
                            </div>
                          )}
                          {w.status === "pending" && (
                            <>
                              {!isConfirming ? (
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                  <Button
                                    size="sm"
                                    className="h-11 rounded-lg bg-blue-600/80 text-xs font-bold text-white hover:bg-blue-600"
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
                                    className="h-11 rounded-lg border-red-500/30 text-xs font-bold text-red-400 hover:bg-red-500/10"
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
                                  className="mt-2 space-y-2 rounded-xl bg-foreground/5 p-3"
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
                                      className="h-10 rounded-lg border-[#1f2937] bg-[#020617] text-xs"
                                    />
                                  )}
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      className={`h-10 flex-1 rounded-lg text-xs font-bold ${
                                        confirmAction.action === "approve"
                                          ? "bg-blue-600 text-white hover:bg-blue-700"
                                          : "bg-red-600 text-white hover:bg-red-700"
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
                                      className="h-10 rounded-lg text-xs"
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

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 px-2">
            <div className="text-sm text-muted-foreground">
              {t("pagination.info", {
                page,
                totalPages: Math.max(1, Math.ceil((data?.total ?? 0) / limit)),
                total: data?.total ?? 0,
              })}
            </div>
            <div className="flex flex-wrap items-center gap-3">
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
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[44px]"
                  disabled={page === 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  {t("pagination.previous")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[44px]"
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
    </div>
  );
}
