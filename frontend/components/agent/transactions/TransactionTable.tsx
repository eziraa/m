"use client";
import React, { useDeferredValue, useMemo, useState } from "react";
import { useGetAgentTransactionsQuery } from "@/lib/api";
import { Loader2, MoreHorizontal, XCircle } from "lucide-react";
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
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function TransactionTable() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [orderBy, setOrderBy] = useState<"createdAt" | "amount">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const deferredSearch = useDeferredValue(search.trim());
  const [selected, setSelected] = useState<Transaction | null>(null);
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

  if (isLoading) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden">
      {/* Table Header */}
      <div className="border-b bg-muted/40 p-4 flex flex-col md:flex-row gap-4 justify-between md:items-center">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">
            Recent Transactions
          </h3>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Showing {transactions.length} of {total} records
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            placeholder="Search..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="h-8 w-full sm:w-auto lg:w-62.5 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
          {/* Sorting */}
          <select
            value={orderBy}
            onChange={(event) => {
              setOrderBy(event.target.value as "createdAt" | "amount");
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="createdAt">Date</option>
            <option value="amount">Amount</option>
          </select>
          <select
            value={sortOrder}
            onChange={(event) => {
              setSortOrder(event.target.value as "asc" | "desc");
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value);
              setPage(1);
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="all">All Types</option>
            <option value="deposit">Deposit</option>
            <option value="withdrawal">Withdrawal</option>
            <option value="game_win">Game Win</option>
            <option value="game_lost">Game Lost</option>
            <option value="bonus">Bonus</option>
            <option value="welcome_bonus">Welcome Bonus</option>
            <option value="referral_reward">Referral Reward</option>
            <option value="referral_commission">Referral Commission</option>
          </select>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
          {isFetching ? (
            <span className="text-xs text-muted-foreground">Updating...</span>
          ) : null}
        </div>
      </div>

      <div className="relative w-full max-h-[30rem] overflow-y-auto custom-scrollbar">
        <table className="w-full caption-bottom text-sm hidden md:table">
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
              <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                Date
              </th>
              <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                Details
              </th>
              <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {transactions.map((tx: Transaction) => (
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
                <td className="p-4 align-middle text-muted-foreground">
                  {new Date(tx.createdAt).toLocaleDateString()}{" "}
                  <span className="text-[10px] opacity-70">
                    {new Date(tx.createdAt).toLocaleTimeString()}
                  </span>
                </td>
                <td className="p-4 align-middle max-w-50 truncate text-muted-foreground">
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
            ))}
          </tbody>
        </table>

        {/* Mobile View */}
        <div className="md:hidden flex flex-col gap-3 p-4">
          {transactions.map((tx: Transaction) => (
            <div
              key={tx.id}
              className="rounded-xl border bg-card text-card-foreground shadow-sm p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-semibold text-sm truncate">
                    {tx.user?.firstName || tx.user?.username || "Unknown"}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">
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
                  className="capitalize shrink-0 ml-2 text-[10px]"
                >
                  {tx.type.replace("_", " ")}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className={`font-black tracking-tight text-lg ${
                      Number(tx.amount) > 0 ? "text-success" : "text-foreground"
                    }`}
                  >
                    {Number(tx.amount) > 0 ? "+" : ""}
                    {Number(tx.amount).toLocaleString()}
                  </span>
                  {tx.description && (
                    <span className="text-[10px] text-muted-foreground truncate ml-2 border-l pl-2">
                      {tx.description}
                    </span>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-8 w-8 p-0 shrink-0 ml-2"
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
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-4 px-4 border-t">
        <div className="text-sm text-muted-foreground">
          Page {page} of {Math.max(1, Math.ceil(total / pageSize))} •{" "}
          {total.toLocaleString()} records
        </div>
        <div className="flex items-center gap-3">
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
          <div className="space-x-2 flex items-center flex-wrap flex-col sm:flex-row ">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-card text-card-foreground rounded-xl border shadow-2xl w-full max-w-lg relative overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">
              Transaction Details
            </h2>
            <button
              className="rounded-full p-1 hover:bg-muted transition-colors"
              onClick={onClose}
            >
              <XCircle className="h-6 w-6 text-muted-foreground" />
            </button>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">ID: {tx.id}</div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                User
              </span>
              <div className="font-semibold text-lg">
                {tx.user?.firstName || tx.user?.username || tx.user?.id}
              </div>
              <div className="text-sm text-muted-foreground">
                @{tx.user?.username || tx.user?.id}
              </div>
            </div>
            <div className="space-y-1 text-right">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Amount
              </span>
              <div className="font-bold text-2xl text-primary">
                {Number(tx.amount).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Type
              </span>
              <div>
                <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 capitalize">
                  {tx.type.replace("_", " ")}
                </Badge>
              </div>
            </div>
            <div className="space-y-1 text-right">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
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
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
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
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Details
            </span>
            <div className="rounded-md bg-muted/50 p-3 text-sm font-mono break-all border overflow-auto max-h-25">
              {tx.description || "No additional details provided."}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-muted/20 flex justify-end gap-2">
          {/* Action buttons based on status/type could go here */}
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => router.push(`/Agent/users/` + tx.userId)}>
            View User Profile
          </Button>
        </div>
      </div>
    </div>
  );
}
