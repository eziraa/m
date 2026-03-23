"use client";

import { useParams, useRouter } from "next/navigation";
import {
  useGetAdminUserDetailQuery,
  useUpdateUserRoleMutation,
} from "@/lib/api";
import {
  Users,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeft,
  Shield,
  Clock,
  Wallet,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

export default function UserDetailPage() {
  const t = useTranslations("admin.userDetail");
  const { id: userId } = useParams() as { id: string };
  const router = useRouter();

  const { data: user, isLoading } = useGetAdminUserDetailQuery(userId || "", {
    skip: !userId,
  });

  const [updateRole, { isLoading: isUpdatingRole }] =
    useUpdateUserRoleMutation();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [roleToConfirm, setRoleToConfirm] = useState<string | null>(null);

  const handleRoleChangeRequest = (newRole: string) => {
    if (!newRole || user?.role === newRole) return;
    setRoleToConfirm(newRole);
    setIsConfirmOpen(true);
  };

  const handleConfirmRoleChange = async () => {
    if (!roleToConfirm) return;
    try {
      await updateRole({ id: userId, role: roleToConfirm }).unwrap();
      toast.success(t("toast.roleUpdated", { role: roleToConfirm }));
      setIsConfirmOpen(false);
    } catch (err: any) {
      toast.error(err.data?.error || t("toast.roleUpdateFailed"));
    }
  };

  if (isLoading) {
    return <UserDetailSkeleton />;
  }

  if (!user) {
    return (
      <div className="bg-[#0f111a] min-h-screen text-foreground flex flex-col items-center justify-center p-6">
        <Users className="h-16 w-16 text-foreground/10 mb-4" />
        <h2 className="text-xl font-black">{t("notFound")}</h2>
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mt-4 text-primary hover:text-primary/80 font-bold"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> {t("actions.backToUsers")}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-svh h-screen max-h-screen overflow-y-auto custom-scrollbar transition-colors duration-500">
      {/* Cool Integrated Header & Profile Section */}
      <div className="relative w-full flex flex-col items-center">
        {/* Background Decorative Element */}
        <div className="absolute inset-0 h-48 bg-linear-to-b from-primary/20 via-primary/5 to-transparent pointer-events-none" />

        <header className="relative z-30 w-full px-6 pt-10 pb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-10 w-10 rounded-2xl bg-foreground/5 border border-foreground/10 text-foreground/70 hover:text-foreground transition-all hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <Badge
            className={cn(
              "text-[10px] font-black uppercase border-none px-3 py-1.5 shadow-lg shadow-black/20",
              user.role === "ADMIN"
                ? "bg-amber-500 text-black"
                : user.role === "AGENT"
                  ? "bg-blue-500 text-foreground"
                  : "bg-primary text-foreground",
            )}
          >
            {user.role}
          </Badge>
        </header>

        <section className="relative w-full z-10 flex flex-col items-center px-6 pb-8">
          <div className="flex w-full items-center gap-5">
            {/* Reduced Icon Size & Cool Border */}
            <div className="relative group">
              {/* <div className="absolute -inset-1 bg-linear-to-tr from-primary to-indigo-500 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" /> */}
              <div className="relative h-20 w-20 rounded-full bg-[#1a1c26] flex items-center justify-center text-3xl font-black text-primary uppercase border border-accent/50 ">
                {user.username?.[0] ||
                  user.firstName?.[0] ||
                  t("fallback.initial")}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight truncate">
                  {user.firstName} {user.lastName}
                </h1>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-foreground/40 text-sm font-bold">
                  @{user.username || t("fallback.noUsername")}
                </p>
                <div className="w-1 h-1 rounded-full bg-foreground/10" />
                <p className="text-foreground/20 text-xs truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Compact Stats Row */}
          <div className="grid w-full grid-cols-2 gap-3 mt-8">
            <div className="bg-foreground/3 backdrop-blur-md rounded-2xl p-4 border border-foreground/5 relative overflow-hidden group hover:bg-foreground/[0.05] transition-all">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <Wallet className="h-4 w-4" />
              </div>
              <p className="text-[10px] text-foreground/30 font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-emerald-500" />
                {t("stats.balance")}
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-emerald-500 tracking-tight">
                  {user.balance}
                </span>
                <span className="text-[9px] font-black text-emerald-500/40 uppercase">
                  {t("currency")}
                </span>
              </div>
            </div>

            <div className="bg-foreground/[0.03] backdrop-blur-md rounded-2xl p-4 border border-foreground/5 relative overflow-hidden group hover:bg-foreground/[0.05] transition-all">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <Users className="h-4 w-4" />
              </div>
              <p className="text-[10px] text-foreground/30 font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-indigo-500" />
                {t("stats.referrals")}
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-indigo-400 tracking-tight">
                  {user.invitees?.length || 0}
                </span>
                <span className="text-[9px] font-black text-indigo-400/40 uppercase text-xs">
                  {t("stats.users")}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="px-6  w-full flex flex-col gap-6 pb-20  mt-4">
        {/* Role Management */}
        <div className="space-y-3 flex  h-fit flex-col">
          <div className="flex items-center gap-2 text-foreground/30 px-1">
            <Shield className="h-3 w-3" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">
              {t("role.title")}
            </h4>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-12 bg-foreground/5 border-foreground/10 rounded-2xl flex items-center justify-between px-4 hover:bg-foreground/10 hover:text-foreground transition-all text-xs font-bold"
                disabled={isUpdatingRole}
              >
                <div className="flex items-center gap-2">
                  <Badge
                    className={cn(
                      "h-2 w-2 rounded-full p-0 border-none",
                      user.role === "ADMIN"
                        ? "bg-amber-500"
                        : user.role === "AGENT"
                          ? "bg-blue-500"
                          : "bg-primary",
                    )}
                  />
                  {user.role}
                </div>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[calc(430px-3rem)] bg-[#1a1c26] border-foreground/10 text-foreground rounded-2xl shadow-2xl p-2">
              {["USER", "AGENT", "ADMIN"].map((role) => (
                <DropdownMenuItem
                  key={role}
                  onClick={() => handleRoleChangeRequest(role)}
                  className={cn(
                    "rounded-xl py-3 px-4 text-xs font-bold focus:bg-foreground/10 flex items-center justify-between",
                    user.role === role && "bg-foreground/5 text-primary",
                  )}
                >
                  {role}
                  {user.role === role && (
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <AlertDialogContent className="max-w-[320px] rounded-[16px] border-foreground/10 bg-[#161822] text-foreground shadow-2xl p-6 outline-none">
            <AlertDialogHeader className="space-y-2">
              <AlertDialogTitle className="text-lg font-black text-center">
                {t("role.confirmTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-foreground/40 text-[11px] text-center leading-relaxed font-bold">
                {t.rich("role.confirmDescription", {
                  username: user.username || t("role.unknownUser"),
                  role: roleToConfirm || t("role.unknownRole"),
                  strong: (chunks) => (
                    <span className="text-primary font-black">{chunks}</span>
                  ),
                  user: (chunks) => (
                    <span className="text-foreground">{chunks}</span>
                  ),
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-col gap-2 mt-6">
              <AlertDialogAction
                onClick={handleConfirmRoleChange}
                className="w-full rounded-[12px] bg-primary hover:bg-primary/90 text-[11px] font-black uppercase tracking-widest h-11 border-none"
              >
                {t("role.confirmAction")}
              </AlertDialogAction>
              <AlertDialogCancel className="w-full mt-0 rounded-[12px] border-none bg-transparent text-[10px] font-black uppercase tracking-widest h-10 text-foreground/20 hover:text-foreground/40 hover:bg-transparent">
                {t("actions.cancel")}
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Transactions Section */}
        <div className="space-y-3 flex flex-col">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-foreground/30">
              <History className="h-3 w-3" />
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">
                {t("activity.title")}
              </h4>
            </div>
          </div>

          <div className="space-y-2">
            {!user.transactions || user.transactions.length === 0 ? (
              <div className="bg-foreground/5 rounded-2xl p-8 border border-foreground/5 text-center">
                <p className="text-xs text-foreground/20 italic font-medium">
                  {t("activity.empty")}
                </p>
              </div>
            ) : (
              user.transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-foreground/5 border border-foreground/5 hover:border-foreground/10 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center",
                        parseFloat(tx.amount.toString()) >= 0
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-red-500/10 text-red-500",
                      )}
                    >
                      {parseFloat(tx.amount.toString()) >= 0 ? (
                        <ArrowUpRight className="h-5 w-5" />
                      ) : (
                        <ArrowDownLeft className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide leading-none mb-1">
                        {t("activity.type", {
                          type: tx.type.replace("_", " "),
                        })}
                      </p>
                      <p className="text-[10px] text-foreground/30 flex items-center gap-1 font-medium">
                        <Clock className="h-2.5 w-2.5" />{" "}
                        {format(new Date(tx.createdAt), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "text-sm font-black",
                        parseFloat(tx.amount.toString()) >= 0
                          ? "text-emerald-500"
                          : "text-red-500",
                      )}
                    >
                      {parseFloat(tx.amount.toString()) >= 0 ? "+" : ""}
                      {tx.amount}
                    </p>
                    <p className="text-[9px] text-foreground/20 font-black uppercase tracking-tighter">
                      {t("currency")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Referral Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-foreground/30 px-1">
            <Users className="h-3 w-3" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">
              {t("referrals.title")}
            </h4>
          </div>

          <div className="space-y-2">
            {!user.invitees || user.invitees.length === 0 ? (
              <div className="bg-foreground/5 rounded-2xl p-8 border border-foreground/5 text-center">
                <p className="text-xs text-foreground/20 italic font-medium">
                  {t("referrals.empty")}
                </p>
              </div>
            ) : (
              user.invitees.map((invitee) => (
                <div
                  key={invitee.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-foreground/5 border border-foreground/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-sm font-black uppercase">
                      {invitee.username?.[0] || "?"}
                    </div>
                    <div>
                      <p className="text-xs font-black">
                        @{invitee.username || t("referrals.unknownUser")}
                      </p>
                      <p className="text-[10px] text-foreground/30 font-medium">
                        {t("referrals.joined", {
                          date: format(
                            new Date(invitee.createdAt),
                            "MMM d, yyyy",
                          ),
                        })}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-foreground/10 text-[9px] text-foreground/40 h-5 px-2 font-black uppercase tracking-tighter"
                  >
                    {t("referrals.active")}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UserDetailSkeleton() {
  return (
    <div className="bg-[#0f111a] min-h-screen text-foreground pb-20 overflow-hidden">
      {/* Cool Integrated Header Skeleton */}
      <div className="relative">
        <div className="absolute inset-0 h-48 bg-linear-to-b from-foreground/5 via-foreground/2 to-transparent pointer-events-none" />

        <header className="relative z-30 px-6 pt-10 pb-6 flex items-center justify-between">
          <Skeleton className="h-10 w-10 rounded-2xl bg-foreground/5" />
          <Skeleton className="h-7 w-20 rounded-full bg-foreground/10" />
        </header>

        <section className="relative z-10 px-6 pb-8">
          <div className="flex items-center gap-5">
            <Skeleton className="h-20 w-20 rounded-[1.8rem] bg-foreground/10" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-7 w-40 bg-foreground/10" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24 bg-foreground/5" />
                <div className="w-1 h-1 rounded-full bg-foreground/5" />
                <Skeleton className="h-4 w-32 bg-foreground/5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-8">
            <Skeleton className="h-[88px] rounded-2xl bg-foreground/5 border border-foreground/5" />
            <Skeleton className="h-[88px] rounded-2xl bg-foreground/5 border border-foreground/5" />
          </div>
        </section>
      </div>

      <main className="px-6 space-y-8 max-w-[430px] mx-auto mt-4">
        <div className="space-y-3">
          <Skeleton className="h-4 w-24 bg-foreground/5 ml-1" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-11 rounded-2xl bg-foreground/5" />
            <Skeleton className="h-11 rounded-2xl bg-foreground/5" />
            <Skeleton className="h-11 rounded-2xl bg-foreground/5" />
          </div>
        </div>

        <div className="space-y-3">
          <Skeleton className="h-4 w-32 bg-foreground/5 ml-1" />
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              className="h-16 w-full rounded-2xl bg-foreground/5"
            />
          ))}
        </div>
      </main>
    </div>
  );
}
