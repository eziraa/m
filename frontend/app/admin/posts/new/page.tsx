"use client";

import { useRouter } from "next/navigation";
import { useCreatePostMutation } from "@/lib/api";
import { Post } from "@/lib/types";
import { PostEditor } from "@/components/admin/posts/PostEditor";
import { BottomAdminNav } from "@/components/admin/posts/BottomAdminNav";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";

export default function CreatePostPage() {
  const t = useTranslations("admin.createPost");
  const router = useRouter();
  const [createPost] = useCreatePostMutation();

  const handleSave = async (data: Partial<Post>) => {
    try {
      const result = await createPost(data).unwrap();
      toast.success(t("toast.created"));
      router.push(`/admin/posts/${result.id}`);
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
      <PostEditor value={null} onSave={handleSave} />

      <BottomAdminNav />
    </div>
  );
}
