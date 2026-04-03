"use client";

import { ComponentType, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentPagination } from "@/components/agent/AgentPagination";
import { FilterSortModal } from "@/components/agent/FilterSortModal";
import { TableContainer } from "@/components/agent/TableContainer";
import {
  useGetAgentPaymentsQuery,
  useGetAgentPaymentStatsQuery,
} from "@/lib/api";
import { Payment } from "@/lib/types";
import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Calendar,
  CreditCard,
  Loader2,
  RefreshCw,
  Search,
  Wallet,
} from "lucide-react";
import { SubmitPaymentDialog } from "@/components/agent/SubmitPaymentDialog";
import { useTranslations } from "next-intl";

const STATUS_OPTIONS = ["all", "pending", "approved", "rejected"];

export default function AgentPaymentsPage() {
  const t = useTranslations("agent.payments");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [search, setSearch] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState<"amount" | "date">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState(status);
  const [draftSource, setDraftSource] = useState(source);
  const [draftMinAmount, setDraftMinAmount] = useState(minAmount);
  const [draftMaxAmount, setDraftMaxAmount] = useState(maxAmount);
  const [draftStartDate, setDraftStartDate] = useState(startDate);
  const [draftEndDate, setDraftEndDate] = useState(endDate);
  const [draftSortBy, setDraftSortBy] = useState(sortBy);
  const [draftSortOrder, setDraftSortOrder] = useState(sortOrder);

  const filters = useMemo(
    () => ({
      status,
      source,
      search: search.trim() || undefined,
      minAmount: minAmount ? Number(minAmount) : undefined,
      maxAmount: maxAmount ? Number(maxAmount) : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    [status, source, search, minAmount, maxAmount, startDate, endDate],
  );

  const { data, isLoading, isFetching } = useGetAgentPaymentsQuery({
    ...filters,
    page,
    pageSize,
    sortBy,
    sortOrder,
  });

  const {
    data: statsData,
    isFetching: statsFetching,
    refetch,
  } = useGetAgentPaymentStatsQuery(filters);

  const payments = data?.payments ?? [];
  const pagination = data?.pagination;
  const stats = statsData?.stats;
  const totalPages = pagination?.totalPages ?? 1;

  useEffect(() => {
    if (!isFilterModalOpen) return;
    setDraftStatus(status);
    setDraftSource(source);
    setDraftMinAmount(minAmount);
    setDraftMaxAmount(maxAmount);
    setDraftStartDate(startDate);
    setDraftEndDate(endDate);
    setDraftSortBy(sortBy);
    setDraftSortOrder(sortOrder);
  }, [
    endDate,
    isFilterModalOpen,
    maxAmount,
    minAmount,
    sortBy,
    sortOrder,
    source,
    startDate,
    status,
  ]);

  const resetFilters = () => {
    setDraftStatus("all");
    setDraftSource("all");
    setDraftMinAmount("");
    setDraftMaxAmount("");
    setDraftStartDate("");
    setDraftEndDate("");
    setDraftSortBy("date");
    setDraftSortOrder("desc");
    setStatus("all");
    setSource("all");
    setSearch("");
    setMinAmount("");
    setMaxAmount("");
    setStartDate("");
    setEndDate("");
    setSortBy("date");
    setSortOrder("desc");
    setPage(1);
    setIsFilterModalOpen(false);
  };

  const applyFilters = () => {
    setStatus(draftStatus);
    setSource(draftSource.trim() || "all");
    setMinAmount(draftMinAmount);
    setMaxAmount(draftMaxAmount);
    setStartDate(draftStartDate);
    setEndDate(draftEndDate);
    setSortBy(draftSortBy);
    setSortOrder(draftSortOrder);
    setPage(1);
    setIsFilterModalOpen(false);
  };

  return (
    <div className="space-y-5 pb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-row gap-3 justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>

          {/* refresh button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              refetch();
            }}
            disabled={isLoading}
            className="h-9 w-9 rounded-lg"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
        <div className="flex w-full flex-col gap-2 self-start lg:w-auto lg:min-w-[24rem] lg:self-auto">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t("filters.searchPlaceholder")}
              className="min-h-[44px] w-full pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <FilterSortModal
              open={isFilterModalOpen}
              onOpenChange={setIsFilterModalOpen}
              title={t("filters.title")}
              description={t("subtitle")}
              onApply={applyFilters}
              onReset={resetFilters}
              resetLabel={t("filters.reset")}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t("filters.minAmount")}
                  </label>
                  <Input
                    type="number"
                    value={draftMinAmount}
                    onChange={(e) => setDraftMinAmount(e.target.value)}
                    placeholder={t("filters.minAmount")}
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t("filters.maxAmount")}
                  </label>
                  <Input
                    type="number"
                    value={draftMaxAmount}
                    onChange={(e) => setDraftMaxAmount(e.target.value)}
                    placeholder={t("filters.maxAmount")}
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t("filters.statusPrefix")}
                  </label>
                  <select
                    value={draftStatus}
                    onChange={(e) => setDraftStatus(e.target.value)}
                    className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {STATUS_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {t("filters.statusPrefix")}
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t("filters.sourcePlaceholder")}
                  </label>
                  <Input
                    value={draftSource === "all" ? "" : draftSource}
                    onChange={(e) => setDraftSource(e.target.value)}
                    placeholder={t("filters.sourcePlaceholder")}
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t("records.columns.date")}
                  </label>
                  <Input
                    type="date"
                    value={draftStartDate}
                    onChange={(e) => setDraftStartDate(e.target.value)}
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t("records.columns.date")}
                  </label>
                  <Input
                    type="date"
                    value={draftEndDate}
                    onChange={(e) => setDraftEndDate(e.target.value)}
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t("filters.sortDate")}
                  </label>
                  <select
                    value={draftSortBy}
                    onChange={(e) =>
                      setDraftSortBy(e.target.value as "amount" | "date")
                    }
                    className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="date">{t("filters.sortDate")}</option>
                    <option value="amount">{t("filters.sortAmount")}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t("filters.sortDesc")}
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
            <SubmitPaymentDialog />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatsCard
          title={t("stats.totalRecords")}
          value={stats?.totalCount ?? 0}
          icon={CreditCard}
        />
        <StatsCard
          title={t("stats.approved")}
          value={stats?.approvedCount ?? 0}
          icon={Wallet}
        />
        <StatsCard
          title={t("stats.pending")}
          value={stats?.pendingCount ?? 0}
          icon={Calendar}
        />
        <StatsCard
          title={t("stats.totalAmount")}
          value={(stats?.totalAmount ?? 0).toLocaleString()}
          icon={sortOrder === "asc" ? ArrowUpWideNarrow : ArrowDownWideNarrow}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">{t("records.title")}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {t("records.pagination", {
              page: pagination?.page ?? 1,
              totalPages,
              total: pagination?.total ?? 0,
            })}
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <TableContainer className="max-h-[700px]">
              <table className="hidden w-full min-w-[700px] text-sm md:table">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-2 py-3">{t("records.columns.id")}</th>
                    <th className="px-2 py-3">{t("records.columns.user")}</th>
                    <th className="hidden px-2 py-3 lg:table-cell">
                      {t("records.columns.name")}
                    </th>
                    <th className="px-2 py-3">{t("records.columns.amount")}</th>
                    <th className="px-2 py-3">{t("records.columns.status")}</th>
                    <th className="hidden px-2 py-3 lg:table-cell">
                      {t("records.columns.date")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-10 text-center text-muted-foreground"
                      >
                        {t("records.empty")}
                      </td>
                    </tr>
                  ) : (
                    payments.map((payment: Payment) => (
                      <PaymentRow key={payment.id} payment={payment} />
                    ))
                  )}
                </tbody>
              </table>

              <div className="flex flex-col gap-3 py-2 md:hidden">
                {payments.length === 0 ? (
                  <div className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
                    {t("records.empty")}
                  </div>
                ) : (
                  payments.map((payment: Payment) => (
                    <div
                      key={payment.id}
                      className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {payment.firstName ||
                              payment.username ||
                              t("records.unknown")}
                          </span>
                          <span className="block truncate text-[10px] text-muted-foreground">
                            @{payment.username || payment.id.slice(0, 8)} • ID:{" "}
                            {payment.id.slice(0, 8)}
                          </span>
                        </div>
                        <Badge
                          className={`ml-2 shrink-0 text-[10px] capitalize ${
                            payment.status === "approved"
                              ? "border-green-500/20 bg-green-500/10 text-green-500"
                              : payment.status === "rejected"
                                ? "border-red-500/20 bg-red-500/10 text-red-500"
                                : "border-amber-500/20 bg-amber-500/10 text-amber-500"
                          }`}
                          variant="outline"
                        >
                          {payment.status}
                        </Badge>
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-3">
                        <span className="text-lg font-black tracking-tight">
                          {payment.amount}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            ETB
                          </span>
                        </span>

                        <div className="ml-4 flex min-w-0 flex-1 flex-col items-end justify-center">
                          <span className="text-xs font-medium text-muted-foreground">
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </span>
                          <span className="text-[10px] text-muted-foreground/70">
                            {new Date(payment.createdAt).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TableContainer>
          )}

          <AgentPagination
            page={page}
            pageSize={pageSize}
            total={pagination?.total ?? 0}
            totalPages={totalPages}
            summaryText={t("records.pagination", {
              page: pagination?.page ?? 1,
              totalPages,
              total: pagination?.total ?? 0,
            })}
            previousLabel={t("records.previous")}
            nextLabel={t("records.next")}
            renderPageSizeOption={(size) => t("records.perPage", { size })}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            className="mt-4"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number | string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentRow({ payment }: { payment: Payment }) {
  const t = useTranslations("agent.payments");

  return (
    <tr className="border-b text-xs hover:bg-muted/30 last:border-0">
      <td className="px-2 py-3 font-medium opacity-50">
        {payment.id.slice(0, 8)}...
      </td>
      <td className="px-2 py-3">@{payment.username || t("records.unknown")}</td>
      <td className="hidden px-2 py-3 lg:table-cell">
        {payment.firstName || t("records.unknown")}
      </td>
      <td className="px-2 py-3 font-bold">{payment.amount}</td>
      <td className="px-2 py-3">
        <Badge
          className={
            payment.status === "approved"
              ? "border-green-500/20 bg-green-500/10 text-green-500"
              : payment.status === "rejected"
                ? "border-red-500/20 bg-red-500/10 text-red-500"
                : "border-amber-500/20 bg-amber-500/10 text-amber-500"
          }
        >
          {payment.status}
        </Badge>
      </td>
      <td className="hidden px-2 py-3 text-muted-foreground lg:table-cell">
        {new Date(payment.createdAt).toLocaleString()}
      </td>
    </tr>
  );
}
