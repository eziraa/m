"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useGetBroadcastStatusQuery } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Loader2, Send } from "lucide-react";
import { useTranslations } from "next-intl";

interface BroadcastProgressModalProps {
  postId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BroadcastProgressModal({
  postId,
  open,
  onOpenChange,
}: BroadcastProgressModalProps) {
  const t = useTranslations("admin.broadcastProgress");
  const { data, refetch } = useGetBroadcastStatusQuery(postId!, {
    skip: !postId || !open,
    pollingInterval: open && postId ? 2000 : 0,
  });

  const progress = data?.progress;
  const queueStatus = data?.queueStatus;
  const isActive = queueStatus === "queued" || queueStatus === "running";
  const isDone = queueStatus === "done" || queueStatus === "idle";

  const total = progress?.total || 0;
  const sent = progress?.sent || 0;
  const failed = progress?.failed || 0;
  const pending = progress?.pending || 0;
  const progressPercent =
    total > 0 ? Math.round(((sent + failed) / total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-foreground/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {isActive ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                {t("status.broadcasting")}
              </>
            ) : isDone && failed === 0 ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                {t("status.complete")}
              </>
            ) : isDone && failed > 0 ? (
              <>
                <XCircle className="w-5 h-5 text-amber-400" />
                {t("status.completeWithFailures")}
              </>
            ) : (
              <>
                <Send className="w-5 h-5 text-primary" />
                {t("status.status")}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t("progress.label")}</span>
              <span className="font-mono font-semibold text-foreground">
                {progressPercent}%
              </span>
            </div>
            <Progress value={progressPercent} className="h-2.5 rounded-full" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-emerald-400">{sent}</div>
              <div className="text-[10px] text-emerald-400/70 font-medium mt-0.5">
                {t("stats.sent")}
              </div>
            </div>
            <div className="bg-rose-500/5 border border-rose-500/15 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-rose-400">{failed}</div>
              <div className="text-[10px] text-rose-400/70 font-medium mt-0.5">
                {t("stats.failed")}
              </div>
            </div>
            <div className="bg-foreground/5 border border-foreground/10 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-muted-foreground">
                {pending}
              </div>
              <div className="text-[10px] text-muted-foreground/70 font-medium mt-0.5">
                {t("stats.pending")}
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-foreground/5 pt-3">
            <span>{t("total.label")}</span>
            <span className="font-semibold text-foreground">{total}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
