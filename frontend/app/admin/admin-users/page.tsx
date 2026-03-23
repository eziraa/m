"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Search,
  MoreVertical,
  Trash2,
  ExternalLink,
  User as UserIcon,
  Crown,
  Zap,
  RefreshCw,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useGetAdminUsersQuery, useDeleteUserMutation } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

export default function AdminUsersPage() {
  const t = useTranslations("admin.users");
  const router = useRouter();
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "USER" | "ADMIN" | "AGENT">("all");
  const deferredSearch = useDeferredValue(searchQuery.trim());
  const queryArgs = useMemo(
    () => ({
      page,
      pageSize,
      search: deferredSearch || undefined,
      role: roleFilter,
      sortBy: "createdAt" as const,
      sortOrder: "desc" as const,
    }),
    [page, pageSize, deferredSearch, roleFilter],
  );
  const {
    data: usersData,
    isFetching,
    refetch,
  } = useGetAdminUsersQuery(queryArgs);
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const users = usersData?.users ?? [];
  const total = usersData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isLoading = isFetching && !usersData;

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
      await deleteUser(userToDelete).unwrap();
      toast.success(t("toast.deleted"));
      setUserToDelete(null);
    } catch (err: any) {
      toast.error(err.data?.error || t("toast.deleteFailed"));
    }
  };

  const handleViewDetails = (userId: string) => {
    router.push(`/admin/admin-users/${userId}`);
  };

  const getRoleIcon = (role: string) => {
    // ... existing getRoleIcon ...
    switch (role) {
      case "ADMIN":
        return <Crown className="h-3 w-3 text-amber-400" />;
      case "AGENT":
        return <Zap className="h-3 w-3 text-blue-400" />;
      default:
        return <UserIcon className="h-3 w-3 text-white/40" />;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    // ... existing getRoleBadgeClass ...
    switch (role) {
      case "ADMIN":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "AGENT":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-white/5 text-white/40 border-white/10";
    }
  };

  return (
    <div className="bg-background min-h-svh h-screen max-h-screen overflow-hidden transition-colors duration-500">
      <div className="w-full max-w-[430px] mx-auto flex flex-col min-h-svh bg-[#0f111a] text-white  overflow-x-hidden pb-30">
        {/* Dynamic Patterned Background */}

        {/* Header */}
        <header className="relative z-10  px-6 pt-10 pb-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 text-white/70 hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                  <Users className="h-6 w-6 text-primary" />
                  {t("title")}
                </h1>
                <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mt-0.5">
                  {t("subtitle")}
                </p>
              </div>
            </div>
            {/* Refresh button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 text-white/70 hover:text-white"
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full h-12 pl-11 bg-white/5 border-white/10 rounded-2xl text-sm focus:ring-primary/20 focus:border-primary/30 transition-all placeholder:text-white/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(event) => {
                const nextRole = event.target.value as "all" | "USER" | "ADMIN" | "AGENT";
                setRoleFilter(nextRole);
                setPage(1);
              }}
              className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold uppercase tracking-wide text-white/70"
            >
              <option value="all">All Roles</option>
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
              <option value="AGENT">Agent</option>
            </select>
            <p className="text-[10px] text-white/40 font-bold">
              {total.toLocaleString()} total
            </p>
          </div>
        </header>

        {/* User List Table */}
        <div className="relative h-full  max-h-[74vh] overflow-y-auto custom-scrollbar z-10 px-4 flex-1">
          {isLoading ? (
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/2">
                    <th className="py-3 px-3 w-[45%]">
                      <Skeleton className="h-3 w-16 bg-white/10" />
                    </th>
                    <th className="py-3 px-2 w-[20%]">
                      <Skeleton className="h-3 w-12 bg-white/10" />
                    </th>
                    <th className="py-3 px-2 w-[25%]">
                      <Skeleton className="h-3 w-16 bg-white/10 ml-auto" />
                    </th>
                    <th className="py-3 px-3 w-[10%]"></th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-7 w-7 rounded-lg bg-white/10" />
                          <div className="space-y-1">
                            <Skeleton className="h-3 w-20 bg-white/10" />
                            <Skeleton className="h-2 w-16 bg-white/5" />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <Skeleton className="h-4 w-12 rounded-md bg-white/10" />
                      </td>
                      <td className="py-3 px-2">
                        <Skeleton className="h-3 w-14 bg-white/10 ml-auto" />
                      </td>
                      <td className="py-3 px-3">
                        <Skeleton className="h-7 w-7 rounded-lg bg-white/5 mx-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : users.length === 0 ? (
            // ... existing empty state ...
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                <Users className="h-8 w-8 text-white/20" />
              </div>
              <p className="text-sm font-bold text-white/40">{t("empty")}</p>
            </div>
          ) : (
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl  border border-white/10 ">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead className="sticky top-0 z-20">
                    <tr className="border-b border-white/10 bg-[#1a1c26]">
                      <th className="py-3 px-3 text-[10px] font-black uppercase tracking-wider text-white/40 border-b border-white/10">
                        {t("table.user")}
                      </th>
                      <th className="py-3 px-2 text-[10px] font-black uppercase tracking-wider text-white/40 border-b border-white/10">
                        {t("table.role")}
                      </th>
                      <th className="py-3 px-2 text-[10px] font-black uppercase tracking-wider text-white/40 text-right border-b border-white/10">
                        {t("table.balance")}
                      </th>
                      <th className="py-3 px-3 text-[10px] font-black uppercase tracking-wider text-white/40 text-center border-b border-white/10">
                        {t("table.actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-white/2 transition-colors group"
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 shrink-0 rounded-lg bg-primary/20 flex items-center justify-center text-[10px] font-black text-primary uppercase border border-primary/10">
                              {user.username?.[0] ||
                                user.firstName?.[0] ||
                                t("fallback.initial")}
                            </div>
                            <div className="min-w-0 max-w-[80px]">
                              <p className="text-[11px] font-bold truncate leading-tight">
                                {user.firstName}
                              </p>
                              <p className="text-[9px] text-white/30 truncate">
                                @{user.username || t("table.noUsername")}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <Badge
                            className={cn(
                              "text-[8px] h-4 px-1 font-black uppercase tracking-tighter flex items-center gap-0.5 w-fit border-[0.5px]",
                              getRoleBadgeClass(user.role),
                            )}
                          >
                            <span className="scale-[0.8]">
                              {getRoleIcon(user.role)}
                            </span>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <p className="text-[11px] font-black text-emerald-500">
                            {user.balance}
                          </p>
                          <p className="text-[8px] text-white/20 font-bold uppercase tracking-tighter">
                            ETB
                          </p>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex justify-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white"
                                >
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-32 bg-[#1a1c26] border-white/10 text-white rounded-[8px] shadow-2xl p-1"
                              >
                                <DropdownMenuItem
                                  onClick={() => handleViewDetails(user.id)}
                                  className="rounded-[6px] gap-2 text-[10px] font-bold py-2 focus:bg-white/10"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  {t("actions.details")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setUserToDelete(user.id)}
                                  className="rounded-[6px] gap-2 text-[10px] font-bold py-2 text-red-400 focus:bg-red-500/10 focus:text-red-400"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  {t("actions.delete")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between px-1 pb-2">
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-wide">
              Page {page} / {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="h-8 rounded-lg bg-white/5 border border-white/10 text-white/70"
              >
                Prev
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                className="h-8 rounded-lg bg-white/5 border border-white/10 text-white/70"
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        <AlertDialog
          open={!!userToDelete}
          onOpenChange={() => setUserToDelete(null)}
        >
          <AlertDialogContent className="max-w-[320px] rounded-3xl border-white/10 bg-[#1a1c26] text-white shadow-2xl p-6 outline-none">
            <AlertDialogHeader className="space-y-3">
              <AlertDialogTitle className="text-xl font-black text-center">
                {t("confirmDelete.title")}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-white/50 text-xs text-center leading-relaxed">
                {t("confirmDelete.description")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="grid grid-cols-2 gap-3 mt-6">
              <AlertDialogCancel className="mt-0 rounded-xl border-white/10 bg-white/5 text-xs font-bold h-10 hover:bg-white/10 hover:text-white">
                {t("actions.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="rounded-xl bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20 text-xs font-bold h-10 border-none"
              >
                {isDeleting ? t("actions.deleting") : t("actions.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
