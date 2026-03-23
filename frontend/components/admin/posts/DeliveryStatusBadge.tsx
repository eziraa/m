"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface DeliveryStatusBadgeProps {
  status: "pending" | "sent" | "failed" | string;
  className?: string;
}

export function DeliveryStatusBadge({
  status,
  className,
}: DeliveryStatusBadgeProps) {
  const t = useTranslations("admin.deliveryStatus");
  const statusConfig: Record<string, { label: string; className: string }> = {
    pending: {
      label: t("pending"),
      className: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    },
    sent: {
      label: t("sent"),
      className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    },
    failed: {
      label: t("failed"),
      className: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    },
    draft: {
      label: t("draft"),
      className: "bg-foreground/5 text-foreground/50 border-foreground/20",
    },
    scheduled: {
      label: t("scheduled"),
      className: "bg-sky-500/10 text-sky-400 border-sky-500/30",
    },
    sending: {
      label: t("sending"),
      className:
        "bg-violet-500/10 text-violet-400 border-violet-500/30 animate-pulse",
    },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <Badge
      variant="outline"
      className={cn(
        "px-2 py-0.5 text-[10px] font-semibold rounded-full border",
        config.className,
        className,
      )}
    >
      {config.label}
    </Badge>
  );
}
