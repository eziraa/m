"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Post } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface TelegramPreviewProps {
  post: Partial<Post>;
}

export function TelegramPreview({ post }: TelegramPreviewProps) {
  const t = useTranslations("admin.telegramPreview");
  const hasImages = (post.images || []).length > 0;
  const firstImage = hasImages ? post.images![0] : null;

  return (
    <Card className="bg-[#0b1020] border-[#111827] rounded-2xl p-3 text-xs text-foreground/80 w-full max-w-sm mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-emerald-500" />
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold">{t("botName")}</span>
          <span className="text-[10px] text-emerald-400">{t("botLabel")}</span>
        </div>
        <Badge className="ml-auto text-[9px] px-1.5 py-0 h-4 rounded-full">
          {t("preview")}
        </Badge>
      </div>

      {firstImage && (
        <div className="mb-2 overflow-hidden rounded-xl border border-[#111827] bg-black/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={firstImage}
            alt={t("imageAlt")}
            className="w-full h-40 object-cover"
          />
        </div>
      )}

      <div className="space-y-1">
        {post.title && (
          <div className="font-semibold text-[12px] text-foreground">
            {post.title}
          </div>
        )}
        {post.content && (
          <div className="text-[11px] whitespace-pre-wrap text-foreground/80">
            {post.content}
          </div>
        )}
      </div>

      {post.buttons && post.buttons.length > 0 && (
        <div className="mt-3 border border-[#111827] rounded-xl overflow-hidden bg-[#020617]">
          {post.buttons.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className={cn(
                "flex border-t border-[#111827] first:border-t-0",
                row.length === 1 && "justify-center",
              )}
            >
              {row.map((btn, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="flex-1 px-3 py-1.5 text-[11px] text-sky-400 hover:bg-white/5 border-l border-[#111827] first:border-l-0"
                >
                  {btn.text}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
