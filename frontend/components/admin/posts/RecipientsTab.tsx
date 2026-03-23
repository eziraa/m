"use client";

import { useMemo, useState } from "react";
import {
  useGetPostRecipientsQuery,
  useDeleteBroadcastMutation,
  useGetDeleteBroadcastStatusQuery,
  useCancelDeleteBroadcastMutation,
} from "@/lib/api";
import { PostRecipient } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface RecipientsTabProps {
  postId: string;
}

type DeleteIntent =
  | { mode: "selected"; label: string }
  | { mode: "all"; label: string }
  | { mode: "date_range"; label: string; fromDate?: string; toDate?: string };

export function RecipientsTab({ postId }: RecipientsTabProps) {
  const t = useTranslations("admin.recipients");
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [deletionStatus, setDeletionStatus] = useState("all");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [intent, setIntent] = useState<DeleteIntent | null>(null);
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null);

  const { data, isFetching, refetch } = useGetPostRecipientsQuery({
    postId,
    page,
    limit,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    deletionStatus: deletionStatus !== "all" ? deletionStatus : undefined,
    search: search || undefined,
  });

  const [deleteBroadcast, { isLoading: isDeleting }] =
    useDeleteBroadcastMutation();
  const [cancelDeleteBroadcast] = useCancelDeleteBroadcastMutation();

  const { data: deleteStatus } = useGetDeleteBroadcastStatusQuery(
    { id: postId, jobId: deleteJobId || "" },
    { skip: !deleteJobId, pollingInterval: 2000 },
  );

  const recipients = data?.recipients || [];
  const total = data?.total || 0;

  const selectedIds = useMemo(() => {
    return Object.entries(selected)
      .filter(([_, checked]) => checked)
      .map(([id]) => id);
  }, [selected]);

  const allChecked =
    recipients.length > 0 &&
    recipients.every((rec: PostRecipient) => selected[rec.id]);

  const toggleAll = (checked: boolean) => {
    const next: Record<string, boolean> = { ...selected };
    recipients.forEach((rec: PostRecipient) => {
      next[rec.id] = checked;
    });
    setSelected(next);
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => ({ ...prev, [id]: checked }));
  };

  const openConfirm = (intent: DeleteIntent) => {
    setIntent(intent);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!intent) return;

    try {
      const payload: any = {
        id: postId,
        mode: intent.mode,
      };

      if (intent.mode === "selected") {
        payload.userIds = recipients
          .filter((rec: PostRecipient) => selectedIds.includes(rec.id))
          .map((rec: PostRecipient) => rec.userId)
          .filter(Boolean);
      }

      if (intent.mode === "date_range") {
        payload.fromDate = intent.fromDate;
        payload.toDate = intent.toDate;
      }

      const result = await deleteBroadcast(payload).unwrap();
      setDeleteJobId(result.jobId);
      toast.success(t("toast.queued"));
      setConfirmOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.error || t("toast.failed"));
    }
  };

  const currentProgress = deleteStatus?.progress;

  return (
    <div className="space-y-3">
      <Card className="bg-foreground/5 border-foreground/10 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("filters.search")}
              className="h-8 text-xs max-w-[200px]"
            />
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-8 text-xs"
            />
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-8 text-xs"
            />
            <Select
              value={deletionStatus}
              onValueChange={(val: string) => setDeletionStatus(val)}
            >
              <SelectTrigger className="h-8 text-xs w-[150px]">
                <SelectValue placeholder={t("filters.statusPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.status.all")}</SelectItem>
                <SelectItem value="success">
                  {t("filters.status.success")}
                </SelectItem>
                <SelectItem value="failed">
                  {t("filters.status.failed")}
                </SelectItem>
                <SelectItem value="pending">
                  {t("filters.status.pending")}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setPage(1);
                refetch();
              }}
            >
              {t("filters.apply")}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              disabled={selectedIds.length === 0}
              onClick={() =>
                openConfirm({
                  mode: "selected",
                  label: t("actions.deleteSelected"),
                })
              }
            >
              {t("actions.deleteSelected")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() =>
                openConfirm({ mode: "all", label: t("actions.deleteAll") })
              }
            >
              {t("actions.deleteAll")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              disabled={!fromDate && !toDate}
              onClick={() =>
                openConfirm({
                  mode: "date_range",
                  label: t("actions.deleteRange"),
                  fromDate: fromDate || undefined,
                  toDate: toDate || undefined,
                })
              }
            >
              {t("actions.deleteRange")}
            </Button>
          </div>
        </div>
      </Card>

      {currentProgress && (
        <Card className="bg-foreground/5 border-foreground/10 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold">{t("progress.title")}</div>
            <div className="text-[10px] text-muted-foreground">
              {t("progress.counts", {
                success: currentProgress.successCount,
                failed: currentProgress.failedCount,
              })}
            </div>
          </div>
          <Progress
            value={
              currentProgress.totalTargeted > 0
                ? ((currentProgress.successCount +
                    currentProgress.failedCount) /
                    currentProgress.totalTargeted) *
                  100
                : 0
            }
            className="h-2 rounded-full"
          />
          <div className="text-[10px] text-muted-foreground">
            {t("progress.deleting", {
              done: currentProgress.successCount + currentProgress.failedCount,
              total: currentProgress.totalTargeted,
            })}
          </div>
          <div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[10px]"
              onClick={() =>
                deleteJobId &&
                cancelDeleteBroadcast({ id: postId, jobId: deleteJobId })
              }
              disabled={currentProgress.status !== "running"}
            >
              {t("progress.cancel")}
            </Button>
          </div>
        </Card>
      )}

      <Card className="bg-foreground/5 border-foreground/10 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 text-[10px] text-muted-foreground border-b border-foreground/10">
          <Checkbox
            checked={allChecked}
            onCheckedChange={(val) => toggleAll(Boolean(val))}
          />
          <span className="w-[140px]">{t("table.user")}</span>
          <span className="w-[120px]">{t("table.telegram")}</span>
          <span className="w-[120px]">{t("table.delivered")}</span>
          <span className="flex-1">{t("table.deletionStatus")}</span>
        </div>
        <div className="divide-y divide-foreground/10">
          {recipients.map((rec: PostRecipient) => (
            <div
              key={rec.id}
              className="flex items-center gap-2 px-3 py-2 text-[11px]"
            >
              <Checkbox
                checked={!!selected[rec.id]}
                onCheckedChange={(val) => toggleOne(rec.id, Boolean(val))}
              />
              <div className="w-[140px] truncate">
                {rec.username || rec.firstName || t("table.unknown")}
              </div>
              <div className="w-[120px] truncate text-muted-foreground">
                {rec.telegramId || rec.chatId}
              </div>
              <div className="w-[120px] text-muted-foreground">
                {rec.deliveredAt
                  ? new Date(rec.deliveredAt).toLocaleDateString()
                  : t("table.dash")}
              </div>
              <div className="flex-1 text-muted-foreground">
                {rec.deletionStatus || t("table.dash")}
              </div>
            </div>
          ))}
          {recipients.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              {isFetching ? t("empty.loading") : t("empty.none")}
            </div>
          )}
        </div>
      </Card>

      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>
          {t("pagination", {
            page,
            total: Math.max(Math.ceil(total / limit), 1),
          })}
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[10px]"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t("actions.prev")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[10px]"
            disabled={page >= Math.ceil(total / limit)}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("actions.next")}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-background/95 border-foreground/10 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold">
              {intent?.label}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              {t("confirm.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="text-xs rounded-xl">
              {t("actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="text-xs rounded-xl"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? t("actions.deleting") : t("actions.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
