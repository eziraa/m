"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Loader2, Search, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCreateAgentBalanceAdjustmentMutation, useGetAgentUsersQuery } from "@/lib/api";

type AgentBalanceAdjustmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AgentBalanceAdjustmentDialog({
  open,
  onOpenChange,
}: AgentBalanceAdjustmentDialogProps) {
  const t = useTranslations("agent.users.adjustment");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitAdjustment, { isLoading: isSubmitting }] =
    useCreateAgentBalanceAdjustmentMutation();

  const queryArgs = useMemo(
    () => ({
      page: 1,
      pageSize: 8,
      search: deferredSearch || undefined,
      sortBy: "createdAt",
      sortOrder: "desc" as const,
      role: "all",
    }),
    [deferredSearch],
  );

  const { data, isFetching, isLoading } = useGetAgentUsersQuery(queryArgs, {
    skip: !open,
  });

  const users = data?.users ?? [];
  const selectedUser =
    users.find((user: any) => user.id === selectedUserId) ?? null;

  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelectedUserId(null);
      setAmount("");
      setNote("");
    }
  }, [open]);

  useEffect(() => {
    if (!users.length) {
      setSelectedUserId(null);
      return;
    }

    setSelectedUserId((current) =>
      current && users.some((user: any) => user.id === current)
        ? current
        : users[0]?.id ?? null,
    );
  }, [users]);

  const handleSubmit = async () => {
    const parsedAmount = Number(amount);
    if (!selectedUserId) {
      toast.error(t("toast.selectUser"));
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount === 0) {
      toast.error(t("toast.invalidAmount"));
      return;
    }

    try {
      await submitAdjustment({
        userId: selectedUserId,
        amount: parsedAmount,
        note: note.trim() || undefined,
      }).unwrap();

      toast.success(
        t("toast.success", {
          user:
            selectedUser?.firstName ||
            selectedUser?.username ||
            t("fallback.user"),
        }),
      );
      onOpenChange(false);
    } catch (error: any) {
      const code = error?.data?.error;
      if (code === "insufficient_funds") {
        toast.error(t("toast.insufficientFunds"));
        return;
      }
      toast.error(code || t("toast.failed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <div className="grid gap-2">
            <label className="text-sm font-medium">{t("searchLabel")}</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("searchPlaceholder")}
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{t("userLabel")}</label>
              {isFetching ? (
                <span className="text-xs text-muted-foreground">
                  {t("searching")}
                </span>
              ) : null}
            </div>

            <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border p-2">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 rounded-md" />
                ))
              ) : users.length === 0 ? (
                <div className="flex min-h-28 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                  {t("empty")}
                </div>
              ) : (
                users.map((user: any) => {
                  const isSelected = user.id === selectedUserId;

                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedUserId(user.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md border px-3 py-3 text-left transition-colors",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/60",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {user.firstName || t("fallback.user")}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          @{user.username || t("fallback.noUsername")}
                        </p>
                      </div>
                      <div className="ml-4 text-right">
                        <p className="text-xs text-muted-foreground">
                          {t("currentBalance")}
                        </p>
                        <p className="text-sm font-semibold text-emerald-600">
                          {user.balance} ETB
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">{t("amountLabel")}</label>
            <Input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={t("amountPlaceholder")}
              inputMode="decimal"
            />
            <p className="text-xs text-muted-foreground">{t("amountHint")}</p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">{t("noteLabel")}</label>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t("notePlaceholder")}
              className="min-h-24"
            />
          </div>

          {selectedUser ? (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <Wallet className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {t("selectedUser", {
                    user:
                      selectedUser.firstName ||
                      selectedUser.username ||
                      t("fallback.user"),
                  })}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {t("transactionType")}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t("actions.cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedUserId}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("actions.submitting")}
              </>
            ) : (
              t("actions.submit")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
