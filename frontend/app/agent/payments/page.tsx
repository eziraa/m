"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Search,
  Wallet,
} from "lucide-react";
import { ComponentType, useMemo, useState } from "react";
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

  const { data: statsData, isFetching: statsFetching } =
    useGetAgentPaymentStatsQuery(filters);

  const payments = data?.payments ?? [];
  const pagination = data?.pagination;
  const stats = statsData?.stats;
  const totalPages = pagination?.totalPages ?? 1;

  const resetFilters = () => {
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
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {(isFetching || statsFetching) && (
            <div className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating
            </div>
          )}
          <SubmitPaymentDialog />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("filters.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative xl:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("filters.searchPlaceholder")}
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
              />
            </div>
            <Input
              type="number"
              placeholder={t("filters.minAmount")}
              value={minAmount}
              onChange={(e) => {
                setPage(1);
                setMinAmount(e.target.value);
              }}
            />
            <Input
              type="number"
              placeholder={t("filters.maxAmount")}
              value={maxAmount}
              onChange={(e) => {
                setPage(1);
                setMaxAmount(e.target.value);
              }}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <select
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {t("filters.statusPrefix")}{item}
                </option>
              ))}
            </select>
            <Input
              placeholder={t("filters.sourcePlaceholder")}
              value={source === "all" ? "" : source}
              onChange={(e) => {
                setPage(1);
                setSource(e.target.value.trim() || "all");
              }}
            />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setPage(1);
                setStartDate(e.target.value);
              }}
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setPage(1);
                setEndDate(e.target.value);
              }}
            />
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "amount" | "date")}
                className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="date">{t("filters.sortDate")}</option>
                <option value="amount">{t("filters.sortAmount")}</option>
              </select>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="desc">{t("filters.sortDesc")}</option>
                <option value="asc">{t("filters.sortAsc")}</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={resetFilters}>
              {t("filters.reset")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("records.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-48 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t("records.loading")}
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[700px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-sm hidden md:table">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-2 py-3">{t("records.columns.id")}</th>
                    <th className="px-2 py-3">{t("records.columns.user")}</th>
                    <th className="px-2 py-3">{t("records.columns.name")}</th>
                    <th className="px-2 py-3">{t("records.columns.amount")}</th>
                    <th className="px-2 py-3">{t("records.columns.status")}</th>
                    <th className="px-2 py-3">{t("records.columns.date")}</th>
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

              {/* Mobile View */}
              <div className="md:hidden flex flex-col gap-3 py-2">
                {payments.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground text-sm">
                    {t("records.empty")}
                  </div>
                ) : (
                  payments.map((payment: Payment) => (
                    <div
                      key={payment.id}
                      className="rounded-xl border bg-card text-card-foreground shadow-sm p-4 flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-semibold text-sm truncate">
                            {payment.firstName || payment.username || t("records.unknown")}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate">
                            @{payment.username || payment.id.slice(0, 8)} • ID: {payment.id.slice(0, 8)}
                          </span>
                        </div>
                        <Badge
                          className={`shrink-0 ml-2 text-[10px] capitalize ${
                            payment.status === "approved"
                              ? "bg-green-500/10 text-green-500 border-green-500/20"
                              : payment.status === "rejected"
                                ? "bg-red-500/10 text-red-500 border-red-500/20"
                                : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          }`}
                          variant="outline"
                        >
                          {payment.status}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        <span className="font-black tracking-tight text-lg">
                          {payment.amount} <span className="text-xs text-muted-foreground font-normal">ETB</span>
                        </span>
                        
                        <div className="flex flex-col items-end min-w-0 flex-1 ml-4 justify-center">
                          <span className="text-xs text-muted-foreground font-medium">
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </span>
                          <span className="text-[10px] text-muted-foreground/70">
                            {new Date(payment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-xs text-muted-foreground">
              {t("records.pagination", { page: pagination?.page ?? 1, totalPages, total: pagination?.total ?? 0 })}
            </p>
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPage(1);
                  setPageSize(Number(e.target.value));
                }}
                className="h-9 rounded-md border border-input bg-background px-2 text-xs"
              >
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {t("records.perPage", { size })}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
              >
                {t("records.previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={page >= totalPages}
              >
                {t("records.next")}
              </Button>
            </div>
          </div>
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
    <tr className="border-b last:border-0 hover:bg-muted/30 text-xs">
      <td className="px-2 py-3 font-medium opacity-50">
        {payment.id.slice(0, 8)}...
      </td>
      <td className="px-2 py-3">@{payment.username || t("records.unknown")}</td>
      <td className="px-2 py-3">{payment.firstName || t("records.unknown")}</td>
      <td className="px-2 py-3 font-bold">{payment.amount}</td>
      <td className="px-2 py-3">
        <Badge
          className={
            payment.status === "approved"
              ? "bg-green-500/10 text-green-500 border-green-500/20"
              : payment.status === "rejected"
                ? "bg-red-500/10 text-red-500 border-red-500/20"
                : "bg-amber-500/10 text-amber-500 border-amber-500/20"
          }
        >
          {payment.status}
        </Badge>
      </td>
      <td className="px-2 py-3 text-muted-foreground">
        {new Date(payment.createdAt).toLocaleString()}
      </td>
    </tr>
  );
}
