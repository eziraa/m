"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  MoreVertical,
  ExternalLink,
  User as UserIcon,
  Crown,
  Zap,
  RefreshCw,
  ArrowDown,
  ArrowUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGetAgentUsersQuery } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { AgentBalanceAdjustmentDialog } from "@/components/agent/AgentBalanceAdjustmentDialog";
import { FilterSortModal } from "@/components/agent/FilterSortModal";
import { TableContainer } from "@/components/agent/TableContainer";

export default function AgentUsersPage() {
  const t = useTranslations("agent.users");
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<
    "all" | "USER" | "Agent" | "AGENT"
  >("all");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [draftSortBy, setDraftSortBy] = useState(sortBy);
  const [draftSortOrder, setDraftSortOrder] = useState(sortOrder);
  const [draftRoleFilter, setDraftRoleFilter] = useState(roleFilter);
  const deferredSearch = useDeferredValue(searchQuery.trim());

  const queryArgs = useMemo(
    () => ({
      page,
      pageSize,
      search: deferredSearch || undefined,
      role: roleFilter,
      sortBy: sortBy as any,
      sortOrder: sortOrder,
    }),
    [page, pageSize, deferredSearch, roleFilter, sortBy, sortOrder],
  );

  const {
    data: usersData,
    isFetching,
    refetch,
  } = useGetAgentUsersQuery(queryArgs);
  const users = usersData?.users ?? [];
  const total = usersData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isLoading = isFetching && !usersData;

  useEffect(() => {
    if (!isFilterModalOpen) return;
    setDraftSortBy(sortBy);
    setDraftSortOrder(sortOrder);
    setDraftRoleFilter(roleFilter);
  }, [isFilterModalOpen, roleFilter, sortBy, sortOrder]);

  const handleViewDetails = (userId: string) => {
    router.push(`/agent/users/${userId}`);
  };

  const applyFilters = () => {
    setSortBy(draftSortBy);
    setSortOrder(draftSortOrder);
    setRoleFilter(draftRoleFilter);
    setPage(1);
    setIsFilterModalOpen(false);
  };

  const resetFilters = () => {
    setDraftSortBy("createdAt");
    setDraftSortOrder("desc");
    setDraftRoleFilter("all");
    setSearchQuery("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setRoleFilter("all");
    setPage(1);
    setIsFilterModalOpen(false);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "Agent":
        return <Crown className="h-3 w-3 text-amber-400" />;
      case "AGENT":
        return <Zap className="h-3 w-3 text-blue-400" />;
      default:
        return <UserIcon className="h-3 w-3 text-white/40" />;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "Agent":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "AGENT":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-white/5 text-white/40 border-white/10";
    }
  };

  return (
    <div className="space-y-4 px-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Users className="h-5 w-5 text-primary" />
            {t("title")}
          </h1>
          <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex w-full flex-col gap-2 self-start lg:w-auto lg:min-w-[22rem] lg:self-auto">
          <div className="w-full flex-row   items-center justify-between gap-2 lg:justify-end">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={t("searchPlaceholder")}
                className=" w-full pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              className="h-11 w-11 rounded-lg"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <FilterSortModal
              open={isFilterModalOpen}
              onOpenChange={setIsFilterModalOpen}
              title={t("title")}
              description={t("subtitle")}
              onApply={applyFilters}
              onReset={resetFilters}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Sort field
                  </label>
                  <select
                    value={draftSortBy}
                    onChange={(e) => setDraftSortBy(e.target.value)}
                    className="min-h-[44px] w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="createdAt">Created At</option>
                    <option value="balance">Balance</option>
                    <option value="username">Username</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Sort order
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={draftSortOrder === "asc" ? "default" : "outline"}
                      className="min-h-[44px]"
                      onClick={() => setDraftSortOrder("asc")}
                    >
                      <ArrowUp className="h-4 w-4" />
                      Asc
                    </Button>
                    <Button
                      type="button"
                      variant={
                        draftSortOrder === "desc" ? "default" : "outline"
                      }
                      className="min-h-[44px]"
                      onClick={() => setDraftSortOrder("desc")}
                    >
                      <ArrowDown className="h-4 w-4" />
                      Desc
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Role
                  </label>
                  <select
                    value={draftRoleFilter}
                    onChange={(event) =>
                      setDraftRoleFilter(
                        event.target.value as
                          | "all"
                          | "USER"
                          | "Agent"
                          | "AGENT",
                      )
                    }
                    className="min-h-[44px] w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="all">All Roles</option>
                    <option value="USER">User</option>
                    <option value="Agent">Agent</option>
                    <option value="AGENT">Agent</option>
                  </select>
                </div>
              </div>
            </FilterSortModal>
            <Button
              variant="outline"
              onClick={() => setIsAdjustmentDialogOpen(true)}
              className="min-h-[44px] rounded-lg"
            >
              <Wallet className="h-4 w-4" />
              {t("actions.adjustBalance")}
            </Button>
          </div>
        </div>
      </header>

      <div className="relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
        {isLoading ? (
          <div className="p-4">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b">
                  <th className="w-[45%] px-3 py-2">
                    <Skeleton className="h-3 w-16" />
                  </th>
                  <th className="w-[20%] px-2 py-2">
                    <Skeleton className="h-3 w-12" />
                  </th>
                  <th className="w-[25%] px-2 py-2">
                    <Skeleton className="ml-auto h-3 w-16" />
                  </th>
                  <th className="w-[10%] px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-7 w-7 rounded-lg" />
                        <div className="space-y-1">
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-2 w-16" />
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <Skeleton className="h-4 w-12 rounded-md" />
                    </td>
                    <td className="px-2 py-2">
                      <Skeleton className="ml-auto h-3 w-14" />
                    </td>
                    <td className="px-3 py-2">
                      <Skeleton className="mx-auto h-7 w-7 rounded-lg" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border bg-muted">
              <Users className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">
              {t("empty")}
            </p>
          </div>
        ) : (
          <TableContainer className="max-h-[80vh]">
            <table className="hidden w-full min-w-[720px] border-separate border-spacing-0 text-left md:table">
              <thead className="bg-muted/50">
                <tr>
                  <th className="border-b px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("table.user")}
                  </th>
                  <th className="border-b px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("table.role")}
                  </th>
                  <th className="border-b px-2 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("table.balance")}
                  </th>
                  <th className="border-b px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user: any) => (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-muted/40"
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-[10px] font-bold uppercase text-primary">
                          {user.username?.[0] ||
                            user.firstName?.[0] ||
                            t("fallback.initial")}
                        </div>
                        <div className="min-w-0 max-w-[200px]">
                          <p className="truncate text-xs font-semibold leading-tight">
                            {user.firstName}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            @{user.username || t("table.noUsername")}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2.5">
                      <Badge
                        className={cn(
                          "flex h-5 items-center gap-1 border px-2 text-[9px] font-semibold uppercase tracking-tight",
                          getRoleBadgeClass(user.role),
                        )}
                      >
                        <span className="scale-90">
                          {getRoleIcon(user.role)}
                        </span>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <p className="text-xs font-semibold text-emerald-500">
                        {user.balance}
                      </p>
                      <p className="text-[10px] font-medium uppercase tracking-tight text-muted-foreground">
                        ETB
                      </p>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-md"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              onClick={() => handleViewDetails(user.id)}
                              className="gap-2 text-xs"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {t("actions.details")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex flex-col gap-3 p-4 md:hidden">
              {users.map((user: any) => (
                <div
                  key={user.id}
                  className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-sm font-bold uppercase text-primary">
                        {user.username?.[0] ||
                          user.firstName?.[0] ||
                          t("fallback.initial")}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-semibold">
                          {user.firstName || t("table.noUsername")}
                        </span>
                        <span className="truncate text-[10px] text-muted-foreground">
                          @{user.username || t("table.noUsername")}
                        </span>
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        "ml-2 flex h-5 shrink-0 items-center gap-1 border px-2 text-[10px] font-semibold uppercase tracking-tight",
                        getRoleBadgeClass(user.role),
                      )}
                    >
                      <span className="scale-90">{getRoleIcon(user.role)}</span>
                      {user.role}
                    </Badge>
                  </div>

                  <div className="mt-1 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-lg font-black tracking-tight text-emerald-500">
                        {user.balance}{" "}
                        <span className="text-[10px] font-medium uppercase text-muted-foreground">
                          ETB
                        </span>
                      </span>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="ml-2 h-11 w-11 shrink-0 rounded-md"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          onClick={() => handleViewDetails(user.id)}
                          className="gap-2 text-xs"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {t("actions.details")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </TableContainer>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            Page {page} / {totalPages}
          </span>
          <span className="k">• {total.toLocaleString()} records</span>
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
              className="h-8 rounded-md border bg-background px-2 text-xs"
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
              type="button"
              variant="outline"
              size="sm"
              className="min-h-[44px]"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-[44px]"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <AgentBalanceAdjustmentDialog
        open={isAdjustmentDialogOpen}
        onOpenChange={setIsAdjustmentDialogOpen}
      />
    </div>
  );
}
