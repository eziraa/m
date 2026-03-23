"use client";

import { useEffect, useState } from "react";
import { Post, PostButton, PostCategory } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ImageUploader } from "./ImageUploader";
import { TelegramPreview } from "./TelegramPreview";
import { SchedulePicker } from "./SchedulePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetPostCategoriesQuery } from "@/lib/api";
import { useTranslations } from "next-intl";

interface PostEditorProps {
  value?: Post | null;
  onSave: (data: Partial<Post>) => Promise<void> | void;
}

export function PostEditor({ value, onSave }: PostEditorProps) {
  const t = useTranslations("admin.postEditor");
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [format, setFormat] = useState<"markdown" | "html">("markdown");
  const [images, setImages] = useState<string[]>([]);
  const [buttons, setButtons] = useState<PostButton[][]>([]);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [target, setTarget] = useState<"users" | "channel">("users");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const { data: categories = [] } = useGetPostCategoriesQuery();

  const channelName =
    process.env.NEXT_PUBLIC_TG_CHANNEL_NAME || t("channel.defaultName");
  const channelUsername = process.env.NEXT_PUBLIC_TG_CHANNEL_USERNAME || "";

  useEffect(() => {
    if (target === "channel" && !categoryId && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [target, categoryId, categories]);

  useEffect(() => {
    if (value) {
      setTitle(value.title ?? "");
      setContent(value.content ?? "");
      setFormat(value.format ?? "markdown");
      setImages(value.images ?? []);
      setButtons(value.buttons ?? []);
      setScheduledAt(value.scheduledAt ? new Date(value.scheduledAt) : null);
      setTarget(value.target === "channel" ? "channel" : "users");
      setCategoryId(value.categoryId ?? null);
    } else {
      setTitle("");
      setContent("");
      setFormat("markdown");
      setImages([]);
      setButtons([]);
      setScheduledAt(null);
      setTarget("users");
      setCategoryId(null);
    }
  }, [value]);

  const handleAddButtonRow = () => {
    setButtons([...buttons, []]);
  };

  const handleAddButton = (rowIndex: number) => {
    const next = [...buttons];
    next[rowIndex] = [...(next[rowIndex] || []), { text: "Button", url: "" }];
    setButtons(next);
  };

  const handleRemoveButton = (rowIndex: number, index: number) => {
    setButtons((prev) => {
      const next = prev.map((row, r) =>
        r === rowIndex ? row.filter((_, i) => i !== index) : row,
      );
      return next.filter((row) => row.length > 0);
    });
  };

  const handleRemoveButtonRow = (rowIndex: number) => {
    setButtons((prev) => prev.filter((_, r) => r !== rowIndex));
  };

  const handleButtonChange = (
    rowIndex: number,
    index: number,
    field: keyof PostButton,
    value: string,
  ) => {
    const next = buttons.map((row, r) =>
      row.map((btn, i) =>
        r === rowIndex && i === index
          ? {
              ...btn,
              [field]: value,
            }
          : btn,
      ),
    );
    setButtons(next);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: t("errors.missingFields.title"),
        description: t("errors.missingFields.description"),
        variant: "destructive",
      });
      return;
    }
    if (target === "channel" && !categoryId) {
      toast({
        title: t("errors.missingCategory.title"),
        description: t("errors.missingCategory.description"),
        variant: "destructive",
      });
      return;
    }
    if (target === "channel" && images.length > 1) {
      toast({
        title: t("errors.tooManyImages.title"),
        description: t("errors.tooManyImages.description"),
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        content,
        format,
        images,
        buttons,
        scheduledAt: scheduledAt ? scheduledAt.toISOString() : null,
        target,
        categoryId: target === "channel" ? categoryId : null,
      });
      toast({ title: t("toast.saved") });
    } catch (error: any) {
      toast({
        title: t("errors.saveFailed.title"),
        description: error?.message || t("errors.saveFailed.unknown"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const previewPost: Partial<Post> = {
    ...(value || {}),
    title,
    content,
    format,
    images,
    buttons,
    target,
    categoryId,
  };

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)] items-start">
      <Card className="bg-foreground/5 border-foreground/10 rounded-2xl p-4 space-y-3">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-foreground/70">
            {t("target.label")}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTarget("users")}
              className={`h-9 rounded-xl text-xs font-semibold border transition-colors ${
                target === "users"
                  ? "bg-blue-500/20 border-blue-500/40 text-blue-200"
                  : "bg-foreground/5 border-foreground/15 text-foreground/60"
              }`}
            >
              {t("target.users")}
            </button>
            <button
              type="button"
              onClick={() => setTarget("channel")}
              className={`h-9 rounded-xl text-xs font-semibold border transition-colors ${
                target === "channel"
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-200"
                  : "bg-foreground/5 border-foreground/15 text-foreground/60"
              }`}
            >
              {t("target.channel")}
            </button>
          </div>
        </div>

        {target === "channel" && (
          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-foreground/70">
                {t("category.label")}
              </label>
              <Select
                value={categoryId ?? undefined}
                onValueChange={(val: string) => setCategoryId(val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder={t("category.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category: PostCategory) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Card className="bg-foreground/5 border-foreground/15 rounded-xl p-3">
              <div className="text-[10px] uppercase tracking-widest text-foreground/50 font-semibold">
                {t("channel.preview")}
              </div>
              <div className="mt-2 text-sm font-semibold">{channelName}</div>
              {channelUsername && (
                <div className="text-xs text-foreground/60">
                  @{channelUsername.replace(/^@/, "")}
                </div>
              )}
            </Card>
          </div>
        )}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-foreground/70">
            {t("title.label")}
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("title.placeholder")}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-foreground/70">
              {t("content.label")}
            </label>
            <Tabs
              value={format}
              onValueChange={(val: string) =>
                setFormat(val as "markdown" | "html")
              }
              className="h-7"
            >
              <TabsList className="h-7 bg-foreground/5 rounded-full text-[10px]">
                <TabsTrigger value="markdown" className="h-7 px-2">
                  {t("content.format.markdown")}
                </TabsTrigger>
                <TabsTrigger value="html" className="h-7 px-2">
                  {t("content.format.html")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className="text-xs leading-relaxed resize-vertical bg-background border-foreground/15 rounded-xl"
            placeholder={
              format === "markdown"
                ? t("content.placeholderMarkdown")
                : t("content.placeholderHtml")
            }
          />
        </div>

        <ImageUploader value={images} onChange={setImages} />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-foreground/70">
              {t("buttons.label")}
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px]"
              onClick={handleAddButtonRow}
            >
              {t("buttons.addRow")}
            </Button>
          </div>
          <div className="space-y-1">
            {buttons.map((row, rowIndex) => (
              <div key={rowIndex} className="flex gap-2">
                {row.map((btn, index) => (
                  <div
                    key={index}
                    className="relative flex-1 rounded-xl bg-foreground/5 border border-foreground/15 p-2 space-y-1"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size={"icon"}
                      className="absolute right-1 top-1 h-5 px-2 text-[11px]"
                      onClick={() => handleRemoveButton(rowIndex, index)}
                    >
                      &times;
                    </Button>
                    <Input
                      value={btn.text}
                      onChange={(e) =>
                        handleButtonChange(
                          rowIndex,
                          index,
                          "text",
                          e.target.value,
                        )
                      }
                      placeholder={t("buttons.textPlaceholder")}
                      className="h-7 text-[11px]"
                    />
                    <Input
                      value={btn.url ?? ""}
                      onChange={(e) =>
                        handleButtonChange(
                          rowIndex,
                          index,
                          "url",
                          e.target.value,
                        )
                      }
                      placeholder={t("buttons.urlPlaceholder")}
                      className="h-7 text-[11px]"
                    />
                  </div>
                ))}
                <div className="flex flex-col gap-1 self-stretch">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 px-2 text-[10px]"
                    onClick={() => handleAddButton(rowIndex)}
                  >
                    {t("buttons.addButton")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-[10px]"
                    onClick={() => handleRemoveButtonRow(rowIndex)}
                  >
                    &times; {t("buttons.removeRow")}
                  </Button>
                </div>
              </div>
            ))}
            {buttons.length === 0 && (
              <p className="text-[10px] text-foreground/40">
                {t("buttons.emptyHint")}
              </p>
            )}
          </div>
        </div>

        <SchedulePicker value={scheduledAt} onChange={setScheduledAt} />

        <div className="pt-2 flex justify-end">
          <Button
            type="button"
            className="h-9 px-4 text-sm font-semibold"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? t("actions.saving") : t("actions.save")}
          </Button>
        </div>
      </Card>

      <div className="space-y-2">
        <div className="text-[11px] font-semibold text-foreground/70">
          {t("previewLabel")}
        </div>
        <TelegramPreview post={previewPost} />
      </div>
    </div>
  );
}
