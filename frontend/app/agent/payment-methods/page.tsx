"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  CreditCard,
  Plus,
  RefreshCw,
  Trash2,
  Pencil,
  ArrowUpDown,
  CircleCheck,
} from "lucide-react";
import {
  useAgentPaymentMethodsAgentQuery,
  useCreateAgentPaymentMethodMutation,
  useDeleteAgentPaymentMethodMutation,
  useUpdateAgentPaymentMethodMutation,
  type AgentPaymentMethodRow,
} from "@/lib/api";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";

type MethodKind = "cbe" | "telebirr" | "other";

export default function AgentPaymentMethodsPage() {
  const t = useTranslations("agent.paymentMethods");
  const { data: methods, isLoading, refetch } = useAgentPaymentMethodsAgentQuery();
  const [create, { isLoading: creating }] = useCreateAgentPaymentMethodMutation();
  const [update, { isLoading: updating }] = useUpdateAgentPaymentMethodMutation();
  const [del, { isLoading: deleting }] = useDeleteAgentPaymentMethodMutation();

  const [editing, setEditing] = useState<AgentPaymentMethodRow | null>(null);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [kind, setKind] = useState<MethodKind>("telebirr");
  const [accountNumber, setAccountNumber] = useState("");
  const [holderName, setHolderName] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);

  const resetForm = () => {
    setKind("telebirr");
    setAccountNumber("");
    setHolderName("");
    setSortOrder("0");
    setIsActive(true);
    setEditing(null);
    setIsFormOpen(false);
  };

  const openCreateModal = () => {
    setEditing(null);
    setKind("telebirr");
    setAccountNumber("");
    setHolderName("");
    setSortOrder("0");
    setIsActive(true);
    setIsFormOpen(true);
  };

  const startEdit = (m: AgentPaymentMethodRow) => {
    setEditing(m);
    setKind(m.kind);
    setAccountNumber(m.accountNumber);
    setHolderName(m.holderName);
    setSortOrder(String(m.sortOrder ?? 0));
    setIsActive(m.isActive !== false);
    setIsFormOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const so = Math.max(0, parseInt(sortOrder, 10) || 0);

    try {
      if (editing) {
        await update({
          id: editing.id,
          kind,
          accountNumber: accountNumber.trim(),
          holderName: holderName.trim(),
          sortOrder: so,
          isActive,
        }).unwrap();
        toast.success(t("toast.updated"));
      } else {
        await create({
          kind,
          accountNumber: accountNumber.trim(),
          holderName: holderName.trim(),
          sortOrder: so,
          isActive,
        }).unwrap();
        toast.success(t("toast.created"));
      }

      resetForm();
    } catch (err: unknown) {
      const data = (err as { data?: { error?: string } })?.data;
      toast.error(data?.error || t("toast.saveFailed"));
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await del(toDelete).unwrap();
      toast.success(t("toast.deleted"));
      setToDelete(null);
    } catch {
      toast.error(t("toast.deleteFailed"));
    }
  };

  const sorted = useMemo(() => {
    if (!methods?.length) return [];
    return [...methods].sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
        (a.createdAt && b.createdAt
          ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          : 0),
    );
  }, [methods]);

  const isSubmitting = creating || updating;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <CreditCard className="h-5 w-5 text-primary" />
            {t("title")}
          </h1>
          <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-11 w-11 rounded-lg"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={openCreateModal} className="min-h-[44px] rounded-lg">
            <Plus className="mr-2 h-4 w-4" />
            {t("form.add")}
          </Button>
        </div>
      </header>

      <Card className="overflow-hidden border border-border/70 bg-card/80">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-base">{t("list.title")}</CardTitle>
          <CardDescription>
            {sorted.length} {sorted.length === 1 ? "method" : "methods"} configured
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-40 animate-pulse rounded-2xl border bg-muted/40"
                />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="rounded-2xl border border-dashed px-6 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border bg-muted/40">
                <CreditCard className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="mt-4 text-sm font-medium text-foreground">
                {t("list.empty")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add your first payment method to start receiving payments.
              </p>
              <Button onClick={openCreateModal} className="mt-5 min-h-[44px] rounded-lg">
                <Plus className="mr-2 h-4 w-4" />
                {t("form.add")}
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {sorted.map((m) => (
                <Card
                  key={m.id}
                  className="overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-background via-background to-muted/20 py-0 shadow-sm"
                >
                  <div className="border-b bg-muted/20 px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                            {m.kind}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                              m.isActive === false
                                ? "bg-muted text-muted-foreground"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {m.isActive === false ? t("list.inactive") : "Active"}
                          </span>
                        </div>
                        <h3 className="mt-3 truncate text-base font-semibold">
                          {m.holderName}
                        </h3>
                        <p className="mt-1 truncate font-mono text-sm text-muted-foreground">
                          {m.accountNumber}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-h-[40px] rounded-lg"
                          onClick={() => startEdit(m)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="min-h-[40px] rounded-lg"
                          onClick={() => setToDelete(m.id)}
                          disabled={deleting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 px-5 py-4 sm:grid-cols-2">
                    <div className="rounded-xl border bg-background/70 p-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        Sort Order
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-sm font-medium">
                        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                        {m.sortOrder ?? 0}
                      </div>
                    </div>
                    <div className="rounded-xl border bg-background/70 p-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        Availability
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-sm font-medium">
                        <CircleCheck className="h-4 w-4 text-primary" />
                        {m.isActive === false ? t("list.inactive") : "Visible to users"}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(open) => (!open ? resetForm() : setIsFormOpen(true))}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("form.editTitle") : t("form.addTitle")}
            </DialogTitle>
            <DialogDescription>{t("subtitle")}</DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">{t("form.kind")}</label>
                <Select value={kind} onValueChange={(v) => setKind(v as MethodKind)}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="telebirr">Telebirr</SelectItem>
                    <SelectItem value="cbe">CBE</SelectItem>
                    <SelectItem value="other">{t("form.kindOther")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">{t("form.sortOrder")}</label>
                <Input
                  type="number"
                  min={0}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t("form.holderName")}</label>
              <Input
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                placeholder={t("form.holderPlaceholder")}
                className="h-11"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t("form.accountNumber")}</label>
              <Input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder={t("form.accountPlaceholder")}
                className="h-11"
                required
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border px-4 py-3">
              <div>
                <span className="text-sm font-medium">{t("form.active")}</span>
                <p className="text-xs text-muted-foreground">
                  Control whether this method is visible to users.
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={resetForm}>
                {editing ? t("form.cancelEdit") : t("confirmDelete.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {editing ? (
                  <>
                    <Pencil className="mr-2 h-4 w-4" />
                    {t("form.save")}
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("form.add")}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={() => setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDelete.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirmDelete.body")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("confirmDelete.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t("confirmDelete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
