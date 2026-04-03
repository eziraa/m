"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CreditCard, Plus, RefreshCw, Trash2, Pencil } from "lucide-react";
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
  };

  const startEdit = (m: AgentPaymentMethodRow) => {
    setEditing(m);
    setKind(m.kind);
    setAccountNumber(m.accountNumber);
    setHolderName(m.holderName);
    setSortOrder(String(m.sortOrder ?? 0));
    setIsActive(m.isActive !== false);
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

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-24 md:pb-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {t("title")}
          </h1>
          <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          disabled={isLoading}
          className="h-9 w-9 rounded-lg self-start"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </header>

      <Card className="p-4 border border-white/10 bg-zinc-950/80">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">
              {editing ? t("form.editTitle") : t("form.addTitle")}
            </h2>
            {editing && (
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                {t("form.cancelEdit")}
              </Button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t("form.kind")}</label>
              <Select
                value={kind}
                onValueChange={(v) => setKind(v as MethodKind)}
              >
                <SelectTrigger className="h-10">
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
                className="h-10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">{t("form.holderName")}</label>
            <Input
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              placeholder={t("form.holderPlaceholder")}
              className="h-10"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">{t("form.accountNumber")}</label>
            <Input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder={t("form.accountPlaceholder")}
              className="h-10"
              required
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
            <span className="text-xs text-muted-foreground">{t("form.active")}</span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <Button
            type="submit"
            disabled={creating || updating}
            className="w-full sm:w-auto"
          >
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
        </form>
      </Card>

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">{t("list.title")}</h2>
        {isLoading ? (
          <div className="h-24 rounded-xl bg-muted animate-pulse" />
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-xl">
            {t("list.empty")}
          </p>
        ) : (
          <ul className="space-y-2">
            {sorted.map((m) => (
              <li key={m.id}>
                <Card className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-white/10">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                        {m.kind}
                      </span>
                      {m.isActive === false && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {t("list.inactive")}
                        </span>
                      )}
                    </div>
                    <p className="font-medium mt-1">{m.holderName}</p>
                    <p className="text-sm text-muted-foreground font-mono tracking-wide">
                      {m.accountNumber}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(m)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setToDelete(m.id)}
                      disabled={deleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

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
