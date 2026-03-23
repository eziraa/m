"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useGetPostsQuery,
  useDeletePostMutation,
  useSendPostMutation,
} from "@/lib/api";
import { Post } from "@/lib/types";
import { PostFilters } from "@/components/admin/posts/PostFilters";
import { DeliveryStatusBadge } from "@/components/admin/posts/DeliveryStatusBadge";
import { ConfirmSendDialog } from "@/components/admin/posts/ConfirmSendDialog";
import { BroadcastProgressModal } from "@/components/admin/posts/BroadcastProgressModal";
import { BottomAdminNav } from "@/components/admin/posts/BottomAdminNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Send,
  Eye,
  FileText,
  ArrowUpRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";

export default function AdminPostsListPage() {
  const t = useTranslations("admin.posts");
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sendTarget, setSendTarget] = useState<Post | null>(null);
  const [broadcastPostId, setBroadcastPostId] = useState<string | null>(null);

  const {
    data: posts = [],
    isLoading,
    refetch,
  } = useGetPostsQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: searchQuery || undefined,
  });
  const [deletePost] = useDeletePostMutation();
  const [sendPost] = useSendPostMutation();

  const handleDelete = async (post: Post) => {
    try {
      await deletePost(post.id).unwrap();
      toast.success(t("toast.deleted"));
      refetch();
    } catch {
      toast.error(t("toast.deleteFailed"));
    }
  };

  const confirmSend = async () => {
    if (!sendTarget) return;
    try {
      const result = await sendPost({ id: sendTarget.id }).unwrap();
      if (result.messageId) {
        toast.success(t("toast.published", { id: result.messageId }));
      } else {
        toast.success(t("toast.queued"));
      }
      if (!result.messageId) {
        setBroadcastPostId(sendTarget.id);
      }
    } catch (error: any) {
      toast.error(error?.data?.error || t("toast.queueFailed"));
    } finally {
      setSendTarget(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col px-4 py-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-black tracking-tight">{t("title")}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="h-9 px-4 text-xs font-semibold gap-1.5 rounded-xl"
            onClick={() => router.push("/admin/posts/new")}
          >
            <Plus className="w-4 h-4" />
            {t("actions.newPost")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <PostFilters
        activeStatus={statusFilter}
        onStatusChange={setStatusFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Post List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card
              key={i}
              className="bg-foreground/5 border-foreground/10 rounded-2xl p-4"
            >
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2 mb-3" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card className="bg-foreground/5 border-foreground/10 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-8 h-8 text-primary" />
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
          {posts.map((post) => (
            <Card
              key={post.id}
              className="bg-foreground/5 border-foreground/10 rounded-2xl p-4 transition-all duration-200 hover:bg-foreground/8 active:scale-[0.98] cursor-pointer"
              onClick={() => router.push(`/admin/posts/${post.id}`)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold truncate">
                    {post.title}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                    {post.content.substring(0, 80)}
                    {post.content.length > 80 ? "…" : ""}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <DeliveryStatusBadge status={post.status} />
                    <span className="text-[10px] text-muted-foreground/60">
                      {formatDistanceToNow(new Date(post.updatedAt), {
                        addSuffix: true,
                      })}
                    </span>
                    {post.images.length > 0 && (
                      <span className="text-[10px] text-muted-foreground/60">
                        📎 {post.images.length}
                      </span>
                    )}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="p-1.5 rounded-lg hover:bg-foreground/10 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-40"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenuItem
                      onClick={() => router.push(`/admin/posts/${post.id}`)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-2" />
                      {t("menu.view")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        router.push(`/admin/posts/${post.id}/edit`)
                      }
                    >
                      <Edit className="w-3.5 h-3.5 mr-2" />
                      {t("menu.edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSendTarget(post)}>
                      <Send className="w-3.5 h-3.5 mr-2" />
                      {t("menu.send")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-rose-400 focus:text-rose-400"
                      onClick={() => handleDelete(post)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" />
                      {t("menu.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <ConfirmSendDialog
        open={!!sendTarget}
        onOpenChange={(open) => !open && setSendTarget(null)}
        onConfirm={confirmSend}
        target={sendTarget?.target}
      />
      <BroadcastProgressModal
        postId={broadcastPostId}
        open={!!broadcastPostId}
        onOpenChange={(open) => !open && setBroadcastPostId(null)}
      />

      <BottomAdminNav />
    </div>
  );
}
