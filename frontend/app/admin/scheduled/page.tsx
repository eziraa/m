"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGetScheduledPostsQuery } from "@/lib/api";
import type { Post } from "@/lib/types";
import { BottomAdminNav } from "@/components/admin/posts/BottomAdminNav";
import { DeliveryStatusBadge } from "@/components/admin/posts/DeliveryStatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTranslations } from "next-intl";

export default function ScheduledPostsPage() {
  const t = useTranslations("admin.scheduled");
  const router = useRouter();
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { data, isLoading } = useGetScheduledPostsQuery({ page, pageSize });
  const posts = data?.posts ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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
          <p className="text-[11px] text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card
              key={i}
              className="bg-foreground/5 border-foreground/10 rounded-2xl p-4"
            >
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </Card>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card className="bg-foreground/5 border-foreground/10 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-sky-500/10 flex items-center justify-center">
            <Clock className="w-8 h-8 text-sky-400" />
          </div>
          <h3 className="text-sm font-semibold mb-1">{t("empty.title")}</h3>
          <p className="text-xs text-muted-foreground mb-4">
            {t("empty.subtitle")}
          </p>
          <Button
            size="sm"
            className="h-8 px-4 text-xs rounded-xl"
            onClick={() => router.push("/admin/posts/new")}
          >
            {t("actions.createPost")}
          </Button>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {posts.map((post: Post) => (
            <Card
              key={post.id}
              className="bg-foreground/5 border-foreground/10 rounded-2xl p-4 cursor-pointer transition-all hover:bg-foreground/8 active:scale-[0.98]"
              onClick={() => router.push(`/admin/posts/${post.id}`)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold truncate">
                    {post.title}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                    {post.content.substring(0, 60)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <DeliveryStatusBadge status={post.status} />
                    {post.scheduledAt && (
                      <div className="flex items-center gap-1 text-[10px] text-sky-400">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(post.scheduledAt), "MMM d, h:mm a")}
                      </div>
                    )}
                  </div>
                </div>
                {post.scheduledAt && (
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground/60">
                      {formatDistanceToNow(new Date(post.scheduledAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <Card className="border-foreground/10 bg-foreground/5 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-xl"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Prev
            </Button>
            <span className="text-[11px] font-semibold text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-xl"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      <BottomAdminNav />
    </div>
  );
}
