"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGetDeliveryLogQuery } from "@/lib/api";
import { BottomAdminNav } from "@/components/admin/posts/BottomAdminNav";
import { DeliveryStatusBadge } from "@/components/admin/posts/DeliveryStatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

export default function DeliveryLogPage() {
  const t = useTranslations("admin.deliveryLog");
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGetDeliveryLogQuery({ page, limit: 30 });

  const deliveries = data?.deliveries || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 30);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col px-4 py-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-xl"
          onClick={() => router.push("/admin/posts")}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold tracking-tight">{t("title")}</h1>
          <p className="text-[11px] text-muted-foreground">
            {t("subtitle", { total })}
          </p>
        </div>
      </div>

      {/* Deliveries */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card
              key={i}
              className="bg-foreground/5 border-foreground/10 rounded-xl p-3"
            >
              <Skeleton className="h-3.5 w-full mb-2" />
              <Skeleton className="h-3 w-2/3" />
            </Card>
          ))}
        </div>
      ) : deliveries.length === 0 ? (
        <Card className="bg-foreground/5 border-foreground/10 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-sm font-semibold mb-1">{t("empty.title")}</h3>
          <p className="text-xs text-muted-foreground">{t("empty.subtitle")}</p>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {deliveries.map((d) => (
            <Card
              key={d.id}
              className="bg-foreground/5 border-foreground/10 rounded-xl p-3 text-xs"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-medium text-foreground truncate max-w-[55%]">
                  {d.postTitle || t("untitled")}
                </span>
                <DeliveryStatusBadge status={d.status} />
              </div>
              <div className="flex items-center justify-between text-muted-foreground/60">
                <span className="font-mono text-[10px] truncate max-w-[40%]">
                  {t("chat", { chatId: d.chatId })}
                </span>
                <span className="text-[10px]">
                  {formatDistanceToNow(new Date(d.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              {d.errorMessage && (
                <p className="mt-1.5 text-[10px] text-rose-400/80 bg-rose-500/5 rounded-lg px-2 py-1 line-clamp-2">
                  {d.errorMessage}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 rounded-xl"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            {t("pagination", { page, totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 rounded-xl"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      <BottomAdminNav />
    </div>
  );
}
