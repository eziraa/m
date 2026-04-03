"use client";

import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useGetAgentTransactionsQuery } from "@/lib/api";
import { Loader2, MoreHorizontal, Search, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Transaction } from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { FilterSortModal } from "@/components/agent/FilterSortModal";
import { TableContainer } from "@/components/agent/TableContainer";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function TransactionTable() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [orderBy, setOrderBy] = useState<"createdAt" | "amount">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [draftType, setDraftType] = useState(type);
  const [draftStatus, setDraftStatus] = useState(status);
  const [draftOrderBy, setDraftOrderBy] = useState(orderBy);
  const [draftSortOrder, setDraftSortOrder] = useState(sortOrder);
  const deferredSearch = useDeferredValue(search.trim());

  const queryArgs = useMemo(
    () => ({
      page,
      pageSize,
      search: deferredSearch || undefined,
      type,
      status,
      orderBy,
      sortOrder,
    }),
    [page, pageSize, deferredSearch, type, status, sortOrder, orderBy],
  );

  const { data, isLoading, isFetching } = useGetAgentTransactionsQuery(
    queryArgs,
    { skip: false },
  );
  const transactions = data?.transactions || [];
  const total = data?.total || 0;

  useEffect(() => {
    if (!isFilterModalOpen) return;
    setDraftType(type);
    setDraftStatus(status);
    setDraftOrderBy(orderBy);
    setDraftSortOrder(sortOrder);
  }, [isFilterModalOpen, orderBy, sortOrder, status, type]);

  const handleApplyFilters = () => {
    setType(draftType);
    setStatus(draftStatus);
    setOrderBy(draftOrderBy);
    setSortOrder(draftSortOrder);
    setPage(1);
    setIsFilterModalOpen(false);
  };

  const handleResetFilters = () => {
    setDraftType("all");
    setDraftStatus("all");
    setDraftOrderBy("createdAt");
    setDraftSortOrder("desc");
    setSearch("");
    setType("all");
    setStatus("all");
    setOrderBy("createdAt");
    setSortOrder("desc");
    setPage(1);
    setIsFilterModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-11 w-36" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="border-b bg-muted/40 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">
              Recent Transactions
            </h3>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Showing {transactions.length} of {total} records
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 self-start lg:w-auto lg:min-w-[22rem]">
            <div className="flex flex-row flex-wrap items-center justify-between gap-2 lg:justify-end">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by user or transaction details"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  className="flex-1 w-full pl-9"
                />
              </div>
              <FilterSortModal
                open={isFilterModalOpen}
                onOpenChange={setIsFilterModalOpen}
                title="Filter & Sort Transactions"
                description="Refine the current transaction list while keeping the existing query flow intact."
                onApply={handleApplyFilters}
                onReset={handleResetFilters}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Sort field
                    </label>
                    <select
                      value={draftOrderBy}
                      onChange={(event) =>
                        setDraftOrderBy(
                          event.target.value as "createdAt" | "amount",
                        )
                      }
                      className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="createdAt">Date</option>
                      <option value="amount">Amount</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Sort order
                    </label>
                    <select
                      value={draftSortOrder}
                      onChange={(event) =>
                        setDraftSortOrder(event.target.value as "asc" | "desc")
                      }
                      className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="desc">Descending</option>
                      <option value="asc">Ascending</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Type
                    </label>
                    <select
                      value={draftType}
                      onChange={(event) => setDraftType(event.target.value)}
                      className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="all">All Types</option>
                      <option value="deposit">Deposit</option>
                      <option value="withdrawal">Withdrawal</option>
                      <option value="game_win">Game Win</option>
                      <option value="game_lost">Game Lost</option>
                      <option value="bonus">Bonus</option>
                      <option value="welcome_bonus">Welcome Bonus</option>
                      <option value="referral_reward">Referral Reward</option>
                      <option value="referral_commission">
                        Referral Commission
                      </option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Status
                    </label>
                    <select
                      value={draftStatus}
                      onChange={(event) => setDraftStatus(event.target.value)}
                      className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="all">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                </div>
              </FilterSortModal>
            </div>
          </div>
        </div>
      </div>

      <TableContainer className="relative w-full max-h-[30rem]">
        <table className="hidden w-full min-w-[760px] caption-bottom text-sm md:table">
          <thead className="[&_tr]:border-b">
            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
              <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                User
              </th>
              <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                Type
              </th>
              <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                Amount
              </th>
              <th className="hidden h-10 px-4 text-left align-middle font-medium text-muted-foreground lg:table-cell">
                Date
              </th>
              <th className="hidden h-10 px-4 text-left align-middle font-medium text-muted-foreground xl:table-cell">
                Details
              </th>
              <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {transactions.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  No transactions match the current filters.
                </td>
              </tr>
            ) : (
              transactions.map((tx: Transaction) => (
                <tr
                  key={tx.id}
                  className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                >
                  <td className="p-4 align-middle font-medium">
                    <div className="flex flex-col">
                      <span className="text-foreground">
                        {tx.user?.firstName || tx.user?.username || "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        @{tx.user?.username || tx.user?.id?.slice(0, 8)}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 align-middle">
                    <Badge variant="outline" className="capitalize">
                      {tx.type}
                    </Badge>
                  </td>
                  <td className="p-4 align-middle">
                    <span
                      className={
                        Number(tx.amount) > 0
                          ? "text-success font-medium"
                          : "text-foreground"
                      }
                    >
                      {Number(tx.amount).toLocaleString()}
                    </span>
                  </td>
                  <td className="hidden p-4 align-middle text-muted-foreground lg:table-cell">
                    {new Date(tx.createdAt).toLocaleDateString()}{" "}
                    <span className="text-[10px] opacity-70">
                      {new Date(tx.createdAt).toLocaleTimeString()}
                    </span>
                  </td>
                  <td className="hidden max-w-50 truncate p-4 align-middle text-muted-foreground xl:table-cell">
                    {tx.description || "-"}
                  </td>
                  <td className="p-4 align-middle text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setSelected(tx)}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => navigator.clipboard.writeText(tx.id)}
                        >
                          Copy ID
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="flex flex-col gap-3 p-4 md:hidden">
          {transactions.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              No transactions match the current filters.
            </div>
          ) : (
            transactions.map((tx: Transaction) => (
              <div
                key={tx.id}
                className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {tx.user?.firstName || tx.user?.username || "Unknown"}
                    </span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      @{tx.user?.username || tx.user?.id?.slice(0, 8)} •{" "}
                      {new Date(tx.createdAt).toLocaleDateString()}{" "}
                      {new Date(tx.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="ml-2 shrink-0 text-[10px] capitalize"
                  >
                    {tx.type.replace("_", " ")}
                  </Badge>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span
                      className={`text-lg font-black tracking-tight ${
                        Number(tx.amount) > 0
                          ? "text-success"
                          : "text-foreground"
                      }`}
                    >
                      {Number(tx.amount) > 0 ? "+" : ""}
                      {Number(tx.amount).toLocaleString()}
                    </span>
                    {tx.description ? (
                      <p className="mt-1 truncate text-[10px] text-muted-foreground">
                        {tx.description}
                      </p>
                    ) : null}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="ml-2 h-11 w-11 shrink-0 p-0"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => setSelected(tx)}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => navigator.clipboard.writeText(tx.id)}
                      >
                        Copy ID
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>
      </TableContainer>

      <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Page {page} of {Math.max(1, Math.ceil(total / pageSize))} •{" "}
          {total.toLocaleString()} records
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            >
              {[10, 20, 50, 100].map((size) => (
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
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px]"
              disabled={page * pageSize >= total}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {selected && (
        <TransactionDetail tx={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function TransactionDetail({
  tx,
  onClose,
}: {
  tx: Transaction;
  onClose: () => void;
}) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="border-b bg-muted/20 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">
              Transaction Details
            </h2>
            <button
              className="rounded-full p-1 transition-colors hover:bg-muted"
              onClick={onClose}
            >
              <XCircle className="h-6 w-6 text-muted-foreground" />
            </button>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">ID: {tx.id}</div>
        </div>

        <div className="space-y-6 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                User
              </span>
              <div className="text-lg font-semibold">
                {tx.user?.firstName || tx.user?.username || tx.user?.id}
              </div>
              <div className="text-sm text-muted-foreground">
                @{tx.user?.username || tx.user?.id}
              </div>
            </div>
            <div className="space-y-1 text-right">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Amount
              </span>
              <div className="text-2xl font-bold text-primary">
                {Number(tx.amount).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Type
              </span>
              <div>
                <Badge className="border-primary/20 bg-primary/10 capitalize text-primary hover:bg-primary/20">
                  {tx.type.replace("_", " ")}
                </Badge>
              </div>
            </div>
            <div className="space-y-1 text-right">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Date
              </span>
              <div className="font-medium">
                {new Date(tx.createdAt).toLocaleDateString()}
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(tx.createdAt).toLocaleTimeString()}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Status
              </span>
              <Badge
                variant={
                  tx.status === "completed"
                    ? "success"
                    : tx.status === "failed"
                      ? "destructive"
                      : "warning"
                }
                className="capitalize"
              >
                {tx.status}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Details
            </span>
            <div className="max-h-25 overflow-auto rounded-md border bg-muted/50 p-3 text-sm font-mono break-all">
              {tx.description || "No additional details provided."}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t bg-muted/20 p-6">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => router.push(`/agent/users/${tx.userId}`)}>
            View User Profile
          </Button>
        </div>
      </div>
    </div>
  );
}
