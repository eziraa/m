"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useGetPostDetailQuery, useUpdatePostMutation } from "@/lib/api";
import { Post } from "@/lib/types";
import { PostEditor } from "@/components/admin/posts/PostEditor";
import { BottomAdminNav } from "@/components/admin/posts/BottomAdminNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";

export default function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useTranslations("admin.editPost");
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading } = useGetPostDetailQuery(id);
  const [updatePost] = useUpdatePostMutation();

  const handleSave = async (formData: Partial<Post>) => {
    try {
      await updatePost({ id, data: formData }).unwrap();
      toast.success(t("toast.updated"));
      router.push(`/admin/posts/${id}`);
    } catch (error: any) {
      toast.error(error?.data?.error || t("toast.failed"));
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col px-4 py-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-xl"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold tracking-tight">{t("title")}</h1>
          <p className="text-[11px] text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      {/* Editor */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      ) : data?.post ? (
        <PostEditor value={data.post} onSave={handleSave} />
      ) : (
        <div className="text-center text-sm text-muted-foreground py-12">
          {t("notFound")}
        </div>
      )}

      <BottomAdminNav />
    </div>
  );
}
