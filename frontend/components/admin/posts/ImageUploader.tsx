"use client";

import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

interface ImageUploaderProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function ImageUploader({ value, onChange }: ImageUploaderProps) {
  const t = useTranslations("admin.imageUploader");
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const addImage = () => {
    if (!url.trim()) return;
    onChange([...value, url.trim()]);
    setUrl("");
  };

  const removeImage = (index: number) => {
    const next = [...value];
    next.splice(index, 1);
    onChange(next);
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    if (!apiBase) {
      console.error("NEXT_PUBLIC_API_URL is not set");
      return;
    }

    const token =
      typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

    const formData = new FormData();
    formData.append("image", file);

    setUploading(true);
    try {
      const res = await fetch(`${apiBase}/posts/upload-image`, {
        method: "POST",
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!res.ok) {
        console.error("Image upload failed", await res.text());
        return;
      }

      const data = (await res.json()) as { url: string };
      if (data?.url) {
        onChange([...value, data.url]);
      }
    } catch (error) {
      console.error("Image upload error", error);
    } finally {
      setUploading(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  return (
    <Card className="bg-foreground/5 border-foreground/10 rounded-2xl p-3 space-y-2">
      <div className="text-[11px] font-semibold text-foreground/70">
        {t("title")}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder={t("urlPlaceholder")}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="h-8 text-xs"
        />
        <Button type="button" size="sm" className="h-8 px-3" onClick={addImage}>
          {t("actions.add")}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          size="sm"
          className="h-8 px-3"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? t("actions.uploading") : t("actions.upload")}
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pt-1">
          {value.map((src, index) => (
            <div
              key={index}
              className="relative w-20 h-20 rounded-xl overflow-hidden border border-foreground/10 shrink-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={t("previewAlt")}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white"
                onClick={() => removeImage(index)}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-foreground/40">{t("hint")}</p>
    </Card>
  );
}
