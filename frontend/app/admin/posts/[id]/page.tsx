"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useGetPostDetailQuery,
  useGetPostDeliveriesQuery,
  useSendPostMutation,
} from "@/lib/api";
import { BottomAdminNav } from "@/components/admin/posts/BottomAdminNav";
import { DeliveryStatusBadge } from "@/components/admin/posts/DeliveryStatusBadge";
import { ConfirmSendDialog } from "@/components/admin/posts/ConfirmSendDialog";
import { BroadcastProgressModal } from "@/components/admin/posts/BroadcastProgressModal";
import { TelegramPreview } from "@/components/admin/posts/TelegramPreview";
import { RecipientsTab } from "@/components/admin/posts/RecipientsTab";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import {
  ArrowLeft,
  Edit,
  Send,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  Pencil,
} from "lucide-react";
import { useTranslations } from "next-intl";

export default function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useTranslations("admin.postDetail");
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading, refetch } = useGetPostDetailQuery(id);
  const { data: deliveriesData } = useGetPostDeliveriesQuery({
    postId: id,
    limit: 20,
  });
  const [sendPost] = useSendPostMutation();
  const [showConfirm, setShowConfirm] = useState(false);
  const [broadcastPostId, setBroadcastPostId] = useState<string | null>(null);

  const post = data?.post;
  const analytics = data?.analytics;

  const handleSend = async () => {
    try {
      const result = await sendPost({ id }).unwrap();
      if (result.messageId) {
        toast.success(t("toast.published", { id: result.messageId }));
      } else {
        toast.success(t("toast.queued"));
      }
      if (!result.messageId) {
        setBroadcastPostId(id);
      }
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.error || t("toast.queueFailed"));
    } finally {
      setShowConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col px-4 py-4 space-y-4 pb-24">
        <div className="flex items-center gap-3 pt-2">
          <Skeleton className="h-8 w-8 rounded-xl" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <BottomAdminNav />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">{t("notFound")}</p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-4"
          onClick={() => router.push("/admin/posts")}
        >
          {t("actions.backToPosts")}
        </Button>
        <BottomAdminNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col px-4 py-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-xl"
            onClick={() => router.push("/admin/posts")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight truncate max-w-[200px]">
              {post.title}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <DeliveryStatusBadge status={post.status} />
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(post.updatedAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 px-3 text-xs rounded-xl"
            onClick={() => router.push(`/admin/posts/${id}/edit`)}
          >
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
          </Button>
          <Button
            size="sm"
            className="h-8 px-3 text-xs rounded-xl"
            onClick={() => setShowConfirm(true)}
            disabled={post.status === "sending"}
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            {t("actions.send")}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-3">
        <TabsList className="h-9 rounded-full bg-foreground/5">
          <TabsTrigger value="overview" className="text-xs">
            {t("tabs.overview")}
          </TabsTrigger>
          <TabsTrigger value="recipients" className="text-xs">
            {t("tabs.recipients")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Analytics */}
          {analytics && analytics.total > 0 && (
            <Card className="bg-foreground/5 border-foreground/10 rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold">
                  {t("analytics.title")}
                </span>
              </div>

              {/* Progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t("analytics.deliveryRate")}</span>
                  <span className="font-mono font-semibold text-foreground">
                    {analytics.deliveryRate}%
                  </span>
                </div>
                <Progress
                  value={analytics.deliveryRate}
                  className="h-2 rounded-full"
                />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center p-2 rounded-xl bg-foreground/5">
                  <Users className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-sm font-bold">
                    {analytics.totalRecipients}
                  </div>
                  <div className="text-[9px] text-muted-foreground">
                    {t("analytics.recipients")}
                  </div>
                </div>
                <div className="text-center p-2 rounded-xl bg-emerald-500/5">
                  <CheckCircle2 className="w-3.5 h-3.5 mx-auto mb-1 text-emerald-400" />
                  <div className="text-sm font-bold text-emerald-400">
                    {analytics.sent}
                  </div>
                  <div className="text-[9px] text-emerald-400/70">
                    {t("analytics.sent")}
                  </div>
                </div>
                <div className="text-center p-2 rounded-xl bg-rose-500/5">
                  <XCircle className="w-3.5 h-3.5 mx-auto mb-1 text-rose-400" />
                  <div className="text-sm font-bold text-rose-400">
                    {analytics.failed}
                  </div>
                  <div className="text-[9px] text-rose-400/70">
                    {t("analytics.failed")}
                  </div>
                </div>
                <div className="text-center p-2 rounded-xl bg-amber-500/5">
                  <Clock className="w-3.5 h-3.5 mx-auto mb-1 text-amber-400" />
                  <div className="text-sm font-bold text-amber-400">
                    {analytics.pending}
                  </div>
                  <div className="text-[9px] text-amber-400/70">
                    {t("analytics.pending")}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Telegram Preview */}
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground">
              {t("preview.title")}
            </h2>
            <TelegramPreview post={post} />
          </div>

          {/* Post Info */}
          <Card className="bg-foreground/5 border-foreground/10 rounded-2xl p-4 space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground">
              {t("details.title")}
            </h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("details.format")}
                </span>
                <span className="font-medium capitalize">{post.format}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("details.images")}
                </span>
                <span className="font-medium">{post.images.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("details.buttons")}
                </span>
                <span className="font-medium">
                  {(post.buttons as any[]).flat().length}
                </span>
              </div>
              {post.scheduledAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("details.scheduled")}
                  </span>
                  <span className="font-medium">
                    {format(new Date(post.scheduledAt), "MMM d, yyyy h:mm a")}
                  </span>
                </div>
              )}
              {post.sentAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("details.sent")}
                  </span>
                  <span className="font-medium">
                    {format(new Date(post.sentAt), "MMM d, yyyy h:mm a")}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("details.created")}
                </span>
                <span className="font-medium">
                  {format(new Date(post.createdAt), "MMM d, yyyy h:mm a")}
                </span>
              </div>
            </div>
          </Card>

          {/* Recent Deliveries */}
          {deliveriesData && deliveriesData.deliveries.length > 0 && (
            <Card className="bg-foreground/5 border-foreground/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-muted-foreground">
                  {t("recentDeliveries.title")}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => router.push("/admin/delivery-log")}
                >
                  {t("recentDeliveries.viewAll")}
                </Button>
              </div>
              <div className="space-y-1.5">
                {deliveriesData.deliveries.slice(0, 10).map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between py-1.5 border-b border-foreground/5 last:border-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono text-muted-foreground truncate max-w-[120px]">
                        {d.chatId}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DeliveryStatusBadge status={d.status} />
                      {d.errorMessage && (
                        <span className="text-[9px] text-rose-400/70 max-w-[100px] truncate">
                          {d.errorMessage}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recipients">
          <RecipientsTab postId={id} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ConfirmSendDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        onConfirm={handleSend}
        target={post.target}
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
